import express from 'express';

export function createApp({ isReady = () => false } = {}) {
  const app = express();
  app.disable('x-powered-by');
  app.set('query parser', 'simple');
  app.use((_req, res, next) => {
    res.set({ 'X-Content-Type-Options': 'nosniff', 'Cache-Control': 'no-store' });
    next();
  });
  app.get('/health/live', (_req, res) => res.json({ status: 'ok' }));
  app.get('/health/ready', (_req, res) => {
    const ready = isReady();
    res.status(ready ? 200 : 503).json({ status: ready ? 'ready' : 'not_ready' });
  });
  app.use((_req, res) => res.status(404).json({ error: { code: 'NOT_FOUND' } }));
  app.use((_error, _req, res, _next) => {
    res.status(500).json({ error: { code: 'INTERNAL_ERROR' } });
  });
  return app;
}
