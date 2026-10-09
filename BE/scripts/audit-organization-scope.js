import mongoose from 'mongoose';
import { readConfig } from '../src/config.js';
import { connectDatabase } from '../src/database.js';
import { auditOrganizationScope } from '../src/organizations/scope-audit.js';

try {
  const config = readConfig();
  // This developer command must never accidentally target a remote/production dataset.
  if (config.nodeEnv !== 'development' || !['127.0.0.1', 'localhost', '[::1]'].includes(new URL(config.mongoUri).hostname)) throw new Error('Local development database required');
  await connectDatabase(config.mongoUri);
  const report = await auditOrganizationScope(mongoose.connection.db);
  console.info(JSON.stringify(report));
  if (!report.valid) process.exitCode = 1;
} catch {
  console.error('SCOPE_AUDIT_FAILED: local development replica set must be available; no data was changed');
  process.exitCode = 1;
} finally { await mongoose.disconnect(); }
