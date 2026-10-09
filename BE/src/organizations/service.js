import { workspaceFields, objectId, pageInput, transferInput, versionInput, invitationToken } from '../workspaces/input.js';
import { inputObject } from '../auth/account-input.js';
import { teamQuery } from '../workspaces/list-query.js';
import { roleInput, managerInput, memberInput, organizationInvitationInput, organizationQuery } from './input.js';
import { workspaceQuery } from '../workspaces/list-query.js';

export function createOrganizationService({ store }) {
  // Only name in C1; rich description belongs to a separately reviewed contract.
  function fields(input, editing = false) {
    inputObject(input, editing ? ['name', 'expectedVersion'] : ['name']);
    return workspaceFields(input, editing);
  }
  return {
    list: (auth, query) => store.list(auth.claims, organizationQuery(query)),
    create: (auth, input) => store.create(auth.claims, fields(input).fields),
    get: (auth, organizationId) => store.get(auth.claims, objectId(organizationId)),
    update: (auth, organizationId, input) => store.update(auth.claims, objectId(organizationId), fields(input, true)),
    workspaces: (auth, organizationId, query) => store.workspaces(auth.claims, objectId(organizationId), workspaceQuery(query)),
    createWorkspace: (auth, organizationId, input) => store.createWorkspace(auth.claims, objectId(organizationId), workspaceFields(input).fields),
    members: (auth, organizationId, query) => store.members(auth.claims, objectId(organizationId), teamQuery(query)),
    role: (auth, organizationId, userId, input) => store.role(auth.claims, objectId(organizationId), objectId(userId), roleInput(input)),
    manager: (auth, organizationId, workspaceId, input) => store.manager(auth.claims, objectId(organizationId), objectId(workspaceId), managerInput(input)),
    addMember: (auth, organizationId, workspaceId, input) => store.addMember(auth.claims, objectId(organizationId), objectId(workspaceId), memberInput(input)),
    transfer: (auth, organizationId, input) => store.transfer(auth.claims, objectId(organizationId), transferInput(input)),
    audit: (auth, organizationId, query) => store.audit(auth.claims, objectId(organizationId), pageInput(query)),
    invite: (auth, organizationId, input) => store.invite(auth.claims, objectId(organizationId), organizationInvitationInput(input)),
    invitations: (auth, organizationId, query) => store.invitations(auth.claims, objectId(organizationId), teamQuery(query, true)),
    revokeInvitation: (auth, organizationId, invitationId, input) => store.revokeInvitation(auth.claims, objectId(organizationId), objectId(invitationId), versionInput(input)),
    previewInvitation: input => store.previewInvitation(invitationToken(input)),
    acceptInvitation: (auth, input) => store.acceptInvitation(auth.claims, invitationToken(input)),
    acceptInvitationById: (auth, invitationId, input) => { inputObject(input, []); return store.acceptInvitationById(auth.claims, objectId(invitationId)); },
    leave: (auth, organizationId, input) => store.leave(auth.claims, objectId(organizationId), versionInput(input)),
    remove: (auth, organizationId, userId, input) => store.remove(auth.claims, objectId(organizationId), objectId(userId), versionInput(input)),
  };
}
