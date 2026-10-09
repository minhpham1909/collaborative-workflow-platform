import { test } from 'node:test';
import assert from 'node:assert/strict';
import mongoose from 'mongoose';
import { workspaceStateInput } from '../src/workspaces/input.js';
import { Task, Workspace } from '../src/models/index.js';
import { projectReadOnly } from '../src/workspaces/lifecycle.js';

test('C5 Workspace archive confirmation is typed and cannot bypass ownership/CAS', () => {
  for (const input of [{ expectedVersion: 0, state: 'deleted', confirmName: 'WS', reason: 'Close' }, { expectedVersion: 0, state: 'archived', reason: 'Close' }, { expectedVersion: 0, state: 'archived', confirmName: 'WS', reason: '' }, { expectedVersion: 0, state: 'archived', confirmName: 'WS', reason: 'Close', ownerId: 'a'.repeat(24) }]) assert.throws(() => workspaceStateInput(input), /INVALID_INPUT/u);
  assert.equal(projectReadOnly({ state: 'archived' }, { state: 'active' }), true);
  assert.equal(projectReadOnly({}, { state: 'active' }), false);
});
test('C5 retention fields require exact 30 days; archive metadata stays consistent', async () => {
  const uid = new mongoose.Types.ObjectId(), date = new Date();
  const fields = { workspaceId: uid, projectId: uid, createdBy: uid, title: 'Trash' };
  await assert.rejects(new Task({ ...fields, purgeAt: date }).validate());
  await assert.rejects(new Task({ ...fields, deletedAt: date, deletedBy: uid, purgeAt: new Date(date.getTime() + 1) }).validate());
  await new Task({ ...fields, deletedAt: date, deletedBy: uid, purgeAt: new Date(date.getTime() + 30 * 86400_000) }).validate();
  await assert.rejects(new Workspace({ ownerId: uid, name: 'WS', state: 'archived' }).validate());
});
