import { test } from 'node:test';
import assert from 'node:assert/strict';
import { taskInput, statusInput, labelInput, checklistInput, checklistTickInput, taskQuery } from '../src/work/input.js';
import { deadlineGroup, deadlineBounds } from '../src/work/deadline-groups.js';

test('C4 inputs reject forged codes, timestamps, checklist state and invalid priorities/labels', () => {
  for (const fields of [{ code: 'WF-ABCDEF-1' }, { completedAt: new Date().toISOString() }, { checklist: [] }, { priority: 'urgent' }, { labelIds: ['a'.repeat(24), 'a'.repeat(24)] }]) {
    assert.throws(() => taskInput({ title: 'Task', ...fields }), /INVALID_INPUT/u);
  }
  assert.deepEqual(taskInput({ title: 'Task', priority: 'high', labelIds: [] }).fields, { title: 'Task', priority: 'high', labelIds: [] });
  assert.throws(() => checklistInput({ expectedVersion: 0, items: [{ text: 'Mục', checked: true }] }), /INVALID_INPUT/u);
  assert.throws(() => checklistTickInput({ expectedVersion: 0, checked: 'true' }), /INVALID_INPUT/u);
  assert.throws(() => statusInput({ expectedVersion: 0, status: 'done', confirmIncompleteChecklist: 1 }), /INVALID_INPUT/u);
  assert.equal(statusInput({ expectedVersion: 0, status: 'done', confirmIncompleteChecklist: true }).confirmIncompleteChecklist, true);
  assert.throws(() => checklistInput({ expectedVersion: 0, items: Array.from({ length: 101 }, () => ({ text: 'Item' })) }), /INVALID_INPUT/u);
});

test('C4 labels and query use bounded typed values', () => {
  assert.equal(labelInput({ name: '  Thiết kế  ' }).fields.nameKey, 'thiết kế');
  assert.throws(() => labelInput({ name: 'Label', color: '#abc' }), /INVALID_INPUT/u);
  assert.throws(() => labelInput({ expectedVersion: 0, archived: 'true' }, true), /INVALID_INPUT/u);
  assert.throws(() => taskQuery({ priority: 'urgent' }), /INVALID_INPUT/u);
  assert.equal(taskQuery({ priority: 'high', labelId: 'a'.repeat(24) }).labelId, 'a'.repeat(24));
});
test('My Tasks deadline groups use Vietnam midnight, exact deadline and Done exemption', () => {
  const now = new Date('2026-10-05T16:00:00.000Z');
  assert.equal(deadlineBounds(now).end.toISOString(), '2026-10-05T17:00:00.000Z');
  assert.equal(deadlineGroup({ status: 'todo', dueAt: new Date(now.getTime() - 1) }, now), 'overdue');
  assert.equal(deadlineGroup({ status: 'todo', dueAt: now }, now), 'today');
  assert.equal(deadlineGroup({ status: 'todo', dueAt: deadlineBounds(now).end }, now), 'upcoming');
  assert.equal(deadlineGroup({ status: 'todo', dueAt: null }, now), 'no_deadline');
  assert.equal(deadlineGroup({ status: 'done', dueAt: new Date(now.getTime() - 1) }, now), 'completed');
});
