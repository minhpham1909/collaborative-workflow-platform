import { coreSchema, ref, nullableDate, choice, singleLine, richText, contentHook } from './shared.js';

export const projectSchema = coreSchema({
  workspaceId: { ...ref('Workspace'), immutable: true }, createdBy: { ...ref('User'), immutable: true },
  name: singleLine(200), icon: choice(['folder', 'palette', 'code', 'megaphone', 'layers', 'document'], 'folder'), description: richText(), state: choice(['active', 'archived'], 'active'),
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
  dueAt: { ...nullableDate(), validate: (value) => value === null || value.getTime() % 60_000 === 0 },
  deletedAt: nullableDate(), deletedBy: ref('User', true),
}, { privateFields: ['searchText'] });
contentHook(taskSchema, 'description', 'task');

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
