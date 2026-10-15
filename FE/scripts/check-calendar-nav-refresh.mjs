import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {mkdir} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {withQaAccount} from '../../BE/scripts/seed-qa-account.mjs';
import {assertReadable} from './theme-contrast.mjs';
const require=createRequire(import.meta.url),{chromium}=require(process.env.WORKFLOW_PLAYWRIGHT_MODULE||'playwright');
const out=fileURLToPath(new URL('../../.local/calendar-nav-repair/',import.meta.url));await mkdir(out,{recursive:true});
await withQaAccount('pepe19092003@gmail.com',async({refresh})=>{
 const browser=await chromium.launch({executablePath:process.env.WORKFLOW_BROWSER_EXECUTABLE,headless:true});
 const errors=[];let currentRefresh=refresh;
 try{
  for(const theme of ['light','dark']){
   const context=await browser.newContext({viewport:{width:1440,height:1000},colorScheme:theme});
   await context.addCookies([{name:'workflow_refresh',value:currentRefresh,domain:'localhost',path:'/auth',httpOnly:true,secure:false,sameSite:'Strict'}]);
   const page=await context.newPage();page.setDefaultTimeout(15000);page.on('pageerror',e=>{errors.push(e.message);console.log('PAGE ERROR',e.message);});
   await page.addInitScript(()=>localStorage.setItem('workflow.auth.locale','vi'));
   let reads=0;page.on('request',request=>{if(request.url().includes(':4000/workspaces?'))reads++;});
   await page.goto('http://localhost:5173/#calendar?status=all');await page.locator('.calendar-card[aria-busy=false]').waitFor();
   assert.ok(await page.locator('.calendar-day-count').count()>0);assert.ok(await page.locator('.calendar-day-done').count()>0);
   assert.equal(await page.getByRole('button',{name:/Làm mới|Tải lại lịch/}).count(),0);assert.equal((await page.locator('.calendar-toolbar label').innerText()).trim(),'');
   await assertReadable(page,'.calendar-day-count,.calendar-day-done,.calendar-day-overdue');
   await page.screenshot({path:out+'/'+theme+'-calendar.png',fullPage:true});
   for(const width of [900,375]){
    await page.setViewportSize({width,height:900});await page.getByRole('button',{name:'Mở menu điều hướng',exact:true}).click();
    const drawer=page.getByRole('dialog',{name:'Menu điều hướng'});await drawer.waitFor();await page.waitForTimeout(250);
    const box=await drawer.boundingBox();assert.ok(Math.abs(box.x)<1);assert.ok(box.width<=304.5);
    await page.screenshot({path:out+'/'+theme+'-drawer-'+width+'.png'});
    await page.keyboard.press('Escape');await drawer.waitFor({state:'hidden'});
    assert.ok(await page.getByRole('button',{name:'Mở menu điều hướng',exact:true}).evaluate(el=>el===document.activeElement));
    assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
   }
   await page.setViewportSize({width:1440,height:1000});await page.goto('http://localhost:5173/#home');await page.locator('.home-workspace-card').first().waitFor();await page.waitForLoadState('networkidle');
   await page.locator('h1').click();const before=reads;
   await page.evaluate(()=>window.dispatchEvent(new Event('online')));
   await page.waitForTimeout(1800);assert.ok(reads>before,'online triggers read revalidation');
   assert.equal(await page.getByRole('button',{name:'Làm mới',exact:true}).count(),0);
   await page.goto('http://localhost:5173/#settings');const name=page.getByLabel('Tên hiển thị',{exact:true});await name.waitFor();
   await name.fill('Bản nháp chưa lưu');await page.locator('h1').click();
   await page.evaluate(()=>window.dispatchEvent(new Event('online')));await page.waitForTimeout(1800);
   assert.equal(await name.inputValue(),'Bản nháp chưa lưu');
   currentRefresh=(await context.cookies()).find(cookie=>cookie.name==='workflow_refresh')?.value??currentRefresh;await context.close();
  }
  assert.deepEqual(errors,[]);console.log('PASS: light/dark calendar badges; left drawer 900/375, Escape/focus; automatic read on online; settings draft preserved. No business writes.');
 }finally{await browser.close();}
});
