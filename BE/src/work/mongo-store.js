import mongoose from 'mongoose';
import { randomUUID } from 'node:crypto';
import { User, Session, Workspace, WorkspaceMembership, Project, Task, TaskComment, Notification, EmailOutbox, ProjectAccessAudit, ProjectGuest, ModerationAction, OrganizationMembership, ProjectLabel, TaskActivity, TaskReopenRequest } from '../models/index.js';
import { AuthError } from '../auth/errors.js';
import { sameId, paged } from '../workspaces/response.js';
import { statuses } from './input.js';
import { workspaceAccess, workspaceAccessStages } from '../organizations/workspace-access.js';
import { projectAccess } from './project-access.js';
import { createMongoProjectGuestStore } from './guest-store.js';
import { bannedProjectIds, banFilterStages, assertNotBanned } from '../moderation/guard.js';
import { nextTaskCode } from './task-codes.js';
import { deadlineGroup, deadlineGroupExpression } from './deadline-groups.js';
import { createReopenStore } from './reopen-store.js';
import { cancelReopenRequests, reconcileReopenRequests } from './reopen-lifecycle.js';
import { assertWorkspaceWritable, projectReadOnly } from '../workspaces/lifecycle.js';
import { createTaskTrashStore } from './trash-store.js';

const id = (value) => new mongoose.Types.ObjectId(value);
const deny = (code = 'RESOURCE_UNAVAILABLE', status = 404) => { throw new AuthError(code, status); };
const owner = (context) => context.access?.canManage ?? sameId(context.workspace.ownerId, context.user._id);
const editor = (context) => !context.guest && (owner(context) || context.isLead || sameId(context.task.createdBy, context.user._id));
const checkVersion = (value, version) => { if (value.version !== version) deny('VERSION_CONFLICT', 409); };
const after = (page) => page.after.$or ? { $or: page.after.$or.map((part) => part._id ? { ...part, _id: { $lt: id(part._id.$lt) } } : part) } : {};
const changed = (previous, fields) => Object.fromEntries(Object.entries(fields).filter(([key, value]) => JSON.stringify(previous[key]) !== JSON.stringify(value)));
export function createMongoWorkStore({ now = () => new Date(), config } = {}) {
  const run = async (claims, operation) => {
    for (let attempt = 0; attempt < 4; attempt++) {
      try { return await mongoose.connection.transaction(async (tx) => {
    const user = await User.collection.findOneAndUpdate({ _id: id(claims.sub) }, { $inc: { authMutationRevision: 1 } }, { session: tx, returnDocument: 'after' });
    if (!user || user.authVersion !== claims.av || !await Session.collection.findOne({ _id: id(claims.sid), userId: user._id, authVersionAtIssue: claims.av, revokedAt: null, expiresAt: { $gt: now() } }, { session: tx })) deny('UNAUTHENTICATED', 401);
    if (!user.emailVerifiedAt) deny('EMAIL_VERIFICATION_REQUIRED', 403);
    return operation({ user, tx, identities: new Map() });
      }); } catch (error) {
        // A rare random prefix collision with another Workspace rolls back the
        // entire transaction; the next attempt allocates a different prefix.
        if (error.code === 11000 && error.keyPattern?.taskPrefix) {
          if (attempt < 3) continue;
          deny('TASK_CODE_ALLOCATION_CONFLICT', 409);
        }
        throw error;
      }
    }
  };
  async function scope(context, workspaceId) {
    const { user, tx } = context;
    const workspace = await Workspace.collection.findOneAndUpdate({ _id: id(workspaceId) }, { $inc: { mutationRevision: 1 } }, { session: tx, returnDocument: 'after' });
    if (!workspace) deny();
    let access;
    try { access = await workspaceAccess(workspace, user._id, tx); }
    catch (error) { if (error instanceof AuthError && error.status === 404) deny(); throw error; }
    return { ...context, workspace, access };
  }
  async function projectScope(context, projectId, writing = false) {
    const project = await Project.collection.findOne({ _id: id(projectId) }, { session: context.tx });
    if (!project) deny();
    const workspace = await Workspace.collection.findOneAndUpdate({ _id: project.workspaceId }, { $inc: { mutationRevision: 1 } }, { session: context.tx, returnDocument: 'after' });
    if (!workspace) deny();
    const result = { ...context, workspace };
    // Workspace guard serializes archive, membership cleanup and every child mutation.
    result.project = await Project.collection.findOne({ _id: project._id }, { session: context.tx });
    if (!result.project) deny();
    Object.assign(result, await projectAccess(workspace, result.project, context.user._id, context.tx));
    if (writing) assertWorkspaceWritable(workspace);
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
    if (!assigneeId) return;
    try {
      await assertNotBanned(id(assigneeId), { organizationId: context.workspace.organizationId, workspaceId: context.workspace._id, projectId: context.project._id }, context.tx);
      await workspaceAccess(context.workspace, id(assigneeId), context.tx, { requireMember: true });
    }
    catch (error) { if (error instanceof AuthError) deny('ASSIGNEE_NOT_MEMBER', 409); throw error; }
  }
  async function labels(context, labelIds) {
    if (labelIds === undefined) return;
    const count = await ProjectLabel.collection.countDocuments({ _id: { $in: labelIds.map(id) }, projectId: context.project._id, workspaceId: context.workspace._id, archivedAt: null }, { session: context.tx });
    if (count !== labelIds.length) deny('LABEL_NOT_AVAILABLE', 409);
  }
  async function activity(context, task, action, fields = [], before = null, details = {}) {
    await new TaskActivity({ workspaceId: task.workspaceId, projectId: task.projectId, taskId: task._id, actorId: context.user._id,
      action, taskVersion: task.version, fields, previousStatus: before?.status ?? null, status: task.status, createdAt: now(), ...details }).save({ session: context.tx });
  }
  async function applyReopen(context, status, reason, requestId = null) {
    const fields = { status, completedAt: null };
    if (context.task.assigneeId) {
      try { await assignee(context, String(context.task.assigneeId)); }
      catch (error) { if (error instanceof AuthError) fields.assigneeId = null; else throw error; }
    }
    const value = await update(Task, context.task, fields, context.tx);
    await activity(context, value, 'status_changed', Object.keys(fields), context.task, { reason, reopenRequestId: requestId });
    await cancelReopenRequests({ taskId: context.task._id }, 'task_reopened', now(), context.tx, context.user._id);
    await emit(context, context.task, value, ['status', ...(Object.hasOwn(fields, 'assigneeId') ? ['assignment'] : [])]);
    return value;
  }
  const labelResponse = value => ({ id: String(value._id), projectId: String(value.projectId), name: value.name, color: value.color, archivedAt: value.archivedAt, version: value.version });
  const projectResponse = (value, context = null) => ({ id: String(value._id), workspaceId: String(value.workspaceId), createdBy: String(value.createdBy), leadId: value.leadId ? String(value.leadId) : null,
    name: value.name, icon: value.icon ?? 'folder', description: value.description, state: value.state, workspaceState: context?.workspace.state ?? 'active', readOnly: context ? projectReadOnly(context.workspace, value) : value.state !== 'active', version: value.version, archivedAt: value.archivedAt, createdAt: value.createdAt, updatedAt: value.updatedAt,
    ...(context?.access ? { accessRole: context.guest ? 'guest' : context.isLead ? 'lead' : context.access.role,
      context: { workspaceName: context.workspace.name, canOpenWorkspace: !context.guest },
      permissions: { createTask: !projectReadOnly(context.workspace, value) && !context.guest, manageAccess: !context.guest && owner(context), manageGuests: context.workspace.state !== 'archived' && owner(context), manageLead: !projectReadOnly(context.workspace, value) && owner(context),
        manageProject: context.workspace.state !== 'archived' && owner(context), manageLabels: !projectReadOnly(context.workspace, value) && !context.guest && (owner(context) || context.isLead), manageReopen: !projectReadOnly(context.workspace, value) && !context.guest && (owner(context) || context.isLead),
        editDescription: !projectReadOnly(context.workspace, value) && !context.guest && (owner(context) || context.isLead || sameId(value.createdBy, context.user._id)) } } : {}) });
  async function identity(userId, context) {
    if (!userId) return null;
    const key=String(userId); if(context.identities.has(key))return context.identities.get(key);
    const person = await User.collection.findOne({ _id: userId }, { session: context.tx, projection: { displayName: 1, avatar: 1 } });
    const result={ id: key, displayName: person?.displayName ?? 'Người dùng không còn khả dụng', avatar: person?.avatar ?? { source: 'initials', googlePictureUrl: null } };context.identities.set(key,result);return result;
  }
  const commentResponse = async (value, context) => ({ id: String(value._id), taskId: String(value.taskId), authorId: String(value.authorId), author: await identity(value.authorId, context), content: value.content, version: value.version, createdAt: value.createdAt, updatedAt: value.updatedAt, permissions: { edit: !projectReadOnly(context.workspace, context.project) && sameId(value.authorId, context.user._id), delete: owner(context) || (!projectReadOnly(context.workspace, context.project) && sameId(value.authorId, context.user._id)), moderate: owner(context) && (projectReadOnly(context.workspace, context.project) || !sameId(value.authorId, context.user._id)) } });
  async function taskResponse(value, context) {
    await reconcileReopenRequests({ taskId: value._id }, now(), context.tx);
    const pending = context.guest ? null : await TaskReopenRequest.collection.findOne({ taskId: value._id, state: 'pending' }, { session: context.tx, projection: { _id: 1, requesterId: 1 } });
    let current = null;
    if (value.assigneeId) {
      try {
        await assertNotBanned(value.assigneeId, { organizationId: context.workspace.organizationId, workspaceId: context.workspace._id, projectId: context.project._id }, context.tx);
        current = await workspaceAccess(context.workspace, value.assigneeId, context.tx, { requireMember: true });
      }
      catch (error) { if (!(error instanceof AuthError)) throw error; }
    }
    const active = !projectReadOnly(context.workspace, context.project);
    const canEdit = !context.guest && (owner(context) || context.isLead || sameId(value.createdBy, context.user._id));
    const taskLabels = await ProjectLabel.collection.find({ _id: { $in: value.labelIds ?? [] }, projectId: context.project._id, workspaceId: context.workspace._id }, { session: context.tx }).toArray();
    return { id: String(value._id), workspaceId: String(value.workspaceId), projectId: String(value.projectId), createdBy: String(value.createdBy), creator: await identity(value.createdBy, context), assignee: await identity(value.assigneeId, context), title: value.title, description: value.description, status: value.status,
      code: value.code ?? null, priority: value.priority ?? 'medium', labelIds: (value.labelIds ?? []).map(String), labels: taskLabels.map(labelResponse), checklist: value.checklist ?? [], completedAt: value.completedAt ?? null, completionTimeKnown: value.status === 'done' && Boolean(value.completedAt),
      assigneeId: value.assigneeId ? String(value.assigneeId) : null, assigneeLeft: Boolean(value.assigneeId && !current), dueAt: value.dueAt, overdue: Boolean(value.dueAt && value.dueAt < now() && value.status !== 'done'), version: value.version, createdAt: value.createdAt, updatedAt: value.updatedAt,
      pendingReopenRequestId: pending ? String(pending._id) : null,
      permissions: { edit: active && canEdit, delete: active && canEdit, status: active && !context.guest && (value.status === 'done' ? (owner(context) || context.isLead) && !sameId(pending?.requesterId, context.user._id) : canEdit || sameId(value.assigneeId, context.user._id)),
        requestReopen: active && value.status === 'done' && !context.guest && !pending && (sameId(value.createdBy, context.user._id) || sameId(value.assigneeId, context.user._id)), manageReopen: active && !context.guest && (owner(context) || context.isLead),
        checklistStructure: active && canEdit, checklistTick: active && !context.guest && (canEdit || sameId(value.assigneeId, context.user._id)) } };
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
      let membership;
      try {
        await assertNotBanned(id(recipientId), { organizationId: context.workspace.organizationId, workspaceId: context.workspace._id, projectId: task.projectId }, context.tx);
        membership = (await workspaceAccess(context.workspace, id(recipientId), context.tx, { requireMember: true })).membership;
      }
      catch (error) { if (error instanceof AuthError) continue; throw error; }
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
    if (query.priority) clauses.push(query.priority === 'medium' ? { $or: [{ priority: 'medium' }, { priority: { $exists: false } }] } : { priority: query.priority });
    if (query.labelId) clauses.push({ labelIds: id(query.labelId) });
    if (query.status === 'open') clauses.push({ status: { $ne: 'done' } });
    else if (query.status !== 'all') clauses.push({ status: query.status });
    for (const pattern of query.patterns) clauses.push({ $or: [{ searchText: { $regex: pattern, $options: 'i' } }, { code: { $regex: pattern, $options: 'i' } }] });
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
    ...createMongoProjectGuestStore({ config, now }),
    ...createReopenStore({ run, taskScope, projectScope, owner, checkVersion, now, identity, taskResponse, applyReopen }),
    ...createTaskTrashStore({ run, projectScope, taskResponse, owner, checkVersion, update, assignee, activity, now }),
    statistics: (claims, projectId, period) => run(claims, async context => {
      context = await projectScope(context, projectId);
      const asOf = now(), done = { $eq: ['$status', 'done'] }, dated = { $eq: [{ $type: '$completedAt' }, 'date'] };
      const inPeriod = { $and: [done, dated, ...(period.from ? [{ $gte: ['$completedAt', period.from] }] : []), ...(period.to ? [{ $lt: ['$completedAt', period.to] }] : [])] };
      const sum = condition => ({ $sum: { $cond: [condition, 1, 0] } });
      const rows = await Task.collection.aggregate([{ $match: { projectId: context.project._id, workspaceId: context.workspace._id, deletedAt: null } }, { $group: {
        _id: null, total: { $sum: 1 }, todo: sum({ $eq: ['$status', 'todo'] }), inProgress: sum({ $eq: ['$status', 'in_progress'] }), done: sum(done),
        completedInPeriod: sum(inPeriod), unknownCompletionTime: sum({ $and: [done, { $not: [dated] }] }),
        overdue: sum({ $and: [{ $ne: ['$status', 'done'] }, { $eq: [{ $type: '$dueAt' }, 'date'] }, { $lt: ['$dueAt', asOf] }] }),
      } }], { session: context.tx }).toArray();
      const { _id: _ignored, ...counts } = rows[0] ?? { total: 0, todo: 0, inProgress: 0, done: 0, completedInPeriod: 0, unknownCompletionTime: 0, overdue: 0 };
      return { projectId: String(context.project._id), scope: 'whole_project', ...counts, progressPercent: counts.total ? Math.round(counts.done / counts.total * 10000) / 100 : 0,
        period: { from: period.from, toExclusive: period.to }, asOf };
    }),
    labels: (claims, projectId, page) => run(claims, async context => {
      context = await projectScope(context, projectId);
      const criteria = { projectId: context.project._id, workspaceId: context.workspace._id };
      const records = await ProjectLabel.collection.find({ ...criteria, ...after(page) }, { session: context.tx }).sort({ createdAt: -1, _id: -1 }).limit(page.limit + 1).toArray();
      return { ...paged(records, page.limit, labelResponse), total: await ProjectLabel.collection.countDocuments(criteria, { session: context.tx }) };
    }),
    createLabel: (claims, projectId, input) => run(claims, async context => {
      context = await projectScope(context, projectId, true);
      if (!owner(context) && !context.isLead) deny('PROJECT_MANAGEMENT_REQUIRED', 403);
      if (await ProjectLabel.collection.findOne({ projectId: context.project._id, nameKey: input.fields.nameKey }, { session: context.tx })) deny('LABEL_NAME_CONFLICT', 409);
      const label = new ProjectLabel({ ...input.fields, projectId: context.project._id, workspaceId: context.workspace._id, createdBy: context.user._id });
      await label.save({ session: context.tx }); return { label: labelResponse(label.toObject()) };
    }),
    updateLabel: (claims, projectId, labelId, input) => run(claims, async context => {
      context = await projectScope(context, projectId, true);
      if (!owner(context) && !context.isLead) deny('PROJECT_MANAGEMENT_REQUIRED', 403);
      const label = await ProjectLabel.collection.findOne({ _id: id(labelId), projectId: context.project._id, workspaceId: context.workspace._id }, { session: context.tx });
      if (!label) deny(); checkVersion(label, input.expectedVersion);
      const { archived, ...fields } = input.fields;
      if (archived !== undefined) fields.archivedAt = archived ? label.archivedAt ?? now() : null;
      if (fields.nameKey && await ProjectLabel.collection.findOne({ _id: { $ne: label._id }, projectId: context.project._id, nameKey: fields.nameKey }, { session: context.tx })) deny('LABEL_NAME_CONFLICT', 409);
      return { label: labelResponse(await update(ProjectLabel, label, fields, context.tx)) };
    }),
    activity: (claims, taskId, page) => run(claims, async context => {
      context = await taskScope(context, taskId);
      const records = await TaskActivity.collection.find({ taskId: context.task._id, projectId: context.project._id, workspaceId: context.workspace._id, ...after(page) }, { session: context.tx }).sort({ createdAt: -1, _id: -1 }).limit(page.limit + 1).toArray();
      const result = paged(records, page.limit, value => value);
      const items = []; for (const value of result.items) items.push({ id: String(value._id), action: value.action, taskVersion: value.taskVersion, fields: value.fields, previousStatus: value.previousStatus, status: value.status, actor: await identity(value.actorId, context), createdAt: value.createdAt, reason: context.guest ? null : value.reason ?? null, reopenRequestId: context.guest ? null : value.reopenRequestId ? String(value.reopenRequestId) : null });
      return { items, nextCursor: result.nextCursor };
    }),
    checklist: (claims, taskId, input) => run(claims, async context => {
      context = await taskScope(context, taskId, true); if (!editor(context)) deny('TASK_EDIT_FORBIDDEN', 403);
      checkVersion(context.task, input.expectedVersion);
      const existing = new Map((context.task.checklist ?? []).map(item => [item.id, item]));
      const checklist = input.items.map(item => {
        if (item.id && !existing.has(item.id)) deny('CHECKLIST_ITEM_UNAVAILABLE', 409);
        return { id: item.id ?? randomUUID(), text: item.text, checked: item.id ? existing.get(item.id).checked : false };
      });
      const value = await update(Task, context.task, { checklist }, context.tx);
      if (value.version !== context.task.version) { await activity(context, value, 'checklist_changed', ['checklist']); await emit(context, context.task, value, ['content']); }
      return { task: await taskResponse(value, context) };
    }),
    tickChecklist: (claims, taskId, itemId, input) => run(claims, async context => {
      context = await taskScope(context, taskId, true);
      if (context.guest || (!editor(context) && !sameId(context.task.assigneeId, context.user._id))) deny('TASK_STATUS_FORBIDDEN', 403);
      checkVersion(context.task, input.expectedVersion);
      const checklist = (context.task.checklist ?? []).map(item => ({ ...item }));
      const item = checklist.find(item => item.id === itemId); if (!item) deny('CHECKLIST_ITEM_UNAVAILABLE', 404);
      item.checked = input.checked;
      const value = await update(Task, context.task, { checklist }, context.tx);
      if (value.version !== context.task.version) await activity(context, value, 'checklist_ticked', ['checklist']);
      return { task: await taskResponse(value, context) };
    }),
    profile: (claims, projectId, userId) => run(claims, async context => {
      context = await projectScope(context, projectId);
      const target = id(userId);
      const tasks = await Task.collection.find({ projectId: context.project._id, workspaceId: context.workspace._id, deletedAt: null }, { session: context.tx, projection: { _id: 1, createdBy: 1, assigneeId: 1 } }).toArray();
      const associated = sameId(context.project.createdBy, target) || sameId(context.project.leadId, target) || tasks.some(task => sameId(task.createdBy, target) || sameId(task.assigneeId, target)) ||
        Boolean(await TaskComment.collection.findOne({ taskId: { $in: tasks.map(task => task._id) }, authorId: target, deletedAt: null }, { session: context.tx, projection: { _id: 1 } }));
      const member = await WorkspaceMembership.collection.findOne({ workspaceId: context.workspace._id, userId: target }, { session: context.tx });
      const guest = await ProjectGuest.collection.findOne({ projectId: context.project._id, workspaceId: context.workspace._id, userId: target }, { session: context.tx });
      if (!associated && (context.guest || (!member && !guest))) deny();
      const orgMember = context.workspace.organizationId ? await OrganizationMembership.collection.findOne({ organizationId: context.workspace.organizationId, userId: target }, { session: context.tx }) : null;
      let status = 'unavailable', role = null, blocked = false;
      try {
        const access = await projectAccess(context.workspace, context.project, target, context.tx);
        status = access.guest ? 'guest' : access.access.isMember ? 'active' : 'organization_management'; role = access.guest ? 'guest' : access.isLead ? 'lead' : access.access.role;
      } catch (error) {
        if (!(error instanceof AuthError)) throw error;
        blocked = error.code === 'ACCESS_BANNED';
        status = orgMember?.state === 'inactive' ? 'left_organization' : member?.state === 'inactive' ? 'left_workspace' : guest?.state === 'inactive' ? 'left_project' : 'unavailable';
      }
      return { profile: { ...await identity(target, context), status, role,
        departedAt: status === 'left_organization' ? orgMember.leftAt : status === 'left_workspace' ? member.leftAt : status === 'left_project' ? guest.revokedAt : null,
        ...(owner(context) ? { blocked } : {}) } };
    }),
    lead: (claims, projectId, input) => run(claims, async context => {
      context = await projectScope(context, projectId, true);
      if (!owner(context)) deny('OWNER_REQUIRED', 403);
      checkVersion(context.project, input.expectedVersion);
      if (input.leadId) await assignee(context, input.leadId);
      const value = await update(Project, context.project, { leadId: input.leadId ? id(input.leadId) : null }, context.tx);
      if (!sameId(context.project.leadId ?? null, value.leadId ?? null)) await new ProjectAccessAudit({ workspaceId: context.workspace._id, projectId: value._id, actorId: context.user._id,
        targetUserId: value.leadId, previousUserId: context.project.leadId ?? null, action: 'lead_changed' }).save({ session: context.tx });
      return { project: projectResponse(value, { ...context, isLead: context.access.isMember && sameId(value.leadId, context.user._id) }) };
    }),
    shared: (claims, page) => run(claims, async context => {
      const records = await Project.collection.aggregate([
        { $match: { ...(page.state !== 'all' ? { state: page.state } : {}), $and: [after(page), ...(page.filters ?? [])] } },
        { $lookup: { from: 'project_guests', let: { project: '$_id', workspace: '$workspaceId' }, pipeline: [
          { $match: { userId: context.user._id, state: 'active', $expr: { $and: [{ $eq: ['$projectId', '$$project'] }, { $eq: ['$workspaceId', '$$workspace'] }] } } },
        ], as: 'grant' } }, { $match: { 'grant.0': { $exists: true } } },
        { $lookup: { from: 'workspaces', localField: 'workspaceId', foreignField: '_id', as: 'workspace' } }, { $unwind: '$workspace' },
        { $lookup: { from: 'organizations', localField: 'workspace.organizationId', foreignField: '_id', as: 'organization' } },
        ...banFilterStages(context.user._id, { organization: '$workspace.organizationId', workspace: '$workspaceId', project: '$_id' }),
        { $match: { $or: [{ 'workspace.organizationId': null }, { 'organization.0': { $exists: true } }] } },
        { $sort: { createdAt: -1, _id: -1 } }, { $limit: page.limit + 1 },
      ], { session: context.tx }).toArray();
      const values = [];
      for (const value of records) values.push({ ...value, context: await projectScope(context, String(value._id)) });
      return paged(values, page.limit, value => projectResponse(value, value.context));
    }),
    projects: (claims, workspaceId, page) => run(claims, async (context) => {
      context = await scope(context, workspaceId);
      const criteria = { _id: { $nin: await bannedProjectIds(context.user._id, context.tx) }, workspaceId: context.workspace._id, ...(page.state !== 'all' ? { state: page.state } : {}), ...(page.filters?.length ? { $and: page.filters } : {}) };
        const records = await Project.collection.find({ ...criteria, ...after(page) }, { session: context.tx }).sort({ createdAt: -1, _id: -1 }).limit(page.limit + 1).toArray();
        // Aggregate only this authorized page, excluding trash; no per-card requests.
        const summaries = await Task.collection.aggregate([{ $match: { workspaceId: context.workspace._id, projectId: { $in: records.slice(0, page.limit).map(value => value._id) }, deletedAt: null } },
          { $group: { _id: '$projectId', total: { $sum: 1 }, done: { $sum: { $cond: [{ $eq: ['$status', 'done'] }, 1, 0] } } } }], { session: context.tx }).toArray();
        return { ...paged(records, page.limit, value => {
          const summary = summaries.find(row => sameId(row._id, value._id)) ?? { total: 0, done: 0 };
          return { ...projectResponse(value, { ...context, isLead: context.access.isMember && sameId(value.leadId, context.user._id) }), taskSummary: { scope: 'whole_project', total: summary.total, done: summary.done, progressPercent: summary.total ? Math.round(summary.done / summary.total * 10000) / 100 : 0 } };
        }), total: await Project.collection.countDocuments(criteria, { session: context.tx }) };
    }),
    createProject: (claims, workspaceId, input) => run(claims, async (context) => {
      context = await scope(context, workspaceId); if (!owner(context)) deny('OWNER_REQUIRED', 403);
      assertWorkspaceWritable(context.workspace);
      const project = new Project({ ...input.fields, workspaceId: context.workspace._id, createdBy: context.user._id });
      await project.save({ session: context.tx }); return { project: projectResponse(project.toObject()) };
    }),
    getProject: (claims, projectId) => run(claims, async (context) => { context = await projectScope(context, projectId); return { project: projectResponse(context.project, context) }; }),
    updateProject: (claims, projectId, input) => run(claims, async (context) => {
      context = await projectScope(context, projectId, true);
      const descriptionOnly = Object.keys(input.fields).every(key => key === 'description');
      if (context.guest || (!owner(context) && !(descriptionOnly && (context.isLead || sameId(context.project.createdBy, context.user._id))))) deny('OWNER_REQUIRED', 403);
      checkVersion(context.project, input.expectedVersion);
      return { project: projectResponse(await update(Project, context.project, input.fields, context.tx), context) };
    }),
    state: (claims, projectId, input) => run(claims, async (context) => {
      context = await projectScope(context, projectId); if (!owner(context)) deny('OWNER_REQUIRED', 403);
      assertWorkspaceWritable(context.workspace);
      checkVersion(context.project, input.expectedVersion);
      if (input.state === 'archived') await cancelReopenRequests({ projectId: context.project._id }, 'parent_archived', now(), context.tx, context.user._id);
      return { project: projectResponse(await update(Project, context.project, { state: input.state, archivedAt: input.state === 'archived' ? context.project.archivedAt ?? now() : null, archivedBy: input.state === 'archived' ? context.project.archivedBy ?? context.user._id : null }, context.tx), context) };
    }),
    tasks: (claims, projectId, query) => run(claims, async (context) => {
      context = await projectScope(context, projectId);
      const criteria = { projectId: context.project._id, workspaceId: context.workspace._id, ...filter(query) };
      const records = await Task.collection.find({ ...criteria, ...after(query) }, { session: context.tx }).sort({ createdAt: -1, _id: -1 }).limit(query.limit + 1).toArray();
      return { ...await taskPage(records, query, async () => context), total: await Task.collection.countDocuments(criteria, { session: context.tx }), project: projectResponse(context.project, context) };
    }),
    board: (claims, projectId, query) => run(claims, async (context) => {
      context = await projectScope(context, projectId); const columns = {};
      for (const status of statuses) {
        const criteria = { projectId: context.project._id, workspaceId: context.workspace._id, $and: [filter(query), { status }] };
        const records = await Task.collection.find({ ...criteria, ...after(query) }, { session: context.tx }).sort({ createdAt: -1, _id: -1 }).limit(query.limit + 1).toArray();
        columns[status] = { ...await taskPage(records, query, async () => context), total: await Task.collection.countDocuments(criteria, { session: context.tx }) };
      }
      const asOf = now();
      const rows = await Task.collection.aggregate([{ $match: { projectId: context.project._id, workspaceId: context.workspace._id, deletedAt: null } }, { $group: {
        _id: null, total: { $sum: 1 }, done: { $sum: { $cond: [{ $eq: ['$status', 'done'] }, 1, 0] } },
        overdue: { $sum: { $cond: [{ $and: [{ $ne: ['$status', 'done'] }, { $eq: [{ $type: '$dueAt' }, 'date'] }, { $lt: ['$dueAt', asOf] }] }, 1, 0] } },
      } }], { session: context.tx }).toArray();
      const { total = 0, done = 0, overdue = 0 } = rows[0] ?? {};
      return { columns, project: projectResponse(context.project, context), statistics: { scope: 'whole_project', projectId: String(context.project._id), total, done, overdue, progressPercent: total ? Math.round(done / total * 10000) / 100 : 0, asOf } };
    }),
    mine: (claims, query) => run(claims, async (context) => {
      const asOf = now();
      const eligible = await Workspace.collection.aggregate([
        ...(query.workspaceId ? [{ $match: { _id: id(query.workspaceId) } }] : []),
        ...workspaceAccessStages(context.user._id, { requireMember: true }),
      ], { session: context.tx }).toArray();
      const pipeline = [
        { $match: { projectId: { $nin: await bannedProjectIds(context.user._id, context.tx), ...(query.projectId ? { $eq: id(query.projectId) } : {}) }, workspaceId: { $in: eligible.map((value) => value._id) }, assigneeId: context.user._id, ...filter(query) } },
        { $lookup: { from: 'projects', localField: 'projectId', foreignField: '_id', as: 'project' } }, { $unwind: '$project' },
        { $match: { $expr: { $eq: ['$workspaceId', '$project.workspaceId'] } } },
        { $lookup: { from: 'workspaces', localField: 'workspaceId', foreignField: '_id', as: 'workspace' } }, { $unwind: '$workspace' },
        ...(query.state === 'all' ? [] : [{ $match: query.state === 'active' ? { 'project.state': 'active', 'workspace.state': { $ne: 'archived' } } : { $or: [{ 'project.state': 'archived' }, { 'workspace.state': 'archived' }] } }]),
      ];
      // Count and deadline groups share the same authorized/filter input. Keep
      // page documents outside the facet so rich-text pages cannot hit its
      // combined-document size limit.
      const summary = await Task.collection.aggregate([...pipeline, { $facet: {
        counts: [{ $group: { _id: null, total: { $sum: 1 }, workspaces: { $addToSet: '$workspaceId' } } }],
        groups: [{ $group: { _id: deadlineGroupExpression(asOf), total: { $sum: 1 } } }],
      } }], { session: context.tx }).toArray();
      const counts = summary[0]?.counts ?? [], groups = summary[0]?.groups ?? [];
      const records = await Task.collection.aggregate([...pipeline, { $match: after(query) }, { $sort: { createdAt: -1, _id: -1 } }, { $limit: query.limit + 1 }], { session: context.tx }).toArray();
      const result = await taskPage(records, query, async (value) => projectScope(context, String(value.projectId)));
      result.items = result.items.map((value, index) => ({ ...value, deadlineGroup: deadlineGroup(records[index], asOf), workspaceName: records[index].workspace.name, projectName: records[index].project.name, projectState: records[index].project.state, workspaceState: records[index].workspace.state ?? 'active', readOnly: projectReadOnly(records[index].workspace, records[index].project) }));
      const groupCounts = Object.fromEntries(['overdue', 'today', 'upcoming', 'no_deadline', 'completed'].map(key => [key, groups.find(value => value._id === key)?.total ?? 0]));
      return { ...result, total: counts[0]?.total ?? 0, workspaceCount: counts[0]?.workspaces.length ?? 0, groupCounts, asOf };
    }),
    createTask: (claims, projectId, input) => run(claims, async (context) => {
      context = await projectScope(context, projectId, true); if (context.guest) deny('TASK_CREATE_FORBIDDEN', 403); await assignee(context, input.fields.assigneeId);
      await labels(context, input.fields.labelIds);
      const task = new Task({ ...input.fields, ...(input.fields.labelIds ? { labelIds: input.fields.labelIds.map(id) } : {}), code: await nextTaskCode(context.project, context.tx), workspaceId: context.workspace._id, projectId: context.project._id, createdBy: context.user._id });
      await task.save({ session: context.tx }); const value = task.toObject();
      await activity(context, value, 'created');
      await emit(context, null, value, value.assigneeId ? ['assignment'] : []);
      return { task: await taskResponse(value, context) };
    }),
    getTask: (claims, taskId) => run(claims, async (context) => { context = await taskScope(context, taskId); return { task: await taskResponse(context.task, context) }; }),
    updateTask: (claims, taskId, input) => run(claims, async (context) => {
      context = await taskScope(context, taskId, true); if (!editor(context)) deny('TASK_EDIT_FORBIDDEN', 403);
      checkVersion(context.task, input.expectedVersion);
      if (Object.hasOwn(input.fields, 'assigneeId')) await assignee(context, input.fields.assigneeId);
      await labels(context, input.fields.labelIds);
      const fields = { ...input.fields, ...(input.fields.labelIds ? { labelIds: input.fields.labelIds.map(id) } : {}), ...(Object.hasOwn(input.fields, 'assigneeId') ? { assigneeId: input.fields.assigneeId === null ? null : id(input.fields.assigneeId) } : {}) };
      const delta = changed(context.task, fields);
      if (Object.hasOwn(delta, 'title') || Object.hasOwn(delta, 'description')) fields.searchText = `${fields.title ?? context.task.title}\n${(fields.description ?? context.task.description).plainText}`.normalize('NFC').toLocaleLowerCase('vi');
      const value = await update(Task, context.task, fields, context.tx);
      if (Object.hasOwn(delta, 'assigneeId')) await reconcileReopenRequests({ taskId: context.task._id }, now(), context.tx);
      if (value.version !== context.task.version) await activity(context, value, 'updated', Object.keys(delta));
      await emit(context, context.task, value, [...(Object.hasOwn(delta, 'assigneeId') ? ['assignment'] : []), ...(Object.keys(delta).some((key) => ['title', 'description', 'dueAt', 'priority', 'labelIds'].includes(key)) ? ['content'] : [])]);
      return { task: await taskResponse(value, context) };
    }),
    status: (claims, taskId, input) => run(claims, async (context) => {
      context = await taskScope(context, taskId, true);
      if (context.guest || (!editor(context) && !sameId(context.task.assigneeId, context.user._id))) deny('TASK_STATUS_FORBIDDEN', 403);
      checkVersion(context.task, input.expectedVersion);
      if (context.task.status === 'done' && input.status !== 'done') {
        if (!owner(context) && !context.isLead) deny('REOPEN_APPROVAL_REQUIRED', 403);
        if (!input.reason) deny('REOPEN_REASON_REQUIRED', 400);
        await reconcileReopenRequests({ taskId: context.task._id }, now(), context.tx);
        const pending = await TaskReopenRequest.collection.findOne({ taskId: context.task._id, state: 'pending' }, { session: context.tx });
        if (pending && sameId(pending.requesterId, context.user._id)) deny('REOPEN_SELF_REVIEW_FORBIDDEN', 403);
        return { task: await taskResponse(await applyReopen(context, input.status, input.reason), context) };
      }
      const fields = { status: input.status };
      if (input.status === 'done' && context.task.status !== 'done') {
        if ((context.task.checklist ?? []).some(item => !item.checked) && !input.confirmIncompleteChecklist) deny('CHECKLIST_INCOMPLETE_CONFIRMATION_REQUIRED', 409);
        fields.completedAt = now();
      }
      const value = await update(Task, context.task, fields, context.tx);
      if (input.status !== context.task.status) { await activity(context, value, 'status_changed', Object.keys(fields), context.task); await emit(context, context.task, value, ['status', ...(Object.hasOwn(fields, 'assigneeId') ? ['assignment'] : [])]); }
      return { task: await taskResponse(value, context) };
    }),
    deleteTask: (claims, taskId, version) => run(claims, async (context) => {
      context = await taskScope(context, taskId, true); if (!editor(context)) deny('TASK_EDIT_FORBIDDEN', 403);
      const deletedAt = now();
      checkVersion(context.task, version); const value = await update(Task, context.task, { deletedAt, deletedBy: context.user._id, purgeAt: new Date(deletedAt.getTime() + 30 * 86400_000) }, context.tx);
      await activity(context, value, 'deleted', ['deletedAt']);
      await cancelReopenRequests({ taskId: context.task._id }, 'task_unavailable', now(), context.tx, context.user._id);
      await EmailOutbox.collection.updateMany({ taskId: context.task._id, workspaceId: context.workspace._id, state: { $in: ['pending', 'processing', 'failed'] } }, { $set: { state: 'cancelled', encryptedDeliveryData: null, leaseToken: null, leaseUntil: null, updatedAt: now() } }, { session: context.tx });
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
      context = await taskScope(context, taskId, !deleting);
      const comment = await TaskComment.collection.findOne({ _id: id(commentId), taskId: context.task._id, workspaceId: context.workspace._id, deletedAt: null }, { session: context.tx });
      if (!comment) deny();
      const own = sameId(comment.authorId, context.user._id);
      if (!deleting && !own) deny('COMMENT_AUTHOR_REQUIRED', 403);
      checkVersion(comment, input.expectedVersion);
      if (deleting) {
        const authorDelete = own && !projectReadOnly(context.workspace, context.project);
        if (!authorDelete && !owner(context)) deny(projectReadOnly(context.workspace, context.project) ? context.workspace.state === 'archived' ? 'WORKSPACE_ARCHIVED' : 'PROJECT_ARCHIVED' : 'COMMENT_AUTHOR_REQUIRED', projectReadOnly(context.workspace, context.project) ? 409 : 403);
        if (!authorDelete && !input.reason) deny('MODERATION_REASON_REQUIRED', 400);
        const result = await TaskComment.collection.deleteOne({ _id: comment._id, taskId: context.task._id, workspaceId: context.workspace._id, version: input.expectedVersion }, { session: context.tx });
        if (result.deletedCount !== 1) deny('VERSION_CONFLICT', 409);
        await new ModerationAction({ scopeType: 'project', scopeId: context.project._id, organizationId: context.workspace.organizationId ?? null,
          workspaceId: context.workspace._id, projectId: context.project._id, workspaceIds: [context.workspace._id], actorId: context.user._id, targetUserId: comment.authorId,
          action: 'comment_deleted', commentId: comment._id, reason: input.reason ?? 'author_deleted', cutoff: now(), matchedCount: 1, deletedCount: 1 }).save({ session: context.tx });
        return { code: 'COMMENT_DELETED' };
      }
      const value = await update(TaskComment, comment, input.fields, context.tx);
      return { comment: await commentResponse(value, context) };
    }),
  };
}
