import mongoose from 'mongoose';
import {coreSchema,ref,integer,nullableDate,nullableString,choice,singleLine,richText,contentHook} from '../src/models/shared.js';
import {WORKSPACE_IDENTITY_DEFAULTS,WORKSPACE_ICONS,WORKSPACE_COLORS,WORKSPACE_COVERS,validWorkspaceSummary} from '../src/workspaces/identity.js';
import {historicalWorkspaceFixture} from '../src/workspaces/access.js';
const workspaceSchema = coreSchema({
  ownerId: ref('User', true), organizationId: { ...ref('Organization', true), immutable: true },
  managerId: ref('User', true), name: singleLine(200), description: richText(), mutationRevision: integer(),
  summary: { ...nullableString(500), validate: validWorkspaceSummary },
  icon: choice(WORKSPACE_ICONS, WORKSPACE_IDENTITY_DEFAULTS.icon),
  color: choice(WORKSPACE_COLORS, WORKSPACE_IDENTITY_DEFAULTS.color),
  coverId: choice(WORKSPACE_COVERS, WORKSPACE_IDENTITY_DEFAULTS.coverId),
  state: choice(['active', 'archived'], 'active'), archivedAt: nullableDate(), archivedBy: ref('User', true),
}, { privateFields: ['mutationRevision'] });
contentHook(workspaceSchema, 'description', 'workspace');
workspaceSchema.pre('validate', function () {
  if (this.state === 'active' && (this.archivedAt || this.archivedBy)) this.invalidate('state', 'Active Workspace has no archive metadata');
  if (this.state === 'archived' && (!this.archivedAt || !this.archivedBy)) this.invalidate('state', 'Archived Workspace requires metadata');
  if (this.organizationId ? (this.ownerId !== null || !this.managerId) : (!this.ownerId || this.managerId !== null)) {
    this.invalidate('ownerId', 'Standalone requires an owner; attached requires a manager and organization ownership');
  }
});


workspaceSchema.pre('save',function(){if(!historicalWorkspaceFixture())throw Error('HISTORICAL_TEST_DATABASE_REQUIRED');});
export const HistoricalWorkspace=mongoose.models.HistoricalWorkspace??mongoose.model('HistoricalWorkspace',workspaceSchema,'workspaces');
export function createWorkspaceDocument(fields){if(!historicalWorkspaceFixture())throw Error('HISTORICAL_TEST_DATABASE_REQUIRED');return new HistoricalWorkspace(fields);}
