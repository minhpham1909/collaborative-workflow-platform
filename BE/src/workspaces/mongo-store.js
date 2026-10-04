import mongoose from 'mongoose';
import { randomBytes, randomUUID } from 'node:crypto';
import { User, Session, Workspace, WorkspaceMembership, WorkspaceInvitation, Project, Task, EmailOutbox } from '../models/index.js';
import { AuthError } from '../auth/errors.js';
import { tokenHash } from '../auth/tokens.js';
import { createDeliveryCrypto } from '../auth/delivery-crypto.js';
import { sameId, workspaceResponse, invitationResponse, invitationState, paged } from './response.js';

const id = (value) => new mongoose.Types.ObjectId(value);
const inherited = () => ({ assignment: 'inherit', comment: 'inherit', content: 'inherit', status: 'inherit' });
const unavailable = () => { throw new AuthError('WORKSPACE_UNAVAILABLE', 404); };
const conflict = () => { throw new AuthError('VERSION_CONFLICT', 409); };
function mongoAfter(after) {
  if (!after.$or) return after;
  return { $or: after.$or.map((part) => part._id ? { ...part, _id: { $lt: id(part._id.$lt) } } : part) };
}
export function createMongoWorkspaceStore({ config, now = () => new Date() }) {
  const crypto = createDeliveryCrypto(config.mailKeyHex);
  async function actor(claims, tx) {
    const user = await User.collection.findOneAndUpdate({ _id: id(claims.sub) }, { $inc: { authMutationRevision: 1 } }, { session: tx, returnDocument: 'after' });
    if (!user || user.authVersion !== claims.av || !await Session.collection.findOne({ _id: id(claims.sid), userId: user._id, authVersionAtIssue: claims.av, revokedAt: null, expiresAt: { $gt: now() } }, { session: tx })) throw new AuthError('UNAUTHENTICATED');
    if (!user.emailVerifiedAt) throw new AuthError('EMAIL_VERIFICATION_REQUIRED', 403);
    return user;
  }
  async function guard(workspaceId, tx) {
    const workspace = await Workspace.collection.findOneAndUpdate({ _id: id(workspaceId) }, { $inc: { mutationRevision: 1 } }, { session: tx, returnDocument: 'after' });
    if (!workspace) unavailable(); return workspace;
  }
  async function scope(user, workspaceId, tx, owner = false) {
    const workspace = await guard(workspaceId, tx);
    const membership = await WorkspaceMembership.collection.findOne({ workspaceId: workspace._id, userId: user._id, state: 'active' }, { session: tx });
    if (!membership) unavailable();
    if (owner && !sameId(workspace.ownerId, user._id)) throw new AuthError('OWNER_REQUIRED', 403);
    return { workspace, membership };
  }
  const run = (claims, operation) => mongoose.connection.transaction(async (tx) => operation(await actor(claims, tx), tx));
  async function invitation(workspaceId, invitationId, tx) {
    const value = await WorkspaceInvitation.collection.findOne({ _id: id(invitationId), workspaceId }, { session: tx });
    if (!value) throw new AuthError('INVITATION_UNAVAILABLE', 404); return value;
  }
  const mailJob = (invitationId, tx) => EmailOutbox.collection.findOne({ invitationId, category: 'invitation' }, { session: tx });
  async function endMembership(workspace, membership, reason, tx) {
    const time = now();
    await WorkspaceMembership.collection.updateOne({ _id: membership._id, version: membership.version }, { $set: { state: 'inactive', leftAt: time, exitReason: reason, emailOverrides: inherited(), updatedAt: time }, $inc: { version: 1 } }, { session: tx });
    await Task.collection.updateMany({ workspaceId: workspace._id, assigneeId: membership.userId, deletedAt: null, status: { $ne: 'done' } }, { $set: { assigneeId: null, updatedAt: time }, $inc: { version: 1 } }, { session: tx });
  }
  async function acceptInvitation(user, tx, lookup) {
      let value = await WorkspaceInvitation.collection.findOne({ ...lookup }, { session: tx });
      if (!value) throw new AuthError('INVITATION_UNAVAILABLE', 404);
      const workspace = await guard(String(value.workspaceId), tx);
      // Re-read after the guard so accept/revoke/transfer serialize on the Workspace.
      value = await WorkspaceInvitation.collection.findOne({ _id: value._id }, { session: tx });
      if (value.revokedAt || value.expiresAt <= now()) throw new AuthError('INVITATION_UNAVAILABLE', 404);
      if (value.type === 'EMAIL' && value.emailCanonical !== user.emailCanonical) throw new AuthError('INVITATION_EMAIL_MISMATCH', 403);
      let membership = await WorkspaceMembership.collection.findOne({ workspaceId: workspace._id, userId: user._id }, { session: tx });
      if (value.acceptedAt && !(membership?.state === 'active' && sameId(value.acceptedBy, user._id))) throw new AuthError('INVITATION_UNAVAILABLE', 404);
      const existing = membership?.state === 'active';
      if (!existing) {
        if (membership) membership = await WorkspaceMembership.collection.findOneAndUpdate({ _id: membership._id }, { $set: { state: 'active', joinedAt: now(), leftAt: null, exitReason: null, emailOverrides: inherited(), updatedAt: now() }, $inc: { membershipGeneration: 1, version: 1 } }, { session: tx, returnDocument: 'after' });
        else { const document = new WorkspaceMembership({ workspaceId: workspace._id, userId: user._id, joinedAt: now() }); await document.save({ session: tx }); membership = document.toObject(); }
      }
      if (value.type === 'EMAIL' && !value.acceptedAt) await WorkspaceInvitation.collection.updateOne({ _id: value._id }, { $set: { acceptedAt: now(), acceptedBy: user._id, updatedAt: now() }, $inc: { version: 1 } }, { session: tx });
      return { code: existing ? 'ALREADY_MEMBER' : 'WORKSPACE_JOINED', workspace: workspaceResponse(workspace, membership) };
  }
  return {
    list: (claims, page) => run(claims, async (user, tx) => {
      const records = await Workspace.collection.aggregate([
        { $match: { $and: [mongoAfter(page.after), ...(page.filters ?? [])] } },
        { $lookup: { from: 'workspace_memberships', let: { workspace: '$_id' }, pipeline: [{ $match: { userId: user._id, state: 'active', $expr: { $eq: ['$workspaceId', '$$workspace'] } } }], as: 'membership' } },
        { $unwind: '$membership' }, { $sort: { createdAt: -1, _id: -1 } }, { $limit: page.limit + 1 },
      ], { session: tx }).toArray();
      const ids = records.slice(0, page.limit).map(value => value._id);
      const members = await WorkspaceMembership.collection.aggregate([{ $match: { workspaceId: { $in: ids }, state: 'active' } }, { $group: { _id: '$workspaceId', count: { $sum: 1 } } }], { session: tx }).toArray();
      const projects = await Project.collection.aggregate([{ $match: { workspaceId: { $in: ids }, state: 'active' } }, { $group: { _id: '$workspaceId', count: { $sum: 1 } } }], { session: tx }).toArray();
      return paged(records, page.limit, (value) => ({ ...workspaceResponse(value, value.membership), memberCount: members.find(row => sameId(row._id, value._id))?.count ?? 0, activeProjectCount: projects.find(row => sameId(row._id, value._id))?.count ?? 0 }));
    }),
    create: (claims, fields) => run(claims, async (user, tx) => {
      const workspace = new Workspace({ ...fields, ownerId: user._id }); await workspace.save({ session: tx });
      const membership = new WorkspaceMembership({ workspaceId: workspace._id, userId: user._id, joinedAt: now() }); await membership.save({ session: tx });
      return { workspace: workspaceResponse(workspace.toObject(), membership.toObject()) };
    }),
    get: (claims, workspaceId) => run(claims, async (user, tx) => {
      const { workspace, membership } = await scope(user, workspaceId, tx); return { workspace: workspaceResponse(workspace, membership) };
    }),
    update: (claims, workspaceId, input) => run(claims, async (user, tx) => {
      const { workspace, membership } = await scope(user, workspaceId, tx, true);
      if (workspace.version !== input.expectedVersion) conflict();
      const changes = Object.fromEntries(Object.entries(input.fields).filter(([key, value]) => JSON.stringify(workspace[key]) !== JSON.stringify(value)));
      if (Object.keys(changes).length) {
        const updated = await Workspace.collection.findOneAndUpdate({ _id: workspace._id, version: workspace.version }, { $set: { ...changes, updatedAt: now() }, $inc: { version: 1 } }, { session: tx, returnDocument: 'after' });
        if (!updated) conflict(); return { workspace: workspaceResponse(updated, membership) };
      }
      return { workspace: workspaceResponse(workspace, membership) };
    }),
    members: (claims, workspaceId, page) => run(claims, async (user, tx) => {
      const { workspace } = await scope(user, workspaceId, tx);
      const records = await WorkspaceMembership.collection.aggregate([
        { $match: { workspaceId: workspace._id, state: 'active', $and: [mongoAfter(page.after), ...page.filters] } },
        { $lookup: { from: 'users', localField: 'userId', foreignField: '_id', pipeline: [{ $project: { displayName: 1 } }], as: 'identity' } },
        ...(page.patterns.length ? [{ $match: { $and: page.patterns.map(pattern => ({ 'identity.displayName': { $regex: pattern, $options: 'i' } })) } }] : []),
        { $sort: { joinedAt: -1, _id: -1 } }, { $limit: page.limit + 1 },
      ], { session: tx }).toArray();
      const users = await User.collection.find({ _id: { $in: records.map((value) => value.userId) } }, { session: tx, projection: { displayName: 1, avatar: 1 } }).toArray();
      return paged(records, page.limit, (membership) => {
        const member = users.find((value) => sameId(value._id, membership.userId));
        return { userId: String(membership.userId), displayName: member?.displayName ?? 'Unavailable User', avatar: { source: member?.avatar.source ?? 'initials', googlePictureUrl: member?.avatar.googlePictureUrl ?? null }, role: sameId(workspace.ownerId, membership.userId) ? 'owner' : 'member', version: membership.version, joinedAt: membership.joinedAt };
      }, 'joinedAt');
    }),
    leave: (claims, workspaceId, expectedVersion) => run(claims, async (user, tx) => {
      const workspace = await guard(workspaceId, tx);
      const membership = await WorkspaceMembership.collection.findOne({ workspaceId: workspace._id, userId: user._id }, { session: tx });
      if (!membership) unavailable();
      if (sameId(workspace.ownerId, user._id)) throw new AuthError('TRANSFER_REQUIRED', 409);
      if (membership.state === 'inactive') return { code: 'ALREADY_LEFT' };
      if (membership.version !== expectedVersion) conflict();
      await endMembership(workspace, membership, 'left', tx); return { code: 'WORKSPACE_LEFT' };
    }),
    remove: (claims, workspaceId, memberId, expectedVersion) => run(claims, async (user, tx) => {
      const { workspace } = await scope(user, workspaceId, tx, true);
      if (sameId(workspace.ownerId, memberId)) throw new AuthError('CANNOT_REMOVE_OWNER', 409);
      const membership = await WorkspaceMembership.collection.findOne({ workspaceId: workspace._id, userId: id(memberId) }, { session: tx });
      if (!membership) unavailable();
      if (membership.state === 'inactive') return { code: 'MEMBER_ALREADY_INACTIVE' };
      if (membership.version !== expectedVersion) conflict();
      await endMembership(workspace, membership, 'removed', tx); return { code: 'MEMBER_REMOVED' };
    }),
    transfer: (claims, workspaceId, input) => run(claims, async (user, tx) => {
      const { workspace, membership } = await scope(user, workspaceId, tx, true);
      if (workspace.version !== input.expectedVersion) conflict();
      if (sameId(user._id, input.memberId) || !await WorkspaceMembership.collection.findOne({ workspaceId: workspace._id, userId: id(input.memberId), state: 'active' }, { session: tx })) throw new AuthError('TRANSFER_TARGET_INVALID', 409);
      const updated = await Workspace.collection.findOneAndUpdate({ _id: workspace._id, version: workspace.version, ownerId: user._id }, { $set: { ownerId: id(input.memberId), updatedAt: now() }, $inc: { version: 1 } }, { session: tx, returnDocument: 'after' });
      if (!updated) conflict(); return { workspace: workspaceResponse(updated, membership) };
    }),
    overrides: (claims, workspaceId, input) => run(claims, async (user, tx) => {
      const { membership } = await scope(user, workspaceId, tx);
      if (membership.version !== input.expectedVersion) conflict();
      const changes = Object.fromEntries(Object.entries(input.overrides).filter(([key, value]) => membership.emailOverrides[key] !== value).map(([key, value]) => [`emailOverrides.${key}`, value]));
      if (!Object.keys(changes).length) return { emailOverrides: membership.emailOverrides, version: membership.version };
      const updated = await WorkspaceMembership.collection.findOneAndUpdate({ _id: membership._id, version: membership.version }, { $set: { ...changes, updatedAt: now() }, $inc: { version: 1 } }, { session: tx, returnDocument: 'after' });
      if (!updated) conflict(); return { emailOverrides: updated.emailOverrides, version: updated.version };
    }),
    invitations: (claims, workspaceId, page) => run(claims, async (user, tx) => {
      const { workspace } = await scope(user, workspaceId, tx, true);
      const time = now();
      const states = { revoked: { revokedAt: { $ne: null } }, accepted: { revokedAt: null, acceptedAt: { $ne: null } }, expired: { revokedAt: null, acceptedAt: null, expiresAt: { $lte: time } }, active: { revokedAt: null, acceptedAt: null, expiresAt: { $gt: time } } };
      const records = await WorkspaceInvitation.collection.find({ workspaceId: workspace._id, $and: [mongoAfter(page.after), ...page.filters, ...(page.type !== 'all' ? [{ type: page.type }] : []), ...(page.state !== 'all' ? [states[page.state]] : []), ...page.patterns.map(pattern => ({ email: { $regex: pattern, $options: 'i' } }))] }, { session: tx }).sort({ createdAt: -1, _id: -1 }).limit(page.limit + 1).toArray();
      const jobs = await EmailOutbox.collection.find({ invitationId: { $in: records.map((value) => value._id) }, category: 'invitation' }, { session: tx, projection: { invitationId: 1, state: 1 } }).toArray();
      return paged(records, page.limit, (value) => invitationResponse(value, time, jobs.find((job) => sameId(job.invitationId, value._id))));
    }),
    invite: (claims, workspaceId, input) => run(claims, async (user, tx) => {
      const { workspace } = await scope(user, workspaceId, tx, true);
      if (input.type === 'EMAIL') {
        const recipient = await User.collection.findOne({ emailCanonical: input.email }, { session: tx });
        if (recipient && await WorkspaceMembership.collection.findOne({ workspaceId: workspace._id, userId: recipient._id, state: 'active' }, { session: tx })) return { code: 'ALREADY_MEMBER' };
      }
      const token = randomBytes(32).toString('hex');
      const value = new WorkspaceInvitation({ workspaceId: workspace._id, createdBy: user._id, type: input.type, email: input.email, tokenHash: tokenHash(token), expiresAt: new Date(now().getTime() + 7 * 24 * 60 * 60_000) });
      await value.save({ session: tx });
      let job;
      if (input.type === 'EMAIL') {
        const eventId = randomUUID();
        job = new EmailOutbox({ eventId, recipientKey: `email:${input.email}`, category: 'invitation', workspaceId: workspace._id, invitationId: value._id, templateKey: 'workspace_invitation', nextAttemptAt: now(), payload: { workspaceName: workspace.name, actorDisplayName: user.displayName }, encryptedDeliveryData: crypto.seal({ to: input.email, token, purpose: 'invitation' }, eventId) });
        await job.save({ session: tx });
      }
      return { code: 'INVITATION_CREATED', invitation: invitationResponse(value.toObject(), now(), job), ...(input.type === 'LINK' ? { url: `${config.webOrigin}/invite#token=${token}` } : {}) };
    }),
    revoke: (claims, workspaceId, invitationId, expectedVersion) => run(claims, async (user, tx) => {
      const { workspace } = await scope(user, workspaceId, tx, true);
      let value = await invitation(workspace._id, invitationId, tx);
      if (invitationState(value, now()) === 'active') {
        if (value.version !== expectedVersion) conflict();
        value = await WorkspaceInvitation.collection.findOneAndUpdate({ _id: value._id, version: value.version }, { $set: { revokedAt: now(), updatedAt: now() }, $inc: { version: 1 } }, { session: tx, returnDocument: 'after' });
        await EmailOutbox.collection.updateMany({ invitationId: value._id, state: { $in: ['pending', 'processing', 'failed'] } }, { $set: { state: 'cancelled', leaseToken: null, leaseUntil: null, encryptedDeliveryData: null, updatedAt: now() } }, { session: tx });
      }
      return { invitation: invitationResponse(value, now(), await mailJob(value._id, tx)) };
    }),
    retryMail: (claims, workspaceId, invitationId, expectedVersion) => run(claims, async (user, tx) => {
      const { workspace } = await scope(user, workspaceId, tx, true);
      const value = await invitation(workspace._id, invitationId, tx);
      if (value.version !== expectedVersion) conflict();
      if (value.type !== 'EMAIL' || invitationState(value, now()) !== 'active') throw new AuthError('INVITATION_UNAVAILABLE', 404);
      let job = await mailJob(value._id, tx);
      if (!job || !job.encryptedDeliveryData) throw new AuthError('EMAIL_RETRY_UNAVAILABLE', 409);
      if (job.state === 'failed') job = await EmailOutbox.collection.findOneAndUpdate({ _id: job._id, state: 'failed' }, { $set: { state: 'pending', attempts: 0, lastErrorCode: null, nextAttemptAt: now(), updatedAt: now() } }, { session: tx, returnDocument: 'after' });
      return { invitation: invitationResponse(value, now(), job) };
    }),
    preview: async (token) => mongoose.connection.transaction(async (tx) => {
      const value = await WorkspaceInvitation.collection.findOne({ tokenHash: tokenHash(token), revokedAt: null, acceptedAt: null, expiresAt: { $gt: now() } }, { session: tx });
      if (!value) throw new AuthError('INVITATION_UNAVAILABLE', 404);
      const workspace = await Workspace.collection.findOne({ _id: value.workspaceId }, { session: tx });
      if (!workspace) throw new AuthError('INVITATION_UNAVAILABLE', 404);
      const inviter = await User.collection.findOne({ _id: value.createdBy }, { session: tx, projection: { displayName: 1 } });
      return { preview: { workspaceName: workspace.name, inviterDisplayName: inviter?.displayName ?? 'Unavailable User', type: value.type, expiresAt: value.expiresAt } };
    }),
    accept: (claims, token) => run(claims, (user, tx) => acceptInvitation(user, tx, { tokenHash: tokenHash(token) })),
    acceptById: (claims, invitationId) => run(claims, (user, tx) => acceptInvitation(user, tx, { _id: id(invitationId), type: 'EMAIL', emailCanonical: user.emailCanonical })),
  };
}
