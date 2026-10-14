import {HistoricalWorkspace as Workspace} from '../test-support/legacy-workspace-model.js';
import '../test-support/legacy-organizations.js';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { randomBytes, randomUUID } from 'node:crypto';
import { once } from 'node:events';
import mongoose from 'mongoose';
import { connectDatabase } from '../src/database.js';
import { models, User, Session, WorkspaceMembership, WorkspaceInvitation, Project, Task, TaskComment, EmailOutbox, Notification, WorkspaceRoleAudit, WorkspaceCreation, WorkspaceManagementAudit, AccessBan, Organization, OrganizationMembership, WorkspaceLifecycleAudit, ModerationAction } from '../src/models/index.js';
import { createWorkService } from '../src/work/service.js';
import { createMongoWorkStore } from '../src/work/mongo-store.js';
import { createModerationService } from '../src/moderation/service.js';
import { createMongoModerationStore } from '../src/moderation/mongo-store.js';
import { createAuthService } from '../src/auth/service.js';
import { createMongoAuthStore } from '../src/auth/mongo-store.js';
import { hashPassword } from '../src/auth/passwords.js';
import { createMongoWorkspaceStore } from '../src/workspaces/mongo-store.js';
import { createWorkspaceService } from '../src/workspaces/service.js';
import { createDeliveryCrypto } from '../src/auth/delivery-crypto.js';
import { dispatchInvitationMail } from '../src/mail/invitation-mail.js';
import { assertWorkspaceIndexes } from '../src/workspaces/index-check.js';
import { createApp } from '../src/app.js';
import { testConfig } from '../test-support/auth-store.js';
import { emptyRichText } from '../src/content/rich-text.js';

