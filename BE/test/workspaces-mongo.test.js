import { test } from 'node:test';
import assert from 'node:assert/strict';
import { randomBytes } from 'node:crypto';
import { once } from 'node:events';
import mongoose from 'mongoose';
import { connectDatabase } from '../src/database.js';
import { models, User, Session, Workspace, WorkspaceMembership, WorkspaceInvitation, Project, Task, EmailOutbox, Notification } from '../src/models/index.js';
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
    for (const model of [Notification, EmailOutbox, Task, Project, WorkspaceInvitation, WorkspaceMembership]) await model.collection.deleteMany({ workspaceId: { $in: workspaceIds } });
    await Workspace.collection.deleteMany({ _id: { $in: workspaceIds } });
    await Session.collection.deleteMany({ userId: { $in: users.map((value) => value._id) } });
    await User.collection.deleteMany({ _id: { $in: users.map((value) => value._id) } });
    await mongoose.disconnect();
  }
});
