import {useEffect,useRef,useState} from 'react';
export default function CollectionLoadMore({cursor,busy,error,queryKey,onLoad,locale='vi'}){
 const [auto,setAuto]=useState(false),[pages,setPages]=useState(0),sentinel=useRef(null),pending=useRef(false),requested=useRef(null),count=useRef(0);
 const en=locale==='en',supported=typeof IntersectionObserver!=='undefined';
 useEffect(()=>{count.current=0;requested.current=null;setPages(0);},[queryKey]);
 async function load(automatic=false){
  if(!cursor||busy||pending.current||(automatic&&(error||count.current>=3||requested.current===cursor)))return;
  requested.current=cursor;pending.current=true;
  if(automatic){count.current++;setPages(count.current);}
  try{await onLoad(cursor);}finally{pending.current=false;}
 }
 useEffect(()=>{
  if(!auto||!supported||busy||error||count.current>=3||!cursor)return;
  const observer=new IntersectionObserver(entries=>{if(entries.some(entry=>entry.isIntersecting))void load(true);},{rootMargin:'200px'});
  observer.observe(sentinel.current);return()=>observer.disconnect();
 },[auto,supported,busy,error,cursor,queryKey]);
 return <div className="collection-load-more" ref={sentinel}>
  <button type="button" disabled={busy} onClick={()=>void load()}>{en?'Load more notifications':'Tải thêm thông báo'}</button>
  <label><input type="checkbox" checked={auto} disabled={!supported||busy} onChange={event=>setAuto(event.target.checked)}/>{en?'Load automatically when scrolling':'Tự tải khi cuộn'}</label>
  <small>{!supported?(en?'Use Load more in this browser.':'Dùng nút Tải thêm trên trình duyệt này.'):pages>=3?(en?'Automatic loading paused after 3 pages. Use Load more to continue.':'Đã dừng tự tải sau 3 trang. Dùng Tải thêm để tiếp tục.'):(en?'Optional; automatically loads up to 3 pages per filter.':'Tùy chọn; tự tải tối đa 3 trang mỗi lượt lọc.')}</small>
 </div>;
}
