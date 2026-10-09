import { test } from 'node:test';
import assert from 'node:assert/strict';
import { randomBytes } from 'node:crypto';
import { once } from 'node:events';
import mongoose from 'mongoose';
import { connectDatabase } from '../src/database.js';
import { models, User, WorkspaceMembership, Task, Project, TaskActivity, ProjectLabel, TaskComment, TaskPurgeAudit, Notification, EmailOutbox, Workspace, WorkspaceLifecycleAudit } from '../src/models/index.js';
import { createAuthService } from '../src/auth/service.js';
import { createMongoAuthStore } from '../src/auth/mongo-store.js';
import { hashPassword } from '../src/auth/passwords.js';
import { createWorkspaceService } from '../src/workspaces/service.js';
import { createMongoWorkspaceStore } from '../src/workspaces/mongo-store.js';
import { createWorkService } from '../src/work/service.js';
import { createMongoWorkStore } from '../src/work/mongo-store.js';
import { createApp } from '../src/app.js';
import { testConfig } from '../test-support/auth-store.js';
import { purgeExpiredTask, runTaskRetention } from '../src/work/retention.js';

test('C5 Workspace archive and Task trash/retention', { skip: !process.env.TEST_MONGODB_URI && 'Dedicated database required', timeout: 90_000 }, async t => {
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
  let server, workspace, project, other;
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
    const rich = text => ({ format: 'prosemirror-json', schemaVersion: 1, document: { type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text }] }] } });
    const archive = async state => { const current = (await ws.get(claims[0], workspace.id)).workspace; return ws.state(claims[0], workspace.id, { expectedVersion: current.version, state, confirmName: current.name, reason: 'Fixture lifecycle' }); };
    await t.test('Workspace archive confirms current name/CAS, preserves individual Project states and read access', async () => {
      await assert.rejects(ws.state(claims[1], workspace.id, { expectedVersion: workspace.version, state: 'archived', confirmName: workspace.name, reason: 'No rights' }), { code: 'OWNER_REQUIRED' });
      await assert.rejects(ws.state(claims[0], workspace.id, { expectedVersion: workspace.version, state: 'archived', confirmName: 'Wrong', reason: 'Wrong name' }), { code: 'WORKSPACE_CONFIRMATION_MISMATCH' });
      other = (await work.state(claims[0], other.id, { expectedVersion: other.version, state: 'archived' })).project;
      const task = await create({ assigneeId: String(users[2]._id) });
      const comment = (await work.createComment(claims[1], task.id, { content: rich('Comment retained') })).comment;
      const guestInvite = await work.inviteGuest(claims[0], project.id, { type: 'LINK' });
      const guestToken = new URLSearchParams(new URL(guestInvite.url).hash.slice(1)).get('token');
      workspace = (await archive('archived')).workspace; assert.equal(workspace.state, 'archived');
      assert.equal((await work.getProject(claims[1], project.id)).project.state, 'active');
      assert.equal((await work.getProject(claims[1], project.id)).project.readOnly, true);
      assert.equal((await work.getTask(claims[1], task.id)).task.permissions.edit, false);
      assert.equal((await work.comments(claims[1], task.id, {})).items[0].permissions.edit, false);
      assert.equal((await work.mine(claims[2], {})).total, 0); assert.equal((await work.mine(claims[2], { state: 'archived' })).total, 1);
      for (const operation of [() => create(), () => work.createProject(claims[0], workspace.id, { name: 'No' }), () => work.updateTask(claims[1], task.id, { expectedVersion: task.version, title: 'No' }), () => work.status(claims[1], task.id, { expectedVersion: task.version, status: 'done' }), () => work.createComment(claims[1], task.id, { content: rich('No') }), () => work.updateComment(claims[1], task.id, comment.id, { expectedVersion: comment.version, content: rich('No') }), () => work.createLabel(claims[0], project.id, { name: 'No' }), () => ws.invite(claims[0], workspace.id, { type: 'LINK' }), () => ws.update(claims[0], workspace.id, { expectedVersion: workspace.version, name: 'No' }), () => work.state(claims[0], project.id, { expectedVersion: project.version, state: 'archived' }), () => ws.accept(claims[3], { token }), () => work.acceptGuestInvitation(claims[3], { token: guestToken })]) await assert.rejects(operation(), { code: 'WORKSPACE_ARCHIVED' });
      await work.deleteComment(claims[0], task.id, comment.id, { expectedVersion: comment.version, reason: 'Archived moderation' });
      assert.equal(await TaskComment.collection.countDocuments({ _id: O(comment.id) }), 0);
      assert.equal((await work.statistics(claims[1], project.id, {})).total, 1);
      workspace = (await archive('active')).workspace;
      await work.acceptGuestInvitation(claims[3], { token: guestToken });
      await assert.rejects(work.trash(claims[3], project.id, {}), { code: 'TRASH_ACCESS_FORBIDDEN' });
      assert.equal((await work.getProject(claims[0], other.id)).project.state, 'archived');
      assert.equal((await work.getProject(claims[0], project.id)).project.readOnly, false);
      assert.equal(await WorkspaceLifecycleAudit.collection.countDocuments({ workspaceId: O(workspace.id) }), 2);
    });
    await t.test('Trash scope, retention deadline and restore preserve code/history without replay', async () => {
      let task = await create({ assigneeId: String(users[2]._id), priority: 'high' });
      const comment = (await work.createComment(claims[1], task.id, { content: rich('Restore comment') })).comment;
      const counts = async () => ({ inbox: await Notification.collection.countDocuments({ taskId: O(task.id) }), outbox: await EmailOutbox.collection.countDocuments({ taskId: O(task.id) }) });
      await work.deleteTask(claims[1], task.id, { expectedVersion: task.version });
      await assert.rejects(work.getTask(claims[1], task.id), { code: 'RESOURCE_UNAVAILABLE' });
      const trash = await work.trash(claims[1], project.id, {}); task = trash.items[0];
      assert.equal(new Date(task.purgeAt).getTime() - new Date(task.deletedAt).getTime(), 30 * 86400_000);
      assert.equal((await work.trash(claims[2], project.id, {})).total, 0);
      await assert.rejects(work.restore(claims[2], task.id, { expectedVersion: task.version }), { code: 'RESOURCE_UNAVAILABLE' });
      const before = await counts(), code = task.code;
      const member = await WorkspaceMembership.collection.findOne({ workspaceId: O(workspace.id), userId: users[2]._id });
      await ws.leave(claims[2], workspace.id, { expectedVersion: member.version });
      task = (await work.restore(claims[1], task.id, { expectedVersion: task.version })).task;
      assert.equal(task.assigneeId, null); assert.equal(task.code, code); assert.equal(task.priority, 'high'); assert.equal((await work.comments(claims[1], task.id, {})).items[0].id, comment.id);
      assert.deepEqual(await counts(), before);
      const stored = await Task.collection.findOne({ _id: O(task.id) }); assert.equal(stored.purgeAt, null); assert.equal(stored.deletedAt, null);
      assert.ok((await work.activity(claims[1], task.id, {})).items.some(value => value.action === 'restored'));
      await ws.accept(claims[2], { token });
    });
    await t.test('Archived parent blocks restore; expired restore fails even before worker runs; legacy trash is unscheduled', async () => {
      const task = await create(); await work.deleteTask(claims[1], task.id, { expectedVersion: task.version });
      let deleted = await Task.collection.findOne({ _id: O(task.id) });
      await archive('archived'); await assert.rejects(work.restore(claims[1], task.id, { expectedVersion: deleted.version }), { code: 'WORKSPACE_ARCHIVED' });
      await archive('active');
      const p = (await work.getProject(claims[0], project.id)).project;
      let parent = (await work.state(claims[0], project.id, { expectedVersion: p.version, state: 'archived' })).project;
      await assert.rejects(work.restore(claims[1], task.id, { expectedVersion: deleted.version }), { code: 'PROJECT_ARCHIVED' });
      parent = (await work.state(claims[0], project.id, { expectedVersion: parent.version, state: 'active' })).project; project = parent;
      const expiration = new Date(clock.getTime() - 30 * 86400_000);
      await Task.collection.updateOne({ _id: deleted._id }, { $set: { deletedAt: expiration, purgeAt: clock } });
      await assert.rejects(work.restore(claims[1], task.id, { expectedVersion: deleted.version }), { code: 'TASK_RETENTION_EXPIRED' });
      const legacy = await create(); await work.deleteTask(claims[1], legacy.id, { expectedVersion: legacy.version });
      await Task.collection.updateOne({ _id: O(legacy.id) }, { $unset: { purgeAt: '' } });
      const row = (await work.trash(claims[1], project.id, {})).items.find(value => value.id === legacy.id); assert.equal(row.retentionScheduled, false);
      assert.equal((await work.restore(claims[1], legacy.id, { expectedVersion: row.version })).task.id, legacy.id);
    });
    await t.test('Expired purge is atomic, bounded, idempotent and never reuses code or touches another Project', async () => {
      let task = await create({ assigneeId: String(users[2]._id) });
      await work.createComment(claims[1], task.id, { content: rich('Purge me') });
      await work.deleteTask(claims[1], task.id, { expectedVersion: task.version });
      const row = await Task.collection.findOne({ _id: O(task.id) });
      await Task.collection.updateOne({ _id: row._id }, { $set: { deletedAt: new Date(clock.getTime() - 30 * 86400_000), purgeAt: clock } });
      const foreignProject = (await work.createProject(claims[0], workspace.id, { name: 'Foreign retention scope' })).project;
      const foreign = (await work.createTask(claims[0], foreignProject.id, { title: 'Foreign' })).task;
      const foreignComment = (await work.createComment(claims[0], foreign.id, { content: rich('Keep me') })).comment;
      const results = await Promise.all([purgeExpiredTask(row._id, row.version, { now: () => clock }), purgeExpiredTask(row._id, row.version, { now: () => clock })]);
      assert.equal(results.filter(value => value.state === 'purged').length, 1);
      for (const model of [TaskComment, TaskActivity, Notification, EmailOutbox]) assert.equal(await model.collection.countDocuments({ taskId: row._id }), 0);
      assert.equal(await Task.collection.countDocuments({ _id: row._id }), 0); assert.equal(await TaskPurgeAudit.collection.countDocuments({ taskId: row._id }), 1);
      assert.equal(await TaskComment.collection.countDocuments({ _id: O(foreignComment.id) }), 1);
      const next = await create(); assert.notEqual(next.code, row.code); assert.ok(Number(next.code.split('-')[2]) > Number(row.code.split('-')[2]));
      assert.equal((await runTaskRetention({ now: () => clock, limit: 1 })).selected, 1); // previously expired row from prior case
      assert.equal((await runTaskRetention({ now: () => clock, limit: 1 })).purged, 0);
    });
    await t.test('Restore versus purge keeps a committed restore and stale worker version cannot delete it', async () => {
      const task = await create(); await work.deleteTask(claims[1], task.id, { expectedVersion: task.version });
      const deleted = await Task.collection.findOne({ _id: O(task.id) });
      await Promise.all([work.restore(claims[1], task.id, { expectedVersion: deleted.version }), purgeExpiredTask(deleted._id, deleted.version, { now: () => clock })]);
      assert.equal((await work.getTask(claims[1], task.id)).task.id, task.id);
      assert.equal((await purgeExpiredTask(deleted._id, deleted.version, { now: () => new Date(deleted.purgeAt.getTime() + 1) })).state, 'skipped');
      const second = await create(); await work.deleteTask(claims[1], second.id, { expectedVersion: second.version });
      const pending = await Task.collection.findOne({ _id: O(second.id) });
      // Controlled time boundary: restore starts before expiry, worker at expiry.
      const results = await Promise.allSettled([work.restore(claims[1], second.id, { expectedVersion: pending.version }), purgeExpiredTask(pending._id, pending.version, { now: () => pending.purgeAt })]);
      const restored = results[0].status === 'fulfilled';
      assert.equal(await Task.collection.countDocuments({ _id: pending._id }), restored ? 1 : 0);
      assert.equal(await TaskPurgeAudit.collection.countDocuments({ taskId: pending._id }), restored ? 0 : 1);
    });
    await t.test('Purge audit failure rolls back children; invalid retention is skipped', async () => {
      const task = await create(); const comment = (await work.createComment(claims[1], task.id, { content: rich('Rollback me') })).comment;
      await work.deleteTask(claims[1], task.id, { expectedVersion: task.version });
      const row = await Task.collection.findOne({ _id: O(task.id) });
      await Task.collection.updateOne({ _id: row._id }, { $set: { deletedAt: new Date(clock.getTime() - 30 * 86400_000), purgeAt: clock } });
      await new TaskPurgeAudit({ workspaceId: row.workspaceId, projectId: row.projectId, taskId: row._id, deletedAt: row.deletedAt, purgedAt: clock }).save();
      await assert.rejects(purgeExpiredTask(row._id, row.version, { now: () => clock }), /duplicate key/u);
      assert.equal(await Task.collection.countDocuments({ _id: row._id }), 1); assert.equal(await TaskComment.collection.countDocuments({ _id: O(comment.id) }), 1);
      await TaskPurgeAudit.collection.deleteMany({ taskId: row._id });
      await Task.collection.updateOne({ _id: row._id }, { $set: { purgeAt: new Date(clock.getTime() - 1) } });
      assert.equal((await purgeExpiredTask(row._id, row.version, { now: () => clock })).state, 'invalid_retention_skipped');
      const first = await runTaskRetention({ now: () => clock, limit: 1 }); assert.equal(first.skipped, 1); assert.ok(first.nextCursor);
      const beyond = await runTaskRetention({ now: () => clock, limit: 1, after: first.nextCursor }); assert.equal(beyond.selected, 0);
    });
    await t.test('HTTP auth/Origin/CAS and trashed child unavailable, no destructive Workspace/Project endpoints', async () => {
      const task = await create(); await work.deleteTask(claims[1], task.id, { expectedVersion: task.version });
      const trash = (await work.trash(claims[1], project.id, {})).items.find(value => value.id === task.id);
      assert.equal((await http(1, `/tasks/${task.id}/restore`, 'POST', { expectedVersion: task.version })).status, 409);
      assert.equal((await http(1, `/tasks/${task.id}/restore`, 'POST', { expectedVersion: trash.version })).status, 200);
      assert.equal((await http(1, `/workspaces/${workspace.id}/state`, 'PATCH', { expectedVersion: workspace.version, state: 'archived', confirmName: workspace.name, reason: 'Member' })).status, 403);
      assert.equal((await http(0, `/workspaces/${workspace.id}/delete`, 'POST', {})).status, 404);
      assert.equal((await http(0, `/projects/${project.id}/delete`, 'POST', {})).status, 404);
      const denied = await fetch(base + `/tasks/${task.id}/restore`, { method: 'POST', headers: { Origin: 'https://attacker.example', 'Content-Type': 'application/json', Authorization: `Bearer ${login[1].accessToken}` }, body: JSON.stringify({ expectedVersion: trash.version }) }); assert.equal(denied.status, 403);
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
