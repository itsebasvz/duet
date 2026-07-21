import express from 'express';

import {
  getMessages,
  getSession,
  getSessionDiff,
  getStateDbPath,
  listSessions,
  startTail,
  stateDbExists,
  stopTail,
} from '@/modules/worker-feed/worker-feed.service.js';

const router = express.Router();

function fail(res: express.Response, error: unknown): void {
  const message = error instanceof Error ? error.message : String(error);
  res.status(500).json({ success: false, error: message });
}

router.get('/status', (_req, res) => {
  res.json({ success: true, data: { available: stateDbExists(), path: getStateDbPath() } });
});

router.get('/sessions', (req, res) => {
  try {
    const limit = Number.parseInt(String(req.query.limit ?? ''), 10);
    res.json({ success: true, data: listSessions(Number.isFinite(limit) ? limit : undefined) });
  } catch (error) {
    fail(res, error);
  }
});

router.get('/sessions/:id', (req, res) => {
  try {
    const session = getSession(req.params.id);
    if (!session) {
      res.status(404).json({ success: false, error: 'Session not found' });
      return;
    }
    res.json({ success: true, data: session });
  } catch (error) {
    fail(res, error);
  }
});

router.get('/sessions/:id/messages', (req, res) => {
  try {
    res.json({ success: true, data: getMessages(req.params.id) });
  } catch (error) {
    fail(res, error);
  }
});

router.get('/sessions/:id/diff', async (req, res) => {
  try {
    res.json({ success: true, data: await getSessionDiff(req.params.id) });
  } catch (error) {
    fail(res, error);
  }
});

router.post('/sessions/:id/tail', (req, res) => {
  try {
    const started = startTail(req.params.id);
    if (!started) {
      res.status(503).json({ success: false, error: 'Worker session store unavailable' });
      return;
    }
    res.json({ success: true });
  } catch (error) {
    fail(res, error);
  }
});

router.delete('/sessions/:id/tail', (req, res) => {
  try {
    stopTail(req.params.id);
    res.json({ success: true });
  } catch (error) {
    fail(res, error);
  }
});

export default router;
