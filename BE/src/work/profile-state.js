import {AuthError} from '../auth/errors.js';
import {projectAccess} from './project-access.js';
import {historicalWorkspaceFixture} from '../workspaces/access.js';
export async function profileState(workspace,project,target,member,guest,tx){
 const historical=historicalWorkspaceFixture();if(historical)return historical.profileState(workspace,project,target,member,guest,tx);
 try{const current=await projectAccess(workspace,project,target,tx);return {status:current.guest?'guest':'active',role:current.guest?'guest':current.access.role,departedAt:null,blocked:false};}
 catch(error){if(!(error instanceof AuthError))throw error;
  const status=member?.state==='inactive'?'left_workspace':guest?.state==='inactive'?'left_project':'unavailable';
  return {status,role:null,departedAt:status==='left_workspace'?member.leftAt:status==='left_project'?guest.revokedAt:null,blocked:error.code==='ACCESS_BANNED'};
 }
}
