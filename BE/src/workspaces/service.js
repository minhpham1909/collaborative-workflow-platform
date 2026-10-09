import { workspaceFields, versionInput, transferInput, invitationInput, invitationToken, overridesInput, objectId, workspaceStateInput } from './input.js';
import { inputObject } from '../auth/account-input.js';
import { workspaceQuery, teamQuery } from './list-query.js';

export function createWorkspaceService({ store }) {
  return {
    list: (auth, query) => store.list(auth.claims, workspaceQuery(query)),
    create: (auth, input) => store.create(auth.claims, workspaceFields(input).fields),
    get: (auth, workspaceId) => store.get(auth.claims, objectId(workspaceId)),
    state: (auth, workspaceId, input) => store.state(auth.claims, objectId(workspaceId), workspaceStateInput(input)),
    update: (auth, workspaceId, input) => store.update(auth.claims, objectId(workspaceId), workspaceFields(input, true)),
    members: (auth, workspaceId, query) => store.members(auth.claims, objectId(workspaceId), teamQuery(query)),
    leave: (auth, workspaceId, input) => store.leave(auth.claims, objectId(workspaceId), versionInput(input)),
    remove: (auth, workspaceId, memberId, input) => store.remove(auth.claims, objectId(workspaceId), objectId(memberId), versionInput(input)),
    transfer: (auth, workspaceId, input) => store.transfer(auth.claims, objectId(workspaceId), transferInput(input)),
    overrides: (auth, workspaceId, input) => store.overrides(auth.claims, objectId(workspaceId), overridesInput(input)),
    resetOverrides: (auth, workspaceId, input) => store.overrides(auth.claims, objectId(workspaceId), { expectedVersion: versionInput(input), overrides: { assignment: 'inherit', comment: 'inherit', content: 'inherit', status: 'inherit' } }),
    invitations: (auth, workspaceId, query) => store.invitations(auth.claims, objectId(workspaceId), teamQuery(query, true)),
    invite: (auth, workspaceId, input) => store.invite(auth.claims, objectId(workspaceId), invitationInput(input)),
    revoke: (auth, workspaceId, invitationId, input) => store.revoke(auth.claims, objectId(workspaceId), objectId(invitationId), versionInput(input)),
    retryMail: (auth, workspaceId, invitationId, input) => store.retryMail(auth.claims, objectId(workspaceId), objectId(invitationId), versionInput(input)),
    preview: (input) => store.preview(invitationToken(input)),
    accept: (auth, input) => store.accept(auth.claims, invitationToken(input)),
    acceptById: (auth, invitationId, input) => { inputObject(input, []); return store.acceptById(auth.claims, objectId(invitationId)); },
  };
}
