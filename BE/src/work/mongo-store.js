import mongoose from 'mongoose';
import { randomUUID } from 'node:crypto';
import { User, Session, Workspace, WorkspaceMembership, Project, Task, TaskComment, Notification, EmailOutbox } from '../models/index.js';
import { AuthError } from '../auth/errors.js';
import { sameId, paged } from '../workspaces/response.js';
import { statuses } from './input.js';

const id = (value) => new mongoose.Types.ObjectId(value);
const deny = (code = 'RESOURCE_UNAVAILABLE', status = 404) => { throw new AuthError(code, status); };
const owner = (context) => sameId(context.workspace.ownerId, context.user._id);
const editor = (context) => owner(context) || sameId(context.task.createdBy, context.user._id);
const checkVersion = (value, version) => { if (value.version !== version) deny('VERSION_CONFLICT', 409); };
const after = (page) => page.after.$or ? { $or: page.after.$or.map((part) => part._id ? { ...part, _id: { $lt: id(part._id.$lt) } } : part) } : {};
const changed = (previous, fields) => Object.fromEntries(Object.entries(fields).filter(([key, value]) => JSON.stringify(previous[key]) !== JSON.stringify(value)));
export function createMongoWorkStore({ now = () => new Date() } = {}) {
  const run = (claims, operation) => mongoose.connection.transaction(async (tx) => {
    const user = await User.collection.findOneAndUpdate({ _id: id(claims.sub) }, { $inc: { authMutationRevision: 1 } }, { session: tx, returnDocument: 'after' });
    if (!user || user.authVersion !== claims.av || !await Session.collection.findOne({ _id: id(claims.sid), userId: user._id, authVersionAtIssue: claims.av, revokedAt: null, expiresAt: { $gt: now() } }, { session: tx })) deny('UNAUTHENTICATED', 401);
    if (!user.emailVerifiedAt) deny('EMAIL_VERIFICATION_REQUIRED', 403);
    return operation({ user, tx, identities: new Map() });
  });
  async function scope(context, workspaceId) {
    const { user, tx } = context;
    const workspace = await Workspace.collection.findOneAndUpdate({ _id: id(workspaceId) }, { $inc: { mutationRevision: 1 } }, { session: tx, returnDocument: 'after' });
    if (!workspace || !await WorkspaceMembership.collection.findOne({ workspaceId: workspace._id, userId: user._id, state: 'active' }, { session: tx })) deny();
    return { ...context, workspace };
  }
  async function projectScope(context, projectId, writing = false) {
    const project = await Project.collection.findOne({ _id: id(projectId) }, { session: context.tx });
    if (!project) deny();
    const result = await scope(context, String(project.workspaceId));
    // Workspace guard serializes archive, membership cleanup and every child mutation.
    result.project = await Project.collection.findOne({ _id: project._id }, { session: context.tx });
    if (!result.project) deny();
    if (writing && result.project.state !== 'active') deny('PROJECT_ARCHIVED', 409);
    return result;
  }
  async function taskScope(context, taskId, writing = false) {
    const task = await Task.collection.findOne({ _id: id(taskId), deletedAt: null }, { session: context.tx });
    if (!task) deny();
    const result = await projectScope(context, String(task.projectId), writing);
    result.task = await Task.collection.findOne({ _id: task._id, workspaceId: result.workspace._id, projectId: result.project._id, deletedAt: null }, { session: context.tx });
    if (!result.task) deny(); return result;
  }
  async function assignee(context, assigneeId) {
    if (assigneeId && !await WorkspaceMembership.collection.findOne({ workspaceId: context.workspace._id, userId: id(assigneeId), state: 'active' }, { session: context.tx })) deny('ASSIGNEE_NOT_MEMBER', 409);
  }
  const projectResponse = (value) => ({ id: String(value._id), workspaceId: String(value.workspaceId), createdBy: String(value.createdBy), name: value.name, icon: value.icon ?? 'folder', description: value.description, state: value.state, version: value.version, archivedAt: value.archivedAt, createdAt: value.createdAt, updatedAt: value.updatedAt });
  async function identity(userId, context) {
    if (!userId) return null;
    const key=String(userId); if(context.identities.has(key))return context.identities.get(key);
    const person = await User.collection.findOne({ _id: userId }, { session: context.tx, projection: { displayName: 1, avatar: 1 } });
    const result={ id: key, displayName: person?.displayName ?? 'Người dùng không còn khả dụng', avatar: person?.avatar ?? { source: 'initials', googlePictureUrl: null } };context.identities.set(key,result);return result;
  }
  const commentResponse = async (value, context) => ({ id: String(value._id), taskId: String(value.taskId), authorId: String(value.authorId), author: await identity(value.authorId, context), content: value.content, version: value.version, createdAt: value.createdAt, updatedAt: value.updatedAt, permissions: { edit: context.project.state === 'active' && sameId(value.authorId, context.user._id), delete: context.project.state === 'active' && sameId(value.authorId, context.user._id) } });
  async function taskResponse(value, context) {
    const current = value.assigneeId && await WorkspaceMembership.collection.findOne({ workspaceId: value.workspaceId, userId: value.assigneeId, state: 'active' }, { session: context.tx });
    const active = context.project.state === 'active';
    const canEdit = owner(context) || sameId(value.createdBy, context.user._id);
    return { id: String(value._id), workspaceId: String(value.workspaceId), projectId: String(value.projectId), createdBy: String(value.createdBy), creator: await identity(value.createdBy, context), assignee: await identity(value.assigneeId, context), title: value.title, description: value.description, status: value.status, assigneeId: value.assigneeId ? String(value.assigneeId) : null, assigneeLeft: Boolean(value.assigneeId && !current), dueAt: value.dueAt, overdue: Boolean(value.dueAt && value.dueAt < now() && value.status !== 'done'), version: value.version, createdAt: value.createdAt, updatedAt: value.updatedAt, permissions: { edit: active && canEdit, delete: active && canEdit, status: active && (canEdit || sameId(value.assigneeId, context.user._id)) } };
  }
  async function emit(context, before, task, changes) {
    if (!changes.length) return;
    const eventId = randomUUID();
    const candidates = new Map();
    const add = (recipient, type) => {
      if (!recipient || sameId(recipient, context.user._id)) return;
      const key = String(recipient); if (!candidates.has(key)) candidates.set(key, new Set()); candidates.get(key).add(type);
    };
    for (const type of changes) {
      add(task.createdBy, type);
      if (type === 'assignment') { add(before?.assigneeId, type); add(task.assigneeId, type); }
      else add(task.assigneeId, type);
    }
    const payload = { taskTitle: task.title, workspaceName: context.workspace.name, actorDisplayName: context.user.displayName, previousStatus: before?.status ?? null, status: task.status };
    for (const [recipientId, types] of candidates) {
      const membership = await WorkspaceMembership.collection.findOne({ workspaceId: task.workspaceId, userId: id(recipientId), state: 'active' }, { session: context.tx });
      if (!membership) continue;
      const recipient = await User.collection.findOne({ _id: id(recipientId) }, { session: context.tx });
      if (!recipient) continue;
      await new Notification({ eventId, recipientId, category: 'work', workspaceId: task.workspaceId, taskId: task._id, actorId: context.user._id, changes: [...types], payload }).save({ session: context.tx });
      const enabled = [...types].filter((type) => membership.emailOverrides[type] === 'on' || (membership.emailOverrides[type] === 'inherit' && recipient.emailPreferences[type]));
      if (enabled.length) await new EmailOutbox({ eventId, recipientKey: `user:${recipientId}`, userId: recipientId, workspaceId: task.workspaceId, taskId: task._id, category: 'work', templateKey: 'task_changes', eventTypes: enabled, payload, nextAttemptAt: now() }).save({ session: context.tx });
    }
  }
  async function update(model, value, fields, tx) {
    const delta = changed(value, fields);
    if (!Object.keys(delta).length) return value;
    const result = await model.collection.findOneAndUpdate({ _id: value._id, version: value.version }, { $set: { ...delta, updatedAt: now() }, $inc: { version: 1 } }, { session: tx, returnDocument: 'after' });
    if (!result) deny('VERSION_CONFLICT', 409); return result;
  }
  function filter(query) {
    const clauses = [{ deletedAt: null }];
    if (query.status === 'open') clauses.push({ status: { $ne: 'done' } });
    else if (query.status !== 'all') clauses.push({ status: query.status });
    for (const pattern of query.patterns) clauses.push({ searchText: { $regex: pattern, $options: 'i' } });
    if (query.from || query.to) clauses.push({ [query.timeField]: { $type: 'date', ...(query.from ? { $gte: query.from } : {}), ...(query.to ? { $lt: query.to } : {}) } });
    if (query.overdue === 'true') clauses.push({ status: { $ne: 'done' }, dueAt: { $ne: null, $lt: now() } });
    if (query.overdue === 'false') clauses.push({ $or: [{ status: 'done' }, { dueAt: null }, { dueAt: { $gte: now() } }] });
    return { $and: clauses };
  }
  async function taskPage(records, page, contextFor) {
    const values = [];
    for (const value of records.slice(0, page.limit)) values.push(await taskResponse(value, await contextFor(value)));
    const result = paged(records, page.limit, (value) => value);
    return { items: values, nextCursor: result.nextCursor };
  }
  return {
    projects: (claims, workspaceId, page) => run(claims, async (context) => {
      context = await scope(context, workspaceId);
      const criteria = { workspaceId: context.workspace._id, ...(page.state !== 'all' ? { state: page.state } : {}), ...(page.filters?.length ? { $and: page.filters } : {}) };
      const records = await Project.collection.find({ ...criteria, ...after(page) }, { session: context.tx }).sort({ createdAt: -1, _id: -1 }).limit(page.limit + 1).toArray();
      return { ...paged(records, page.limit, projectResponse), total: await Project.collection.countDocuments(criteria, { session: context.tx }) };
    }),
    createProject: (claims, workspaceId, input) => run(claims, async (context) => {
      context = await scope(context, workspaceId); if (!owner(context)) deny('OWNER_REQUIRED', 403);
      const project = new Project({ ...input.fields, workspaceId: context.workspace._id, createdBy: context.user._id });
      await project.save({ session: context.tx }); return { project: projectResponse(project.toObject()) };
    }),
    getProject: (claims, projectId) => run(claims, async (context) => { context = await projectScope(context, projectId); return { project: projectResponse(context.project) }; }),
    updateProject: (claims, projectId, input) => run(claims, async (context) => {
      context = await projectScope(context, projectId, true);
      const descriptionOnly = Object.keys(input.fields).every(key => key === 'description');
      if (!owner(context) && !(descriptionOnly && sameId(context.project.createdBy, context.user._id))) deny('OWNER_REQUIRED', 403);
      checkVersion(context.project, input.expectedVersion);
      return { project: projectResponse(await update(Project, context.project, input.fields, context.tx)) };
    }),
    state: (claims, projectId, input) => run(claims, async (context) => {
      context = await projectScope(context, projectId); if (!owner(context)) deny('OWNER_REQUIRED', 403);
      checkVersion(context.project, input.expectedVersion);
      return { project: projectResponse(await update(Project, context.project, { state: input.state, archivedAt: input.state === 'archived' ? context.project.archivedAt ?? now() : null, archivedBy: input.state === 'archived' ? context.project.archivedBy ?? context.user._id : null }, context.tx)) };
    }),
    tasks: (claims, projectId, query) => run(claims, async (context) => {
      context = await projectScope(context, projectId);
      const criteria = { projectId: context.project._id, workspaceId: context.workspace._id, ...filter(query) };
      const records = await Task.collection.find({ ...criteria, ...after(query) }, { session: context.tx }).sort({ createdAt: -1, _id: -1 }).limit(query.limit + 1).toArray();
      return { ...await taskPage(records, query, async () => context), total: await Task.collection.countDocuments(criteria, { session: context.tx }) };
    }),
    board: (claims, projectId, query) => run(claims, async (context) => {
      context = await projectScope(context, projectId); const columns = {};
      for (const status of statuses) {
        const criteria = { projectId: context.project._id, workspaceId: context.workspace._id, $and: [filter(query), { status }] };
        const records = await Task.collection.find({ ...criteria, ...after(query) }, { session: context.tx }).sort({ createdAt: -1, _id: -1 }).limit(query.limit + 1).toArray();
        columns[status] = { ...await taskPage(records, query, async () => context), total: await Task.collection.countDocuments(criteria, { session: context.tx }) };
      }
      return { columns };
    }),
    mine: (claims, query) => run(claims, async (context) => {
      const memberships = await WorkspaceMembership.collection.find({ userId: context.user._id, state: 'active', ...(query.workspaceId ? { workspaceId: id(query.workspaceId) } : {}) }, { session: context.tx }).toArray();
      const pipeline = [
        { $match: { workspaceId: { $in: memberships.map((value) => value.workspaceId) }, assigneeId: context.user._id, ...filter(query) } },
        { $lookup: { from: 'projects', localField: 'projectId', foreignField: '_id', as: 'project' } }, { $unwind: '$project' },
        { $match: { $expr: { $eq: ['$workspaceId', '$project.workspaceId'] }, ...(query.state !== 'all' ? { 'project.state': query.state } : {}) } },
        { $lookup: { from: 'workspaces', localField: 'workspaceId', foreignField: '_id', as: 'workspace' } }, { $unwind: '$workspace' },
      ];
      const counts = await Task.collection.aggregate([...pipeline, { $group: { _id: null, total: { $sum: 1 }, workspaces: { $addToSet: '$workspaceId' } } }], { session: context.tx }).toArray();
      const records = await Task.collection.aggregate([...pipeline, { $match: after(query) }, { $sort: { createdAt: -1, _id: -1 } }, { $limit: query.limit + 1 }], { session: context.tx }).toArray();
      const result = await taskPage(records, query, async (value) => ({ ...context, workspace: value.workspace, project: value.project }));
      result.items = result.items.map((value, index) => ({ ...value, workspaceName: records[index].workspace.name, projectName: records[index].project.name, projectState: records[index].project.state }));
      return { ...result, total: counts[0]?.total ?? 0, workspaceCount: counts[0]?.workspaces.length ?? 0 };
    }),
    createTask: (claims, projectId, input) => run(claims, async (context) => {
      context = await projectScope(context, projectId, true); await assignee(context, input.fields.assigneeId);
      const task = new Task({ ...input.fields, workspaceId: context.workspace._id, projectId: context.project._id, createdBy: context.user._id });
      await task.save({ session: context.tx }); const value = task.toObject();
      await emit(context, null, value, value.assigneeId ? ['assignment'] : []);
      return { task: await taskResponse(value, context) };
    }),
    getTask: (claims, taskId) => run(claims, async (context) => { context = await taskScope(context, taskId); return { task: await taskResponse(context.task, context) }; }),
    updateTask: (claims, taskId, input) => run(claims, async (context) => {
      context = await taskScope(context, taskId, true); if (!editor(context)) deny('TASK_EDIT_FORBIDDEN', 403);
      checkVersion(context.task, input.expectedVersion);
      if (Object.hasOwn(input.fields, 'assigneeId')) await assignee(context, input.fields.assigneeId);
      const fields = { ...input.fields, ...(Object.hasOwn(input.fields, 'assigneeId') ? { assigneeId: input.fields.assigneeId === null ? null : id(input.fields.assigneeId) } : {}) };
      const delta = changed(context.task, fields);
      if (Object.hasOwn(delta, 'title') || Object.hasOwn(delta, 'description')) fields.searchText = `${fields.title ?? context.task.title}\n${(fields.description ?? context.task.description).plainText}`.normalize('NFC').toLocaleLowerCase('vi');
      const value = await update(Task, context.task, fields, context.tx);
      await emit(context, context.task, value, [...(Object.hasOwn(delta, 'assigneeId') ? ['assignment'] : []), ...(Object.keys(delta).some((key) => ['title', 'description', 'dueAt'].includes(key)) ? ['content'] : [])]);
      return { task: await taskResponse(value, context) };
    }),
    status: (claims, taskId, input) => run(claims, async (context) => {
      context = await taskScope(context, taskId, true);
      if (!editor(context) && !sameId(context.task.assigneeId, context.user._id)) deny('TASK_STATUS_FORBIDDEN', 403);
      checkVersion(context.task, input.expectedVersion);
      const fields = { status: input.status };
      if (context.task.status === 'done' && input.status !== 'done' && context.task.assigneeId && !await WorkspaceMembership.collection.findOne({ workspaceId: context.workspace._id, userId: context.task.assigneeId, state: 'active' }, { session: context.tx })) fields.assigneeId = null;
      const value = await update(Task, context.task, fields, context.tx);
      if (input.status !== context.task.status) await emit(context, context.task, value, ['status', ...(Object.hasOwn(fields, 'assigneeId') ? ['assignment'] : [])]);
      return { task: await taskResponse(value, context) };
    }),
    deleteTask: (claims, taskId, version) => run(claims, async (context) => {
      context = await taskScope(context, taskId, true); if (!editor(context)) deny('TASK_EDIT_FORBIDDEN', 403);
      checkVersion(context.task, version); await update(Task, context.task, { deletedAt: now(), deletedBy: context.user._id }, context.tx);
      return { code: 'TASK_DELETED' };
    }),
    comments: (claims, taskId, page) => run(claims, async (context) => {
      context = await taskScope(context, taskId);
      const criteria = { taskId: context.task._id, workspaceId: context.workspace._id, deletedAt: null };
      const records = await TaskComment.collection.find({ ...criteria, ...after(page) }, { session: context.tx }).sort({ createdAt: -1, _id: -1 }).limit(page.limit + 1).toArray();
      const result = paged(records, page.limit, value => value);
      const items = []; for (const value of result.items) items.push(await commentResponse(value, context));
      return { ...result, items, total: await TaskComment.collection.countDocuments(criteria, { session: context.tx }) };
    }),
    createComment: (claims, taskId, input) => run(claims, async (context) => {
      context = await taskScope(context, taskId, true);
      const comment = new TaskComment({ ...input.fields, workspaceId: context.workspace._id, taskId: context.task._id, authorId: context.user._id });
      await comment.save({ session: context.tx }); await emit(context, context.task, context.task, ['comment']);
      return { comment: await commentResponse(comment.toObject(), context) };
    }),
    changeComment: (claims, taskId, commentId, input, deleting = false) => run(claims, async (context) => {
      context = await taskScope(context, taskId, true);
      const comment = await TaskComment.collection.findOne({ _id: id(commentId), taskId: context.task._id, workspaceId: context.workspace._id, deletedAt: null }, { session: context.tx });
      if (!comment) deny(); if (!sameId(comment.authorId, context.user._id)) deny('COMMENT_AUTHOR_REQUIRED', 403);
      checkVersion(comment, input.expectedVersion);
      const value = await update(TaskComment, comment, deleting ? { deletedAt: now(), deletedBy: context.user._id } : input.fields, context.tx);
      return deleting ? { code: 'COMMENT_DELETED' } : { comment: await commentResponse(value, context) };
    }),
  };
}
