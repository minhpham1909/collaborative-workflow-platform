import { test } from 'node:test';
import assert from 'node:assert/strict';
import { randomBytes } from 'node:crypto';
import { once } from 'node:events';
import mongoose from 'mongoose';
import { connectDatabase } from '../src/database.js';
import { models, User, Task, Project, Workspace, WorkspaceMembership, Session, EmailOutbox, Notification, TaskPurgeAudit, TaskReopenRequest, OrganizationMembership } from '../src/models/index.js';
import { createAuthService } from '../src/auth/service.js';
import { createMongoAuthStore } from '../src/auth/mongo-store.js';
import { hashPassword } from '../src/auth/passwords.js';
import { createWorkspaceService } from '../src/workspaces/service.js';
import { createMongoWorkspaceStore } from '../src/workspaces/mongo-store.js';
import { createWorkService } from '../src/work/service.js';
import { createMongoWorkStore } from '../src/work/mongo-store.js';
import { createOrganizationService } from '../src/organizations/service.js';
import { createMongoOrganizationStore } from '../src/organizations/mongo-store.js';
import { createModerationService } from '../src/moderation/service.js';
import { createMongoModerationStore } from '../src/moderation/mongo-store.js';
import { createApp } from '../src/app.js';
import { testConfig } from '../test-support/auth-store.js';
import { runTaskRetention } from '../src/work/retention.js';
import { auditTaskCodes, backfillTaskCodes } from '../src/work/task-codes.js';

