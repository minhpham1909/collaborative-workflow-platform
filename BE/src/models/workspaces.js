import { coreSchema, ref, integer, nullableDate, nullableString, digest, choice, singleLine, emailOverrides, richText, contentHook } from './shared.js';
import { canonicalEmail } from './accounts.js';

export const workspaceSchema = coreSchema({
  ownerId: ref('User', true), organizationId: { ...ref('Organization', true), immutable: true },
  managerId: ref('User', true), name: singleLine(200), description: richText(), mutationRevision: integer(),
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
  leftAt: nullableDate(), exitReason: { type: String, enum: ['left', 'removed', null], default: null },
  membershipGeneration: integer(1, 1), emailOverrides: { type: emailOverrides, required: true, default: () => ({}) },
});
membershipSchema.pre('validate', function() {
  if (this.state === 'active' && (this.leftAt !== null || this.exitReason !== null)) this.invalidate('state', 'Active membership has no exit details');
  if (this.state === 'inactive' && (!this.leftAt || !this.exitReason)) this.invalidate('state', 'Inactive membership requires exit details');
  if (this.state === 'inactive' && this.emailOverrides && Object.values(this.emailOverrides.toObject()).some((value) => value !== 'inherit')) this.invalidate('emailOverrides', 'Leaving clears email overrides');
});

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
