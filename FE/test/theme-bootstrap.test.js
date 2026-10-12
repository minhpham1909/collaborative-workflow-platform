import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
const source = readFileSync(new URL('../public/theme-init.js', import.meta.url), 'utf8');
test('Theme bootstrap honors the system, manual preference, and unavailable or invalid storage', () => {
  for (const [saved, systemDark, expected, denied] of [[null,true,'dark'],[null,false,'light'],['light',true,'light'],['dark',false,'dark'],['invalid',true,'dark'],[null,true,'dark',true]]) {
    const element = { dataset:{}, style:{} };
    runInNewContext(source,{ document:{documentElement:element},window:{matchMedia:()=>({matches:systemDark})},localStorage:{getItem:()=>{if(denied)throw new Error('Storage denied');return saved;}} });
    assert.equal(element.dataset.theme,expected); assert.equal(element.style.colorScheme,expected);
    assert.equal(element.dataset.themePreference,['dark','light'].includes(saved)?saved:'system');
  }
});
