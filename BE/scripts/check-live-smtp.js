// Opt-in, exactly one SMTP message. No database, dispatcher, queue or worker imports.
import { randomUUID } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { createMailProvider, mailContent } from '../src/mail/provider.js';

const args = process.argv.slice(2);
const preview = args.length === 1 && args[0] === '--preview';
const recipient = args.length === 2 && args[0] === '--send-to' ? args[1] : null;
if (!preview && !recipient) throw new Error('Use --preview or --send-to ONE_EMAIL');
if (recipient && !/^[^\s@,;<>]+@[^\s@,;<>]+\.[^\s@,;<>]+$/u.test(recipient)) throw new Error('ONE_RECIPIENT_REQUIRED');
if (process.env.EMAIL_MODE !== 'smtp') throw new Error('SMTP_MODE_REQUIRED');
const web = new URL(process.env.WEB_ORIGIN);
if (!['http:', 'https:'].includes(web.protocol) || web.origin !== process.env.WEB_ORIGIN) throw new Error('WEB_ORIGIN_INVALID');
const send = createMailProvider();
const runId = randomUUID();
const mail = {
  eventId: runId,
  to: recipient,
  purpose: 'work',
  locale: 'vi',
  workspaceName: `[KIỂM THỬ SMTP S12 — ${runId.slice(0, 8)}]`,
  taskTitle: 'Đây là email kiểm thử Workflow, không phải thông báo của Task thật. Nếu nhận được thư, hãy báo lại mã kiểm thử và thư nằm ở Inbox hay Spam.',
  eventTypes: [],
  url: `${web.origin}/#home`,
};
if (preview) {
  console.info(JSON.stringify({ state: 'preview', subject: mailContent(mail).subject, purpose: 'smtp-smoke', usesDatabase: false, sends: 0 }));
} else {
  const directory = fileURLToPath(new URL('../../.local/s12-smtp/', import.meta.url));
  await mkdir(directory, { recursive: true });
  const path = directory + runId + '.json';
  const report = { runId, startedAt: new Date().toISOString(), state: 'attempting', attempts: 1, databaseAccessed: false, devQueueProcessed: false, inboxConfirmed: false };
  // Persist intent before sending. A lost SMTP response must never trigger an automatic resend.
  await writeFile(path, JSON.stringify(report, null, 2), { flag: 'wx', mode: 0o600 });
  try {
    await send(mail);
    report.state = 'smtp_accepted';
    report.completedAt = new Date().toISOString();
    await writeFile(path, JSON.stringify(report, null, 2), { mode: 0o600 });
    console.info(JSON.stringify({ state: report.state, testCode: runId.slice(0, 8), inboxConfirmed: false, attempts: 1 }));
  } catch (error) {
    report.state = 'failed_or_unconfirmed';
    report.completedAt = new Date().toISOString();
    report.errorCode = /^[A-Z0-9_]{1,32}$/u.test(error?.code ?? '') ? error.code : 'SMTP_TEST_FAILED';
    await writeFile(path, JSON.stringify(report, null, 2), { mode: 0o600 });
    console.error(JSON.stringify({ state: report.state, testCode: runId.slice(0, 8), errorCode: report.errorCode, attempts: 1 }));
    process.exitCode = 1;
  }
}
