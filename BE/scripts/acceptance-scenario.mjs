// Shared by isolated tests and the explicitly guarded local-dev seed command.
import {randomUUID} from 'node:crypto';
import {createWorkspaceService} from '../src/workspaces/service.js';
import {createMongoWorkspaceStore} from '../src/workspaces/mongo-store.js';
import {createWorkService} from '../src/work/service.js';
import {createMongoWorkStore} from '../src/work/mongo-store.js';
export const rich=text=>({format:'prosemirror-json',schemaVersion:1,document:{type:'doc',content:[{type:'paragraph',content:[{type:'text',text}]}]}});
export async function buildAcceptanceScenario({config,actors,now=new Date()}){
 const ws=createWorkspaceService({store:createMongoWorkspaceStore({config})});
 const work=createWorkService({store:createMongoWorkStore({config})});
 const {owner,manager,member,guest}=actors;
 const result={version:1,createdAt:now.toISOString(),workspaces:[],projects:[],tasks:[]};
 const createWorkspace=async(name,icon,color,coverId)=>{
  const value=(await ws.create(owner,{requestId:randomUUID(),name:'[QA] '+name,summary:'Dữ liệu nghiệm thu Workspace-only, không phải công việc thực tế.',description:rich('Kiểm tra trải nghiệm, quyền truy cập và các trạng thái nội dung.'),icon,color,coverId})).workspace;
  result.workspaces.push(value.id);return value;
 };
 const main=await createWorkspace('Xưởng thiết kế','palette','lavender','moodboard');
 const empty=await createWorkspace('Nhóm mới — chưa có dự án','code','mint','architecture');
 const archived=await createWorkspace('Chiến dịch đã lưu trữ','megaphone','coral','campaign');
 const invitation=await ws.invite(owner,main.id,{type:'LINK'});
 const token=new URLSearchParams(new URL(invitation.url).hash.slice(1)).get('token');
 for(const actor of [manager,member])await ws.accept(actor,{token});
 const members=await ws.members(owner,main.id,{});
 const managerRow=members.items.find(row=>row.userId===manager.claims.sub);
 if(!managerRow)throw Error('ACCEPTANCE_MANAGER_MEMBERSHIP_MISSING');
 await ws.role(owner,main.id,manager.claims.sub,{expectedVersion:managerRow.version,role:'manager',reason:'Thiết lập vai trò tài khoản nghiệm thu'});
 const projects=[];
 for(const [parent,name,icon] of [[main,'Website sản phẩm','code'],[main,'Bộ nhận diện thương hiệu','palette'],[main,'Tài liệu đã lưu trữ','document'],[archived,'Chiến dịch mùa trước','megaphone']]){
  const project=(await work.createProject(owner,parent.id,{name:'[QA] '+name,icon,description:rich('Mục tiêu: kiểm tra Board, tiến độ, tìm kiếm và giới hạn quyền khi đọc/ghi.')})).project;
  projects.push(project);result.projects.push(project.id);
 }
 const label=(await work.createLabel(manager,projects[0].id,{name:'Thiết kế',color:'lavender'})).label;
 const guestInvite=await work.inviteGuest(owner,projects[0].id,{type:'LINK'});
 const guestToken=new URLSearchParams(new URL(guestInvite.url).hash.slice(1)).get('token');
 await work.acceptGuestInvitation(guest,{token:guestToken});
 const minute=Math.floor(now.getTime()/60000)*60000;
 for(let i=0;i<18;i++){
  const p=projects[i<14?0:i<16?1:i===16?2:3];
  const dueAt=i%4===3?null:new Date(minute+[-86400000,0,2*86400000][i%4]).toISOString();
  let task=(await work.createTask(owner,p.id,{title:'[QA] '+['Thiết kế màn hình','Rà soát trải nghiệm','Kiểm tra nội dung','Chuẩn bị bàn giao'][i%4]+' '+String(i+1).padStart(2,'0'),description:rich('Dữ liệu thử có mô tả dài để kiểm tra bố cục, tìm kiếm và chi tiết công việc. Không dùng làm số liệu kinh doanh.'),assigneeId:i%5===0?member.claims.sub:owner.claims.sub,dueAt,priority:['high','medium','low'][i%3],labelIds:p.id===projects[0].id?[label.id]:[]})).task;
  if(i%3!==0)task=(await work.status(owner,task.id,{expectedVersion:task.version,status:i%3===1?'in_progress':'done'})).task;
  result.tasks.push(task.id);
 }
 let task=(await work.getTask(owner,result.tasks[0])).task;
 await work.checklist(owner,task.id,{expectedVersion:task.version,items:[{text:'Kiểm tra bố cục desktop'},{text:'Kiểm tra trạng thái sáng/tối'}]});
 await work.createComment(member,task.id,{content:rich('Đã rà nội dung; cần kiểm tra thêm bố cục trên màn hình nhỏ.')});
 await work.createComment(guest,task.id,{content:rich('Góp ý từ phía khách: phần nội dung cần dễ đọc hơn.')});
 const trash=(await work.getTask(owner,result.tasks[12])).task;
 await work.deleteTask(owner,trash.id,{expectedVersion:trash.version});
 const closedProject=(await work.getProject(owner,projects[2].id)).project;
 await work.state(owner,closedProject.id,{expectedVersion:closedProject.version,state:'archived'});
 const closedWorkspace=(await ws.get(owner,archived.id)).workspace;
 await ws.state(owner,archived.id,{expectedVersion:closedWorkspace.version,state:'archived',confirmName:closedWorkspace.name,reason:'Nghiệm thu trạng thái chỉ đọc và mở lại'});
 await work.setPin(owner,projects[0].id,{pinned:true});
 return {...result,mainWorkspaceId:main.id,emptyWorkspaceId:empty.id,archivedWorkspaceId:archived.id,boardProjectId:projects[0].id,trashTaskId:trash.id,commentTaskId:task.id};
}
