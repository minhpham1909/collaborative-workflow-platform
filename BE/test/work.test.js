import { test } from 'node:test';
import assert from 'node:assert/strict';
import { taskInput, commentInput, projectInput, taskQuery, searchPatterns, vietnamDay } from '../src/work/input.js';
import { emptyRichText } from '../src/content/rich-text.js';

test('Work DTO rejects forged scope, status, derived content and invalid deadlines', () => {
  for (const input of [{ title: 'Task', workspaceId: 'a'.repeat(24) }, { title: 'Task', status: 'done' }, { title: 'Task', dueAt: '2026-02-30T00:00:00.000Z' }, { title: 'Task', dueAt: '2026-10-03T00:00:01.000Z' }, { title: 'Task', assigneeId: { $ne: null } }]) assert.throws(() => taskInput(input));
  assert.equal(taskInput({ title: ' Task ', dueAt: '2026-10-03T00:00:00.000Z' }).fields.title, 'Task');
  assert.throws(() => taskInput({ expectedVersion: 0 }, true));
  assert.throws(() => projectInput({ name: 'Project', createdBy: 'a'.repeat(24) }));
  assert.throws(() => commentInput({ content: emptyRichText() }));
});
test('Literal Vietnamese AND search and Vietnam calendar boundaries', () => {
  const patterns = searchPatterns('ĐỀ  dự  án');
  assert.ok(patterns.every((pattern) => new RegExp(pattern, 'iu').test('Dự án đề xuất')));
  assert.ok(new RegExp(searchPatterns('.*')[0], 'u').test('literal .*'));
  assert.ok(!new RegExp(searchPatterns('.*')[0], 'u').test('anything'));
  assert.equal(vietnamDay('2026-10-03').toISOString(), '2026-10-02T17:00:00.000Z');
  const query = taskQuery({ from: '2026-10-03', to: '2026-10-03' }, true);
  assert.equal(query.to.toISOString(), '2026-10-03T17:00:00.000Z');
  assert.equal(query.status, 'open'); assert.equal(query.state, 'active');
  for (const invalid of [{ from: '2026-02-30' }, { from: '2026-10-04', to: '2026-10-03' }, { q: { $regex: '.*' } }, { overdue: 'yes' }, { state: 'deleted' }]) assert.throws(() => taskQuery(invalid, true));
});
