import { WorkspaceMembership, WorkspaceInvitation, Notification } from '../models/index.js';

export async function assertWorkspaceIndexes() {
  for (const model of [WorkspaceMembership, WorkspaceInvitation, Notification]) {
    const existing = await model.collection.listIndexes().toArray();
    for (const [keys, options] of model.schema.indexes()) {
      if (options.unique && !existing.some((value) => value.unique && JSON.stringify(value.key) === JSON.stringify(keys))) throw new Error('Required Workspace unique indexes missing; run db:indexes');
    }
  }
}
