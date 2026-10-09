import { coreSchema, ref, nullableDate, choice, singleLine, richText, contentHook, nested, integer } from './shared.js';

export const projectSchema = coreSchema({
  workspaceId: { ...ref('Workspace'), immutable: true }, createdBy: { ...ref('User'), immutable: true },
  name: singleLine(200), icon: choice(['folder', 'palette', 'code', 'megaphone', 'layers', 'document'], 'folder'), description: richText(), state: choice(['active', 'archived'], 'active'),
  leadId: ref('User', true),
  taskSequence: integer(),
  taskPrefix: { type: String, default: null, match: /^[A-F0-9]{6}$/u },
  archivedAt: nullableDate(), archivedBy: ref('User', true),
});
contentHook(projectSchema, 'description', 'project');
projectSchema.pre('validate', function() {
  if (this.state === 'active' && (this.archivedAt !== null || this.archivedBy !== null)) this.invalidate('state', 'Active project has no archive details');
  if (this.state === 'archived' && (!this.archivedAt || !this.archivedBy)) this.invalidate('state', 'Archived project requires archive details');
});

export const taskSchema = coreSchema({
  workspaceId: { ...ref('Workspace'), immutable: true }, projectId: { ...ref('Project'), immutable: true },
  createdBy: { ...ref('User'), immutable: true }, title: singleLine(300), description: richText(),
  searchText: { type: String, default: '' }, status: choice(['todo', 'in_progress', 'done'], 'todo'),
  assigneeId: ref('User', true),
  code: { type: String, default: null, immutable: true, match: /^WF-[A-F0-9]{6}-[1-9][0-9]*$/u },
  priority: choice(['low', 'medium', 'high'], 'medium'),
  labelIds: { type: [ref('ProjectLabel')], default: [], validate: value => value.length <= 20 && new Set(value.map(String)).size === value.length },
  checklist: { type: [nested({ id: singleLine(36), text: singleLine(300), checked: { type: Boolean, default: false } })], default: [], validate: value => value.length <= 100 && new Set(value.map(item => item.id)).size === value.length },
  completedAt: nullableDate(),
  dueAt: { ...nullableDate(), validate: (value) => value === null || value.getTime() % 60_000 === 0 },
  deletedAt: nullableDate(), deletedBy: ref('User', true), purgeAt: nullableDate(),
}, { privateFields: ['searchText'] });
taskSchema.pre('validate', function() {
  if (this.purgeAt && (!this.deletedAt || this.purgeAt.getTime() !== this.deletedAt.getTime() + 30 * 86400_000)) this.invalidate('purgeAt', 'Retention is 30 days after deletion');
});
contentHook(taskSchema, 'description', 'task');

export const projectLabelSchema = coreSchema({
  workspaceId: { ...ref('Workspace'), immutable: true }, projectId: { ...ref('Project'), immutable: true },
  createdBy: { ...ref('User'), immutable: true }, name: singleLine(60), nameKey: singleLine(60),
  color: choice(['lavender', 'coral', 'mint', 'blue', 'amber', 'gray'], 'lavender'),
  archivedAt: nullableDate(),
});
export const taskActivitySchema = coreSchema({
  workspaceId: { ...ref('Workspace'), immutable: true }, projectId: { ...ref('Project'), immutable: true },
  taskId: { ...ref('Task'), immutable: true }, actorId: { ...ref('User'), immutable: true },
  action: choice(['created', 'updated', 'status_changed', 'checklist_changed', 'checklist_ticked', 'deleted', 'restored']),
  taskVersion: integer(), fields: { type: [String], default: [] },
  previousStatus: { type: String, enum: ['todo', 'in_progress', 'done', null], default: null },
  status: { type: String, enum: ['todo', 'in_progress', 'done', null], default: null },
  reason: { type: String, default: null, maxlength: 2000 }, reopenRequestId: ref('TaskReopenRequest', true),
}, { editable: false, updated: false });

export const commentSchema = coreSchema({
  workspaceId: { ...ref('Workspace'), immutable: true }, taskId: { ...ref('Task'), immutable: true },
  authorId: { ...ref('User'), immutable: true }, content: richText(true),
  deletedAt: nullableDate(), deletedBy: ref('User', true),
});
contentHook(commentSchema, 'content', 'comment', true);
for (const schema of [taskSchema, commentSchema]) {
  schema.pre('validate', function() {
    if (Boolean(this.deletedAt) !== Boolean(this.deletedBy)) this.invalidate('deletedAt', 'Deletion fields must appear together');
  });
}
