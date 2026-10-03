import { AuthError } from './errors.js';
import { canonicalEmail } from '../models/accounts.js';
import { validatePassword } from './passwords.js';

export function inputObject(input, allowed) {
  if (!input || typeof input !== 'object' || Array.isArray(input) || Object.keys(input).some((key) => !allowed.includes(key))) throw new AuthError('INVALID_INPUT', 400);
  return input;
}
export function emailInput(value) {
  try { return canonicalEmail(value); } catch { throw new AuthError('INVALID_INPUT', 400); }
}
export function termsInput(input, version) {
  if (input.termsAccepted !== true || input.termsVersion !== version) throw new AuthError('TERMS_REQUIRED', 400);
  return version;
}
export function displayNameInput(value) {
  if (typeof value !== 'string' || !value.trim() || value.length > 100 || /[\u0000-\u001f\u007f\u2028\u2029]/u.test(value)) throw new AuthError('INVALID_INPUT', 400);
  return value;
}
export function tokenInput(value) {
  if (typeof value !== 'string' || !/^[a-f0-9]{64}$/u.test(value)) throw new AuthError('INVALID_TOKEN', 400);
  return value;
}
export { validatePassword };
