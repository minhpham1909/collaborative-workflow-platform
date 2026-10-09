import { inputObject, emailInput, tokenInput } from '../auth/account-input.js';
import { AuthError } from '../auth/errors.js';
import { normalizeRichText, CONTENT_LIMITS } from '../content/rich-text.js';

export const fail = (code = 'INVALID_INPUT', status = 400) => { throw new AuthError(code, status); };
export function objectId(value) { if (typeof value !== 'string' || !/^[a-f0-9]{24}$/u.test(value)) fail(); return value; }
export function expectedVersion(input) { if (!Number.isSafeInteger(input.expectedVersion) || input.expectedVersion < 0) fail(); return input.expectedVersion; }
export function workspaceFields(input, editing = false) {
  inputObject(input, editing ? ['expectedVersion', 'name', 'description'] : ['name', 'description']);
  const fields = {};
  if (!editing || Object.hasOwn(input, 'name')) {
    if (typeof input.name !== 'string' || !input.name.trim() || input.name.length > 200 || /[\u0000-\u001f\u007f\u2028\u2029]/u.test(input.name)) fail();
    fields.name = input.name;
  }
  if (Object.hasOwn(input, 'description')) {
    try { fields.description = normalizeRichText(input.description, { maxCharacters: CONTENT_LIMITS.workspace }); } catch { fail(); }
  }
  if (editing && !Object.keys(fields).length) fail();
  return { fields, ...(editing ? { expectedVersion: expectedVersion(input) } : {}) };
}
export function versionInput(input) { inputObject(input, ['expectedVersion']); return expectedVersion(input); }
export function workspaceStateInput(input) {
  inputObject(input, ['expectedVersion', 'state', 'confirmName', 'reason']);
  if (!['active', 'archived'].includes(input.state) || typeof input.confirmName !== 'string' || input.confirmName.length > 200) fail();
  if (typeof input.reason !== 'string' || !input.reason.trim() || input.reason.length > 2000 || /[\u0000-\u001f\u007f\u2028\u2029]/u.test(input.reason)) fail();
  return { expectedVersion: expectedVersion(input), state: input.state, confirmName: input.confirmName, reason: input.reason.trim() };
}
export function transferInput(input) { inputObject(input, ['expectedVersion', 'memberId']); return { expectedVersion: expectedVersion(input), memberId: objectId(input.memberId) }; }
export function invitationInput(input) {
  inputObject(input, ['type', 'email']);
  if (!['EMAIL', 'LINK'].includes(input.type)) fail();
  if (input.type === 'LINK' && Object.hasOwn(input, 'email')) fail();
  return { type: input.type, email: input.type === 'EMAIL' ? emailInput(input.email) : null };
}
export function invitationToken(input) { inputObject(input, ['token']); return tokenInput(input.token); }
export function overridesInput(input) {
  inputObject(input, ['expectedVersion', 'emailOverrides']); expectedVersion(input);
  inputObject(input.emailOverrides, ['assignment', 'comment', 'content', 'status']);
  if (!Object.keys(input.emailOverrides).length || Object.values(input.emailOverrides).some((value) => !['inherit', 'on', 'off'].includes(value))) fail();
  return { expectedVersion: input.expectedVersion, overrides: input.emailOverrides };
}
export function pageInput(query, field = 'createdAt') {
  inputObject(query, ['limit', 'cursor']);
  if (query.limit !== undefined && (typeof query.limit !== 'string' || !/^[1-9][0-9]*$/u.test(query.limit))) fail();
  const limit = query.limit === undefined ? 20 : Number(query.limit);
  if (limit > 100) fail();
  let after = {};
  if (query.cursor !== undefined) {
    try {
      if (typeof query.cursor !== 'string' || query.cursor.length > 256 || !/^[A-Za-z0-9_-]+$/u.test(query.cursor)) fail();
      const cursor = JSON.parse(Buffer.from(query.cursor, 'base64url').toString('utf8'));
      inputObject(cursor, ['at', 'id']); objectId(cursor.id);
      if (typeof cursor.at !== 'string' || new Date(cursor.at).toISOString() !== cursor.at) fail();
      after = { $or: [{ [field]: { $lt: new Date(cursor.at) } }, { [field]: new Date(cursor.at), _id: { $lt: cursor.id } }] };
    } catch { fail(); }
  }
  return { limit, after };
}
