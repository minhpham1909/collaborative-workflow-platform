export const vietnamToday=(date=new Date())=>new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Ho_Chi_Minh',year:'numeric',month:'2-digit',day:'2-digit'}).format(date);
export const validMonth=value=>typeof value==='string'&&/^\d{4}-(0[1-9]|1[0-2])$/.test(value)&&Number(value.slice(0,4))>=1900;
export function monthDays(month){if(!validMonth(month))return[];const y=Number(month.slice(0,4)),m=Number(month.slice(5)),count=new Date(Date.UTC(y,m,0)).getUTCDate();return Array.from({length:count},(_,i)=>month+'-'+String(i+1).padStart(2,'0'));}
export function calendarCells(month){const days=monthDays(month);if(!days.length)return[];const offset=(new Date(month+'-01T12:00:00Z').getUTCDay()+6)%7;const cells=[...Array(offset).fill(null),...days];while(cells.length%7)cells.push(null);return cells;}
export function moveMonth(month,step){if(!validMonth(month))return null;const date=new Date(month+'-01T12:00:00Z');date.setUTCMonth(date.getUTCMonth()+step);const result=date.toISOString().slice(0,7);return validMonth(result)?result:null;}
export function calendarFilters(hash=location.hash){
 const p=new URLSearchParams(hash.split('?')[1]??''),today=vietnamToday(),month=validMonth(p.get('month'))?p.get('month'):today.slice(0,7),days=monthDays(month),day=p.get('day')==='none'?'none':days.includes(p.get('day'))?p.get('day'):month===today.slice(0,7)?today:days[0];
 const id=v=>/^[a-f0-9]{24}$/.test(v??'')?v:'';
 return {month,day,status:['open','all','todo','in_progress','done'].includes(p.get('status'))?p.get('status'):'open',state:['active','archived','all'].includes(p.get('state'))?p.get('state'):'active',workspaceId:id(p.get('workspaceId')),projectId:id(p.get('projectId')),q:(p.get('q')??'').slice(0,200)};
}
export function calendarParams(filters){return new URLSearchParams(Object.entries(filters).filter(([,value])=>value!==''));}
export function calendarReturn(hash=location.hash){const value=new URLSearchParams(hash.split('?')[1]??'').get('returnTo');return value?.split('?')[0]==='#calendar'&&value.length<=2000?'#calendar?'+calendarParams(calendarFilters(value)):null;}

// A repeated selection must not invalidate the currently displayed/requested data.
export function calendarFilterChange(current,fields){
 const next={...current,...fields};
 return calendarParams(next).toString()===calendarParams(current).toString()?null:next;
}
