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

   let calendarReads=0,slowCalendar=false;
   page.on('request',request=>{if(request.url().includes(':4000/my-calendar'))calendarReads++;});
   await page.route('**/my-calendar*',async route=>{if(slowCalendar)await new Promise(resolve=>setTimeout(resolve,900));await route.continue();});
   const badgeCount=await page.locator('.calendar-day-count').count(),beforeToday=calendarReads;
   for(let i=0;i<6;i++)await page.getByRole('button',{name:'Hôm nay',exact:true}).click();
   await page.waitForTimeout(350);assert.equal(calendarReads,beforeToday,'Same Today selection must not start or invalidate a read');assert.equal(await page.locator('.calendar-day-count').count(),badgeCount);
   slowCalendar=true;
   const selectedDay=await page.locator('[data-calendar-day][aria-current=date]').getAttribute('data-calendar-day');
   const otherDay=await page.locator('[data-calendar-day]:not([aria-current=date])').first().getAttribute('data-calendar-day');
   await page.locator('[data-calendar-day="'+otherDay+'"]').click();
   assert.equal(await page.locator('.calendar-day-count').count(),badgeCount,'Keep month summary while switching agenda day');
   await page.waitForTimeout(350);
   await page.getByRole('button',{name:'Hôm nay',exact:true}).click();await page.getByRole('button',{name:'Hôm nay',exact:true}).click();
   await page.locator('.calendar-card[aria-busy=false]').waitFor();await page.waitForLoadState('networkidle');slowCalendar=false;
   assert.equal(await page.locator('[data-calendar-day="'+selectedDay+'"]').getAttribute('aria-pressed'),'true');assert.equal(await page.locator('.calendar-day-count').count(),badgeCount);
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
   await page.goto('http://localhost:5173/#notifications');await page.locator('.studio-note').first().waitFor();await page.waitForLoadState('networkidle');
   const noteCount=await page.locator('.studio-note').count();await page.locator('input[type=search]').fill('   ');await page.waitForTimeout(400);assert.equal(await page.locator('.studio-note').count(),noteCount,'Whitespace query must not clear unchanged Inbox');
   await page.getByRole('button',{name:'Xóa bộ lọc thông báo',exact:true}).click();await page.getByRole('button',{name:'Xóa bộ lọc thông báo',exact:true}).click();assert.equal(await page.locator('.studio-note').count(),noteCount);
   await page.goto('http://localhost:5173/#settings');const name=page.getByLabel('Tên hiển thị',{exact:true});await name.waitFor();
   await name.fill('Bản nháp chưa lưu');await page.locator('h1').click();
   await page.evaluate(()=>window.dispatchEvent(new Event('online')));await page.waitForTimeout(1800);
   assert.equal(await name.inputValue(),'Bản nháp chưa lưu');
   currentRefresh=(await context.cookies()).find(cookie=>cookie.name==='workflow_refresh')?.value??currentRefresh;await context.close();
  }
  assert.deepEqual(errors,[]);console.log('PASS: light/dark calendar badges; left drawer 900/375, Escape/focus; automatic read on online; settings draft preserved. Repeated Today and delayed day-switch regression. No business writes.');
 }finally{await browser.close();}
});
