import { useEffect, useRef, useState } from 'react';
import FormField from '../../components/FormField.jsx';
import { messageFor } from '../../lib/messages.js';

// Both selectors use authorized, paginated server lists, never the current Task page.
export default function MyTaskScope({ api, workspaceId, projectId, labelId, onProject, onLabel }) {
  return <><ScopeSelect key={'project:'+workspaceId} api={api} path={`/workspaces/${workspaceId}/projects?state=all&limit=20`} label="Project" value={projectId} onChange={onProject} empty="Tất cả Project" disabled={!workspaceId}/><ScopeSelect key={'label:'+projectId} api={api} path={`/projects/${projectId}/labels?limit=20`} label="Nhãn" value={labelId} onChange={onLabel} empty="Tất cả nhãn" disabled={!projectId}/></>;
}
function ScopeSelect({ api, path, label, value, onChange, empty, disabled }) {
  const [data,setData]=useState({items:[]}),[busy,setBusy]=useState(false),[error,setError]=useState('');
  const live=useRef(true),pending=useRef(false);
  async function load(cursor) { if(pending.current) return; pending.current=true;setBusy(true);setError('');try {const result=await api.request(path+(cursor?'&cursor='+encodeURIComponent(cursor):''));if(live.current)setData(old=>({...result,items:cursor?[...old.items,...result.items]:result.items}));}catch(error){if(live.current)setError(messageFor(error));}finally{pending.current=false;if(live.current)setBusy(false);} }
  useEffect(()=>{live.current=true;if(!disabled)load();return()=>{live.current=false;};},[disabled,path]);
  return <div><FormField label={label} error={error} hint={disabled ? label==='Project'?'Chọn Workspace để lọc Project.':'Chọn Project để lọc nhãn.' : busy?'Đang tải…':null}>{props=><select {...props} value={value} disabled={disabled||busy||Boolean(error)} onChange={event=>onChange(event.target.value)}><option value="">{empty}</option>{value&&!data.items.some(item=>item.id===value)&&<option value={value}>{label} đã chọn</option>}{data.items.map(item=><option key={item.id} value={item.id}>{item.name}{item.state==='archived'||item.archivedAt?' · Đã lưu trữ':''}</option>)}</select>}</FormField>{error&&<button onClick={()=>load()}>Thử tải {label} lại</button>}{data.nextCursor&&<button disabled={busy} onClick={()=>load(data.nextCursor)}>Tải thêm {label}</button>}</div>;
}
