import mongoose from 'mongoose';
import { readConfig } from '../src/config.js';
import { connectDatabase } from '../src/database.js';
import { runCommentCleanup } from '../src/moderation/cleanup.js';

try {
  await connectDatabase(readConfig().mongoUri);
  const result = await runCommentCleanup();
  console.info(`Moderation cleanup: ${result.state}, deleted=${result.deletedCount ?? 0}`);
} catch { console.error('MODERATION_WORKER_FAILED'); process.exitCode = 1; }
finally { await mongoose.disconnect(); }
