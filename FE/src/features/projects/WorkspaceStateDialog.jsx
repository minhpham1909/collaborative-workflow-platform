import { useAuthLocale } from '../auth/AuthLocale.jsx';
import { workspaceText } from '../../lib/workspace-text.js';
import { useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import useDialogFocus from '../../components/useDialogFocus.js';
import FormField from '../../components/FormField.jsx';
import { InlineMessage } from '../../components/Feedback.jsx';
import { confirmDialog, notify } from '../../components/NotificationProvider.jsx';
import { useDraftGuard } from '../../lib/draft-navigation.js';
import { isUncertainMutation } from '../../lib/mutation-outcome.js';
import { messageFor } from '../../lib/messages.js';

export default function WorkspaceStateDialog({ api, workspace, onClose, onSaved }) {
  const { locale } = useAuthLocale();
  const t = (value, values) => workspaceText(value, locale, values);
  const archived = workspace.state === 'archived', action = archived ? t("Mở lại Workspace") : t("Lưu trữ Workspace");
  const [name, setName] = useState(''), [reason, setReason] = useState(''), [busy, setBusy] = useState(false), [error, setError] = useState(''), [uncertain, setUncertain] = useState(false);
  const panel = useRef(null), pending = useRef(false), close = useRef(null);
  const dirty = Boolean(name || reason);
  useDraftGuard({ dirty, busy, message: t("Bỏ xác nhận chưa gửi?") });
  close.current = async () => { if (!pending.current && (!dirty || await confirmDialog(t("Bỏ xác nhận chưa gửi?")))) onClose(uncertain); };
  useDialogFocus(panel, () => close.current());
  async function submit(event) {
    event.preventDefault();
    if (pending.current || uncertain) return;
    if (name !== workspace.name || !reason.trim()) { setError(t("Nhập đúng tên Workspace và lý do để tiếp tục.")); return; }
    pending.current = true; setBusy(true); setError('');
    try {
      const result = await api.request(`/workspaces/${workspace.id}/state`, { method: 'PATCH', body: { expectedVersion: workspace.version, state: archived ? 'active' : 'archived', confirmName: name, reason: reason.trim() } });
      onSaved(result.workspace); notify(archived ? t("Đã mở lại Workspace.") : t("Đã lưu trữ Workspace.")); onClose();
    } catch (error) {
      setUncertain(isUncertainMutation(error));
      setError(isUncertainMutation(error) ? t("Chưa rõ trạng thái đã được cập nhật. Đóng hộp thoại và tải lại để kiểm tra trước khi gửi tiếp.") : messageFor(error));
    } finally { pending.current = false; setBusy(false); }
  }
  return createPortal(<div className="overlay"><section lang={locale} ref={panel} tabIndex={-1} className="dialog workspace-state-dialog" role="dialog" aria-modal="true" aria-labelledby="workspace-state-title">
    <h2 id="workspace-state-title">{action}</h2>
    <p>{archived ? t("Workspace hoạt động trở lại. Dự án đã lưu trữ riêng vẫn giữ nguyên trạng thái.") : t("Các Dự án và Task bên trong chuyển sang chỉ đọc. Dữ liệu được giữ lại và có thể mở Workspace sau.")}</p>
    <p className="workspace-confirm-name">{workspace.name}</p>
    <form onSubmit={submit}><fieldset disabled={busy || uncertain}>
      <FormField label={t("Nhập lại tên Workspace")} hint={t("Phải khớp chính xác tên ở trên.")}>{props => <input {...props} value={name} maxLength={200} required onChange={e => setName(e.target.value)} />}</FormField>
      <FormField label={t("Lý do")} hint={t("Được ghi vào nhật ký. Tối đa 2.000 ký tự.")}>{props => <textarea {...props} value={reason} maxLength={2000} required rows={3} onChange={e => setReason(e.target.value)} />}</FormField>
    </fieldset>{error && <InlineMessage>{t(error)}</InlineMessage>}
    <div className="buttons"><button type="button" disabled={busy} onClick={() => close.current()}>{t("Hủy")}</button><button className="primary" disabled={busy || uncertain || name !== workspace.name || !reason.trim()}>{busy ? t("Đang cập nhật…") : action}</button></div>
    </form>
  </section></div>, document.body);
}
