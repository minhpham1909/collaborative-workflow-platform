import { useAuthLocale } from '../auth/AuthLocale.jsx';
import { workflowText } from '../../lib/workflow-text.js';
import { useEffect, useRef, useState } from 'react';
import FormField from '../../components/FormField.jsx';
import { messageFor } from '../../lib/messages.js';

// Both selectors use authorized, paginated server lists, never the current Task page.
export default function MyTaskScope({ api, workspaceId, projectId, labelId, onProject, onLabel }) {
  const { locale } = useAuthLocale();
  const tr = (value, values) => workflowText(value, locale, values);
  return <><ScopeSelect key={'project:'+workspaceId} api={api} path={`/workspaces/${workspaceId}/projects?state=all&limit=20`} label="Project" value={projectId} onChange={onProject} empty={tr("Tất cả Project")} disabled={!workspaceId}/><ScopeSelect key={'label:'+projectId} api={api} path={`/projects/${projectId}/labels?limit=20`} label={tr("Nhãn")} value={labelId} onChange={onLabel} empty={tr("Tất cả nhãn")} disabled={!projectId}/></>;
}
function ScopeSelect({ api, path, label, value, onChange, empty, disabled }) {
  const { locale } = useAuthLocale();
  const tr = (value, values) => workflowText(value, locale, values);
  const [data,setData]=useState({items:[]}),[busy,setBusy]=useState(false),[error,setError]=useState('');
  const live=useRef(true),pending=useRef(false);
  async function load(cursor) { if(pending.current) return; pending.current=true;setBusy(true);setError('');try {const result=await api.request(path+(cursor?'&cursor='+encodeURIComponent(cursor):''));if(live.current)setData(old=>({...result,items:cursor?[...old.items,...result.items]:result.items}));}catch(error){if(live.current)setError(messageFor(error));}finally{pending.current=false;if(live.current)setBusy(false);} }
  useEffect(()=>{live.current=true;if(!disabled)load();return()=>{live.current=false;};},[disabled,path]);
  return <div><FormField label={tr(label)} error={tr(error)} hint={disabled ? label==='Project'?tr("Chọn Workspace để lọc Project."):tr("Chọn Project để lọc nhãn.") : busy?tr("Đang tải…"):null}>{props=><select {...props} value={value} disabled={disabled||busy||Boolean(error)} onChange={event=>onChange(event.target.value)}><option value="">{empty}</option>{value&&!data.items.some(item=>item.id===value)&&<option value={value}>{tr("{label} đã chọn", { label: tr(label) })}</option>}{data.items.map(item=><option key={item.id} value={item.id}>{item.name}{item.state==='archived'||item.archivedAt?tr(" · Đã lưu trữ"):''}</option>)}</select>}</FormField>{error&&<button onClick={()=>load()}>{tr("Thử tải {label} lại", { label: tr(label) })}</button>}{data.nextCursor&&<button disabled={busy} onClick={()=>load(data.nextCursor)}>{tr("Tải thêm {label}", { label: tr(label) })}</button>}</div>;
}
