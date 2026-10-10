import { useAuthLocale } from '../auth/AuthLocale.jsx';
import { organizationText } from '../../lib/organization-text.js';
import { useEffect, useRef, useState } from 'react';
import { InlineMessage, LoadingState, EmptyState } from '../../components/Feedback.jsx';
import FilterPanel from '../../components/FilterPanel.jsx';
import NameDialog from '../../components/NameDialog.jsx';
import Icon from '../../components/Icon.jsx';
import StudioCover, { studioTone } from '../../components/StudioCover.jsx';
import { notify } from '../../components/NotificationProvider.jsx';
import { workspaceRoleLabel } from '../../lib/ui-copy.js';
import { messageFor } from '../../lib/messages.js';
import { organizationRoleLabel } from './Organizations.jsx';
import './team.css';

export default function Organization({ api, id }) {
  const { locale } = useAuthLocale();
  const t = (value, values) => organizationText(value, locale, values);
  const [org, setOrg] = useState(null), [data, setData] = useState({ items: [] }), [busy, setBusy] = useState(true), [error, setError] = useState(''), [creating, setCreating] = useState(false), [revision, setRevision] = useState(0);
  const [q, setQ] = useState(''), [state, setState] = useState('all'), [from, setFrom] = useState(''), [to, setTo] = useState(''), generation = useRef(0);
  const invalid = from && to && from > to;
  const query = new URLSearchParams({ limit: '12', state, ...(q.trim() ? { q: q.trim() } : {}), ...(from ? { from } : {}), ...(to ? { to } : {}) }).toString();
  const clear = () => { setQ(''); setState('all'); setFrom(''); setTo(''); };
  async function load(cursor = null, token = generation.current) {
    setBusy(true); setError('');
    try {
      const organization = (await api.request(`/organizations/${id}`)).organization;
      const result = await api.request(`/organizations/${id}/workspaces?${query}${cursor ? '&cursor=' + encodeURIComponent(cursor) : ''}`);
      if (token === generation.current) { setOrg(organization); setData(old => ({ ...result, items: cursor ? [...old.items, ...result.items] : result.items })); }
    } catch (e) { if (token === generation.current) { setError(messageFor(e)); if ([401, 403, 404].includes(e.status)) { setOrg(null); setCreating(false); setData({ items: [] }); } else if (!cursor) setData({ items: [] }); } }
    finally { if (token === generation.current) setBusy(false); }
  }
  useEffect(() => { const token = ++generation.current; setData({ items: [] }); setError(''); if (invalid) { setBusy(false); return; } setBusy(true); const timer = setTimeout(() => load(null, token), 250); return () => { clearTimeout(timer); generation.current++; }; }, [id, query, revision, invalid]);
  const canCreate = Boolean(org?.permissions?.createWorkspace);
  return <main lang={locale} className="organization-page">
    {org && <nav className="organization-section-nav" aria-label={t("Nội dung tổ chức")}><a href={`#organization/${id}`} aria-current="page">Workspace</a><a href={`#organization/${id}/team`}>{t("Thành viên & quyền")}</a></nav>}
    <p className="breadcrumbs"><a href="#organizations">{t("Tổ chức & Studio")}</a> / {org?.name ?? t("Tổ chức")}</p>
    <section className="organization-hero"><div><p className="home-eyebrow">{t("KHÔNG GIAN CỦA ĐỘI NGŨ")}</p><h1>{org?.name ?? t("Workspace trong tổ chức")}</h1><p>{org ? `${organizationRoleLabel(org.role, locale)} · ${t('Chỉ hiển thị Workspace bạn có quyền truy cập.')}` : t("Đang kiểm tra quyền truy cập hiện tại.")}</p></div>{canCreate && <button className="primary" disabled={busy} onClick={() => setCreating(true)}><Icon name="plus" />{t("Tạo Workspace")}</button>}</section>
    <div className="home-filters"><FilterPanel locale={locale} compact advancedLabel={t("Thời gian")}><label>{t("Tìm Workspace trong tổ chức")}<input type="search" value={q} maxLength={200} onChange={e => setQ(e.target.value)} placeholder={t("Tên hoặc mô tả Workspace…")} /></label><label>{t("Trạng thái Workspace")}<select value={state} onChange={e => setState(e.target.value)}><option value="all">{t("Tất cả trạng thái")}</option><option value="active">{t("Đang hoạt động")}</option><option value="archived">{t("Đã lưu trữ")}</option></select></label><label>{t("Từ ngày tạo")}<input type="date" value={from} onChange={e => setFrom(e.target.value)} /></label><label>{t("Đến ngày tạo")}<input type="date" value={to} onChange={e => setTo(e.target.value)} /></label><button onClick={clear}>{t("Xóa bộ lọc")}</button><button disabled={busy} onClick={() => setRevision(v => v + 1)}>{t("Làm mới")}</button></FilterPanel></div>
    {invalid && <InlineMessage>{t("Ngày bắt đầu phải trước hoặc bằng ngày kết thúc.")}</InlineMessage>}{error && <InlineMessage>{t(error)}<button onClick={() => setRevision(v => v + 1)}>{t("Thử lại")}</button></InlineMessage>}{busy && <LoadingState>{t("Đang tải Workspace…")}</LoadingState>}
    {org && <><div className="home-collection-header"><h2>{t("Workspace trực thuộc")} <span className="home-count">{data.total ?? '—'}</span></h2><span className="muted">{t("Mới tạo trước")}</span></div><div className="organization-grid" aria-busy={busy}>{!invalid && data.items.map(ws => <article className="organization-card" key={ws.id}><div className="organization-cover"><StudioCover id={ws.id} archived={ws.state === 'archived'} /><span className="home-role-badge">{workspaceRoleLabel(ws.role, locale)}</span>{ws.state === 'archived' && <span className="home-archived-badge">{t("Chỉ đọc")}</span>}</div><div className="organization-card-body"><span className={'organization-initials tone-' + studioTone(ws.id)}><Icon name={['palette', 'code', 'megaphone'][studioTone(ws.id)]} /></span><h2><a href={`#workspace/${ws.id}`}>{ws.name}</a></h2><p>{ws.description?.plainText || t("Không gian để đội ngũ cùng làm việc.")}</p><div className="workspace-metrics"><span><Icon name="people" /><div>{t("Thành viên")}<strong>{t('{count} người', { count: ws.memberCount ?? '—' })}</strong></div></span><span><Icon name="folder" /><div>{t("Dự án hoạt động")}<strong>{t('{count} dự án', { count: ws.activeProjectCount ?? '—' })}</strong></div></span></div><div className="organization-card-footer"><span>{ws.state === 'archived' ? t("Đã lưu trữ") : t("Đang hoạt động")}</span><span className="home-card-action" aria-hidden="true">{t("Mở Workspace")}<Icon name="chevron-right" /></span></div></div></article>)}</div>{!busy && !error && !invalid && !data.items.length && <EmptyState><h2>{q || from || to || state !== 'all' ? t("Không có Workspace phù hợp") : t("Chưa có Workspace hiển thị")}</h2><p>{canCreate ? t("Tạo Workspace hoặc thay đổi bộ lọc để tiếp tục.") : t("Bạn chỉ xem được Workspace đã được thêm vào. Liên hệ quản lý nếu cần quyền truy cập.")}</p></EmptyState>}{data.nextCursor && <button disabled={busy || invalid} onClick={() => load(data.nextCursor)}>{t("Tải thêm Workspace")}</button>}</>}
    {creating && canCreate && <NameDialog locale={locale} title={t("Tạo Workspace trong tổ chức")} label={t("Tên Workspace")} submitLabel={t("Tạo Workspace")} onSave={async name => { await api.request(`/organizations/${id}/workspaces`, { method: 'POST', body: { name } }); clear(); setRevision(v => v + 1); notify(t('Đã tạo Workspace trong tổ chức.')); }} onClose={uncertain => { setCreating(false); if (uncertain) { clear(); setRevision(v => v + 1); } }}><p className="muted">{t("Workspace thuộc {name}. Bạn được thiết lập làm Manager ban đầu; vai trò tổ chức được giữ nguyên.", { name: org.name })}</p></NameDialog>}
  </main>;
}
