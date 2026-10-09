import { coreSchema, ref, choice, singleLine, nullableDate, nullableString, integer, Schema } from './shared.js';

export const accessBanSchema = coreSchema({
  scopeType: choice(['organization', 'workspace', 'project']), scopeId: { type: Schema.Types.ObjectId, required: true },
  organizationId: ref('Organization', true), workspaceId: ref('Workspace', true), projectId: ref('Project', true), userId: ref('User'),
  state: choice(['active', 'revoked'], 'active'), reason: singleLine(2000), imposedBy: ref('User'), imposedAt: { type: Date, required: true },
  revokedAt: nullableDate(), revokedBy: ref('User', true),
});
accessBanSchema.pre('validate', function () {
  const target = this.scopeType === 'organization' ? this.organizationId : this.scopeType === 'workspace' ? this.workspaceId : this.projectId;
  if (!target || String(target) !== String(this.scopeId) || (this.scopeType === 'organization' && (this.workspaceId || this.projectId)) || (this.scopeType === 'workspace' && this.projectId) || (this.scopeType === 'project' && !this.workspaceId)) this.invalidate('scopeId', 'Ban scope and parent references must agree');
  if (this.state === 'active' ? Boolean(this.revokedAt || this.revokedBy) : !this.revokedAt || !this.revokedBy) this.invalidate('state', 'Ban revoke metadata must agree');
});
export const moderationActionSchema = coreSchema({
  scopeType: choice(['organization', 'workspace', 'project']), scopeId: { type: Schema.Types.ObjectId, required: true },
  organizationId: ref('Organization', true), workspaceId: ref('Workspace', true), projectId: ref('Project', true),
  actorId: ref('User'), targetUserId: ref('User'), banId: ref('AccessBan', true), commentId: ref('TaskComment', true),
  action: choice(['ban', 'unban', 'comment_deleted']), reason: singleLine(2000),
  cleanup: choice(['none', '1', '3', '7', '30', 'all'], 'none'), from: nullableDate(), cutoff: { type: Date, required: true },
  workspaceIds: { type: [Schema.Types.ObjectId], ref: 'Workspace', default: () => [] }, takeoverWorkspaceIds: { type: [Schema.Types.ObjectId], ref: 'Workspace', default: () => [] },
  state: choice(['pending', 'processing', 'completed', 'failed'], 'completed'), matchedCount: integer(), deletedCount: integer(), attempts: integer(),
  lastId: { type: Schema.Types.ObjectId, default: null }, leaseToken: nullableString(100), leaseUntil: nullableDate(), lastErrorCode: nullableString(100),
});
moderationActionSchema.pre('validate', function () {
  const target = this.scopeType === 'organization' ? this.organizationId : this.scopeType === 'workspace' ? this.workspaceId : this.projectId;
  if (!target || String(target) !== String(this.scopeId) || (this.scopeType === 'organization' && (this.workspaceId || this.projectId)) || (this.scopeType === 'workspace' && this.projectId) || (this.scopeType === 'project' && !this.workspaceId)) this.invalidate('scopeId', 'Action scope must agree');
  if (this.action !== 'ban' && (this.cleanup !== 'none' || this.state !== 'completed')) this.invalidate('action', 'Only Ban actions may queue cleanup');
  if (this.cutoff && this.from && this.from > this.cutoff) this.invalidate('from', 'Cleanup dates must be ordered');
  if (this.state === 'processing' ? !this.leaseToken || !this.leaseUntil : this.leaseToken !== null || this.leaseUntil !== null) this.invalidate('state', 'Job lease metadata must agree');
});
