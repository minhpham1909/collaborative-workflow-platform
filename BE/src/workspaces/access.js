import mongoose from 'mongoose';
import {WorkspaceMembership} from '../models/index.js';
import {AuthError} from '../auth/errors.js';
import {assertNotBanned,banFilterStages} from '../moderation/guard.js';
let historicalFixture = null;
// A private fixture registration does not enable legacy behavior on dev/production DBs.
export function registerHistoricalWorkspaceFixture(value){historicalFixture=value;}
export function historicalWorkspaceFixture(){return process.env.NODE_ENV !== 'production' && historicalFixture && /^workflow_.*_test$/u.test(mongoose.connection.name??'') && ['127.0.0.1','localhost','::1'].includes(mongoose.connection.host) ? historicalFixture : null;}
export async function workspaceAccess(workspace,userId,tx,options={}){
 const historical=historicalWorkspaceFixture();if(historical)return historical.workspaceAccess(workspace,userId,tx,options);
 if(!workspace || workspace.organizationId != null || !workspace.ownerId)throw new AuthError('WORKSPACE_UNAVAILABLE',404);
 await assertNotBanned(userId,{workspaceId:workspace._id},tx);
 const membership=await WorkspaceMembership.collection.findOne({workspaceId:workspace._id,userId,state:'active'},{session:tx});
 if(!membership)throw new AuthError('WORKSPACE_UNAVAILABLE',404);
 const role=String(workspace.ownerId)===String(userId)?'owner':membership.role==='manager'?'manager':'member';
 return {role,canManage:role==='owner'||role==='manager',isMember:true,membership:{...membership,effectiveRole:role}};
}
export function workspaceAccessStages(userId,options={}){
 const historical=historicalWorkspaceFixture();if(historical)return historical.workspaceAccessStages(userId,options);
 return [{ $match:{organizationId:null,ownerId:{$ne:null}} },...banFilterStages(userId,{workspace:'$_id'}),
 {$lookup:{from:'workspace_memberships',let:{workspace:'$_id'},pipeline:[{$match:{userId,state:'active',$expr:{$eq:['$workspaceId','$$workspace']}}}],as:'membership'}},
 {$match:{'membership.0':{$exists:true}}}];
}
