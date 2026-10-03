import indexPlans from './index-plan.json' with { type: 'json' };
import { register } from './shared.js';
import { userSchema, identitySchema, sessionSchema, authTokenSchema } from './accounts.js';
import { workspaceSchema, membershipSchema, invitationSchema } from './workspaces.js';
import { projectSchema, taskSchema, commentSchema } from './tasks.js';
import { notificationSchema, outboxSchema } from './events.js';

// Self-contained runtime plan; tests check drift against the reviewed DB layout.
const definitions = [
  ['User', userSchema, 'users'], ['AuthIdentity', identitySchema, 'auth_identities'],
  ['Session', sessionSchema, 'sessions'], ['AuthToken', authTokenSchema, 'auth_tokens'],
  ['Workspace', workspaceSchema, 'workspaces'], ['WorkspaceMembership', membershipSchema, 'workspace_memberships'],
  ['WorkspaceInvitation', invitationSchema, 'workspace_invitations'], ['Project', projectSchema, 'projects'],
  ['Task', taskSchema, 'tasks'], ['TaskComment', commentSchema, 'task_comments'],
  ['Notification', notificationSchema, 'notifications'], ['EmailOutbox', outboxSchema, 'email_outbox'],
];
export const models = Object.freeze(Object.fromEntries(definitions.map(([name, schema, collection]) => {
  return [name, register(name, schema, collection, indexPlans[collection])];
})));
export const { User, AuthIdentity, Session, AuthToken, Workspace, WorkspaceMembership, WorkspaceInvitation, Project, Task, TaskComment, Notification, EmailOutbox } = models;
