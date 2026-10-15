import useLiveRefresh from '../../lib/useLiveRefresh.js';
import { useAuthLocale } from '../auth/AuthLocale.jsx';
import { workflowText } from '../../lib/workflow-text.js';
import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { EmptyState, InlineMessage, LoadingState } from '../../components/Feedback.jsx';
import { confirmDialog, notify } from '../../components/NotificationProvider.jsx';
import DescriptionPreview from '../../components/DescriptionPreview.jsx';
import useDialogFocus from '../../components/useDialogFocus.js';
import { useDraftGuard } from '../../lib/draft-navigation.js';
import { isUncertainMutation } from '../../lib/mutation-outcome.js';
import { messageFor } from '../../lib/messages.js';
import './trash.css';

const date = (value, locale = "vi") => value ? new Date(value).toLocaleString(locale === "en" ? "en-GB" : "vi-VN", { timeZone: 'Asia/Ho_Chi_Minh', dateStyle: 'short', timeStyle: 'short' }) : locale === 'en' ? 'Not set' : 'Chưa có';
const statuses = { todo: 'Chưa làm', in_progress: 'Đang làm', done: 'Hoàn thành' };
function blockedReason(task, project, now) {
  if (task.purgeAt && Date.parse(task.purgeAt) <= now) return 'Đã hết thời gian phục hồi';
  if (project.readOnly || project.state !== 'active') return 'Cần mở lại Project và Workspace';
  if (!task.permissions?.restore) return 'Quyền hiện tại không cho phép phục hồi';
  return '';
}
function Retention({ task }) {
  const { locale } = useAuthLocale();
  const tr = (value, values) => workflowText(value, locale, values);
  return <p className="trash-retention">{task.retentionScheduled ? <>{tr("Phục hồi trước")}<time dateTime={task.purgeAt}>{date(task.purgeAt, locale)}</time></> : tr("Dữ liệu cũ · Chưa có lịch xóa tự động")}</p>;
}
function TrashDetail({ task, onClose }) {
  const { locale } = useAuthLocale();
  const tr = (value, values) => workflowText(value, locale, values);
  const panel = useRef(null);
  useDialogFocus(panel, onClose);
  return createPortal(<div className="overlay"><section ref={panel} tabIndex={-1} className="dialog trash-detail" role="dialog" aria-modal="true" aria-labelledby="trash-detail-title">
    <div className="section-heading"><h2 id="trash-detail-title">{tr("Task trong thùng rác")}</h2><button onClick={onClose}>{tr("Đóng chi tiết")}</button></div>
    <p className="task-code">{task.code ?? tr("Task cũ · Chưa có mã")}</p><h3>{task.title}</h3>
    <p className="badge">{tr(statuses[task.status])}</p>
    <dl className="trash-facts"><div><dt>{tr("Người tạo")}</dt><dd>{task.creator?.displayName ?? tr("Không còn thông tin")}</dd></div><div><dt>{tr("Người thực hiện")}</dt><dd>{task.assignee?.displayName ?? tr("Chưa phân công")}{task.assigneeLeft && tr(" · Không còn tham gia")}</dd></div><div><dt>{tr("Ưu tiên")}</dt><dd>{{ high: tr("Cao"), medium: tr("Trung bình"), low: tr("Thấp") }[task.priority]}</dd></div><div><dt>{tr("Hạn chót")}</dt><dd>{date(task.dueAt, locale)}</dd></div><div><dt>{tr("Đã xóa lúc")}</dt><dd>{date(task.deletedAt, locale)}</dd></div>{task.status === 'done' && <div><dt>{tr("Hoàn thành lúc")}</dt><dd>{date(task.completedAt, locale)}</dd></div>}</dl>
    <Retention task={task} />
    {task.labels?.length > 0 && <div className="board-labels">{task.labels.map(label => <span key={label.id}>{label.name}</span>)}</div>}
    <h3>{tr("Mô tả")}</h3>{task.description?.plainText ? <DescriptionPreview locale={locale} value={task.description} label={tr("Mô tả Task đã xóa")} limit={10000} /> : <p>{tr("Chưa có mô tả.")}</p>}
    {task.checklist?.length > 0 && <><h3>{tr("Checklist · Chỉ đọc")}</h3><ul>{task.checklist.map(item => <li key={item.id ?? item._id}>{item.checked ? '✓' : '○'} {item.text}</li>)}</ul></>}
    <p className="muted">{tr("Đây là dữ liệu Task đã xóa. Phục hồi để tiếp tục làm việc với Task và thảo luận.")}</p>
  </section></div>, document.body);
}

