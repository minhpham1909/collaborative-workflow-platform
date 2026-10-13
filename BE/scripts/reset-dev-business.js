import mongoose from 'mongoose';
import net from 'node:net';
import { readConfig } from '../src/config.js';
import { connectDatabase } from '../src/database.js';
import { validateResetTarget,inspectResetScope,protectedAccountDigest,resetBusinessData,verifyBusinessEmpty,preservedAccountCollections } from '../src/workspace-only/dev-reset.js';
const args=process.argv.slice(2);
async function apiStopped(port,host){return new Promise((resolve,reject)=>{const probe=net.createConnection({host,port});probe.once('connect',()=>{probe.destroy();reject(Error('STOP_API_BEFORE_RESET'));});probe.once('error',error=>error.code==='ECONNREFUSED'?resolve():reject(Error('API_STATE_UNKNOWN')));probe.setTimeout(1500,()=>{probe.destroy();reject(Error('API_STATE_UNKNOWN'));});});}
try{
 const apply=args.length===2&&args[0]==='--apply'&&args[1]==='--confirm=workflow_dev';
 if(args.length&& !apply)throw Error('INVALID_RESET_INTENT');
 const config=readConfig();validateResetTarget(config);await connectDatabase(config.mongoUri);
 const collections=await inspectResetScope(mongoose.connection.db);
 if(!apply){const counts={};for(const name of collections)counts[name]=await mongoose.connection.db.collection(name).countDocuments();console.info(JSON.stringify({mode:'preview',counts,preservedAccounts:preservedAccountCollections,preservesAuthMail:true}));}
 else{
  if(process.env.WORKFLOW_RESET_WORKERS_STOPPED!=='yes')throw Error('WORKERS_MUST_BE_STOPPED');await apiStopped(config.port,'127.0.0.1');await apiStopped(config.port,'::1');
  const report=await mongoose.connection.transaction(async session=>{
   const db=mongoose.connection.db,before=await protectedAccountDigest(db,session);
   const result=await resetBusinessData(db,session);await verifyBusinessEmpty(db,session);
   if(await protectedAccountDigest(db,session)!==before)throw Error('PROTECTED_ACCOUNT_DATA_CHANGED');
   return {mode:'applied_dev_business_reset',...result,protectedAccountsUnchanged:true,authMailPreserved:true};
  });console.info(JSON.stringify(report));
 }
}catch{console.error('DEV_RESET_REFUSED_OR_ROLLED_BACK: exact project dev target, known collections and stopped API/workers required; no credentials are printed');process.exitCode=1;}
finally{await mongoose.disconnect();}
