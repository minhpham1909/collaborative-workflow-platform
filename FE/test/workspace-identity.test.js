import test from 'node:test';
import assert from 'node:assert/strict';
import { workspaceIdentity, workspaceIdentityBody, workspaceColors, workspaceCovers, validWorkspaceSummary } from '../src/lib/workspace-identity.js';
import { WORKSPACE_COLORS, WORKSPACE_COVERS } from '../../BE/src/workspaces/identity.js';
test('Workspace UI presets agree with BE and optional summary clears without changing other metadata', () => {
  assert.deepEqual(workspaceColors.map(([key]) => key), WORKSPACE_COLORS);
  assert.deepEqual(workspaceCovers.map(([key]) => key), WORKSPACE_COVERS);
  assert.equal(workspaceIdentity({ summary: null }).summary, '');
  assert.equal(workspaceIdentityBody({ ...workspaceIdentity(), summary: '  ' }).summary, null);
  assert.equal(workspaceIdentityBody({ ...workspaceIdentity(), summary: '  Mục tiêu  ' }).summary, 'Mục tiêu');
  assert.equal(validWorkspaceSummary('x'.repeat(500)), true);
  assert.equal(validWorkspaceSummary('x'.repeat(501)), false);
  assert.equal(validWorkspaceSummary('bad\nline'), false);
});
