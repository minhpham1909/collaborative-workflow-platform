import {registerHistoricalWorkspaceFixture} from '../src/workspaces/access.js';
import * as historicalWorkspace from './legacy-workspace-access.js';
registerHistoricalWorkspaceFixture(historicalWorkspace);
// Historical fixtures only. This wrapper is never imported by src/server.js or src/app.js.
import express from 'express';
import mongoose from 'mongoose';
import {createApp as createRuntimeApp} from '../src/app.js';
import {createOrganizationRouter,createOrganizationInvitationRouter} from '../src/organizations/http.js';
import {createModerationRouter} from '../src/moderation/http.js';
export function createApp(options){
 if(!/^workflow_.*_test$/u.test(mongoose.connection.name??'')||!['127.0.0.1','localhost','::1'].includes(mongoose.connection.host))throw Error('LEGACY_FIXTURE_TEST_DATABASE_REQUIRED');
 const {organizationService,moderationService,authService,authConfig}=options;
 const app=express();app.disable('x-powered-by');app.set('query parser','simple');app.use((_req,res,next)=>{res.set({'X-Content-Type-Options':'nosniff','Cache-Control':'no-store'});next();});
 if(organizationService){app.use('/organizations',createOrganizationRouter({service:organizationService,authService,config:authConfig}));app.use('/organization-invitations',createOrganizationInvitationRouter({service:organizationService,authService,config:authConfig}));}
 if(moderationService)app.use('/moderation',createModerationRouter({service:moderationService,authService,config:authConfig}));
 app.use(createRuntimeApp(options));return app;
}
