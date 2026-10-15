import {mailContent as currentContent} from '../src/mail/provider.js';
export function mailContent(mail){
  if (mail.purpose === 'organization_invitation') return { subject: 'Lời mời tổ chức / Organization invitation',
    text: ['Lời mời tổ chức / Organization invitation', mail.organizationName, ...(mail.workspaceName ? [`Workspace: ${mail.workspaceName}`] : []), 'Vai trò / Role: Member', mail.url].join('\n') };
  return currentContent(mail);
}
