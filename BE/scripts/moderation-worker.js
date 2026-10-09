import mongoose from 'mongoose';
import { setTimeout as delay } from 'node:timers/promises';
import { readConfig } from '../src/config.js';
import { connectDatabase } from '../src/database.js';
import { runCommentCleanup } from '../src/moderation/cleanup.js';

let stopping = false;
const abort = new AbortController();
const stop = () => { stopping = true; abort.abort(); };
process.once('SIGINT', stop); process.once('SIGTERM', stop);
try {
  await connectDatabase(readConfig().mongoUri);
  console.info('MODERATION_WORKER_STARTED: processes confirmed cleanup jobs; no email delivery');
  while (!stopping) {
    const result = await runCommentCleanup();
    if (['idle', 'retry_or_failed', 'lease_lost'].includes(result.state)) {
      try { await delay(result.state === 'retry_or_failed' ? 5000 : 1000, undefined, { signal: abort.signal }); }
      catch { if (!stopping) throw new Error('Worker delay failed'); }
    }
  }
} catch { if (!stopping) { console.error('MODERATION_WORKER_FAILED'); process.exitCode = 1; } }
finally { await mongoose.disconnect(); }
