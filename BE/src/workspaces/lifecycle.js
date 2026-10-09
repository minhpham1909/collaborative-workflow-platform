import { AuthError } from '../auth/errors.js';
export function assertWorkspaceWritable(workspace) {
  if (workspace?.state === 'archived') throw new AuthError('WORKSPACE_ARCHIVED', 409);
}
export const projectReadOnly = (workspace, project) => workspace?.state === 'archived' || project.state !== 'active';
