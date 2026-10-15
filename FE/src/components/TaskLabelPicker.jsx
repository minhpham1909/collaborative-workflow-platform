import { taskText } from '../lib/task-text.js';
import { useEffect, useRef, useState } from 'react';
import { InlineMessage, LoadingState } from './Feedback.jsx';
import { messageFor } from '../lib/messages.js';
export default function TaskLabelPicker({ api, projectId, value, onChange, selectedLabels = [], disabled, locale = 'vi' }) {
  const tr = (value, values) => taskText(value, locale, values);
  const [data, setData] = useState({ items: [] }), [busy, setBusy] = useState(true), [error, setError] = useState(''), live = useRef(true);
  async function load(cursor) { setBusy(true); setError(''); try { const result = await api.request(`/projects/${projectId}/labels?limit=12${cursor ? '&cursor=' + encodeURIComponent(cursor) : ''}`); if (live.current) setData(old => ({ ...result, items: cursor ? [...old.items, ...result.items] : result.items })); } catch (error) { if (live.current) setError(messageFor(error)); } finally { if (live.current) setBusy(false); } }
  useEffect(() => { live.current = true; load(); return () => { live.current = false; }; }, [projectId]);
  const options = [...data.items, ...selectedLabels.filter(label => !data.items.some(item => item.id === label.id))];
  return <fieldset className="task-label-picker" disabled={disabled}><legend>{tr("Nhãn của Project")}</legend><p>{tr("Tối đa 20 nhãn. Nhãn đã lưu trữ không gán mới; muốn thay bộ nhãn hãy bỏ các nhãn đã lưu trữ.")}</p>{options.map(label => <label key={label.id} className="check"><input type="checkbox" checked={value.includes(label.id)} disabled={!value.includes(label.id) && (Boolean(label.archivedAt) || value.length >= 20)} onChange={event => onChange(event.target.checked ? [...value, label.id] : value.filter(id => id !== label.id))} />{label.name}{label.archivedAt ? tr(" · Đã lưu trữ") : ''}</label>)}{busy && <LoadingState>{tr("Đang tải nhãn…")}</LoadingState>}{error && <InlineMessage>{tr(error)}<button type="button" onClick={() => load()}>{tr("Tải lại nhãn")}</button></InlineMessage>}{data.nextCursor && <button type="button" disabled={busy} onClick={() => load(data.nextCursor)}>{tr("Tải thêm nhãn")}</button>}{!busy && !error && !options.length && <p>{tr("Project chưa có nhãn. Owner hoặc Manager của Workspace có thể tạo nhãn trong phần quản lý Project.")}</p>}</fieldset>;
}
