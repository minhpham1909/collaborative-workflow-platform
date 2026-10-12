import { useEffect, useRef, useState } from 'react';
import { useAuthLocale } from '../auth/AuthLocale.jsx';
import { workspaceRoleText as workspaceText } from '../../lib/workspace-role-text.js';
import { workspaceRoleLabel } from '../../lib/ui-copy.js';
import FilterPanel from '../../components/FilterPanel.jsx';
import { EmptyState, InlineMessage, LoadingState } from '../../components/Feedback.jsx';
import { messageFor } from '../../lib/messages.js';
import Icon from '../../components/Icon.jsx';
export default function WorkspaceRoleAudit({ api, workspace, revision, onContext, onUnavailable }) {
  const { locale } = useAuthLocale(), t = (text, values) => workspaceText(text, locale, values);
  const [open, setOpen] = useState(false), [q, setQ] = useState(''), [from, setFrom] = useState(''), [to, setTo] = useState(''), [data, setData] = useState({ items: [] }), [busy, setBusy] = useState(false), [error, setError] = useState(''), [retry, setRetry] = useState(0);
  const generation = useRef(0), invalid = Boolean(from && to && from > to);
  const query = new URLSearchParams({ limit: '12', ...(q.trim() ? { q: q.trim() } : {}), ...(from ? { from } : {}), ...(to ? { to } : {}) }).toString();
  async function load(cursor, token = generation.current) {
    setBusy(true); setError('');
    try { const result = await api.request(`/workspaces/${workspace.id}/role-audit?${query}${cursor ? '&cursor=' + encodeURIComponent(cursor) : ''}`); if (token === generation.current) setData(old => ({ ...result, items: cursor ? [...old.items, ...result.items] : result.items })); }
    catch (failure) {
      if (token !== generation.current) return;
      setError(messageFor(failure)); setData({ items: [] });
      if (failure.code === 'OWNER_REQUIRED') {
        try { const fresh = (await api.request(`/workspaces/${workspace.id}`)).workspace; if (token === generation.current) onContext(fresh); }
        catch (readFailure) { if (token === generation.current) onUnavailable?.(readFailure); }
      } else if ([401,403,404].includes(failure.status)) onUnavailable?.(failure);
    } finally { if (token === generation.current) setBusy(false); }
  }
  useEffect(() => { const token = ++generation.current; setData({ items: [] }); setError(''); setBusy(open && !invalid); if (!open || invalid) return; const timer = setTimeout(() => load(null, token), 250); return () => { clearTimeout(timer); generation.current++; }; }, [workspace.id, open, query, revision, retry]);
  const date = value => new Date(value).toLocaleString(locale === 'en' ? 'en-GB' : 'vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' });
  return <details className="project-info workspace-role-audit" onToggle={event => setOpen(event.currentTarget.open)}><summary><Icon name="chevron-right" />{t('Nhật ký bổ nhiệm & chuyển quyền')}</summary>{open && <>
    <p className="muted">{t('Chỉ ghi thay đổi vai trò trực tiếp và chuyển Owner; không bao gồm rời nhóm hoặc Ban.')}</p>
    <FilterPanel locale={locale} compact advancedLabel={t('Bộ lọc')} sortLabel={t('Mới tạo trước')}><label>{t('Tìm tên hoặc lý do')}<input type="search" maxLength={200} value={q} onChange={event => setQ(event.target.value)} /></label><label>{t('Từ ngày tạo')}<input type="date" value={from} onChange={event => setFrom(event.target.value)} /></label><label>{t('Đến ngày tạo')}<input type="date" value={to} onChange={event => setTo(event.target.value)} /></label><button onClick={() => { setQ(''); setFrom(''); setTo(''); }}>{t('Xóa bộ lọc')}</button></FilterPanel>
    {invalid && <InlineMessage>{t('Ngày bắt đầu phải trước hoặc bằng ngày kết thúc.')}</InlineMessage>}{busy && <LoadingState>{t('Đang tải nhật ký…')}</LoadingState>}{error && <InlineMessage>{t(error)} <button disabled={busy} onClick={() => setRetry(value => value + 1)}>{t('Thử lại')}</button></InlineMessage>}
    {!busy && !error && !invalid && !data.items.length && <EmptyState>{t('Chưa có thay đổi vai trò phù hợp.')}</EmptyState>}
    <div className="team-table-wrap"><table className="team-table" aria-label={t('Nhật ký vai trò Workspace')}><thead><tr><th>{t('Thành viên')}</th><th>{t('Thay đổi')}</th><th>{t('Người thực hiện')}</th><th>{t('Lý do')}</th><th>{t('Thời gian')}</th></tr></thead><tbody>{data.items.map(item => <tr key={item.id}><td data-label={t('Thành viên')}>{item.target.displayName ?? t('Không còn thông tin')}</td><td data-label={t('Thay đổi')}>{workspaceRoleLabel(item.previousRole, locale)} → {workspaceRoleLabel(item.role, locale)}</td><td data-label={t('Người thực hiện')}>{item.actor.displayName ?? t('Không còn thông tin')}</td><td data-label={t('Lý do')}>{item.previousRole === 'owner' || item.role === 'owner' ? t('Chuyển quyền sở hữu') : item.reason}</td><td data-label={t('Thời gian')}>{date(item.createdAt)}</td></tr>)}</tbody></table></div>
    {data.total !== undefined && <p className="muted">{t('{count} thay đổi', { count: data.total })}</p>}{data.nextCursor && <button disabled={busy} onClick={() => load(data.nextCursor)}>{t('Tải thêm')}</button>}
  </>}</details>;
}
