import { createServer, type Server } from 'node:http';
import path from 'node:path';
import express, { type NextFunction, type Request, type Response } from 'express';
import { WebSocketServer } from 'ws';
import { createAnswerProvider } from './answers/create.js';
import type { AnswerProvider } from './answers/types.js';
import { registerBuiltinCommands } from './commands/builtin.js';
import { CommandRegistry } from './commands/registry.js';
import type { Config } from './config.js';
import { TtlSet } from './dedupe.js';
import { log } from './logger.js';
import { OverlayHub } from './overlay/hub.js';
import { overlayDir } from './paths.js';
import type { PipelineDeps } from './pipeline.js';
import { createSimulatorRouter } from './simulator/router.js';
import { TaskTracker } from './taskTracker.js';
import { createWebhookRouter } from './webhook/router.js';

const DEDUPE_TTL_MS = 10 * 60 * 1000;

export interface AppContext {
  app: express.Express;
  config: Config;
  hub: OverlayHub;
  registry: CommandRegistry;
  provider: AnswerProvider;
  tasks: TaskTracker;
  attachWebSocket(server: Server): WebSocketServer;
}

export function createApp(options: { config: Config; fetchImpl?: typeof fetch }): AppContext {
  const { config } = options;
  const fetchImpl = options.fetchImpl ?? fetch;
  const provider = createAnswerProvider(config, fetchImpl);
  const registry = new CommandRegistry();
  registerBuiltinCommands(registry, provider);
  const hub = new OverlayHub(config.overlayHideMs);
  const dedupe = new TtlSet(DEDUPE_TTL_MS);
  const tasks = new TaskTracker();

  const pipeline: PipelineDeps = {
    config,
    registry,
    hub,
    dedupe,
    fetchImpl,
  };

  const app = express();
  app.disable('x-powered-by');

  app.get('/health', (_req, res) => {
    res.json({
      ok: true,
      privateRepliesEnabled: config.privateRepliesEnabled,
      simulatorEnabled: config.simulatorEnabled,
      answerProvider: provider.name,
    });
  });

  app.get('/', (_req, res) => {
    res.redirect('/overlay');
  });

  // Serve the page without a trailing-slash redirect so the OBS URL stays stable.
  app.get('/overlay', (_req, res) => {
    res.setHeader('Cache-Control', 'no-store');
    res.sendFile(path.join(overlayDir, 'index.html'));
  });

  app.use(
    '/overlay',
    express.static(overlayDir, {
      index: 'index.html',
      redirect: false,
      etag: false,
      maxAge: 0,
      setHeaders(res) {
        res.setHeader('Cache-Control', 'no-store');
      },
    }),
  );

  app.use('/webhook', createWebhookRouter(pipeline, tasks));

  if (config.simulatorEnabled) {
    app.use('/dev', createSimulatorRouter(pipeline));
    log.info('Comment simulator enabled at /dev');
  }

  app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
    log.error('Request failed', err instanceof Error ? err.message : err);
    if (res.headersSent) return;
    res.status(500).json({ error: 'Internal error' });
  });

  return {
    app,
    config,
    hub,
    registry,
    provider,
    tasks,
    attachWebSocket(server) {
      const wss = new WebSocketServer({ server, path: '/ws' });
      wss.on('connection', (socket) => {
        hub.add(socket);
      });
      return wss;
    },
  };
}

export function startServer(ctx: AppContext): Server {
  const server = createServer(ctx.app);
  ctx.attachWebSocket(server);
  server.listen(ctx.config.port, ctx.config.host, () => {
    const shownHost = ctx.config.host === '0.0.0.0' ? '127.0.0.1' : ctx.config.host;
    log.info(`Listening on http://${ctx.config.host}:${ctx.config.port}`);
    log.info(`Overlay: http://${shownHost}:${ctx.config.port}/overlay`);
    if (ctx.config.simulatorEnabled) {
      log.info(`Simulator: http://${shownHost}:${ctx.config.port}/dev`);
    }
    log.info(`Answer provider: ${ctx.provider.name}`);
    log.info(`Private replies: ${ctx.config.privateRepliesEnabled ? 'on' : 'off'}`);
  });
  return server;
}
