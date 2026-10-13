import { coreSchema, ref, integer, nullableDate, nullableString, digest, choice, singleLine, emailOverrides, richText, contentHook } from './shared.js';
import { WORKSPACE_MANAGEMENT_ACTIONS } from '../workspaces/audit-policy.js';
import { canonicalEmail } from './accounts.js';
import { WORKSPACE_ICONS, WORKSPACE_COLORS, WORKSPACE_COVERS, WORKSPACE_IDENTITY_DEFAULTS, validWorkspaceSummary } from '../workspaces/identity.js';

// Minimal durable receipt: never TTL-delete, otherwise an old retry could create a duplicate.
export const workspaceCreationSchema = coreSchema({
  _id: { type: String, required: true, match: /^[a-f0-9]{64}$/u },
  userId: ref('User'), workspaceId: ref('Workspace'), fingerprint: digest(),
}, { editable: false, updated: false, privateFields: ['fingerprint'] });

export const workspaceSchema = coreSchema({
  ownerId: ref('User', true), organizationId: { ...ref('Organization', true), immutable: true },
  managerId: ref('User', true), name: singleLine(200), description: richText(), mutationRevision: integer(),
  summary: { ...nullableString(500), validate: validWorkspaceSummary },
  icon: choice(WORKSPACE_ICONS, WORKSPACE_IDENTITY_DEFAULTS.icon),
  color: choice(WORKSPACE_COLORS, WORKSPACE_IDENTITY_DEFAULTS.color),
  coverId: choice(WORKSPACE_COVERS, WORKSPACE_IDENTITY_DEFAULTS.coverId),
  state: choice(['active', 'archived'], 'active'), archivedAt: nullableDate(), archivedBy: ref('User', true),
}, { privateFields: ['mutationRevision'] });
contentHook(workspaceSchema, 'description', 'workspace');
workspaceSchema.pre('validate', function () {
  if (this.state === 'active' && (this.archivedAt || this.archivedBy)) this.invalidate('state', 'Active Workspace has no archive metadata');
  if (this.state === 'archived' && (!this.archivedAt || !this.archivedBy)) this.invalidate('state', 'Archived Workspace requires metadata');
  if (this.organizationId ? (this.ownerId !== null || !this.managerId) : (!this.ownerId || this.managerId !== null)) {
    this.invalidate('ownerId', 'Standalone requires an owner; attached requires a manager and organization ownership');
  }
});

export const membershipSchema = coreSchema({
  workspaceId: { ...ref('Workspace'), immutable: true }, userId: { ...ref('User'), immutable: true },
  state: choice(['active', 'inactive'], 'active'), joinedAt: { type: Date, required: true },
  role: choice(['manager', 'member'], 'member'),
  leftAt: nullableDate(), exitReason: { type: String, enum: ['left', 'removed', null], default: null },
  membershipGeneration: integer(1, 1), emailOverrides: { type: emailOverrides, required: true, default: () => ({}) },
});
membershipSchema.pre('validate', function() {
  if (this.state === 'inactive' && this.role !== 'member') this.invalidate('role', 'Inactive membership cannot retain management');
  if (this.state === 'active' && (this.leftAt !== null || this.exitReason !== null)) this.invalidate('state', 'Active membership has no exit details');
  if (this.state === 'inactive' && (!this.leftAt || !this.exitReason)) this.invalidate('state', 'Inactive membership requires exit details');
  if (this.state === 'inactive' && this.emailOverrides && Object.values(this.emailOverrides.toObject()).some((value) => value !== 'inherit')) this.invalidate('emailOverrides', 'Leaving clears email overrides');
});

export const workspaceManagementAuditSchema = coreSchema({
  workspaceId: { ...ref('Workspace'), immutable: true }, actorId: ref('User'),
  targetUserId: ref('User', true), invitationId: ref('WorkspaceInvitation', true),
  action: choice(WORKSPACE_MANAGEMENT_ACTIONS),
  invitationType: { type: String, enum: ['EMAIL', 'LINK', null], default: null },
  changedFields: { type: [String], default: [], validate: value => value.length <= 6 && new Set(value).size === value.length && value.every(field => ['name', 'description', 'summary', 'icon', 'color', 'coverId'].includes(field)) },
  previousRole: { type: String, enum: ['owner', 'manager', 'member', null], default: null },
  role: { type: String, enum: ['owner', 'manager', 'member', null], default: null },
  reason: { ...nullableString(2000), validate: value => value === null || Boolean(value.trim()) && !/[\u0000-\u001f\u007f\u2028\u2029]/u.test(value) },
  versionScope: choice(['workspace', 'membership', 'invitation']), resourceVersion: integer(),
}, { editable: false, updated: false });

workspaceManagementAuditSchema.pre('validate', function() {
  const invitation = ['invitation_created', 'invitation_revoked'].includes(this.action);
  const membership = ['member_joined', 'member_left', 'member_removed', 'role_changed'].includes(this.action);
  if (this.versionScope !== (invitation ? 'invitation' : membership ? 'membership' : 'workspace')) this.invalidate('versionScope', 'Event version scope mismatch');
  if ((invitation || this.action === 'member_joined') && (!this.invitationId || !this.invitationType)) this.invalidate('invitationId', 'Invitation reference required');
  if ((membership || this.action === 'ownership_transferred') && !this.targetUserId) this.invalidate('targetUserId', 'Member target required');
  if (['role_changed', 'ownership_transferred'].includes(this.action) && (!this.previousRole || !this.role)) this.invalidate('role', 'Role transition required');
  if (['role_changed', 'archived', 'unarchived'].includes(this.action) && !this.reason) this.invalidate('reason', 'Reason required');
  if ((this.action === 'metadata_updated') !== (this.changedFields.length > 0)) this.invalidate('changedFields', 'Only metadata events have changed field keys');
});

export const workspaceRoleAuditSchema = coreSchema({
  workspaceId: { ...ref('Workspace'), immutable: true }, actorId: ref('User'), targetUserId: ref('User'),
  previousRole: choice(['owner', 'manager', 'member']), role: choice(['owner', 'manager', 'member']),
  reason: singleLine(2000), membershipVersion: integer(),
}, { editable: false, updated: false });

export const invitationSchema = coreSchema({
  workspaceId: { ...ref('Workspace'), immutable: true }, createdBy: { ...ref('User'), immutable: true },
  type: choice(['EMAIL', 'LINK']), email: nullableString(254), emailCanonical: nullableString(254),
  tokenHash: digest(), expiresAt: { type: Date, required: true }, revokedAt: nullableDate(),
  acceptedAt: nullableDate(), acceptedBy: ref('User', true),
}, { privateFields: ['tokenHash', 'email', 'emailCanonical'] });
invitationSchema.pre('validate', function() {
  if (this.type === 'EMAIL') {
    try { this.emailCanonical = canonicalEmail(this.email); } catch (error) { this.invalidate('email', error.message); }
    if (Boolean(this.acceptedAt) !== Boolean(this.acceptedBy)) this.invalidate('acceptedAt', 'Acceptance fields must appear together');
  } else if ([this.email, this.emailCanonical, this.acceptedAt, this.acceptedBy].some((value) => value !== null)) {
    this.invalidate('type', 'LINK has no recipient or single-user acceptance');
  }
});
