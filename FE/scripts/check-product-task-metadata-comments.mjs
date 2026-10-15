import { assertReadable } from './theme-contrast.mjs';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { once } from 'node:events';
import { mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
const require = createRequire(import.meta.url);
const { chromium } = require(process.env.WORKFLOW_PLAYWRIGHT_MODULE || 'playwright');
const { MongoMemoryReplSet } = await import('../../BE/node_modules/mongodb-memory-server-core/lib/index.js');
const { default: mongoose } = await import('../../BE/node_modules/mongoose/index.js');
const { models, User, Project, Task, TaskComment, Notification } = await import('../../BE/src/models/index.js');
const { createApp } = await import('../../BE/src/app.js');
const { createAuthService } = await import('../../BE/src/auth/service.js');
const { createMongoAuthStore } = await import('../../BE/src/auth/mongo-store.js');
const { hashPassword } = await import('../../BE/src/auth/passwords.js');
const { createWorkspaceService } = await import('../../BE/src/workspaces/service.js');
const { createMongoWorkspaceStore } = await import('../../BE/src/workspaces/mongo-store.js');
const { createWorkService } = await import('../../BE/src/work/service.js');
const { createMongoWorkStore } = await import('../../BE/src/work/mongo-store.js');
const { createNotificationsService } = await import('../../BE/src/notifications/service.js');
const { createMongoNotificationsStore } = await import('../../BE/src/notifications/mongo-store.js');
const { cutoffCodec } = await import('../../BE/src/notifications/input.js');
const { testConfig } = await import('../../BE/test-support/auth-store.js');
const { createUsersService } = await import('../../BE/src/users/service.js');
const { createMongoUsersStore } = await import('../../BE/src/users/mongo-store.js');

const feOrigin=process.env.WORKFLOW_FE_ORIGIN??'http://localhost:5173';assert.ok(/^http:\/\/localhost:(5173|4176)$/.test(feOrigin));
const theme=process.env.WORKFLOW_JOURNEY_THEME==='dark'?'dark':'light';
const language=process.env.WORKFLOW_JOURNEY_LANGUAGE==='en'?'en':'vi';
const width=Number(process.env.WORKFLOW_JOURNEY_WIDTH??1440);assert.ok([375,1440].includes(width));
const ui=(vi,en)=>language==='en'?en:vi;
const out=fileURLToPath(new URL('../../.local/product-p4b/',import.meta.url)); await mkdir(out,{recursive:true});
let repl,server,browser,origin; const errors=[];
try {
  repl=await MongoMemoryReplSet.create({binary:{version:'8.0.17',downloadDir:fileURLToPath(new URL('../../.local/mongodb-binaries/',import.meta.url))},instanceOpts:[{launchTimeout:30000}],replSet:{count:1,storageEngine:'wiredTiger',ip:'127.0.0.1'}});
  await mongoose.connect(repl.getUri('workflow_web_journey_test'));for(const model of Object.values(models))await model.createIndexes();
  const config={...testConfig(),webOrigin:feOrigin,secureCookies:false},password='Web journey fixture password',hash=await hashPassword(password);
  const auth=await createAuthService({store:createMongoAuthStore(),config}),workspaces=createWorkspaceService({store:createMongoWorkspaceStore({config})}),work=createWorkService({store:createMongoWorkStore({config})}),usersService=createUsersService({store:createMongoUsersStore()});
  const cutoff=cutoffCodec(config.accessKeyHex),notificationsService=createNotificationsService({store:createMongoNotificationsStore({cutoff}),cutoff});
  const users=[],auths=[];for(let i=0;i<4;i++){const user=await User.create({email:`journey-${i}@example.com`,displayName:['QA Owner','QA Member','QA Guest','QA Manager'][i],passwordHash:hash,emailVerifiedAt:new Date(),termsAcceptance:{version:'fixture',acceptedAt:new Date()}});users.push(user);auths.push(await auth.authenticate((await auth.login({email:user.email,password})).accessToken));}
  const ws=(await workspaces.create(auths[0],{name:'QA Workspace'})).workspace;
  const admission=await workspaces.invite(auths[0],ws.id,{type:'LINK'});
  const admissionToken=new URLSearchParams(new URL(admission.url).hash.slice(1)).get('token');
  for(const i of [1,3])await workspaces.accept(auths[i],{token:admissionToken});
  await workspaces.role(auths[0],ws.id,users[3].id,{expectedVersion:0,role:'manager',reason:'Workspace-only browser fixture appointment'});
  const app=()=>createApp({authService:auth,authConfig:config,usersService,workspaceService:workspaces,workService:work,notificationsService});
  async function rotate(){const previous=server;server=app().listen(0,'127.0.0.1');await once(server,'listening');origin=`http://127.0.0.1:${server.address().port}`;if(previous)await new Promise(resolve=>previous.close(resolve));}
  await rotate();browser=await chromium.launch({executablePath:process.env.WORKFLOW_BROWSER_EXECUTABLE,headless:true});
  async function pageFor(index){const context=await browser.newContext({viewport:{width,height:1000},colorScheme:theme});await context.route('http://localhost:4000/**',async route=>{const response=await route.fetch({url:route.request().url().replace('http://localhost:4000',origin)});await route.fulfill({response});});const page=await context.newPage();await page.addInitScript(value=>localStorage.setItem('workflow.auth.locale',value),language);await page.addInitScript(value=>localStorage.setItem('workflow.theme',value),theme);page.setDefaultTimeout(15000);page.on('pageerror',error=>errors.push(error.message));page.on('console',message=>{if(message.type()==='error'&&!/status of (401|404)/.test(message.text()))console.log('Browser diagnostic:',message.text().slice(0,1200));});page.on('requestfailed',request=>{if(new URL(request.url()).pathname.startsWith('/src/')||new URL(request.url()).pathname.startsWith('/assets/'))console.log('Asset request failure:',new URL(request.url()).pathname,request.failure()?.errorText);});await page.goto(feOrigin+'/');await page.getByLabel('Email',{exact:true}).fill(users[index].email);await page.getByLabel(ui('Mật khẩu','Password'),{exact:true}).fill(password);await page.getByRole('button',{name:ui('Đăng nhập','Sign in'),exact:true}).click();await page.locator('.studio-home').waitFor();return page;}
  async function navigate(page,name){if(width===375){await page.getByRole('button',{name:ui('Mở menu điều hướng','Open navigation menu'),exact:true}).click();const menu=page.getByRole('dialog',{name:ui('Menu điều hướng','Navigation menu'),exact:true});await menu.getByRole('link',{name,exact:true}).click();await menu.waitFor({state:'hidden'});}else await page.getByRole('link',{name,exact:true}).first().click();}
  const project=(await work.createProject(auths[0],ws.id,{name:'P4b Project with a long descriptive name for responsive checks'})).project;
  const task=(await work.createTask(auths[0],project.id,{title:'P4b '+('LongTaskTitle'.repeat(18)),assigneeId:users[1].id})).task;
  const label=(await work.createLabel(auths[0],project.id,{name:'P4b design review',color:'lavender'})).label;
  const owner=await pageFor(0),member=await pageFor(1);
  await owner.goto(feOrigin+'/#task/'+task.id);await owner.getByRole('button',{name:ui('Sửa Task','Edit task'),exact:true}).click();await owner.getByLabel(ui('Mức ưu tiên','Priority level'),{exact:true}).selectOption('high');await owner.getByLabel(label.name,{exact:true}).check();await owner.getByLabel(ui('Deadline · Giờ Việt Nam','Deadline · Vietnam time'),{exact:true}).fill('2030-01-02T07:15');await owner.getByRole('button',{name:ui('Lưu Task','Save task'),exact:true}).click();await owner.getByRole('button',{name:ui('Sửa Task','Edit task'),exact:true}).waitFor();let current=(await work.getTask(auths[0],task.id)).task;assert.equal(current.priority,'high');assert.deepEqual(current.labelIds,[label.id]);assert.equal(new Date(current.dueAt).toISOString(),'2030-01-02T00:15:00.000Z');
  await work.updateLabel(auths[0],project.id,label.id,{expectedVersion:label.version,archived:true});await owner.reload();await owner.getByRole('button',{name:ui('Sửa Task','Edit task'),exact:true}).click();await owner.getByLabel(ui('Tiêu đề Task','Task title'),{exact:true}).fill('P4b updated '+('LongTaskTitle'.repeat(18)));await owner.getByRole('button',{name:ui('Lưu Task','Save task'),exact:true}).click();await owner.getByRole('button',{name:ui('Sửa Task','Edit task'),exact:true}).waitFor();assert.deepEqual((await work.getTask(auths[0],task.id)).task.labelIds,[label.id]);
  // Comment create committed, response lost: lock editing and recover by reading, not resending.
  await member.goto(feOrigin+'/#task/'+task.id);await member.getByRole('button',{name:ui('+ Viết bình luận','+ Write comment'),exact:true}).click();let editor=member.getByRole('textbox',{name:ui('Bình luận mới','New comment'),exact:true});await editor.fill('P4b committed comment');let commentWrites=0;
  await member.route('**/tasks/'+task.id+'/comments',async route=>{if(route.request().method()!=='POST')return route.fallback();commentWrites++;const result=await route.fetch({url:origin+'/tasks/'+task.id+'/comments'});assert.ok(result.ok());await route.abort('failed');});await member.getByRole('button',{name:ui('Gửi bình luận','Post comment'),exact:true}).click();await member.locator('.comment-form [role=alert]').waitFor();assert.ok(await member.getByRole('button',{name:ui('Gửi bình luận','Post comment'),exact:true}).isDisabled());assert.equal(await editor.getAttribute('contenteditable'),'false');assert.equal(await TaskComment.countDocuments({taskId:task.id}),1);assert.equal(commentWrites,1);
  await member.unroute('**/tasks/'+task.id+'/comments');await member.getByRole('button',{name:ui('Hủy bình luận','Cancel comment'),exact:true}).click();await member.locator('.system-dialog .primary').click();await member.locator('.comment').first().waitFor();assert.equal(commentWrites,1);
  // Only the author can edit/delete; stale edit keeps the local draft.
  await owner.reload();await owner.locator('.comment').first().waitFor();assert.equal(await owner.getByRole('button',{name:ui('Sửa bình luận','Edit comment'),exact:true}).count(),0);assert.equal(await owner.getByRole('button',{name:ui('Xóa bình luận','Delete comment'),exact:true}).count(),0);
  await member.getByRole('button',{name:ui('Sửa bình luận','Edit comment'),exact:true}).click();editor=member.getByRole('textbox',{name:ui('Sửa bình luận','Edit comment'),exact:true});await editor.fill('P4b local comment draft');const comment=await TaskComment.findOne({taskId:task.id});const content=text=>({format:'prosemirror-json',schemaVersion:1,document:{type:'doc',content:[{type:'paragraph',content:[{type:'text',text}]}]}});await work.updateComment(auths[1],task.id,String(comment._id),{expectedVersion:comment.version,content:content('P4b remote comment winner')});const response=member.waitForResponse(r=>r.url().includes('/comments/')&&r.request().method()==='PATCH');await member.getByRole('button',{name:ui('Lưu bình luận','Save comment'),exact:true}).click();assert.equal((await response).status(),409);await member.locator('.comment-form [role=alert]').waitFor();assert.match(await editor.innerText(),/P4b local comment draft/u);
  await member.getByRole('button',{name:ui('Hủy bình luận','Cancel comment'),exact:true}).click();await member.locator('.system-dialog .primary').click();await member.reload();await member.getByRole('button',{name:ui('Xóa bình luận','Delete comment'),exact:true}).click();await member.locator('.system-dialog .primary').click();await member.locator('.comment').waitFor({state:'detached'});assert.equal(await TaskComment.countDocuments({taskId:task.id}),0);
  for(const route of ['#task/'+task.id,'#project/'+project.id]){if(owner.url()===feOrigin+'/'+route)await owner.reload();else await owner.goto(feOrigin+'/'+route);if(route.startsWith('#task'))await owner.locator('.comments .empty').waitFor();await owner.locator(route.startsWith('#task')?'.detail-meta-grid':'.board-task').first().waitFor();for(const viewport of [375,768,1024,1440]){await owner.setViewportSize({width:viewport,height:1000});assert.ok(await owner.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'Long content overflow at '+viewport);await owner.screenshot({path:out+'/'+(route.startsWith('#task')?'detail':'board')+'-'+theme+'-'+viewport+'.png',fullPage:true});}}
  assert.deepEqual(errors,[]);console.log('PASS P4b '+theme+'/'+language+': priority/label/Vietnam deadline persisted; archived assigned label retained on other edits; lost comment response locks editor and avoids duplicate; author-only comments/CAS draft/hard delete; long Task/Board4 widths. Isolated fixtures only.');
}catch(error){if(browser)for(const [i,context]of browser.contexts().entries())for(const page of context.pages()){await page.screenshot({path:out+'/failure-'+i+'.png',fullPage:true});console.log((await page.locator('main').allTextContents()).join(' ').slice(-1500));}throw error;}
finally{if(browser)for(const context of browser.contexts()){for(const page of context.pages())await page.unrouteAll({behavior:'ignoreErrors'});await context.unrouteAll({behavior:'ignoreErrors'});}await browser?.close();if(server)await new Promise(resolve=>server.close(resolve));await mongoose.disconnect();await repl?.stop();}
