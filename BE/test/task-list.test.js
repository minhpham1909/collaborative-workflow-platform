import test from 'node:test';
import assert from 'node:assert/strict';
import { taskListPermissions } from '../src/work/task-list.js';

test('Task list actions retain Guest isolation, assignee limits and pending/Archived guards', () => {
  const base = { active: true, guest: false, manager: false, creator: false, assignee: false, done: false, pending: false };
  const assigned = taskListPermissions({ ...base, assignee: true });
  assert.equal(assigned.status, true); assert.equal(assigned.checklistTick, true); assert.equal(assigned.edit, false); assert.equal(assigned.checklistStructure, false);
  const pending = taskListPermissions({ ...base, manager: true, done: true, pending: true });
  assert.equal(pending.status, false); assert.equal(pending.manageReopen, true); assert.equal(pending.requestReopen, false);
  for (const flags of [{ guest: true, manager: true, creator: true, assignee: true }, { active: false, manager: true, creator: true }]) {
    assert.ok(Object.values(taskListPermissions({ ...base, ...flags })).every(value => value === false));
  }
});
