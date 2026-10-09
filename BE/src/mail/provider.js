import nodemailer from 'nodemailer';
import { mkdir, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';

export function mailContent(mail) {
  if (mail.purpose === 'project_guest_invitation') return { subject: 'Lời mời xem dự án / Project Guest invitation',
    text: ['Lời mời xem dự án / Project Guest invitation', mail.workspaceName, mail.projectName, 'Vai trò / Role: Guest — chỉ xem và bình luận / view and comment only', mail.url].join('\n') };
  if (mail.purpose === 'organization_invitation') return { subject: 'Lời mời tổ chức / Organization invitation',
    text: ['Lời mời tổ chức / Organization invitation', mail.organizationName, ...(mail.workspaceName ? [`Workspace: ${mail.workspaceName}`] : []), 'Vai trò / Role: Member', mail.url].join('\n') };
  if (mail.purpose === 'work') {
    const english = mail.locale === 'en';
    const labels = english ? { assignment: 'Assignment changed', comment: 'New comment', content: 'Task details changed', status: 'Status changed' } : { assignment: 'Thay đổi phân công', comment: 'Bình luận mới', content: 'Thay đổi nội dung công việc', status: 'Thay đổi trạng thái' };
    const subject = english ? 'Task update' : 'Cập nhật công việc';
    return { subject, text: [subject, mail.workspaceName, mail.taskTitle, ...mail.eventTypes.map((type) => labels[type]), ...(mail.eventTypes.includes('status') ? [`${mail.previousStatus ?? ''} → ${mail.status ?? ''}`] : []), mail.url].join('\n') };
  }
  const label = mail.purpose === 'verify_email' ? 'Xác minh email / Verify email' : mail.purpose === 'invitation' ? 'Lời mời Workspace / Workspace invitation' : 'Đặt lại mật khẩu / Reset password';
  return { subject: label, text: `${label}: ${mail.url}` };
}
function deliveryId(mail) {
  if (!/^[a-f0-9-]{36}$/u.test(mail.eventId) || (mail.deliveryKey !== undefined && !/^[a-f0-9]{24}$/u.test(mail.deliveryKey))) throw new Error('Invalid mail event');
  return `${mail.eventId}${mail.deliveryKey ? `-${mail.deliveryKey}` : ''}`;
}

export function createMailProvider(env = process.env) {
  const mode = env.EMAIL_MODE ?? 'disabled';
  if (mode === 'capture' && env.NODE_ENV !== 'production') {
    const directory = fileURLToPath(new URL('../../../.local/mail/', import.meta.url));
    return async (mail) => {
      const delivery = deliveryId(mail);
      await mkdir(directory, { recursive: true });
      try { await writeFile(join(directory, `${delivery}.json`), JSON.stringify(mail, null, 2), { flag: 'wx', mode: 0o600 }); }
      catch (error) { if (error.code !== 'EEXIST') throw error; }
      return `capture:${delivery}`;
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
    const delivery = deliveryId(mail); const content = mailContent(mail);
    const result = await transport.sendMail({ from: env.SMTP_FROM, to: mail.to,
      messageId: `<${delivery}@workflow.local>`, ...content,
    });
    if (!result.accepted?.length) throw new Error('SMTP recipient not accepted');
    return String(result.messageId);
  };
}
