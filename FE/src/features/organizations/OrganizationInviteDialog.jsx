import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import FormField from '../../components/FormField.jsx';
import useDialogFocus from '../../components/useDialogFocus.js';
import { InlineMessage, LoadingState } from '../../components/Feedback.jsx';
import { confirmDialog, notify } from '../../components/NotificationProvider.jsx';
import { useDraftGuard } from '../../lib/draft-navigation.js';
import { isUncertainMutation } from '../../lib/mutation-outcome.js';
import { messageFor } from '../../lib/messages.js';

export default function OrganizationInviteDialog({ api, org, onClose, onSaved }) {
  const [email, setEmail] = useState(''), [workspaceId, setWorkspaceId] = useState(''), [workspaces, setWorkspaces] = useState({ items: [] }), [loading, setLoading] = useState(true), [pickerError, setPickerError] = useState(''), [busy, setBusy] = useState(false), [error, setError] = useState(''), [uncertain, setUncertain] = useState(false);
  const panel = useRef(null), pending = useRef(false), close = useRef(null), live = useRef(true);
  const dirty = Boolean(email || workspaceId);
  useDraftGuard({ dirty, busy, message: 'Bỏ lời mời chưa gửi?' });
  close.current = async () => { if (!pending.current && (!dirty || await confirmDialog('Bỏ lời mời chưa gửi?'))) onClose(uncertain); };
  useDialogFocus(panel, () => close.current());
  async function load(cursor) {
    setLoading(true); setPickerError('');
    try { const data = await api.request(`/organizations/${org.id}/workspaces?state=active&limit=12${cursor ? '&cursor=' + encodeURIComponent(cursor) : ''}`); if (live.current) setWorkspaces(old => ({ ...data, items: cursor ? [...old.items, ...data.items] : data.items })); }
    catch (error) { if (live.current) setPickerError(messageFor(error)); }
    finally { if (live.current) setLoading(false); }
  }
  useEffect(() => { live.current = true; load(); return () => { live.current = false; }; }, [org.id]);
  async function submit(event) {
    event.preventDefault(); if (pending.current || uncertain) return;
    pending.current = true; setBusy(true); setError('');
    try {
      const result = await api.request(`/organizations/${org.id}/invitations`, { method: 'POST', body: { email: email.trim(), ...(workspaceId ? { workspaceId } : {}) } });
      notify(result.code === 'ALREADY_MEMBER' ? 'Người này đã là thành viên trong phạm vi đã chọn.' : 'Đã tạo lời mời. Email đang chờ hệ thống gửi.'); onSaved(); onClose();
    } catch (error) { setUncertain(isUncertainMutation(error)); setError(isUncertainMutation(error) ? 'Chưa rõ lời mời đã được tạo. Đóng form và tải lại danh sách trước khi gửi tiếp.' : messageFor(error)); }
    finally { pending.current = false; setBusy(false); }
  }
  return createPortal(<div className="overlay"><section className="dialog organization-invite-dialog" ref={panel} tabIndex={-1} role="dialog" aria-modal="true" aria-labelledby="org-invite-title"><h2 id="org-invite-title">Mời vào tổ chức</h2><p>Người nhận sẽ tham gia {org.name} với vai trò Thành viên. Lời mời chỉ dành cho email này và có hiệu lực 7 ngày.</p><form onSubmit={submit}><fieldset disabled={busy || uncertain}>
    <FormField label="Email người nhận" hint="Người nhận cần đăng nhập bằng tài khoản có cùng email đã xác minh.">{props => <input {...props} type="email" maxLength={254} autoComplete="email" required value={email} onChange={e => setEmail(e.target.value)} />}</FormField>
    <FormField label="Workspace đích (không bắt buộc)" hint="Thêm vào Workspace sau khi người nhận chấp nhận lời mời tổ chức.">{props => <select {...props} value={workspaceId} onChange={e => setWorkspaceId(e.target.value)}><option value="">Chỉ tham gia tổ chức</option>{workspaces.items.map(ws => <option key={ws.id} value={ws.id}>{ws.name}</option>)}</select>}</FormField>
    {loading && <LoadingState>Đang tải Workspace có thể chọn…</LoadingState>}{pickerError && <InlineMessage>{pickerError}<button type="button" onClick={() => load()}>Tải lại Workspace</button></InlineMessage>}{workspaces.nextCursor && <button type="button" disabled={loading} onClick={() => load(workspaces.nextCursor)}>Tải thêm Workspace để chọn</button>}
    </fieldset>{error && <InlineMessage>{error}</InlineMessage>}<div className="buttons"><button type="button" disabled={busy} onClick={() => close.current()}>Hủy</button><button className="primary" disabled={busy || uncertain}>{busy ? 'Đang tạo lời mời…' : 'Tạo lời mời'}</button></div></form></section></div>, document.body);
}
