import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import mongoose from 'mongoose';
import {connectDatabase} from '../src/database.js';
import {readInventorySnapshot,analyzeWorkspaceOnlyInventory,inventoryProjections} from '../src/workspace-only/inventory.js';
test('Read-only Workspace inventory uses a real snapshot and preserves documents without projecting private data', {skip:!process.env.TEST_MONGODB_URI,timeout:30000},async()=>{
 assert.equal(new URL(process.env.TEST_MONGODB_URI).pathname,'/workflow_auth_test'); await connectDatabase(process.env.TEST_MONGODB_URI);
 const db=mongoose.connection.db, owner=new mongoose.Types.ObjectId(), manager=new mongoose.Types.ObjectId(), admin=new mongoose.Types.ObjectId(), org=new mongoose.Types.ObjectId(), workspace=new mongoose.Types.ObjectId();
 const inserted=[];
 const insert=async(name,doc)=>{const result=await db.collection(name).insertOne(doc);inserted.push([name,result.insertedId]);};
 async function digest(){const all={};for(const name of Object.keys(inventoryProjections))all[name]=await db.collection(name).find({}).sort({_id:1}).toArray();return createHash('sha256').update(JSON.stringify(all)).digest('hex');}
 try{
  await db.collection('users').createIndex({emailCanonical:1},{name:'users_email_unique',unique:true});
  for(const _id of [owner,manager,admin])await insert('users',{_id,emailVerifiedAt:new Date(),passwordHash:'PRIVATE_TEST_MARKER',email:'PRIVATE_TEST_MARKER',emailCanonical:`${_id}@inventory-test.invalid`});
  await insert('organizations',{_id:org,ownerId:owner,version:0});
  for(const [userId,role] of [[owner,'member'],[manager,'member'],[admin,'admin']])await insert('organization_memberships',{organizationId:org,userId,role,state:'active',version:0});
  await insert('workspaces',{_id:workspace,organizationId:org,managerId:manager,ownerId:null,state:'active',version:0,description:'PRIVATE_TEST_MARKER'});
  await insert('workspace_memberships',{workspaceId:workspace,userId:manager,state:'active',role:'member',version:0});
  const before=await digest();
  const report=await mongoose.connection.transaction(async session=>{
   const snapshot=await readInventorySnapshot(db,session);assert.ok(!JSON.stringify(snapshot).includes('PRIVATE_TEST_MARKER'));return analyzeWorkspaceOnlyInventory(snapshot);
  },{readConcern:{level:'snapshot'}});
  assert.equal(await digest(),before);assert.equal(report.canApply,false);assert.equal(report.summary.attachedWorkspaces,1);
  assert.equal(report.proposals[0].candidateOwnerId,String(owner));assert.deepEqual(report.proposals[0].managers,[String(manager)]);
  assert.equal(report.transitions.find(row=>row.userId===String(admin)).candidateRole,null);
  assert.ok(report.findings.some(row=>row.code==='OWNER_MEMBERSHIP_EXPLICIT_APPROVAL_REQUIRED'));assert.match(report.sourceFingerprint,/^[a-f0-9]{64}$/u);
 }finally{for(const [name,_id] of inserted.reverse())await db.collection(name).deleteOne({_id});await mongoose.disconnect();}
});