test('C6-A core end-to-end through HTTP: two organizations, independent Workspace and Guest', { skip: !process.env.TEST_MONGODB_URI && 'Dedicated database required', timeout: 120_000 }, async t => {
  assert.equal(new URL(process.env.TEST_MONGODB_URI).pathname.slice(1), 'workflow_auth_test');
  await connectDatabase(process.env.TEST_MONGODB_URI);
  const config = testConfig(), prefix = `c6-${randomBytes(8).toString('hex')}`;
  const password = 'C6 isolated integration password', encoded = await hashPassword(password);
  const auth = await createAuthService({ store: createMongoAuthStore(), config });
  const workspaces = createWorkspaceService({ store: createMongoWorkspaceStore({ config }) });
  const work = createWorkService({ store: createMongoWorkStore({ config }) });
  const organizations = createOrganizationService({ store: createMongoOrganizationStore({ config }) });
  const moderation = createModerationService({ store: createMongoModerationStore({ config }) });
  const users = [], logins = [], workspaceIds = [], orgIds = [];
  const O = value => new mongoose.Types.ObjectId(value), rich = text => ({ format: 'prosemirror-json', schemaVersion: 1, document: { type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text }] }] } });
  let server, base, orgA, orgB, wsA, wsB, independent, projectA, projectB, projectS, taskA, taskB, taskS;
  async function call(who, path, method = 'GET', body, expected = 200) {
    const result = await fetch(base + path, { method, headers: { Origin: config.webOrigin, 'Content-Type': 'application/json', ...(who === null ? {} : { Authorization: `Bearer ${logins[who].accessToken}` }) }, ...(body === undefined ? {} : { body: JSON.stringify(body) }) });
    const response = await result.json();
    assert.equal(result.status, expected, `${method} ${path}: ${response.error?.code ?? result.status}`);
    if (expected >= 400) assert.ok(!JSON.stringify(response).includes('Secret Org B'));
    return response;
  }
  const privacy = value => assert.doesNotMatch(JSON.stringify(value), /passwordHash|refreshTokenHash|authMutationRevision|mutationRevision|encryptedDeliveryData|emailCanonical|searchText/u);
  const token = url => new URLSearchParams(new URL(url).hash.slice(1)).get('token');
  try {
    for (const model of Object.values(models)) await model.createIndexes();
    for (let index = 0; index < 7; index++) {
      const user = new User({ displayName: `C6 User ${index}`, email: `${prefix}-${index}@example.com`, passwordHash: encoded, emailVerifiedAt: index === 6 ? null : new Date(), termsAcceptance: { version: 'test', acceptedAt: new Date() } });
      await user.save(); users.push(user.toObject()); logins.push(await auth.login({ email: user.email, password }));
    }
    server = createApp({ authService: auth, authConfig: config, workspaceService: workspaces, workService: work, organizationService: organizations, moderationService: moderation }).listen(0, '127.0.0.1'); await once(server, 'listening');
    base = `http://127.0.0.1:${server.address().port}`;
    await t.test('HTTP onboarding and admission bind organization/Workspace without global-role elevation', async () => {
      await call(null, '/organizations', 'GET', undefined, 401); await call(6, '/organizations', 'POST', { name: 'Unverified' }, 403);
      orgA = (await call(0, '/organizations', 'POST', { name: 'Org A' }, 201)).organization; orgIds.push(O(orgA.id));
      orgB = (await call(2, '/organizations', 'POST', { name: 'Secret Org B' }, 201)).organization; orgIds.push(O(orgB.id));
      wsA = (await call(0, `/organizations/${orgA.id}/workspaces`, 'POST', { name: 'A Studio' }, 201)).workspace;
      wsB = (await call(2, `/organizations/${orgB.id}/workspaces`, 'POST', { name: 'B Studio' }, 201)).workspace;
      independent = (await call(0, '/workspaces', 'POST', { name: 'Standalone group' }, 201)).workspace;
      workspaceIds.push(...[wsA, wsB, independent].map(ws => O(ws.id)));
      for (const [owner, member, org, ws] of [[0, 1, orgA, wsA], [2, 3, orgB, wsB], [0, 5, orgA, null]]) {
        const invitation = (await call(owner, `/organizations/${org.id}/invitations`, 'POST', { email: users[member].email, ...(ws ? { workspaceId: ws.id } : {}) }, 201)).invitation;
        await call(member, `/organization-invitations/${invitation.id}/accept`, 'POST', {});
      }
      const member = (await call(0, `/organizations/${orgA.id}/members`)).items.find(value => value.userId === String(users[5]._id));
      await call(0, `/organizations/${orgA.id}/members/${users[5]._id}/role`, 'PATCH', { expectedVersion: member.version, role: 'admin' });
      assert.equal(await WorkspaceMembership.collection.countDocuments({ workspaceId: O(wsA.id), userId: users[5]._id }), 0);
      await call(5, `/workspaces/${wsA.id}`); await call(5, `/workspaces/${wsB.id}`, 'GET', undefined, 404);
      const invitation = await call(0, `/workspaces/${independent.id}/invitations`, 'POST', { type: 'LINK' }, 201);
      await call(1, '/invitations/accept', 'POST', { token: token(invitation.url) });
      privacy(await call(1, `/workspaces/${wsA.id}`));
    });
    await t.test('Task lifecycle and Guest scope compose with labels/checklist, approval and statistics', async () => {
      projectA = (await call(0, `/workspaces/${wsA.id}/projects`, 'POST', { name: 'A Delivery' }, 201)).project;
      projectB = (await call(2, `/workspaces/${wsB.id}/projects`, 'POST', { name: 'Secret Org B delivery' }, 201)).project;
      projectS = (await call(0, `/workspaces/${independent.id}/projects`, 'POST', { name: 'Standalone project' }, 201)).project;
      projectA = (await call(0, `/projects/${projectA.id}/lead`, 'PATCH', { expectedVersion: projectA.version, leadId: String(users[1]._id) })).project;
      const label = (await call(1, `/projects/${projectA.id}/labels`, 'POST', { name: 'Core delivery', color: 'mint' }, 201)).label;
      taskA = (await call(1, `/projects/${projectA.id}/tasks`, 'POST', { title: 'A implementation', assigneeId: String(users[1]._id), priority: 'high', labelIds: [label.id] }, 201)).task;
      taskB = (await call(3, `/projects/${projectB.id}/tasks`, 'POST', { title: 'Secret Org B task', assigneeId: String(users[3]._id) }, 201)).task;
      taskS = (await call(1, `/projects/${projectS.id}/tasks`, 'POST', { title: 'Independent task', assigneeId: String(users[1]._id) }, 201)).task;
      const invitation = await call(0, `/projects/${projectA.id}/guest-invitations`, 'POST', { type: 'LINK' }, 201);
      await call(4, '/project-invitations/accept', 'POST', { token: token(invitation.url) });
      const guest = (await call(4, `/tasks/${taskA.id}`)).task; privacy(guest); assert.equal(guest.permissions.edit, false);
      await call(4, `/projects/${projectA.id}/tasks`, 'POST', { title: 'Guest forbidden' }, 403);
      await call(4, `/tasks/${taskB.id}`, 'GET', undefined, 404); await call(1, `/tasks/${taskB.id}`, 'GET', undefined, 404);
      await call(4, `/tasks/${taskA.id}/comments`, 'POST', { content: rich('External review') }, 201);
      taskA = (await call(1, `/tasks/${taskA.id}/checklist`, 'PATCH', { expectedVersion: taskA.version, items: [{ text: 'Verify endpoint' }] })).task;
      await call(1, `/tasks/${taskA.id}/status`, 'PATCH', { expectedVersion: taskA.version, status: 'done' }, 409);
      taskA = (await call(1, `/tasks/${taskA.id}/checklist/${taskA.checklist[0].id}`, 'PATCH', { expectedVersion: taskA.version, checked: true })).task;
      taskA = (await call(1, `/tasks/${taskA.id}/status`, 'PATCH', { expectedVersion: taskA.version, status: 'done' })).task;
      const request = (await call(1, `/tasks/${taskA.id}/reopen-requests`, 'POST', { expectedVersion: taskA.version, targetStatus: 'in_progress', reason: 'Fix review feedback' }, 201)).request;
      await call(1, `/tasks/${taskA.id}/reopen-requests/${request.id}/review`, 'POST', { expectedVersion: request.version, expectedTaskVersion: taskA.version, decision: 'approve', reason: 'Own request' }, 403);
      taskA = (await call(5, `/tasks/${taskA.id}/reopen-requests/${request.id}/review`, 'POST', { expectedVersion: request.version, expectedTaskVersion: taskA.version, decision: 'approve', reason: 'Proceed' })).task;
      assert.equal(taskA.status, 'in_progress'); assert.equal(taskA.completedAt, null);
      const stats = await call(4, `/projects/${projectA.id}/statistics`); assert.equal(stats.done, 0); assert.equal(stats.total, 1); privacy(stats);
      await call(4, `/projects/${projectB.id}/statistics`, 'GET', undefined, 404);
    });
    await t.test('Archive, scoped Ban/Unban and Org exit preserve independent scope and cancel pending work', async () => {
      taskA = (await call(1, `/tasks/${taskA.id}/status`, 'PATCH', { expectedVersion: taskA.version, status: 'done' })).task;
      const request = (await call(1, `/tasks/${taskA.id}/reopen-requests`, 'POST', { expectedVersion: taskA.version, targetStatus: 'todo', reason: 'Pending before archive' }, 201)).request;
      wsA = (await call(0, `/workspaces/${wsA.id}`)).workspace;
      wsA = (await call(0, `/workspaces/${wsA.id}/state`, 'PATCH', { expectedVersion: wsA.version, state: 'archived', confirmName: wsA.name, reason: 'Pause project' })).workspace;
      assert.equal((await call(4, `/projects/${projectA.id}`)).project.readOnly, true);
      assert.equal((await TaskReopenRequest.collection.findOne({ _id: O(request.id) })).state, 'cancelled');
      await call(1, `/tasks/${taskA.id}`, 'PATCH', { expectedVersion: taskA.version, title: 'Read-only' }, 409);
      wsA = (await call(0, `/workspaces/${wsA.id}/state`, 'PATCH', { expectedVersion: wsA.version, state: 'active', confirmName: wsA.name, reason: 'Resume' })).workspace;
      assert.equal((await call(0, `/projects/${projectA.id}`)).project.state, 'active');
      projectA = (await call(0, `/projects/${projectA.id}`)).project;
      await call(0, `/moderation/project/${projectA.id}/bans`, 'POST', { userId: String(users[4]._id), expectedVersion: projectA.version, reason: 'Scoped moderation' });
      await call(4, `/tasks/${taskA.id}`, 'GET', undefined, 403);
      const ban = (await call(0, `/moderation/project/${projectA.id}/bans`)).items[0];
      await call(0, `/moderation/project/${projectA.id}/bans/${users[4]._id}/unban`, 'POST', { expectedVersion: ban.version, reason: 'Revoke Ban' });
      await call(4, `/tasks/${taskA.id}`, 'GET', undefined, 404); // Unban does not regrant Guest.
      const member = (await call(0, `/organizations/${orgA.id}/members`)).items.find(value => value.userId === String(users[1]._id));
      await call(1, `/organizations/${orgA.id}/leave`, 'POST', { expectedVersion: member.version });
      await call(1, `/tasks/${taskA.id}`, 'GET', undefined, 404);
      assert.equal((await call(1, `/tasks/${taskS.id}`)).task.id, taskS.id);
      assert.equal((await call(3, `/tasks/${taskB.id}`)).task.id, taskB.id);
      const mine = await call(1, '/my-tasks'); assert.equal(mine.total, 1); assert.equal(mine.items[0].id, taskS.id);
    });
    await t.test('Trash/restore/retention execute against fixtures only, no outbox replay or other-scope deletion', async () => {
      await call(1, `/tasks/${taskS.id}/delete`, 'POST', { expectedVersion: taskS.version });
      let deleted = (await call(1, `/projects/${projectS.id}/trash`)).items[0];
      const events = await Notification.collection.countDocuments({ taskId: O(taskS.id) }), outbox = await EmailOutbox.collection.countDocuments({ taskId: O(taskS.id) });
      taskS = (await call(1, `/tasks/${taskS.id}/restore`, 'POST', { expectedVersion: deleted.version })).task;
      assert.equal(await Notification.collection.countDocuments({ taskId: O(taskS.id) }), events); assert.equal(await EmailOutbox.collection.countDocuments({ taskId: O(taskS.id) }), outbox);
      await call(1, `/tasks/${taskS.id}/delete`, 'POST', { expectedVersion: taskS.version });
      deleted = await Task.collection.findOne({ _id: O(taskS.id) });
      const now = new Date(); await Task.collection.updateOne({ _id: deleted._id }, { $set: { deletedAt: new Date(now.getTime() - 30 * 86400_000), purgeAt: now } });
      assert.equal((await runTaskRetention({ now: () => now, limit: 1 })).purged, 1);
      assert.equal(await TaskPurgeAudit.collection.countDocuments({ taskId: deleted._id }), 1);
      await call(1, `/tasks/${taskS.id}`, 'GET', undefined, 404);
      assert.equal((await call(3, `/tasks/${taskB.id}`)).task.id, taskB.id);
      assert.equal((await call(0, `/tasks/${taskA.id}`)).task.id, taskA.id);
      const next = (await call(0, `/projects/${projectS.id}/tasks`, 'POST', { title: 'Never reuse code' }, 201)).task; assert.notEqual(next.code, deleted.code);
      await call(0, `/tasks/${next.id}/purge`, 'POST', {}, 404); // Manual authority still not selected.
    });
    await t.test('Legacy code migration rehearsal is idempotent and preserves unknown completion time', async () => {
      const previous = new Date(Date.now() - 86400_000), projectId = O(projectS.id), taskId = O();
      await Workspace.collection.updateOne({ _id: O(independent.id) }, { $unset: { state: '', archivedAt: '', archivedBy: '', organizationId: '', managerId: '' } });
      await Task.collection.insertOne({ _id: taskId, workspaceId: O(independent.id), projectId, createdBy: users[0]._id, assigneeId: null, title: 'Legacy Done', description: { ...rich('Historical'), plainText: 'Historical' }, searchText: 'legacy done', status: 'done', dueAt: null, deletedAt: null, deletedBy: null, createdAt: previous, updatedAt: previous, version: 0 });
      const before = await Task.collection.findOne({ _id: taskId });
      const audit = await auditTaskCodes(); assert.equal(audit.problems.length, 0); assert.ok(audit.missingCodes >= 1);
      assert.equal(await backfillTaskCodes(projectId), 1); assert.equal(await backfillTaskCodes(projectId), 0);
      const after = await Task.collection.findOne({ _id: taskId }); assert.deepEqual(after.updatedAt, before.updatedAt); assert.deepEqual(after.description, before.description); assert.equal(after.completedAt, undefined); assert.equal(after.version, before.version + 1);
      const dto = (await call(0, `/tasks/${taskId}`)).task; assert.match(dto.code, /^WF-[A-F0-9]{6}-[1-9][0-9]*$/u); assert.equal(dto.completedAt, null); assert.equal(dto.completionTimeKnown, false); privacy(dto);
      assert.equal((await call(0, `/workspaces/${independent.id}`)).workspace.state, 'active');
      await Session.collection.updateOne({ userId: users[1]._id, revokedAt: null }, { $set: { revokedAt: new Date(), revokeReason: 'logout' } });
      await call(1, '/my-tasks', 'GET', undefined, 401);
    });
  } finally {
    if (server) await new Promise(resolve => server.close(resolve));
    for (const model of Object.values(models)) {
      const criteria = [];
      if (model.schema.path('workspaceId')) criteria.push({ workspaceId: { $in: workspaceIds } });
      if (model.schema.path('organizationId')) criteria.push({ organizationId: { $in: orgIds } });
      if (model.schema.path('userId')) criteria.push({ userId: { $in: users.map(user => user._id) } });
      if (criteria.length) await model.collection.deleteMany({ $or: criteria });
    }
    await models.Organization.collection.deleteMany({ _id: { $in: orgIds } }); await Workspace.collection.deleteMany({ _id: { $in: workspaceIds } }); await User.collection.deleteMany({ _id: { $in: users.map(user => user._id) } });
    await mongoose.disconnect();
  }
});
