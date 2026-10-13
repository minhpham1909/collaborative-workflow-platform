import {test} from 'node:test';
import assert from 'node:assert/strict';
import {registerHistoricalWorkspaceFixture,historicalWorkspaceFixture,workspaceAccessStages,workspaceAccess} from '../src/workspaces/access.js';
test('Historical fixture registration cannot activate without an isolated connected test DB',async()=>{
 registerHistoricalWorkspaceFixture({workspaceAccess:()=>({role:'organization_owner'}),workspaceAccessStages:()=>['unsafe']});
 try{assert.equal(historicalWorkspaceFixture(),null);assert.ok(!JSON.stringify(workspaceAccessStages('actor')).includes('unsafe'));await assert.rejects(workspaceAccess({_id:'ws',organizationId:'org',ownerId:'actor'},'actor'),/WORKSPACE_UNAVAILABLE/u);}
 finally{registerHistoricalWorkspaceFixture(null);}
});
