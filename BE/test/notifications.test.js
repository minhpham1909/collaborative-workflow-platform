import { test } from 'node:test';
import assert from 'node:assert/strict';
import { randomBytes, randomUUID } from 'node:crypto';
import { readFile, unlink } from 'node:fs/promises';
import { cutoffCodec, inboxQuery } from '../src/notifications/input.js';
import { mailContent, createMailProvider } from '../src/mail/provider.js';
test('Inbox query and signed read-all cutoff reject scope forgery', () => {
  const codec = cutoffCodec(randomBytes(32).toString('hex')); const sub = 'a'.repeat(24);
  const token = codec.seal(sub, { createdAt: new Date(), _id: 'b'.repeat(24) }, 'work');
  assert.equal(codec.open(sub, { cutoff: token }).category, 'work');
  assert.throws(() => codec.open('c'.repeat(24), { cutoff: token }));
  assert.throws(() => codec.open(sub, { cutoff: token + 'x' }));
  assert.throws(() => codec.open(sub, { cutoff: token, recipientId: sub }));
  for (const query of [{ read: 'yes' }, { category: 'auth' }, { recipientId: sub }, { limit: '101' }]) assert.throws(() => inboxQuery(query));
});
test('Work email templates expose only enabled event descriptions in vi/en', () => {
  const mail = { purpose: 'work', locale: 'en', eventTypes: ['assignment'], taskTitle: 'Task', workspaceName: 'Team', previousStatus: 'SECRET_OLD', status: 'SECRET_NEW', url: 'https://example.com/tasks/1' };
  const english = mailContent(mail); assert.ok(english.text.includes('Assignment changed')); assert.ok(!english.text.includes('SECRET'));
  assert.ok(mailContent({ ...mail, locale: 'vi' }).text.includes('Thay đổi phân công'));
});
test('Capture distinguishes two recipients of the same event and dedupes each delivery', async () => {
  const send = createMailProvider({ EMAIL_MODE: 'capture', NODE_ENV: 'development' }); const eventId = randomUUID();
  const mails = [0, 1].map((index) => ({ eventId, deliveryKey: randomBytes(12).toString('hex'), to: `test-${index}@example.com`, purpose: 'work' }));
  const paths = mails.map((mail) => new URL(`../../.local/mail/${eventId}-${mail.deliveryKey}.json`, import.meta.url));
  try {
    for (let index = 0; index < mails.length; index++) { await send(mails[index]); await send(mails[index]); assert.equal(JSON.parse(await readFile(paths[index], 'utf8')).to, mails[index].to); }
  } finally { for (const path of paths) await unlink(path).catch((error) => { if (error.code !== 'ENOENT') throw error; }); }
});
