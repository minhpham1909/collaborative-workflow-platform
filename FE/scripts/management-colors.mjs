import assert from 'node:assert/strict';
import {assertReadable} from './theme-contrast.mjs';
export async function assertManagementColors(page) {
  // Measure settled states after the existing 160ms color transition.
  await page.waitForTimeout(250);
  const selector='main p,main label,main th,main td,main h2,main h3,main .tabs button,main .team-tabs button,.dialog p,.dialog h2,.system-dialog p,.system-dialog h2,.person-profile-card > span';
  if(await page.locator(selector).count())await assertReadable(page,selector);
  if(await page.locator('html').getAttribute('data-theme')==='dark'){
    const pale=await page.locator('main .tabs,main .project-info,main .settings-card,main .membership-card,main .team-role-guide,.dialog,.system-dialog').evaluateAll(els=>els.filter(el=>el.getBoundingClientRect().width).filter(el=>{const value=getComputedStyle(el).backgroundColor.match(/^rgb\(([^)]+)\)$/);return value&&value[1].split(',').map(Number).every(v=>v>220);}).map(el=>el.className));
    assert.deepEqual(pale,[],'A management surface still uses a light-only background');
  }
}
export function installManagementColorChecks(page) {
  const capture=page.screenshot.bind(page);
  page.screenshot=async options=>{try{await assertManagementColors(page);}catch(error){await capture(options);throw error;}return capture(options);};
}
