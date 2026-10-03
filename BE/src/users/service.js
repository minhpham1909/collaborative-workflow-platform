import { profileInput, preferencesInput } from './input.js';
import { userResponse } from '../auth/service.js';

export function createUsersService({ store, now = () => new Date() }) {
  async function update(auth, input) {
    const user = await store.updateOwn(auth.claims, input.expectedVersion, input.fields, now());
    return { user: userResponse(user) };
  }
  return {
    me: (auth) => ({ user: userResponse(auth.user) }),
    profile: (auth, input) => update(auth, profileInput(input)),
    preferences: (auth, input) => update(auth, preferencesInput(input)),
  };
}
