import {ModerationAction} from './organization-models.js';
import {AuthError} from '../src/auth/errors.js';
import {projectReadOnly} from '../src/workspaces/lifecycle.js';
const sameId=(a,b)=>String(a)===String(b);
export const commentModerator=context=>(context.access?.canManage??sameId(context.workspace.ownerId,context.user._id))&&!(!context.workspace.organizationId&&context.access.role==='manager');
export function commentPermissions(value,context){
 const own=sameId(value.authorId,context.user._id),active=!projectReadOnly(context.workspace,context.project),moderator=commentModerator(context);
 return {edit:active&&own,delete:moderator||(active&&own),moderate:moderator&&(!active||!own)};
}
export function authorizeCommentDelete(comment,context,input){
 const archived=projectReadOnly(context.workspace,context.project),authorDelete=sameId(comment.authorId,context.user._id)&&!archived;
 if(!authorDelete&&!commentModerator(context))throw new AuthError(archived?context.workspace.state==='archived'?'WORKSPACE_ARCHIVED':'PROJECT_ARCHIVED':'COMMENT_AUTHOR_REQUIRED',archived?409:403);
 if(!authorDelete&&!input.reason)throw new AuthError('MODERATION_REASON_REQUIRED',400);
}
export async function recordCommentDelete(comment,context,input,now){
 await new ModerationAction({scopeType:'project',scopeId:context.project._id,organizationId:context.workspace.organizationId??null,
 workspaceId:context.workspace._id,projectId:context.project._id,workspaceIds:[context.workspace._id],actorId:context.user._id,targetUserId:comment.authorId,
 action:'comment_deleted',commentId:comment._id,reason:input.reason??'author_deleted',cutoff:now,matchedCount:1,deletedCount:1}).save({session:context.tx});
}
