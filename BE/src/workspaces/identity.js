export const WORKSPACE_ICONS = ['folder', 'palette', 'code', 'megaphone', 'layers', 'document'];
export const WORKSPACE_COLORS = ['lavender', 'coral', 'mint', 'blue', 'amber', 'gray'];
export const WORKSPACE_COVERS = ['moodboard', 'architecture', 'campaign'];
export const WORKSPACE_IDENTITY_DEFAULTS = Object.freeze({ icon: 'folder', color: 'lavender', coverId: 'moodboard' });
export function validWorkspaceSummary(value) {
  return value === null || (typeof value === 'string' && value.length <= 500 && Boolean(value.trim()) && !/[\u0000-\u001f\u007f\u2028\u2029]/u.test(value));
}
