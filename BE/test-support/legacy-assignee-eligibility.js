import {WorkspaceMembership,OrganizationMembership,AccessBan} from '../src/models/index.js';
import {assigneeKey} from '../src/work/assignee-eligibility.js';
const same=(a,b)=>String(a)===String(b);
export async function assigneeEligibility(contexts,selected,tx){
 const workspaceIds=[...contexts.values()].map(value=>value.workspace._id),organizationIds=[...contexts.values()].map(value=>value.workspace.organizationId).filter(Boolean),assigneeIds=selected.map(value=>value.assigneeId).filter(Boolean);
 const memberships=await WorkspaceMembership.collection.find({workspaceId:{$in:workspaceIds},userId:{$in:assigneeIds},state:'active'},{session:tx,projection:{workspaceId:1,userId:1}}).toArray();
 const orgMembers=organizationIds.length?await OrganizationMembership.collection.find({organizationId:{$in:organizationIds},userId:{$in:assigneeIds},state:'active'},{session:tx,projection:{organizationId:1,userId:1,role:1}}).toArray():[];
 const bans=await AccessBan.collection.find({userId:{$in:assigneeIds},state:'active',scopeId:{$in:[...workspaceIds,...organizationIds,...selected.map(value=>value.projectId)]}},{session:tx,projection:{userId:1,scopeType:1,scopeId:1}}).toArray();
 return new Map(selected.map(value=>{
  const current=contexts.get(String(value.projectId));
  const blocked=bans.some(ban=>same(ban.userId,value.assigneeId)&&((ban.scopeType==='workspace'&&same(ban.scopeId,value.workspaceId))||(ban.scopeType==='project'&&same(ban.scopeId,value.projectId))||(ban.scopeType==='organization'&&same(ban.scopeId,current.workspace.organizationId))));
  return [assigneeKey(value),memberships.some(row=>same(row.userId,value.assigneeId)&&same(row.workspaceId,value.workspaceId))&&(!current.workspace.organizationId||orgMembers.some(row=>same(row.userId,value.assigneeId)&&same(row.organizationId,current.workspace.organizationId)&&['admin','member'].includes(row.role)))&&!blocked];
 }));
}
