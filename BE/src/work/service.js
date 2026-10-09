import { objectId, versionInput, pageInput, invitationInput, invitationToken, fail } from '../workspaces/input.js';
import { inputObject } from '../auth/account-input.js';
import { projectInput, taskInput, statusInput, stateInput, commentInput, taskQuery, leadInput, commentDeleteInput, labelInput, checklistInput, checklistTickInput, reopenInput, reopenReviewInput, statisticsInput } from './input.js';
import { projectQuery } from './project-query.js';

export function createWorkService({ store }) {
  return {
    trash: (auth, projectId, query) => store.trash(auth.claims, objectId(projectId), pageInput(query, 'deletedAt')),
    restore: (auth, taskId, input) => store.restore(auth.claims, objectId(taskId), versionInput(input)),
    requestReopen: (auth, taskId, input) => store.requestReopen(auth.claims, objectId(taskId), reopenInput(input)),
    reopenRequests: (auth, taskId, query) => store.reopenRequests(auth.claims, objectId(taskId), pageInput(query)),
    projectReopenRequests: (auth, projectId, query) => store.projectReopenRequests(auth.claims, objectId(projectId), pageInput(query)),
    reviewReopen: (auth, taskId, requestId, input) => store.reviewReopen(auth.claims, objectId(taskId), objectId(requestId), reopenReviewInput(input)),
    statistics: (auth, projectId, query) => store.statistics(auth.claims, objectId(projectId), statisticsInput(query)),
    labels: (auth, projectId, query) => store.labels(auth.claims, objectId(projectId), pageInput(query)),
    createLabel: (auth, projectId, input) => store.createLabel(auth.claims, objectId(projectId), labelInput(input)),
    updateLabel: (auth, projectId, labelId, input) => store.updateLabel(auth.claims, objectId(projectId), objectId(labelId), labelInput(input, true)),
    activity: (auth, taskId, query) => store.activity(auth.claims, objectId(taskId), pageInput(query)),
    checklist: (auth, taskId, input) => store.checklist(auth.claims, objectId(taskId), checklistInput(input)),
    tickChecklist: (auth, taskId, itemId, input) => {
      if (typeof itemId !== 'string' || !/^[a-f0-9-]{36}$/u.test(itemId)) fail();
      return store.tickChecklist(auth.claims, objectId(taskId), itemId, checklistTickInput(input));
    },
    profile: (auth, projectId, userId) => store.profile(auth.claims, objectId(projectId), objectId(userId)),
    inviteGuest: (auth, projectId, input) => store.inviteGuest(auth.claims, objectId(projectId), invitationInput(input)),
    guestInvitations: (auth, projectId, query) => store.guestInvitations(auth.claims, objectId(projectId), pageInput(query)),
    revokeGuestInvitation: (auth, projectId, invitationId, input) => store.revokeGuestInvitation(auth.claims, objectId(projectId), objectId(invitationId), versionInput(input)),
    guests: (auth, projectId, query) => store.guests(auth.claims, objectId(projectId), pageInput(query)),
    revokeGuest: (auth, projectId, userId, input) => store.revokeGuest(auth.claims, objectId(projectId), objectId(userId), versionInput(input)),
    previewGuestInvitation: input => store.previewGuestInvitation(invitationToken(input)),
    acceptGuestInvitation: (auth, input) => store.acceptGuestInvitation(auth.claims, invitationToken(input)),
    acceptGuestInvitationById: (auth, invitationId, input) => { inputObject(input, []); return store.acceptGuestInvitationById(auth.claims, objectId(invitationId)); },
    lead: (auth, projectId, input) => store.lead(auth.claims, objectId(projectId), leadInput(input)),
    shared: (auth, query) => store.shared(auth.claims, projectQuery(query)),
    projects: (auth, workspaceId, query) => store.projects(auth.claims, objectId(workspaceId), projectQuery(query)),
    createProject: (auth, workspaceId, input) => store.createProject(auth.claims, objectId(workspaceId), projectInput(input)),
    getProject: (auth, projectId) => store.getProject(auth.claims, objectId(projectId)),
    updateProject: (auth, projectId, input) => store.updateProject(auth.claims, objectId(projectId), projectInput(input, true)),
    state: (auth, projectId, input) => store.state(auth.claims, objectId(projectId), stateInput(input)),
    tasks: (auth, projectId, query) => store.tasks(auth.claims, objectId(projectId), taskQuery(query)),
    board: (auth, projectId, query) => store.board(auth.claims, objectId(projectId), taskQuery(query)),
    mine: (auth, query) => store.mine(auth.claims, taskQuery(query, true)),
    createTask: (auth, projectId, input) => store.createTask(auth.claims, objectId(projectId), taskInput(input)),
    getTask: (auth, taskId) => store.getTask(auth.claims, objectId(taskId)),
    updateTask: (auth, taskId, input) => store.updateTask(auth.claims, objectId(taskId), taskInput(input, true)),
    status: (auth, taskId, input) => store.status(auth.claims, objectId(taskId), statusInput(input)),
    deleteTask: (auth, taskId, input) => store.deleteTask(auth.claims, objectId(taskId), versionInput(input)),
    comments: (auth, taskId, query) => store.comments(auth.claims, objectId(taskId), pageInput(query)),
    createComment: (auth, taskId, input) => store.createComment(auth.claims, objectId(taskId), commentInput(input)),
    updateComment: (auth, taskId, commentId, input) => store.changeComment(auth.claims, objectId(taskId), objectId(commentId), commentInput(input, true)),
    deleteComment: (auth, taskId, commentId, input) => store.changeComment(auth.claims, objectId(taskId), objectId(commentId), commentDeleteInput(input), true),
  };
}
