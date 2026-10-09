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
  const [role, setRole] = useState(member.role), [mode, setMode] = useState('member'), [workspaceId, setWorkspaceId] = useState(''), [name, setName] = useState(''), [directory, setDirectory] = useState({ items: [] }), [loading, setLoading] = useState(kind === 'workspace'), [loadError, setLoadError] = useState(''), [busy, setBusy] = useState(false), [error, setError] = useState(''), [uncertain, setUncertain] = useState(false);
  const panel = useRef(null), pending = useRef(false), close = useRef(null), live = useRef(true);
  const dirty = role !== member.role || Boolean(workspaceId || name) || mode !== 'member';
  const title = kind === 'role' ? 'Đổi vai trò tổ chức' : kind === 'transfer' ? 'Chuyển quyền sở hữu tổ chức' : 'Phân bổ quyền Workspace';
  useDraftGuard({ dirty, busy, message: 'Bỏ thay đổi quyền chưa lưu?' });
  close.current = async () => { if (!pending.current && (!dirty || await confirmDialog('Bỏ thay đổi quyền chưa lưu?'))) onClose(uncertain); };
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
      notify(result.code === 'ALREADY_MEMBER' ? 'Người này đã tham gia Workspace.' : kind === 'transfer' ? 'Đã chuyển quyền sở hữu tổ chức.' : kind === 'role' ? 'Đã cập nhật vai trò tổ chức.' : mode === 'manager' ? 'Đã cập nhật Manager của Workspace.' : 'Đã thêm thành viên vào Workspace.'); onSaved(); onClose();
    } catch (error) { setUncertain(isUncertainMutation(error)); setError(isUncertainMutation(error) ? 'Chưa rõ thay đổi quyền đã được lưu. Đóng form và tải lại dữ liệu trước khi gửi tiếp.' : messageFor(error)); }
    finally { pending.current = false; setBusy(false); }
  }
  return createPortal(<div className="overlay"><section className="dialog organization-manage-dialog" ref={panel} tabIndex={-1} role="dialog" aria-modal="true" aria-labelledby="organization-manage-title"><h2 id="organization-manage-title">{title}</h2><p className="manage-target"><strong>{member.displayName}</strong><span>{organizationRoleLabel(member.role)} · {org.name}</span></p><form onSubmit={submit}><fieldset disabled={busy || uncertain}>
    {kind === 'role' && <><FormField label="Vai trò mới" hint="Chỉ Owner được thay đổi vai trò Admin; Owner không đổi bằng thao tác này.">{props => <select {...props} value={role} onChange={e => setRole(e.target.value)}><option value="member">Thành viên</option><option value="admin">Quản trị viên</option></select>}</FormField><p>Admin được quản trị các Workspace trực thuộc. Hạ về Thành viên sẽ thu hồi quyền quản trị toàn tổ chức; các quyền Workspace đã cấp vẫn được xét riêng.</p></>}
    {kind === 'workspace' && <><FormField label="Quyền trong Workspace" hint="Không thay đổi vai trò tổ chức.">{props => <select {...props} value={mode} onChange={e => setMode(e.target.value)}><option value="member">Thêm thành viên</option><option value="manager">Bổ nhiệm Manager</option></select>}</FormField><FormField label="Workspace" hint={mode === 'manager' ? 'Có thể thay Manager ở Workspace lưu trữ để khôi phục người quản lý hợp lệ.' : 'Workspace phải đang hoạt động. Không cần thành viên chấp nhận lại.'}>{props => <select {...props} required value={workspaceId} onChange={e => setWorkspaceId(e.target.value)}><option value="">Chọn Workspace</option>{directory.items.map(item => <option key={item.id} value={item.id} disabled={mode === 'member' && item.state === 'archived'}>{item.name}{item.state === 'archived' ? ' · Đã lưu trữ' : ''}</option>)}</select>}</FormField>{loading && <LoadingState>Đang tải Workspace…</LoadingState>}{loadError && <InlineMessage>{loadError}<button type="button" onClick={() => load()}>Tải lại Workspace</button></InlineMessage>}{directory.nextCursor && <button type="button" disabled={loading} onClick={() => load(directory.nextCursor)}>Tải thêm Workspace để chọn</button>}{workspace && <p>{mode === 'manager' ? `Thay Manager hiện tại bằng ${member.displayName}. Người được chọn được thêm vào Workspace nếu chưa tham gia; Manager trước vẫn là thành viên nếu còn quyền.` : `Thêm ${member.displayName} vào ${workspace.name} ngay lập tức.`}</p>}</>}
    {kind === 'transfer' && <><InlineMessage tone="info">{member.displayName} trở thành Owner mới. Bạn quay về vai trò tổ chức đã có trước khi làm Owner; quyền Workspace/Manager được giữ theo phạm vi riêng.</InlineMessage><FormField label="Nhập tên tổ chức để xác nhận" hint={`Nhập đúng: ${org.name}`}>{props => <input {...props} required maxLength={200} value={name} onChange={e => setName(e.target.value)} />}</FormField></>}
    </fieldset>{error && <InlineMessage>{error}</InlineMessage>}<div className="buttons"><button type="button" disabled={busy} onClick={() => close.current()}>Hủy</button><button className="primary" disabled={busy || uncertain || !valid}>{busy ? 'Đang cập nhật…' : kind === 'transfer' ? 'Chuyển Owner' : 'Lưu quyền'}</button></div></form></section></div>, document.body);
}
