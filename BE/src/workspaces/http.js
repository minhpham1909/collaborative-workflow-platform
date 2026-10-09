import express from 'express';
import { AuthError } from '../auth/errors.js';
import { requireAuthentication, createRateLimiter } from '../auth/http.js';
import { originPolicy, requestError } from '../http/policy.js';

function router(config) {
  const value = express.Router({ caseSensitive: true, strict: true });
  value.use(originPolicy({ webOrigin: config.webOrigin, methods: ['GET', 'POST', 'PATCH'] }));
  value.use(createRateLimiter());
  value.use(express.json({ limit: '256kb', strict: true }));
  value.use((req, _res, next) => {
    if (['POST', 'PATCH'].includes(req.method) && !req.is('application/json')) return next(new AuthError('JSON_REQUIRED', 415));
    next();
  });
  return value;
}
export function createWorkspaceRouter({ service, authService, config }) {
  const value = router(config); value.use(requireAuthentication(authService, { verified: true }));
  value.get('/', async (req, res) => res.json(await service.list(req.auth, req.query)));
  value.post('/', createRateLimiter({ limit: 10 }), async (req, res) => res.status(201).json(await service.create(req.auth, req.body)));
  value.get('/:workspaceId', async (req, res) => res.json(await service.get(req.auth, req.params.workspaceId)));
  value.patch('/:workspaceId', async (req, res) => res.json(await service.update(req.auth, req.params.workspaceId, req.body)));
  value.patch('/:workspaceId/state', async (req, res) => res.json(await service.state(req.auth, req.params.workspaceId, req.body)));
  value.get('/:workspaceId/members', async (req, res) => res.json(await service.members(req.auth, req.params.workspaceId, req.query)));
  value.post('/:workspaceId/leave', async (req, res) => res.json(await service.leave(req.auth, req.params.workspaceId, req.body)));
  value.post('/:workspaceId/members/:memberId/remove', async (req, res) => res.json(await service.remove(req.auth, req.params.workspaceId, req.params.memberId, req.body)));
  value.patch('/:workspaceId/ownership', async (req, res) => res.json(await service.transfer(req.auth, req.params.workspaceId, req.body)));
  value.patch('/:workspaceId/email-overrides', async (req, res) => res.json(await service.overrides(req.auth, req.params.workspaceId, req.body)));
  value.post('/:workspaceId/email-overrides/reset', async (req, res) => res.json(await service.resetOverrides(req.auth, req.params.workspaceId, req.body)));
  value.get('/:workspaceId/invitations', async (req, res) => res.json(await service.invitations(req.auth, req.params.workspaceId, req.query)));
  value.post('/:workspaceId/invitations', createRateLimiter({ limit: 10 }), async (req, res) => {
    const result = await service.invite(req.auth, req.params.workspaceId, req.body);
    res.status(result.code === 'INVITATION_CREATED' ? 201 : 200).json(result);
  });
  value.post('/:workspaceId/invitations/:invitationId/revoke', async (req, res) => res.json(await service.revoke(req.auth, req.params.workspaceId, req.params.invitationId, req.body)));
  value.post('/:workspaceId/invitations/:invitationId/retry-email', createRateLimiter({ limit: 10 }), async (req, res) => res.json(await service.retryMail(req.auth, req.params.workspaceId, req.params.invitationId, req.body)));
  value.use(requestError); return value;
}
export function createInvitationRouter({ service, authService, config }) {
  const value = router(config);
  value.post('/preview', async (req, res) => res.json(await service.preview(req.body)));
  value.post('/accept', requireAuthentication(authService, { verified: true }), async (req, res) => res.json(await service.accept(req.auth, req.body)));
  value.post('/:invitationId/accept', requireAuthentication(authService, { verified: true }), async (req, res) => res.json(await service.acceptById(req.auth, req.params.invitationId, req.body)));
  value.use(requestError); return value;
}
