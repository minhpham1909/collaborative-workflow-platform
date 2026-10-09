// C6-B isolated rehearsal. Never reads .env/MONGODB_URI or connects to dev.
import assert from 'node:assert/strict';
import { randomBytes } from 'node:crypto';
import { performance } from 'node:perf_hooks';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { MongoMemoryReplSet } from 'mongodb-memory-server-core';
import mongoose from 'mongoose';
import { connectDatabase } from '../src/database.js';
import { models, User, Workspace, WorkspaceMembership, Project, Task, TaskComment, TaskPurgeAudit } from '../src/models/index.js';
import { hashPassword } from '../src/auth/passwords.js';
import { createAuthService } from '../src/auth/service.js';
import { createMongoAuthStore } from '../src/auth/mongo-store.js';
import { createWorkService } from '../src/work/service.js';
import { createMongoWorkStore } from '../src/work/mongo-store.js';
import { testConfig } from '../test-support/auth-store.js';
import { emptyRichText } from '../src/content/rich-text.js';
import { auditTaskCodes, backfillTaskCodes } from '../src/work/task-codes.js';
import { runTaskRetention } from '../src/work/retention.js';
import { captureFixtureSnapshot, sealSnapshot, openSnapshot, restoreFixtureSnapshot, canonicalSnapshot } from '../test-support/rehearsal-snapshot.js';

