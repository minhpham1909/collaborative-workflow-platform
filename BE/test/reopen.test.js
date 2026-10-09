import { test } from 'node:test';
import assert from 'node:assert/strict';
import mongoose from 'mongoose';
import { reopenInput, reopenReviewInput, statisticsInput } from '../src/work/input.js';
import { TaskReopenRequest } from '../src/models/index.js';

test('Reopen input requires bounded reason, target, independent CAS and no role injection', () => {
  assert.throws(() => reopenInput({ expectedVersion: 0, targetStatus: 'done', reason: 'Need more work' }), /INVALID_INPUT/u);
  assert.throws(() => reopenInput({ expectedVersion: 0, targetStatus: 'todo', reason: '' }), /INVALID_INPUT/u);
  assert.throws(() => reopenInput({ expectedVersion: 0, targetStatus: 'todo', reason: 'Review', requesterId: 'a'.repeat(24) }), /INVALID_INPUT/u);
  assert.throws(() => reopenReviewInput({ expectedVersion: 0, decision: 'approve', reason: 'Review' }), /INVALID_INPUT/u);
  assert.throws(() => reopenReviewInput({ expectedVersion: 0, expectedTaskVersion: 0, decision: 'approve', reason: 'Review', role: 'manager' }), /INVALID_INPUT/u);
  assert.equal(reopenReviewInput({ expectedVersion: 0, expectedTaskVersion: 0, decision: 'reject', reason: 'Thiếu lý do' }).decision, 'reject');
});
test('Request resolution cannot masquerade as pending or approve oneself', async () => {
  const uid = new mongoose.Types.ObjectId();
  const base = { workspaceId: uid, projectId: uid, taskId: uid, requesterId: uid, reason: 'Review', targetStatus: 'todo' };
  await new TaskReopenRequest(base).validate();
  await assert.rejects(new TaskReopenRequest({ ...base, resolvedAt: new Date() }).validate());
  await assert.rejects(new TaskReopenRequest({ ...base, state: 'approved', resolvedAt: new Date(), resolvedBy: uid, resolutionReason: 'Own approval' }).validate());
});
test('Statistics date periods are Vietnam calendar days and reject forged filters', () => {
  assert.equal(statisticsInput({ from: '2026-10-05' }).from.toISOString(), '2026-10-04T17:00:00.000Z');
  assert.equal(statisticsInput({ to: '2026-10-05' }).to.toISOString(), '2026-10-05T17:00:00.000Z');
  assert.throws(() => statisticsInput({ from: '2026-10-06', to: '2026-10-05' }), /INVALID_INPUT/u);
  assert.throws(() => statisticsInput({ workspaceId: 'a'.repeat(24) }), /INVALID_INPUT/u);
});
