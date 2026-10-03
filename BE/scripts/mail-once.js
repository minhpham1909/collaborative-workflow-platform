import mongoose from 'mongoose';
import { readConfig, readAuthConfig } from '../src/config.js';
import { connectDatabase } from '../src/database.js';
import { createMailProvider } from '../src/mail/provider.js';
import { dispatchAuthMail } from '../src/mail/auth-mail.js';
import { dispatchInvitationMail } from '../src/mail/invitation-mail.js';

try {
  const config = readAuthConfig(); const send = createMailProvider();
  await connectDatabase(readConfig().mongoUri);
  let result = await dispatchAuthMail({ config, send });
  if (result.state === 'idle') result = await dispatchInvitationMail({ config, send });
  console.info(`Auth email worker: ${result.state}`); // No recipient/link/token/credential logs.
} catch { console.error('AUTH_MAIL_WORKER_FAILED: check database and email configuration'); process.exitCode = 1; }
finally { await mongoose.disconnect(); }
