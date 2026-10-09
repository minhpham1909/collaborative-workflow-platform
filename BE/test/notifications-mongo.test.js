import { test } from 'node:test';
import assert from 'node:assert/strict';
import { randomBytes } from 'node:crypto';
import { once } from 'node:events';
import mongoose from 'mongoose';
import { connectDatabase } from '../src/database.js';
import { models, User, Session, Workspace, WorkspaceMembership, WorkspaceInvitation, Project, Task, TaskComment, Notification, EmailOutbox } from '../src/models/index.js';
import { createAuthService } from '../src/auth/service.js';
import { createMongoAuthStore } from '../src/auth/mongo-store.js';
import { hashPassword } from '../src/auth/passwords.js';
import { createWorkspaceService } from '../src/workspaces/service.js';
import { createMongoWorkspaceStore } from '../src/workspaces/mongo-store.js';
import { createWorkService } from '../src/work/service.js';
import { createMongoWorkStore } from '../src/work/mongo-store.js';
import { createNotificationsService } from '../src/notifications/service.js';
import { createMongoNotificationsStore } from '../src/notifications/mongo-store.js';
import { cutoffCodec } from '../src/notifications/input.js';
import { dispatchWorkMail } from '../src/mail/work-mail.js';
import { dispatchInvitationMail } from '../src/mail/invitation-mail.js';
import { createApp } from '../src/app.js';
import { testConfig } from '../test-support/auth-store.js';

