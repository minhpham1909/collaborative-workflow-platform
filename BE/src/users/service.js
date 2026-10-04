import { profileInput, preferencesInput } from './input.js';
import { userResponse } from '../auth/service.js';

export function createUsersService({ store, now = () => new Date() }) {
  async function update(auth, input) {
    const user = await store.updateOwn(auth.claims, input.expectedVersion, input.fields, now());
    return { user: userResponse(user) };
  }
  return {
    me: async (auth) => {
      const data = await store.ownAccount(auth.claims, now());
      return { user: userResponse(data.user), account: data.account };
    },
    profile: (auth, input) => update(auth, profileInput(input)),
    preferences: (auth, input) => update(auth, preferencesInput(input)),
  };
}
