import mongoose from "mongoose";
import {
  User,
  Session,
  Notification,
  Workspace,
  WorkspaceMembership,
  WorkspaceInvitation,
  Task,
  Project,
  Organization, OrganizationInvitation, ProjectGuestInvitation,
} from "../models/index.js";
import { AuthError } from "../auth/errors.js";
import { paged } from "../workspaces/response.js";
import { inboxQuery } from "./input.js";
import { workspaceAccess } from '../organizations/workspace-access.js';
import { projectAccess } from '../work/project-access.js';
import { assertNotBanned } from '../moderation/guard.js';

const id = (value) => new mongoose.Types.ObjectId(value);
const unavailable = () => {
  throw new AuthError("NOTIFICATION_UNAVAILABLE", 404);
};
export function createMongoNotificationsStore({
  cutoff,
  now = () => new Date(),
}) {
  const run = (claims, operation) =>
    mongoose.connection.transaction(async (tx) => {
      const user = await User.collection.findOneAndUpdate(
        { _id: id(claims.sub) },
        { $inc: { authMutationRevision: 1 } },
        { session: tx, returnDocument: "after" },
      );
      if (
        !user ||
        user.authVersion !== claims.av ||
        !(await Session.collection.findOne(
          {
            _id: id(claims.sid),
            userId: user._id,
            authVersionAtIssue: claims.av,
            revokedAt: null,
            expiresAt: { $gt: now() },
          },
          { session: tx },
        ))
      )
        throw new AuthError("UNAUTHENTICATED");
      return operation(user, tx);
    });
  async function response(value, user, tx) {
    const base = {
      id: String(value._id),
      category: value.category,
      createdAt: value.createdAt,
      readAt: value.readAt,
      available: false,
      code: "TARGET_UNAVAILABLE",
      changes: [],
      payload: null,
      target: null,
    };
    if (value.category === 'organization_invitation') {
      try { await assertNotBanned(user._id, { organizationId: value.organizationId }, tx); }
      catch (error) { if (error instanceof AuthError) return base; throw error; }
      const invitation = await OrganizationInvitation.collection.findOne({ _id: value.organizationInvitationId, organizationId: value.organizationId,
        emailCanonical: user.emailCanonical, revokedAt: null, acceptedAt: null, expiresAt: { $gt: now() } }, { session: tx });
      if (!invitation) return base;
      const organization = await Organization.collection.findOne({ _id: value.organizationId }, { session: tx });
      const workspace = invitation.workspaceId && await Workspace.collection.findOne({ _id: invitation.workspaceId, organizationId: value.organizationId }, { session: tx });
      if (!organization || (invitation.workspaceId && !workspace)) return base;
      const inviter = await User.collection.findOne({ _id: invitation.createdBy }, { session: tx, projection: { displayName: 1 } });
      return { ...base, available: true, code: 'ORGANIZATION_INVITATION',
        payload: { organizationName: organization.name, workspaceName: workspace?.name ?? null, inviterDisplayName: inviter?.displayName ?? 'Unavailable User', role: 'member', expiresAt: invitation.expiresAt },
        target: { type: 'organization_invitation', invitationId: String(invitation._id) } };
    }
    const workspace = await Workspace.collection.findOne(
      { _id: value.workspaceId },
      { session: tx },
    );
    if (!workspace) return base;
    try { await assertNotBanned(user._id, { organizationId: workspace.organizationId, workspaceId: workspace._id, projectId: value.projectId }, tx); }
    catch (error) { if (error instanceof AuthError) return base; throw error; }
    if (value.category === 'project_invitation') {
      const invitation = await ProjectGuestInvitation.collection.findOne({ _id: value.projectInvitationId, projectId: value.projectId, workspaceId: workspace._id,
        type: 'EMAIL', emailCanonical: user.emailCanonical, revokedAt: null, acceptedAt: null, expiresAt: { $gt: now() } }, { session: tx });
      const project = invitation && await Project.collection.findOne({ _id: value.projectId, workspaceId: workspace._id }, { session: tx });
      if (!project || (workspace.organizationId && !await Organization.collection.findOne({ _id: workspace.organizationId }, { session: tx }))) return base;
      const inviter = await User.collection.findOne({ _id: invitation.createdBy }, { session: tx, projection: { displayName: 1 } });
      return { ...base, available: true, code: 'PROJECT_GUEST_INVITATION',
        payload: { projectName: project.name, workspaceName: workspace.name, inviterDisplayName: inviter?.displayName ?? 'Unavailable User', role: 'guest', expiresAt: invitation.expiresAt },
        target: { type: 'project_invitation', invitationId: String(invitation._id) } };
    }
    if (value.category === 'membership') {
      if (!user.emailVerifiedAt) return base;
      try { await workspaceAccess(workspace, user._id, tx, { requireMember: true }); }
      catch (error) { if (error instanceof AuthError) return base; throw error; }
      return { ...base, available: true, code: 'WORKSPACE_MEMBER_ADDED', changes: [],
        payload: { workspaceName: value.payload.workspaceName, actorDisplayName: value.payload.actorDisplayName },
        target: { type: 'workspace', workspaceId: String(workspace._id) } };
    }
    if (value.category === "work") {
      if (!user.emailVerifiedAt) return base;
      const task = await Task.collection.findOne(
        { _id: value.taskId, workspaceId: workspace._id, deletedAt: null },
        { session: tx },
      );
      const project = task && await Project.collection.findOne({ _id: task.projectId, workspaceId: workspace._id }, { session: tx });
      if (!project) return base;
      try { await projectAccess(workspace, project, user._id, tx); }
      catch (error) { if (error instanceof AuthError) return base; throw error; }
      return {
        ...base,
        available: true,
        code: "WORK_NOTIFICATION",
        changes: value.changes,
        payload: {
          taskTitle: value.payload.taskTitle,
          workspaceName: value.payload.workspaceName,
          actorDisplayName: value.payload.actorDisplayName,
          previousStatus: value.payload.previousStatus,
          status: value.payload.status,
        },
        target: {
          type: "task",
          taskId: String(task._id),
          projectId: String(task.projectId),
          workspaceId: String(workspace._id),
        },
      };
    }
    const invitation = await WorkspaceInvitation.collection.findOne(
      {
        _id: value.invitationId,
        workspaceId: workspace._id,
        type: "EMAIL",
        emailCanonical: user.emailCanonical,
        revokedAt: null,
        acceptedAt: null,
        expiresAt: { $gt: now() },
      },
      { session: tx },
    );
    if (!invitation) return base;
    const actor = await User.collection.findOne(
      { _id: invitation.createdBy },
      { session: tx, projection: { displayName: 1 } },
    );
    return {
      ...base,
      available: true,
      code: "WORKSPACE_INVITATION",
      payload: {
        workspaceName: workspace.name,
        inviterDisplayName: actor?.displayName ?? "Unavailable User",
        type: "EMAIL",
        expiresAt: invitation.expiresAt,
      },
      target: { type: "invitation", invitationId: String(invitation._id) },
    };
  }
  const matches = (value, query) => {
    const text = value.available
      ? Object.values(value.payload ?? {})
          .filter((v) => typeof v === "string")
          .join(" ")
      : "Nội dung không còn khả dụng";
    return query.patterns.every((pattern) =>
      new RegExp(pattern, "iu").test(text),
    );
  };
  function filter(user, query) {
    return {
      recipientId: user._id,
      ...(query.category === "all" ? {} : { category: query.category }),
      ...(query.from || query.to
        ? {
            createdAt: {
              ...(query.from ? { $gte: query.from } : {}),
              ...(query.to ? { $lt: query.to } : {}),
            },
          }
        : {}),
    };
  }
  return {
    list: (claims, query) =>
      run(claims, async (user, tx) => {
        if (!query.patterns.length) {
          const scope = filter(user, query),
            selection = {
              ...scope,
              ...(query.read === "unread"
                ? { readAt: null }
                : query.read === "read"
                  ? { readAt: { $ne: null } }
                  : {}),
            };
          const after = query.after.$or
            ? {
                $or: query.after.$or.map((p) =>
                  p._id ? { ...p, _id: { $lt: id(p._id.$lt) } } : p,
                ),
              }
            : {};
          const records = await Notification.collection
            .find({ ...selection, ...after }, { session: tx })
            .sort({ createdAt: -1, _id: -1 })
            .limit(query.limit + 1)
            .toArray();
          const items = [];
          for (const record of records.slice(0, query.limit))
            items.push(await response(record, user, tx));
          const latest = await Notification.collection
            .find(scope, { session: tx })
            .sort({ createdAt: -1, _id: -1 })
            .limit(1)
            .next();
          return {
            ...paged(records, query.limit, (v) => v),
            items,
            total: await Notification.collection.countDocuments(selection, {
              session: tx,
            }),
            unreadCount: await Notification.collection.countDocuments(
              { ...scope, readAt: null },
              { session: tx },
            ),
            cutoff: cutoff.seal(
              String(user._id),
              latest,
              query.category,
              query.filters,
            ),
          };
        }
        const cursor = query.after.$or;
        const boundary = cursor && {
          at: cursor[0].createdAt.$lt,
          id: cursor[1]._id.$lt,
        };
        const scan = Notification.collection
          .find(filter(user, query), { session: tx })
          .sort({ createdAt: -1, _id: -1 });
        const tail = [];
        let total = 0,
          unreadCount = 0,
          latest = null;
        for await (const record of scan) {
          const dto = await response(record, user, tx);
          if (!matches(dto, query)) continue;
          latest ??= record;
          if (!record.readAt) unreadCount++;
          if (
            (query.read === "unread" && record.readAt) ||
            (query.read === "read" && !record.readAt)
          )
            continue;
          total++;
          if (
            boundary &&
            !(
              record.createdAt < boundary.at ||
              (record.createdAt.getTime() === boundary.at.getTime() &&
                String(record._id) < boundary.id)
            )
          )
            continue;
          if (tail.length < query.limit + 1) tail.push({ record, dto });
        }
        const page = paged(
          tail.slice(0, query.limit + 1).map((v) => v.record),
          query.limit,
          (v) => v,
        );
        return {
          ...page,
          items: tail.slice(0, query.limit).map((v) => v.dto),
          total,
          unreadCount,
          cutoff: cutoff.seal(
            String(user._id),
            latest,
            query.category,
            query.filters,
          ),
        };
      }),
    get: (claims, notificationId, markRead = false) =>
      run(claims, async (user, tx) => {
        let value = await Notification.collection.findOne(
          { _id: id(notificationId), recipientId: user._id },
          { session: tx },
        );
        if (!value) unavailable();
        if (markRead && !value.readAt)
          value = await Notification.collection.findOneAndUpdate(
            { _id: value._id, recipientId: user._id, readAt: null },
            { $set: { readAt: now() } },
            { session: tx, returnDocument: "after" },
          );
        return { notification: await response(value, user, tx) };
      }),
    readAll: (claims, boundary) =>
      run(claims, async (user, tx) => {
        const query = inboxQuery({
          ...boundary.filters,
          category: boundary.category,
        });
        if (!query.patterns.length) {
          const result = await Notification.collection.updateMany(
            {
              ...filter(user, query),
              readAt: null,
              $or: [
                { createdAt: { $lt: boundary.at } },
                { createdAt: boundary.at, _id: { $lte: id(boundary.id) } },
              ],
            },
            { $set: { readAt: now() } },
            { session: tx },
          );
          return {
            code: "NOTIFICATIONS_READ",
            markedCount: result.modifiedCount,
          };
        }
        const records = await Notification.collection
          .find(
            {
              ...filter(user, query),
              readAt: null,
              $or: [
                { createdAt: { $lt: boundary.at } },
                { createdAt: boundary.at, _id: { $lte: id(boundary.id) } },
              ],
            },
            { session: tx },
          )
          .toArray();
        const ids = [];
        for (const record of records) {
          if (matches(await response(record, user, tx), query))
            ids.push(record._id);
        }
        const result = await Notification.collection.updateMany(
          { recipientId: user._id, readAt: null, _id: { $in: ids } },
          { $set: { readAt: now() } },
          { session: tx },
        );
        return {
          code: "NOTIFICATIONS_READ",
          markedCount: result.modifiedCount,
        };
      }),
  };
}
