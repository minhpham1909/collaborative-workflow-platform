import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
import {withQaAccount} from '../../BE/scripts/seed-qa-account.mjs';
const require=createRequire(import.meta.url),{chromium}=require(process.env.WORKFLOW_PLAYWRIGHT_MODULE||'playwright');
if(!process.argv.includes('--qa-account'))throw Error('QA account audit required');
const stage=process.env.WORKFLOW_DENSITY_STAGE==='before'?'before':'after';
await mkdir('.local/density',{recursive:true});
await withQaAccount('pepe19092003@gmail.com',async ({refresh,manifestPath})=>{
 const plan=JSON.parse(await readFile(manifestPath,'utf8')),records=[],errors=[];
 const browser=await chromium.launch({headless:true,executablePath:process.env.WORKFLOW_BROWSER_EXECUTABLE});
 try {
  const context=await browser.newContext({viewport:{width:1440,height:1000},colorScheme:'dark'});
  await context.addCookies([{name:'workflow_refresh',value:refresh,domain:'localhost',path:'/auth',httpOnly:true,sameSite:'Strict',secure:false}]);
  await context.addInitScript(()=>{localStorage.setItem('workflow.theme','dark');localStorage.setItem('workflow.auth.locale','vi');});
  const page=await context.newPage();page.setDefaultTimeout(15000);page.on('pageerror',e=>errors.push(e.message));
  let count=0;
  for(const [name,route]of [['home','#home'],['workspace','#workspace/'+plan.primary.workspaceId],['board','#project/'+plan.primary.projectId],['task','#task/'+plan.primary.taskId],['mine','#mine'],['shared','#shared'],['inbox','#notifications'],['settings','#settings'],['org','#organizations']]){
   await page.goto('http://localhost:5173/'+route);await page.locator('.shell').waitFor();await page.locator('main h1').first().waitFor();await page.waitForTimeout(500);
   for(const width of [375,768,1024,1366,1440,1920,2133]){
    await page.setViewportSize({width,height:1000});await page.waitForTimeout(150);
    const row=await page.evaluate(()=>{
     const main=document.querySelector('.shell main'),rect=main.getBoundingClientRect(),header=document.querySelector('.app-header').getBoundingClientRect(),sidebar=document.querySelector('.app-sidebar'),css=getComputedStyle(main);
     const cards=[...document.querySelectorAll('.home-workspace-card,.board-task,.my-task-row,.studio-note,.project-cards .card')].map(el=>el.getBoundingClientRect());
     return {width:innerWidth,mainWidth:rect.width,mainX:rect.x,padding:Number.parseFloat(css.paddingLeft),headerHeight:header.height,sidebarWidth:getComputedStyle(sidebar).display==='none'?0:sidebar.getBoundingClientRect().width,documentHeight:document.documentElement.scrollHeight,visibleItems:cards.filter(r=>r.top<innerHeight&&r.bottom>header.bottom).length,firstItemTop:cards[0]?.top??null,overflow:document.documentElement.scrollWidth>innerWidth+1,bodyFont:getComputedStyle(document.documentElement).fontSize};
    });
    assert.equal(row.overflow,false,name+' overflow at '+width);
    if(stage==='after'&&width>=1100){assert.ok(row.headerHeight<=72,'Header too tall: '+JSON.stringify(row));assert.equal(row.sidebarWidth,224);assert.ok(row.mainWidth>=width-row.sidebarWidth-1,'Main retains a width cap');assert.equal(row.padding,24);}
    if(width===375||width===1920)await page.screenshot({path:`.local/density/${stage}-${name}-${width}.png`,fullPage:true});records.push({name,...row});
   }
   if(++count%4===0){console.log('Density audit pause; limiter unchanged');await page.waitForTimeout(31000);}
  }
  assert.deepEqual(errors,[]);
  if(stage==='after'){
   const before=JSON.parse(await readFile('.local/density/before.json','utf8'));
   for(const row of records.filter(r=>r.width>=1100)){
    const old=before.find(r=>r.name===row.name&&r.width===row.width);assert.ok(old,'Missing same-route baseline');
    assert.ok(row.mainWidth>=old.mainWidth,'Main became narrower');
    assert.ok(row.headerHeight<old.headerHeight,'Header did not compact');
    if(row.firstItemTop!==null&&old.firstItemTop!==null)assert.ok(row.firstItemTop<=old.firstItemTop+2,row.name+' first item moved down');
   }
  }
  await writeFile(`.local/density/${stage}.json`,JSON.stringify(records,null,2));console.log(JSON.stringify({pass:true,stage,screens:records.length,businessWrites:0}));
 }finally{await browser.close();}
});
