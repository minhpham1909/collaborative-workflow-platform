import {useEffect,useRef} from 'react';
import {hasActiveDraft} from './draft-navigation.js';

// Revalidate reads only. Never retry a mutation or replace an active draft.
export default function useLiveRefresh(revalidate){
 const latest=useRef(revalidate);latest.current=revalidate;
 useEffect(()=>{
  let timer,last=Date.now();
  const refresh=()=>{
   if(document.visibilityState==='hidden'||!navigator.onLine||window.scrollY>window.innerHeight/2||document.activeElement?.matches('input,textarea,[contenteditable=true]')||hasActiveDraft()||document.querySelector('[aria-modal="true"]'))return;
   clearTimeout(timer);
   timer=setTimeout(()=>{if(hasActiveDraft()||document.visibilityState==='hidden'||document.querySelector('[aria-modal="true"]')||document.activeElement?.matches('input,textarea,[contenteditable=true]'))return;last=Date.now();latest.current();},650);
  };
  const visible=()=>{if(document.visibilityState==='visible'&&Date.now()-last>5000)refresh();};
  window.addEventListener('focus',visible);window.addEventListener('online',refresh);
  window.addEventListener('workflow:data-changed',refresh);document.addEventListener('visibilitychange',visible);
  const interval=setInterval(()=>{if(Date.now()-last>=90000)refresh();},90000);
  return()=>{clearInterval(interval);clearTimeout(timer);window.removeEventListener('focus',visible);window.removeEventListener('online',refresh);window.removeEventListener('workflow:data-changed',refresh);document.removeEventListener('visibilitychange',visible);};
 },[]);
}
