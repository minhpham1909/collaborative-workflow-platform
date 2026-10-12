import {inputObject} from '../auth/account-input.js';
import {fail} from '../workspaces/input.js';
import {taskQuery,vietnamDay} from './input.js';
export function calendarQuery(input,dayList=false){
 inputObject(input,['month','status','state','workspaceId','projectId','q','priority','labelId',...(dayList?['day','limit','cursor']:[])]);
 if(typeof input.month!=='string'||!/^\d{4}-(0[1-9]|1[0-2])$/.test(input.month)||Number(input.month.slice(0,4))<1900)fail();
 const start=vietnamDay(input.month+'-01'),days=new Date(Number(input.month.slice(0,4)),Number(input.month.slice(5)),0).getDate(),end=new Date(start.getTime()+days*86400000);
 const {month,day,...filters}=input;
 const query=taskQuery(filters,true);
 if(dayList&&(typeof day!=='string'||(day!=='none'&&(!day.startsWith(month+'-')||vietnamDay(day)<start||vietnamDay(day)>=end))))fail();
 return {...query,month,start,end,day:dayList?day:null,dayStart:dayList&&day!=='none'?vietnamDay(day):null};
}
