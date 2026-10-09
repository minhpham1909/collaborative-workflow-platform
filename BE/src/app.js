import express from 'express';
import { createAuthRouter } from './auth/http.js';
import { createUsersRouter } from './users/http.js';
import { createWorkspaceRouter, createInvitationRouter } from './workspaces/http.js';
import { createWorkRouter, createProjectInvitationRouter } from './work/http.js';
import { createNotificationsRouter } from './notifications/http.js';
import { createOrganizationRouter, createOrganizationInvitationRouter } from './organizations/http.js';
import { createModerationRouter } from './moderation/http.js';

export function createApp({ isReady = () => false, authService, authConfig, accountsService, usersService, workspaceService, workService, notificationsService, organizationService, moderationService } = {}) {
  const app = express();
  app.disable('x-powered-by');
  app.set('trust proxy', false);
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
  if (authService && authConfig) app.use('/auth', createAuthRouter({ service: authService, config: authConfig, accounts: accountsService }));
  if (authService && authConfig && usersService) app.use('/users', createUsersRouter({ service: usersService, authService, config: authConfig }));
  if (authService && authConfig && organizationService) app.use('/organizations', createOrganizationRouter({ service: organizationService, authService, config: authConfig }));
  if (authService && authConfig && organizationService) app.use('/organization-invitations', createOrganizationInvitationRouter({ service: organizationService, authService, config: authConfig }));
  if (authService && authConfig && moderationService) app.use('/moderation', createModerationRouter({ service: moderationService, authService, config: authConfig }));
  if (authService && authConfig && notificationsService) app.use('/notifications', createNotificationsRouter({ service: notificationsService, authService, config: authConfig }));
  if (authService && authConfig && workService) app.use(createWorkRouter({ service: workService, authService, config: authConfig }));
  if (authService && authConfig && workService) app.use('/project-invitations', createProjectInvitationRouter({ service: workService, authService, config: authConfig }));
  if (authService && authConfig && workspaceService) {
    app.use('/workspaces', createWorkspaceRouter({ service: workspaceService, authService, config: authConfig }));
    app.use('/invitations', createInvitationRouter({ service: workspaceService, authService, config: authConfig }));
  }
  app.use((_req, res) => res.status(404).json({ error: { code: 'NOT_FOUND' } }));
  app.use((_error, _req, res, _next) => {
    res.status(500).json({ error: { code: 'INTERNAL_ERROR' } });
  });
  return app;
}
