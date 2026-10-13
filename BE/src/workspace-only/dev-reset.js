import { createHash } from 'node:crypto';
export const preservedAccountCollections = Object.freeze(['users','auth_identities','sessions','auth_tokens','auth_challenges']);
export const resetBusinessCollections = Object.freeze(['organizations','organization_memberships','organization_audit','organization_invitations','workspaces','workspace_memberships','workspace_invitations','projects','project_guests','project_guest_invitations','project_access_audit','project_labels','tasks','task_comments','task_activity','task_reopen_requests','notifications','access_bans','moderation_actions','workspace_role_audit','workspace_lifecycle_audit','workspace_management_audit','workspace_creations','task_purge_audit']);
export function validateResetTarget(config) {
 const url=new URL(config.mongoUri);
 if(config.nodeEnv!=='development'||url.protocol!=='mongodb:'||!['127.0.0.1','localhost','[::1]'].includes(url.hostname)||url.port!=='27018'||url.pathname!=='/workflow_dev')throw Error('EXACT_PROJECT_DEV_DATABASE_REQUIRED');
}
export async function inspectResetScope(db) {
 if(!['workflow_dev','workflow_auth_test'].includes(db.databaseName))throw Error('RESET_DATABASE_NOT_ALLOWED');
 const known=new Set([...preservedAccountCollections,...resetBusinessCollections,'email_outbox']);
 const existing=await db.listCollections({}, {nameOnly:true}).toArray();
 if(existing.some(row=>!known.has(row.name)&&!row.name.startsWith('system.')))throw Error('UNKNOWN_COLLECTION_REQUIRES_REVIEW');
 return [...known];
}
// Hash protected account documents only; no hashes/credentials/documents are emitted.
export async function protectedAccountDigest(db,session) {
 const rows={};
 for(const name of preservedAccountCollections){
  const documents=await db.collection(name).find({}, {session}).sort({_id:1}).toArray();
  rows[name]=documents.map(row=>{if(name!=='users')return row;const {projectPins,version,authMutationRevision,updatedAt,...protectedFields}=row;return protectedFields;});
 }
 rows.auth_mail=await db.collection('email_outbox').find({category:'auth'},{session}).sort({_id:1}).toArray();
 return createHash('sha256').update(JSON.stringify(rows)).digest('hex');
}
export async function resetBusinessData(db,session) {
 if(!['workflow_dev','workflow_auth_test'].includes(db.databaseName))throw Error('RESET_DATABASE_NOT_ALLOWED');
 const deleted={};
 for(const name of resetBusinessCollections)deleted[name]=(await db.collection(name).deleteMany({}, {session})).deletedCount;
 deleted.email_outbox_business=(await db.collection('email_outbox').deleteMany({category:{$ne:'auth'}},{session})).deletedCount;
 const pins=await db.collection('users').updateMany({projectPins:{$exists:true,$ne:[]}},{$set:{projectPins:[],updatedAt:new Date()},$inc:{version:1,authMutationRevision:1}},{session});
 return {deleted,clearedProjectPinsUsers:pins.modifiedCount};
}
export async function verifyBusinessEmpty(db,session) {
 for(const name of resetBusinessCollections)if(await db.collection(name).countDocuments({}, {session}))throw Error('RESET_BUSINESS_ROWS_REMAIN');
 if(await db.collection('email_outbox').countDocuments({category:{$ne:'auth'}},{session}))throw Error('RESET_BUSINESS_MAIL_REMAINS');
 if(await db.collection('users').countDocuments({projectPins:{$exists:true,$ne:[]}},{session}))throw Error('RESET_PINS_REMAIN');
}
