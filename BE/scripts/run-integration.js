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
  const child = spawn(process.execPath, ['--test', ...(files.length ? files : ['test/auth-mongo.test.js', 'test/accounts-mongo.test.js', 'test/users-mongo.test.js', 'test/workspaces-mongo.test.js', 'test/work-mongo.test.js'])], {
    cwd: fileURLToPath(new URL('../', import.meta.url)), stdio: 'inherit',
    env: { ...process.env, TEST_MONGODB_URI: repl.getUri('workflow_auth_test') },
  });
  process.exitCode = await new Promise((resolve, reject) => { child.once('error', reject); child.once('exit', (code) => resolve(code ?? 1)); });
} finally { await repl.stop(); }
