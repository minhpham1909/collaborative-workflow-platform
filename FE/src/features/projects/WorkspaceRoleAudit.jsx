import { useEffect, useRef, useState } from 'react';
import { useAuthLocale } from '../auth/AuthLocale.jsx';
import { workspaceAuditText as workspaceText, workspaceAuditActions, workspaceAuditActionLabel, workspaceAuditFieldLabel, workspaceAuditCleanupLabel } from '../../lib/workspace-audit-text.js';
import { workspaceRoleLabel } from '../../lib/ui-copy.js';
import FilterPanel from '../../components/FilterPanel.jsx';
import { EmptyState, InlineMessage, LoadingState } from '../../components/Feedback.jsx';
import { messageFor } from '../../lib/messages.js';
import Icon from '../../components/Icon.jsx';
export default function WorkspaceRoleAudit({ api, workspace, revision, onContext, onUnavailable, management = false }) {
  const { locale } = useAuthLocale(), t = (text, values) => workspaceText(text, locale, values);
  const [action, setAction] = useState('all'), [open, setOpen] = useState(false), [q, setQ] = useState(''), [from, setFrom] = useState(''), [to, setTo] = useState(''), [data, setData] = useState({ items: [] }), [busy, setBusy] = useState(false), [error, setError] = useState(''), [retry, setRetry] = useState(0);
  const inFlight = useRef(null), generation = useRef(0), invalid = Boolean(from && to && from > to);
  const query = new URLSearchParams({ limit: '12', ...(management ? { action } : {}), ...(q.trim() ? { q: q.trim() } : {}), ...(from ? { from } : {}), ...(to ? { to } : {}) }).toString();
  async function load(cursor, token = generation.current) {
    if (inFlight.current === token) return;
    inFlight.current = token; setBusy(true); setError('');
    try { const result = await api.request(`/workspaces/${workspace.id}/${management ? 'audit' : 'role-audit'}?${query}${cursor ? '&cursor=' + encodeURIComponent(cursor) : ''}`); if (token === generation.current) setData(old => ({ ...result, items: cursor ? [...old.items, ...result.items] : result.items })); }
    catch (failure) {
      if (token !== generation.current) return;
      setError(messageFor(failure));
      if (!cursor || [401,403,404].includes(failure.status)) setData({ items: [] });
      if (failure.code === 'OWNER_REQUIRED') {
        try { const fresh = (await api.request(`/workspaces/${workspace.id}`)).workspace; if (token === generation.current) onContext(fresh); }
        catch (readFailure) { if (token === generation.current) onUnavailable?.(readFailure); }
      } else if ([401,403,404].includes(failure.status)) onUnavailable?.(failure);
    } finally { if (inFlight.current === token) inFlight.current = null; if (token === generation.current) setBusy(false); }
  }
  useEffect(() => { const token = ++generation.current; setData({ items: [] }); setError(''); setBusy(open && !invalid); if (!open || invalid) return; const timer = setTimeout(() => load(null, token), 250); return () => { clearTimeout(timer); generation.current++; }; }, [workspace.id, management, open, query, revision, retry]);
  useEffect(() => { if (!open) return; const refresh = () => setRetry(value => value + 1); window.addEventListener('focus', refresh); return () => window.removeEventListener('focus', refresh); }, [open]);
  const date = value => new Date(value).toLocaleString(locale === 'en' ? 'en-GB' : 'vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' });
  return <details className={`project-info workspace-role-audit${management ? ' workspace-management-audit' : ''}`} onToggle={event => setOpen(event.currentTarget.open)}><summary><Icon name="chevron-right" />{t(management ? 'Nhật ký quản lý Workspace' : 'Nhật ký bổ nhiệm & chuyển quyền')}</summary>{open && <>
    <p className="muted">{t(management ? 'Tổng hợp các bản ghi quản lý, phân quyền, lưu trữ và Ban hiện có. Không phải lịch sử đầy đủ từ khi tạo Workspace; không bao gồm hoạt động Task hoặc tổ chức.' : 'Chỉ ghi thay đổi vai trò trực tiếp và chuyển Owner; không bao gồm rời nhóm hoặc Ban.')}</p>
    <FilterPanel locale={locale} compact advancedLabel={t('Bộ lọc')} sortLabel={t('Mới tạo trước')}><label>{t('Tìm tên hoặc lý do')}<input type="search" maxLength={200} value={q} onChange={event => setQ(event.target.value)} /></label>{management && <label>{t('Loại thao tác')}<select aria-label={t('Loại thao tác')} value={action} onChange={event => setAction(event.target.value)}><option value="all">{t('Tất cả thao tác')}</option>{workspaceAuditActions.map(value => <option key={value} value={value}>{workspaceAuditActionLabel(value, locale)}</option>)}</select></label>}<label>{t('Từ ngày tạo')}<input type="date" value={from} onChange={event => setFrom(event.target.value)} /></label><label>{t('Đến ngày tạo')}<input type="date" value={to} onChange={event => setTo(event.target.value)} /></label><button onClick={() => { setQ(''); setFrom(''); setTo(''); setAction('all'); }}>{t('Xóa bộ lọc')}</button></FilterPanel>
    {invalid && <InlineMessage>{t('Ngày bắt đầu phải trước hoặc bằng ngày kết thúc.')}</InlineMessage>}{busy && <LoadingState>{t('Đang tải nhật ký…')}</LoadingState>}{error && <InlineMessage>{t(error)} <button disabled={busy} onClick={() => setRetry(value => value + 1)}>{t('Thử lại')}</button></InlineMessage>}
    {!busy && !error && !invalid && !data.items.length && <EmptyState>{t(management ? 'Chưa có bản ghi phù hợp trong các nguồn nhật ký hiện có.' : 'Chưa có thay đổi vai trò phù hợp.')}</EmptyState>}
    {management ? (data.items.length > 0 && <div className="team-table-wrap"><table className="team-table" aria-label={t('Nhật ký quản lý Workspace')}><thead><tr>{['Thao tác','Người liên quan','Người thực hiện','Chi tiết','Thời gian'].map(label => <th key={label}>{t(label)}</th>)}</tr></thead><tbody>{data.items.map(item => <tr key={item.id}>
      <td data-label={t('Thao tác')}>{workspaceAuditActionLabel(item.action, locale)}</td>
      <td data-label={t('Người liên quan')}>{item.target ? item.target.displayName ?? t('Không còn thông tin') : '—'}</td>
      <td data-label={t('Người thực hiện')}>{item.actor.displayName ?? t('Không còn thông tin')}</td>
      <td data-label={t('Chi tiết')}><div className="workspace-audit-context">
        {item.changedFields.length > 0 && <span>{item.changedFields.map(field => workspaceAuditFieldLabel(field, locale)).join(', ')}</span>}
        {item.previousRole && item.role && <span>{workspaceRoleLabel(item.previousRole, locale)} → {workspaceRoleLabel(item.role, locale)}</span>}
        {item.invitationType && <span>{t(item.invitationType === 'EMAIL' ? 'Lời mời qua email' : 'Lời mời qua liên kết')}</span>}
        {item.source === 'security' && <span>{t(item.scopeType === 'project' ? 'Phạm vi Project' : 'Phạm vi Workspace')}{item.project ? ` · ${item.project.name ?? t('Không còn thông tin')}` : ''}</span>}
        {item.action === 'ban' && item.cleanup && <span>{workspaceAuditCleanupLabel(item.cleanup, locale)}</span>}
        {item.reason && <span>{item.reason}</span>}
        {!item.changedFields.length && !item.previousRole && !item.invitationType && !item.reason && <span>—</span>}
      </div></td><td data-label={t('Thời gian')}>{date(item.createdAt)}</td>
    </tr>)}</tbody></table></div>) : (
    <div className="team-table-wrap"><table className="team-table" aria-label={t('Nhật ký vai trò Workspace')}><thead><tr><th>{t('Thành viên')}</th><th>{t('Thay đổi')}</th><th>{t('Người thực hiện')}</th><th>{t('Lý do')}</th><th>{t('Thời gian')}</th></tr></thead><tbody>{data.items.map(item => <tr key={item.id}><td data-label={t('Thành viên')}>{item.target.displayName ?? t('Không còn thông tin')}</td><td data-label={t('Thay đổi')}>{workspaceRoleLabel(item.previousRole, locale)} → {workspaceRoleLabel(item.role, locale)}</td><td data-label={t('Người thực hiện')}>{item.actor.displayName ?? t('Không còn thông tin')}</td><td data-label={t('Lý do')}>{item.previousRole === 'owner' || item.role === 'owner' ? t('Chuyển quyền sở hữu') : item.reason}</td><td data-label={t('Thời gian')}>{date(item.createdAt)}</td></tr>)}</tbody></table></div>)}
    {data.total !== undefined && <p className="muted">{t('{count} thay đổi', { count: data.total })}</p>}{data.nextCursor && <button disabled={busy} onClick={() => load(data.nextCursor)}>{t('Tải thêm')}</button>}
  </>}</details>;
}
