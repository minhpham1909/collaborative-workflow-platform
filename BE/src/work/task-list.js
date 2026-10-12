// Bounded read projection; detail and mutation responses keep canonical content.
export const TASK_LIST_PROJECTION = {
  _id: 1, workspaceId: 1, projectId: 1, createdBy: 1, assigneeId: 1,
  title: 1, status: 1, code: 1, priority: 1, labelIds: 1,
  dueAt: 1, completedAt: 1, version: 1, createdAt: 1, updatedAt: 1,
  descriptionExcerpt: { $substrCP: [{ $ifNull: ['$description.plainText', ''] }, 0, 240] },
  checklistSummary: {
    total: { $size: { $ifNull: ['$checklist', []] } },
    checked: { $size: { $filter: { input: { $ifNull: ['$checklist', []] }, as: 'item', cond: { $eq: ['$$item.checked', true] } } } },
  },
};
export function taskListPermissions({ active, guest, manager, creator, assignee, done, pending }) {
  const edit = !guest && (manager || creator);
  return { edit: active && edit, delete: active && edit,
    status: active && !guest && (done ? manager && !pending : edit || assignee),
    requestReopen: active && done && !guest && !pending && (creator || assignee),
    manageReopen: active && !guest && manager,
    checklistStructure: active && edit, checklistTick: active && !guest && (edit || assignee) };
}
