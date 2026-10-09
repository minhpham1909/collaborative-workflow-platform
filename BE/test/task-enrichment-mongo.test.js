import { test } from 'node:test';
import assert from 'node:assert/strict';
import { randomBytes } from 'node:crypto';
import { once } from 'node:events';
import mongoose from 'mongoose';
import { connectDatabase } from '../src/database.js';
import { models, User, WorkspaceMembership, Task, Project, TaskActivity, ProjectLabel } from '../src/models/index.js';
import { createAuthService } from '../src/auth/service.js';
import { createMongoAuthStore } from '../src/auth/mongo-store.js';
import { hashPassword } from '../src/auth/passwords.js';
import { createWorkspaceService } from '../src/workspaces/service.js';
import { createMongoWorkspaceStore } from '../src/workspaces/mongo-store.js';
import { createWorkService } from '../src/work/service.js';
import { createMongoWorkStore } from '../src/work/mongo-store.js';
import { createApp } from '../src/app.js';
import { testConfig } from '../test-support/auth-store.js';
import { auditTaskCodes, backfillTaskCodes } from '../src/work/task-codes.js';

test('C4 Task enrichment transactional API', { skip: !process.env.TEST_MONGODB_URI && 'Dedicated database required', timeout: 90_000 }, async t => {
  assert.equal(new URL(process.env.TEST_MONGODB_URI).pathname.slice(1), 'workflow_auth_test');
  await connectDatabase(process.env.TEST_MONGODB_URI);
  const config = testConfig(), prefix = `c4-${randomBytes(8).toString('hex')}`;
  const password = 'C4 integration password', passwordHash = await hashPassword(password);
  const auth = await createAuthService({ store: createMongoAuthStore(), config });
  const ws = createWorkspaceService({ store: createMongoWorkspaceStore({ config }) });
  let clock = new Date();
  const work = createWorkService({ store: createMongoWorkStore({ config, now: () => clock }) });
  const users = [], claims = [], login = [], workspaceIds = [];
  const O = value => new mongoose.Types.ObjectId(value);
  let server, workspace, project, other, label, task;
  const create = async (fields = {}, who = 1) => (await work.createTask(claims[who], project.id, { title: 'Task thử', ...fields })).task;
  try {
    for (const model of Object.values(models)) await model.createIndexes();
    for (let i = 0; i < 4; i++) {
      const user = new User({ displayName: `C4 User ${i}`, email: `${prefix}-${i}@example.com`, passwordHash, emailVerifiedAt: clock, termsAcceptance: { version: 'test', acceptedAt: clock } });
      await user.save(); users.push(user.toObject()); login.push(await auth.login({ email: user.email, password })); claims.push(await auth.authenticate(login[i].accessToken));
    }
    workspace = (await ws.create(claims[0], { name: 'C4 workspace' })).workspace; workspaceIds.push(O(workspace.id));
    const invite = await ws.invite(claims[0], workspace.id, { type: 'LINK' });
    const token = new URLSearchParams(new URL(invite.url).hash.slice(1)).get('token');
    for (const i of [1, 2]) await ws.accept(claims[i], { token });
    project = (await work.createProject(claims[0], workspace.id, { name: 'C4 Project' })).project;
    other = (await work.createProject(claims[0], workspace.id, { name: 'Other Project' })).project;
    server = createApp({ authService: auth, authConfig: config, workspaceService: ws, workService: work }).listen(0, '127.0.0.1'); await once(server, 'listening');
    const base = `http://127.0.0.1:${server.address().port}`;
    const http = (i, path, method = 'GET', body) => fetch(base + path, { method, headers: { Origin: config.webOrigin, 'Content-Type': 'application/json', Authorization: `Bearer ${login[i].accessToken}` }, ...(body === undefined ? {} : { body: JSON.stringify(body) }) });
    await t.test('Project label management, scoped assignment, archive and CAS', async () => {
      await assert.rejects(work.createLabel(claims[1], project.id, { name: 'No' }), /PROJECT_MANAGEMENT_REQUIRED/u);
      label = (await work.createLabel(claims[0], project.id, { name: 'Thiết kế', color: 'mint' })).label;
      await assert.rejects(work.createLabel(claims[0], project.id, { name: 'THIẾT KẾ' }), /LABEL_NAME_CONFLICT/u);
      const foreign = (await work.createLabel(claims[0], other.id, { name: 'Other' })).label;
      await assert.rejects(create({ labelIds: [foreign.id] }), /LABEL_NOT_AVAILABLE/u);
      task = await create({ priority: 'high', labelIds: [label.id], assigneeId: String(users[2]._id) });
      assert.equal(task.priority, 'high'); assert.equal(task.labels[0].color, 'mint');
      label = (await work.updateLabel(claims[0], project.id, label.id, { expectedVersion: label.version, archived: true })).label;
      await assert.rejects(create({ labelIds: [label.id] }), /LABEL_NOT_AVAILABLE/u);
      assert.ok((await work.getTask(claims[1], task.id)).task.labels[0].archivedAt);
      await assert.rejects(work.updateLabel(claims[0], project.id, label.id, { expectedVersion: 0, name: 'Stale' }), /VERSION_CONFLICT/u);
      assert.equal((await http(3, `/projects/${project.id}/labels`)).status, 404);
      assert.equal((await http(1, `/projects/${project.id}/labels`)).status, 200);
      const led = (await work.lead(claims[0], project.id, { expectedVersion: project.version, leadId: String(users[2]._id) })).project; project = led;
      assert.ok((await work.createLabel(claims[2], project.id, { name: 'Lead label' })).label.id);
    });
    await t.test('Atomic readable codes, parallel creation, search and no reuse after deletion', async () => {
      const values = await Promise.all(Array.from({ length: 6 }, () => create()));
      assert.equal(new Set(values.map(value => value.code)).size, 6);
      for (const value of values) assert.match(value.code, /^WF-[A-F0-9]{6}-[1-9][0-9]*$/u);
      const prefix = values[0].code.split('-')[1]; assert.ok(values.every(value => value.code.split('-')[1] === prefix));
      const found = await work.tasks(claims[1], project.id, { q: task.code.toLowerCase() }); assert.equal(found.total, 1); assert.equal(found.items[0].id, task.id);
      const removed = values[0]; await work.deleteTask(claims[1], removed.id, { expectedVersion: removed.version });
      const next = await create(); assert.notEqual(next.code, removed.code);
      const p = await Project.collection.findOne({ _id: O(project.id) }); assert.ok(p.taskSequence >= 8);
      await assert.rejects(Task.collection.insertOne({ _id: O(), code: next.code }), /duplicate key/u);
    });
    await t.test('Checklist structure/ticks preserve IDs and checked state; races and Done confirmation', async () => {
      task = (await work.checklist(claims[1], task.id, { expectedVersion: task.version, items: [{ text: 'Kiểm tra' }, { text: 'Bàn giao' }] })).task;
      const first = task.checklist[0].id;
      // Assigned Lead can edit structure because Lead carries independent management rights.
      await work.lead(claims[0], project.id, { expectedVersion: project.version, leadId: null });
      await assert.rejects(work.checklist(claims[2], task.id, { expectedVersion: task.version, items: [] }), /TASK_EDIT_FORBIDDEN/u);
      const results = await Promise.allSettled([work.tickChecklist(claims[2], task.id, first, { expectedVersion: task.version, checked: true }), work.tickChecklist(claims[1], task.id, first, { expectedVersion: task.version, checked: false })]);
      // A no-op may succeed without consuming a version; force a second stale write below.
      assert.ok(results.some(result => result.status === 'fulfilled'));
      task = (await work.getTask(claims[1], task.id)).task;
      if (!task.checklist[0].checked) task = (await work.tickChecklist(claims[2], task.id, first, { expectedVersion: task.version, checked: true })).task;
      await assert.rejects(work.tickChecklist(claims[2], task.id, first, { expectedVersion: 0, checked: false }), /VERSION_CONFLICT/u);
      task = (await work.checklist(claims[1], task.id, { expectedVersion: task.version, items: task.checklist.map(item => ({ id: item.id, text: item.text + ' sửa' })) })).task;
      assert.equal(task.checklist[0].id, first); assert.equal(task.checklist[0].checked, true);
      await assert.rejects(work.status(claims[2], task.id, { expectedVersion: task.version, status: 'done' }), /CHECKLIST_INCOMPLETE_CONFIRMATION_REQUIRED/u);
      const response = await http(2, `/tasks/${task.id}/status`, 'PATCH', { expectedVersion: task.version, status: 'done', confirmIncompleteChecklist: true });
      assert.equal(response.status, 200); task = (await response.json()).task; assert.equal(new Date(task.completedAt).getTime(), clock.getTime());
    });
    await t.test('Completion timestamps and scoped append-only history; no-op does not duplicate', async () => {
      const initial = task.completedAt;
      clock = new Date(clock.getTime() + 60_000);
      task = (await work.status(claims[1], task.id, { expectedVersion: task.version, status: 'done' })).task;
      assert.equal(new Date(task.completedAt).getTime(), new Date(initial).getTime());
      task = (await work.updateTask(claims[1], task.id, { expectedVersion: task.version, title: 'Sửa Task Done' })).task;
      assert.equal(new Date(task.completedAt).getTime(), new Date(initial).getTime());
      task = (await work.status(claims[0], task.id, { expectedVersion: task.version, status: 'todo', reason: 'Kiểm tra lại' })).task; assert.equal(task.completedAt, null);
      task = (await work.status(claims[1], task.id, { expectedVersion: task.version, status: 'done', confirmIncompleteChecklist: true })).task;
      const history = await work.activity(claims[1], task.id, { limit: '100' });
      assert.equal(history.items.filter(value => value.action === 'status_changed' && value.status === 'done').length, 2);
      assert.ok(history.items.every(value => !('description' in value) && !('email' in value.actor)));
      await assert.rejects(work.activity(claims[3], task.id, {}), /RESOURCE_UNAVAILABLE/u);
      assert.equal((await http(1, `/tasks/${task.id}/checklist/invalid`, 'PATCH', { expectedVersion: task.version, checked: true })).status, 400);
    });
    await t.test('My Tasks deadline counts cover filtered full set, not current cursor page', async () => {
      const nowMinute = new Date(Math.floor(clock.getTime() / 60_000) * 60_000);
      await create({ title: 'Grouped past', assigneeId: String(users[2]._id), dueAt: new Date(nowMinute.getTime() - 60_000).toISOString() });
      await create({ title: 'Grouped future', assigneeId: String(users[2]._id), dueAt: new Date(nowMinute.getTime() + 86400_000).toISOString() });
      await create({ title: 'Grouped none', assigneeId: String(users[2]._id) });
      const page = await work.mine(claims[2], { q: 'Grouped', limit: '1' });
      assert.equal(page.items.length, 1); assert.equal(page.total, 3);
      assert.equal(page.groupCounts.overdue, 1); assert.equal(page.groupCounts.upcoming, 1); assert.equal(page.groupCounts.no_deadline, 1);
      assert.equal(Object.values(page.groupCounts).reduce((a, b) => a + b, 0), page.total);
      const next = await work.mine(claims[2], { q: 'Grouped', limit: '1', cursor: page.nextCursor });
      assert.deepEqual(next.groupCounts, page.groupCounts); assert.ok(next.items[0].deadlineGroup);
      const selected = await work.mine(claims[2], { q: 'Grouped', projectId: project.id, limit: '1' });
      assert.equal(selected.total, 3); assert.deepEqual(selected.groupCounts, page.groupCounts);
      assert.equal((await work.mine(claims[2], { q: 'Grouped', projectId: other.id })).total, 0);
      assert.equal((await work.mine(claims[3], { projectId: project.id })).total, 0);
      assert.throws(() => work.mine(claims[2], { projectId: 'not-an-id' }), /INVALID_INPUT/u);
      const board = await work.board(claims[2], project.id, { q: 'Grouped', limit: '1' });
      assert.equal(Object.values(board.columns).reduce((sum, column) => sum + column.total, 0), 3);
      const full = await work.statistics(claims[2], project.id, {});
      assert.equal(board.statistics.scope, 'whole_project');
      for (const key of ['total', 'done', 'overdue', 'progressPercent']) assert.equal(board.statistics[key], full[key]);
      assert.equal(board.project.id, project.id);
    });
    await t.test('Legacy Done keeps unknown time; archived blocks all mutations and forged fields', async () => {
      const legacy = await create(); await Task.collection.updateOne({ _id: O(legacy.id) }, { $set: { status: 'done' }, $unset: { completedAt: '', priority: '', checklist: '', labelIds: '', code: '' } });
      const read = (await work.getTask(claims[1], legacy.id)).task; assert.equal(read.completedAt, null); assert.equal(read.completionTimeKnown, false); assert.equal(read.priority, 'medium'); assert.deepEqual(read.checklist, []);
      await assert.rejects(create({ completedAt: clock.toISOString() }), /INVALID_INPUT/u);
      const current = (await work.getProject(claims[0], project.id)).project;
      await work.state(claims[0], project.id, { expectedVersion: current.version, state: 'archived' });
      await assert.rejects(work.checklist(claims[1], task.id, { expectedVersion: task.version, items: [] }), /PROJECT_ARCHIVED/u);
      await assert.rejects(work.createLabel(claims[0], project.id, { name: 'Archived' }), /PROJECT_ARCHIVED/u);
      const archived = (await work.getTask(claims[1], task.id)).task; assert.equal(archived.permissions.checklistTick, false);
      assert.ok((await work.activity(claims[1], task.id, {})).items.length);
      const before = await Task.collection.findOne({ _id: O(legacy.id) });
      assert.equal((await auditTaskCodes()).problems.length, 0);
      assert.equal(await backfillTaskCodes(O(project.id)), 1);
      assert.equal(await backfillTaskCodes(O(project.id)), 0);
      const migrated = await Task.collection.findOne({ _id: before._id });
      assert.match(migrated.code, /^WF-[A-F0-9]{6}-[1-9][0-9]*$/u);
      assert.deepEqual(migrated.updatedAt, before.updatedAt); assert.equal(migrated.completedAt, undefined);
      assert.equal(migrated.version, before.version + 1);
    });
  } finally {
    if (server) await new Promise(resolve => server.close(resolve));
    for (const model of Object.values(models)) {
      if (model.schema.path('workspaceId')) await model.collection.deleteMany({ workspaceId: { $in: workspaceIds } });
      else if (model.schema.path('userId')) await model.collection.deleteMany({ userId: { $in: users.map(user => user._id) } });
    }
    await models.Workspace.collection.deleteMany({ _id: { $in: workspaceIds } }); await User.collection.deleteMany({ _id: { $in: users.map(user => user._id) } });
    await mongoose.disconnect();
  }
});
