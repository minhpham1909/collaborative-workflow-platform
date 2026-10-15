import {viewKey,readView,writeView} from '../lib/collection-view.js';
import {useEffect,useState} from 'react';
import Icon from './Icon.jsx';
export function useCollectionView(userId,scope,allowed,defaultView){
 const key=viewKey(userId,scope);
 const read=()=>readView(userId,scope,allowed,defaultView);
 const [view,setView]=useState(read);
 useEffect(()=>{setView(read());const sync=event=>{if(event.key===key||event.key===null)setView(read());};window.addEventListener('storage',sync);return()=>window.removeEventListener('storage',sync);},[key]);
 const choose=value=>{if(!allowed.includes(value))return;setView(value);writeView(userId,scope,allowed,value);};
 return [view,choose];
}
export default function CollectionView({view,onChange,locale='vi',kind='density',labels,iconOnly=false}){
 const en=locale==='en',choices=kind==='layout'?[['grid',en?'Cards':'Dạng thẻ','grid'],['list',en?'List':'Danh sách','list']]:[['detailed',en?'Cards':'Dạng thẻ','grid'],['compact',en?'List':'Danh sách','list']];
 return <div className={"collection-view"+(iconOnly?" collection-view-icons":"")} role="group" aria-label={en?'List view':'Cách xem danh sách'}>{choices.map(([value,label,icon],index)=><button type="button" key={value} aria-label={labels?.[index]??label} title={labels?.[index]??label} aria-pressed={view===value} onClick={()=>onChange(value)}><Icon name={icon}/>{!iconOnly&&label}</button>)}</div>;
}
