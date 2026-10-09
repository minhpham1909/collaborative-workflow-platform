import mongoose from 'mongoose';
import { connectDatabase } from '../src/database.js';
import { Project } from '../src/models/index.js';
import { auditTaskCodes, backfillTaskCodes } from '../src/work/task-codes.js';

const args = process.argv.slice(2);
if (args.some(arg => arg !== '--apply')) throw new Error('Use no arguments for audit, or --apply for migration');
if (!process.env.MONGODB_URI) throw new Error('MONGODB_URI_REQUIRED');
await connectDatabase(process.env.MONGODB_URI);
try {
  const audit = await auditTaskCodes();
  console.log(JSON.stringify({ mode: args.includes('--apply') ? 'apply' : 'audit', ...audit }));
  if (audit.problems.length) { process.exitCode = 1; }
  else if (args.includes('--apply')) {
    // Creation is additive; never sync/drop existing indexes.
    await Project.createIndexes();
    const { Task } = await import('../src/models/index.js'); await Task.createIndexes();
    let assigned = 0;
    for await (const project of Project.collection.find({})) {
      let batch;
      do { batch = await backfillTaskCodes(project._id); assigned += batch; } while (batch === 100);
    }
    console.log(JSON.stringify({ assigned, ...await auditTaskCodes() }));
  }
} finally { await mongoose.disconnect(); }
