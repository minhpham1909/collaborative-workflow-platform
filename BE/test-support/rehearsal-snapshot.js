// Fixture-only rehearsal; not a production backup/restore CLI.
import { randomBytes, createCipheriv, createDecipheriv } from 'node:crypto';
import { gzipSync, gunzipSync } from 'node:zlib';
import mongoose from 'mongoose';

const { EJSON } = mongoose.mongo.BSON;
const magic = Buffer.from('WFBKP1');
const aad = Buffer.from('workflow-fixture-snapshot/v1');
export function sealSnapshot(snapshot, key) {
  if (!Buffer.isBuffer(key) || key.length !== 32) throw new Error('SNAPSHOT_KEY_REQUIRED');
  const iv = randomBytes(12), cipher = createCipheriv('aes-256-gcm', key, iv);
  cipher.setAAD(aad);
  const data = gzipSync(Buffer.from(EJSON.stringify(snapshot, { relaxed: false })));
  const encrypted = Buffer.concat([cipher.update(data), cipher.final()]);
  return Buffer.concat([magic, iv, cipher.getAuthTag(), encrypted]);
}
export function openSnapshot(buffer, key) {
  if (!Buffer.isBuffer(key) || key.length !== 32) throw new Error('SNAPSHOT_KEY_REQUIRED');
  if (!Buffer.isBuffer(buffer) || buffer.length < 35 || !buffer.subarray(0, 6).equals(magic)) throw new Error('INVALID_SNAPSHOT');
  const decipher = createDecipheriv('aes-256-gcm', key, buffer.subarray(6, 18));
  decipher.setAAD(aad); decipher.setAuthTag(buffer.subarray(18, 34));
  const payload = Buffer.concat([decipher.update(buffer.subarray(34)), decipher.final()]);
  const snapshot = EJSON.parse(gunzipSync(payload).toString('utf8'), { relaxed: false });
  if (Number(snapshot.formatVersion) !== 1 || !Array.isArray(snapshot.collections)) throw new Error('INVALID_SNAPSHOT');
  return snapshot;
}

export async function captureFixtureSnapshot(db, collectionNames) {
  if (!/^workflow_ops_source_[a-f0-9]{12}$/u.test(db.databaseName)) throw new Error('FIXTURE_SOURCE_REQUIRED');
  const collections = [];
  for (const name of collectionNames) {
    const indexes = (await db.collection(name).listIndexes().toArray()).filter(index => index.name !== '_id_').map(({ v: _v, ns: _ns, ...index }) => index);
    collections.push({ name, indexes, documents: [] });
  }
  const session = db.client.startSession();
  try {
    await session.withTransaction(async () => {
      for (const collection of collections) collection.documents = await db.collection(collection.name).find({}, { session }).sort({ _id: 1 }).toArray();
    }, { readConcern: { level: 'snapshot' }, writeConcern: { w: 'majority' } });
  } finally { await session.endSession(); }
  return { formatVersion: 1, createdAt: new Date(), collections };
}

export async function restoreFixtureSnapshot(db, snapshot, allowedNames) {
  if (!/^workflow_ops_restore_[a-f0-9]{12}$/u.test(db.databaseName)) throw new Error('FIXTURE_TARGET_REQUIRED');
  if ((await db.listCollections({}, { nameOnly: true }).toArray()).length) throw new Error('RESTORE_TARGET_NOT_EMPTY');
  const names = snapshot.collections.map(collection => collection.name);
  if (new Set(names).size !== allowedNames.length || names.length !== allowedNames.length || names.some(name => !allowedNames.includes(name))) throw new Error('SNAPSHOT_COLLECTIONS_MISMATCH');
  // Target is a throwaway empty DB. Restore is multi-step: failures leave it
  // quarantined; caller must not serve it and must choose a fresh target.
  for (const collection of snapshot.collections) {
    await db.createCollection(collection.name);
    if (collection.documents.length) await db.collection(collection.name).insertMany(collection.documents);
    if (collection.indexes.length) await db.collection(collection.name).createIndexes(collection.indexes);
  }
}

export const canonicalSnapshot = snapshot => EJSON.stringify(snapshot.collections, { relaxed: false });
