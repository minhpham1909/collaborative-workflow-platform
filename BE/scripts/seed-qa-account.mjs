// Live QA account wrapper; the former Organization seed is retired.
import mongoose from 'mongoose';
import { randomBytes } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { readConfig, readAuthConfig } from '../src/config.js';
import { User, Session } from '../src/models/index.js';
import { createTokenCodec, tokenHash } from '../src/auth/tokens.js';
import { createMongoAuthStore } from '../src/auth/mongo-store.js';
import { createWorkService } from '../src/work/service.js';
import { createMongoWorkStore } from '../src/work/mongo-store.js';
import { createWorkspaceService } from '../src/workspaces/service.js';
import { createMongoWorkspaceStore } from '../src/workspaces/mongo-store.js';

export const marker='[QA-PEPE]';
const directory=fileURLToPath(new URL('../../.local/qa-pepe/',import.meta.url));
const manifestPath=directory+'/manifest.json';
export const rich=text=>({format:'prosemirror-json',schemaVersion:1,document:{type:'doc',content:[{type:'paragraph',content:[{type:'text',text}]}]}});
export async function withQaAccount(email, callback) {
  if(email!=='pepe19092003@gmail.com')throw new Error('QA_EXPECTED_ACCOUNT_REQUIRED');
  const config=readConfig();
  if(config.nodeEnv!=='development'||!/^mongodb:\/\/(127\.0\.0\.1|localhost):27018\/workflow_dev(?:\?|$)/.test(config.mongoUri))throw new Error('QA_LOCAL_DATABASE_REQUIRED');
  const authConfig=readAuthConfig();await mongoose.connect(config.mongoUri,{autoIndex:false});let session;
  try {
    const user=await User.findOne({emailCanonical:email}).select('+authVersion').lean();
    if(!user||!user.emailVerifiedAt)throw new Error('QA_EXISTING_VERIFIED_ACCOUNT_REQUIRED');
    const codec=createTokenCodec(authConfig),now=new Date();
    session=new Session({_id:new mongoose.Types.ObjectId(),userId:user._id,authVersionAtIssue:user.authVersion,refreshTokenHash:randomBytes(32).toString('hex'),refreshGeneration:0,lastSeenAt:now,expiresAt:new Date(now.getTime()+30*60_000)});
    const refresh=await codec.refresh(session);session.refreshTokenHash=tokenHash(refresh);await session.save();
    const auth={claims:{sub:String(user._id),sid:String(session._id),av:user.authVersion}};
    const services={work:createWorkService({store:createMongoWorkStore({config:authConfig})}),workspaces:createWorkspaceService({store:createMongoWorkspaceStore({config:authConfig})})};
    return await callback({user,auth,services,authConfig,refresh,manifestPath,directory});
  } finally {
    if(session)await createMongoAuthStore().revokeSession(String(session._id),String(session.userId),new Date(),'qa_completed');
    await mongoose.disconnect();
  }
}
export async function seedQa(){throw Error('LEGACY_ORGANIZATION_SEED_RETIRED');}
if(process.argv[1]&&fileURLToPath(import.meta.url)===process.argv[1])throw Error('LEGACY_ORGANIZATION_SEED_RETIRED');
