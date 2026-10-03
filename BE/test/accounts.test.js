import { test } from 'node:test';
import assert from 'node:assert/strict';
import { randomBytes, randomUUID } from 'node:crypto';
import { readFile, unlink } from 'node:fs/promises';
import { createMailProvider } from '../src/mail/provider.js';
import { createDeliveryCrypto } from '../src/auth/delivery-crypto.js';
import { createGoogleVerifier } from '../src/auth/google.js';

test('Capture provider creates a local preview and refuses production capture or missing SMTP', async () => {
  assert.throws(() => createMailProvider({ EMAIL_MODE: 'capture', NODE_ENV: 'production' }), /not configured/u);
  assert.throws(() => createMailProvider({ EMAIL_MODE: 'smtp', NODE_ENV: 'development' }), /not configured/u);
  const mail = { eventId: randomUUID(), to: 'test@example.com', purpose: 'verify_email', url: 'http://localhost:5173/verify-email#token=test-only' };
  const path = new URL(`../../.local/mail/${mail.eventId}.json`, import.meta.url);
  try {
    const send = createMailProvider({ EMAIL_MODE: 'capture', NODE_ENV: 'development' });
    await send(mail); await send(mail);
    assert.deepEqual(JSON.parse(await readFile(path, 'utf8')), mail);
  } finally { await unlink(path).catch((error) => { if (error.code !== 'ENOENT') throw error; }); }
});

test('Outbox encryption binds delivery data to its event and rejects tampering', () => {
  const crypto = createDeliveryCrypto(randomBytes(32).toString('hex'));
  const data = { token: randomBytes(32).toString('hex'), to: 'test@example.com' };
  const envelope = crypto.seal(data, 'event-one');
  assert.ok(!JSON.stringify(envelope).includes(data.token));
  assert.deepEqual(crypto.open(envelope, 'event-one'), data);
  assert.throws(() => crypto.open(envelope, 'event-two'));
  assert.throws(() => createDeliveryCrypto(randomBytes(32).toString('hex')).open(envelope, 'event-one'));
  assert.throws(() => crypto.open({ ...envelope, tag: Buffer.alloc(16).toString('base64') }, 'event-one'));
});

test('Google verification checks server claims and distinguishes external email authority', async () => {
  const time = new Date('2026-10-03T00:00:00Z');
  const seconds = time.getTime() / 1000;
  const claims = { iss: 'https://accounts.google.com', aud: 'client', iat: seconds - 10, exp: seconds + 60, nonce: 'nonce', sub: 'google-subject', email: 'user@gmail.com', email_verified: true, name: 'User', picture: 'https://example.com/avatar.png' };
  const verifier = createGoogleVerifier('client', { async verifyIdToken(input) { assert.deepEqual(input, { idToken: 'signed-token', audience: 'client' }); return { getPayload: () => claims }; } }, () => time);
  assert.equal((await verifier('signed-token', 'nonce')).authoritativeEmail, true);
  claims.email = 'user@example.com';
  assert.equal((await verifier('signed-token', 'nonce')).authoritativeEmail, false);
  claims.hd = 'example.com';
  assert.equal((await verifier('signed-token', 'nonce')).authoritativeEmail, true);
  for (const [field, bad] of [['iss', 'https://evil.example'], ['aud', 'other-client'], ['exp', seconds], ['iat', seconds + 1], ['sub', '']]) {
    const original = claims[field]; claims[field] = bad;
    await assert.rejects(verifier('signed-token', 'nonce'), /GOOGLE_CREDENTIAL_INVALID/u);
    claims[field] = original;
  }
  await assert.rejects(verifier('signed-token', 'wrong-nonce'), /GOOGLE_CREDENTIAL_INVALID/u);
  await assert.rejects(createGoogleVerifier('')('signed-token', 'nonce'), /GOOGLE_NOT_CONFIGURED/u);
});
