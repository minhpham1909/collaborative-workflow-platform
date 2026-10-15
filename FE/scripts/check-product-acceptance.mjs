// Read-only business smoke on the newly seeded local-dev scenario. Auth sessions only.
import assert from 'node:assert/strict';
import {readFile,mkdir} from 'node:fs/promises';
import {createRequire} from 'node:module';
import {fileURLToPath} from 'node:url';
import {withQaAccount} from '../../BE/scripts/seed-qa-account.mjs';
const require=createRequire(import.meta.url),{chromium}=require(process.env.WORKFLOW_PLAYWRIGHT_MODULE||'playwright');
const directory=fileURLToPath(new URL('../../.local/workspace-acceptance/',import.meta.url));
const manifest=JSON.parse(await readFile(directory+'manifest.json','utf8'));
assert.equal(manifest.state,'complete');
await mkdir(directory+'screens',{recursive:true});
await withQaAccount('pepe19092003@gmail.com',async({refresh,user})=>{
 assert.equal(String(user._id),manifest.primaryId);
 const browser=await chromium.launch({executablePath:process.env.WORKFLOW_BROWSER_EXECUTABLE,headless:true});
 const errors=[],scenario=manifest.scenario,checks=[];
 try{
  const context=await browser.newContext({viewport:{width:1440,height:1000}});
  await context.addCookies([{name:'workflow_refresh',value:refresh,domain:'localhost',path:'/auth',httpOnly:true,secure:false,sameSite:'Strict'}]);
  const page=await context.newPage();page.setDefaultTimeout(15000);page.on('pageerror',error=>errors.push(error.message));
  await page.addInitScript(()=>localStorage.setItem('workflow.auth.locale','vi'));
  for(const [route,selector] of [['home','.home-workspace-card'],['workspace/'+scenario.mainWorkspaceId,'.project-card'],['project/'+scenario.boardProjectId,'.board-task'],['task/'+scenario.commentTaskId,'.studio-task-detail'],['mine','.my-task-groups'],['calendar','.calendar-card[aria-busy=false]'],['notifications','.studio-note']]){
   await page.goto('http://localhost:5173/#'+route);await page.locator(selector).first().waitFor();await page.waitForLoadState('networkidle');
   assert.equal(await page.locator('main').count(),1);
   assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
   await page.screenshot({path:directory+'screens/owner-'+route.split('/')[0]+'.png',fullPage:true});checks.push('owner:'+route.split('/')[0]);
  }
  await context.close();
  for(const account of manifest.credentials.accounts){
   const ctx=await browser.newContext({viewport:{width:1440,height:1000}});const p=await ctx.newPage();p.setDefaultTimeout(15000);p.on('pageerror',error=>errors.push(error.message));
   await p.goto('http://localhost:5173/');await p.getByLabel('Email',{exact:true}).fill(account.email);await p.getByLabel('Mật khẩu',{exact:true}).fill(manifest.credentials.password);await p.getByRole('button',{name:'Đăng nhập',exact:true}).click();await p.locator('.studio-home').waitFor();
   await p.goto('http://localhost:5173/#project/'+scenario.boardProjectId);await p.locator('.board-task').first().waitFor();
   assert.equal(await p.getByRole('button',{name:'+ Tạo Task',exact:true}).count(),account.role==='guest'?0:1);
   await p.screenshot({path:directory+'screens/'+account.role+'-board.png',fullPage:true});checks.push(account.role+':board');
   await ctx.close();
  }
  assert.deepEqual(errors,[]);console.log(JSON.stringify({state:'pass',checks,businessMutations:0,sends:0}));
 }finally{await browser.close();}
});
