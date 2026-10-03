import { test } from 'node:test';
import assert from 'node:assert/strict';
import mongoose from 'mongoose';
import { randomBytes } from 'node:crypto';
import { connectDatabase } from '../src/database.js';
import { User, Session } from '../src/models/index.js';
import { createMongoAuthStore } from '../src/auth/mongo-store.js';
import { createAuthService } from '../src/auth/service.js';
import { hashPassword } from '../src/auth/passwords.js';
import { testConfig } from '../test-support/auth-store.js';

test('Mongo replica-set integration: login transaction, rotate, committed replay revocation and unique email index', {
  skip: !process.env.TEST_MONGODB_URI && 'TEST_MONGODB_URI not configured; no live DB coverage', timeout: 30_000,
}, async () => {
  const uri = process.env.TEST_MONGODB_URI;
  const databaseName = new URL(uri).pathname.slice(1);
  if (databaseName !== 'workflow_auth_test') throw new Error('Integration tests require the dedicated workflow_auth_test database');
  await connectDatabase(uri);
  const userId = new mongoose.Types.ObjectId();
  try {
    await User.createIndexes(); await Session.createIndexes();
    const password = 'integration test password';
    const email = `auth-test-${randomBytes(8).toString('hex')}@example.com`;
    await new User({ _id: userId, displayName: 'Auth Test', email, passwordHash: await hashPassword(password), emailVerifiedAt: new Date(), termsAcceptance: { version: 'test-only', acceptedAt: new Date() } }).save();
    await assert.rejects(new User({ displayName: 'Duplicate', email, termsAcceptance: { version: 'test-only', acceptedAt: new Date() } }).save(), (error) => error.code === 11000);
    const service = await createAuthService({ store: createMongoAuthStore(), config: testConfig() });
    const first = await service.login({ email, password });
    const next = await service.refresh(first.refreshToken);
    assert.equal((await service.authenticate(next.accessToken)).user._id.toString(), userId.toString());
    await assert.rejects(service.refresh(first.refreshToken), /REFRESH_REUSED/u);
    await assert.rejects(service.authenticate(next.accessToken), /UNAUTHENTICATED/u);
    const record = await Session.collection.findOne({ userId });
    assert.equal(record.refreshGeneration, 1);
    assert.equal(record.revokeReason, 'refresh_reuse');
    assert.ok(record.revokedAt instanceof Date);
  } finally {
    // Only delete records belonging to this generated fixture; never drop a database.
    await Session.collection.deleteMany({ userId });
    await User.collection.deleteOne({ _id: userId });
    await mongoose.disconnect();
  }
});
