import {createContext,useCallback,useContext,useEffect,useRef,useState} from 'react';
import Icon from './Icon.jsx';
import {useAuthLocale} from '../features/auth/AuthLocale.jsx';
import {notify} from './NotificationProvider.jsx';
import {isUncertainMutation} from '../lib/mutation-outcome.js';
const Context=createContext(null);
const en={
 'Dự án đã ghim':'Pinned projects','Ghim Dự án':'Pin project','Bỏ ghim':'Unpin',
 'Chưa có Dự án đã ghim.':'No pinned projects yet.','Đang tải Dự án đã ghim…':'Loading pinned projects…',
 'Không tải được Dự án đã ghim.':'Unable to load pinned projects.','Thử lại':'Retry',
 'Dự án không còn truy cập':'Project unavailable','Chỉ đọc':'Read only',
 'Đã ghim Dự án.':'Project pinned.','Đã bỏ ghim.':'Project unpinned.',
 'Đã đủ 20 Dự án. Bỏ một ghim trước khi thêm.':'20 projects pinned. Unpin one before adding another.',
 'Không thể cập nhật ghim. Tải lại danh sách để kiểm tra.':'Unable to update pin. Reload the list to check.',
 'Chưa rõ thay đổi đã được lưu. Tải lại danh sách trước khi thử tiếp.':'The outcome is unknown. Reload the list before trying again.',
 'Xem thêm':'Show more','Thu gọn':'Show less'
};
function useText(){const {locale}=useAuthLocale();return value=>locale==='en'?(en[value]??value):value;}
export function ProjectPinsProvider({api,userId,verified,routeKey,children}){
 const [items,setItems]=useState([]),[loading,setLoading]=useState(true),[error,setError]=useState(''),[busy,setBusy]=useState(false);
 const generation=useRef(0),pending=useRef(false),mounted=useRef(true);
 useEffect(()=>{mounted.current=true;return()=>{mounted.current=false;generation.current++;};},[]);
 const load=useCallback(async()=>{
  const token=++generation.current;setLoading(true);setError('');
  if(!verified){setLoading(false);return;}
  try{const result=await api.request('/project-pins');if(token===generation.current)setItems(result.items);}
  catch{if(token===generation.current){setItems([]);setError('Không tải được Dự án đã ghim.');}}
  finally{if(token===generation.current)setLoading(false);}
 },[api,userId,verified]);
 useEffect(()=>{void load();return()=>{generation.current++;};},[load,routeKey]);
 useEffect(()=>{const focus=()=>{if(!pending.current)void load();};window.addEventListener('focus',focus);return()=>window.removeEventListener('focus',focus);},[load]);
 async function change(projectId,pinned){
  if(pending.current||loading||error)return;
  pending.current=true;setBusy(true);const token=++generation.current;
  try{const result=await api.request('/projects/'+projectId+'/pin',{method:'PATCH',body:{pinned}});if(mounted.current){if(token===generation.current)setItems(result.items);else void load();}return true;}
  catch(e){if(token===generation.current){setItems([]);setError('Không tải được Dự án đã ghim.');}throw new Error(e.code==='PIN_LIMIT_REACHED'?'Đã đủ 20 Dự án. Bỏ một ghim trước khi thêm.':isUncertainMutation(e)?'Chưa rõ thay đổi đã được lưu. Tải lại danh sách trước khi thử tiếp.':'Không thể cập nhật ghim. Tải lại danh sách để kiểm tra.');}
  finally{pending.current=false;setBusy(false);}
 }
 return <Context.Provider value={{items,loading,error,busy,load,change,verified}}>{children}</Context.Provider>;
}
export function ProjectPinButton({projectId}){
 const pins=useContext(Context),t=useText(),[error,setError]=useState('');
 useEffect(()=>{if(!pins?.loading&&!pins?.error)setError('');},[pins?.loading,pins?.error]);
 if(!pins?.verified)return null;
 const pinned=pins.items.some(item=>item.projectId===projectId);
 return <span className="project-pin-action"><button type="button" aria-pressed={pinned} disabled={pins.loading||pins.busy||Boolean(pins.error)} onClick={async()=>{setError('');try{if(await pins.change(projectId,!pinned))notify(t(pinned?'Đã bỏ ghim.':'Đã ghim Dự án.'));}catch(e){setError(e.message);}}}><Icon name={pinned?'pin-off':'pin'}/>{t(pinned?'Bỏ ghim':'Ghim Dự án')}</button>{(error||pins.error)&&<small role="alert">{t(error||pins.error)} <button type="button" disabled={pins.loading||pins.busy} onClick={()=>void pins.load()}>{t('Thử lại')}</button></small>}</span>;
}
export function ProjectPinsNav({route}){
 const pins=useContext(Context),t=useText(),[expanded,setExpanded]=useState(false),[error,setError]=useState('');
 if(!pins?.verified)return null;
 const items=expanded?pins.items:pins.items.slice(0,5);
 return <section className="project-pins-nav" aria-label={t('Dự án đã ghim')}>
  <h2><Icon name="pin"/>{t('Dự án đã ghim')} <span>{pins.loading&&!pins.items.length?'…':pins.items.length}</span></h2>
  {pins.loading&&!pins.items.length&&<p role="status">{t('Đang tải Dự án đã ghim…')}</p>}
  {pins.error&&<p role="alert">{t(pins.error)} <button disabled={pins.loading||pins.busy} onClick={()=>{setError('');void pins.load();}}>{t('Thử lại')}</button></p>}
  {error&&<p role="alert">{t(error)}</p>}
  {!pins.loading&&!pins.error&&!pins.items.length&&<p>{t('Chưa có Dự án đã ghim.')}</p>}
  <ul>{items.map(item=><li key={item.projectId}>
   {item.available?<a href={'#project/'+item.projectId} aria-current={route.kind==='project'&&route.id===item.projectId?'page':undefined}><Icon name={item.icon??'folder'}/><span><strong>{item.name}</strong><small>{item.workspaceName}{item.readOnly?' · '+t('Chỉ đọc'):''}</small></span></a>:<span className="pin-unavailable"><Icon name="eye-off"/><span>{t('Dự án không còn truy cập')}</span></span>}
   <button type="button" title={t('Bỏ ghim')} aria-label={t('Bỏ ghim')+(item.available?' '+item.name:'')} disabled={pins.loading||pins.busy||Boolean(pins.error)} onClick={async()=>{setError('');try{if(await pins.change(item.projectId,false))notify(t('Đã bỏ ghim.'));}catch(e){setError(e.message);}}}><Icon name="pin-off"/></button>
  </li>)}</ul>
  {pins.items.length>5&&<button type="button" aria-expanded={expanded} onClick={()=>setExpanded(v=>!v)}>{t(expanded?'Thu gọn':'Xem thêm')}</button>}
 </section>;
}
