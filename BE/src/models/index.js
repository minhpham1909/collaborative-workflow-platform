import indexPlans from './index-plan.json' with { type: 'json' };
import { register } from './shared.js';
import { userSchema, identitySchema, sessionSchema, authTokenSchema, authChallengeSchema } from './accounts.js';
import { workspaceSchema, membershipSchema, invitationSchema } from './workspaces.js';
import { projectSchema, taskSchema, commentSchema, projectLabelSchema, taskActivitySchema } from './tasks.js';
import { notificationSchema, outboxSchema } from './events.js';
import { organizationSchema, organizationMembershipSchema, organizationAuditSchema, organizationInvitationSchema } from './organizations.js';
import { projectGuestSchema, projectGuestInvitationSchema, projectAccessAuditSchema } from './project-access.js';
import { accessBanSchema, moderationActionSchema } from './moderation.js';
import { taskReopenRequestSchema } from './reopen.js';
import { workspaceLifecycleAuditSchema, taskPurgeAuditSchema } from './retention.js';

// Self-contained runtime plan; tests check drift against the reviewed DB layout.
const definitions = [
  ['WorkspaceLifecycleAudit', workspaceLifecycleAuditSchema, 'workspace_lifecycle_audit'], ['TaskPurgeAudit', taskPurgeAuditSchema, 'task_purge_audit'],
  ['TaskReopenRequest', taskReopenRequestSchema, 'task_reopen_requests'],
  ['ProjectLabel', projectLabelSchema, 'project_labels'], ['TaskActivity', taskActivitySchema, 'task_activity'],
  ['AccessBan', accessBanSchema, 'access_bans'], ['ModerationAction', moderationActionSchema, 'moderation_actions'],
  ['Organization', organizationSchema, 'organizations'], ['OrganizationMembership', organizationMembershipSchema, 'organization_memberships'],
  ['OrganizationAudit', organizationAuditSchema, 'organization_audit'],
  ['OrganizationInvitation', organizationInvitationSchema, 'organization_invitations'],
  ['ProjectGuest', projectGuestSchema, 'project_guests'], ['ProjectGuestInvitation', projectGuestInvitationSchema, 'project_guest_invitations'],
  ['ProjectAccessAudit', projectAccessAuditSchema, 'project_access_audit'],
  ['User', userSchema, 'users'], ['AuthIdentity', identitySchema, 'auth_identities'],
  ['Session', sessionSchema, 'sessions'], ['AuthToken', authTokenSchema, 'auth_tokens'],
  ['AuthChallenge', authChallengeSchema, 'auth_challenges'],
  ['Workspace', workspaceSchema, 'workspaces'], ['WorkspaceMembership', membershipSchema, 'workspace_memberships'],
  ['WorkspaceInvitation', invitationSchema, 'workspace_invitations'], ['Project', projectSchema, 'projects'],
  ['Task', taskSchema, 'tasks'], ['TaskComment', commentSchema, 'task_comments'],
  ['Notification', notificationSchema, 'notifications'], ['EmailOutbox', outboxSchema, 'email_outbox'],
];
export const models = Object.freeze(Object.fromEntries(definitions.map(([name, schema, collection]) => {
  return [name, register(name, schema, collection, indexPlans[collection])];
})));
export const { User, AuthIdentity, Session, AuthToken, AuthChallenge, Workspace, WorkspaceMembership, WorkspaceInvitation, Project, Task, TaskComment, Notification, EmailOutbox } = models;
export const { Organization, OrganizationMembership, OrganizationAudit, OrganizationInvitation } = models;
export const { ProjectGuest, ProjectGuestInvitation, ProjectAccessAudit } = models;
export const { AccessBan, ModerationAction } = models;
export const { ProjectLabel, TaskActivity } = models;
export const { TaskReopenRequest } = models;
export const { WorkspaceLifecycleAudit, TaskPurgeAudit } = models;
