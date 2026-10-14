import {historicalWorkspaceFixture} from '../workspaces/access.js';
import {projectReadOnly} from '../workspaces/lifecycle.js';
export function commentPermissions(comment,context){
 const historical=historicalWorkspaceFixture();if(historical)return historical.commentPermissions(comment,context);
 const author=String(comment.authorId)===String(context.user._id);
 const writable=!projectReadOnly(context.workspace,context.project);
 return {edit:author&&writable,delete:author&&writable};
}
