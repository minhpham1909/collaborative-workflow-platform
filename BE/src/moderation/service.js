import { objectId, pageInput, versionInput } from '../workspaces/input.js';
import { scopeType, previewInput, banInput, unbanInput } from './input.js';

export function createModerationService({ store }) {
  return {
    preview: (auth, type, scopeId, input) => store.preview(auth.claims, scopeType(type), objectId(scopeId), previewInput(input)),
    ban: (auth, type, scopeId, input) => store.ban(auth.claims, scopeType(type), objectId(scopeId), banInput(input)),
    unban: (auth, type, scopeId, userId, input) => store.unban(auth.claims, scopeType(type), objectId(scopeId), objectId(userId), unbanInput(input)),
    bans: (auth, type, scopeId, query) => store.bans(auth.claims, scopeType(type), objectId(scopeId), pageInput(query)),
    actions: (auth, type, scopeId, query) => store.actions(auth.claims, scopeType(type), objectId(scopeId), pageInput(query)),
    retry: (auth, type, scopeId, actionId, input) => store.retry(auth.claims, scopeType(type), objectId(scopeId), objectId(actionId), versionInput(input)),
  };
}
