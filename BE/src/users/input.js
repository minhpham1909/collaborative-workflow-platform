import { inputObject, displayNameInput } from '../auth/account-input.js';
import { AuthError } from '../auth/errors.js';

function version(input) {
  if (!Number.isSafeInteger(input.expectedVersion) || input.expectedVersion < 0) throw new AuthError('INVALID_INPUT', 400);
  return input.expectedVersion;
}
export function profileInput(input) {
  inputObject(input, ['expectedVersion', 'displayName']);
  return { expectedVersion: version(input), fields: { displayName: displayNameInput(input.displayName) } };
}
export function preferencesInput(input) {
  inputObject(input, ['expectedVersion', 'locale', 'emailPreferences']);
  const expectedVersion = version(input); const fields = {};
  if (Object.hasOwn(input, 'locale')) {
    if (![null, 'vi', 'en'].includes(input.locale)) throw new AuthError('INVALID_INPUT', 400);
    fields.locale = input.locale;
  }
  if (Object.hasOwn(input, 'emailPreferences')) {
    inputObject(input.emailPreferences, ['assignment', 'comment', 'content', 'status']);
    if (!Object.keys(input.emailPreferences).length) throw new AuthError('INVALID_INPUT', 400);
    for (const [key, value] of Object.entries(input.emailPreferences)) {
      if (typeof value !== 'boolean') throw new AuthError('INVALID_INPUT', 400);
      fields[`emailPreferences.${key}`] = value;
    }
  }
  if (!Object.keys(fields).length) throw new AuthError('INVALID_INPUT', 400);
  return { expectedVersion, fields };
}
