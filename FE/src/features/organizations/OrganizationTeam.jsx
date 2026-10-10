import { useDraftGuard } from '../../lib/draft-navigation.js';
import { useAuthLocale } from '../auth/AuthLocale.jsx';
import { organizationText } from '../../lib/organization-text.js';
import { useEffect, useRef, useState } from 'react';
import Avatar from '../../components/Avatar.jsx';
import Icon from '../../components/Icon.jsx';
import FilterPanel from '../../components/FilterPanel.jsx';
import { InlineMessage, LoadingState, EmptyState } from '../../components/Feedback.jsx';
import { confirmDialog, notify } from '../../components/NotificationProvider.jsx';
import { isUncertainMutation } from '../../lib/mutation-outcome.js';
import { messageFor } from '../../lib/messages.js';
import { organizationRoleLabel } from './Organizations.jsx';
import OrganizationInviteDialog from './OrganizationInviteDialog.jsx';
import OrganizationManageDialog from './OrganizationManageDialog.jsx';
import OrganizationAudit from './OrganizationAudit.jsx';
import './team.css';

const date = (value, locale = 'vi') => new Date(value).toLocaleString(locale === 'en' ? 'en-GB' : 'vi-VN', { timeZone: 'Asia/Ho_Chi_Minh', dateStyle: 'short', timeStyle: 'short' });
const invitationLabels = { active: 'Đang chờ phản hồi', accepted: 'Đã tham gia', revoked: 'Đã thu hồi', expired: 'Đã hết hạn' };
export default function OrganizationTeam({ api, id }) {
  const { locale } = useAuthLocale();
  const t = (value, values) => organizationText(value, locale, values);
  const [org, setOrg] = useState(null), [tab, setTab] = useState('members'), [data, setData] = useState({ items: [] }), [busy, setBusy] = useState(true), [error, setError] = useState(''), [revision, setRevision] = useState(0), [inviting, setInviting] = useState(false), [editing, setEditing] = useState(null), [actionBusy, setActionBusy] = useState(false), [uncertain, setUncertain] = useState(false);
  const [q, setQ] = useState(''), [from, setFrom] = useState(''), [to, setTo] = useState(''), [state, setState] = useState('all');
  const generation = useRef(0), pending = useRef(false), invalid = from && to && from > to;
  useDraftGuard({ dirty: false, busy: actionBusy, busyMessage: t("Đang xử lý yêu cầu. Vui lòng chờ kết quả trước khi rời trang.") });
  const manage = org?.role === 'owner' || org?.role === 'admin';
  const query = new URLSearchParams({ limit: '12', ...(q.trim() ? { q: q.trim() } : {}), ...(from ? { from } : {}), ...(to ? { to } : {}), ...(tab === 'invitations' ? { state } : {}) }).toString();
  const clear = () => { setQ(''); setFrom(''); setTo(''); setState('all'); };
  async function load(cursor, token = generation.current) {
    setBusy(true); setError('');
    try {
      const context = (await api.request(`/organizations/${id}`)).organization;
      if (token !== generation.current) return;
      if (['invitations', 'audit'].includes(tab) && !['owner', 'admin'].includes(context.role)) { setOrg(context); setBusy(true); setData({ items: [] }); setTab('members'); clear(); notify(t("Quyền hiện tại không cho phép quản lý lời mời."), 'info'); return; }
      const result = tab === 'audit' ? { items: [] } : await api.request(`/organizations/${id}/${tab}?${query}${cursor ? '&cursor=' + encodeURIComponent(cursor) : ''}`);
      if (token === generation.current) { setOrg(context); setData(old => ({ ...result, items: cursor ? [...old.items, ...result.items] : result.items })); setUncertain(false); }
    } catch (error) { if (token === generation.current) { setError(messageFor(error)); if (!cursor || [401,403,404].includes(error.status)) setData({ items: [] }); if ([401,403,404].includes(error.status)) { setOrg(null); setInviting(false); setEditing(null); } } }
    finally { if (token === generation.current) setBusy(false); }
  }
  useEffect(() => { const token = ++generation.current; setData({ items: [] }); setError(''); if (invalid) { setBusy(false); return; } setBusy(true); const timer = setTimeout(() => load(null, token), 250); return () => { clearTimeout(timer); generation.current++; }; }, [id, tab, query, revision]);
  async function revoke(item) {
    if (pending.current || uncertain || !await confirmDialog(t("Thu hồi lời mời tới {email}? Người nhận sẽ không thể tham gia bằng lời mời này.", { email: item.email }), { title: t("Thu hồi lời mời"), confirmLabel: t("Thu hồi") })) return;
    pending.current = true; setActionBusy(true); setError('');
    try { await api.request(`/organizations/${id}/invitations/${item.id}/revoke`, { method: 'POST', body: { expectedVersion: item.version } }); notify(t("Đã thu hồi lời mời.")); setRevision(v => v + 1); }
    catch (error) { setUncertain(isUncertainMutation(error)); setError(isUncertainMutation(error) ? t("Chưa rõ lời mời đã được thu hồi. Tải lại trước khi tiếp tục.") : messageFor(error)); }
    finally { pending.current = false; setActionBusy(false); }
  }
  return <main lang={locale} className="organization-page organization-team">
    <nav className="organization-section-nav" aria-label={t("Nội dung tổ chức")}><a href={`#organization/${id}`}>Workspace</a><a href={`#organization/${id}/team`} aria-current="page">{t("Thành viên & quyền")}</a></nav>
    <p className="breadcrumbs"><a href="#organizations">{t("Tổ chức & Studio")}</a> / <a href={`#organization/${id}`}>{org?.name ?? t("Tổ chức")}</a> / {t("Thành viên")}</p>
    <section className="organization-hero"><div><p className="home-eyebrow">{t("CÙNG ĐỘI NGŨ LÀM VIỆC")}</p><h1>{t("Thành viên & quyền")}</h1><p>{org ? `${org.name} · ${organizationRoleLabel(org.role, locale)}` : t("Đang kiểm tra quyền truy cập.")}</p></div>{manage && <button className="primary" disabled={busy || actionBusy || uncertain} onClick={() => setInviting(true)}><Icon name="plus" />{t("Mời thành viên")}</button>}</section>
    {org && <div className="team-permission-note"><Icon name="people" /><p>{t("Thành viên tổ chức chỉ xem Workspace đã được thêm vào. Owner và Admin quản trị các Workspace trực thuộc; Guest được cấp riêng ở từng Project.")}</p></div>}
    <div className="team-tabs" aria-label={t("Danh sách đội ngũ")}><button aria-pressed={tab === 'members'} disabled={actionBusy} onClick={() => { clear(); setBusy(true); setData({ items: [] }); setTab('members'); setRevision(v => v + 1); }}>{t("Thành viên")}</button>{manage && <button aria-pressed={tab === 'invitations'} disabled={actionBusy} onClick={() => { clear(); setBusy(true); setData({ items: [] }); setTab('invitations'); setRevision(v => v + 1); }}>{t("Lời mời")}</button>}{manage && <button aria-pressed={tab === 'audit'} disabled={actionBusy} onClick={() => { clear(); setBusy(true); setData({ items: [] }); setTab('audit'); setRevision(v => v + 1); }}>{t("Nhật ký")}</button>}</div>
    {tab !== 'audit' && <><FilterPanel locale={locale} compact advancedLabel={t("Thời gian")} sortLabel={tab === 'members' ? t("Gia nhập mới nhất") : 'Mới tạo trước'}><label>{tab === 'members' ? t("Tìm thành viên") : t("Tìm email được mời")}<input type="search" maxLength={200} placeholder={tab === 'members' ? t("Tìm theo tên thành viên…") : t("Email người nhận…")} value={q} onChange={e => setQ(e.target.value)} /></label>{tab === 'invitations' && <label>{t("Trạng thái lời mời")}<select aria-label={t("Trạng thái lời mời")} value={state} onChange={e => setState(e.target.value)}><option value="all">{t("Tất cả")}</option>{Object.entries(invitationLabels).map(([key,label]) => <option key={key} value={key}>{t(label)}</option>)}</select></label>}<label>{tab === 'members' ? t("Từ ngày gia nhập") : t("Từ ngày mời")}<input type="date" value={from} onChange={e => setFrom(e.target.value)} /></label><label>{tab === 'members' ? t("Đến ngày gia nhập") : t("Đến ngày mời")}<input type="date" value={to} onChange={e => setTo(e.target.value)} /></label><button onClick={clear}>{t("Xóa bộ lọc")}</button><button disabled={busy || actionBusy} onClick={() => setRevision(v => v + 1)}>{t("Làm mới")}</button></FilterPanel>
    {invalid && <InlineMessage>{t("Ngày bắt đầu phải trước hoặc bằng ngày kết thúc.")}</InlineMessage>}{error && <InlineMessage>{t(error)}<button disabled={busy || actionBusy} onClick={() => setRevision(v => v + 1)}>{t("Thử lại")}</button></InlineMessage>}{busy && <LoadingState>{t("Đang tải danh sách…")}</LoadingState>}
    {org && <><div className="team-list-heading"><h2>{tab === 'members' ? t("Đội ngũ của tổ chức") : t("Lời mời tham gia")} <span>{data.total ?? '—'}</span></h2><p>{t("Ngày giờ Việt Nam · Số kết quả theo bộ lọc")}</p></div><div className="team-table-wrap"><table className="team-table" aria-label={tab === 'members' ? t("Thành viên tổ chức") : t("Lời mời tổ chức")} aria-busy={busy}><thead><tr><th>{tab === 'members' ? t("Thành viên") : t("Người nhận")}</th><th>{tab === 'members' ? t("Vai trò tổ chức") : t("Trạng thái")}</th><th>{tab === 'members' ? t("Ngày gia nhập") : t("Ngày mời / hết hạn")}</th>{(tab === 'invitations' || manage) && <th>{t("Thao tác")}</th>}</tr></thead><tbody>{!invalid && data.items.map(item => <tr key={item.userId ?? item.id}><td data-label={tab === 'members' ? t("Thành viên") : t("Người nhận")}>{tab === 'members' ? <div className="team-person"><Avatar user={item} /><strong>{item.displayName}</strong></div> : <strong className="team-email">{item.email}</strong>}</td><td data-label={tab === 'members' ? t("Vai trò tổ chức") : t("Trạng thái")}><span className={'team-role role-' + (item.role ?? item.state)}>{tab === 'members' ? organizationRoleLabel(item.role, locale) : t(invitationLabels[item.state])}</span></td><td data-label={tab === 'members' ? t("Ngày gia nhập") : t("Ngày mời / hết hạn")}>{date(item.joinedAt ?? item.createdAt, locale)}{tab === 'invitations' && <small>{t("Hết hạn {date}", { date: date(item.expiresAt, locale) })}</small>}</td>{tab === 'members' && manage && <td data-label={t("Thao tác")}><div className="team-member-actions"><button disabled={busy} aria-label={t("Phân bổ Workspace cho {name}", { name: item.displayName })} onClick={() => setEditing({ member: item, kind: 'workspace' })}>Workspace</button>{org.role === 'owner' && item.role !== 'owner' && <><button disabled={busy} aria-label={t("Đổi vai trò {name}", { name: item.displayName })} onClick={() => setEditing({ member: item, kind: 'role' })}>{t("Vai trò")}</button><button disabled={busy} aria-label={t("Chuyển Owner cho {name}", { name: item.displayName })} onClick={() => setEditing({ member: item, kind: 'transfer' })}>{t("Chuyển Owner")}</button></>}</div></td>}{tab === 'invitations' && <td data-label={t("Thao tác")}>{item.state === 'active' ? <button disabled={actionBusy || uncertain || busy} onClick={() => revoke(item)}>{t("Thu hồi")}</button> : <span className="muted">{t("Đã kết thúc")}</span>}</td>}</tr>)}</tbody></table></div>{!busy && !error && !invalid && !data.items.length && <EmptyState><h2>{tab === 'members' ? t("Không có thành viên phù hợp") : t("Chưa có lời mời phù hợp")}</h2><p>{t(manage && tab === 'invitations' ? 'Thử đổi bộ lọc hoặc mời thành viên mới.' : 'Thử đổi bộ lọc.')}</p></EmptyState>}{data.nextCursor && <button disabled={busy || actionBusy || invalid} onClick={() => load(data.nextCursor)}>{t(tab === 'members' ? 'Tải thêm thành viên' : 'Tải thêm lời mời')}</button>}</>}
    </>}{tab === 'audit' && error && <InlineMessage>{t(error)}<button onClick={() => setRevision(v => v + 1)}>{t("Thử lại")}</button></InlineMessage>}{tab === 'audit' && manage && <OrganizationAudit api={api} id={id} />}
    {org && <section className="team-role-guide" aria-label={t("Phạm vi quyền tổ chức")}><h2>{t("Hiểu đúng phạm vi quyền")}</h2><div><article><h3>{t("Chủ sở hữu")}</h3><p>{t("Quản trị tổ chức và Workspace trực thuộc. Chỉ Owner được đổi vai trò Admin và chuyển quyền sở hữu.")}</p></article><article><h3>{t("Quản trị viên")}</h3><p>{t("Mời thành viên, quản trị Workspace và phân bổ nhân sự. Vai trò quản trị không tự biến thành quyền nhận Task nếu chưa tham gia Workspace.")}</p></article><article><h3>{t("Thành viên")}</h3><p>{t("Tham gia Workspace được cấp quyền. Manager và Project Lead là quyền trong phạm vi riêng, không thay vai trò tổ chức.")}</p></article></div></section>}
    {editing && org && <OrganizationManageDialog api={api} org={org} member={editing.member} kind={editing.kind} onSaved={() => { clear(); setRevision(v => v + 1); }} onClose={unknown => { setEditing(null); if (unknown) setRevision(v => v + 1); }} />}
    {inviting && org && <OrganizationInviteDialog api={api} org={org} onSaved={() => { clear(); setBusy(true); setData({ items: [] }); setTab('invitations'); setRevision(v => v + 1); }} onClose={unknown => { setInviting(false); if (unknown) { clear(); setBusy(true); setData({ items: [] }); setTab('invitations'); setRevision(v => v + 1); } }} />}
  </main>;
}

