import { Organization, OrganizationMembership, ProjectGuest } from './organization-models.js';
import { AuthError } from '../src/auth/errors.js';
import { workspaceAccess } from './legacy-workspace-access.js';
import { assertNotBanned, banFilterStages } from '../src/moderation/guard.js';

export async function projectAccess(workspace, project, userId, tx, { lock = true } = {}) {
  if (!workspace || !project || String(project.workspaceId) !== String(workspace._id)) throw new AuthError('RESOURCE_UNAVAILABLE', 404);
  await assertNotBanned(userId, { organizationId: workspace.organizationId, workspaceId: workspace._id, projectId: project._id }, tx);
  try {
    const access = await workspaceAccess(workspace, userId, tx, { lock });
    return { access, guest: false };
  } catch (error) { if (!(error instanceof AuthError) || error.status !== 404) throw error; }
  // External guests need no Org/Workspace membership, but the parent must still exist.
  if (workspace.organizationId && !await Organization.collection.findOne({ _id: workspace.organizationId }, { session: tx })) throw new AuthError('RESOURCE_UNAVAILABLE', 404);
  const grant = await ProjectGuest.collection.findOne({ workspaceId: workspace._id, projectId: project._id, userId, state: 'active' }, { session: tx });
  if (!grant) throw new AuthError('RESOURCE_UNAVAILABLE', 404);
  return { access: { canManage: false, isMember: false, role: 'guest', membership: null }, guest: true };
}

export function projectGuestParentStages(userId){return [
 {$lookup:{from:'organizations',localField:'workspace.organizationId',foreignField:'_id',as:'organization'}},
 ...banFilterStages(userId,{organization:'$workspace.organizationId',workspace:'$workspaceId',project:'$_id'}),
 {$match:{$or:[{'workspace.organizationId':null},{'organization.0':{$exists:true}}]}}
];}
export async function validateGuestParent(workspace,tx,lock){
 if(!workspace.organizationId)return;
 const org=lock?await Organization.collection.findOneAndUpdate({_id:workspace.organizationId},{$inc:{mutationRevision:1}},{session:tx,returnDocument:'after'}):await Organization.collection.findOne({_id:workspace.organizationId},{session:tx});
 if(!org)throw new AuthError('INVITATION_UNAVAILABLE',404);
}

export async function profileState(workspace,project,target,member,guest,tx){
 const orgMember=workspace.organizationId?await OrganizationMembership.collection.findOne({organizationId:workspace.organizationId,userId:target},{session:tx}):null;
 try{const current=await projectAccess(workspace,project,target,tx);return {status:current.guest?'guest':current.access.isMember?'active':'organization_management',role:current.guest?'guest':current.access.role,departedAt:null,blocked:false};}
 catch(error){if(!(error instanceof AuthError))throw error;const status=orgMember?.state==='inactive'?'left_organization':member?.state==='inactive'?'left_workspace':guest?.state==='inactive'?'left_project':'unavailable';return {status,role:null,departedAt:status==='left_organization'?orgMember.leftAt:status==='left_workspace'?member.leftAt:status==='left_project'?guest.revokedAt:null,blocked:error.code==='ACCESS_BANNED'};}
}
