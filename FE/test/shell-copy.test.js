import test from 'node:test';
import assert from 'node:assert/strict';
import { shellText } from '../src/lib/shell-copy.js';
test('Shell copy preserves user names and numbers across presentation language changes', () => {
  const name = 'Mật khẩu $& {name}';
  assert.equal(shellText('Menu tài khoản của {name}', 'en', { name }), 'Account menu for ' + name);
  assert.equal(shellText('Menu tài khoản của {name}', 'vi', { name }), 'Menu tài khoản của ' + name);
  assert.equal(shellText('{count} thông báo chưa đọc', 'en', { count: 17 }), '17 unread notifications');
  assert.equal(shellText('An unknown label', 'en'), 'An unknown label');
});
