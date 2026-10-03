import mongoose from 'mongoose';
import { readConfig, readAuthConfig } from '../src/config.js';
import { connectDatabase } from '../src/database.js';
import { createMailProvider } from '../src/mail/provider.js';
import { createMailDispatcher } from '../src/mail/dispatcher.js';

try {
  const config = readAuthConfig(); const send = createMailProvider();
  await connectDatabase(readConfig().mongoUri);
  const result = await createMailDispatcher({ config, send })();
  console.info(`Mail worker: ${result.state}`); // No recipient/link/token/credential logs.
} catch { console.error('MAIL_WORKER_FAILED: check database and email configuration'); process.exitCode = 1; }
finally { await mongoose.disconnect(); }
