import { MongoMemoryReplSet } from 'mongodb-memory-server-core';
import { mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

const data = fileURLToPath(new URL('../../.local/mongodb-dev/', import.meta.url));
const cache = fileURLToPath(new URL('../../.local/mongodb-binaries/', import.meta.url));
await mkdir(data, { recursive: true }); await mkdir(cache, { recursive: true });
const repl = await MongoMemoryReplSet.create({
  binary: { version: '8.0.17', downloadDir: cache, checkMD5: true },
  instanceOpts: [{ port: 27017, dbPath: data }],
  replSet: { name: 'rs0', count: 1, storageEngine: 'wiredTiger', ip: '127.0.0.1' },
});
console.log('Local development MongoDB ready: mongodb://127.0.0.1:27017/workflow_dev?replicaSet=rs0');
console.log('Development only, localhost without authentication. Data persists under ignored .local/mongodb-dev. Ctrl+C stops MongoDB.');
let stopping = false;
async function stop() { if (stopping) return; stopping = true; await repl.stop({ doCleanup: false }); }
process.once('SIGINT', stop); process.once('SIGTERM', stop);