if (process.argv.length > 2) throw new Error('REHEARSAL_TAKES_NO_DATABASE_ARGUMENTS');
const nonce = randomBytes(6).toString('hex'), sourceName = `workflow_ops_source_${nonce}`, targetName = `workflow_ops_restore_${nonce}`;
const cache = fileURLToPath(new URL('../../.local/mongodb-binaries/', import.meta.url));
const artifacts = fileURLToPath(new URL('../../.local/core-operations/', import.meta.url));
await mkdir(cache, { recursive: true }); await mkdir(artifacts, { recursive: true });
const repl = await MongoMemoryReplSet.create({ binary: { version: '8.0.17', downloadDir: cache, checkMD5: true }, replSet: { count: 1, storageEngine: 'wiredTiger', ip: '127.0.0.1' } });
const report = { generatedAt: new Date().toISOString(), fixtureOnly: true, devDatabaseAccessed: false, providersCalled: false, backup: {}, benchmarks: [] };
const runLabel = `run-${nonce}`;
const round = value => Math.round(value * 100) / 100;
let targetClient;
try {
  await connectDatabase(repl.getUri(sourceName));
  const config = testConfig(), password = 'Isolated operations fixture password';
  for (const model of Object.values(models)) await model.createIndexes();
  const user = new User({ displayName: 'Ops Fixture', email: `${nonce}@example.com`, passwordHash: await hashPassword(password), emailVerifiedAt: new Date(), termsAcceptance: { version: 'test', acceptedAt: new Date() } });
  await user.save();
  const auth = await createAuthService({ store: createMongoAuthStore(), config });
  const login = await auth.login({ email: user.email, password }), identity = await auth.authenticate(login.accessToken);
  const workspace = new Workspace({ name: 'Backup fixture', ownerId: user._id }); await workspace.save();
  await new WorkspaceMembership({ workspaceId: workspace._id, userId: user._id, joinedAt: new Date() }).save();
  const project = new Project({ workspaceId: workspace._id, createdBy: user._id, name: 'Recovery fixture' }); await project.save();
  const service = createWorkService({ store: createMongoWorkStore({ config }) });
  let task = (await service.createTask(identity, String(project._id), { title: 'Recover work', assigneeId: String(user._id), priority: 'high' })).task;
  await service.createComment(identity, task.id, { content: { ...emptyRichText(), document: { type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Recover comment' }] }] } } });
  task = (await service.status(identity, task.id, { expectedVersion: task.version, status: 'done' })).task;
  const legacyId = new mongoose.Types.ObjectId(), legacyTime = new Date(Date.now() - 86400_000);
  await Task.collection.insertOne({ _id: legacyId, workspaceId: workspace._id, projectId: project._id, createdBy: user._id, assigneeId: null, title: 'Legacy Done', description: emptyRichText(), searchText: 'legacy done', status: 'done', dueAt: null, deletedAt: null, deletedBy: null, createdAt: legacyTime, updatedAt: legacyTime, version: 0 });
  const names = Object.values(models).map(model => model.collection.name);
  const started = performance.now();
  const original = await captureFixtureSnapshot(mongoose.connection.db, names);
  const key = randomBytes(32), file = `${artifacts}/fixture-${nonce}.wfb`;
  const sealed = sealSnapshot(original, key); await writeFile(file, sealed);
  const reopened = openSnapshot(await readFile(file), key);
  assert.equal(canonicalSnapshot(reopened), canonicalSnapshot(original));
  const tampered = Buffer.from(sealed); tampered[tampered.length - 1] ^= 1;
  assert.throws(() => openSnapshot(tampered, key)); assert.throws(() => openSnapshot(sealed, randomBytes(32)));
  targetClient = new mongoose.mongo.MongoClient(repl.getUri(targetName)); await targetClient.connect();
  await restoreFixtureSnapshot(targetClient.db(targetName), reopened, names);
  await assert.rejects(restoreFixtureSnapshot(targetClient.db(targetName), reopened, names), /RESTORE_TARGET_NOT_EMPTY/u);
  await mongoose.disconnect(); await connectDatabase(repl.getUri(targetName));
  // Capture using the source-name guard on a connection to this fixture's target
  // is intentionally not allowed; verify restored rows/indexes directly.
  for (const collection of original.collections) {
    const rows = await mongoose.connection.db.collection(collection.name).find({}).sort({ _id: 1 }).toArray();
    assert.equal(mongoose.mongo.BSON.EJSON.stringify(rows, { relaxed: false }), mongoose.mongo.BSON.EJSON.stringify(collection.documents, { relaxed: false }));
    const indexes = (await mongoose.connection.db.collection(collection.name).listIndexes().toArray()).filter(index => index.name !== '_id_').map(({ v: _v, ns: _ns, ...index }) => index);
    assert.deepEqual(indexes, collection.indexes);
  }
  const restoredAuth = await createAuthService({ store: createMongoAuthStore(), config });
  const restoredIdentity = await restoredAuth.authenticate(login.accessToken);
  const restoredService = createWorkService({ store: createMongoWorkStore({ config }) });
  const recovered = (await restoredService.getTask(restoredIdentity, task.id)).task;
  assert.equal(recovered.title, task.title); assert.equal(recovered.code, task.code); assert.equal(recovered.status, 'done'); assert.deepEqual(recovered.completedAt, task.completedAt);
  assert.equal((await restoredService.comments(restoredIdentity, task.id, {})).total, 1);
  assert.equal((await auditTaskCodes()).problems.length, 0);
  assert.equal(await backfillTaskCodes(project._id), 1); assert.equal(await backfillTaskCodes(project._id), 0);
  const migrated = await Task.collection.findOne({ _id: legacyId }); assert.deepEqual(migrated.updatedAt, legacyTime); assert.equal(migrated.completedAt, undefined);
  // Recovery target is private. Quarantine any restored delivery state before
  // validating workers; never bootstrap a live provider on restored data.
  assert.equal(await models.EmailOutbox.collection.countDocuments({ state: 'processing' }), 0);
  report.backup = { collections: names.length, documents: original.collections.reduce((total, entry) => total + entry.documents.length, 0), encryptedBytes: sealed.length,
    elapsedMs: round(performance.now() - started), exactBsonAndIndexes: true, authenticatedReadAfterRestore: true, tamperAndWrongKeyRejected: true, nonemptyTargetRejected: true, migrationIdempotent: true };
  // Rollback rehearsal: a second fresh target restored from the pre-migration
  // snapshot contains no new code/time for the legacy row.
  const rollbackName = `workflow_ops_restore_${randomBytes(6).toString('hex')}`;
  await restoreFixtureSnapshot(targetClient.db(rollbackName), reopened, names);
  const rolledBack = await targetClient.db(rollbackName).collection('tasks').findOne({ _id: legacyId });
  assert.equal(rolledBack.code, undefined); assert.equal(rolledBack.completedAt, undefined); assert.equal(rolledBack.version, 0);
  report.backup.rollbackFreshTargetVerified = true;

  async function timed(name, size, operation, samples = 12) {
    for (let i = 0; i < 2; i++) await operation();
    const times = [];
    for (let i = 0; i < samples; i++) { const at = performance.now(); await operation(); times.push(performance.now() - at); }
    times.sort((a, b) => a - b);
    report.benchmarks.push({ name, tasks: size, samples, concurrency: 1, medianMs: round(times[Math.floor(times.length / 2)]), p95Ms: round(times[Math.ceil(times.length * .95) - 1]), maxMs: round(times.at(-1)) });
  }
  for (const size of [100, 1000, 3000]) {
    const ws = new Workspace({ name: `Scale ${size}`, ownerId: user._id }); await ws.save();
    await new WorkspaceMembership({ workspaceId: ws._id, userId: user._id, joinedAt: new Date() }).save();
    const prefix = randomBytes(3).toString('hex').toUpperCase(), p = new Project({ name: `Scale Project ${size}`, workspaceId: ws._id, createdBy: user._id, taskPrefix: prefix, taskSequence: size }); await p.save();
    const at = new Date(), minute = new Date(Math.floor(at.getTime() / 60_000) * 60_000);
    const rows = Array.from({ length: size }, (_, index) => ({ ...new Task({ workspaceId: ws._id, projectId: p._id, createdBy: user._id, assigneeId: user._id, title: `Item ${index}${index % 20 === 0 ? ' needle' : ''}`, code: `WF-${prefix}-${index + 1}`, priority: index % 3 === 0 ? 'high' : 'medium', status: ['todo', 'in_progress', 'done'][index % 3] }).toObject(),
      searchText: `item ${index}${index % 20 === 0 ? ' needle' : ''}`, completedAt: index % 3 === 2 ? minute : null, dueAt: minute, createdAt: new Date(at.getTime() - index * 1000), updatedAt: at }));
    await Task.collection.insertMany(rows); // Controlled fixture seeding, not a production import.
    const pid = String(p._id), query = { limit: '12' };
    await timed('tasks_first_page', size, () => restoredService.tasks(restoredIdentity, pid, query));
    await timed('board_first_page', size, () => restoredService.board(restoredIdentity, pid, query));
    await timed('my_tasks_first_page', size, () => restoredService.mine(restoredIdentity, { ...query, workspaceId: String(ws._id) }));
    await timed('literal_search', size, () => restoredService.tasks(restoredIdentity, pid, { ...query, q: 'needle' }));
    await timed('whole_project_statistics', size, () => restoredService.statistics(restoredIdentity, pid, {}));
    const page = await restoredService.tasks(restoredIdentity, pid, query); assert.equal(page.items.length, 12); assert.equal(page.total, size); assert.ok(page.nextCursor);
    const next = await restoredService.tasks(restoredIdentity, pid, { ...query, cursor: page.nextCursor }); assert.ok(next.items.every(item => !page.items.some(previous => previous.id === item.id)));
    const parallel = [], parallelStart = performance.now();
    for (let batch = 0; batch < 3; batch++) await Promise.all(Array.from({ length: 5 }, async () => { const start = performance.now(); await restoredService.tasks(restoredIdentity, pid, query); parallel.push(performance.now() - start); }));
    parallel.sort((a, b) => a - b); report.benchmarks.push({ name: 'tasks_parallel_same_account', tasks: size, concurrency: 5, samples: parallel.length, p95Ms: round(parallel[Math.ceil(parallel.length * .95) - 1]), elapsedMs: round(performance.now() - parallelStart) });
    const explain = await Task.collection.find({ projectId: p._id, workspaceId: ws._id, deletedAt: null }).sort({ createdAt: -1, _id: -1 }).limit(12).explain('executionStats');
    assert.equal(explain.executionStats.nReturned, 12);
    assert.ok(explain.executionStats.totalDocsExamined <= 13, 'First page must use chronological index instead of scanning the Project');
    report.benchmarks.push({ name: 'tasks_query_plan', tasks: size, returned: explain.executionStats.nReturned, docsExamined: explain.executionStats.totalDocsExamined, keysExamined: explain.executionStats.totalKeysExamined, plan: explain.queryPlanner.winningPlan });
  }
  const current = new Date(), expiredAt = new Date(current.getTime() - 30 * 86400_000);
  const purgeProject = new Project({ name: 'Worker batch fixture', workspaceId: workspace._id, createdBy: user._id, taskPrefix: 'F00BAA', taskSequence: 20 }); await purgeProject.save();
  const toPurge = Array.from({ length: 20 }, (_, index) => ({ ...new Task({ workspaceId: workspace._id, projectId: purgeProject._id, createdBy: user._id, title: 'Expired fixture', code: `WF-F00BAA-${index + 1}`, deletedAt: expiredAt, deletedBy: user._id, purgeAt: current }).toObject(), createdAt: expiredAt, updatedAt: expiredAt }));
  await Task.collection.insertMany(toPurge);
  const commentContent = { ...emptyRichText(), document: { type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Worker fixture' }] }] }, plainText: 'Worker fixture' };
  await TaskComment.collection.insertMany(toPurge.flatMap(task => Array.from({ length: 3 }, () => ({ ...new TaskComment({ workspaceId: workspace._id, taskId: task._id, authorId: user._id, content: commentContent }).toObject(), createdAt: expiredAt, updatedAt: expiredAt }))));
  const workerStart = performance.now(), result = await runTaskRetention({ now: () => current, limit: 20 });
  assert.equal(result.purged, 20); assert.equal(result.failed, 0); assert.equal(await TaskComment.collection.countDocuments({ taskId: { $in: toPurge.map(task => task._id) } }), 0);
  assert.equal(await TaskPurgeAudit.collection.countDocuments({ projectId: purgeProject._id }), 20);
  report.retention = { tasks: 20, commentsPerTask: 3, elapsedMs: round(performance.now() - workerStart), result: { selected: result.selected, purged: result.purged, failed: result.failed }, unaffectedTasks: await Task.collection.countDocuments({ projectId: project._id }) };
  report.limits = ['local single-member replica set', 'service/store timing includes auth/scope transaction and DTO; excludes HTTP/TLS', 'small sample/warm cache, no agreed production SLA', 'parallel callers share account/Workspace locks', 'AES key kept only in memory; saved fixture snapshot cannot be reused after this process', 'production snapshot/managed backup and key custody not covered'];
  await writeFile(`${artifacts}/${runLabel}-report.json`, JSON.stringify(report, null, 2));
  await writeFile(`${artifacts}/latest-report.json`, JSON.stringify(report, null, 2));
  console.log(JSON.stringify({ state: 'pass', report: `${artifacts}/latest-report.json`, backup: report.backup, retention: report.retention, benchmarkEntries: report.benchmarks.length }));
} finally {
  await targetClient?.close(); await mongoose.disconnect(); await repl.stop();
}
