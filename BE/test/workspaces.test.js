import { auditQuery } from '../src/workspaces/list-query.js';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { workspaceFields, invitationInput, overridesInput, pageInput, transferInput, membershipRoleInput } from '../src/workspaces/input.js';
import { emptyRichText } from '../src/content/rich-text.js';
import { workspaceResponse } from '../src/workspaces/response.js';

test('Workspace role mutations only accept scoped management/member intent with reason and membership CAS', () => {
  assert.deepEqual(membershipRoleInput({ expectedVersion: 1, role: 'manager', reason: ' Appointment ' }), { expectedVersion: 1, role: 'manager', reason: 'Appointment' });
  for (const fields of [{ role: 'owner' }, { reason: '' }, { reason: '\n' }, { expectedVersion: '1' }, { workspaceId: 'injection' }]) {
    assert.throws(() => membershipRoleInput({ expectedVersion: 1, role: 'manager', reason: 'Appointment', ...fields }), /INVALID_INPUT/u);
  }
});

test('Workspace metadata validates bounded summary and preset identity without accepting ownership fields', () => {
  assert.deepEqual(workspaceFields({ name: 'Design', summary: '  Mục tiêu  ', icon: 'palette', color: 'mint', coverId: 'campaign' }).fields,
    { name: 'Design', summary: 'Mục tiêu', icon: 'palette', color: 'mint', coverId: 'campaign' });
  assert.equal(workspaceFields({ expectedVersion: 2, summary: '' }, true).fields.summary, null);
  assert.equal(workspaceFields({ name: 'Design', summary: null }).fields.summary, null);
  for (const fields of [{ summary: 'x'.repeat(501) }, { summary: 'bad\nline' }, { summary: '\n' }, { summary: {} }, { icon: 'script' }, { color: null }, { coverId: 'https://example.com/image' }, { role: 'manager' }]) {
    assert.throws(() => workspaceFields({ name: 'Design', ...fields }), /INVALID_INPUT/u);
  }
  const legacy = { _id: 'workspace', ownerId: 'owner', managerId: null, name: 'Legacy', state: 'archived', createdAt: new Date(0), version: 0 };
  const response = workspaceResponse(legacy, { userId: 'owner', version: 0 });
  assert.equal(response.summary, null); assert.equal(response.icon, 'folder'); assert.equal(response.coverId, 'moodboard');
  assert.equal(response.readOnly, true); assert.equal(response.readOnlyReason, 'workspace_archived');
  assert.equal(Object.hasOwn(legacy, 'coverId'), false);
});

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

test('Management history accepts only known actions and scoped bounded read filters', () => {
  assert.equal(auditQuery({}).action, 'all');
  const page = auditQuery({ action: 'member_joined', limit: '2', q: '[QA]', from: '2026-10-13', to: '2026-10-13' });
  assert.equal(page.action, 'member_joined'); assert.equal(page.limit, 2); assert.equal(page.filters[0].createdAt.$gte.toISOString(), '2026-10-12T17:00:00.000Z');
  for (const query of [{ action: 'comment_deleted' }, { action: { $ne: 'created' } }, { workspaceId: 'injected' }, { from: '2026-10-14', to: '2026-10-13' }, { cursor: 'malformed' }, { limit: '101' }]) assert.throws(() => auditQuery(query), /INVALID_INPUT/u);
});
