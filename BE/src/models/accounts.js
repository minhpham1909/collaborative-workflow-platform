import { coreSchema, ref, integer, nullableDate, nullableString, digest, choice, singleLine, nested, emailPreferences } from './shared.js';
import { isSafeLink } from '../content/rich-text.js';

export function canonicalEmail(email) {
  if (typeof email !== 'string') throw new TypeError('Email must be a string');
  const canonical = email.trim().toLowerCase();
  if (canonical.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/u.test(canonical)) throw new TypeError('Invalid email');
  return canonical;
}

export const userSchema = coreSchema({
  displayName: singleLine(100), email: { type: String, required: true, maxlength: 254 },
  emailCanonical: { type: String, required: true },
  passwordHash: { type: String, default: null, maxlength: 1024, validate: (value) => value === null || /^\$argon2id\$/u.test(value) },
  avatar: {
    type: nested({
      source: choice(['google', 'initials'], 'initials'), googlePictureUrl: nullableString(2048), refreshedAt: nullableDate(),
    }), required: true, default: () => ({})
  },
  emailVerifiedAt: nullableDate(), locale: { type: String, enum: ['vi', 'en', null], default: null },
  emailPreferences: { type: emailPreferences, required: true, default: () => ({}) },
  termsAcceptance: { type: nested({ version: singleLine(100), acceptedAt: { type: Date, required: true } }), required: true },
  authVersion: integer(), authMutationRevision: integer(),
}, { privateFields: ['passwordHash', 'emailCanonical', 'authVersion', 'authMutationRevision'] });
userSchema.pre('validate', function () {
  try { this.emailCanonical = canonicalEmail(this.email); } catch (error) { this.invalidate('email', error.message); }
  if (this.avatar?.source === 'google') {
    if (!isSafeLink(this.avatar.googlePictureUrl) || !this.avatar.googlePictureUrl.startsWith('https:')) this.invalidate('avatar', 'Google picture must be an HTTPS URL');
  } else if (this.avatar?.googlePictureUrl !== null) this.invalidate('avatar', 'Initials avatar has no Google URL');
});

export const identitySchema = coreSchema({
  userId: { ...ref('User'), immutable: true }, provider: choice(['google']),
  providerSubject: { type: String, required: true, maxlength: 255, immutable: true },
  lastLoginAt: { type: Date, required: true },
}, { editable: false, updated: false, privateFields: ['providerSubject'] });

export const sessionSchema = coreSchema({
  userId: { ...ref('User'), immutable: true }, authVersionAtIssue: integer(),
  refreshTokenHash: digest(), refreshGeneration: integer(),
  expiresAt: { type: Date, required: true }, lastSeenAt: { type: Date, required: true },
  revokedAt: nullableDate(), revokeReason: nullableString(),
}, { editable: false, updated: false, privateFields: ['refreshTokenHash'] });

export const authTokenSchema = coreSchema({
  userId: { ...ref('User'), immutable: true }, purpose: choice(['verify_email', 'reset_password']),
  tokenHash: digest(), expiresAt: { type: Date, required: true }, usedAt: nullableDate(), revokedAt: nullableDate(),
}, { editable: false, updated: false, privateFields: ['tokenHash'] });

export const authChallengeSchema = coreSchema({
  userId: ref('User', true), purpose: choice(['google_login', 'google_link']),
  tokenHash: digest(), expiresAt: { type: Date, required: true }, usedAt: nullableDate(), revokedAt: nullableDate(),
}, { editable: false, updated: false, privateFields: ['tokenHash'] });
authChallengeSchema.pre('validate', function() {
  if ((this.purpose === 'google_link') !== Boolean(this.userId)) this.invalidate('userId', 'Google link challenge requires current User; login challenge has no User');
});
