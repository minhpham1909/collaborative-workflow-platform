import express from 'express';
import { AuthError } from '../auth/errors.js';
import { requireAuthentication, createRateLimiter } from '../auth/http.js';
import { originPolicy, requestError } from '../http/policy.js';

export function createModerationRouter({ service, authService, config }) {
  const router = express.Router({ caseSensitive: true, strict: true });
  router.use(originPolicy({ webOrigin: config.webOrigin, methods: ['GET', 'POST'] }));
  router.use(createRateLimiter()); router.use(express.json({ limit: '16kb', strict: true }));
  router.use((req, _res, next) => req.method === 'POST' && !req.is('application/json') ? next(new AuthError('JSON_REQUIRED', 415)) : next());
  router.use(requireAuthentication(authService));
  router.post('/:type/:scopeId/preview', async (req, res) => res.json(await service.preview(req.auth, req.params.type, req.params.scopeId, req.body)));
  router.post('/:type/:scopeId/bans', async (req, res) => res.json(await service.ban(req.auth, req.params.type, req.params.scopeId, req.body)));
  router.get('/:type/:scopeId/bans', async (req, res) => res.json(await service.bans(req.auth, req.params.type, req.params.scopeId, req.query)));
  router.post('/:type/:scopeId/bans/:userId/unban', async (req, res) => res.json(await service.unban(req.auth, req.params.type, req.params.scopeId, req.params.userId, req.body)));
  router.get('/:type/:scopeId/actions', async (req, res) => res.json(await service.actions(req.auth, req.params.type, req.params.scopeId, req.query)));
  router.post('/:type/:scopeId/actions/:actionId/retry', async (req, res) => res.json(await service.retry(req.auth, req.params.type, req.params.scopeId, req.params.actionId, req.body)));
  router.use(requestError); return router;
}
