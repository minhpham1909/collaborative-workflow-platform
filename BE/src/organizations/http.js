import express from 'express';
import { AuthError } from '../auth/errors.js';
import { requireAuthentication, createRateLimiter } from '../auth/http.js';
import { originPolicy, requestError } from '../http/policy.js';

export function createOrganizationRouter({ service, authService, config }) {
  const router = express.Router({ caseSensitive: true, strict: true });
  router.use(originPolicy({ webOrigin: config.webOrigin, methods: ['GET', 'POST', 'PATCH'] }));
  router.use(createRateLimiter());
  router.use(express.json({ limit: '16kb', strict: true }));
  router.use((req, _res, next) => ['POST', 'PATCH'].includes(req.method) && !req.is('application/json') ? next(new AuthError('JSON_REQUIRED', 415)) : next());
  router.use(requireAuthentication(authService));
  router.get('/', async (req, res) => res.json(await service.list(req.auth, req.query)));
  router.post('/', async (req, res) => res.status(201).json(await service.create(req.auth, req.body)));
  router.get('/:organizationId', async (req, res) => res.json(await service.get(req.auth, req.params.organizationId)));
  router.patch('/:organizationId', async (req, res) => res.json(await service.update(req.auth, req.params.organizationId, req.body)));
  router.get('/:organizationId/workspaces', async (req, res) => res.json(await service.workspaces(req.auth, req.params.organizationId, req.query)));
  router.post('/:organizationId/workspaces', async (req, res) => res.status(201).json(await service.createWorkspace(req.auth, req.params.organizationId, req.body)));
  router.get('/:organizationId/members', async (req, res) => res.json(await service.members(req.auth, req.params.organizationId, req.query)));
  router.patch('/:organizationId/members/:userId/role', async (req, res) => res.json(await service.role(req.auth, req.params.organizationId, req.params.userId, req.body)));
  router.patch('/:organizationId/workspaces/:workspaceId/manager', async (req, res) => res.json(await service.manager(req.auth, req.params.organizationId, req.params.workspaceId, req.body)));
  router.post('/:organizationId/workspaces/:workspaceId/members', async (req, res) => res.json(await service.addMember(req.auth, req.params.organizationId, req.params.workspaceId, req.body)));
  router.patch('/:organizationId/ownership', async (req, res) => res.json(await service.transfer(req.auth, req.params.organizationId, req.body)));
  router.get('/:organizationId/audit', async (req, res) => res.json(await service.audit(req.auth, req.params.organizationId, req.query)));
  router.get('/:organizationId/invitations', async (req, res) => res.json(await service.invitations(req.auth, req.params.organizationId, req.query)));
  router.post('/:organizationId/invitations', createRateLimiter({ limit: 10 }), async (req, res) => {
    const result = await service.invite(req.auth, req.params.organizationId, req.body);
    res.status(result.code === 'INVITATION_CREATED' ? 201 : 200).json(result);
  });
  router.post('/:organizationId/invitations/:invitationId/revoke', async (req, res) => res.json(await service.revokeInvitation(req.auth, req.params.organizationId, req.params.invitationId, req.body)));
  router.post('/:organizationId/leave', async (req, res) => res.json(await service.leave(req.auth, req.params.organizationId, req.body)));
  router.post('/:organizationId/members/:userId/remove', async (req, res) => res.json(await service.remove(req.auth, req.params.organizationId, req.params.userId, req.body)));
  router.use(requestError);
  return router;
}

export function createOrganizationInvitationRouter({ service, authService, config }) {
  const router = express.Router({ caseSensitive: true, strict: true });
  router.use(originPolicy({ webOrigin: config.webOrigin, methods: ['POST'] }));
  router.use(createRateLimiter()); router.use(express.json({ limit: '16kb', strict: true }));
  router.use((req, _res, next) => req.method === 'POST' && !req.is('application/json') ? next(new AuthError('JSON_REQUIRED', 415)) : next());
  router.post('/preview', async (req, res) => res.json(await service.previewInvitation(req.body)));
  router.use(requireAuthentication(authService));
  router.post('/accept', async (req, res) => res.json(await service.acceptInvitation(req.auth, req.body)));
  router.post('/:invitationId/accept', async (req, res) => res.json(await service.acceptInvitationById(req.auth, req.params.invitationId, req.body)));
  router.use(requestError); return router;
}
