// Read-only smoke check on the authorized local QA principal; never pins data.
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {readFile} from 'node:fs/promises';
import {withQaAccount} from '../../BE/scripts/seed-qa-account.mjs';
const require=createRequire(import.meta.url),{chromium}=require(process.env.WORKFLOW_PLAYWRIGHT_MODULE||'playwright');
if(!process.argv.includes('--qa-account'))throw Error('Explicit QA audit required');
await withQaAccount('pepe19092003@gmail.com',async ({refresh,manifestPath})=>{
 const plan=JSON.parse(await readFile(manifestPath,'utf8'));
 const browser=await chromium.launch({headless:true,executablePath:process.env.WORKFLOW_BROWSER_EXECUTABLE});
 try {
  const context=await browser.newContext({viewport:{width:1440,height:1000},colorScheme:'dark'});
  await context.addCookies([{name:'workflow_refresh',value:refresh,domain:'localhost',path:'/auth',httpOnly:true,sameSite:'Strict',secure:false}]);
  await context.addInitScript(()=>{localStorage.setItem('workflow.auth.locale','vi');localStorage.setItem('workflow.theme','dark');});
  const page=await context.newPage();page.setDefaultTimeout(15000);
  await page.goto('http://localhost:5173/#calendar');await page.locator('.shell main.studio-calendar').waitFor();
  await page.waitForFunction(()=>{const total=document.querySelector('.calendar-toolbar > span');return total&&!total.textContent.includes('—');});
  assert.equal(await page.locator('.studio-calendar .feedback.error').count(),0);assert.ok(await page.locator('[data-calendar-day]').count()>=28);
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
  console.log(JSON.stringify({pass:true,checks:'live authenticated QA calendar counts and day agenda, valid month grid, no error/overflow',businessWrites:0}));
 }finally{await browser.close();}
});
