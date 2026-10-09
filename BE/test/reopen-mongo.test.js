import { test } from 'node:test';
import assert from 'node:assert/strict';
import { randomBytes } from 'node:crypto';
import { once } from 'node:events';
import mongoose from 'mongoose';
import { connectDatabase } from '../src/database.js';
import { models, User, WorkspaceMembership, Task, Project, TaskActivity, ProjectLabel, TaskReopenRequest, Organization, OrganizationMembership, Workspace } from '../src/models/index.js';
import { createAuthService } from '../src/auth/service.js';
import { createMongoAuthStore } from '../src/auth/mongo-store.js';
import { hashPassword } from '../src/auth/passwords.js';
import { createWorkspaceService } from '../src/workspaces/service.js';
import { createMongoWorkspaceStore } from '../src/workspaces/mongo-store.js';
import { createWorkService } from '../src/work/service.js';
import { createMongoWorkStore } from '../src/work/mongo-store.js';
import { createApp } from '../src/app.js';
import { testConfig } from '../test-support/auth-store.js';
import { createModerationService } from '../src/moderation/service.js';
import { createMongoModerationStore } from '../src/moderation/mongo-store.js';

test('C4 reopen approval and Project statistics', { skip: !process.env.TEST_MONGODB_URI && 'Dedicated database required', timeout: 90_000 }, async t => {
  assert.equal(new URL(process.env.TEST_MONGODB_URI).pathname.slice(1), 'workflow_auth_test');
  await connectDatabase(process.env.TEST_MONGODB_URI);
  const config = { ...testConfig(), refreshTtlSeconds: 30 * 86400 }, prefix = `c4-${randomBytes(8).toString('hex')}`;
  const password = 'C4 integration password', passwordHash = await hashPassword(password);
  const auth = await createAuthService({ store: createMongoAuthStore(), config });
  const ws = createWorkspaceService({ store: createMongoWorkspaceStore({ config }) });
  let clock = new Date();
  const work = createWorkService({ store: createMongoWorkStore({ config, now: () => clock }) });
  const moderation = createModerationService({ store: createMongoModerationStore({ config, now: () => clock }) });
  const users = [], claims = [], login = [], workspaceIds = [], organizationIds = [];
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
    const doneTask = async (who = 1, fields = {}) => {
      const task = await create({ assigneeId: String(users[2]._id), ...fields }, who);
      return (await work.status(claims[who], task.id, { expectedVersion: task.version, status: 'done' })).task;
    };
    const request = (task, who = 1) => work.requestReopen(claims[who], task.id, { expectedVersion: task.version, targetStatus: 'in_progress', reason: 'Cần kiểm thử thêm' });
    const review = (task, req, decision = 'approve', who = 0) => work.reviewReopen(claims[who], task.id, req.id, { expectedVersion: req.version, expectedTaskVersion: task.version, decision, reason: decision === 'approve' ? 'Đồng ý kiểm tra lại' : 'Chưa đủ cơ sở' });
    await t.test('Creator/Assignee request only, pending uniqueness under races and no generic reopen bypass', async () => {
      const task = await doneTask();
      await assert.rejects(work.status(claims[1], task.id, { expectedVersion: task.version, status: 'todo', reason: 'Bypass' }), { code: 'REOPEN_APPROVAL_REQUIRED' });
      await assert.rejects(work.status(claims[0], task.id, { expectedVersion: task.version, status: 'todo' }), { code: 'REOPEN_REASON_REQUIRED' });
      await assert.rejects(request(task, 3), { code: 'RESOURCE_UNAVAILABLE' });
      const results = await Promise.allSettled([request(task), request(task, 2)]);
      assert.equal(results.filter(value => value.status === 'fulfilled').length, 1);
      assert.equal(results.find(value => value.status === 'rejected').reason.code, 'REOPEN_REQUEST_PENDING');
      assert.equal(await TaskReopenRequest.collection.countDocuments({ taskId: O(task.id), state: 'pending' }), 1);
      const req = results.find(value => value.status === 'fulfilled').value.request;
      await assert.rejects(review(task, req, 'approve', 1), { code: 'PROJECT_MANAGEMENT_REQUIRED' });
      const result = await review(task, req); assert.equal(result.request.state, 'approved'); assert.equal(result.task.status, 'in_progress'); assert.equal(result.task.completedAt, null);
      await assert.rejects(review(task, req), { code: 'VERSION_CONFLICT' });
      const history = await work.activity(claims[1], task.id, {}); assert.ok(history.items.some(value => value.reopenRequestId === req.id && value.reason === 'Đồng ý kiểm tra lại'));
      const mismatch = await doneTask(); await assert.rejects(work.reviewReopen(claims[0], mismatch.id, req.id, { expectedVersion: 0, expectedTaskVersion: mismatch.version, decision: 'approve', reason: 'Wrong Task' }), { code: 'RESOURCE_UNAVAILABLE' });
    });
    await t.test('Owner/Lead cannot approve own pending request; new Lead takes over and old Lead loses authority', async () => {
      const task = await doneTask(0), req = (await request(task, 0)).request;
      await assert.rejects(review(task, req), { code: 'REOPEN_SELF_REVIEW_FORBIDDEN' });
      await assert.rejects(work.status(claims[0], task.id, { expectedVersion: task.version, status: 'todo', reason: 'Self bypass' }), { code: 'REOPEN_SELF_REVIEW_FORBIDDEN' });
      project = (await work.lead(claims[0], project.id, { expectedVersion: project.version, leadId: String(users[1]._id) })).project;
      project = (await work.lead(claims[0], project.id, { expectedVersion: project.version, leadId: String(users[2]._id) })).project;
      await assert.rejects(review(task, req, 'approve', 1), { code: 'PROJECT_MANAGEMENT_REQUIRED' });
      assert.equal((await work.projectReopenRequests(claims[2], project.id, {})).total, 1);
      assert.equal((await review(task, req, 'approve', 2)).request.state, 'approved');
      project = (await work.lead(claims[0], project.id, { expectedVersion: project.version, leadId: null })).project;
    });
    await t.test('Rejection cooldown exact 24h and maximum 3 requests in rolling 7d, not lifecycle limit', async () => {
      const task = await doneTask(), baseTime = new Date(clock);
      let req = (await request(task)).request; await review(task, req, 'reject');
      clock = new Date(baseTime.getTime() + 86400_000 - 1); await assert.rejects(request(task), { code: 'REOPEN_REQUEST_COOLDOWN' });
      clock = new Date(baseTime.getTime() + 86400_000); req = (await request(task)).request; await review(task, req, 'reject');
      clock = new Date(baseTime.getTime() + 2 * 86400_000); req = (await request(task)).request; await review(task, req, 'reject');
      clock = new Date(baseTime.getTime() + 3 * 86400_000); await assert.rejects(request(task), { code: 'REOPEN_REQUEST_RATE_LIMIT' });
      clock = new Date(baseTime.getTime() + 7 * 86400_000); req = (await request(task)).request; assert.ok(req.id);
      await review(task, req, 'approve');
      const opened = (await work.getTask(claims[0], task.id)).task;
      let done = (await work.status(claims[0], task.id, { expectedVersion: opened.version, status: 'done' })).task;
      done = (await work.status(claims[0], task.id, { expectedVersion: done.version, status: 'todo', reason: 'Quản lý kiểm tra lại' })).task; assert.equal(done.status, 'todo');
    });
    await t.test('Concurrent approval/rejection and archive/approval commit consistently', async () => {
      const task = await doneTask(), req = (await request(task)).request;
      project = (await work.lead(claims[0], project.id, { expectedVersion: project.version, leadId: String(users[2]._id) })).project;
      const results = await Promise.allSettled([review(task, req), review(task, req, 'reject', 2)]);
      assert.equal(results.filter(value => value.status === 'fulfilled').length, 1);
      const stored = await TaskReopenRequest.collection.findOne({ _id: O(req.id) }), current = (await work.getTask(claims[0], task.id)).task;
      assert.equal(current.status, stored.state === 'approved' ? 'in_progress' : 'done');
      const second = await doneTask(), pending = (await request(second)).request;
      await Promise.allSettled([review(second, pending), work.state(claims[0], project.id, { expectedVersion: project.version, state: 'archived' })]);
      const archived = (await work.getProject(claims[0], project.id)).project; assert.equal(archived.state, 'archived');
      const requestState = await TaskReopenRequest.collection.findOne({ _id: O(pending.id) });
      assert.ok(['approved', 'cancelled'].includes(requestState.state));
      if (requestState.state === 'cancelled') assert.equal((await work.getTask(claims[0], second.id)).task.status, 'done');
      await assert.rejects(request(second), { code: 'PROJECT_ARCHIVED' });
      project = (await work.state(claims[0], project.id, { expectedVersion: archived.version, state: 'active' })).project;
    });
    await t.test('Changed assignee, Workspace leave, Task delete and Project Ban cancel without replay', async () => {
      const task = await doneTask(), req = (await request(task, 2)).request;
      await work.updateTask(claims[1], task.id, { expectedVersion: task.version, assigneeId: String(users[1]._id) });
      assert.equal((await TaskReopenRequest.collection.findOne({ _id: O(req.id) })).state, 'cancelled');
      const leaving = await doneTask(), leaveReq = (await request(leaving)).request;
      const member = await WorkspaceMembership.collection.findOne({ workspaceId: O(workspace.id), userId: users[1]._id });
      await ws.leave(claims[1], workspace.id, { expectedVersion: member.version });
      assert.equal((await TaskReopenRequest.collection.findOne({ _id: O(leaveReq.id) })).state, 'cancelled');
      await ws.accept(claims[1], { token });
      assert.equal((await TaskReopenRequest.collection.findOne({ _id: O(leaveReq.id) })).state, 'cancelled');
      const deleting = await doneTask(), delReq = (await request(deleting)).request; await work.deleteTask(claims[1], deleting.id, { expectedVersion: deleting.version });
      assert.equal((await TaskReopenRequest.collection.findOne({ _id: O(delReq.id) })).state, 'cancelled');
      const banned = await doneTask(), banReq = (await request(banned)).request;
      project = (await work.getProject(claims[0], project.id)).project;
      await moderation.ban(claims[0], 'project', project.id, { userId: String(users[1]._id), expectedVersion: project.version, reason: 'Fixture scoped Ban' });
      assert.equal((await TaskReopenRequest.collection.findOne({ _id: O(banReq.id) })).state, 'cancelled');
      await assert.rejects(request(banned), { code: 'ACCESS_BANNED' });
      const ban = (await moderation.bans(claims[0], 'project', project.id, {})).items[0];
      await moderation.unban(claims[0], 'project', project.id, String(users[1]._id), { expectedVersion: ban.version, reason: 'Fixture unban' });
    });
    await t.test('Statistics use whole Project nondeleted/current Done, Vietnam bounds and unknown legacy time', async () => {
      const p = (await work.createProject(claims[0], workspace.id, { name: 'Stats isolated' })).project;
      const make = async title => (await work.createTask(claims[0], p.id, { title })).task;
      const a = await make('Done dated'), b = await make('Legacy Done'), c = await make('Deleted Done'), d = await make('Todo');
      const boundary = new Date('2026-10-04T17:00:00.000Z');
      await Task.collection.updateOne({ _id: O(a.id) }, { $set: { status: 'done', completedAt: boundary } });
      await Task.collection.updateOne({ _id: O(b.id) }, { $set: { status: 'done', completedAt: null } });
      await Task.collection.updateOne({ _id: O(c.id) }, { $set: { status: 'done', completedAt: boundary, deletedAt: clock, deletedBy: users[0]._id } });
      let stats = await work.statistics(claims[1], p.id, { from: '2026-10-05', to: '2026-10-05' });
      assert.equal(stats.total, 3); assert.equal(stats.done, 2); assert.equal(stats.completedInPeriod, 1); assert.equal(stats.unknownCompletionTime, 1); assert.equal(stats.progressPercent, 66.67); assert.equal(stats.scope, 'whole_project');
      assert.equal((await work.statistics(claims[0], p.id, { from: '2026-10-04', to: '2026-10-04' })).completedInPeriod, 0);
      await work.status(claims[0], a.id, { expectedVersion: a.version, status: 'todo', reason: 'Review' });
      stats = await work.statistics(claims[0], p.id, { from: '2026-10-05', to: '2026-10-05' }); assert.equal(stats.completedInPeriod, 0); assert.equal(stats.done, 1);
      await assert.rejects(work.statistics(claims[3], p.id, {}), { code: 'RESOURCE_UNAVAILABLE' });
      const invitation = await work.inviteGuest(claims[0], p.id, { type: 'LINK' }); const guestToken = new URLSearchParams(new URL(invitation.url).hash.slice(1)).get('token');
      await work.acceptGuestInvitation(claims[3], { token: guestToken }); assert.equal((await work.statistics(claims[3], p.id, {})).total, 3);
      await assert.rejects(work.statistics(claims[3], other.id, {}), { code: 'RESOURCE_UNAVAILABLE' });
      await assert.rejects(work.reopenRequests(claims[3], a.id, {}), { code: 'REOPEN_HISTORY_FORBIDDEN' });
      await assert.rejects(work.requestReopen(claims[3], b.id, { expectedVersion: b.version, targetStatus: 'todo', reason: 'Guest' }), { code: 'REOPEN_REQUEST_FORBIDDEN' });
      await work.state(claims[0], p.id, { expectedVersion: p.version, state: 'archived' }); assert.equal((await work.statistics(claims[3], p.id, {})).total, 3);
      const empty = (await work.createProject(claims[0], workspace.id, { name: 'Empty' })).project; assert.equal((await work.statistics(claims[0], empty.id, {})).progressPercent, 0);
    });
    await t.test('Org Owner/Admin and Workspace Manager review in scope; Org exit revokes pending atomically', async () => {
      const org = new Organization({ name: 'C4 Org fixture', ownerId: users[0]._id }); await org.save(); organizationIds.push(org._id);
      for (const [index, role] of [[0, 'member'], [1, 'member'], [2, 'member'], [3, 'admin']]) await new OrganizationMembership({ organizationId: org._id, userId: users[index]._id, role, joinedAt: clock }).save();
      const attached = new Workspace({ name: 'C4 attached', organizationId: org._id, ownerId: null, managerId: users[2]._id }); await attached.save(); workspaceIds.push(attached._id);
      for (const index of [1, 2]) await new WorkspaceMembership({ workspaceId: attached._id, userId: users[index]._id, joinedAt: clock }).save();
      const p = (await work.createProject(claims[3], String(attached._id), { name: 'Org work' })).project;
      for (const who of [0, 3, 2]) {
        let task = (await work.createTask(claims[1], p.id, { title: 'Org request', assigneeId: String(users[2]._id) })).task;
        task = (await work.status(claims[1], task.id, { expectedVersion: task.version, status: 'done' })).task;
        const req = (await request(task)).request;
        const result = await review(task, req, 'approve', who); assert.equal(result.request.state, 'approved');
      }
      // WS Manager has no authority over the independent Workspace created by user3.
      const foreignWS = (await ws.create(claims[3], { name: 'Foreign C4' })).workspace; workspaceIds.push(O(foreignWS.id));
      const foreignProject = (await work.createProject(claims[3], foreignWS.id, { name: 'Foreign work' })).project;
      await assert.rejects(work.statistics(claims[2], foreignProject.id, {}), { code: 'RESOURCE_UNAVAILABLE' });
      let task = (await work.createTask(claims[1], p.id, { title: 'Remove request' })).task;
      task = (await work.status(claims[1], task.id, { expectedVersion: task.version, status: 'done' })).task;
      const pending = (await request(task)).request;
      const { createOrganizationService } = await import('../src/organizations/service.js');
      const { createMongoOrganizationStore } = await import('../src/organizations/mongo-store.js');
      const organizations = createOrganizationService({ store: createMongoOrganizationStore({ config, now: () => clock }) });
      const membership = await OrganizationMembership.collection.findOne({ organizationId: org._id, userId: users[1]._id });
      await organizations.leave(claims[1], String(org._id), { expectedVersion: membership.version });
      assert.equal((await TaskReopenRequest.collection.findOne({ _id: O(pending.id) })).state, 'cancelled');
    });
    await t.test('Approve versus Workspace leave race cannot approve after permission loss', async () => {
      const task = await doneTask(), req = (await request(task)).request;
      const member = await WorkspaceMembership.collection.findOne({ workspaceId: O(workspace.id), userId: users[1]._id });
      await Promise.allSettled([review(task, req), ws.leave(claims[1], workspace.id, { expectedVersion: member.version })]);
      const value = await TaskReopenRequest.collection.findOne({ _id: O(req.id) });
      assert.ok(['approved', 'cancelled'].includes(value.state));
      const current = (await work.getTask(claims[0], task.id)).task;
      assert.equal(current.status, value.state === 'approved' ? 'in_progress' : 'done');
      await ws.accept(claims[1], { token });
    });
    await t.test('HTTP verified auth/origin/DTO, request and review CAS', async () => {
      const task = await doneTask();
      const created = await http(1, `/tasks/${task.id}/reopen-requests`, 'POST', { expectedVersion: task.version, targetStatus: 'todo', reason: 'HTTP review' }); assert.equal(created.status, 201);
      const req = (await created.json()).request;
      assert.equal((await http(0, `/tasks/${task.id}/reopen-requests/${req.id}/review`, 'POST', { expectedVersion: req.version, expectedTaskVersion: task.version + 1, decision: 'approve', reason: 'Stale' })).status, 409);
      assert.equal((await http(0, `/tasks/${task.id}/reopen-requests/${req.id}/review`, 'POST', { expectedVersion: req.version, expectedTaskVersion: task.version, decision: 'approve', reason: 'Accept' })).status, 200);
      assert.equal((await http(0, `/projects/${project.id}/statistics?status=done`)).status, 400);
      assert.equal((await http(0, `/projects/${project.id}/statistics`)).status, 200);
    });
  } finally {
    if (server) await new Promise(resolve => server.close(resolve));
    for (const model of Object.values(models)) {
      if (model.schema.path('workspaceId')) await model.collection.deleteMany({ workspaceId: { $in: workspaceIds } });
      else if (model.schema.path('userId')) await model.collection.deleteMany({ userId: { $in: users.map(user => user._id) } });
    }
    await models.Workspace.collection.deleteMany({ _id: { $in: workspaceIds } }); await User.collection.deleteMany({ _id: { $in: users.map(user => user._id) } });
    await OrganizationMembership.collection.deleteMany({ organizationId: { $in: organizationIds } }); await Organization.collection.deleteMany({ _id: { $in: organizationIds } });
    await mongoose.disconnect();
  }
});
