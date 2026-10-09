import { MongoBinary } from 'mongodb-memory-server-core';
import mongoose from 'mongoose';
import { spawn } from 'node:child_process';
import { mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { setTimeout } from 'node:timers/promises';
import net from 'node:net';

const data = fileURLToPath(new URL('../../.local/mongodb-dev/', import.meta.url));
const cache = fileURLToPath(new URL('../../.local/mongodb-binaries/', import.meta.url));
const port = Number(process.env.WORKFLOW_MONGODB_PORT ?? 27017);
if (!Number.isInteger(port) || port < 1024 || port > 65535) throw new Error('INVALID_WORKFLOW_MONGODB_PORT');
await new Promise((resolve, reject) => {
  const probe = net.createServer(); probe.once('error', reject);
  probe.listen(port, '127.0.0.1', () => probe.close(resolve));
});
await mkdir(data, { recursive: true }); await mkdir(cache, { recursive: true });
const binary = await MongoBinary.getPath({ version: '8.0.17', downloadDir: cache, checkMD5: true });
// Own only this child and this persistent project directory. Never clean the dbPath.
const child = spawn(binary, ['--port', String(port), '--dbpath', data, '--bind_ip', '127.0.0.1', '--replSet', 'rs0', '--storageEngine', 'wiredTiger', '--logpath', fileURLToPath(new URL('../../.local/mongodb-dev/mongod.log', import.meta.url)), '--logappend'], { windowsHide: true, stdio: ['ignore', 'ignore', 'inherit'] });
let stopping = false;
function stop() { if (stopping) return; stopping = true; child.kill(); }
process.once('SIGINT', stop); process.once('SIGTERM', stop);
child.once('error', () => { console.error('DEV_DATABASE_CHILD_FAILED'); stop(); });
child.once('exit', code => { if (!stopping) { process.exitCode = code || 1; console.error('DEV_DATABASE_EXITED'); } });
try {
  const client = new mongoose.mongo.MongoClient(`mongodb://127.0.0.1:${port}/?directConnection=true`, { serverSelectionTimeoutMS: 1000 });
  const deadline = Date.now() + 60_000;
  try {
    for (;;) {
      if (child.exitCode !== null) throw new Error('DEV_DATABASE_EXITED');
      try { await client.connect(); break; }
      catch { if (Date.now() >= deadline) throw new Error('DEV_DATABASE_START_TIMEOUT'); await setTimeout(500); }
    }
    const admin = client.db('admin');
    let config;
    try { config = (await admin.command({ replSetGetConfig: 1 })).config; }
    catch (error) { if (error.code !== 94) throw error; }
    const host = `127.0.0.1:${port}`;
    if (!config) await admin.command({ replSetInitiate: { _id: 'rs0', members: [{ _id: 0, host }] } });
    else {
      if (config._id !== 'rs0' || config.members.length !== 1) throw new Error('DEV_DATABASE_EXPECTS_SINGLE_MEMBER_RS0');
      if (config.members[0].host !== host) {
        config.members[0].host = host; config.version++;
        await admin.command({ replSetReconfig: config, force: true });
      }
    }
    while (!(await admin.command({ hello: 1 })).isWritablePrimary) {
      if (Date.now() >= deadline) throw new Error('DEV_DATABASE_PRIMARY_TIMEOUT');
      await setTimeout(500);
    }
    console.log(`Local development MongoDB ready: mongodb://127.0.0.1:${port}/workflow_dev?replicaSet=rs0`);
    console.log('Persistent project data retained; stop only this child with Ctrl+C. No mail/purge worker started.');
  } finally { await client.close(); }
} catch (error) { stop(); throw error; }
