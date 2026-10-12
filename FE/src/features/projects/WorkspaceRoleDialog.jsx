import { useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useAuthLocale } from '../auth/AuthLocale.jsx';
import { workspaceRoleText as workspaceText } from '../../lib/workspace-role-text.js';
import { workspaceRoleLabel } from '../../lib/ui-copy.js';
import FormField from '../../components/FormField.jsx';
import { InlineMessage } from '../../components/Feedback.jsx';
import { notify } from '../../components/NotificationProvider.jsx';
import useDialogFocus from '../../components/useDialogFocus.js';
import { mayLeaveDrafts, useDraftGuard } from '../../lib/draft-navigation.js';
import { isUncertainMutation } from '../../lib/mutation-outcome.js';
import { messageFor } from '../../lib/messages.js';
export default function WorkspaceRoleDialog({ api, workspace, member, onDone, onContext, onUnavailable }) {
  const { locale } = useAuthLocale(), t = (text, values) => workspaceText(text, locale, values);
  const role = member.role === 'manager' ? 'member' : 'manager';
  const title = t(role === 'manager' ? 'Bổ nhiệm Manager' : 'Hạ xuống Member');
  const [reason, setReason] = useState(''), [busy, setBusy] = useState(false), [blocked, setBlocked] = useState(false), [error, setError] = useState(''), [fieldError, setFieldError] = useState('');
  const pending = useRef(false), panel = useRef(null), close = useRef(null);
  useDraftGuard({ dirty: Boolean(reason), busy, message: t('Bỏ lý do thay đổi vai trò chưa gửi?'), dialogOptions: { confirmLabel: t('Bỏ thay đổi'), cancelLabel: t('Ở lại') } });
  close.current = async () => { if (!pending.current && await mayLeaveDrafts()) onDone(); };
  useDialogFocus(panel, () => close.current());
  async function submit(event) {
    event.preventDefault(); if (pending.current || blocked) return;
    if (!reason.trim() || reason.length > 2000 || /[\u0000-\u001f\u007f\u2028\u2029]/u.test(reason)) { setFieldError(t('Nhập lý do một dòng, tối đa 2.000 ký tự.')); return; }
    pending.current = true; setBusy(true); setError('');
    try {
      await api.request(`/workspaces/${workspace.id}/members/${member.userId}/role`, { method: 'PATCH', body: { expectedVersion: member.version, role, reason: reason.trim() } });
      notify(t('Đã cập nhật vai trò Workspace.')); onDone();
    } catch (failure) {
      setBlocked(isUncertainMutation(failure) || failure.code === 'VERSION_CONFLICT' || [401,403,404].includes(failure.status));
      setError(isUncertainMutation(failure) ? t('Chưa xác nhận kết quả. Đóng và tải lại danh sách trước khi gửi tiếp.') : messageFor(failure));
      if (failure.status === 401 || failure.code === 'ACCESS_BANNED') onUnavailable?.(failure);
      else if ([403,404].includes(failure.status)) {
        try {
          const fresh = (await api.request(`/workspaces/${workspace.id}`)).workspace; onContext(fresh);
          if (failure.status === 404) setError(t('Thành viên không còn khả dụng. Đóng và tải lại danh sách.'));
        } catch (readFailure) { onUnavailable?.(readFailure); }
      }
    } finally { pending.current = false; setBusy(false); }
  }
  return createPortal(<div className="overlay"><section className="dialog" role="dialog" aria-modal="true" aria-labelledby="workspace-role-title" ref={panel} tabIndex={-1} lang={locale}>
    <h2 id="workspace-role-title">{title}</h2><p><strong>{member.displayName}</strong></p><p>{workspaceRoleLabel(member.role, locale)} → {workspaceRoleLabel(role, locale)}</p>
    <p>{t(role === 'manager' ? 'Manager quản lý Workspace này và mời Member; không sở hữu nhóm hoặc bổ nhiệm Manager khác.' : 'Người này giữ tư cách thành viên nhưng mất quyền quản lý Workspace. Task và dữ liệu không bị xóa.')}</p>
    <form onSubmit={submit}><FormField label={t('Lý do thay đổi vai trò')} hint={t('Một dòng, tối đa 2.000 ký tự. Lý do được ghi vào nhật ký.')} error={fieldError}>{props => <input {...props} required maxLength={2000} value={reason} disabled={busy} readOnly={blocked} onChange={event => { setReason(event.target.value); setFieldError(''); }} />}</FormField>
      {error && <InlineMessage>{t(error)}</InlineMessage>}<div className="buttons"><button type="button" disabled={busy} onClick={() => close.current()}>{t('Đóng')}</button><button className="primary" disabled={busy || blocked}>{busy ? t('Đang xử lý…') : title}</button></div>
    </form>
  </section></div>, document.body);
}
