import { test } from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { once } from 'node:events';
import mongoose from 'mongoose';
import { connectDatabase } from '../src/database.js';
import { models, User, Session, Organization, OrganizationMembership, OrganizationInvitation, OrganizationAudit, Workspace, WorkspaceMembership, WorkspaceInvitation, Project, ProjectGuest, ProjectGuestInvitation, ProjectAccessAudit, Task, TaskComment, EmailOutbox, Notification, AccessBan, ModerationAction } from '../src/models/index.js';
import { createOrganizationService } from '../src/organizations/service.js';
import { createMongoOrganizationStore } from '../src/organizations/mongo-store.js';
import { createWorkspaceService } from '../src/workspaces/service.js';
import { createMongoWorkspaceStore } from '../src/workspaces/mongo-store.js';
import { createWorkService } from '../src/work/service.js';
import { createMongoWorkStore } from '../src/work/mongo-store.js';
import { createModerationService } from '../src/moderation/service.js';
import { createMongoModerationStore } from '../src/moderation/mongo-store.js';
import { runCommentCleanup } from '../src/moderation/cleanup.js';
import { createApp } from '../src/app.js';
import { testConfig } from '../test-support/auth-store.js';

test('C3 scoped Ban, hard Comment moderation and cleanup jobs on MongoDB', { skip: !process.env.TEST_MONGODB_URI, timeout: 90_000 }, async t => {
  assert.equal(new URL(process.env.TEST_MONGODB_URI).pathname.slice(1), 'workflow_auth_test');
  await connectDatabase(process.env.TEST_MONGODB_URI);
  const config = testConfig(), users = [], sessions = [], auths = [], orgIds = [], workspaceIds = [];
  let clock = new Date(), server;
  const mod = createModerationService({ store: createMongoModerationStore({ config, now: () => clock }) });
  const orgs = createOrganizationService({ store: createMongoOrganizationStore({ config }) });
  const ws = createWorkspaceService({ store: createMongoWorkspaceStore({ config }) });
  const work = createWorkService({ store: createMongoWorkStore({ config }) });
  const O = value => new mongoose.Types.ObjectId(value), uid = index => String(users[index]._id);
  const token = result => new URLSearchParams(new URL(result.url).hash.slice(1)).get('token');
  const content = text => ({ format: 'prosemirror-json', schemaVersion: 1, document: { type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text }] }] } });
  const parentVersion = async (type, scopeId) => (await (type === 'organization' ? Organization : type === 'workspace' ? Workspace : Project).collection.findOne({ _id: O(scopeId) })).version;
  const ban = async (actor, type, scopeId, target, cleanup = 'none') => {
    clock = new Date();
    const preview = await mod.preview(auths[actor], type, scopeId, { userId: uid(target), cleanup });
    return mod.ban(auths[actor], type, scopeId, { userId: uid(target), cleanup, reason: 'Fixture policy', expectedVersion: preview.expectedVersion, ...(preview.preview ? { preview: preview.preview } : {}) });
  };
  try {
    for (const model of Object.values(models)) await model.createIndexes();
    for (let i = 0; i < 7; i++) {
      const user = new User({ displayName: `Moderator ${i}`, email: `${randomUUID()}@example.com`, emailVerifiedAt: new Date(), termsAcceptance: { version: 'test', acceptedAt: new Date() } });
      await user.save(); users.push(user);
      const session = new Session({ userId: user._id, refreshTokenHash: String(i + 1).repeat(64), expiresAt: new Date(Date.now() + 86400_000), lastSeenAt: new Date(), authVersionAtIssue: 0 });
      await session.save(); sessions.push(session); auths.push({ claims: { sub: uid(i), sid: String(session._id), av: 0 } });
    }
    const org = (await orgs.create(auths[0], { name: 'Moderation Org' })).organization; orgIds.push(O(org.id));
    const first = (await orgs.createWorkspace(auths[0], org.id, { name: 'Moderation WS' })).workspace;
    const second = (await orgs.createWorkspace(auths[0], org.id, { name: 'Other WS' })).workspace; workspaceIds.push(O(first.id), O(second.id));
    for (const index of [1, 2, 3]) {
      const invite = await orgs.invite(auths[0], org.id, { email: users[index].email, workspaceId: first.id });
      await orgs.acceptInvitationById(auths[index], invite.invitation.id, {});
    }
    await orgs.role(auths[0], org.id, uid(1), { role: 'admin', expectedVersion: 0 });
    await orgs.manager(auths[0], org.id, first.id, { managerId: uid(2), expectedVersion: await parentVersion('workspace', first.id) });
    await orgs.manager(auths[0], org.id, second.id, { managerId: uid(2), expectedVersion: await parentVersion('workspace', second.id) });
    const a = (await work.createProject(auths[0], first.id, { name: 'Project A' })).project;
    const b = (await work.createProject(auths[0], first.id, { name: 'Project B' })).project;
    const c = (await work.createProject(auths[0], second.id, { name: 'Project C' })).project;
    const taskA = (await work.createTask(auths[3], a.id, { title: 'Task A', assigneeId: uid(3) })).task;
    const done = (await work.createTask(auths[0], a.id, { title: 'Done A', assigneeId: uid(3) })).task; await work.status(auths[3], done.id, { status: 'done', expectedVersion: 0 });
    const taskB = (await work.createTask(auths[0], b.id, { title: 'Task B', assigneeId: uid(3) })).task;
    const taskC = (await work.createTask(auths[0], c.id, { title: 'Task C', assigneeId: uid(2) })).task;
    const links = [];
    for (const project of [a, b, c]) { const link = await work.inviteGuest(auths[0], project.id, { type: 'LINK' }); links.push(link); await work.acceptGuestInvitation(auths[4], { token: token(link) }); }
    const spam = [];
    for (const [text, days] of [['SPAM_ONE', 1], ['SPAM_TWO', 2], ['OLD_EDITED_SPAM', 10]]) {
      const comment = (await work.createComment(auths[4], taskA.id, { content: content(text) })).comment; spam.push(comment);
      await TaskComment.collection.updateOne({ _id: O(comment.id) }, { $set: { createdAt: new Date(Date.now() - days * 86400_000), updatedAt: new Date() } });
    }
    const foreign = (await work.createComment(auths[4], taskB.id, { content: content('OTHER_PROJECT') })).comment;
    const otherAuthor = (await work.createComment(auths[0], taskA.id, { content: content('OTHER_AUTHOR') })).comment;
    const managerComment = (await work.createComment(auths[2], taskC.id, { content: content('MANAGER_HISTORY') })).comment;
    await work.state(auths[0], c.id, { state: 'archived', expectedVersion: 0 });
    await t.test('hierarchy/self protection and signed preview bind scope/count/cutoff', async () => {
      await assert.rejects(mod.preview(auths[3], 'project', a.id, { userId: uid(4) }), { code: 'OWNER_REQUIRED' });
      await assert.rejects(mod.preview(auths[2], 'workspace', first.id, { userId: uid(1) }), { code: 'ORGANIZATION_OWNER_REQUIRED' });
      await assert.rejects(mod.preview(auths[1], 'organization', org.id, { userId: uid(0) }), { code: 'CANNOT_REMOVE_OWNER' });
      await assert.rejects(mod.preview(auths[0], 'organization', org.id, { userId: uid(0) }), { code: 'CANNOT_MODERATE_SELF' });
      clock = new Date(); const preview = await mod.preview(auths[0], 'project', a.id, { userId: uid(4), cleanup: '3' });
      assert.equal(preview.matchedCount, 2);
      const input = { userId: uid(4), cleanup: '3', reason: 'Policy', expectedVersion: 0, preview: preview.preview };
      await assert.rejects(mod.ban(auths[0], 'project', b.id, input), { code: 'MODERATION_PREVIEW_INVALID' });
      await assert.rejects(mod.ban(auths[0], 'project', a.id, { ...input, preview: preview.preview + 'x' }), { code: 'MODERATION_PREVIEW_INVALID' });
      clock = new Date(clock.getTime() + 600_001);
      await assert.rejects(mod.ban(auths[0], 'project', a.id, input), { code: 'MODERATION_PREVIEW_INVALID' });
      assert.equal(await AccessBan.collection.countDocuments({ userId: users[4]._id }), 0);
    });
    await t.test('Project Guest Ban blocks read/accept/list immediately; cleanup batches keep other scopes/content', async () => {
      const result = await ban(0, 'project', a.id, 4, '3');
      assert.equal(result.action.state, 'pending'); assert.equal(result.action.matchedCount, 2);
      assert.ok(await TaskComment.collection.findOne({ _id: O(spam[0].id) }));
      await assert.rejects(work.getTask(auths[4], taskA.id), { code: 'ACCESS_BANNED' });
      await assert.rejects(work.acceptGuestInvitation(auths[4], { token: token(links[0]) }), { code: 'ACCESS_BANNED' });
      assert.ok(!(await work.shared(auths[4], { state: 'all' })).items.some(p => p.id === a.id));
      assert.ok((await work.getProject(auths[4], b.id)).project);
      const original = TaskComment.collection.deleteMany;
      try { TaskComment.collection.deleteMany = async () => { throw new Error('Sensitive failure'); }; for (let attempt = 0; attempt < 5; attempt++) assert.equal((await runCommentCleanup({ batchSize: 1 })).state, 'retry_or_failed'); }
      finally { TaskComment.collection.deleteMany = original; }
      assert.equal((await ModerationAction.collection.findOne({ _id: O(result.action.id) })).lastErrorCode, 'COMMENT_CLEANUP_FAILED');
      const failed = await ModerationAction.collection.findOne({ _id: O(result.action.id) });
      assert.equal(failed.state, 'failed'); assert.equal(failed.deletedCount, 0);
      await assert.rejects(mod.retry(auths[3], 'project', a.id, result.action.id, { expectedVersion: failed.version }), { code: 'OWNER_REQUIRED' });
      await assert.rejects(mod.retry(auths[0], 'project', a.id, result.action.id, { expectedVersion: failed.version + 1 }), { code: 'VERSION_CONFLICT' });
      await mod.retry(auths[0], 'project', a.id, result.action.id, { expectedVersion: failed.version });
      const outcomes = await Promise.all([runCommentCleanup({ batchSize: 1 }), runCommentCleanup({ batchSize: 1 })]);
      assert.ok(outcomes.some(outcome => ['pending', 'completed'].includes(outcome.state)));
      for (let i = 0; i < 5; i++) if ((await runCommentCleanup({ batchSize: 1 })).state === 'idle') break;
      const action = await ModerationAction.collection.findOne({ _id: O(result.action.id) });
      assert.equal(action.state, 'completed'); assert.equal(action.deletedCount, 2);
      assert.equal(await TaskComment.collection.countDocuments({ _id: { $in: spam.slice(0, 2).map(row => O(row.id)) } }), 0);
      for (const row of [spam[2], foreign, otherAuthor]) assert.ok(await TaskComment.collection.findOne({ _id: O(row.id) }));
      assert.ok(!JSON.stringify(await mod.actions(auths[0], 'project', a.id, {})).includes('SPAM_ONE'));
      await mod.unban(auths[0], 'project', a.id, uid(4), { reason: 'Reviewed', expectedVersion: 0 });
      await assert.rejects(work.getProject(auths[4], a.id), { code: 'RESOURCE_UNAVAILABLE' });
      await work.acceptGuestInvitation(auths[4], { token: token(links[0]) });
      assert.equal(await TaskComment.collection.countDocuments({ _id: O(spam[0].id) }), 0);
    });
    await t.test('Project Member Ban overrides Creator/Assignee/Lead without blocking other Projects', async () => {
      await work.lead(auths[0], a.id, { leadId: uid(3), expectedVersion: await parentVersion('project', a.id) });
      await ban(2, 'project', a.id, 3);
      await assert.rejects(work.getTask(auths[3], taskA.id), { code: 'ACCESS_BANNED' });
      await assert.rejects(work.updateTask(auths[3], taskA.id, { title: 'Creator bypass', expectedVersion: 0 }), { code: 'ACCESS_BANNED' });
      assert.ok((await work.getTask(auths[3], taskB.id)).task);
      assert.equal((await Project.collection.findOne({ _id: O(a.id) })).leadId, null);
      assert.equal((await Task.collection.findOne({ _id: O(taskA.id) })).assigneeId, null);
      assert.equal((await Task.collection.findOne({ _id: O(done.id) })).assigneeId.toString(), uid(3));
      assert.ok(!(await work.projects(auths[3], first.id, { state: 'all' })).items.some(p => p.id === a.id));
      assert.ok(!(await work.mine(auths[3], { state: 'all', status: 'all' })).items.some(task => task.projectId === a.id));
      assert.equal((await ws.list(auths[3], {})).items.find(w => w.id === first.id).activeProjectCount, 1);
      await assert.rejects(work.updateTask(auths[0], taskA.id, { assigneeId: uid(3), expectedVersion: 1 }), { code: 'ASSIGNEE_NOT_MEMBER' });
    });
    await t.test('Workspace Manager Ban transfers responsibility, revokes issued links and keeps Org roles/other WS', async () => {
      const maliciousLink = await work.inviteGuest(auths[2], b.id, { type: 'LINK' });
      const result = await ban(1, 'workspace', first.id, 2);
      assert.equal(result.action.cleanup, 'none');
      assert.equal((await Workspace.collection.findOne({ _id: O(first.id) })).managerId.toString(), uid(1));
      assert.equal((await OrganizationMembership.collection.findOne({ organizationId: O(org.id), userId: users[1]._id })).role, 'admin');
      await assert.rejects(ws.get(auths[2], first.id), { code: 'ACCESS_BANNED' });
      assert.ok((await ws.get(auths[2], second.id)).workspace);
      await assert.rejects(work.acceptGuestInvitation(auths[6], { token: token(maliciousLink) }), { code: 'INVITATION_UNAVAILABLE' });
      assert.ok(await TaskComment.collection.findOne({ _id: O(foreign.id) }));
    });
    await t.test('Organization Ban revokes descendants, archived assignments and Manager slots, not other organizations', async () => {
      const otherOrg = (await orgs.create(auths[2], { name: 'Independent Org' })).organization; orgIds.push(O(otherOrg.id));
      await ban(0, 'organization', org.id, 2);
      await assert.rejects(orgs.get(auths[2], org.id), { code: 'ACCESS_BANNED' });
      await assert.rejects(work.acceptGuestInvitation(auths[2], { token: token(links[2]) }), { code: 'ACCESS_BANNED' });
      assert.equal((await Workspace.collection.findOne({ _id: O(second.id) })).managerId.toString(), uid(0));
      assert.equal((await Task.collection.findOne({ _id: O(taskC.id) })).assigneeId, null);
      assert.equal((await orgs.get(auths[2], otherOrg.id)).organization.role, 'owner');
      assert.ok(!(await orgs.list(auths[2], {})).items.some(value => value.id === org.id));
      assert.ok(await TaskComment.collection.findOne({ _id: O(managerComment.id) }));
      const profile = (await work.profile(auths[4], c.id, uid(2))).profile;
      assert.equal(profile.status, 'left_organization'); assert.ok(!('blocked' in profile)); assert.ok(!JSON.stringify(profile).includes('@example.com'));
      await assert.rejects(work.profile(auths[4], c.id, uid(5)), { code: 'RESOURCE_UNAVAILABLE' });
      await mod.unban(auths[0], 'organization', org.id, uid(2), { reason: 'Account recovered', expectedVersion: 0 });
      await assert.rejects(orgs.get(auths[2], org.id), { code: 'ORGANIZATION_UNAVAILABLE' });
      const invite = await orgs.invite(auths[0], org.id, { email: users[2].email, workspaceId: second.id });
      await orgs.acceptInvitationById(auths[2], invite.invitation.id, {});
      await assert.rejects(ws.get(auths[2], first.id), { code: 'ACCESS_BANNED' });
    });
    await t.test('Kick allows valid rejoin; Ban requires unban and never restores membership automatically', async () => {
      const local = (await ws.create(auths[0], { name: 'Independent moderation' })).workspace; workspaceIds.push(O(local.id));
      const link = await ws.invite(auths[0], local.id, { type: 'LINK' });
      await ws.accept(auths[6], { token: token(link) });
      let member = await WorkspaceMembership.collection.findOne({ workspaceId: O(local.id), userId: users[6]._id });
      await ws.remove(auths[0], local.id, uid(6), { expectedVersion: member.version });
      await ws.accept(auths[6], { token: token(link) });
      await ban(0, 'workspace', local.id, 6);
      await assert.rejects(ws.accept(auths[6], { token: token(link) }), { code: 'ACCESS_BANNED' });
      await mod.unban(auths[0], 'workspace', local.id, uid(6), { reason: 'Reviewed', expectedVersion: 0 });
      await assert.rejects(ws.get(auths[6], local.id), { code: 'WORKSPACE_UNAVAILABLE' });
      await ws.accept(auths[6], { token: token(link) });
      assert.equal((await ws.get(auths[6], local.id)).workspace.role, 'member');
    });
    await t.test('hard delete is author-only for edits, moderator with reason even Archived, audit never stores body', async () => {
      const own = (await work.createComment(auths[4], taskB.id, { content: content('AUTHOR_DELETE') })).comment;
      await work.deleteComment(auths[4], taskB.id, own.id, { expectedVersion: 0 });
      assert.equal(await TaskComment.collection.countDocuments({ _id: O(own.id) }), 0);
      const spam = (await work.createComment(auths[4], taskB.id, { content: content('MOD_SPAM_PRIVATE') })).comment;
      await assert.rejects(work.updateComment(auths[0], taskB.id, spam.id, { expectedVersion: 0, content: content('Override') }), { code: 'COMMENT_AUTHOR_REQUIRED' });
      await work.state(auths[0], b.id, { state: 'archived', expectedVersion: await parentVersion('project', b.id) });
      await assert.rejects(work.deleteComment(auths[4], taskB.id, spam.id, { expectedVersion: 0 }), { code: 'PROJECT_ARCHIVED' });
      await assert.rejects(work.deleteComment(auths[0], taskB.id, spam.id, { expectedVersion: 0 }), { code: 'MODERATION_REASON_REQUIRED' });
      const dto = (await work.comments(auths[0], taskB.id, {})).items.find(row => row.id === spam.id); assert.equal(dto.permissions.delete, true); assert.equal(dto.permissions.edit, false);
      await work.deleteComment(auths[0], taskB.id, spam.id, { expectedVersion: 0, reason: 'Spam violation' });
      assert.equal(await TaskComment.collection.countDocuments({ _id: O(spam.id) }), 0);
      assert.ok(!JSON.stringify(await mod.actions(auths[0], 'project', b.id, {})).includes('MOD_SPAM_PRIVATE'));
    });
    await t.test('HTTP auth/Origin/strict DTO and moderator scope are enforced', async () => {
      const authService = { authenticate: async () => auths[0] };
      server = createApp({ authService, authConfig: config, moderationService: mod }).listen(0, '127.0.0.1'); await once(server, 'listening');
      const base = `http://127.0.0.1:${server.address().port}/moderation/project/${a.id}`;
      const headers = { authorization: 'Bearer fixture', origin: config.webOrigin, 'content-type': 'application/json' };
      assert.equal((await fetch(`${base}/actions`, { headers })).status, 200);
      assert.equal((await fetch(`${base}/bans`, { headers })).status, 200);
      assert.equal((await fetch(`${base}/preview`, { method: 'POST', headers, body: JSON.stringify({ userId: uid(4), cleanup: 'all', scopeId: b.id }) })).status, 400);
      assert.equal((await fetch(`${base}/preview`, { method: 'POST', headers: { ...headers, origin: 'http://evil.example' }, body: JSON.stringify({ userId: uid(4) }) })).status, 403);
      assert.equal((await fetch(`${base}/actions`)).status, 401);
    });
  } finally {
    if (server) await new Promise(resolve => server.close(resolve));
    for (const model of [AccessBan, ModerationAction]) await model.collection.deleteMany({ $or: [{ organizationId: { $in: orgIds } }, { workspaceId: { $in: workspaceIds } }] });
    for (const model of [EmailOutbox, Notification]) await model.collection.deleteMany({ $or: [{ organizationId: { $in: orgIds } }, { workspaceId: { $in: workspaceIds } }] });
    for (const model of [TaskComment, Task, ProjectGuest, ProjectGuestInvitation, ProjectAccessAudit, Project, WorkspaceMembership, WorkspaceInvitation]) await model.collection.deleteMany({ workspaceId: { $in: workspaceIds } });
    await Workspace.collection.deleteMany({ _id: { $in: workspaceIds } });
    for (const model of [OrganizationMembership, OrganizationInvitation, OrganizationAudit]) await model.collection.deleteMany({ organizationId: { $in: orgIds } });
    await Organization.collection.deleteMany({ _id: { $in: orgIds } });
    await Session.collection.deleteMany({ _id: { $in: sessions.map(row => row._id) } });
    await User.collection.deleteMany({ _id: { $in: users.map(row => row._id) } });
    await mongoose.disconnect();
  }
});
