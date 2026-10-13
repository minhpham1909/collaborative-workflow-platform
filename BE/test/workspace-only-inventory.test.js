import { test } from 'node:test';
import assert from 'node:assert/strict';
import { analyzeWorkspaceOnlyInventory, readInventorySnapshot, validateInventoryTarget, inventoryProjections, inventoryFingerprint } from '../src/workspace-only/inventory.js';
const base = () => ({
 users:['owner','manager','admin','left','external'].map(_id=>({_id,emailVerifiedAt:new Date(0)})),
 organizations:[{_id:'org',ownerId:'owner'}], workspaces:[{_id:'ws',organizationId:'org',managerId:'manager',ownerId:null,version:2}],
 organization_memberships:[{userId:'owner',organizationId:'org',state:'active',role:'member',version:0},{userId:'manager',organizationId:'org',state:'active',role:'member',version:0},{userId:'admin',organizationId:'org',state:'active',role:'admin',version:0},{userId:'left',organizationId:'org',state:'inactive',role:'member',version:1}],
 workspace_memberships:[{userId:'manager',workspaceId:'ws',state:'active',role:'member',version:0},{userId:'left',workspaceId:'ws',state:'active',role:'member',version:0}],
 projects:[{_id:'project',workspaceId:'ws',leadId:'left'}],
 project_guests:[{workspaceId:'ws',projectId:'project',userId:'left',state:'active'},{workspaceId:'ws',projectId:'project',userId:'external',state:'active'}],
});
test('Inventory models Owner membership gain explicitly, never auto-promotes Admin and never revives exits', () => {
 const snapshot=base(), untouched=structuredClone(snapshot); const report=analyzeWorkspaceOnlyInventory(snapshot);
 assert.deepEqual(snapshot,untouched); assert.equal(report.canApply,false);
 assert.equal(report.proposals[0].candidateOwnerId,'owner'); assert.deepEqual(report.proposals[0].managers,['manager']);
 const owner=report.transitions.find(row=>row.userId==='owner'); assert.deepEqual(owner.gained,['member']);
 const admin=report.transitions.find(row=>row.userId==='admin'); assert.equal(admin.candidateRole,null); assert.deepEqual(admin.lost,['read','manage']);
 assert.equal(report.transitions.find(row=>row.userId==='left').after.read,false);
 for(const code of ['OWNER_MEMBERSHIP_EXPLICIT_APPROVAL_REQUIRED','ORG_ADMIN_MAPPING_REVIEW_REQUIRED','STALE_MEMBERSHIP_MUST_NOT_REACTIVATE','EXITED_ORG_GUEST_REVIEW_REQUIRED']) assert.ok(report.findings.some(row=>row.code===code));
 assert.equal(report.findings.some(row=>row.userId==='external'),false); assert.equal(report.summary.historicalLeadReferences,1);
});
test('Org bans remain explicit per-Workspace requirements, including guests; blocked Owner cannot become a candidate',()=>{
 const snapshot=base(); snapshot.access_bans=[{_id:'ban',scopeType:'organization',scopeId:'org',organizationId:'org',userId:'owner',state:'active'},{_id:'guest-ban',scopeType:'organization',scopeId:'org',userId:'external',state:'active'}];
 const report=analyzeWorkspaceOnlyInventory(snapshot); assert.equal(report.proposals[0].candidateOwnerId,null); assert.equal(report.summary.requiredOrganizationBanMappings,2);
 assert.ok(report.findings.some(row=>row.code==='OWNER_SELECTION_REQUIRED')); assert.ok(report.findings.some(row=>row.code==='BANNED_GUEST_KEEP_DENIED'));
});
test('Unverified Owner/missing parent/duplicate membership are flagged without defaulting missing CAS to zero',()=>{
 const snapshot=base(); snapshot.users[0].emailVerifiedAt=null; snapshot.workspace_memberships.push({...snapshot.workspace_memberships[0],version:undefined});
 snapshot.tasks=[{_id:'broken',workspaceId:'ws',projectId:'missing',assigneeId:'missing'}];
 const report=analyzeWorkspaceOnlyInventory(snapshot); assert.equal(report.proposals[0].candidateOwnerId,null);
 for(const code of ['DUPLICATE_MEMBERSHIP','TASK_PARENT_INVALID','TASK_ASSIGNEE_MISSING','CAS_VERSION_REVIEW_REQUIRED']) assert.ok(report.findings.some(row=>row.code===code));
 snapshot.organizations=[]; assert.doesNotThrow(()=>analyzeWorkspaceOnlyInventory(snapshot)); assert.ok(analyzeWorkspaceOnlyInventory(snapshot).findings.some(row=>row.code==='ORGANIZATION_MISSING'));
});
test('Inventory target refuses system Mongo27017, remote/srv/production/default database',()=>{
 validateInventoryTarget({nodeEnv:'development',mongoUri:'mongodb://127.0.0.1:27018/workflow?replicaSet=rs0'});
 for(const config of [{nodeEnv:'production',mongoUri:'mongodb://127.0.0.1:27018/workflow'},{nodeEnv:'development',mongoUri:'mongodb://127.0.0.1:27017/workflow'},{nodeEnv:'development',mongoUri:'mongodb://example.com:27018/workflow'},{nodeEnv:'development',mongoUri:'mongodb://127.0.0.1:27018/'}]) assert.throws(()=>validateInventoryTarget(config));
});
test('Snapshot reader exposes only find reads with bounded projections; excludes secrets and content',async()=>{
 const calls=[]; const db={collection(name){return {find(query,options){calls.push({name,query,options});return {async toArray(){return [];}};}};}};
 const session={}; await readInventorySnapshot(db,session); assert.equal(calls.length,Object.keys(inventoryProjections).length);
 for(const call of calls){assert.equal(call.options.session,session);assert.deepEqual(call.query,{});}
 const serialized=JSON.stringify(inventoryProjections);
 for(const name of ['passwordHash','encryptedDeliveryData','tokenHash','emailCanonical','description','content','payload','fingerprint']) assert.ok(!serialized.includes(name));
});

test('Source fingerprint is independent of record/key order but changes with membership state',()=>{
 const one=base(), two=structuredClone(one); two.users.reverse(); two.workspaces[0]=Object.fromEntries(Object.entries(two.workspaces[0]).reverse());
 assert.equal(inventoryFingerprint(one),inventoryFingerprint(two)); two.workspace_memberships[0].state='inactive'; assert.notEqual(inventoryFingerprint(one),inventoryFingerprint(two));
});
