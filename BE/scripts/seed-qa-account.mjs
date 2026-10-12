// Opt-in, local development QA data. Never create/verify users or run workers.
import mongoose from 'mongoose';
import { randomBytes } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { readConfig, readAuthConfig } from '../src/config.js';
import { User, Session, Workspace, Task, Notification, EmailOutbox, WorkspaceInvitation, ProjectGuestInvitation } from '../src/models/index.js';
import { createTokenCodec, tokenHash } from '../src/auth/tokens.js';
import { createMongoAuthStore } from '../src/auth/mongo-store.js';
import { createWorkService } from '../src/work/service.js';
import { createMongoWorkStore } from '../src/work/mongo-store.js';
import { createWorkspaceService } from '../src/workspaces/service.js';
import { createMongoWorkspaceStore } from '../src/workspaces/mongo-store.js';
import { createOrganizationService } from '../src/organizations/service.js';
import { createMongoOrganizationStore } from '../src/organizations/mongo-store.js';

export const marker='[QA-PEPE]';
const directory=fileURLToPath(new URL('../../.local/qa-pepe/',import.meta.url));
const manifestPath=directory+'/manifest.json';
export const rich=text=>({format:'prosemirror-json',schemaVersion:1,document:{type:'doc',content:[{type:'paragraph',content:[{type:'text',text}]}]}});
export async function withQaAccount(email, callback) {
  if(email!=='pepe19092003@gmail.com')throw new Error('QA_EXPECTED_ACCOUNT_REQUIRED');
  const config=readConfig();
  if(config.nodeEnv!=='development'||!/^mongodb:\/\/(127\.0\.0\.1|localhost):27018\/workflow_dev(?:\?|$)/.test(config.mongoUri))throw new Error('QA_LOCAL_DATABASE_REQUIRED');
  const authConfig=readAuthConfig();await mongoose.connect(config.mongoUri,{autoIndex:false});let session;
  try {
    const user=await User.findOne({emailCanonical:email}).select('+authVersion').lean();
    if(!user||!user.emailVerifiedAt)throw new Error('QA_EXISTING_VERIFIED_ACCOUNT_REQUIRED');
    const codec=createTokenCodec(authConfig),now=new Date();
    session=new Session({_id:new mongoose.Types.ObjectId(),userId:user._id,authVersionAtIssue:user.authVersion,refreshTokenHash:randomBytes(32).toString('hex'),refreshGeneration:0,lastSeenAt:now,expiresAt:new Date(now.getTime()+30*60_000)});
    const refresh=await codec.refresh(session);session.refreshTokenHash=tokenHash(refresh);await session.save();
    const auth={claims:{sub:String(user._id),sid:String(session._id),av:user.authVersion}};
    const services={work:createWorkService({store:createMongoWorkStore({config:authConfig})}),workspaces:createWorkspaceService({store:createMongoWorkspaceStore({config:authConfig})}),organizations:createOrganizationService({store:createMongoOrganizationStore({config:authConfig})})};
    return await callback({user,auth,services,authConfig,refresh,manifestPath,directory});
  } finally {
    if(session)await createMongoAuthStore().revokeSession(String(session._id),String(session.userId),new Date(),'qa_completed');
    await mongoose.disconnect();
  }
}
export async function seedQa(context, {resume=false}={}) {
  const {user,auth,services,manifestPath,directory}=context;
  const {work,workspaces,organizations}=services;await mkdir(directory,{recursive:true});
  let plan;
  try{plan=JSON.parse(await readFile(manifestPath,'utf8'));}catch(error){if(error.code!=='ENOENT')throw error;}
  if(plan){if(plan.userId!==String(user._id))throw new Error('QA_MANIFEST_ACCOUNT_MISMATCH');if(plan.complete){const count=await Task.countDocuments({_id:{$in:plan.tasks.map(value=>value.id)},createdBy:user._id});if(count!==plan.tasks.length)throw new Error('QA_MANIFEST_DATA_MISSING');return plan;}if(!resume)throw new Error('QA_PARTIAL_MANIFEST_REQUIRES_REVIEW');return finishSeed(context,plan);}
  if(await Workspace.exists({name:{$regex:'^\\[QA-PEPE\\]'},$or:[{ownerId:user._id},{managerId:user._id}]}))throw new Error('QA_EXISTING_DATA_WITHOUT_MANIFEST');
  plan={userId:String(user._id),email:user.email,marker,createdAt:new Date().toISOString(),complete:false,organizations:[],workspaces:[],projects:[],tasks:[],notifications:[],invitationIds:[]};
  const save=()=>writeFile(manifestPath,JSON.stringify(plan,null,2)+'\n');await save();
  const org=(await organizations.create(auth,{name:marker+' Studio kiểm thử'})).organization;plan.organizations.push(org.id);await save();
  async function ws(name,orgId){const input={name:marker+' '+name,description:rich('Bộ dữ liệu thử dành riêng cho pepe. Dùng kiểm tra nội dung dài, tìm kiếm, thời gian và trạng thái. '.repeat(6))};const result=orgId?await organizations.createWorkspace(auth,orgId,input):await workspaces.create(auth,input);plan.workspaces.push({id:result.workspace.id,name:result.workspace.name});await save();return result.workspace;}
  const product=await ws('Workspace sản phẩm'),team=await ws('Team thiết kế',org.id),archive=await ws('Workspace lưu trữ'),empty=await ws('Nhóm mới — trạng thái rỗng');
  async function project(workspace,name,icon){const value=(await work.createProject(auth,workspace.id,{name:marker+' '+name,icon,description:rich('Mục tiêu QA: kiểm luồng tạo, sửa, tìm kiếm, lọc, tiến độ, thảo luận và khôi phục. Nội dung có dấu ✨, không phải công việc thật.')})).project;plan.projects.push({id:value.id,workspaceId:workspace.id,name:value.name});await save();return value;}
  const main=await project(product,'Workflow website','code'),archivedProject=await project(product,'Dự án đã đóng','document'),emptyProject=await project(product,'Dự án mới chưa có Task','layers'),design=await project(team,'Thiết kế giao diện','palette'),inherited=await project(archive,'Dự án dưới Workspace Archived','folder');
  const labels=[];for(const [name,color]of [['Thiết kế','lavender'],['Backend','blue'],['Nội dung cũ','amber']])labels.push((await work.createLabel(auth,main.id,{name:marker+' '+name,color})).label);
  const now=Date.now(),minute=value=>new Date(Math.floor(value/60000)*60000).toISOString();
  const parts=Object.fromEntries(new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Ho_Chi_Minh',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(new Date()).map(value=>[value.type,value.value]));
  const today=new Date(`${parts.year}-${parts.month}-${parts.day}T23:59:00+07:00`).toISOString();
  async function task(parent,title,{status='todo',dueAt=null,assigned=true,priority='medium',labelIds=[],trash=false,checklist=false}={}){
    let value=(await work.createTask(auth,parent.id,{title:marker+' '+title,description:rich('Dữ liệu giả để test: '+title+' — nội dung tiếng Việt và emoji ✨. Có thể sửa các dữ liệu QA này trong giao diện.'),assigneeId:assigned?String(user._id):null,dueAt,priority,labelIds})).task;
    plan.tasks.push({id:value.id,projectId:parent.id,title:value.title,code:value.code});await save();
    if(checklist){value=(await work.checklist(auth,value.id,{expectedVersion:value.version,items:[{text:'Chuẩn bị nội dung'},{text:'Kiểm tra API'},{text:'Rà giao diện mobile'}]})).task;value=(await work.tickChecklist(auth,value.id,value.checklist[0].id,{expectedVersion:value.version,checked:true})).task;}
    if(status!=='todo')value=(await work.status(auth,value.id,{expectedVersion:value.version,status,...(status==='done'&&checklist?{confirmIncompleteChecklist:true}:{})})).task;
    if(trash)await work.deleteTask(auth,value.id,{expectedVersion:value.version});
    return value;
  }
  const mainTasks=[];for(let index=0;index<16;index++)mainTasks.push(await task(main,`Chưa làm ${String(index+1).padStart(2,'0')} — ${['quá hạn','hôm nay','sắp tới','không deadline'][index%4]}`,{dueAt:index%4===0?minute(now-2*86400_000):index%4===1?today:index%4===2?minute(now+3*86400_000):null,assigned:index!==14,priority:['high','medium','low'][index%3],labelIds:[labels[index%3].id],checklist:index<2}));
  for(let index=0;index<3;index++)mainTasks.push(await task(main,'Đang làm '+(index+1),{status:'in_progress',dueAt:index===0?minute(now-86400_000):today,priority:'high',checklist:true}));
  for(let index=0;index<3;index++)mainTasks.push(await task(main,'Hoàn thành '+(index+1),{status:'done',dueAt:minute(now-5*86400_000),priority:'low'}));
  for(let index=0;index<15;index++)await work.createComment(auth,mainTasks[0].id,{content:rich(marker+` Bình luận thử ${String(index+1).padStart(2,'0')} — kiểm phân trang, edit/delete của tác giả.`)});
  const pending=await task(main,'Task chờ duyệt mở lại',{status:'done'});await work.requestReopen(auth,pending.id,{expectedVersion:pending.version,reason:marker+' Yêu cầu QA; chủ tài khoản không được tự duyệt.',targetStatus:'in_progress'});
  const trashTasks=[];for(let index=0;index<3;index++)trashTasks.push(await task(main,'Trong thùng rác '+(index+1),{status:['todo','in_progress','done'][index],trash:true,checklist:true}));
  const cancelled=await task(archivedProject,'Yêu cầu mở lại bị hủy khi Archived',{status:'done'});await work.requestReopen(auth,cancelled.id,{expectedVersion:cancelled.version,reason:marker+' Kiểm lịch sử hủy khi lưu trữ.',targetStatus:'todo'});
  await task(design,'Thiết kế trong Workspace thuộc Org',{status:'in_progress',dueAt:today,checklist:true});await task(inherited,'Readonly do Workspace Archived',{dueAt:minute(now-86400_000)});
  const lp=(await work.getProject(auth,archivedProject.id)).project;await work.state(auth,lp.id,{expectedVersion:lp.version,state:'archived'});const aw=(await workspaces.get(auth,archive.id)).workspace;await workspaces.state(auth,aw.id,{expectedVersion:aw.version,state:'archived',confirmName:aw.name,reason:marker+' Dữ liệu QA readonly.'});
  return finishSeed(context,plan);
}
async function finishSeed({user,auth,services,manifestPath},plan) {
  const {work,workspaces}=services;
  if(plan.workspaces.length!==4||plan.projects.length!==5||plan.tasks.length!==29)throw new Error('QA_INCOMPLETE_CREATE_PHASE');
  if(await Task.countDocuments({_id:{$in:plan.tasks.map(value=>value.id)},createdBy:user._id})!==29)throw new Error('QA_DATA_SCOPE_MISMATCH');
  const main=plan.projects.find(value=>value.name===marker+' Workflow website'),product=plan.workspaces.find(value=>value.name===marker+' Workspace sản phẩm');
  const allLabels=(await work.labels(auth,main.id,{limit:'20'})).items;const oldLabel=allLabels.find(value=>value.name===marker+' Nội dung cũ');
  if(!oldLabel)throw new Error('QA_LABEL_MISSING');if(!oldLabel.archivedAt)await work.updateLabel(auth,main.id,oldLabel.id,{expectedVersion:oldLabel.version,archived:true});
  let link=await WorkspaceInvitation.findOne({workspaceId:product.id,type:'LINK',revokedAt:null,expiresAt:{$gt:new Date()}});if(!link)link=(await workspaces.invite(auth,product.id,{type:'LINK'})).invitation;
  let guestLink=await ProjectGuestInvitation.findOne({projectId:main.id,type:'LINK',revokedAt:null,expiresAt:{$gt:new Date()}});if(!guestLink)guestLink=(await work.inviteGuest(auth,main.id,{type:'LINK'})).invitation;
  plan.invitationIds=[String(link.id??link._id),String(guestLink.id??guestLink._id)];
  const mainTasks=plan.tasks.filter(value=>value.projectId===main.id&&!value.title.includes('Trong thùng rác')&&!value.title.includes('chờ duyệt'));
  const trashTask=plan.tasks.find(value=>value.title===marker+' Trong thùng rác 1');plan.notifications=[];
  for(let index=0;index<24;index++){const target=index===23?trashTask:mainTasks[index%mainTasks.length];const eventId=`qa-pepe-${index}-${target.id}`;let event=await Notification.findOne({recipientId:user._id,eventId});if(!event)event=await Notification.create({recipientId:user._id,workspaceId:product.id,taskId:target.id,actorId:null,eventId,category:'work',changes:[['assignment','comment','content','status'][index%4]],payload:{taskTitle:target.title,workspaceName:product.name,actorDisplayName:marker+' Đồng đội mô phỏng'},readAt:index%3===0?new Date():null,createdAt:new Date(Date.now()-index*60_000)});plan.notifications.push(String(event._id));}
  plan.primary={workspaceId:product.id,projectId:main.id,taskId:mainTasks[0].id,trashTaskId:trashTask.id,pendingTaskId:plan.tasks.find(value=>value.title.includes('chờ duyệt')).id,emptyProjectId:plan.projects.find(value=>value.name.includes('chưa có Task')).id,emptyWorkspaceId:plan.workspaces.find(value=>value.name.includes('trạng thái rỗng')).id};plan.complete=true;await writeFile(manifestPath,JSON.stringify(plan,null,2)+'\n');return plan;

}
if(process.argv[1]&&fileURLToPath(import.meta.url)===process.argv[1]){
  const email=process.argv[process.argv.indexOf('--email')+1];
  if(!process.argv.includes('--apply'))throw new Error('Use explicit --apply --email for local QA seeding');
  await withQaAccount(email,async context=>{const before=await EmailOutbox.countDocuments({});const plan=await seedQa(context,{resume:process.argv.includes('--resume')});const after=await EmailOutbox.countDocuments({});console.log(JSON.stringify({email:plan.email,marker,organizations:plan.organizations.length,workspaces:plan.workspaces.length,projects:plan.projects.length,tasks:plan.tasks.length,syntheticNotifications:plan.notifications.length,outboxAdded:after-before,manifest:context.manifestPath}));});
}
