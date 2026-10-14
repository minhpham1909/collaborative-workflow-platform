import {Organization,OrganizationInvitation,Workspace,User} from '../src/models/index.js';
import {assertNotBanned} from '../src/moderation/guard.js';
import {AuthError} from '../src/auth/errors.js';
export async function organizationNotification(value,user,tx,base,now){
      try { await assertNotBanned(user._id, { organizationId: value.organizationId }, tx); }
      catch (error) { if (error instanceof AuthError) return base; throw error; }
      const invitation = await OrganizationInvitation.collection.findOne({ _id: value.organizationInvitationId, organizationId: value.organizationId,
        emailCanonical: user.emailCanonical, revokedAt: null, acceptedAt: null, expiresAt: { $gt: now() } }, { session: tx });
      if (!invitation) return base;
      const organization = await Organization.collection.findOne({ _id: value.organizationId }, { session: tx });
      const workspace = invitation.workspaceId && await Workspace.collection.findOne({ _id: invitation.workspaceId, organizationId: value.organizationId }, { session: tx });
      if (!organization || (invitation.workspaceId && !workspace)) return base;
      const inviter = await User.collection.findOne({ _id: invitation.createdBy }, { session: tx, projection: { displayName: 1 } });
      return { ...base, available: true, code: 'ORGANIZATION_INVITATION',
        payload: { organizationName: organization.name, workspaceName: workspace?.name ?? null, inviterDisplayName: inviter?.displayName ?? 'Unavailable User', role: 'member', expiresAt: invitation.expiresAt },
        target: { type: 'organization_invitation', invitationId: String(invitation._id) } };

}
export async function notificationParentExists(workspace,tx){return !workspace.organizationId||Boolean(await Organization.collection.findOne({_id:workspace.organizationId},{session:tx}));}
