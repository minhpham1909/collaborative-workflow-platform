// Local acceptance runner. Child scripts own isolated databases; no dev seed/workers.
import {spawn,execFileSync} from 'node:child_process';
import {mkdir,writeFile} from 'node:fs/promises';
import {createWriteStream} from 'node:fs';
import {fileURLToPath} from 'node:url';
const root=fileURLToPath(new URL('../../',import.meta.url)),out=root+'.local/product-p6/';
await mkdir(out,{recursive:true});
const scripts=['check-web-journey','check-product-write-failures','check-product-create-access','check-product-workspace-settings','check-product-workspace-team','check-product-workspace-security','check-product-workspace-dialog-errors','check-product-task-access-checklist','check-product-task-metadata-comments','check-product-project-management','check-product-my-tasks-return','check-product-calendar-inbox-access','check-product-personal-pagination','check-collection-views','check-inbox-views','check-lazy-inbox','check-stitch-auth'];
const results=[],jobs=['light','dark'].flatMap(theme=>scripts.map(script=>({script,theme}))),commit=execFileSync('git',['rev-parse','HEAD'],{cwd:root,encoding:'utf8'}).trim();
let persistence=Promise.resolve();
function persist(){const snapshot=JSON.stringify({commit,total:jobs.length,completed:results.length,passed:results.filter(r=>r.code===0).length,failed:results.filter(r=>r.code!==0).length,results},null,2);persistence=persistence.then(()=>writeFile(out+'results.json',snapshot));return persistence;}
let next=0;await persist();
async function worker(){while(next<jobs.length){const job=jobs[next++],log=out+job.script+'-'+job.theme+'.log',stream=createWriteStream(log),start=Date.now();const env={...process.env,WORKFLOW_JOURNEY_THEME:job.theme,WORKFLOW_JOURNEY_LANGUAGE:job.theme==='dark'?'en':'vi',WORKFLOW_JOURNEY_WIDTH:job.theme==='dark'?'375':'1440',WORKFLOW_VIEW_THEME:job.theme,WORKFLOW_REGRESSION_THEME:job.theme};const child=spawn(process.execPath,[root+'FE/scripts/'+job.script+'.mjs'],{cwd:root,env,stdio:['ignore','pipe','pipe']});child.stdout.pipe(stream,{end:false});child.stderr.pipe(stream,{end:false});const code=await new Promise(resolve=>{child.once('error',()=>resolve(-1));child.once('close',code=>resolve(code??-1));});await new Promise(resolve=>stream.end(resolve));results.push({...job,code,seconds:Math.round((Date.now()-start)/1000),log});await persist();console.log((code===0?'PASS ':'FAIL ')+job.script+' '+job.theme);}}
await Promise.all([worker(),worker()]);await persist();process.exitCode=results.some(r=>r.code!==0)?1:0;
