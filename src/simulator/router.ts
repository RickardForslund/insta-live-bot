import { randomUUID } from 'node:crypto';
import { Router, type NextFunction, type Request, type Response } from 'express';
import express from 'express';
import type { PipelineDeps } from '../pipeline.js';
import { handleLiveComment } from '../pipeline.js';
import { listLiveMedia } from '../instagram/client.js';
import { devHtmlPath } from '../paths.js';
import type { LiveComment } from '../types.js';
import { isRecord, readString } from '../util.js';

export function createSimulatorRouter(deps: PipelineDeps): Router {
  const router = Router();
  router.use(express.json({ limit: '100kb' }));

  router.get('/', (_req, res) => {
    res.sendFile(devHtmlPath);
  });

  router.post('/simulate', (req, res, next) => {
    void simulate(req, res, deps).catch(next);
  });

  router.get('/live-media', (req, res, next) => {
    void liveMedia(res, deps).catch(next);
  });

  router.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
    if (isJsonParseError(err)) {
      res.status(400).json({ error: 'Invalid JSON' });
      return;
    }
    res.status(500).json({ error: 'Internal error' });
  });

  return router;
}

async function simulate(req: Request, res: Response, deps: PipelineDeps): Promise<void> {
  if (!isRecord(req.body) || typeof req.body.text !== 'string' || !req.body.text.trim()) {
    res.status(400).json({ error: 'text is required' });
    return;
  }

  const comment: LiveComment = {
    commentId: readString(req.body.commentId) || `sim_${randomUUID()}`,
    text: req.body.text,
    username: readString(req.body.username) || 'simulator',
    userId: readString(req.body.userId) || '0',
    mediaId: readString(req.body.mediaId) || 'simulated-live',
    igAccountId: deps.config.igUserId || 'simulated-ig-user',
    timestamp: Date.now(),
  };

  const result = await handleLiveComment(comment, deps);
  res.json(result);
}

async function liveMedia(res: Response, deps: PipelineDeps): Promise<void> {
  const result = await listLiveMedia({
    config: deps.config,
    ...(deps.fetchImpl ? { fetchImpl: deps.fetchImpl } : {}),
  });
  if (!result.ok) {
    res.status(502).json(result);
    return;
  }
  res.json(result.data);
}

function isJsonParseError(err: unknown): boolean {
  return (
    err instanceof SyntaxError && 'status' in err && (err as { status?: number }).status === 400
  );
}
