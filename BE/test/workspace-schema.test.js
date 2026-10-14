import {test} from 'node:test';
import assert from 'node:assert/strict';
import mongoose from 'mongoose';
import {Workspace} from '../src/models/index.js';
import {HistoricalWorkspace,createWorkspaceDocument} from '../test-support/legacy-workspace-model.js';
test('Historical Workspace model never widens the runtime schema and cannot save without a guarded test connection',async()=>{
 const ownerId=new mongoose.Types.ObjectId();
 assert.notEqual(Workspace.schema,HistoricalWorkspace.schema);
 assert.equal(Workspace.schema.path('ownerId').isRequired,true);
 for(const field of ['organizationId','managerId'])assert.equal(Workspace.schema.path(field),undefined);
 assert.throws(()=>createWorkspaceDocument({name:'Forbidden legacy write',ownerId}),/HISTORICAL_TEST_DATABASE_REQUIRED/u);
 await assert.rejects(new HistoricalWorkspace({name:'Forbidden legacy save',ownerId}).save(),/HISTORICAL_TEST_DATABASE_REQUIRED/u);
 for(const field of ['organizationId','managerId'])assert.equal(Workspace.schema.path(field),undefined);
});
