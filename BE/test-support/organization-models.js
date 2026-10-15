// Historical fixtures only; importing this module never enables legacy access policies.
import mongoose from 'mongoose';
import {models as runtimeModels} from '../src/models/index.js';
export * from '../src/models/index.js';
import {register} from '../src/models/shared.js';
import plans from '../src/models/index-plan.json' with {type:'json'};
import {organizationSchema,organizationMembershipSchema,organizationAuditSchema,organizationInvitationSchema} from './organization-schemas.js';
const definitions=[['Organization',organizationSchema,'organizations'],['OrganizationMembership',organizationMembershipSchema,'organization_memberships'],['OrganizationAudit',organizationAuditSchema,'organization_audit'],['OrganizationInvitation',organizationInvitationSchema,'organization_invitations']];
const historical=Object.fromEntries(definitions.map(([name,schema,collection])=>{
 schema.pre('save',function(){
  if(process.env.NODE_ENV==='production'||!/^workflow_.*_test$/u.test(mongoose.connection.name??'')||!['127.0.0.1','localhost','::1'].includes(mongoose.connection.host))throw Error('HISTORICAL_ORGANIZATION_TEST_DATABASE_REQUIRED');
 });
 return [name,register(name,schema,collection,plans[collection])];
}));
export const {Organization,OrganizationMembership,OrganizationAudit,OrganizationInvitation}=historical;
export const models=Object.freeze({...runtimeModels,...historical});
