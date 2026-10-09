import { test } from 'node:test';
import assert from 'node:assert/strict';
import { leadInput } from '../src/work/input.js';
import { invitationInput } from '../src/workspaces/input.js';
import { ProjectGuest, ProjectGuestInvitation, Notification, EmailOutbox } from '../src/models/index.js';

const oid = '111111111111111111111111', at = new Date(), hash = 'a'.repeat(64);
test('Lead and Guest DTOs reject missing CAS, unknown scope and elevated roles', () => {
  assert.deepEqual(leadInput({ leadId: null, expectedVersion: 0 }), { leadId: null, expectedVersion: 0 });
  for (const body of [{ expectedVersion: 0 }, { leadId: oid }, { leadId: oid, expectedVersion: 0, role: 'admin' }]) assert.throws(() => leadInput(body));
  for (const body of [{ type: 'LINK', email: 'a@example.com' }, { type: 'LINK', role: 'member' }, { type: 'EMAIL', email: 'a@example.com', projectId: oid }]) assert.throws(() => invitationInput(body));
});
test('Guest models have no Member role; reusable link has no single-recipient metadata', async () => {
  assert.throws(() => new ProjectGuest({ workspaceId: oid, projectId: oid, userId: oid, grantedBy: oid, joinedAt: at, role: 'member' }));
  await assert.rejects(new ProjectGuest({ workspaceId: oid, projectId: oid, userId: oid, grantedBy: oid, joinedAt: at, state: 'inactive' }).validate());
  await assert.rejects(new ProjectGuestInvitation({ workspaceId: oid, projectId: oid, createdBy: oid, type: 'LINK', email: 'a@example.com', tokenHash: hash, expiresAt: at }).validate());
});
test('Project invitation references cannot be mixed with Workspace/Organization delivery', async () => {
  const notice = { eventId: 'event', recipientId: oid, category: 'project_invitation', workspaceId: oid, projectId: oid, projectInvitationId: oid };
  await new Notification(notice).validate();
  await assert.rejects(new Notification({ ...notice, invitationId: oid }).validate());
  const job = { eventId: 'event', recipientKey: 'recipient', category: 'invitation', templateKey: 'project', nextAttemptAt: at, workspaceId: oid, projectId: oid, projectInvitationId: oid };
  await new EmailOutbox(job).validate();
  await assert.rejects(new EmailOutbox({ ...job, organizationId: oid, organizationInvitationId: oid }).validate());
});
