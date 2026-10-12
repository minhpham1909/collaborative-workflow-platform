import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {mkdir,writeFile} from 'node:fs/promises';
import {withQaAccount} from '../../BE/scripts/seed-qa-account.mjs';
import {assertReadable} from './theme-contrast.mjs';
const require=createRequire(import.meta.url);
const {chromium}=require(process.env.WORKFLOW_PLAYWRIGHT_MODULE||'playwright');
if(!process.argv.includes('--qa-account'))throw Error('Explicit QA account audit required');
await mkdir('.local/home-hero',{recursive:true});
await withQaAccount('pepe19092003@gmail.com',async ({refresh})=>{
  const browser=await chromium.launch({headless:true,executablePath:process.env.WORKFLOW_BROWSER_EXECUTABLE});
  const results=[],errors=[];
  try {
    const context=await browser.newContext({viewport:{width:1440,height:1000},colorScheme:'light'});
    await context.addCookies([{name:'workflow_refresh',value:refresh,domain:'localhost',path:'/auth',httpOnly:true,sameSite:'Strict',secure:false}]);
    await context.addInitScript(()=>localStorage.setItem('workflow.theme','system'));
    const page=await context.newPage();page.setDefaultTimeout(15000);page.on('pageerror',e=>errors.push(e.message));
    for(const locale of ['vi','en']){
      if(locale==='vi')await page.addInitScript(()=>{if(!localStorage.getItem('workflow.auth.locale'))localStorage.setItem('workflow.auth.locale','vi');});
      await page.goto('http://localhost:5173/#home');
      if(locale==='en'){await page.evaluate(()=>localStorage.setItem('workflow.auth.locale','en'));await page.reload();}
      await page.locator('.shell .studio-home').waitFor();await page.locator('.home-workspace-card').first().waitFor();
      const hero=page.locator('.studio-home-hero'),gallery=hero.locator('.studio-carousel');
      const next=gallery.getByRole('button',{name:locale==='en'?'Next illustration':'Ảnh minh họa tiếp theo',exact:true});
      const previous=gallery.getByRole('button',{name:locale==='en'?'Previous illustration':'Ảnh minh họa trước',exact:true});
      const create=hero.getByRole('button',{name:locale==='en'?'Create workspace':'Tạo Workspace',exact:true});
      for(const theme of ['light','dark']){
        await page.emulateMedia({colorScheme:theme});await page.waitForFunction(t=>document.documentElement.dataset.theme===t,theme);
        for(const width of [375,768,1024,1280,1440]){
          await page.setViewportSize({width,height:1000});await page.waitForTimeout(250);
          const before=await hero.boundingBox(),background=await gallery.boundingBox();assert.equal(await gallery.isVisible(),true);
          for(const key of ['x','y','width','height'])assert.ok(Math.abs(before[key]-background[key])<1,'Background must fill hero: '+key);
          for(const control of [create,next,previous]){
            const rect=await control.boundingBox();assert.ok(rect.width>=44&&rect.height>=44,'44px hit target');
            assert.ok(await control.evaluate(el=>{const r=el.getBoundingClientRect();return el.contains(document.elementFromPoint(r.x+r.width/2,r.y+r.height/2));}),'Control is covered');
          }
          const first=await gallery.locator('img').getAttribute('src');await next.press('Enter');
          await page.waitForFunction(src=>document.querySelector('.studio-carousel img').getAttribute('src')!==src,first);
          assert.equal((await hero.boundingBox()).height,before.height,'Slide switch changes layout');
          await previous.press('Space');assert.equal(await gallery.locator('img').getAttribute('src'),first);
          await assertReadable(page,'.home-hero-copy h1',3);await assertReadable(page,'.home-hero-copy p,.studio-carousel-caption small,.studio-carousel-caption strong,.studio-carousel-controls span');
          assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'Page overflow');
          await page.screenshot({path:`.local/home-hero/${locale}-${theme}-${width}.png`,fullPage:true});results.push({locale,theme,width,height:before.height});
        }
      }
      await page.emulateMedia({reducedMotion:'reduce'});assert.equal(await gallery.locator('img').evaluate(el=>getComputedStyle(el).animationName),'none');
      await page.route('**/images/studio/moodboard.jpg',route=>route.abort());
      const before=await hero.boundingBox();await next.click();await gallery.locator('img').waitFor({state:'hidden'});
      assert.equal((await hero.boundingBox()).height,before.height);assert.equal(await create.isVisible(),true);
      await next.click();await gallery.locator('img').waitFor({state:'visible'});await next.click();await page.unroute('**/images/studio/moodboard.jpg');
      await create.click();await page.getByRole('dialog').waitFor();await page.getByRole('dialog').getByRole('button',{name:locale==='en'?'Cancel':'Hủy',exact:true}).click();
    }
    assert.deepEqual(errors,[]);await writeFile('.local/home-hero/report.json',JSON.stringify(results,null,2));
    console.log(JSON.stringify({pass:true,states:results.length,checks:'integrated background, contrast, 44px/uncovered actions, keyboard/manual switch, stable height, missing image, reduced motion, create dialog',businessWrites:0}));
  }finally{await browser.close();}
});
