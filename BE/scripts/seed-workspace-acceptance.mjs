import mongoose from 'mongoose';
import {randomBytes} from 'node:crypto';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {readConfig} from '../src/config.js';
import {connectDatabase} from '../src/database.js';
import {models,User,Session,Workspace} from '../src/models/index.js';
import {hashPassword} from '../src/auth/passwords.js';
import {withQaAccount} from './seed-qa-account.mjs';
import {buildAcceptanceScenario} from './acceptance-scenario.mjs';

export function validateAcceptanceTarget(config){
 if(config.nodeEnv!=='development'||!/^mongodb:\/\/(?:127\.0\.0\.1|localhost):27018\/workflow_dev(?:\?|$)/u.test(config.mongoUri))throw Error('ACCEPTANCE_LOCAL_DEV_ONLY');
}
const directory=fileURLToPath(new URL('../../.local/workspace-acceptance/',import.meta.url));
const manifestPath=directory+'manifest.json';
async function main(){
 const apply=process.argv.includes('--apply');
 if(process.argv.slice(2).some(arg=>arg!=='--apply'))throw Error('ACCEPTANCE_INVALID_ARGUMENT');
 const config=readConfig();validateAcceptanceTarget(config);
 let previous;
 try{previous=JSON.parse(await readFile(manifestPath,'utf8'));}catch(error){if(error.code!=='ENOENT')throw error;}
 await connectDatabase(config.mongoUri);
 try{
  const primary=await User.findOne({emailCanonical:'pepe19092003@gmail.com'}).lean();
  if(!primary?.emailVerifiedAt)throw Error('ACCEPTANCE_VERIFIED_PRIMARY_REQUIRED');
  if(previous){
   if(previous.state!=='complete')throw Error('ACCEPTANCE_PARTIAL_RUN_REQUIRES_REVIEW');
   if(previous.primaryId!==String(primary._id)||await Workspace.countDocuments({_id:{$in:previous.scenario.workspaces},ownerId:primary._id})!==3)throw Error('ACCEPTANCE_MANIFEST_MISMATCH');
   console.log(JSON.stringify({state:'already_complete',writes:0,workspaces:3}));return;
  }
  // Fresh business data only. Never clear data or merge a former seed silently.
  const business=Object.values(models).filter(model=>!['users','auth_identities','sessions','auth_tokens','auth_challenges','email_outbox'].includes(model.collection.name));
  const occupied=[];
  for(const model of business)if(await model.collection.findOne({},{projection:{_id:1}}))occupied.push(model.collection.name);
  for(const name of ['organizations','organization_memberships','organization_audit','organization_invitations'])if(await mongoose.connection.collection(name).findOne({},{projection:{_id:1}}))occupied.push(name);
  if(occupied.length)throw Error('ACCEPTANCE_BUSINESS_DATABASE_NOT_EMPTY');
  if(await User.exists({emailCanonical:{$in:['manager','member','guest'].map(role=>`workflow-acceptance-${role}@example.invalid`)}}))throw Error('ACCEPTANCE_TEST_ACCOUNT_EXISTS');
  const missing=[];
  for(const model of Object.values(models)){
   let indexes=[];try{indexes=await model.collection.listIndexes().toArray();}catch(error){if(error.code!==26)throw error;}
   for(const [keys,options] of model.schema.indexes())if(options.unique&&!indexes.some(index=>index.unique&&JSON.stringify(index.key)===JSON.stringify(keys)))missing.push(options.name);
  }
  if(missing.length){console.log(JSON.stringify({state:'missing_unique_indexes',indexes:missing}));throw Error('ACCEPTANCE_INDEX_SETUP_REQUIRED');}
  if(!apply){console.log(JSON.stringify({state:'preview_ready',database:'workflow_dev',port:27018,primaryAccountsPreserved:true,newTestAccounts:3,workspaces:3,projects:4,tasks:18,sends:0}));return;}
 }finally{await mongoose.disconnect();}
 if(!apply||previous)return;
 await mkdir(directory,{recursive:true});
 const password=randomBytes(24).toString('base64url');
 const manifest={state:'building',startedAt:new Date().toISOString(),credentials:{password,accounts:[]}};
 // Exclusive creation blocks concurrent/repeated seeding, including ambiguous partial failures.
 await writeFile(manifestPath,JSON.stringify(manifest,null,2),{flag:'wx',mode:0o600});
 try{
  await withQaAccount('pepe19092003@gmail.com',async({user,auth,authConfig})=>{
   manifest.primaryId=String(user._id);const actors={owner:auth},sessions=[];
   try{
    const passwordHash=await hashPassword(password);
    for(const role of ['manager','member','guest']){
     const email=`workflow-acceptance-${role}@example.invalid`;
     if(await User.exists({emailCanonical:email}))throw Error('ACCEPTANCE_TEST_ACCOUNT_EXISTS');
     const person=await User.create({displayName:'QA '+role,email,passwordHash,emailVerifiedAt:new Date(),termsAcceptance:{version:'local-qa-fixture',acceptedAt:new Date()}});
     manifest.credentials.accounts.push({role,email,userId:person.id});
     await writeFile(manifestPath,JSON.stringify(manifest,null,2),{mode:0o600});
     const session=await Session.create({userId:person._id,authVersionAtIssue:person.authVersion,refreshTokenHash:randomBytes(32).toString('hex'),lastSeenAt:new Date(),expiresAt:new Date(Date.now()+3600000)});
     sessions.push(session._id);actors[role]={claims:{sub:person.id,sid:session.id,av:person.authVersion}};
    }
    manifest.scenario=await buildAcceptanceScenario({config:authConfig,actors});
   }finally{if(sessions.length)await Session.collection.updateMany({_id:{$in:sessions}},{$set:{revokedAt:new Date(),revokeReason:'qa_completed'}});}
  });
  manifest.state='complete';await writeFile(manifestPath,JSON.stringify(manifest,null,2),{mode:0o600});
  console.log(JSON.stringify({state:'complete',workspaces:3,projects:4,tasks:18,newTestAccounts:3,sends:0,credentialsFile:manifestPath}));
 }catch(error){manifest.state='failed';manifest.error=error.code??'SEED_FAILED';await writeFile(manifestPath,JSON.stringify(manifest,null,2),{mode:0o600});throw error;}
}
if(process.argv[1]&&fileURLToPath(import.meta.url)===process.argv[1])main().catch(error=>{console.error(error.code??error.message);process.exitCode=1;});
