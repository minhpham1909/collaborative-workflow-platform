// Only route/anchor geometry, never Task bodies or permission snapshots.
const positions=new Map();
export function rememberTaskPosition(userId,query,anchorId,offset,scrollY,itemCount){
 positions.set(userId+'|'+query,{query,anchorId,offset,scrollY,pages:Math.min(20,Math.max(1,Math.ceil(itemCount/12)))});
 if(positions.size>20)positions.delete(positions.keys().next().value);
}
export function takeTaskPosition(userId,query){const key=userId+'|'+query,value=positions.get(key);positions.delete(key);return value??null;}
if(typeof window!=='undefined')window.addEventListener('workflow:account-changed',()=>positions.clear());
