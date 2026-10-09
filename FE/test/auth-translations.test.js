import test from 'node:test';
import assert from 'node:assert/strict';
import {translateAuthText,authEnglish} from '../src/features/auth/auth-translations.js';
test('Auth locale resolves line-wrapped copy, preserves Vietnamese and unknown account values',()=>{
  assert.equal(translateAuthText('Mật khẩu\n mới','en'),'New password');
  assert.equal(translateAuthText('Mật khẩu mới','vi'),'Mật khẩu mới');
  for(const value of ['minh@example.com','test-v1','user chosen name',' secret password '])assert.equal(translateAuthText(value,'en'),value);
  assert.equal(translateAuthText('Chưa xác nhận được kết quả. Kiểm tra trạng thái trước khi gửi lại yêu cầu.','en'),'The outcome is not confirmed. Check the current state before submitting again.');
  assert.ok(Object.values(authEnglish).every(value=>typeof value==='string'&&value.length));
});