test('Workspace membership/invitation lifecycle on real MongoDB and HTTP', { skip: !process.env.TEST_MONGODB_URI && 'Dedicated Mongo test database not configured', timeout: 90_000 }, async (t) => {
  assert.equal(new URL(process.env.TEST_MONGODB_URI).pathname.slice(1), 'workflow_auth_test');
  await connectDatabase(process.env.TEST_MONGODB_URI);
  const config = testConfig(); const prefix = `workspace-${randomBytes(8).toString('hex')}`;
  const password = 'workspace integration password'; const encoded = await hashPassword(password);
  const service = createWorkspaceService({ store: createMongoWorkspaceStore({ config }) });
  const auth = await createAuthService({ store: createMongoAuthStore(), config });
  const users = []; const identities = []; const logins = []; const workspaceIds = [];
  const crypto = createDeliveryCrypto(config.mailKeyHex);
  let server;
  const create = async (name = 'Workspace Việt 👋') => {
    const result = await service.create(identities[0], { name }); workspaceIds.push(new mongoose.Types.ObjectId(result.workspace.id)); return result.workspace;
  };
  const link = async (workspace, owner = 0) => service.invite(identities[owner], workspace.id, { type: 'LINK' });
  const raw = (result) => new URLSearchParams(new URL(result.url).hash.slice(1)).get('token');
  const join = (index, token) => service.accept(identities[index], { token });
  const member = (workspace, index) => WorkspaceMembership.collection.findOne({ workspaceId: new mongoose.Types.ObjectId(workspace.id), userId: users[index]._id });
  try {
    for (const model of Object.values(models)) await model.createIndexes(); await assertWorkspaceIndexes();
    for (let index = 0; index < 5; index++) {
      const user = new User({ displayName: `Test User ${index}`, email: `${prefix}-${index}@example.com`, passwordHash: encoded, emailVerifiedAt: index === 4 ? null : new Date(), termsAcceptance: { version: 'test-only', acceptedAt: new Date() } });
      await user.save(); users.push(user.toObject());
      const login = await auth.login({ email: user.email, password }); logins.push(login); identities.push(await auth.authenticate(login.accessToken));
    }
    server = createApp({ authService: auth, authConfig: config, workspaceService: service }).listen(0, '127.0.0.1'); await once(server, 'listening');
    const base = `http://127.0.0.1:${server.address().port}`;
    const http = (index, path, method = 'GET', body, extra = {}) => fetch(base + path, { method, headers: { Origin: config.webOrigin, 'Content-Type': 'application/json', ...(index !== null ? { Authorization: `Bearer ${logins[index].accessToken}` } : {}), ...extra }, ...(body !== undefined ? { body: JSON.stringify(body) } : {}) });
    await t.test('Creation receipts serialize retries, reject changed input and enforce current access', async () => {
      const requestId = randomUUID(), input = { name: `${prefix} Retry`, requestId };
      assert.deepEqual(await service.creation(identities[0], requestId, {}), { status: 'not_found' });
      const race = await Promise.all([service.create(identities[0], input), service.create(identities[0], input)]);
      const workspace = race[0].workspace; workspaceIds.push(new mongoose.Types.ObjectId(workspace.id));
      assert.equal(race[1].workspace.id, workspace.id);
      assert.equal(await Workspace.collection.countDocuments({ name: input.name }), 1);
      assert.equal(await WorkspaceManagementAudit.collection.countDocuments({ workspaceId: new mongoose.Types.ObjectId(workspace.id), action: 'created' }), 1);
      assert.equal(await WorkspaceMembership.collection.countDocuments({ workspaceId: new mongoose.Types.ObjectId(workspace.id) }), 1);
      assert.equal((await service.create(identities[0], { ...input, summary: null, icon: 'folder', color: 'lavender', coverId: 'moodboard' })).workspace.id, workspace.id);
      await assert.rejects(service.create(identities[0], { ...input, name: 'Changed input' }), /WORKSPACE_CREATION_INPUT_MISMATCH/u);
      assert.deepEqual(await service.creation(identities[1], requestId, {}), { status: 'not_found' });
      const separate = await service.create(identities[1], input); workspaceIds.push(new mongoose.Types.ObjectId(separate.workspace.id));
      assert.notEqual(separate.workspace.id, workspace.id);
      assert.equal((await http(0, `/workspaces/creation-requests/${requestId}`)).status, 200);
      assert.equal((await http(0, `/workspaces/creation-requests/${requestId}?q=bad`)).status, 400);
      await assert.rejects(async () => service.create(identities[0], { ...input, requestId: 'invalid' }), /INVALID_INPUT/u);
      await service.state(identities[0], workspace.id, { expectedVersion: 0, state: 'archived', confirmName: workspace.name, reason: 'Fixture archive' });
      assert.equal((await service.creation(identities[0], requestId, {})).workspace.state, 'archived');
      // Simulate membership loss without deleting receipt or Workspace; old key cannot recreate it.
      await WorkspaceMembership.collection.updateOne({ workspaceId: new mongoose.Types.ObjectId(workspace.id), userId: users[0]._id }, { $set: { state: 'inactive' } });
      await assert.rejects(service.creation(identities[0], requestId, {}), /WORKSPACE_UNAVAILABLE/u);
      await assert.rejects(service.create(identities[0], input), /WORKSPACE_UNAVAILABLE/u);
      assert.equal(await Workspace.collection.countDocuments({ name: input.name }), 2);
    });
    await t.test('Merged history includes available legacy/security records with collision-safe cursors and scoped privacy', async () => {
      const legacy = new Workspace({ ownerId: users[0]._id, name: 'Historical audit fixture' }); await legacy.save(); workspaceIds.push(legacy._id);
      await new WorkspaceMembership({ workspaceId: legacy._id, userId: users[0]._id, joinedAt: new Date() }).save();
      const shared = new mongoose.Types.ObjectId(), at = new Date('2026-10-01T03:00:00.000Z'), common = { _id: shared, workspaceId: legacy._id, actorId: users[0]._id, createdAt: at };
      await new WorkspaceManagementAudit({ ...common, action: 'metadata_updated', changedFields: ['name'], versionScope: 'workspace', resourceVersion: 2 }).save();
      await new WorkspaceRoleAudit({ ...common, targetUserId: users[1]._id, previousRole: 'member', role: 'manager', reason: 'Historical role', membershipVersion: 1 }).save();
      await new WorkspaceLifecycleAudit({ ...common, previousState: 'active', state: 'archived', reason: 'Historical close', resourceVersion: 4 }).save();
      await new ModerationAction({ ...common, scopeType: 'workspace', scopeId: legacy._id, targetUserId: users[1]._id, action: 'ban', reason: 'Historical ban', cutoff: at, cleanup: '7', state: 'pending', matchedCount: 3 }).save();
      await new WorkspaceRoleAudit({ workspaceId: legacy._id, actorId: users[0]._id, targetUserId: users[1]._id, previousRole: 'manager', role: 'member', reason: 'ownership_transferred', membershipVersion: 2, createdAt: at }).save();
      const project = new Project({ workspaceId: legacy._id, createdBy: users[0]._id, name: 'Legacy Audit Project' }); await project.save();
      await new ModerationAction({ workspaceId: legacy._id, scopeType: 'project', scopeId: project._id, projectId: project._id, actorId: users[0]._id, targetUserId: users[1]._id, action: 'unban', reason: 'Historical return', cutoff: at, createdAt: at }).save();
      const orgId = new mongoose.Types.ObjectId();
      const orgAction = new ModerationAction({ scopeType: 'organization', scopeId: orgId, organizationId: orgId, workspaceIds: [legacy._id], actorId: users[0]._id, targetUserId: users[1]._id, action: 'ban', reason: 'Must not expose org record', cutoff: at }); await orgAction.save();
      try {
        const read = query => service.audit(identities[0], String(legacy._id), query);
        const full = await read({ limit: '100' }); assert.equal(full.total, 6); assert.equal(full.items.length, 6); assert.equal(full.coverage, 'standalone_available_records_v2');
        assert.equal(full.items.filter(row => row.id.endsWith(String(shared))).length, 4);
        assert.deepEqual(new Set(full.items.map(row => row.source)), new Set(['management', 'role', 'lifecycle', 'security']));
        const ids = []; let cursor;
        do { const page = await read({ limit: '1', ...(cursor ? { cursor } : {}) }); assert.equal(page.total, 6); ids.push(...page.items.map(row => row.id)); cursor = page.nextCursor; } while (cursor);
        assert.deepEqual(ids, full.items.map(row => row.id)); assert.equal(new Set(ids).size, 6);
        assert.equal(full.items.find(row => row.reason === 'ownership_transferred').action, 'role_changed');
        const banned = await read({ action: 'ban' }); assert.equal(banned.total, 1); assert.deepEqual(banned.items[0].cleanup, { mode: '7', state: 'pending', matchedCount: 3, deletedCount: 0 });
        await ModerationAction.collection.updateOne({ _id: shared }, { $set: { state: 'completed', deletedCount: 3 } });
        assert.equal((await read({ action: 'ban' })).items[0].cleanup.state, 'completed');
        assert.equal((await read({ action: 'unban' })).items[0].project.name, project.name);
        assert.equal((await read({ q: 'Historical', from: '2026-10-01', to: '2026-10-01' })).total, 4);
        assert.ok(!JSON.stringify(full).includes('Must not expose')); assert.ok(!JSON.stringify(full).includes('leaseToken')); assert.ok(!JSON.stringify(full).includes('@example.com'));
        const unknownSource = Buffer.from(JSON.stringify({ at: at.toISOString(), id: String(shared), source: 'organizations' })).toString('base64url');
        await assert.rejects(async () => read({ cursor: unknownSource }), /INVALID_INPUT/u);
        await assert.rejects(service.audit(identities[1], String(legacy._id), {}), /WORKSPACE_UNAVAILABLE/u);
      } finally { await ModerationAction.collection.deleteOne({ _id: orgAction._id }); }
    });
    await t.test('Management audit tracks atomic standalone events, filters/paging and fresh management rights', async () => {
      const workspace = await create(`${prefix} Audit`), wsId = new mongoose.Types.ObjectId(workspace.id);
      const changed = await service.update(identities[0], workspace.id, { expectedVersion: 0, summary: 'Private snapshot content', icon: 'palette' });
      await service.update(identities[0], workspace.id, { expectedVersion: 1, summary: 'Private snapshot content', icon: 'palette' });
      const invitation = await link(workspace); const token = raw(invitation);
      await join(1, token); await join(2, token); await join(1, token);
      await service.role(identities[0], workspace.id, String(users[2]._id), { expectedVersion: 0, role: 'manager', reason: 'Review steward' });
      const managerFeed = await service.audit(identities[2], workspace.id, { limit: '2' });
      assert.equal(managerFeed.total, 6); assert.equal(managerFeed.items.length, 2); assert.ok(managerFeed.nextCursor);
      const ban = new AccessBan({ scopeType: 'workspace', scopeId: wsId, workspaceId: wsId, userId: users[2]._id, reason: 'Fixture ban', imposedBy: users[0]._id, imposedAt: new Date() }); await ban.save();
      try { await assert.rejects(service.audit(identities[2], workspace.id, {}), /ACCESS_BANNED/u); }
      finally { await AccessBan.collection.deleteOne({ _id: ban._id }); }
      const next = await service.audit(identities[2], workspace.id, { limit: '2', cursor: managerFeed.nextCursor });
      assert.equal(next.total, 6); assert.ok(next.items.every(row => !managerFeed.items.some(first => first.id === row.id)));
      const meta = await service.audit(identities[0], workspace.id, { action: 'metadata_updated' });
      assert.equal(meta.total, 1); assert.deepEqual(meta.items[0].changedFields, ['icon', 'summary']);
      assert.equal(meta.items[0].resourceVersion, changed.workspace.version);
      assert.ok(!JSON.stringify(await service.audit(identities[0], workspace.id, {})).includes('Private snapshot content'));
      assert.ok(!JSON.stringify(managerFeed).includes('@example.com')); assert.ok(!JSON.stringify(managerFeed).includes(token));
      assert.equal((await service.audit(identities[0], workspace.id, { q: 'Review steward', action: 'role_changed' })).total, 1);
      const day = new Date(new Date(meta.items[0].createdAt).getTime() + 7 * 3600000).toISOString().slice(0, 10);
      assert.equal((await service.audit(identities[0], workspace.id, { from: day, to: day })).total, 6);
      await assert.rejects(service.audit(identities[1], workspace.id, {}), /OWNER_REQUIRED/u);
      await assert.rejects(service.audit(identities[3], workspace.id, {}), /WORKSPACE_UNAVAILABLE/u);
      assert.equal((await http(0, `/workspaces/${workspace.id}/audit?limit=1`)).status, 200);
      assert.equal((await http(1, `/workspaces/${workspace.id}/audit`)).status, 403);
      assert.equal((await http(3, `/workspaces/${workspace.id}/audit`)).status, 404);
      assert.equal((await http(0, `/workspaces/${workspace.id}/audit?action=forged`)).status, 400);
      assert.equal((await http(0, `/workspaces/${workspace.id}/audit?ownerId=forged`)).status, 400);
      // A journal write failure must roll back the business mutation, not leave a gap.
      const originalSave = WorkspaceManagementAudit.prototype.save;
      try {
        WorkspaceManagementAudit.prototype.save = async function() { throw Error('AUDIT_TEST_FAILURE'); };
        await assert.rejects(service.update(identities[0], workspace.id, { expectedVersion: 1, name: 'Must roll back' }), /AUDIT_TEST_FAILURE/u);
      } finally { WorkspaceManagementAudit.prototype.save = originalSave; }
      assert.equal((await service.get(identities[0], workspace.id)).workspace.name, workspace.name);
      assert.equal((await service.get(identities[0], workspace.id)).workspace.version, 1);
      await service.leave(identities[1], workspace.id, { expectedVersion: 0 }); await service.leave(identities[1], workspace.id, { expectedVersion: 1 });
      await join(1, token); await service.remove(identities[2], workspace.id, String(users[1]._id), { expectedVersion: 2 });
      await service.transfer(identities[0], workspace.id, { expectedVersion: 1, memberId: String(users[2]._id) });
      await assert.rejects(service.audit(identities[0], workspace.id, {}), /OWNER_REQUIRED/u);
      await service.state(identities[2], workspace.id, { expectedVersion: 2, state: 'archived', confirmName: workspace.name, reason: 'Close fixture' });
      assert.equal((await service.audit(identities[2], workspace.id, { action: 'archived' })).total, 1);
      await service.state(identities[2], workspace.id, { expectedVersion: 3, state: 'active', confirmName: workspace.name, reason: 'Open fixture' });
      await service.revoke(identities[2], workspace.id, invitation.invitation.id, { expectedVersion: 0 });
      await service.revoke(identities[2], workspace.id, invitation.invitation.id, { expectedVersion: 1 });
      const feed = await service.audit(identities[2], workspace.id, { limit: '100' });
      assert.equal(feed.total, 13); assert.equal(feed.items.length, 13);
      assert.equal(feed.items.find(row => row.action === 'member_joined').invitationType, 'LINK');
      assert.equal(feed.items.find(row => row.action === 'invitation_revoked').invitationType, 'LINK');
      assert.deepEqual(new Set(feed.items.map(row => row.action)), new Set(['created', 'metadata_updated', 'invitation_created', 'invitation_revoked', 'member_joined', 'member_left', 'member_removed', 'role_changed', 'ownership_transferred', 'archived', 'unarchived']));
      // Pure reads and rejected changes do not manufacture activity.
      assert.equal(await WorkspaceManagementAudit.collection.countDocuments({ workspaceId: wsId }), 13);
      const org = new Organization({ ownerId: users[0]._id, name: 'Audit transition fixture' }); await org.save();
      try {
        await new OrganizationMembership({ organizationId: org._id, userId: users[0]._id, joinedAt: new Date() }).save();
        const attached = new Workspace({ organizationId: org._id, managerId: users[0]._id, name: 'Attached audit fixture' }); await attached.save(); workspaceIds.push(attached._id);
        await assert.rejects(service.audit(identities[0], String(attached._id), {}), /WORKSPACE_AUDIT_MODE_UNAVAILABLE/u);
        await service.update(identities[0], String(attached._id), { expectedVersion: 0, summary: 'Attached change' });
        assert.equal(await WorkspaceManagementAudit.collection.countDocuments({ workspaceId: attached._id }), 0);
      } finally {
        await OrganizationMembership.collection.deleteMany({ organizationId: org._id }); await Organization.collection.deleteOne({ _id: org._id });
      }
      await WorkspaceMembership.collection.deleteMany({ workspaceId: wsId }); // Isolate fixture from later all-Workspace assertions.
    });
    await t.test('Multiple standalone Managers are Owner-appointed, scoped, protected and lose privileges on demotion/exit', async () => {
      const workspace = await create(`${prefix} Roles`), workspaceId = new mongoose.Types.ObjectId(workspace.id);
      const invitation = await link(workspace), token = raw(invitation);
      for (const index of [1, 2, 3]) await join(index, token);
      const change = (actor, index, role, version = 0) => service.role(identities[actor], workspace.id, String(users[index]._id), { expectedVersion: version, role, reason: 'Fixture role change' });
      await change(0, 1, 'manager');
      const promoteHttp = await http(0, `/workspaces/${workspace.id}/members/${users[2]._id}/role`, 'PATCH', { expectedVersion: 0, role: 'manager', reason: 'HTTP appointment' });
      assert.equal(promoteHttp.status, 200); assert.equal((await promoteHttp.json()).member.role, 'manager');
      const context = (await service.get(identities[1], workspace.id)).workspace;
      assert.equal(context.role, 'manager'); assert.equal(context.permissions.invite, true); assert.equal(context.permissions.transferOwnership, false);
      assert.equal((await service.list(identities[1], { role: 'managed', q: `${prefix} Roles` })).total, 1);
      const rows = await service.members(identities[1], workspace.id, {});
      assert.equal(rows.items.filter(row => row.role === 'manager').length, 2);
      assert.equal(rows.items.find(row => row.userId === String(users[2]._id)).permissions.remove, false);
      const moderation = createModerationService({ store: createMongoModerationStore({ config }) });
      await assert.rejects(moderation.preview(identities[1], 'workspace', workspace.id, { userId: String(users[2]._id) }), /OWNER_REQUIRED/u);
      const work = createWorkService({ store: createMongoWorkStore({ config }) });
      const project = new Project({ workspaceId, createdBy: users[0]._id, name: 'Role fixture' }); await project.save();
      const task = new Task({ workspaceId, projectId: project._id, createdBy: users[3]._id, title: 'Manager rights fixture' }); await task.save();
      const content = emptyRichText(); content.document.content = [{ type: 'paragraph', content: [{ type: 'text', text: 'Author comment' }] }];
      const comment = new TaskComment({ workspaceId, taskId: task._id, authorId: users[3]._id, content }); await comment.save();
      const commentPage = await work.comments(identities[1], String(task._id), {});
      assert.equal(commentPage.items[0].permissions.moderate, false);
      await assert.rejects(work.deleteComment(identities[1], String(task._id), String(comment._id), { expectedVersion: 0, reason: 'Forbidden moderation' }), /COMMENT_AUTHOR_REQUIRED/u);
      await assert.rejects(change(1, 3, 'manager'), /OWNER_REQUIRED/u);
      await assert.rejects(change(0, 0, 'member'), /CANNOT_CHANGE_OWNER_ROLE/u);
      await assert.rejects(service.remove(identities[1], workspace.id, String(users[2]._id), { expectedVersion: 1 }), /OWNER_REQUIRED/u);
      await assert.rejects(service.transfer(identities[1], workspace.id, { expectedVersion: 0, memberId: String(users[3]._id) }), /OWNER_REQUIRED/u);
      await assert.rejects(service.state(identities[1], workspace.id, { expectedVersion: 0, state: 'archived', confirmName: workspace.name, reason: 'Forbidden' }), /OWNER_REQUIRED/u);
      const allowedLink = await service.invite(identities[1], workspace.id, { type: 'LINK' }); assert.ok(allowedLink.url);
      const changed = await service.update(identities[1], workspace.id, { expectedVersion: 0, summary: 'Manager editing' }); assert.equal(changed.workspace.version, 1);
      const race = await Promise.allSettled([change(0, 1, 'member', 1), change(0, 1, 'member', 1)]);
      assert.equal(race.filter(result => result.status === 'fulfilled').length, 1);
      assert.match(race.find(result => result.status === 'rejected').reason.message, /VERSION_CONFLICT/u);
      await assert.rejects(service.invite(identities[1], workspace.id, { type: 'LINK' }), /OWNER_REQUIRED/u);
      await assert.rejects(service.update(identities[1], workspace.id, { expectedVersion: 1, summary: 'Stale rights' }), /OWNER_REQUIRED/u);
      await assert.rejects(work.updateTask(identities[1], String(task._id), { expectedVersion: 0, title: 'Lost role edit' }), /TASK_EDIT_FORBIDDEN/u);
      const auditCount = await WorkspaceRoleAudit.collection.countDocuments({ workspaceId }); assert.equal(auditCount, 3);
      const history = await service.roleAudit(identities[2], workspace.id, { limit: '1' });
      assert.equal(history.total, 3); assert.equal(history.items.length, 1); assert.ok(history.nextCursor);
      const secondHistory = await service.roleAudit(identities[0], workspace.id, { limit: '1', cursor: history.nextCursor });
      assert.notEqual(secondHistory.items[0].id, history.items[0].id);
      assert.ok(!JSON.stringify(history).includes('@example.com'));
      const filteredHistory = await service.roleAudit(identities[0], workspace.id, { q: 'HTTP appointment' }); assert.equal(filteredHistory.total, 1);
      const historyDay = new Date(new Date(history.items[0].createdAt).getTime() + 7 * 3600000).toISOString().slice(0, 10);
      const datedHistory = await service.roleAudit(identities[0], workspace.id, { from: historyDay, to: historyDay }); assert.ok(datedHistory.items.some(row => row.id === history.items[0].id));
      await assert.rejects(service.roleAudit(identities[1], workspace.id, {}), /OWNER_REQUIRED/u);
      assert.equal((await http(0, `/workspaces/${workspace.id}/role-audit?limit=1`)).status, 200);
      assert.equal((await http(1, `/workspaces/${workspace.id}/role-audit`)).status, 403);
      assert.equal((await http(0, `/workspaces/${workspace.id}/role-audit?ownerId=forged`)).status, 400);
      await new WorkspaceMembership({ workspaceId, userId: users[4]._id, joinedAt: new Date() }).save();
      assert.equal((await service.members(identities[0], workspace.id, {})).items.find(row => row.userId === String(users[4]._id)).permissions.changeRole, false);
      await assert.rejects(change(0, 4, 'manager'), /MEMBER_UNAVAILABLE/u);
      await change(0, 1, 'member', 2); assert.equal(await WorkspaceRoleAudit.collection.countDocuments({ workspaceId }), auditCount);
      await service.leave(identities[2], workspace.id, { expectedVersion: 1 });
      await join(2, raw(allowedLink)); assert.equal((await service.get(identities[2], workspace.id)).workspace.role, 'member');
      const other = await create(`${prefix} Other`);
      await assert.rejects(service.get(identities[1], other.id), /WORKSPACE_UNAVAILABLE/u);
      await assert.rejects(service.roleAudit(identities[1], other.id, {}), /WORKSPACE_UNAVAILABLE/u);
      await change(0, 3, 'manager');
      const transferred = await service.transfer(identities[0], workspace.id, { expectedVersion: 1, memberId: String(users[3]._id) });
      assert.equal(transferred.workspace.role, 'member');
      assert.equal((await service.get(identities[3], workspace.id)).workspace.role, 'owner');
      await service.transfer(identities[3], workspace.id, { expectedVersion: 2, memberId: String(users[0]._id) });
      assert.equal((await service.get(identities[3], workspace.id)).workspace.role, 'member');
      const beforeRace = await member(workspace, 2); await change(0, 2, 'manager', beforeRace.version);
      const competing = await Promise.allSettled([
        change(0, 2, 'member', beforeRace.version + 1),
        work.updateTask(identities[2], String(task._id), { expectedVersion: 0, title: 'Concurrent manager edit' }),
      ]);
      assert.equal(competing[0].status, 'fulfilled');
      if (competing[1].status === 'rejected') assert.match(competing[1].reason.message, /TASK_EDIT_FORBIDDEN/u);
      assert.equal((await service.get(identities[2], workspace.id)).workspace.role, 'member');
      const currentTask = await Task.collection.findOne({ _id: task._id });
      await assert.rejects(work.updateTask(identities[2], String(task._id), { expectedVersion: currentTask.version, title: 'Post demotion edit' }), /TASK_EDIT_FORBIDDEN/u);
      for (const model of [TaskComment, Task, Project, WorkspaceRoleAudit, WorkspaceInvitation, WorkspaceMembership]) await model.collection.deleteMany({ workspaceId });
      await Workspace.collection.deleteOne({ _id: workspaceId });
      await WorkspaceMembership.collection.deleteMany({ workspaceId: new mongoose.Types.ObjectId(other.id) });
      await Workspace.collection.deleteOne({ _id: new mongoose.Types.ObjectId(other.id) });
    });
    await t.test('Workspace metadata persists through create/update/search, protects writes and retains child-state counts after Archive', async () => {
      const { workspace } = await service.create(identities[0], { name: `${prefix} Metadata`, summary: 'Mục tiêu đặc biệt', icon: 'palette', color: 'mint', coverId: 'campaign' });
      const workspaceId = new mongoose.Types.ObjectId(workspace.id); workspaceIds.push(workspaceId);
      assert.equal(workspace.summary, 'Mục tiêu đặc biệt'); assert.equal(workspace.coverId, 'campaign');
      const invitation = await link(workspace); await join(1, raw(invitation));
      assert.equal((await http(1, `/workspaces/${workspace.id}`, 'PATCH', { expectedVersion: 0, summary: 'Unauthorized' })).status, 403);
      const saved = await service.update(identities[0], workspace.id, { expectedVersion: 0, summary: 'Searchable objective', icon: 'code' });
      assert.equal(saved.workspace.version, 1); assert.equal(saved.workspace.color, 'mint');
      await assert.rejects(service.update(identities[0], workspace.id, { expectedVersion: 0, color: 'blue' }), /VERSION_CONFLICT/u);
      const search = await service.list(identities[0], { q: 'Searchable objective', limit: '1' });
      assert.equal(search.items[0].id, workspace.id); assert.equal(search.total, 1);
      for (const state of ['active', 'archived']) {
        const project = new Project({ workspaceId, createdBy: users[0]._id, name: `Metadata ${state}`, state, ...(state === 'archived' ? { archivedAt: new Date(), archivedBy: users[0]._id } : {}) });
        await project.save();
      }
      const archived = await service.state(identities[0], workspace.id, { expectedVersion: 1, state: 'archived', confirmName: workspace.name, reason: 'Fixture archive' });
      assert.equal(archived.workspace.readOnly, true);
      await assert.rejects(service.update(identities[0], workspace.id, { expectedVersion: 2, summary: null }), /WORKSPACE_ARCHIVED/u);
      const row = (await service.list(identities[0], { q: 'Searchable objective' })).items[0];
      assert.equal(row.activeProjectCount, 1); assert.equal(row.archivedProjectCount, 1);
      await service.state(identities[0], workspace.id, { expectedVersion: 2, state: 'active', confirmName: workspace.name, reason: 'Fixture reopen' });
      const cleared = await service.update(identities[0], workspace.id, { expectedVersion: 3, summary: null });
      assert.equal(cleared.workspace.summary, null);
      await Workspace.collection.updateOne({ _id: workspaceId }, { $unset: { summary: '', icon: '', color: '', coverId: '' } });
      const legacy = (await service.get(identities[0], workspace.id)).workspace;
      assert.equal(legacy.icon, 'folder'); assert.equal(legacy.summary, null);
      assert.equal(Object.hasOwn(await Workspace.collection.findOne({ _id: workspaceId }), 'icon'), false);
      for (const model of [Project, WorkspaceInvitation, WorkspaceMembership]) await model.collection.deleteMany({ workspaceId });
      await Workspace.collection.deleteOne({ _id: workspaceId });
    });
    await t.test('Server-side name search/time/cursor only returns current memberships', async () => {
      const first=await create(`${prefix} Sáng Tạo One`), second=await create(`${prefix} Sáng Tạo Two`);
      const hidden=await service.create(identities[2],{name:`${prefix} Sáng Tạo Hidden`});workspaceIds.push(new mongoose.Types.ObjectId(hidden.workspace.id));
      const firstPage=await service.list(identities[0],{q:`${prefix} sang tao`,limit:'1'});assert.equal(firstPage.items.length,1);assert.ok(firstPage.nextCursor);
      const secondPage=await service.list(identities[0],{q:`${prefix} sang tao`,limit:'1',cursor:firstPage.nextCursor});assert.equal(secondPage.items.length,1);assert.equal(secondPage.nextCursor,null);
      assert.deepEqual(new Set([...firstPage.items,...secondPage.items].map(w=>w.id)),new Set([first.id,second.id]));
      await Workspace.collection.updateOne({_id:new mongoose.Types.ObjectId(first.id)},{$set:{createdAt:new Date('2026-10-03T16:59:59.000Z')}});
      await Workspace.collection.updateOne({_id:new mongoose.Types.ObjectId(second.id)},{$set:{createdAt:new Date('2026-10-03T17:00:00.000Z')}});
      const day=await service.list(identities[0],{q:prefix,from:'2026-10-04',to:'2026-10-04'});assert.deepEqual(day.items.map(w=>w.id),[second.id]);
      assert.equal((await http(0,'/workspaces?from=2026-10-05&to=2026-10-04')).status,400);
      // Isolate this case so pre-existing lifecycle tests retain their assumptions.
      const ids=[first.id,second.id,hidden.workspace.id].map(id=>new mongoose.Types.ObjectId(id));await WorkspaceMembership.collection.deleteMany({workspaceId:{$in:ids}});await Workspace.collection.deleteMany({_id:{$in:ids}});
    });
    await t.test('Team search/date/state filters apply before pagination and preserve privacy', async () => {
      const workspace = await create('Team query test');
      const invitation = await link(workspace); await join(1, raw(invitation)); await join(2, raw(invitation));
      const first = await service.members(identities[0], workspace.id, { q: 'Test User', limit: '1' });
      const second = await service.members(identities[0], workspace.id, { q: 'Test User', limit: '1', cursor: first.nextCursor });
      assert.equal(first.items.length, 1); assert.equal(second.items.length, 1); assert.notEqual(first.items[0].userId, second.items[0].userId);
      assert.equal((await service.members(identities[0], workspace.id, { q: 'User 2' })).items[0].userId, String(users[2]._id));
      assert.ok(!JSON.stringify(first).includes('email')); assert.ok(!JSON.stringify(first).includes('passwordHash'));
      await WorkspaceMembership.collection.updateOne({workspaceId:new mongoose.Types.ObjectId(workspace.id),userId:users[2]._id}, {$set:{joinedAt:new Date('2026-10-03T17:00:00Z')}});
      assert.deepEqual((await service.members(identities[0], workspace.id, {q:'User 2',from:'2026-10-04',to:'2026-10-04'})).items.map(x=>x.userId), [String(users[2]._id)]);
      await service.invite(identities[0], workspace.id, {type:'EMAIL',email:`${prefix}-query@example.com`});
      const email = await service.invitations(identities[0],workspace.id,{q:'query',type:'EMAIL',state:'active'}); assert.equal(email.items.length,1); assert.equal(email.items[0].emailDelivery,'pending');
      assert.equal((await service.invitations(identities[0],workspace.id,{q:'query',type:'LINK'})).items.length,0);
      assert.ok(!JSON.stringify(email).includes('token')); await service.revoke(identities[0],workspace.id,email.items[0].id,{expectedVersion:email.items[0].version});
      assert.equal((await service.invitations(identities[0],workspace.id,{q:'query',state:'revoked'})).items.length,1);
      assert.equal((await service.invitations(identities[0],workspace.id,{q:'query',state:'active'})).items.length,0);
      assert.equal((await http(1,`/workspaces/${workspace.id}/invitations?q=query`)).status,403);
      for(const query of ['from=2026-10-05&to=2026-10-04','state=unknown','q[$ne]=x']) assert.equal((await http(0,`/workspaces/${workspace.id}/invitations?${query}`)).status,400);
      await WorkspaceMembership.collection.deleteMany({ workspaceId: new mongoose.Types.ObjectId(workspace.id) });
    });
    await t.test('Atomic create, verified gate, ownership, rich text, privacy and pagination', async () => {
      assert.equal((await http(4, '/workspaces', 'POST', { name: 'Unverified' })).status, 403);
      await assert.rejects(service.create(identities[4], { name: 'Unverified direct' }), /EMAIL_VERIFICATION_REQUIRED/u);
      const before = await Workspace.collection.countDocuments({ ownerId: users[0]._id });
      const originalSave = WorkspaceMembership.prototype.save;
      try {
        WorkspaceMembership.prototype.save = async function() { throw new Error('INJECTED_MEMBERSHIP_FAILURE'); };
        await assert.rejects(service.create(identities[0], { name: 'Must roll back' }), /INJECTED_MEMBERSHIP_FAILURE/u);
      } finally { WorkspaceMembership.prototype.save = originalSave; }
      assert.equal(await Workspace.collection.countDocuments({ ownerId: users[0]._id }), before);
      const response = await http(0, '/workspaces', 'POST', { name: 'HTTP Workspace', description: emptyRichText() }); assert.equal(response.status, 201);
      const workspace = (await response.json()).workspace; workspaceIds.push(new mongoose.Types.ObjectId(workspace.id));
      assert.equal(workspace.role, 'owner'); assert.equal(await WorkspaceMembership.collection.countDocuments({ workspaceId: workspaceIds.at(-1), state: 'active' }), 1);
      const invitation = await link(workspace); await join(1, raw(invitation));
      assert.equal((await http(1, `/workspaces/${workspace.id}`, 'PATCH', { expectedVersion: 0, name: 'Forbidden' })).status, 403);
      const changed = await http(0, `/workspaces/${workspace.id}`, 'PATCH', { expectedVersion: 0, name: 'Updated' }); assert.equal(changed.status, 200);
      assert.equal((await http(0, `/workspaces/${workspace.id}`, 'PATCH', { expectedVersion: 0, name: 'Stale' })).status, 409);
      const members = await http(1, `/workspaces/${workspace.id}/members`); assert.equal(members.status, 200);
      const memberBody = await members.json(); assert.equal(memberBody.items.filter((value) => value.role === 'owner').length, 1);
      assert.ok(!JSON.stringify(memberBody).includes('@example.com'));
      assert.equal((await http(2, `/workspaces/${workspace.id}`)).status, 404);
      await create('Second'); await create('Third');
      const firstPage = await service.list(identities[0], { limit: '1' }); assert.ok(firstPage.nextCursor);
      const secondPage = await service.list(identities[0], { limit: '1', cursor: firstPage.nextCursor }); assert.notEqual(firstPage.items[0].id, secondPage.items[0].id);
      assert.equal((await service.list(identities[2], {})).items.length, 0);
      assert.equal((await http(0, '/workspaces?limit=1000')).status, 400);
      assert.equal((await http(0, '/workspaces', 'POST', { name: 'Injected', ownerId: String(users[1]._id) })).status, 400);
    });
    await t.test('Owner-only invitations, minimal preview, reusable LINK and concurrent duplicate accept', async () => {
      const workspace = await create(); const invitation = await link(workspace); const token = raw(invitation);
      await join(1, token);
      assert.equal((await http(1, `/workspaces/${workspace.id}/invitations`, 'POST', { type: 'LINK' })).status, 403);
      assert.equal((await http(1, `/workspaces/${workspace.id}/invitations`)).status, 403);
      const otherWorkspace = await create('Other scope');
      await assert.rejects(service.revoke(identities[0], otherWorkspace.id, invitation.invitation.id, { expectedVersion: 0 }), /INVITATION_UNAVAILABLE/u);
      const preview = await http(null, '/invitations/preview', 'POST', { token }); assert.equal(preview.status, 200);
      assert.deepEqual(Object.keys((await preview.json()).preview).sort(), ['expiresAt', 'inviterDisplayName', 'type', 'workspaceName']);
      const accepted = await Promise.all([join(2, token), join(2, token)]);
      assert.deepEqual(accepted.map((value) => value.code).sort(), ['ALREADY_MEMBER', 'WORKSPACE_JOINED']);
      assert.equal(await WorkspaceMembership.collection.countDocuments({ workspaceId: new mongoose.Types.ObjectId(workspace.id), userId: users[2]._id }), 1);
      assert.equal(await Notification.collection.countDocuments({ workspaceId: new mongoose.Types.ObjectId(workspace.id) }), 0);
      await assert.rejects(join(4, token), /EMAIL_VERIFICATION_REQUIRED/u);
    });
    await t.test('EMAIL targets verified exact email, hashes token, delivery queues and single-use consume', async () => {
      const workspace = await create();
      const emailInvitation = await service.invite(identities[0], workspace.id, { type: 'EMAIL', email: users[1].email });
      assert.equal(Object.hasOwn(emailInvitation, 'url'), false); assert.equal(emailInvitation.invitation.emailDelivery, 'pending');
      const job = await EmailOutbox.collection.findOne({ invitationId: new mongoose.Types.ObjectId(emailInvitation.invitation.id) });
      const token = crypto.open(job.encryptedDeliveryData, job.eventId).token;
      assert.ok(!JSON.stringify(job).includes(token));
      await assert.rejects(join(2, token), /INVITATION_EMAIL_MISMATCH/u);
      const sent = [];
      const delivery = await dispatchInvitationMail({ config, send: async (message) => { sent.push(message); return 'fake-provider'; } });
      assert.equal(delivery.state, 'sent'); assert.equal(sent.length, 1); assert.equal(sent[0].to, users[1].email);
      assert.equal(await Notification.collection.countDocuments({ invitationId: job.invitationId, recipientId: users[1]._id }), 1);
      const joined = await join(1, token); assert.equal(joined.code, 'WORKSPACE_JOINED');
      assert.equal((await join(1, token)).code, 'ALREADY_MEMBER');
      assert.equal((await service.invite(identities[0], workspace.id, { type: 'EMAIL', email: users[1].email })).code, 'ALREADY_MEMBER');
      const current = await member(workspace, 1); await service.leave(identities[1], workspace.id, { expectedVersion: current.version });
      await assert.rejects(join(1, token), /INVITATION_UNAVAILABLE/u);
      const unverifiedInvite = await service.invite(identities[0], workspace.id, { type: 'EMAIL', email: users[4].email });
      const unverifiedJob = await EmailOutbox.collection.findOne({ invitationId: new mongoose.Types.ObjectId(unverifiedInvite.invitation.id) });
      const unverifiedToken = crypto.open(unverifiedJob.encryptedDeliveryData, unverifiedJob.eventId).token;
      await assert.rejects(join(4, unverifiedToken), /EMAIL_VERIFICATION_REQUIRED/u);
      assert.equal((await WorkspaceInvitation.collection.findOne({ _id: unverifiedJob.invitationId })).acceptedAt, null);
      await User.collection.updateOne({ _id: users[4]._id }, { $set: { emailVerifiedAt: new Date() } });
      assert.equal((await join(4, unverifiedToken)).code, 'WORKSPACE_JOINED');
      // Consume/cancel this mail job before subsequent dispatcher tests.
      assert.equal((await dispatchInvitationMail({ config, send: async () => { throw new Error('Must not send consumed invitation'); } })).state, 'cancelled');
    });
    await t.test('Leave/remove clear unfinished assignees in Active and Archived, preserve Done and reset override on rejoin', async () => {
      const workspace = await create(); const token = raw(await link(workspace)); await join(1, token);
      await service.overrides(identities[1], workspace.id, { expectedVersion: 0, emailOverrides: { assignment: 'off', status: 'on' } });
      const projectIds = [];
      for (const archived of [false, true]) {
        const project = new Project({ workspaceId: workspace.id, createdBy: users[0]._id, name: archived ? 'Archived' : 'Active', state: archived ? 'archived' : 'active', archivedAt: archived ? new Date() : null, archivedBy: archived ? users[0]._id : null }); await project.save(); projectIds.push(project._id);
        for (const status of ['todo', 'in_progress', 'done']) await new Task({ workspaceId: workspace.id, projectId: project._id, createdBy: users[0]._id, title: status, status, assigneeId: users[1]._id }).save();
      }
      assert.equal((await service.leave(identities[1], workspace.id, { expectedVersion: 1 })).code, 'WORKSPACE_LEFT');
      assert.equal((await service.leave(identities[1], workspace.id, { expectedVersion: 1 })).code, 'ALREADY_LEFT');
      const tasks = await Task.collection.find({ workspaceId: new mongoose.Types.ObjectId(workspace.id) }).toArray();
      assert.equal(tasks.filter((value) => value.status !== 'done' && value.assigneeId === null && value.version === 1).length, 4);
      assert.equal(tasks.filter((value) => value.status === 'done' && String(value.assigneeId) === String(users[1]._id) && value.version === 0).length, 2);
      assert.equal((await http(1, `/workspaces/${workspace.id}`)).status, 404);
      assert.equal((await service.list(identities[1], {})).items.some((value) => value.id === workspace.id), false);
      await join(1, token); const rejoined = await member(workspace, 1);
      assert.equal(rejoined.membershipGeneration, 2); assert.equal(rejoined.emailOverrides.assignment, 'inherit'); assert.equal(rejoined.emailOverrides.status, 'inherit');
      await assert.rejects(service.leave(identities[1], workspace.id, { expectedVersion: 1 }), /VERSION_CONFLICT/u);
      await assert.rejects(service.remove(identities[1], workspace.id, String(users[0]._id), { expectedVersion: 0 }), /OWNER_REQUIRED/u);
      await assert.rejects(service.leave(identities[0], workspace.id, { expectedVersion: 0 }), /TRANSFER_REQUIRED/u);
      await service.remove(identities[0], workspace.id, String(users[1]._id), { expectedVersion: rejoined.version });
      assert.equal((await member(workspace, 1)).exitReason, 'removed');
      await join(1, token); assert.equal((await member(workspace, 1)).membershipGeneration, 3);
      assert.equal(await Task.collection.countDocuments({ workspaceId: new mongoose.Types.ObjectId(workspace.id), status: { $ne: 'done' }, assigneeId: null }), 4);
    });
    await t.test('Transfer/leave race cannot orphan Owner; transfer keeps invitations and revokes old Owner privileges', async () => {
      const workspace = await create(); const invitation = await link(workspace); const token = raw(invitation); await join(1, token); await join(2, token);
      const race = await Promise.allSettled([service.transfer(identities[0], workspace.id, { expectedVersion: 0, memberId: String(users[1]._id) }), service.leave(identities[1], workspace.id, { expectedVersion: 0 })]);
      assert.equal(race.filter((value) => value.status === 'fulfilled').length, 1);
      if (race[0].status === 'fulfilled') {
        assert.equal(race[0].value.workspace.role, 'member');
        assert.equal(race[0].value.workspace.permissions.manage, false);
      }
      const actual = await Workspace.collection.findOne({ _id: new mongoose.Types.ObjectId(workspace.id) });
      const ownerMembership = await WorkspaceMembership.collection.findOne({ workspaceId: actual._id, userId: actual.ownerId }); assert.equal(ownerMembership.state, 'active');
      const ownerIndex = String(actual.ownerId) === String(users[0]._id) ? 0 : 1;
      if (ownerIndex === 0) await service.transfer(identities[0], workspace.id, { expectedVersion: 0, memberId: String(users[2]._id) });
      const finalOwner = ownerIndex === 0 ? 2 : 1;
      await assert.rejects(service.invite(identities[0], workspace.id, { type: 'LINK' }), /OWNER_REQUIRED/u);
      assert.equal((await service.invitations(identities[finalOwner], workspace.id, {})).items[0].id, invitation.invitation.id);
      await join(3, token);
      const members = await service.members(identities[finalOwner], workspace.id, {}); assert.equal(members.items.filter((value) => value.role === 'owner').length, 1);
    });
    await t.test('Accept/revoke race commits consistently; expired/revoked tokens and stale edits cannot join', async () => {
      const workspace = await create(); const invitation = await link(workspace); const token = raw(invitation);
      const race = await Promise.allSettled([join(3, token), service.revoke(identities[0], workspace.id, invitation.invitation.id, { expectedVersion: 0 })]);
      assert.equal(race[1].status, 'fulfilled');
      const joined = await member(workspace, 3); assert.equal(Boolean(joined?.state === 'active'), race[0].status === 'fulfilled');
      await assert.rejects(join(2, token), /INVITATION_UNAVAILABLE/u);
      await assert.rejects(service.preview({ token }), /INVITATION_UNAVAILABLE/u);
      assert.equal((await service.revoke(identities[0], workspace.id, invitation.invitation.id, { expectedVersion: 0 })).invitation.state, 'revoked');
      const expired = await link(workspace); await WorkspaceInvitation.collection.updateOne({ _id: new mongoose.Types.ObjectId(expired.invitation.id) }, { $set: { expiresAt: new Date(0) } });
      await assert.rejects(join(2, raw(expired)), /INVITATION_UNAVAILABLE/u);
      const edits = await Promise.allSettled([service.update(identities[0], workspace.id, { expectedVersion: 0, name: 'One' }), service.update(identities[0], workspace.id, { expectedVersion: 0, name: 'Two' })]);
      assert.equal(edits.filter((value) => value.status === 'fulfilled').length, 1);
    });
    await t.test('Invitation retry preserves token/expiry; revoke cancels delivery and absent recipients do not get retroactive notifications', async () => {
      const workspace = await create(); const invitation = await service.invite(identities[0], workspace.id, { type: 'EMAIL', email: users[2].email });
      const invitationId = new mongoose.Types.ObjectId(invitation.invitation.id);
      await EmailOutbox.collection.updateOne({ invitationId }, { $set: { state: 'failed', attempts: 5 } });
      const retry = await service.retryMail(identities[0], workspace.id, invitation.invitation.id, { expectedVersion: 0 }); assert.equal(retry.invitation.emailDelivery, 'pending');
      assert.deepEqual(new Date(retry.invitation.expiresAt), new Date(invitation.invitation.expiresAt));
      await service.revoke(identities[0], workspace.id, invitation.invitation.id, { expectedVersion: 0 });
      assert.equal((await EmailOutbox.collection.findOne({ invitationId })).encryptedDeliveryData, null);
      const absentEmail = `${prefix}-absent@example.com`;
      const absent = await service.invite(identities[0], workspace.id, { type: 'EMAIL', email: absentEmail });
      assert.equal((await dispatchInvitationMail({ config, send: async () => 'fake-provider' })).state, 'sent');
      assert.equal(await Notification.collection.countDocuments({ invitationId: new mongoose.Types.ObjectId(absent.invitation.id) }), 0);
      const later = new User({ email: absentEmail, displayName: 'Later Signup', termsAcceptance: { version: 'test-only', acceptedAt: new Date() } }); await later.save(); users.push(later.toObject());
      assert.equal((await dispatchInvitationMail({ config, send: async () => 'fake-provider' })).state, 'idle');
      assert.equal(await Notification.collection.countDocuments({ invitationId: new mongoose.Types.ObjectId(absent.invitation.id) }), 0);
    });
    await t.test('Invitation worker leases prevent duplicate sends, recover expired leases and redact failures', async () => {
      const workspace = await create();
      const issued = await service.invite(identities[0], workspace.id, { type: 'EMAIL', email: users[3].email });
      const invitationId = new mongoose.Types.ObjectId(issued.invitation.id);
      let sends = 0;
      const send = async () => { sends++; return 'fake-provider'; };
      const delivery = await Promise.all([dispatchInvitationMail({ config, send }), dispatchInvitationMail({ config, send })]);
      assert.equal(delivery.filter((value) => value.state === 'sent').length, 1); assert.equal(sends, 1);
      assert.equal(await Notification.collection.countDocuments({ invitationId, recipientId: users[3]._id }), 1);
      assert.equal((await EmailOutbox.collection.findOne({ invitationId })).encryptedDeliveryData, null);
      const recovering = await service.invite(identities[0], workspace.id, { type: 'EMAIL', email: users[2].email });
      const recoveringId = new mongoose.Types.ObjectId(recovering.invitation.id);
      await EmailOutbox.collection.updateOne({ invitationId: recoveringId }, { $set: { state: 'processing', leaseUntil: new Date(0), leaseToken: 'expired-test-lease', attempts: 2 } });
      assert.equal((await dispatchInvitationMail({ config, send })).state, 'sent');
      assert.equal((await EmailOutbox.collection.findOne({ invitationId: recoveringId })).attempts, 3);
      const failing = await service.invite(identities[0], workspace.id, { type: 'EMAIL', email: users[1].email });
      const failingId = new mongoose.Types.ObjectId(failing.invitation.id);
      assert.equal((await dispatchInvitationMail({ config, send: async () => { throw new Error('private-provider-message'); } })).state, 'retry_or_failed');
      const failed = await EmailOutbox.collection.findOne({ invitationId: failingId });
      assert.equal(failed.state, 'pending'); assert.equal(failed.leaseToken, null); assert.equal(failed.lastErrorCode, 'INVITATION_MAIL_DELIVERY_FAILED');
      assert.ok(!JSON.stringify(failed).includes('private-provider-message'));
      await service.revoke(identities[0], workspace.id, failing.invitation.id, { expectedVersion: 0 });
      const expired = await service.invite(identities[0], workspace.id, { type: 'EMAIL', email: users[1].email });
      await WorkspaceInvitation.collection.updateOne({ _id: new mongoose.Types.ObjectId(expired.invitation.id) }, { $set: { expiresAt: new Date(0) } });
      assert.equal((await dispatchInvitationMail({ config, send: async () => { throw new Error('Expired mail must not send'); } })).state, 'cancelled');
      const lost = await service.invite(identities[0], workspace.id, { type: 'EMAIL', email: users[1].email });
      const lostId = new mongoose.Types.ObjectId(lost.invitation.id);
      const afterSend = await dispatchInvitationMail({ config, send: async () => {
        await EmailOutbox.collection.updateOne({ invitationId: lostId }, { $set: { leaseToken: 'replacement-test-lease' } });
        return 'fake-provider';
      } });
      assert.equal(afterSend.state, 'lease_lost');
      assert.equal(await Notification.collection.countDocuments({ invitationId: lostId }), 0);
      await EmailOutbox.collection.updateOne({ invitationId: lostId }, { $set: { leaseUntil: new Date(0) } });
      assert.equal((await dispatchInvitationMail({ config, send })).state, 'sent');
      assert.equal(await Notification.collection.countDocuments({ invitationId: lostId }), 1);
    });
    await t.test('Repository rejects session revoked after authentication without creating Workspace', async () => {
      const before = await Workspace.collection.countDocuments({ ownerId: users[0]._id });
      await Session.collection.updateOne({ _id: identities[0].session._id }, { $set: { revokedAt: new Date(), revokeReason: 'test-only' } });
      await assert.rejects(service.create(identities[0], { name: 'Revoked' }), /UNAUTHENTICATED/u);
      assert.equal(await Workspace.collection.countDocuments({ ownerId: users[0]._id }), before);
    });
  } finally {
    if (server) await new Promise((resolve) => server.close(resolve));
    for (const model of [Notification, EmailOutbox, Task, Project, WorkspaceInvitation, WorkspaceMembership, WorkspaceRoleAudit, WorkspaceCreation, WorkspaceManagementAudit, WorkspaceLifecycleAudit, ModerationAction]) await model.collection.deleteMany({ workspaceId: { $in: workspaceIds } });
    await Workspace.collection.deleteMany({ _id: { $in: workspaceIds } });
    await Session.collection.deleteMany({ userId: { $in: users.map((value) => value._id) } });
    await User.collection.deleteMany({ _id: { $in: users.map((value) => value._id) } });
    await mongoose.disconnect();
  }
});
