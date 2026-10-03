import { test } from 'node:test';
import assert from 'node:assert/strict';
import { profileInput, preferencesInput } from '../src/users/input.js';

test('Profile input excludes identity/privilege fields and requires an exact integer version', () => {
  assert.deepEqual(profileInput({ expectedVersion: 0, displayName: 'Nguyễn An 👋' }).fields, { displayName: 'Nguyễn An 👋' });
  for (const field of ['userId', 'email', 'avatar', 'passwordHash', 'authVersion', 'ownerId', 'role', 'version']) {
    assert.throws(() => profileInput({ expectedVersion: 0, displayName: 'An', [field]: 'forged' }), /INVALID_INPUT/u);
  }
  for (const value of ['0', null, -1, 0.5, true, Number.MAX_SAFE_INTEGER + 1]) {
    assert.throws(() => profileInput({ expectedVersion: value, displayName: 'An' }), /INVALID_INPUT/u);
  }
  for (const name of ['', '   ', 'line\nbreak', 123, 'x'.repeat(101)]) assert.throws(() => profileInput({ expectedVersion: 0, displayName: name }), /INVALID_INPUT/u);
});

test('Preferences accept partial strict booleans and supported nullable locale without mass assignment', () => {
  assert.deepEqual(preferencesInput({ expectedVersion: 3, locale: null, emailPreferences: { comment: true } }), { expectedVersion: 3, fields: { locale: null, 'emailPreferences.comment': true } });
  for (const input of [{}, { emailPreferences: {} }, { locale: 'fr' }, { locale: false }, { emailPreferences: { assignment: 'false' } }, { emailPreferences: { status: 0 } }, { emailPreferences: { verification: false } }, { emailPreferences: [] }, { emailPreferences: null }, { 'emailPreferences.assignment': false }]) {
    assert.throws(() => preferencesInput({ expectedVersion: 0, ...input }), /INVALID_INPUT/u);
  }
});
