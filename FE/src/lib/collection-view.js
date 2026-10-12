export const viewKey=(userId,scope)=>'workflow.view.'+userId+'.'+scope;
export function readView(userId,scope,allowed,fallback,storage=()=>localStorage){
 if(!userId)return fallback;
 try{const value=storage().getItem(viewKey(userId,scope));return allowed.includes(value)?value:fallback;}catch{return fallback;}
}
export function writeView(userId,scope,allowed,value,storage=()=>localStorage){
 if(!userId||!allowed.includes(value))return false;
 try{storage().setItem(viewKey(userId,scope),value);return true;}catch{return false;}
}
