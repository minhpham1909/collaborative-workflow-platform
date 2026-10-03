import mongoose from 'mongoose';
import { setTimeout as delay } from 'node:timers/promises';
import { readConfig, readAuthConfig } from '../src/config.js';
import { connectDatabase } from '../src/database.js';
import { createMailProvider } from '../src/mail/provider.js';
import { createMailDispatcher } from '../src/mail/dispatcher.js';
import { assertAuthIndexes } from '../src/auth/index-check.js';
import { assertWorkspaceIndexes } from '../src/workspaces/index-check.js';
let stopping = false; const abort = new AbortController();
const stop = () => { stopping = true; abort.abort(); };
process.once('SIGINT', stop); process.once('SIGTERM', stop);
try {
  const config = readAuthConfig(); const send = createMailProvider();
  await connectDatabase(readConfig().mongoUri); await assertAuthIndexes(); await assertWorkspaceIndexes();
  const dispatch = createMailDispatcher({ config, send });
  console.info('MAIL_WORKER_STARTED');
  while (!stopping) {
    const result = await dispatch();
    if (result.state !== 'idle') console.info(`Mail worker: ${result.state}`);
    if (result.state === 'idle') { try { await delay(3000, undefined, { signal: abort.signal }); } catch (error) { if (error.name !== 'AbortError') throw error; } }
  }
} catch { console.error('MAIL_WORKER_FAILED: check database and email configuration'); process.exitCode = 1; }
finally { await mongoose.disconnect(); }
