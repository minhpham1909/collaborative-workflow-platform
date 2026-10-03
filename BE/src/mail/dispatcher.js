import { dispatchAuthMail } from './auth-mail.js';
import { dispatchInvitationMail } from './invitation-mail.js';
import { dispatchWorkMail } from './work-mail.js';
export function createMailDispatcher(options) {
  const dispatchers = [dispatchAuthMail, dispatchInvitationMail, dispatchWorkMail];
  let next = 0;
  return async () => {
    for (let attempt = 0; attempt < dispatchers.length; attempt++) {
      const current = next; next = (next + 1) % dispatchers.length;
      const result = await dispatchers[current](options);
      if (result.state !== 'idle') return result;
    }
    return { state: 'idle' };
  };
}
