import { useAuthLocale } from '../auth/AuthLocale.jsx';
import { taskText } from '../../lib/task-text.js';
import { useEffect, useRef, useState } from 'react';
import { EmptyState, InlineMessage, LoadingState } from '../../components/Feedback.jsx';
import { messageFor } from '../../lib/messages.js';
import { statuses } from '../../lib/content.js';
const fields = { title:'Tiêu đề', description:'Mô tả', assigneeId:'Người thực hiện', dueAt:'Deadline', priority:'Ưu tiên', labelIds:'Nhãn', checklist:'Checklist', completedAt:'Ngày hoàn thành', deletedAt:'Thùng rác' };
const labels = { created: 'Tạo Task', updated: 'Cập nhật Task', status_changed: 'Đổi trạng thái', checklist_changed: 'Sửa checklist', checklist_ticked: 'Cập nhật checklist', reopened: 'Mở lại Task', deleted: 'Chuyển vào thùng rác', restored: 'Phục hồi Task' };
export default function TaskActivity({ api, task }) {
  const { locale } = useAuthLocale();
  const tr = (value, values) => taskText(value, locale, values);
  const [data, setData] = useState({ items: [] }), [busy, setBusy] = useState(true), [error, setError] = useState(''), [revision, setRevision] = useState(0), generation = useRef(0);
  const [open, setOpen] = useState(false);
  async function load(cursor, token = generation.current) { setBusy(true); setError(''); try { const result = await api.request(`/tasks/${task.id}/activity?limit=12${cursor ? '&cursor='+encodeURIComponent(cursor) : ''}`); if (token === generation.current) setData(old => ({ ...result, items: cursor ? [...old.items, ...result.items] : result.items })); } catch (error) { if (token === generation.current) { setError(messageFor(error)); setData({ items: [] }); } } finally { if (token === generation.current) setBusy(false); } }
  useEffect(() => { if (!open) return; const token = ++generation.current; setData({ items: [] }); load(null, token); return () => { generation.current++; }; }, [task.id, task.version, revision, open]);
  return <section className="task-activity"><div className="section-heading"><h2>{tr("Lịch sử Task")}</h2><button onClick={() => setOpen(value => !value)}>{open ? tr("Thu gọn lịch sử Task") : tr("Xem lịch sử Task")}</button>{open && <button disabled={busy} onClick={() => setRevision(value => value+1)}>{tr("Tải lại lịch sử")}</button>}</div>{open && <>{error && <InlineMessage>{tr(error)}</InlineMessage>}{busy && <LoadingState>{tr("Đang tải lịch sử…")}</LoadingState>}<ol className="audit-list">{data.items.map(item => <li key={item.id}><strong>{tr(labels[item.action] ?? 'Thay đổi Task')}</strong><p>{item.actor?.displayName ?? tr("Người dùng không còn khả dụng")} · {tr("Phiên bản")} {item.taskVersion}</p>{item.previousStatus && item.status && item.previousStatus !== item.status && <p>{tr(statuses[item.previousStatus])} → {tr(statuses[item.status])}</p>}{item.action === 'updated' && item.fields?.length > 0 && <p>{item.fields.map(field => tr(fields[field] ?? 'Thông tin Task')).join(', ')}</p>}{item.reason && <p>{item.reason}</p>}<time dateTime={item.createdAt}>{new Date(item.createdAt).toLocaleString(locale === "en" ? "en-GB" : "vi-VN", { timeZone:'Asia/Ho_Chi_Minh' })}</time></li>)}</ol>{!busy && !error && !data.items.length && <EmptyState>{tr("Chưa có lịch sử được ghi nhận.")}</EmptyState>}{data.nextCursor && <button disabled={busy} onClick={() => load(data.nextCursor)}>{tr("Tải thêm lịch sử")}</button>}</>}</section>;
}

