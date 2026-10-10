import { useAuthLocale } from '../auth/AuthLocale.jsx';
import { organizationText } from '../../lib/organization-text.js';
import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import FormField from '../../components/FormField.jsx';
import useDialogFocus from '../../components/useDialogFocus.js';
import { InlineMessage, LoadingState } from '../../components/Feedback.jsx';
import { confirmDialog, notify } from '../../components/NotificationProvider.jsx';
import { useDraftGuard } from '../../lib/draft-navigation.js';
import { isUncertainMutation } from '../../lib/mutation-outcome.js';
import { messageFor } from '../../lib/messages.js';
import { organizationRoleLabel } from './Organizations.jsx';

export default function OrganizationManageDialog({ api, org, member, kind, onClose, onSaved }) {
  const { locale } = useAuthLocale();
  const t = (value, values) => organizationText(value, locale, values);
  const [role, setRole] = useState(member.role), [mode, setMode] = useState('member'), [workspaceId, setWorkspaceId] = useState(''), [name, setName] = useState(''), [directory, setDirectory] = useState({ items: [] }), [loading, setLoading] = useState(kind === 'workspace'), [loadError, setLoadError] = useState(''), [busy, setBusy] = useState(false), [error, setError] = useState(''), [uncertain, setUncertain] = useState(false);
  const panel = useRef(null), pending = useRef(false), close = useRef(null), live = useRef(true);
  const dirty = role !== member.role || Boolean(workspaceId || name) || mode !== 'member';
  const title = kind === 'role' ? t("Đổi vai trò tổ chức") : kind === 'transfer' ? t("Chuyển quyền sở hữu tổ chức") : t("Phân bổ quyền Workspace");
  useDraftGuard({ dirty, busy, message: t("Bỏ thay đổi quyền chưa lưu?"), dialogOptions: { confirmLabel: t("Bỏ thay đổi"), cancelLabel: t("Ở lại") }, busyMessage: t("Đang xử lý yêu cầu. Vui lòng chờ kết quả trước khi rời trang.") });
  close.current = async () => { if (!pending.current && (!dirty || await confirmDialog(t("Bỏ thay đổi quyền chưa lưu?")))) onClose(uncertain); };
  useDialogFocus(panel, () => close.current());
  async function load(cursor) {
    setLoading(true); setLoadError('');
    try { const result = await api.request(`/organizations/${org.id}/workspaces?state=all&limit=12${cursor ? '&cursor=' + encodeURIComponent(cursor) : ''}`); if (live.current) setDirectory(old => ({ ...result, items: cursor ? [...old.items, ...result.items] : result.items })); }
    catch (error) { if (live.current) setLoadError(messageFor(error)); }
    finally { if (live.current) setLoading(false); }
  }
  useEffect(() => { live.current = true; if (kind === 'workspace') load(); return () => { live.current = false; }; }, [org.id, kind]);
  const workspace = directory.items.find(item => item.id === workspaceId);
  const valid = kind === 'transfer' ? name === org.name : kind === 'role' ? role !== member.role : workspace && (mode === 'manager' || workspace.state !== 'archived');
  async function submit(event) {
    event.preventDefault(); if (pending.current || uncertain || !valid) return;
    pending.current = true; setBusy(true); setError('');
    try {
      const base = `/organizations/${org.id}`;
      const result = kind === 'role' ? await api.request(`${base}/members/${member.userId}/role`, { method: 'PATCH', body: { expectedVersion: member.version, role } }) : kind === 'transfer' ? await api.request(`${base}/ownership`, { method: 'PATCH', body: { expectedVersion: org.version, memberId: member.userId } }) : await api.request(`${base}/workspaces/${workspaceId}/${mode === 'manager' ? 'manager' : 'members'}`, { method: mode === 'manager' ? 'PATCH' : 'POST', body: { expectedVersion: workspace.version, [mode === 'manager' ? 'managerId' : 'userId']: member.userId } });
      notify(result.code === 'ALREADY_MEMBER' ? t("Người này đã tham gia Workspace.") : kind === 'transfer' ? t("Đã chuyển quyền sở hữu tổ chức.") : kind === 'role' ? t("Đã cập nhật vai trò tổ chức.") : mode === 'manager' ? t("Đã cập nhật Manager của Workspace.") : t("Đã thêm thành viên vào Workspace.")); onSaved(); onClose();
    } catch (error) { setUncertain(isUncertainMutation(error)); setError(isUncertainMutation(error) ? t("Chưa rõ thay đổi quyền đã được lưu. Đóng form và tải lại dữ liệu trước khi gửi tiếp.") : messageFor(error)); }
    finally { pending.current = false; setBusy(false); }
  }
  return createPortal(<div className="overlay"><section lang={locale} className="dialog organization-manage-dialog" ref={panel} tabIndex={-1} role="dialog" aria-modal="true" aria-labelledby="organization-manage-title"><h2 id="organization-manage-title">{title}</h2><p className="manage-target"><strong>{member.displayName}</strong><span>{organizationRoleLabel(member.role, locale)} · {org.name}</span></p><form onSubmit={submit}><fieldset disabled={busy || uncertain}>
    {kind === 'role' && <><FormField label={t("Vai trò mới")} hint={t("Chỉ Owner được thay đổi vai trò Admin; Owner không đổi bằng thao tác này.")}>{props => <select {...props} value={role} onChange={e => setRole(e.target.value)}><option value="member">{t("Thành viên")}</option><option value="admin">{t("Quản trị viên")}</option></select>}</FormField><p>{t("Admin được quản trị các Workspace trực thuộc. Hạ về Thành viên sẽ thu hồi quyền quản trị toàn tổ chức; các quyền Workspace đã cấp vẫn được xét riêng.")}</p></>}
    {kind === 'workspace' && <><FormField label={t("Quyền trong Workspace")} hint={t("Không thay đổi vai trò tổ chức.")}>{props => <select {...props} value={mode} onChange={e => setMode(e.target.value)}><option value="member">{t("Thêm thành viên")}</option><option value="manager">{t("Bổ nhiệm Manager")}</option></select>}</FormField><FormField label="Workspace" hint={mode === 'manager' ? t("Có thể thay Manager ở Workspace lưu trữ để khôi phục người quản lý hợp lệ.") : t("Workspace phải đang hoạt động. Không cần thành viên chấp nhận lại.")}>{props => <select {...props} required value={workspaceId} onChange={e => setWorkspaceId(e.target.value)}><option value="">{t("Chọn Workspace")}</option>{directory.items.map(item => <option key={item.id} value={item.id} disabled={mode === 'member' && item.state === 'archived'}>{item.name}{item.state === 'archived' ? t(" · Đã lưu trữ") : ''}</option>)}</select>}</FormField>{loading && <LoadingState>{t("Đang tải Workspace…")}</LoadingState>}{loadError && <InlineMessage>{t(loadError)}<button type="button" onClick={() => load()}>{t("Tải lại Workspace")}</button></InlineMessage>}{directory.nextCursor && <button type="button" disabled={loading} onClick={() => load(directory.nextCursor)}>{t("Tải thêm Workspace để chọn")}</button>}{workspace && <p>{mode === 'manager' ? t("Thay Manager hiện tại bằng {name}. Người được chọn được thêm vào Workspace nếu chưa tham gia; Manager trước vẫn là thành viên nếu còn quyền.", { name: member.displayName }) : t("Thêm {name} vào {workspace} ngay lập tức.", { name: member.displayName, workspace: workspace.name })}</p>}</>}
    {kind === 'transfer' && <><InlineMessage tone="info">{t("{name} trở thành Owner mới. Bạn quay về vai trò tổ chức đã có trước khi làm Owner; quyền Workspace/Manager được giữ theo phạm vi riêng.", { name: member.displayName })}</InlineMessage><FormField label={t("Nhập tên tổ chức để xác nhận")} hint={t("Nhập đúng: {name}", { name: org.name })}>{props => <input {...props} required maxLength={200} value={name} onChange={e => setName(e.target.value)} />}</FormField></>}
    </fieldset>{error && <InlineMessage>{t(error)}</InlineMessage>}<div className="buttons"><button type="button" disabled={busy} onClick={() => close.current()}>{t("Hủy")}</button><button className="primary" disabled={busy || uncertain || !valid}>{busy ? t("Đang cập nhật…") : kind === 'transfer' ? t("Chuyển Owner") : t("Lưu quyền")}</button></div></form></section></div>, document.body);
}
