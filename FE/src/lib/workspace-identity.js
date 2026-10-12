export const workspaceColors = [['lavender', 'Tím lavender'], ['coral', 'Hồng coral'], ['mint', 'Xanh mint'], ['blue', 'Xanh dương'], ['amber', 'Vàng amber'], ['gray', 'Xám']];
export const workspaceCovers = [['moodboard', 'Bảng ý tưởng'], ['architecture', 'Góc làm việc'], ['campaign', 'Bảng kế hoạch']];
export const defaultWorkspaceIdentity = Object.freeze({ summary: '', icon: 'folder', color: 'lavender', coverId: 'moodboard' });
export const validWorkspaceSummary = value => typeof value === 'string' && value.length <= 500 && !/[\u0000-\u001f\u007f\u2028\u2029]/u.test(value);
export function workspaceIdentity(value = {}) {
  return { summary: value.summary ?? '', icon: value.icon ?? 'folder', color: value.color ?? 'lavender', coverId: value.coverId ?? 'moodboard' };
}
export function workspaceIdentityBody(value) {
  return { ...value, summary: value.summary.trim() || null };
}
