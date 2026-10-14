import { MongoMemoryReplSet } from 'mongodb-memory-server-core';
import { spawn } from 'node:child_process';
import { mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

const cache = fileURLToPath(new URL('../../.local/mongodb-binaries/', import.meta.url));
await mkdir(cache, { recursive: true });
const repl = await MongoMemoryReplSet.create({
  binary: { version: '8.0.17', downloadDir: cache, checkMD5: true },
  replSet: { count: 1, storageEngine: 'wiredTiger', ip: '127.0.0.1' },
});
try {
  const files = process.argv.slice(2);
  // Dispatchers claim the shared test outbox; file isolation prevents cross-suite deliveries.
  const child = spawn(process.execPath, ['--test', '--test-concurrency=1', ...(files.length ? files : ['test/workspace-only-reopen-mongo.test.js', 'test/workspace-only-project-access-mongo.test.js', 'test/workspace-only-access-mongo.test.js', 'test/dev-business-reset-mongo.test.js', 'test/workspace-only-inventory-mongo.test.js', 'test/auth-mongo.test.js', 'test/accounts-mongo.test.js', 'test/users-mongo.test.js', 'test/workspaces-mongo.test.js', 'test/work-mongo.test.js', 'test/notifications-mongo.test.js', 'test/organizations-mongo.test.js', 'test/organization-lifecycle-mongo.test.js', 'test/project-access-mongo.test.js', 'test/moderation-mongo.test.js', 'test/task-enrichment-mongo.test.js', 'test/reopen-mongo.test.js', 'test/retention-mongo.test.js', 'test/core-e2e-mongo.test.js', 'test/project-pins-mongo.test.js', 'test/calendar-mongo.test.js'])], {
    cwd: fileURLToPath(new URL('../', import.meta.url)), stdio: 'inherit',
    env: { ...process.env, TEST_MONGODB_URI: repl.getUri('workflow_auth_test') },
  });
  process.exitCode = await new Promise((resolve, reject) => { child.once('error', reject); child.once('exit', (code) => resolve(code ?? 1)); });
} finally { await repl.stop(); }
