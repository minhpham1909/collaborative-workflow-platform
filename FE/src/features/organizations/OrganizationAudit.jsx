import { useAuthLocale } from '../auth/AuthLocale.jsx';
import { organizationText } from '../../lib/organization-text.js';
import { useEffect, useRef, useState } from 'react';
import { EmptyState, InlineMessage, LoadingState } from '../../components/Feedback.jsx';
import { messageFor } from '../../lib/messages.js';
import { organizationRoleLabel } from './Organizations.jsx';
const labels = { member_role_changed: 'Đổi vai trò tổ chức', workspace_member_added: 'Thêm thành viên vào Workspace', workspace_manager_changed: 'Thay Manager', ownership_transferred: 'Chuyển quyền sở hữu', organization_invitation_created: 'Tạo lời mời', organization_invitation_revoked: 'Thu hồi lời mời', organization_member_joined: 'Tham gia tổ chức', organization_member_left: 'Rời tổ chức', organization_member_removed: 'Gỡ thành viên' };
export default function OrganizationAudit({ api, id }) {
  const { locale } = useAuthLocale();
  const t = (value, values) => organizationText(value, locale, values);
  const [data, setData] = useState({ items: [] }), [busy, setBusy] = useState(true), [error, setError] = useState(''), [revision, setRevision] = useState(0), generation = useRef(0);
  async function load(cursor, token = generation.current) { setBusy(true); setError(''); try { const result = await api.request(`/organizations/${id}/audit?limit=12${cursor ? '&cursor=' + encodeURIComponent(cursor) : ''}`); if (token === generation.current) setData(old => ({ ...result, items: cursor ? [...old.items, ...result.items] : result.items })); } catch (error) { if (token === generation.current) { setError(messageFor(error)); setData({ items: [] }); } } finally { if (token === generation.current) setBusy(false); } }
  useEffect(() => { const token = ++generation.current; setData({ items: [] }); load(null, token); return () => { generation.current++; }; }, [id, revision]);
  return <section lang={locale} className="organization-audit"><div className="team-list-heading"><h2>{t("Nhật ký quản trị")}</h2><button disabled={busy} onClick={() => setRevision(v => v + 1)}>{t("Tải lại nhật ký")}</button></div><p className="muted">{t("Mới nhất trước · Tên hiển thị hiện tại, mã tham chiếu lịch sử được giữ.")}</p>{error && <InlineMessage>{t(error)}</InlineMessage>}{busy && <LoadingState>{t("Đang tải nhật ký…")}</LoadingState>}<ol className="audit-list" aria-busy={busy}>{data.items.map(item => <li key={item.id}><strong>{t(labels[item.action]) ?? t("Thay đổi quản trị")}</strong><p>{item.actorName ?? t("Người dùng không còn khả dụng")}{item.targetName ? ` → ${item.targetName}` : ''}{item.previousRole ? ` · ${organizationRoleLabel(item.previousRole, locale)} → ${organizationRoleLabel(item.role, locale)}` : ''}</p>{item.workspaceId && <a href={`#workspace/${item.workspaceId}`}>{t("Xem Workspace liên quan")}</a>}<time dateTime={item.createdAt}>{new Date(item.createdAt).toLocaleString(locale === 'en' ? 'en-GB' : 'vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' })}</time></li>)}</ol>{!busy && !error && !data.items.length && <EmptyState>{t("Chưa có nhật ký để hiển thị.")}</EmptyState>}{data.nextCursor && <button disabled={busy} onClick={() => load(data.nextCursor)}>{t("Tải thêm nhật ký")}</button>}</section>;
}

