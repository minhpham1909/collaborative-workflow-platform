import mongoose from 'mongoose';
import { setTimeout } from 'node:timers/promises';
import { connectDatabase } from '../src/database.js';
import { readConfig } from '../src/config.js';
import { runTaskRetention } from '../src/work/retention.js';
let stopping = false;
let after = null;
process.on('SIGINT', () => { stopping = true; }); process.on('SIGTERM', () => { stopping = true; });
try {
  await connectDatabase(readConfig().mongoUri);
  while (!stopping) { const result = await runTaskRetention({ after }); after = result.nextCursor; console.log(JSON.stringify(result)); if (!stopping) await setTimeout(5000); }
} finally { await mongoose.disconnect(); }
