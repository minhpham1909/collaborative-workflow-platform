import { test } from 'node:test';
import assert from 'node:assert/strict';
import { workspaceFields, invitationInput, overridesInput, pageInput, transferInput } from '../src/workspaces/input.js';
import { emptyRichText } from '../src/content/rich-text.js';

test('Workspace DTO rejects identity/role injection and unsafe content while deriving rich-text plain text', () => {
  const description = emptyRichText(); description.plainText = 'forged text';
  assert.equal(workspaceFields({ name: 'Nhóm 👋', description }).fields.description.plainText, '');
  for (const input of [{ name: ' ' }, { name: 'Name', ownerId: 'forged' }, { name: 'Name', description: '<script>bad</script>' }, { name: 'Name', version: 0 }]) assert.throws(() => workspaceFields(input), /INVALID_INPUT/u);
  assert.throws(() => workspaceFields({ expectedVersion: '0', name: 'Name' }, true), /INVALID_INPUT/u);
  assert.throws(() => workspaceFields({ expectedVersion: 0 }, true), /INVALID_INPUT/u);
});
test('Invitation and membership DTOs enforce exact intent, bounded pagination and tri-state settings', () => {
  assert.deepEqual(invitationInput({ type: 'EMAIL', email: ' Recipient@Example.com ' }), { type: 'EMAIL', email: 'recipient@example.com' });
  for (const value of [{ type: 'LINK', email: null }, { type: 'EMAIL' }, { type: 'LINK', token: 'forged' }, { type: 'OTHER' }]) assert.throws(() => invitationInput(value), /INVALID_INPUT/u);
  for (const value of [{ expectedVersion: 0, emailOverrides: {} }, { expectedVersion: 0, emailOverrides: { assignment: true } }, { expectedVersion: 0, emailOverrides: { recipientId: 'on' } }]) assert.throws(() => overridesInput(value), /INVALID_INPUT/u);
  assert.equal(overridesInput({ expectedVersion: 0, emailOverrides: { assignment: 'off' } }).overrides.assignment, 'off');
  for (const query of [{ limit: '101' }, { limit: '1e2' }, { limit: ['20'] }, { cursor: 'bad-json' }, { cursor: '$where' }, { role: 'owner' }]) assert.throws(() => pageInput(query), /INVALID_INPUT/u);
  assert.throws(() => transferInput({ expectedVersion: 0, memberId: { $ne: null } }), /INVALID_INPUT/u);
});
