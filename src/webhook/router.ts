import { Router, type NextFunction, type Request, type Response } from 'express';
import express from 'express';
import type { PipelineDeps } from '../pipeline.js';
import { handleLiveComment } from '../pipeline.js';
import { log } from '../logger.js';
import type { TaskTracker } from '../taskTracker.js';
import { parseLiveComments } from './parse.js';
import { isValidHubSignature, tokensMatch } from './signature.js';

type RequestWithRawBody = Request & { rawBody?: Buffer };

export function createWebhookRouter(deps: PipelineDeps, tasks: TaskTracker): Router {
  const router = Router();
  const { config } = deps;

  router.use(
    express.json({
      limit: '256kb',
      verify(req, _res, buf) {
        (req as RequestWithRawBody).rawBody = Buffer.from(buf);
      },
    }),
  );

  router.get('/', (req, res) => {
    const mode = queryString(req.query['hub.mode']);
    const token = queryString(req.query['hub.verify_token']);
    const challenge = queryString(req.query['hub.challenge']);

    if (mode === 'subscribe' && challenge && tokensMatch(token, config.metaVerifyToken)) {
      log.info('Webhook verification succeeded');
      res.status(200).type('text/plain').send(challenge);
      return;
    }

    log.warn('Webhook verification failed');
    res.status(403).type('text/plain').send('Forbidden');
  });

  router.post('/', (req, res) => {
    const rawBody = (req as RequestWithRawBody).rawBody;
    if (!rawBody) {
      res.status(400).json({ error: 'Expected a JSON body' });
      return;
    }
    if (!isValidHubSignature(rawBody, req.get('x-hub-signature-256'), config.metaAppSecret)) {
      log.warn('Rejected webhook with an invalid signature');
      res.status(401).json({ error: 'Invalid signature' });
      return;
    }

    let comments;
    try {
      comments = parseLiveComments(req.body);
    } catch (error) {
      log.error('Failed to parse webhook', error instanceof Error ? error.message : error);
      res.status(200).type('text/plain').send('EVENT_RECEIVED');
      return;
    }

    // Ack before slower work (the LLM call) so Meta does not retry the delivery.
    res.status(200).type('text/plain').send('EVENT_RECEIVED');

    for (const comment of comments) {
      const task = handleLiveComment(comment, deps).then(
        () => undefined,
        (error: unknown) => {
          log.error(
            `Failed to handle comment ${comment.commentId}`,
            error instanceof Error ? error.message : error,
          );
        },
      );
      tasks.track(task);
    }
  });

  router.use((err: unknown, req: Request, res: Response, next: NextFunction) => {
    if (isJsonParseError(err)) {
      const rawBody = (req as RequestWithRawBody).rawBody;
      const signatureOk =
        rawBody !== undefined &&
        isValidHubSignature(rawBody, req.get('x-hub-signature-256'), config.metaAppSecret);
      if (!signatureOk) {
        res.status(401).json({ error: 'Invalid signature' });
        return;
      }
      res.status(400).json({ error: 'Invalid JSON' });
      return;
    }
    next(err);
  });

  return router;
}

function queryString(value: unknown): string {
  return typeof value === 'string' ? value : '';
}

function isJsonParseError(err: unknown): boolean {
  return (
    err instanceof SyntaxError && 'status' in err && (err as { status?: number }).status === 400
  );
}
