import { objectId, versionInput, pageInput } from '../workspaces/input.js';
import { projectInput, taskInput, statusInput, stateInput, commentInput, lifecyclePage, taskQuery } from './input.js';

export function createWorkService({ store }) {
  return {
    projects: (auth, workspaceId, query) => store.projects(auth.claims, objectId(workspaceId), lifecyclePage(query)),
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
    deleteComment: (auth, taskId, commentId, input) => store.changeComment(auth.claims, objectId(taskId), objectId(commentId), { expectedVersion: versionInput(input) }, true),
  };
}
