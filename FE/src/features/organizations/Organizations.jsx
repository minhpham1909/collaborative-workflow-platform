import { useAuthLocale } from '../auth/AuthLocale.jsx';
import { organizationText } from '../../lib/organization-text.js';
import { useEffect, useRef, useState } from 'react';
import { InlineMessage, LoadingState, EmptyState } from '../../components/Feedback.jsx';
import FilterPanel from '../../components/FilterPanel.jsx';
import NameDialog from '../../components/NameDialog.jsx';
import Icon from '../../components/Icon.jsx';
import StudioCover, { studioTone } from '../../components/StudioCover.jsx';
import { notify } from '../../components/NotificationProvider.jsx';
import { messageFor } from '../../lib/messages.js';

export const organizationRoleLabel = (role, locale = 'vi') => organizationText(({ owner: 'Chủ sở hữu', admin: 'Quản trị viên', member: 'Thành viên' })[role] ?? 'Có quyền truy cập', locale);
export default function Organizations({ api }) {
  const { locale } = useAuthLocale();
  const t = (value, values) => organizationText(value, locale, values);
  const [q, setQ] = useState(''), [role, setRole] = useState('all'), [from, setFrom] = useState(''), [to, setTo] = useState('');
  const [data, setData] = useState({ items: [] }), [busy, setBusy] = useState(true), [error, setError] = useState(''), [creating, setCreating] = useState(false), [revision, setRevision] = useState(0);
  const generation = useRef(0), invalid = from && to && from > to;
  const query = new URLSearchParams({ limit: '12', role, ...(q.trim() ? { q: q.trim() } : {}), ...(from ? { from } : {}), ...(to ? { to } : {}) }).toString();
  const clear = () => { setQ(''); setRole('all'); setFrom(''); setTo(''); };
  async function load(cursor = null, token = generation.current) {
    setBusy(true); setError('');
    try {
      const result = await api.request(`/organizations?${query}${cursor ? '&cursor=' + encodeURIComponent(cursor) : ''}`);
      if (token === generation.current) setData(old => ({ ...result, items: cursor ? [...old.items, ...result.items] : result.items }));
    } catch (e) { if (token === generation.current) { setError(messageFor(e)); if (!cursor) setData({ items: [] }); } }
    finally { if (token === generation.current) setBusy(false); }
  }
  useEffect(() => {
    const token = ++generation.current; setData({ items: [] }); setError('');
    if (invalid) { setBusy(false); return; }
    setBusy(true); const timer = setTimeout(() => load(null, token), 250);
    return () => { clearTimeout(timer); generation.current++; };
  }, [query, revision, invalid]);
  return <main lang={locale} className="organization-page">
    <section className="organization-hero"><div><p className="home-eyebrow">{t("CÙNG NHAU LÀM VIỆC")}</p><h1>{t("Tổ chức & Studio của bạn")}</h1><p>{t("Chọn đội ngũ để mở các Workspace bạn có quyền truy cập.")}</p></div><button className="primary" onClick={() => setCreating(true)}><Icon name="plus" />{t("Tạo tổ chức")}</button></section>
    <div className="organization-paths"><a href="#home"><Icon name="home" /><span><strong>{t("Làm việc theo nhóm nhỏ?")}</strong><small>{t("Vào Workspace trực tiếp, không cần tạo tổ chức.")}</small></span><Icon name="chevron-right" /></a><a href="#shared"><Icon name="folder" /><span><strong>{t("Dự án được chia sẻ")}</strong><small>{t("Truy cập Project được cấp với quyền Guest.")}</small></span><Icon name="chevron-right" /></a></div>
    <div className="home-filters"><FilterPanel locale={locale} compact advancedLabel={t("Thời gian")}><label>{t("Tìm tổ chức")}<input type="search" value={q} maxLength={200} onChange={e => setQ(e.target.value)} placeholder={t("Tên đội ngũ, Studio…")} /></label><label>{t("Từ ngày tạo")}<input type="date" value={from} onChange={e => setFrom(e.target.value)} /></label><label>{t("Đến ngày tạo")}<input type="date" value={to} onChange={e => setTo(e.target.value)} /></label><button onClick={clear}>{t("Xóa bộ lọc")}</button><button disabled={busy} onClick={() => setRevision(v => v + 1)}>{t("Làm mới")}</button></FilterPanel><div className="home-role-filters" role="group" aria-label={t("Vai trò trong tổ chức")}>{[['all', 'Tất cả'], ['owner', 'Chủ sở hữu'], ['admin', 'Quản trị viên'], ['member', 'Thành viên']].map(([key, label]) => <button key={key} aria-pressed={role === key} onClick={() => setRole(key)}>{t(label)}<span>{data.roleCounts?.[key] ?? '—'}</span></button>)}</div></div>
    {invalid && <InlineMessage>{t("Ngày bắt đầu phải trước hoặc bằng ngày kết thúc.")}</InlineMessage>}
    {error && <InlineMessage>{t(error)}<button onClick={() => setRevision(v => v + 1)}>{t("Thử lại")}</button></InlineMessage>}
    {busy && <LoadingState>{t("Đang tải tổ chức…")}</LoadingState>}
    <div className="home-collection-header"><h2>{t("Đội ngũ của bạn")} <span className="home-count">{data.total ?? '—'}</span></h2><span className="muted">{t("Vai trò của bạn")}</span></div>
    <div className="organization-grid" aria-busy={busy}>{!invalid && data.items.map(org => <article className="organization-card" key={org.id}><div className="organization-cover"><StudioCover id={org.id} /><span className="home-role-badge">{organizationRoleLabel(org.role, locale)}</span></div><div className="organization-card-body"><span className={'organization-initials tone-' + studioTone(org.id)}>{org.name.slice(0, 2).toUpperCase()}</span><h2><a href={`#organization/${org.id}`}>{org.name}</a></h2><p>{org.role === 'member' ? t("Xem những Workspace bạn đã được thêm vào.") : t("Điều phối Workspace và công việc của đội ngũ.")}</p><div className="organization-card-footer"><span>{t("Tạo {date}", { date: new Date(org.createdAt).toLocaleDateString(locale === 'en' ? 'en-GB' : 'vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' }) })}</span><span className="home-card-action" aria-hidden="true">{t("Vào tổ chức")}<Icon name="chevron-right" /></span></div></div></article>)}</div>
    {!busy && !error && !invalid && !data.items.length && <EmptyState><h2>{q || from || to || role !== 'all' ? t("Không có tổ chức phù hợp") : t("Bạn chưa tham gia tổ chức")}</h2><p>{q || from || to || role !== 'all' ? t("Thử thay đổi từ khóa hoặc bộ lọc.") : t("Bạn có thể tạo tổ chức hoặc tiếp tục dùng Workspace độc lập.")}</p></EmptyState>}
    {data.nextCursor && <button disabled={busy || invalid} onClick={() => load(data.nextCursor)}>{t("Tải thêm tổ chức")}</button>}
    {creating && <NameDialog locale={locale} title={t("Tạo tổ chức")} label={t("Tên tổ chức / Studio")} submitLabel={t("Tạo tổ chức")} onSave={async name => { await api.request('/organizations', { method: 'POST', body: { name } }); clear(); setRevision(v => v + 1); notify(t('Đã tạo tổ chức.')); }} onClose={uncertain => { setCreating(false); if (uncertain) { clear(); setRevision(v => v + 1); } }}><p className="muted">{t("Bạn sẽ là Chủ sở hữu. Sau khi tạo, bạn có thể thiết lập Workspace cho đội ngũ.")}</p></NameDialog>}
  </main>;
}
