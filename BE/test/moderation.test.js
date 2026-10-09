import { test } from 'node:test';
import assert from 'node:assert/strict';
import { previewCodec } from '../src/moderation/preview.js';
import { banInput, previewInput, unbanInput } from '../src/moderation/input.js';
import { AccessBan, ModerationAction } from '../src/models/index.js';

const oid = 'a'.repeat(24), at = new Date('2026-10-05T00:00:00Z');
test('cleanup DTOs require signed review for destructive selection and reject scope injection', () => {
  assert.equal(banInput({ userId: oid, reason: 'Policy', expectedVersion: 0 }).cleanup, 'none');
  for (const body of [{ userId: oid, reason: 'Policy', cleanup: 'all', expectedVersion: 0 }, { userId: oid, reason: '', expectedVersion: 0 }, { userId: oid, reason: 'Policy', expectedVersion: 0, workspaceIds: [oid] }]) assert.throws(() => banInput(body));
  for (const cleanup of ['none', '1', '3', '7', '30', 'all']) assert.equal(previewInput({ userId: oid, cleanup }).cleanup, cleanup);
  assert.throws(() => previewInput({ userId: oid, cleanup: '365' }));
  assert.throws(() => unbanInput({ reason: 'Review', expectedVersion: -1 }));
});
test('preview binds actor, scope, target, cleanup, version and expiry; tampering fails', () => {
  let clock = at; const codec = previewCodec('9'.repeat(64), () => clock);
  const expected = { actorId: oid, scopeType: 'project', scopeId: oid, targetUserId: oid, cleanup: '3', expectedVersion: 0 };
  const token = codec.seal({ ...expected, cutoff: at.toISOString(), from: null, matchedCount: 2 });
  assert.equal(codec.open(token, expected).matchedCount, 2);
  assert.throws(() => codec.open(token, { ...expected, cleanup: 'all' }), { code: 'MODERATION_PREVIEW_INVALID' });
  assert.throws(() => codec.open(token + 'x', expected), { code: 'MODERATION_PREVIEW_INVALID' });
  clock = new Date(at.getTime() + 600_001);
  assert.throws(() => codec.open(token, expected), { code: 'MODERATION_PREVIEW_INVALID' });
});
test('typed bans/jobs reject inconsistent scope, revoke metadata, leases and content copies', async () => {
  const data = { scopeType: 'project', scopeId: oid, workspaceId: oid, projectId: oid, userId: oid, imposedBy: oid, imposedAt: at, reason: 'Policy' };
  await new AccessBan(data).validate();
  await assert.rejects(new AccessBan({ ...data, projectId: 'b'.repeat(24) }).validate());
  await assert.rejects(new AccessBan({ ...data, state: 'revoked' }).validate());
  const job = { scopeType: 'project', scopeId: oid, workspaceId: oid, projectId: oid, actorId: oid, targetUserId: oid, action: 'ban', reason: 'Policy', cutoff: at };
  assert.throws(() => new ModerationAction({ ...job, originalComment: 'Do not copy' }));
  await assert.rejects(new ModerationAction({ ...job, state: 'processing' }).validate());
});
