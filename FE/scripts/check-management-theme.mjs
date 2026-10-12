import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
import {withQaAccount} from '../../BE/scripts/seed-qa-account.mjs';
import {assertReadable} from './theme-contrast.mjs';
import {workspaceText} from '../src/lib/workspace-text.js';
import {projectText} from '../src/lib/project-text.js';
import {organizationText} from '../src/lib/organization-text.js';
const require=createRequire(import.meta.url),{chromium}=require(process.env.WORKFLOW_PLAYWRIGHT_MODULE||'playwright');
if(!process.argv.includes('--qa-account'))throw Error('Explicit --qa-account required');
const theme=process.env.WORKFLOW_MANAGEMENT_THEME==='light'?'light':'dark',locale=process.env.WORKFLOW_MANAGEMENT_LOCALE==='en'?'en':'vi';
await mkdir('.local/theme-complete',{recursive:true});
await withQaAccount('pepe19092003@gmail.com',async ({refresh,manifestPath})=>{
 const plan=JSON.parse(await readFile(manifestPath,'utf8')),browser=await chromium.launch({headless:true,executablePath:process.env.WORKFLOW_BROWSER_EXECUTABLE}),records=[],errors=[];
 try {
  const context=await browser.newContext({viewport:{width:1440,height:1000},colorScheme:theme});await context.addCookies([{name:'workflow_refresh',value:refresh,domain:'localhost',path:'/auth',httpOnly:true,sameSite:'Strict',secure:false}]);const page=await context.newPage();page.setDefaultTimeout(15000);page.on('pageerror',e=>errors.push(e.message));await page.addInitScript(({theme,locale})=>{localStorage.setItem('workflow.theme',theme);localStorage.setItem('workflow.auth.locale',locale);},{theme,locale});
  let measured=0;
  async function check(name){await page.waitForTimeout(350);assert.equal(await page.locator('html').getAttribute('data-theme'),theme);const selectors='main h2,main h3,main p,main label,main th,main td,main .tabs button,main .team-tabs button,main .empty,.dialog h2,.dialog p';await assertReadable(page,selectors);const bright=await page.locator('main .tabs,main .project-info,main .membership-card,main .settings-card,main .team-role-guide,.dialog').evaluateAll(els=>els.filter(el=>el.getBoundingClientRect().width).map(el=>({selector:el.className,color:getComputedStyle(el).backgroundColor})));if(theme==='dark')for(const row of bright)assert.notEqual(row.color,'rgb(255, 255, 255)','Unthemed surface '+row.selector);assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));await page.screenshot({path:`.local/theme-complete/${theme}-${locale}-${name}.png`,fullPage:true});records.push({name,surfaces:bright});await writeFile(`.local/theme-complete/report-${theme}-${locale}.json`,JSON.stringify(records,null,2));if(++measured%4===0){console.log('Management audit pause; limiter unchanged');await page.waitForTimeout(31000);}}
  async function go(route){await page.goto('http://localhost:5173/'+route);await page.locator('.shell').waitFor();await page.locator('main h1').first().waitFor();}
  for(const ws of [plan.primary.workspaceId,plan.workspaces.find(w=>w.name.includes('Team thiết kế')).id]){
   await go('#workspace/'+ws);await page.locator('.workspace-tabs').waitFor();const tabs=['Thành viên','Cài đặt nhóm','Email của tôi trong nhóm'];if(ws===plan.primary.workspaceId)tabs.push('Lời mời');for(const label of tabs){await page.locator('.workspace-tabs').getByRole('button',{name:workspaceText(label,locale),exact:true}).click();await page.locator('.project-info,.team-table-wrap').first().waitFor();await check('workspace-'+(ws===plan.primary.workspaceId?'standalone':'attached')+'-'+tabs.indexOf(label));}
  }
  await go('#organization/'+plan.organizations[0]+'/team');for(const label of ['Thành viên','Lời mời','Nhật ký']){await page.locator('.team-tabs').getByRole('button',{name:organizationText(label,locale),exact:true}).click();await check('org-'+label);}
  await go('#project/'+plan.primary.projectId);await page.getByRole('button',{name:projectText('Quản lý Project',locale),exact:true}).click();for(const label of ['Nhãn','Guest','Lời mời Guest','Yêu cầu mở lại']){const button=page.locator('.project-management .team-tabs').getByRole('button',{name:projectText(label,locale),exact:true});await button.click();await check('project-'+label);}
  for(const [name,route]of [['home','#home'],['org','#organizations'],['workspace','#workspace/'+plan.primary.workspaceId],['mytasks','#mine'],['shared','#shared'],['notifications','#notifications'],['task','#task/'+plan.primary.taskId],['taskempty','#task/'+plan.tasks.find(t=>t.title.includes('Chưa làm 09')).id],['trash','#project/'+plan.primary.projectId+'/trash'],['settings','#settings']]){await go(route);await check('site-'+name);}
  assert.deepEqual(errors,[]);console.log(JSON.stringify({pass:true,theme,locale,screens:records.length,businessWrites:0}));
 }catch(error){for(const context of browser.contexts())for(const page of context.pages()){await page.screenshot({path:'.local/theme-complete/failure.png',fullPage:true});console.log((await page.locator('main').allTextContents()).join(' ').slice(-1400));}throw error;}finally{await browser.close();}
});