test('Notifications privacy/read lifecycle and work email eligibility on MongoDB/HTTP', { skip: !process.env.TEST_MONGODB_URI && 'Dedicated Mongo test database not configured', timeout: 90_000 }, async (t) => {
  await connectDatabase(process.env.TEST_MONGODB_URI); assert.equal(mongoose.connection.name, 'workflow_auth_test');
  const config = testConfig(), prefix = `inbox-${randomBytes(8).toString('hex')}`, password = 'notification test password';
  const encoded = await hashPassword(password), users = [], auths = [], logins = [], workspaceIds = [];
  const auth = await createAuthService({ store: createMongoAuthStore(), config });
  const workspaces = createWorkspaceService({ store: createMongoWorkspaceStore({ config }) });
  const work = createWorkService({ store: createMongoWorkStore() }); const cutoff = cutoffCodec(config.accessKeyHex);
  const inbox = createNotificationsService({ store: createMongoNotificationsStore({ cutoff }), cutoff });
  const O = (value) => new mongoose.Types.ObjectId(value); let server, workspace, project, linkToken;
  const createTask = async (title = 'Private Task') => (await work.createTask(auths[0], project.id, { title, assigneeId: String(users[1]._id) })).task;
  const member = () => WorkspaceMembership.collection.findOne({ workspaceId: O(workspace.id), userId: users[1]._id });
  try {
    for (const model of Object.values(models)) await model.createIndexes();
    for (let index = 0; index < 4; index++) {
      const user = new User({ displayName: `Inbox User ${index}`, email: `${prefix}-${index}@example.com`, passwordHash: encoded, emailVerifiedAt: index === 3 ? null : new Date(), termsAcceptance: { version: 'test-only', acceptedAt: new Date() } });
      await user.save(); users.push(user.toObject()); const login = await auth.login({ email: user.email, password }); logins.push(login); auths.push(await auth.authenticate(login.accessToken));
    }
    workspace = (await workspaces.create(auths[0], { name: 'Private Workspace' })).workspace; workspaceIds.push(O(workspace.id));
    const link = await workspaces.invite(auths[0], workspace.id, { type: 'LINK' }); linkToken = new URLSearchParams(new URL(link.url).hash.slice(1)).get('token');
    await workspaces.accept(auths[1], { token: linkToken });
    project = (await work.createProject(auths[0], workspace.id, { name: 'Project' })).project;
    server = createApp({ authService: auth, authConfig: config, workspaceService: workspaces, notificationsService: inbox }).listen(0, '127.0.0.1'); await once(server, 'listening');
    const base = `http://127.0.0.1:${server.address().port}`;
    const http = (index, path, method = 'GET', body) => fetch(base + path, { method, headers: { Origin: config.webOrigin, 'Content-Type': 'application/json', ...(index !== null ? { Authorization: `Bearer ${logins[index].accessToken}` } : {}) }, ...(body === undefined ? {} : { body: JSON.stringify(body) }) });
    await t.test('Own inbox, pagination/read idempotence, counts and bypass rejection', async () => {
      const task = await createTask(); const list = await inbox.list(auths[1], { limit: '1' }); const note = list.items[0];
      assert.equal(note.available, true); assert.equal(note.payload.taskTitle, task.title); assert.equal(list.unreadCount, 1);
      assert.equal((await http(null, '/notifications')).status, 401);
      assert.equal((await http(2, `/notifications/${note.id}`)).status, 404);
      assert.equal((await http(2, `/notifications/${note.id}/read`, 'POST', {})).status, 404);
      assert.equal((await http(1, '/notifications?recipientId=' + users[2]._id)).status, 400);
      const marked = (await inbox.read(auths[1], note.id, {})).notification;
      const again = (await inbox.read(auths[1], note.id, {})).notification; assert.deepEqual(marked.readAt, again.readAt);
      assert.equal((await inbox.list(auths[1], { read: 'unread' })).total, 0);
      assert.equal((await inbox.list(auths[1], { read: 'read' })).total, 1);
      await createTask('Second Task'); const first = await inbox.list(auths[1], { limit: '1' }); assert.ok(first.nextCursor);
      assert.notEqual(first.items[0].id, (await inbox.list(auths[1], { limit: '1', cursor: first.nextCursor })).items[0].id);
      const hostile = await fetch(base + '/notifications', { headers: { Origin: 'https://attacker.example', Authorization: `Bearer ${logins[1].accessToken}` } }); assert.equal(hostile.status, 403);
    });
    await t.test('Mask data after leave/delete; rejoin restores current valid target only', async () => {
      const task = await createTask('Never leak title'); const note = (await inbox.list(auths[1], {})).items[0];
      await workspaces.leave(auths[1], workspace.id, { expectedVersion: (await member()).version });
      const hidden = (await inbox.get(auths[1], note.id)).notification; assert.equal(hidden.available, false); assert.equal(hidden.payload, null); assert.equal(hidden.target, null);
      const search=await inbox.list(auths[1],{q:'Never leak title'});assert.equal(search.total,0);assert.equal(search.unreadCount,0);assert.equal(search.cutoff,null);
      assert.ok(!JSON.stringify(await inbox.list(auths[1], {})).includes('Private Workspace'));
      await workspaces.accept(auths[1], { token: linkToken }); assert.equal((await inbox.get(auths[1], note.id)).notification.available, true);
      assert.equal((await inbox.list(auths[1],{q:'Never leak title'})).total,1);
      const fresh = (await work.getTask(auths[0], task.id)).task; await work.deleteTask(auths[0], task.id, { expectedVersion: fresh.version });
      assert.equal((await inbox.get(auths[1], note.id)).notification.available, false);
      assert.equal((await inbox.list(auths[1], {})).unreadCount, 2); // Masked records remain returned/countable.
    });
    await t.test('Signed cutoff marks only own category and excludes new records', async () => {
      const list = await inbox.list(auths[1], { category: 'work' });
      await createTask('Arrived after cutoff');
      const result = await inbox.readAll(auths[1], { cutoff: list.cutoff }); assert.ok(result.markedCount > 0);
      const unread = await inbox.list(auths[1], { read: 'unread' }); assert.equal(unread.total, 1); assert.equal(unread.items[0].payload.taskTitle, 'Arrived after cutoff');
      assert.throws(() => inbox.readAll(auths[2], { cutoff: list.cutoff }), /INVALID_INPUT/u);
      assert.equal((await inbox.readAll(auths[1], { cutoff: list.cutoff })).markedCount, 0);
    });
    await t.test('In-app EMAIL invitation accepts by ID without exposing reusable token', async () => {
      const invitation = await workspaces.invite(auths[0], workspace.id, { type: 'EMAIL', email: users[3].email });
      await dispatchInvitationMail({ config, send: async () => 'test-provider' });
      const list = await inbox.list(auths[3], {}); assert.equal(list.items[0].available, true); assert.equal(list.items[0].target.invitationId, invitation.invitation.id);
      assert.ok(!JSON.stringify(list).includes('tokenHash')); assert.equal((await http(3, `/invitations/${invitation.invitation.id}/accept`, 'POST', {})).status, 403);
      await assert.rejects(workspaces.acceptById(auths[2], invitation.invitation.id, {}), /INVITATION_UNAVAILABLE/u);
      await User.collection.updateOne({ _id: users[3]._id }, { $set: { emailVerifiedAt: new Date() } });
      const accepted = await http(3, `/invitations/${invitation.invitation.id}/accept`, 'POST', {}); assert.equal(accepted.status, 200); assert.equal((await accepted.json()).code, 'WORKSPACE_JOINED');
      assert.equal((await inbox.get(auths[3], list.items[0].id)).notification.available, false);
      const link = await workspaces.invite(auths[0], workspace.id, { type: 'LINK' }); await assert.rejects(workspaces.acceptById(auths[2], link.invitation.id, {}), /INVITATION_UNAVAILABLE/u);
    });
    await t.test('Masked search/date pagination and signed filtered read-all remain scoped', async () => {
      const a=await createTask('Sáng Tạo inbox one'),b=await createTask('Sáng Tạo inbox two');
      await Notification.collection.updateMany({taskId:O(a.id)},{$set:{createdAt:new Date('2026-10-03T16:59:59Z')}});
      await Notification.collection.updateMany({taskId:O(b.id)},{$set:{createdAt:new Date('2026-10-03T17:00:00Z')}});
      const first=await inbox.list(auths[1],{q:'sang tao inbox',limit:'1'});assert.equal(first.total,2);assert.ok(first.nextCursor);
      const next=await inbox.list(auths[1],{q:'sang tao inbox',limit:'1',cursor:first.nextCursor});assert.equal(next.total,2);assert.equal(next.nextCursor,null);assert.notEqual(first.items[0].id,next.items[0].id);
      const day=await inbox.list(auths[1],{q:'sang tao inbox',from:'2026-10-04',to:'2026-10-04'});assert.equal(day.total,1);assert.equal(day.items[0].target.taskId,b.id);
      assert.equal((await inbox.readAll(auths[1],{cutoff:day.cutoff})).markedCount,1);
      const left=await inbox.list(auths[1],{q:'sang tao inbox',read:'unread'});assert.equal(left.total,1);assert.equal(left.items[0].target.taskId,a.id);
      assert.equal((await http(1,'/notifications?from=2026-10-05&to=2026-10-04')).status,400);
      const ids=[O(a.id),O(b.id)];await Notification.collection.deleteMany({taskId:{$in:ids}});await EmailOutbox.collection.deleteMany({taskId:{$in:ids}});await Task.collection.deleteMany({_id:{$in:ids}});
    });
    await t.test('Work worker rechecks settings, filters event types and cancels deleted/left', async () => {
      // Cancel this suite's older jobs so assertions concern the fresh delivery only.
      await EmailOutbox.collection.updateMany({ workspaceId: O(workspace.id), category: 'work' }, { $set: { state: 'cancelled' } });
      let task = await createTask('Filtered events');
      await User.collection.updateOne({ _id: users[1]._id }, { $set: { 'emailPreferences.assignment': false } });
      assert.equal((await dispatchWorkMail({ config, send: async () => { throw new Error('Must not send'); } })).state, 'cancelled');
      await User.collection.updateOne({ _id: users[1]._id }, { $set: { 'emailPreferences.assignment': true, 'emailPreferences.content': true, locale: 'en' } });
      task = (await work.updateTask(auths[0], task.id, { expectedVersion: task.version, title: 'Mixed events', assigneeId: null })).task;
      await User.collection.updateOne({ _id: users[1]._id }, { $set: { 'emailPreferences.assignment': false } }); // old assignee only assignment -> cancelled
      assert.equal((await dispatchWorkMail({ config, send: async () => 'fake' })).state, 'cancelled');
      const membership = await member(); await workspaces.overrides(auths[1], workspace.id, { expectedVersion: membership.version, emailOverrides: { assignment: 'on', status: 'on', content: 'on' } });
      task = (await work.updateTask(auths[0], task.id, { expectedVersion: task.version, assigneeId: String(users[1]._id), title: 'New details' })).task;
      const current = await member(); await workspaces.overrides(auths[1], workspace.id, { expectedVersion: current.version, emailOverrides: { content: 'off' } });
      const sent = []; assert.equal((await dispatchWorkMail({ config, send: async (mail) => { sent.push(mail); return 'fake'; } })).state, 'sent');
      assert.deepEqual(sent[0].eventTypes, ['assignment']); assert.equal(sent[0].locale, 'en'); assert.ok(!Object.hasOwn(sent[0], 'status'));
      const deleted = await createTask('Deleted queued'); await work.deleteTask(auths[0], deleted.id, { expectedVersion: deleted.version });
      assert.equal(await EmailOutbox.collection.countDocuments({ taskId: new mongoose.Types.ObjectId(deleted.id), state: 'pending' }), 0);
      assert.equal((await dispatchWorkMail({ config, send: async () => { throw new Error('Must not send'); } })).state, 'idle');
      await createTask('Left queued'); await workspaces.leave(auths[1], workspace.id, { expectedVersion: (await member()).version });
      assert.equal((await dispatchWorkMail({ config, send: async () => { throw new Error('Must not send'); } })).state, 'cancelled');
      await workspaces.accept(auths[1], { token: linkToken });
    });
    await t.test('Worker lease concurrency, retry/redaction, recovery and session revocation', async () => {
      await User.collection.updateOne({ _id: users[1]._id }, { $set: { 'emailPreferences.assignment': true } });
      await createTask('Lease queued'); let sends = 0;
      const results = await Promise.all([dispatchWorkMail({ config, send: async () => { sends++; return 'fake'; } }), dispatchWorkMail({ config, send: async () => { sends++; return 'fake'; } })]);
      assert.equal(sends, 1); assert.equal(results.filter((result) => result.state === 'sent').length, 1);
      const task = await createTask('Retry queued');
      await dispatchWorkMail({ config, send: async () => { throw new Error('SECRET_PROVIDER_FAILURE'); } });
      let job = await EmailOutbox.collection.findOne({ taskId: O(task.id), category: 'work' }); assert.equal(job.state, 'pending'); assert.equal(job.lastErrorCode, 'WORK_MAIL_DELIVERY_FAILED'); assert.equal(job.leaseToken, null);
      await EmailOutbox.collection.updateOne({ _id: job._id }, { $set: { state: 'processing', leaseToken: 'stale-worker', leaseUntil: new Date(0) } });
      assert.equal((await dispatchWorkMail({ config, send: async () => 'recovered' })).state, 'sent');
      job = await EmailOutbox.collection.findOne({ _id: job._id }); assert.equal(job.attempts, 2); assert.ok(job.sentAt);
      const exhausted = await createTask('Exhausted lease');
      await EmailOutbox.collection.updateOne({ taskId: O(exhausted.id), category: 'work' }, { $set: { state: 'processing', attempts: 5, leaseToken: 'stale-worker', leaseUntil: new Date(0) } });
      assert.equal((await dispatchWorkMail({ config, send: async () => { throw new Error('Must not send exhausted job'); } })).state, 'failed');
      await createTask('Unverified recipient');
      await User.collection.updateOne({ _id: users[1]._id }, { $set: { emailVerifiedAt: null } });
      assert.equal((await dispatchWorkMail({ config, send: async () => { throw new Error('Must not send unverified'); } })).state, 'cancelled');
      await User.collection.updateOne({ _id: users[1]._id }, { $set: { emailVerifiedAt: new Date() } });
      const lost = await createTask('Lost lease');
      assert.equal((await dispatchWorkMail({ config, send: async () => { await EmailOutbox.collection.updateOne({ taskId: O(lost.id), category: 'work' }, { $set: { leaseToken: 'other-worker' } }); return 'accepted'; } })).state, 'lease_lost');
      await Session.collection.updateOne({ _id: O(auths[1].claims.sid) }, { $set: { revokedAt: new Date() } });
      await assert.rejects(inbox.list(auths[1], {}), /UNAUTHENTICATED/u);
    });
  } finally {
    if (server) await new Promise((resolve) => server.close(resolve));
    for (const model of [TaskComment, Task, Project, WorkspaceMembership, WorkspaceInvitation, Notification, EmailOutbox]) await model.collection.deleteMany({ workspaceId: { $in: workspaceIds } });
    await Workspace.collection.deleteMany({ _id: { $in: workspaceIds } }); await Session.collection.deleteMany({ userId: { $in: users.map((user) => user._id) } }); await User.collection.deleteMany({ _id: { $in: users.map((user) => user._id) } }); await mongoose.disconnect();
  }
});
