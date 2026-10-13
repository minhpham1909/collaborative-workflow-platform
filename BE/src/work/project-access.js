import {ProjectGuest} from '../models/index.js';
import {AuthError} from '../auth/errors.js';
import {workspaceAccess,historicalWorkspaceFixture,supportedWorkspace} from '../workspaces/access.js';
import {assertNotBanned,banFilterStages} from '../moderation/guard.js';
export async function projectAccess(workspace,project,userId,tx,options={}){
 const historical=historicalWorkspaceFixture();if(historical)return historical.projectAccess(workspace,project,userId,tx,options);
 if(!supportedWorkspace(workspace)||!project||String(project.workspaceId)!==String(workspace._id))throw new AuthError('RESOURCE_UNAVAILABLE',404);
 await assertNotBanned(userId,{workspaceId:workspace._id,projectId:project._id},tx);
 try{return {access:await workspaceAccess(workspace,userId,tx,options),guest:false};}
 catch(error){if(!(error instanceof AuthError)||error.status!==404)throw error;}
 const grant=await ProjectGuest.collection.findOne({workspaceId:workspace._id,projectId:project._id,userId,state:'active'},{session:tx});
 if(!grant)throw new AuthError('RESOURCE_UNAVAILABLE',404);
 return {access:{canManage:false,isMember:false,role:'guest',membership:null},guest:true};
}
export function projectGuestParentStages(userId){
 const historical=historicalWorkspaceFixture();if(historical)return historical.projectGuestParentStages(userId);
 return [{$match:{'workspace.organizationId':null,'workspace.ownerId':{$ne:null}}},...banFilterStages(userId,{workspace:'$workspaceId',project:'$_id'})];
}
