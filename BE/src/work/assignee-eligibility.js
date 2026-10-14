import {WorkspaceMembership,AccessBan} from '../models/index.js';
import {historicalWorkspaceFixture} from '../workspaces/access.js';
export const assigneeKey=value=>`${value.workspaceId}:${value.projectId}:${value.assigneeId}`;
const same=(a,b)=>String(a)===String(b);
export async function assigneeEligibility(contexts,selected,tx){
 const historical=historicalWorkspaceFixture();if(historical)return historical.assigneeEligibility(contexts,selected,tx);
 const workspaceIds=[...contexts.values()].map(value=>value.workspace._id),assigneeIds=selected.map(value=>value.assigneeId).filter(Boolean);
 const memberships=await WorkspaceMembership.collection.find({workspaceId:{$in:workspaceIds},userId:{$in:assigneeIds},state:'active'},{session:tx,projection:{workspaceId:1,userId:1}}).toArray();
 const bans=await AccessBan.collection.find({userId:{$in:assigneeIds},state:'active',scopeType:{$in:['workspace','project']},scopeId:{$in:[...workspaceIds,...selected.map(value=>value.projectId)]}},{session:tx,projection:{userId:1,scopeType:1,scopeId:1}}).toArray();
 return new Map(selected.map(value=>[assigneeKey(value),memberships.some(row=>same(row.userId,value.assigneeId)&&same(row.workspaceId,value.workspaceId))&&!bans.some(row=>same(row.userId,value.assigneeId)&&same(row.scopeId,row.scopeType==='workspace'?value.workspaceId:value.projectId))]));
}
