import { coreSchema, ref, choice, nullableDate, digest, singleLine, nullableString } from './shared.js';
import { canonicalEmail } from './accounts.js';

export const projectGuestSchema = coreSchema({
  workspaceId: { ...ref('Workspace'), immutable: true }, projectId: { ...ref('Project'), immutable: true }, userId: { ...ref('User'), immutable: true },
  state: choice(['active', 'inactive'], 'active'), grantedBy: ref('User'), joinedAt: { type: Date, required: true }, revokedAt: nullableDate(),
});
projectGuestSchema.pre('validate', function () {
  if ((this.state === 'inactive') !== Boolean(this.revokedAt)) this.invalidate('state', 'Guest state and revoke metadata must agree');
});
export const projectGuestInvitationSchema = coreSchema({
  workspaceId: { ...ref('Workspace'), immutable: true }, projectId: { ...ref('Project'), immutable: true }, createdBy: { ...ref('User'), immutable: true },
  type: choice(['EMAIL', 'LINK']), email: nullableString(254), emailCanonical: nullableString(254), tokenHash: digest(),
  expiresAt: { type: Date, required: true }, revokedAt: nullableDate(), acceptedAt: nullableDate(), acceptedBy: ref('User', true),
}, { privateFields: ['email', 'emailCanonical', 'tokenHash'] });
projectGuestInvitationSchema.pre('validate', function () {
  if (this.type === 'EMAIL') {
    try { this.emailCanonical = canonicalEmail(this.email); } catch (error) { this.invalidate('email', error.message); }
    if (Boolean(this.acceptedAt) !== Boolean(this.acceptedBy)) this.invalidate('acceptedAt', 'Acceptance metadata must agree');
  } else if ([this.email, this.emailCanonical, this.acceptedAt, this.acceptedBy].some(value => value !== null)) this.invalidate('type', 'Reusable Guest link has no recipient/acceptance metadata');
});
export const projectAccessAuditSchema = coreSchema({
  workspaceId: ref('Workspace'), projectId: ref('Project'), actorId: ref('User'), targetUserId: ref('User', true), previousUserId: ref('User', true),
  action: choice(['lead_changed', 'guest_invitation_created', 'guest_invitation_revoked', 'guest_joined', 'guest_revoked']),
}, { editable: false, updated: false });
