import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import mongoose from 'mongoose';
import { models, User, Session, WorkspaceMembership, WorkspaceInvitation, Project, Task, TaskComment, Notification, EmailOutbox } from '../src/models/index.js';
import { emptyRichText } from '../src/content/rich-text.js';

const id = () => new mongoose.Types.ObjectId();
const now = new Date('2026-10-03T05:00:00Z');
const hash = 'a'.repeat(64);
const ownerId = id();
const workspaceId = id();
const projectId = id();
const taskId = id();
const content = (value) => ({ ...emptyRichText(), document: { type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text: value }] }] } });
const user = () => ({ displayName: 'Nguyễn An 👋', email: 'An@Example.com', termsAcceptance: { version: 'v1', acceptedAt: now } });
const task = () => ({ workspaceId, projectId, createdBy: ownerId, title: 'Task mới', description: content('Tiếng Việt') });

test('all 27 core models validate representative typed fixtures without DB', async () => {
  const fixtures = {
    WorkspaceLifecycleAudit: { workspaceId, actorId: ownerId, previousState: "active", state: "archived", reason: "Đóng nhóm", resourceVersion: 1 },
    TaskPurgeAudit: { workspaceId, projectId, taskId, deletedAt: now, purgedAt: now },
    TaskReopenRequest: { workspaceId, projectId, taskId, requesterId: ownerId, reason: "Thiếu kiểm thử", targetStatus: "todo" },
    ProjectLabel: { workspaceId, projectId, createdBy: ownerId, name: "Thiết kế", nameKey: "thiết kế" },
    TaskActivity: { workspaceId, projectId, taskId, actorId: ownerId, action: "created", taskVersion: 0 },
    AccessBan: { scopeType: 'workspace', scopeId: workspaceId, workspaceId, userId: ownerId, reason: 'Fixture moderation', imposedBy: ownerId, imposedAt: now },
    ModerationAction: { scopeType: 'workspace', scopeId: workspaceId, workspaceId, workspaceIds: [workspaceId], actorId: ownerId, targetUserId: ownerId, action: 'ban', reason: 'Fixture moderation', cutoff: now },
    Organization: { ownerId, name: 'Studio' }, OrganizationMembership: { organizationId: workspaceId, userId: ownerId, joinedAt: now },
    OrganizationAudit: { organizationId: workspaceId, actorId: ownerId, targetUserId: ownerId, action: 'member_role_changed', previousRole: 'member', role: 'admin' },
    OrganizationInvitation: { organizationId: workspaceId, createdBy: ownerId, email: 'member@example.com', emailCanonical: 'member@example.com', tokenHash: hash, expiresAt: now },
    ProjectGuest: { workspaceId, projectId, userId: ownerId, grantedBy: ownerId, joinedAt: now },
    ProjectGuestInvitation: { workspaceId, projectId, createdBy: ownerId, type: 'LINK', tokenHash: hash, expiresAt: now },
    ProjectAccessAudit: { workspaceId, projectId, actorId: ownerId, action: 'lead_changed', targetUserId: ownerId },
    User: user(), AuthIdentity: { userId: ownerId, provider: 'google', providerSubject: 'google-sub', lastLoginAt: now },
    Session: { userId: ownerId, refreshTokenHash: hash, expiresAt: now, lastSeenAt: now },
    AuthToken: { userId: ownerId, purpose: 'verify_email', tokenHash: hash, expiresAt: now },
    AuthChallenge: { purpose: 'google_login', tokenHash: hash, expiresAt: now },
    Workspace: { ownerId, name: 'Nhóm' }, WorkspaceMembership: { workspaceId, userId: ownerId, joinedAt: now },
    WorkspaceInvitation: { workspaceId, createdBy: ownerId, type: 'EMAIL', email: 'member@example.com', tokenHash: hash, expiresAt: now },
    Project: { workspaceId, createdBy: ownerId, name: 'Dự án' }, Task: task(),
    TaskComment: { workspaceId, taskId, authorId: ownerId, content: content('Bình luận') },
    Notification: { workspaceId, taskId, recipientId: ownerId, eventId: 'event-1', category: 'work', changes: ['assignment'] },
    EmailOutbox: { userId: ownerId, workspaceId, taskId, eventId: 'event-1', recipientKey: 'user:1', category: 'work', templateKey: 'task_changed', eventTypes: ['assignment'], nextAttemptAt: now },
  };
  assert.equal(Object.keys(models).length, 27);
  for (const [name, fixture] of Object.entries(fixtures)) await new models[name](fixture).validate();
});
test('Google-only account allowed; defaults match approved email preferences; no email auto-link', async () => {
  const document = new User(user());
  await document.validate();
  assert.equal(document.passwordHash, null);
  assert.equal(document.emailCanonical, 'an@example.com');
  assert.deepEqual(document.emailPreferences.toObject(), { assignment: true, comment: false, content: false, status: false });
  assert.equal(document.avatar.source, 'initials');
  await assert.rejects(new User({ ...user(), passwordHash: 'plaintext' }).validate());
  await assert.rejects(new User({ ...user(), termsAcceptance: undefined }).validate());
  await assert.rejects(new User({ ...user(), avatar: { source: 'google', googlePictureUrl: 'javascript:evil' } }).validate());
  await assert.rejects(new Session({ userId: ownerId, refreshTokenHash: 'raw-token', expiresAt: now, lastSeenAt: now }).validate());
});
test('schema rejects unknown/server-unmodelled fields and invalid enums/integer/IDs', async () => {
  assert.throws(() => new Task({ ...task(), attachments: [] }), /strict/u);
  assert.throws(() => new WorkspaceMembership({ workspaceId, userId: ownerId, role: 'owner' }), /strict/u);
  await assert.rejects(new Task({ ...task(), status: 'unexpected' }).validate());
  await assert.rejects(new Task({ ...task(), version: 0.5 }).validate());
  await assert.rejects(new Task({ ...task(), projectId: 'invalid' }).validate());
});
test('membership lifecycle clears overrides, validates inactive metadata, defaults to inheritance', async () => {
  const member = new WorkspaceMembership({ workspaceId, userId: ownerId, joinedAt: now });
  await member.validate();
  assert.deepEqual(member.emailOverrides.toObject(), { assignment: 'inherit', comment: 'inherit', content: 'inherit', status: 'inherit' });
  member.state = 'inactive';
  await assert.rejects(member.validate());
  member.leftAt = now; member.exitReason = 'removed'; member.emailOverrides.assignment = 'on';
  await assert.rejects(member.validate());
  member.emailOverrides.assignment = 'inherit';
  await member.validate();
});
test('invitation/archive/delete metadata agrees with entity state', async () => {
  const invite = { workspaceId, createdBy: ownerId, type: 'LINK', tokenHash: hash, expiresAt: now };
  await new WorkspaceInvitation(invite).validate();
  await assert.rejects(new WorkspaceInvitation({ ...invite, email: 'a@example.com' }).validate());
  await assert.rejects(new Project({ workspaceId, createdBy: ownerId, name: 'P', state: 'archived' }).validate());
  await assert.rejects(new Task({ ...task(), deletedAt: now }).validate());
});
test('server derives search text; accepts past minute deadline; rejects seconds and blank comments', async () => {
  const document = new Task({ ...task(), searchText: 'forged', dueAt: '2020-01-01T12:30:00Z' });
  await document.validate();
  assert.equal(document.searchText, 'task mới\ntiếng việt');
  assert.equal(document.version, 0);
  assert.equal(document.get('__v'), undefined);
  await assert.rejects(new Task({ ...task(), dueAt: '2020-01-01T12:30:01Z' }).validate());
  await assert.rejects(new TaskComment({ workspaceId, taskId, authorId: ownerId, content: emptyRichText() }).validate());
});
test('serialization strips selected secrets even if explicitly loaded; lean requires DTO', async () => {
  const document = new User({ ...user(), passwordHash: '$argon2id$fixture', authVersion: 5, authMutationRevision: 9 });
  await document.validate();
  const publicValue = document.toJSON();
  for (const key of ['passwordHash', 'emailCanonical', 'authVersion', 'authMutationRevision']) assert.equal(Object.hasOwn(publicValue, key), false);
  const session = new Session({ userId: ownerId, refreshTokenHash: hash, expiresAt: now, lastSeenAt: now });
  assert.equal(Object.hasOwn(session.toJSON(), 'refreshTokenHash'), false);
  const notification = new Notification({ workspaceId, taskId, recipientId: ownerId, eventId: 'e', category: 'work', payload: { taskTitle: 'secret' } });
  assert.equal(Object.hasOwn(notification.toJSON(), 'payload'), false);
});
test('bounded event payload and lease state prevent arbitrary content/corrupt job state', async () => {
  const data = { userId: ownerId, workspaceId, taskId, eventId: 'e', recipientKey: 'u', category: 'work', templateKey: 'task', eventTypes: ['assignment'], nextAttemptAt: now };
  await assert.rejects(new EmailOutbox({ ...data, payload: { rawToken: 'secret' } }).validate(), (error) => error.errors.payload.reason.name === 'StrictModeError');
  await assert.rejects(new EmailOutbox({ ...data, eventTypes: ['assignment', 'assignment'] }).validate());
  await assert.rejects(new EmailOutbox({ ...data, state: 'processing' }).validate());
  await assert.rejects(new EmailOutbox({ ...data, state: 'sent' }).validate());
  await new EmailOutbox({ ...data, state: 'processing', leaseUntil: now, leaseToken: 'worker-token' }).validate();
});
test('query/bulk writes fail closed until scoped repositories and transactions are implemented', async () => {
  await assert.rejects(Task.updateOne({ _id: taskId }, { $set: { description: { format: 'html' } } }), /DIRECT_QUERY_WRITE_DISABLED/u);
  await assert.rejects(Task.deleteMany({}), /DIRECT_QUERY_WRITE_DISABLED/u);
  await assert.rejects(Task.insertMany([task()]), /DIRECT_BULK_WRITE_DISABLED/u);
  await assert.rejects(Task.bulkWrite([{ deleteMany: { filter: {} } }]), /DIRECT_BULK_WRITE_DISABLED/u);
});
test('index names/keys, field references and version settings match reviewed design (not a live uniqueness test)', () => {
  const layout = JSON.parse(readFileSync(new URL('../../docs/sds/DATABASE-LAYOUT-v0.2.json', import.meta.url)));
  for (const model of Object.values(models)) {
    const plan = layout.coreCollections.find((entry) => entry.name === model.collection.name);
    const indexes = [...plan.indexes, ...(plan.name === 'sessions' ? plan.variants.find((variant) => variant.mode === 'jwt-refresh').indexes : [])];
    assert.equal(model.schema.indexes().length, indexes.length);
    for (const index of indexes) {
      const actual = model.schema.indexes().find(([, options]) => options.name === index.name);
      assert.deepEqual(actual[0], index.keys);
      assert.equal(Boolean(actual[1].unique), Boolean(index.unique));
      assert.deepEqual(actual[1].partialFilterExpression, index.partialFilter);
    }
    for (const [field, target] of Object.entries(plan.references)) {
      const targetModel = Object.values(models).find((entry) => entry.collection.name === target);
      assert.equal(model.schema.path(field).options.ref, targetModel.modelName);
    }
    assert.equal(model.schema.options.versionKey, Object.hasOwn(plan.fields, 'version') ? 'version' : false);
    assert.equal(model.schema.options.autoIndex, false);
  }
});
