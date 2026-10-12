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
  await page.goto('http://localhost:5173/#home');await page.locator('.shell').waitFor();
  await page.waitForFunction(()=>{const nav=document.querySelector('.app-sidebar .project-pins-nav');return nav&&!(nav.querySelector('[role=status]'));});
  assert.equal(await page.locator('.app-sidebar .project-pins-nav [role=alert]').count(),0);
  await page.goto('http://localhost:5173/#project/'+plan.primary.projectId);
  const pin=page.locator('.board-project-header .project-pin-action button').first();await pin.waitFor();await page.waitForFunction(()=>!document.querySelector('.board-project-header .project-pin-action button')?.disabled);
  console.log(JSON.stringify({pass:true,checks:'live API current pin list, authenticated QA, enabled Project pin control',businessWrites:0}));
 }finally{await browser.close();}
});
