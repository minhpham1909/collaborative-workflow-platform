import assert from 'node:assert/strict';
import test from 'node:test';
import { messageFor } from '../src/lib/messages.js';
import { workflowText } from '../src/lib/workflow-text.js';

test('Permission and workflow failures explain the next step in the selected UI language without exposing server messages', () => {
  const denied = messageFor({ code: 'PROJECT_MANAGEMENT_REQUIRED', message: 'private-server-detail' });
  assert.equal(workflowText(denied, 'vi'), denied);
  assert.equal(workflowText(denied, 'en'), 'This action requires current project management access.');
  assert.match(workflowText(messageFor({ code: 'REOPEN_REQUEST_COOLDOWN' }), 'en'), /24 hours/);
  assert.match(workflowText(messageFor({ code: 'TASK_RETENTION_EXPIRED' }), 'en'), /30-day/);
  assert.doesNotMatch(workflowText(messageFor({ code: 'UNKNOWN', message: 'private-server-detail' }), 'en'), /private-server-detail/);
});
