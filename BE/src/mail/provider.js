import nodemailer from 'nodemailer';
import { mkdir, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';

export function createMailProvider(env = process.env) {
  const mode = env.EMAIL_MODE ?? 'disabled';
  if (mode === 'capture' && env.NODE_ENV !== 'production') {
    const directory = fileURLToPath(new URL('../../../.local/mail/', import.meta.url));
    return async (mail) => {
      if (!/^[a-f0-9-]{36}$/u.test(mail.eventId)) throw new Error('Invalid mail event');
      await mkdir(directory, { recursive: true });
      try { await writeFile(join(directory, `${mail.eventId}.json`), JSON.stringify(mail, null, 2), { flag: 'wx', mode: 0o600 }); }
      catch (error) { if (error.code !== 'EEXIST') throw error; }
      return `capture:${mail.eventId}`;
    };
  }
  if (mode !== 'smtp' || !env.SMTP_HOST || !env.SMTP_USER || !env.SMTP_PASSWORD || !env.SMTP_FROM) throw new Error('Email delivery is not configured');
  const port = Number(env.SMTP_PORT ?? 587);
  if (![465, 587].includes(port)) throw new Error('SMTP must use port 465 or 587 with TLS');
  const transport = nodemailer.createTransport({
    host: env.SMTP_HOST, port, secure: port === 465, requireTLS: true,
    auth: { user: env.SMTP_USER, pass: env.SMTP_PASSWORD }, logger: false, debug: false,
    disableFileAccess: true, disableUrlAccess: true, connectionTimeout: 10_000, greetingTimeout: 10_000, socketTimeout: 15_000,
  });
  return async (mail) => {
    const label = mail.purpose === 'verify_email' ? 'Xác minh email / Verify email' : mail.purpose === 'invitation' ? 'Lời mời Workspace / Workspace invitation' : 'Đặt lại mật khẩu / Reset password';
    const result = await transport.sendMail({ from: env.SMTP_FROM, to: mail.to,
      messageId: `<${mail.eventId}@workflow.local>`,
      subject: label,
      text: `${label}: ${mail.url}`,
    });
    if (!result.accepted?.length) throw new Error('SMTP recipient not accepted');
    return String(result.messageId);
  };
}
