import mongoose from 'mongoose';
import { User, Session, Notification, Workspace, WorkspaceMembership, WorkspaceInvitation, Task, Project } from '../models/index.js';
import { AuthError } from '../auth/errors.js';
import { paged } from '../workspaces/response.js';

const id = (value) => new mongoose.Types.ObjectId(value);
const unavailable = () => { throw new AuthError('NOTIFICATION_UNAVAILABLE', 404); };
export function createMongoNotificationsStore({ cutoff, now = () => new Date() }) {
  const run = (claims, operation) => mongoose.connection.transaction(async (tx) => {
    const user = await User.collection.findOneAndUpdate({ _id: id(claims.sub) }, { $inc: { authMutationRevision: 1 } }, { session: tx, returnDocument: 'after' });
    if (!user || user.authVersion !== claims.av || !await Session.collection.findOne({ _id: id(claims.sid), userId: user._id, authVersionAtIssue: claims.av, revokedAt: null, expiresAt: { $gt: now() } }, { session: tx })) throw new AuthError('UNAUTHENTICATED');
    return operation(user, tx);
  });
  async function response(value, user, tx) {
    const base = { id: String(value._id), category: value.category, createdAt: value.createdAt, readAt: value.readAt, available: false, code: 'TARGET_UNAVAILABLE', changes: [], payload: null, target: null };
    const workspace = await Workspace.collection.findOne({ _id: value.workspaceId }, { session: tx });
    if (!workspace) return base;
    if (value.category === 'work') {
      if (!user.emailVerifiedAt || !await WorkspaceMembership.collection.findOne({ workspaceId: workspace._id, userId: user._id, state: 'active' }, { session: tx })) return base;
      const task = await Task.collection.findOne({ _id: value.taskId, workspaceId: workspace._id, deletedAt: null }, { session: tx });
      if (!task || !await Project.collection.findOne({ _id: task.projectId, workspaceId: workspace._id }, { session: tx })) return base;
      return { ...base, available: true, code: 'WORK_NOTIFICATION', changes: value.changes, payload: { taskTitle: value.payload.taskTitle, workspaceName: value.payload.workspaceName, actorDisplayName: value.payload.actorDisplayName, previousStatus: value.payload.previousStatus, status: value.payload.status }, target: { type: 'task', taskId: String(task._id), projectId: String(task.projectId), workspaceId: String(workspace._id) } };
    }
    const invitation = await WorkspaceInvitation.collection.findOne({ _id: value.invitationId, workspaceId: workspace._id, type: 'EMAIL', emailCanonical: user.emailCanonical, revokedAt: null, acceptedAt: null, expiresAt: { $gt: now() } }, { session: tx });
    if (!invitation) return base;
    const actor = await User.collection.findOne({ _id: invitation.createdBy }, { session: tx, projection: { displayName: 1 } });
    return { ...base, available: true, code: 'WORKSPACE_INVITATION', payload: { workspaceName: workspace.name, inviterDisplayName: actor?.displayName ?? 'Unavailable User', type: 'EMAIL', expiresAt: invitation.expiresAt }, target: { type: 'invitation', invitationId: String(invitation._id) } };
  }
  return {
    list: (claims, query) => run(claims, async (user, tx) => {
      const filter = { recipientId: user._id, ...(query.category === 'all' ? {} : { category: query.category }) };
      const selection = { ...filter, ...(query.read === 'unread' ? { readAt: null } : query.read === 'read' ? { readAt: { $ne: null } } : {}) };
      const after = query.after.$or ? { $or: query.after.$or.map((part) => part._id ? { ...part, _id: { $lt: id(part._id.$lt) } } : part) } : {};
      const records = await Notification.collection.find({ ...selection, ...after }, { session: tx }).sort({ createdAt: -1, _id: -1 }).limit(query.limit + 1).toArray();
      const items = []; for (const record of records.slice(0, query.limit)) items.push(await response(record, user, tx));
      const latest = await Notification.collection.find(filter, { session: tx }).sort({ createdAt: -1, _id: -1 }).limit(1).next();
      return { ...paged(records, query.limit, (value) => value), items, total: await Notification.collection.countDocuments(selection, { session: tx }), unreadCount: await Notification.collection.countDocuments({ ...filter, readAt: null }, { session: tx }), cutoff: cutoff.seal(String(user._id), latest, query.category) };
    }),
    get: (claims, notificationId, markRead = false) => run(claims, async (user, tx) => {
      let value = await Notification.collection.findOne({ _id: id(notificationId), recipientId: user._id }, { session: tx });
      if (!value) unavailable();
      if (markRead && !value.readAt) value = await Notification.collection.findOneAndUpdate({ _id: value._id, recipientId: user._id, readAt: null }, { $set: { readAt: now() } }, { session: tx, returnDocument: 'after' });
      return { notification: await response(value, user, tx) };
    }),
    readAll: (claims, boundary) => run(claims, async (user, tx) => {
      const result = await Notification.collection.updateMany({ recipientId: user._id, readAt: null, ...(boundary.category === 'all' ? {} : { category: boundary.category }), $or: [{ createdAt: { $lt: boundary.at } }, { createdAt: boundary.at, _id: { $lte: id(boundary.id) } }] }, { $set: { readAt: now() } }, { session: tx });
      return { code: 'NOTIFICATIONS_READ', markedCount: result.modifiedCount };
    }),
  };
}
