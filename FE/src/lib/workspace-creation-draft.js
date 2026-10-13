import { workspaceColors, workspaceCovers, validWorkspaceSummary } from './workspace-identity.js';
const key = userId => `workflow.workspace-creation.v1:${userId}`;
export function readCreationDraft(storage, userId) {
  try {
    const text = storage.getItem(key(userId)); if (!text || text.length > 2500) return null;
    const value = JSON.parse(text);
    if (!value || typeof value !== 'object' || Object.keys(value).sort().join(',') !== 'color,coverId,icon,name,requestId,summary') return null;
    if (!/^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/u.test(value.requestId) || typeof value.name !== 'string' || !value.name.trim() || value.name.length > 200) return null;
    if (!validWorkspaceSummary(value.summary ?? '') || !['folder','palette','code','megaphone','layers','document'].includes(value.icon) || !workspaceColors.some(([id]) => id === value.color) || !workspaceCovers.some(([id]) => id === value.coverId)) return null;
    return value;
  } catch { return null; }
}
export function saveCreationDraft(storage, userId, value) { storage.setItem(key(userId), JSON.stringify(value)); }
export function clearCreationDraft(storage, userId) { try { storage.removeItem(key(userId)); } catch {} }
