import { test } from 'node:test';
import assert from 'node:assert/strict';
import { WORKSPACE_AUDIT_ACTIONS } from '../../BE/src/workspaces/audit-policy.js';
import { workspaceAuditActions, workspaceAuditText, workspaceAuditActionLabel, workspaceAuditFieldLabel } from '../src/lib/workspace-audit-text.js';
test('Management history covers every BE action in Vi/En without translating account names or user reasons', () => {
 assert.deepEqual(workspaceAuditActions, [...WORKSPACE_AUDIT_ACTIONS]);
 for (const action of WORKSPACE_AUDIT_ACTIONS) for (const locale of ['vi','en']) assert.notEqual(workspaceAuditActionLabel(action, locale), action);
 assert.equal(workspaceAuditText('Minh — Điều phối ✨', 'en'), 'Minh — Điều phối ✨');
 assert.equal(workspaceAuditFieldLabel('summary', 'en'), 'Short goal');
 assert.equal(workspaceAuditActionLabel('unknown', 'en'), 'Workspace change');
 assert.equal(workspaceAuditText('Nhật ký quản lý Workspace', 'en'), 'Workspace management history');
});
