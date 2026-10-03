import { inputObject } from '../auth/account-input.js';
import { objectId } from '../workspaces/input.js';
import { inboxQuery } from './input.js';
export function createNotificationsService({ store, cutoff }) {
  return {
    list: (auth, query) => store.list(auth.claims, inboxQuery(query)),
    get: (auth, notificationId) => store.get(auth.claims, objectId(notificationId)),
    read: (auth, notificationId, input) => { inputObject(input, []); return store.get(auth.claims, objectId(notificationId), true); },
    readAll: (auth, input) => store.readAll(auth.claims, cutoff.open(auth.claims.sub, input)),
  };
}
