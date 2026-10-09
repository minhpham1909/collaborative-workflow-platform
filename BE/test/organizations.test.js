import { test } from 'node:test';
import { organizationQuery } from '../src/organizations/input.js';
import assert from 'node:assert/strict';
import { OrganizationMembership, Workspace } from '../src/models/index.js';
import { organizationAccess } from '../src/organizations/access.js';
import { createOrganizationService } from '../src/organizations/service.js';
test('Organization directory query is scoped/typed and rejects fake roles or tenant injection', () => {
  assert.equal(organizationQuery({}).role, 'all');
  assert.equal(organizationQuery({ q: 'Studio', role: 'admin', from: '2026-10-07' }).role, 'admin');
  for (const query of [{ role: 'guest' }, { role: ['admin'] }, { organizationId: 'a'.repeat(24) }, { state: 'archived' }, { from: '2026-02-30' }]) assert.throws(() => organizationQuery(query), /INVALID_INPUT/u);
});
import { roleInput, managerInput, memberInput, organizationInvitationInput } from '../src/organizations/input.js';

const org = { _id: '111111111111111111111111', ownerId: '222222222222222222222222' };
const member = { organizationId: org._id, userId: org.ownerId, role: 'member', state: 'active' };
test('organization access is scoped; owner derives from parent, inactive owners fail closed', () => {
  assert.equal(organizationAccess(org, member, org.ownerId), 'owner');
  assert.equal(organizationAccess(org, { ...member, role: 'admin', userId: 'other' }, 'other', { manage: true }), 'admin');
  for (const membership of [null, { ...member, state: 'inactive' }, { ...member, organizationId: 'another' }, { ...member, userId: 'another' }]) {
    assert.throws(() => organizationAccess(org, membership, org.ownerId), { code: 'ORGANIZATION_UNAVAILABLE' });
  }
  assert.throws(() => organizationAccess(org, { ...member, userId: 'other' }, 'other', { manage: true }), { code: 'ORGANIZATION_ADMIN_REQUIRED' });
});
test('organization input cannot set role/owner, accepts only a bounded name and valid CAS', () => {
  const service = createOrganizationService({ store: { create: (_claims, fields) => fields, update: (_claims, _id, input) => input } });
  const auth = { claims: {} };
  for (const body of [{ name: 'X', ownerId: org.ownerId }, { name: 'X', role: 'admin' }, { name: 'X', description: {} }, { name: ' ' }, { name: 'x\ny' }, { name: 'x'.repeat(201) }]) assert.throws(() => service.create(auth, body));
  assert.deepEqual(service.create(auth, { name: 'Studio Việt' }), { name: 'Studio Việt' });
  assert.throws(() => service.update(auth, org._id, { name: 'X', expectedVersion: -1 }));
  assert.throws(() => service.get(auth, 'bad-id'));
});
test('membership has no ownership role and inconsistent departure state is rejected', async () => {
  const base = { organizationId: org._id, userId: org.ownerId, joinedAt: new Date() };
  await assert.rejects(new OrganizationMembership({ ...base, role: 'owner' }).validate());
  await assert.rejects(new OrganizationMembership({ ...base, state: 'inactive' }).validate());
  await assert.rejects(new OrganizationMembership({ ...base, leftAt: new Date() }).validate());
});
test('Workspace ownership cannot mix organization and standalone modes', async () => {
  const base = { name: 'W' };
  await new Workspace({ ...base, ownerId: org.ownerId }).validate();
  await new Workspace({ ...base, organizationId: org._id, managerId: org.ownerId }).validate();
  for (const value of [base, { ...base, organizationId: org._id }, { ...base, organizationId: org._id, managerId: org.ownerId, ownerId: org.ownerId }, { ...base, ownerId: org.ownerId, managerId: org.ownerId }]) {
    await assert.rejects(new Workspace(value).validate());
  }
});
test('management DTOs reject privilege/parent injection and require explicit version', () => {
  for (const value of [{ role: 'owner', expectedVersion: 0 }, { role: 'admin' }, { role: 'admin', expectedVersion: 0, organizationId: org._id }]) assert.throws(() => roleInput(value));
  for (const value of [{ managerId: 'bad', expectedVersion: 0 }, { managerId: org.ownerId, expectedVersion: 0, role: 'admin' }]) assert.throws(() => managerInput(value));
  assert.throws(() => memberInput({ userId: org.ownerId, expectedVersion: 0, email: 'ignored@example.com' }));
  assert.deepEqual(managerInput({ managerId: org.ownerId, expectedVersion: 0 }), { managerId: org.ownerId, expectedVersion: 0 });
});
test('Organization admission is email-bound and cannot grant elevated roles', () => {
  assert.deepEqual(organizationInvitationInput({ email: 'Member@Example.com', workspaceId: org._id }), { email: 'member@example.com', workspaceId: org._id });
  for (const body of [{ email: 'bad' }, { email: 'member@example.com', role: 'admin' }, { email: 'member@example.com', type: 'LINK' }, { email: 'member@example.com', workspaceId: 'bad' }]) assert.throws(() => organizationInvitationInput(body));
});