export default function ProjectTrash({ api, project, onContext, onUnavailable, onBusyChange }) {
  const { locale } = useAuthLocale();
  const tr = (value, values) => workflowText(value, locale, values);
  const [items, setItems] = useState([]), [total, setTotal] = useState(null), [cursor, setCursor] = useState(null);
  const [loading, setLoading] = useState(false), [writing, setWriting] = useState(false), [error, setError] = useState(''), [locked, setLocked] = useState(true), [selected, setSelected] = useState(null);
  const [notice, setNotice] = useState(''), [now, setNow] = useState(Date.now());
  useLiveRefresh(() => { if(!loading&&!writing)void load(); });
  const pending = useRef(false), epoch = useRef(0), alive = useRef(true);
  useDraftGuard({ dirty: false, busy: writing });
  useEffect(() => { onBusyChange(writing); return () => onBusyChange(false); }, [writing, onBusyChange]);
  async function load(after = null) {
    if (pending.current) return;
    const generation = ++epoch.current;
    setLoading(true); setLocked(true); setError(''); setSelected(null);
    if (!after) { setItems([]); setTotal(null); setCursor(null); }
    try {
      const context = (await api.request(`/projects/${project.id}`)).project;
      const data = await api.request(`/projects/${project.id}/trash?limit=20${after ? '&cursor=' + encodeURIComponent(after) : ''}`);
      if (!alive.current || generation !== epoch.current) return;
      onContext(context); setItems(old => after ? [...old.filter(item => !data.items.some(next => next.id === item.id)), ...data.items] : data.items); setTotal(data.total); setCursor(data.nextCursor); setLocked(false); setNow(Date.now());
    } catch (e) {
      if (!alive.current || generation !== epoch.current) return;
      setError(messageFor(e));
      if ([401, 403, 404].includes(e.status)) { setItems([]); setTotal(null); setCursor(null); onUnavailable(e); }
    } finally { if (alive.current && generation === epoch.current) setLoading(false); }
  }
  useEffect(() => {
    alive.current = true;
    if (project.accessRole !== 'guest') load();
    const timer = setInterval(() => setNow(Date.now()), 30000);
    return () => { alive.current = false; epoch.current++; clearInterval(timer); };
  }, [project.id]);
  async function restore(task) {
    if (pending.current || locked || loading || blockedReason(task, project, Date.now())) return;
    pending.current = true; setWriting(true);
    try {
      const confirmed = await confirmDialog(tr("Phục hồi “{name}”? Giữ nội dung và trạng thái cũ; kiểm tra lại người thực hiện. Không gửi lại thông báo công việc cũ.", { name: task.title }), { confirmLabel: tr("Phục hồi Task"), cancelLabel: tr("Giữ trong thùng rác") });
      if (!confirmed || !alive.current) return;
      setError(''); setNotice('');
      await api.request(`/tasks/${task.id}/restore`, { method: 'POST', body: { expectedVersion: task.version } });
      if (!alive.current) return;
      setItems(old => old.filter(item => item.id !== task.id)); setTotal(old => old === null ? old : Math.max(0, old - 1));
      setNotice(`Đã phục hồi “${task.title}”. Task đã trở lại Board.`); notify(tr("Đã phục hồi Task."));
    } catch (e) {
      if (!alive.current) return;
      setLocked(true); setSelected(null);
      setError(isUncertainMutation(e) ? tr("Chưa xác nhận kết quả phục hồi. Tải lại thùng rác trước khi thao tác tiếp; Task có thể đã trở lại Board.") : messageFor(e));
      if ([401, 403, 404].includes(e.status)) { setItems([]); setTotal(null); setCursor(null); onUnavailable(e); }
    } finally { pending.current = false; if (alive.current) setWriting(false); }
  }
  if (project.accessRole === 'guest') return <InlineMessage>{tr("Guest không có quyền xem thùng rác Project.")}<a href={`#project/${project.id}`}>{tr("Về Board")}</a></InlineMessage>;
  return <section className="project-trash" aria-labelledby="trash-heading" aria-busy={loading || writing}>
    <header className="trash-heading"><div><p className="eyebrow">{tr("DỌN DẸP & KHÔI PHỤC")}</p><h2 id="trash-heading">{tr("Thùng rác Task")} {total !== null && <span className="badge">{total}</span>}</h2><p>{tr("Task đã xóa có thể phục hồi trong 30 ngày. Bạn chỉ thấy Task thuộc phạm vi quyền hiện tại.")}</p></div></header>
    <p className="muted trash-caption">{tr("Xóa gần nhất trước · Giờ Việt Nam · Workspace và Project được lưu trữ riêng")}</p>
    {error && <InlineMessage>{tr(error)}</InlineMessage>}{notice && <InlineMessage tone="info">{tr(notice)} <a href={`#project/${project.id}`}>{tr("Về Board")}</a></InlineMessage>}
    {loading && <LoadingState>{tr("Đang tải thùng rác…")}</LoadingState>}
    {!loading && !error && total === 0 && <EmptyState><h3>{tr("Không có Task trong thùng rác")}</h3><p>{tr("Các Task đã xóa mà bạn được quyền xem sẽ xuất hiện tại đây.")}</p><a href={`#project/${project.id}`}>{tr("Tiếp tục trên Board →")}</a></EmptyState>}
    <ul className="trash-list">{items.map(task => { const reason = blockedReason(task, project, now); return <li key={task.id}>
      <div className="trash-task-content"><p className="task-code">{task.code ?? tr("Task cũ · Chưa có mã")}</p><h3>{task.title}</h3><div className="trash-meta"><span className="badge">{tr(statuses[task.status])}</span><span>{tr("Người tạo")} : {task.creator?.displayName ?? tr("Không còn thông tin")}</span><span>{tr("Đã xóa {date}", { date: date(task.deletedAt, locale) })}</span></div><Retention task={task} />{reason && <p className="trash-blocked">{tr(reason)}</p>}</div>
      <div className="trash-actions"><button disabled={loading || writing || locked} aria-label={tr("Xem Task đã xóa: {name}", { name: task.title })} onClick={() => setSelected(task)}>{tr("Xem chi tiết")}</button><button className="primary" disabled={loading || writing || locked || Boolean(reason)} aria-label={tr("Phục hồi Task: {name}", { name: task.title })} onClick={() => restore(task)}>{tr("Phục hồi")}</button></div>
    </li>; })}</ul>
    {cursor && <button disabled={loading || writing || locked} onClick={() => load(cursor)}>{tr("Tải thêm Task đã xóa")}</button>}
    {selected && <TrashDetail task={selected} onClose={() => setSelected(null)} />}
  </section>;
}
