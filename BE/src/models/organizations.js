import { coreSchema, ref, singleLine, integer, choice, nullableDate, nullableString, digest } from './shared.js';
import { canonicalEmail } from './accounts.js';

export const organizationSchema = coreSchema({
  ownerId: ref('User'), name: singleLine(200), mutationRevision: integer(),
}, { privateFields: ['mutationRevision'] });

// Ownership is derived from Organization.ownerId, never duplicated as a membership role.
export const organizationMembershipSchema = coreSchema({
  organizationId: { ...ref('Organization'), immutable: true },
  userId: { ...ref('User'), immutable: true },
  role: choice(['admin', 'member'], 'member'), state: choice(['active', 'inactive'], 'active'),
  joinedAt: { type: Date, required: true }, leftAt: nullableDate(),
  membershipGeneration: integer(1, 1), exitReason: { type: String, enum: ['left', 'removed', null], default: null },
});
organizationMembershipSchema.pre('validate', function () {
  if ((this.state === 'inactive') !== Boolean(this.leftAt)) this.invalidate('leftAt', 'Membership state and exit date must agree');
});

export const organizationAuditSchema = coreSchema({
  organizationId: ref('Organization'), actorId: ref('User'), targetUserId: ref('User', true), workspaceId: ref('Workspace', true),
  action: choice(['member_role_changed', 'workspace_member_added', 'workspace_manager_changed', 'ownership_transferred', 'organization_member_joined', 'organization_member_left', 'organization_member_removed', 'organization_invitation_created', 'organization_invitation_revoked']),
  previousRole: nullableString(32), role: nullableString(32), previousUserId: ref('User', true),
}, { editable: false, updated: false });

export const organizationInvitationSchema = coreSchema({
  organizationId: { ...ref('Organization'), immutable: true }, workspaceId: { ...ref('Workspace', true), immutable: true },
  createdBy: { ...ref('User'), immutable: true }, email: singleLine(254), emailCanonical: singleLine(254), tokenHash: digest(),
  expiresAt: { type: Date, required: true }, revokedAt: nullableDate(), acceptedAt: nullableDate(), acceptedBy: ref('User', true),
}, { privateFields: ['email', 'emailCanonical', 'tokenHash'] });
organizationInvitationSchema.pre('validate', function () {
  try { this.emailCanonical = canonicalEmail(this.email); } catch (error) { this.invalidate('email', error.message); }
  if (Boolean(this.acceptedAt) !== Boolean(this.acceptedBy)) this.invalidate('acceptedAt', 'Acceptance metadata must agree');
});
