import { test } from 'node:test';
import assert from 'node:assert/strict';
import { randomBytes } from 'node:crypto';
import mongoose from 'mongoose';
import { sealSnapshot, openSnapshot, restoreFixtureSnapshot } from '../test-support/rehearsal-snapshot.js';

test('Fixture snapshot round-trips BSON IDs/dates and rejects wrong keys/tampering', () => {
  const key = randomBytes(32), id = new mongoose.Types.ObjectId(), at = new Date();
  const original = { formatVersion: 1, collections: [{ name: 'tasks', indexes: [], documents: [{ _id: id, createdAt: at, passwordHash: 'fixture-only-secret' }] }] };
  const sealed = sealSnapshot(original, key), decoded = openSnapshot(sealed, key);
  assert.equal(decoded.collections[0].documents[0]._id.toString(), id.toString());
  assert.deepEqual(decoded.collections[0].documents[0].createdAt, at);
  assert.ok(!sealed.includes(Buffer.from('fixture-only-secret')));
  assert.throws(() => openSnapshot(sealed, randomBytes(32)));
  const corrupted = Buffer.from(sealed); corrupted[corrupted.length - 1] ^= 1;
  assert.throws(() => openSnapshot(corrupted, key));
  assert.throws(() => openSnapshot(sealed, null), /SNAPSHOT_KEY_REQUIRED/u);
});
test('Fixture restore refuses dev/production DB names before accessing data', async () => {
  await assert.rejects(restoreFixtureSnapshot({ databaseName: 'workflow_dev' }, {}, []), /FIXTURE_TARGET_REQUIRED/u);
});
