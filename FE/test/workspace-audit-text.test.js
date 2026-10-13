import { test } from 'node:test';
import assert from 'node:assert/strict';
import { WORKSPACE_AUDIT_ACTIONS } from '../../BE/src/workspaces/audit-policy.js';
import { workspaceAuditActions, workspaceAuditText, workspaceAuditActionLabel, workspaceAuditFieldLabel, workspaceAuditCleanupLabel } from '../src/lib/workspace-audit-text.js';
test('Management history covers every BE action in Vi/En without translating account names or user reasons', () => {
 assert.deepEqual(workspaceAuditActions, [...WORKSPACE_AUDIT_ACTIONS]);
 for (const action of WORKSPACE_AUDIT_ACTIONS) for (const locale of ['vi','en']) assert.notEqual(workspaceAuditActionLabel(action, locale), action);
 assert.equal(workspaceAuditText('Minh — Điều phối ✨', 'en'), 'Minh — Điều phối ✨');
 assert.equal(workspaceAuditFieldLabel('summary', 'en'), 'Short goal');
 assert.equal(workspaceAuditActionLabel('unknown', 'en'), 'Workspace change');
 assert.equal(workspaceAuditText('Nhật ký quản lý Workspace', 'en'), 'Workspace management history');
});

test('Ban cleanup label shows recorded range and actual progress without implying a completed cleanup', () => {
 const value = {mode:'7',state:'pending',matchedCount:3,deletedCount:0};
 assert.equal(workspaceAuditCleanupLabel(value,'en'),'7 days before the ban · Queued · 0/3 comments removed');
 assert.equal(workspaceAuditCleanupLabel({...value,mode:'none'},'vi'),'Giữ bình luận');
});
