import {test} from 'node:test';
import assert from 'node:assert/strict';
import mongoose from 'mongoose';
import {connectDatabase} from '../src/database.js';
import {inspectResetScope,protectedAccountDigest,resetBusinessData,verifyBusinessEmpty,resetBusinessCollections,preservedAccountCollections} from '../src/workspace-only/dev-reset.js';
test('Authorized dev business reset is atomic and retains accounts, Google linkage, tokens, sessions and auth mail', {skip:!process.env.TEST_MONGODB_URI,timeout:30000},async()=>{
 assert.equal(new URL(process.env.TEST_MONGODB_URI).pathname,'/workflow_auth_test');await connectDatabase(process.env.TEST_MONGODB_URI);const db=mongoose.connection.db;
 try{
  const userId=new mongoose.Types.ObjectId();
  await db.collection('users').insertOne({_id:userId,emailCanonical:'reset-fixture@invalid.test',passwordHash:'ACCOUNT_MARKER',avatar:{googlePictureUrl:'PRIVATE_MARKER'},projectPins:[new mongoose.Types.ObjectId()],version:2,authVersion:4,authMutationRevision:1});
  await db.collection('auth_identities').insertOne({userId,provider:'google',providerSubject:'fixture-subject'});
  for(const name of ['sessions','auth_tokens','auth_challenges'])await db.collection(name).insertOne({userId,fixture:true});
  await db.collection('email_outbox').insertMany([{category:'auth',eventId:'reset-auth',recipientKey:'fixture-auth',encryptedDeliveryData:'PRIVATE_MARKER'},{category:'work',eventId:'reset-work',recipientKey:'fixture-work'}]);
  for(const name of resetBusinessCollections)await db.collection(name).insertOne({fixture:true});
  await db.collection('tasks').createIndex({fixture:1},{name:'reset_fixture_index'});const originalIndexes=await db.collection('tasks').listIndexes().toArray();
  await db.collection('unknown_reset_fixture').insertOne({fixture:true});await assert.rejects(inspectResetScope(db),/UNKNOWN_COLLECTION_REQUIRES_REVIEW/u);await db.collection('unknown_reset_fixture').drop();
  await inspectResetScope(db);const before=await protectedAccountDigest(db);
  await assert.rejects(mongoose.connection.transaction(async session=>{await resetBusinessData(db,session);throw Error('FORCED_ROLLBACK');}),/FORCED_ROLLBACK/u);
  assert.equal(await db.collection('tasks').countDocuments(),1);assert.equal((await db.collection('users').findOne({_id:userId})).projectPins.length,1);
  await mongoose.connection.transaction(async session=>{await resetBusinessData(db,session);await verifyBusinessEmpty(db,session);assert.equal(await protectedAccountDigest(db,session),before);});
  for(const name of preservedAccountCollections)assert.equal(await db.collection(name).countDocuments(),1);
  assert.equal(await db.collection('email_outbox').countDocuments(),1);assert.equal((await db.collection('users').findOne({_id:userId})).authVersion,4);
  assert.deepEqual((await db.collection('users').findOne({_id:userId})).projectPins,[]);assert.deepEqual(await db.collection('tasks').listIndexes().toArray(),originalIndexes);
 }finally{for(const name of [...preservedAccountCollections,...resetBusinessCollections,'email_outbox'])await db.collection(name).deleteMany({});await mongoose.disconnect();}
});
