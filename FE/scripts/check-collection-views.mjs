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
const { createModerationService } = await import('../../BE/src/moderation/service.js');
const { createMongoModerationStore } = await import('../../BE/src/moderation/mongo-store.js');
const { testConfig } = await import('../../BE/test-support/auth-store.js');
const { createUsersService } = await import('../../BE/src/users/service.js');
const { createMongoUsersStore } = await import('../../BE/src/users/mongo-store.js');

const feOrigin=process.env.WORKFLOW_FE_ORIGIN??'http://localhost:5173';assert.ok(/^http:\/\/localhost:(5173|4176)$/.test(feOrigin));
const theme=process.env.WORKFLOW_JOURNEY_THEME==='dark'?'dark':'light';
const language=process.env.WORKFLOW_JOURNEY_LANGUAGE==='en'?'en':'vi';
const width=Number(process.env.WORKFLOW_JOURNEY_WIDTH??1440);assert.ok([375,1440].includes(width));
const ui=(vi,en)=>language==='en'?en:vi;
const out=fileURLToPath(new URL('../../.local/collection-views/',import.meta.url)); await mkdir(out,{recursive:true});
let repl,server,browser,origin; const errors=[];
try {
  repl=await MongoMemoryReplSet.create({binary:{version:'8.0.17',downloadDir:fileURLToPath(new URL('../../.local/mongodb-binaries/',import.meta.url))},instanceOpts:[{launchTimeout:30000}],replSet:{count:1,storageEngine:'wiredTiger',ip:'127.0.0.1'}});
  await mongoose.connect(repl.getUri('workflow_pin_browser_test'));for(const model of Object.values(models))await model.createIndexes();
  const config={...testConfig(),webOrigin:feOrigin,secureCookies:false},password='Web journey fixture password',hash=await hashPassword(password);
  const auth=await createAuthService({store:createMongoAuthStore(),config}),workspaces=createWorkspaceService({store:createMongoWorkspaceStore({config})}),work=createWorkService({store:createMongoWorkStore({config})}),usersService=createUsersService({store:createMongoUsersStore()});
  const cutoff=cutoffCodec(config.accessKeyHex),notificationsService=createNotificationsService({store:createMongoNotificationsStore({cutoff}),cutoff});
  const users=[],auths=[];for(let i=0;i<3;i++){const user=await User.create({email:`journey-${i}@example.com`,displayName:['QA Owner','QA Member','QA Guest'][i],passwordHash:hash,emailVerifiedAt:new Date(),termsAcceptance:{version:'fixture',acceptedAt:new Date()}});users.push(user);auths.push(await auth.authenticate((await auth.login({email:user.email,password})).accessToken));}
  const ws=(await workspaces.create(auths[0],{name:'QA Workspace'})).workspace;
  const invite=await workspaces.invite(auths[0],ws.id,{type:'LINK'});await workspaces.accept(auths[1],{token:new URLSearchParams(new URL(invite.url).hash.slice(1)).get('token')});
  const moderationService=createModerationService({store:createMongoModerationStore({config})});
  const app=()=>createApp({moderationService,authService:auth,authConfig:config,usersService,workspaceService:workspaces,workService:work,notificationsService});
  async function rotate(){const previous=server;server=app().listen(0,'127.0.0.1');await once(server,'listening');origin=`http://127.0.0.1:${server.address().port}`;if(previous)await new Promise(resolve=>previous.close(resolve));}
  await rotate();browser=await chromium.launch({executablePath:process.env.WORKFLOW_BROWSER_EXECUTABLE,headless:true});
  async function pageFor(index){const context=await browser.newContext({viewport:{width,height:1000},colorScheme:theme});await context.route('http://localhost:4000/**',async route=>{const response=await route.fetch({url:route.request().url().replace('http://localhost:4000',origin)});await route.fulfill({response});});const page=await context.newPage();await page.addInitScript(value=>localStorage.setItem('workflow.auth.locale',value),language);await page.addInitScript(value=>localStorage.setItem('workflow.theme',value),theme);page.setDefaultTimeout(15000);page.on('pageerror',error=>errors.push(error.message));page.on('console',message=>{if(message.type()==='error'&&!/status of (401|404)/.test(message.text()))console.log('Browser diagnostic:',message.text().slice(0,1200));});page.on('requestfailed',request=>{if(new URL(request.url()).pathname.startsWith('/src/')||new URL(request.url()).pathname.startsWith('/assets/'))console.log('Asset request failure:',new URL(request.url()).pathname,request.failure()?.errorText);});await page.goto(feOrigin+'/');await page.getByLabel('Email',{exact:true}).fill(users[index].email);await page.getByLabel(ui('Mật khẩu','Password'),{exact:true}).fill(password);await page.getByRole('button',{name:ui('Đăng nhập','Sign in'),exact:true}).click();await page.locator('.studio-home').waitFor();return page;}
  async function navigate(page,name){if(width===375){await page.getByRole('button',{name:ui('Mở menu điều hướng','Open navigation menu'),exact:true}).click();const menu=page.getByRole('dialog',{name:ui('Menu điều hướng','Navigation menu'),exact:true});await menu.getByRole('link',{name,exact:true}).click();await menu.waitFor({state:'hidden'});}else await page.getByRole('link',{name,exact:true}).first().click();}
  const projects=[];for(let i=0;i<3;i++)projects.push((await work.createProject(auths[0],ws.id,{name:'Collection Project '+i})).project);
  const profileTask=(await work.createTask(auths[0],projects[0].id,{title:'Assigned view fixture',assigneeId:users[0].id})).task;
  const guestInvite=await work.inviteGuest(auths[0],projects[0].id,{type:'LINK'});await work.acceptGuestInvitation(auths[2],{token:new URLSearchParams(new URL(guestInvite.url).hash.slice(1)).get('token')});
  await work.createComment(auths[2],profileTask.id,{content:{format:'prosemirror-json',schemaVersion:1,document:{type:'doc',content:[{type:'paragraph',content:[{type:'text',text:'Guest author-only feedback'}]}]}}});
  const owner=await pageFor(0),guest=await pageFor(2);
  // Current Workspace-only Team and associated-person profile, without Organization controls.
  await owner.goto(feOrigin+'/#workspace/'+ws.id);
  await owner.locator('.workspace-tabs').getByRole('button',{name:ui('Thành viên','Member'),exact:true}).click();
  await owner.getByText('QA Member',{exact:true}).first().waitFor();
  assert.equal(await owner.getByRole('button',{name:/Thêm thành viên nội bộ|Add internal member/}).count(),0);
  for(const w of [375,768,1024,1280,1440]){await owner.setViewportSize({width:w,height:1000});assert.ok(await owner.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));await owner.screenshot({path:out+'/workspace-team-'+theme+'-'+language+'-'+w+'.png',fullPage:true});}
  await owner.setViewportSize({width,height:1000});
  await owner.goto(feOrigin+'/#project/'+projects[0].id);
  await owner.locator('.board-project-header').waitFor();
  assert.equal(await owner.locator('.breadcrumbs a[href^="#organization/"]').count(),0);
  await owner.goto(feOrigin+'/#task/'+profileTask.id);
  await owner.locator('.person-profile-trigger').first().click();
  const profile=owner.locator('.person-profile-card:popover-open');await profile.waitFor();
  await profile.getByText('Workspace Owner',{exact:true}).waitFor();
  assert.ok(!/organization|tổ chức/i.test(await profile.innerText()));
  await owner.getByRole('button',{name:ui('Đóng hồ sơ','Close profile'),exact:true}).click();
  await owner.locator('.comment').first().waitFor();
  assert.equal(await owner.locator('.comments').getByRole('button',{name:ui('Xóa bình luận','Delete comment'),exact:true}).count(),0);
  assert.equal(await owner.locator('.comments').getByRole('button',{name:ui('Sửa bình luận','Edit comment'),exact:true}).count(),0);
  await guest.goto(feOrigin+'/#task/'+profileTask.id);await guest.locator('.comment').first().waitFor();
  await guest.locator('.comments').getByRole('button',{name:ui('Xóa bình luận','Delete comment'),exact:true}).click();
  const confirmation=guest.locator('.system-dialog');await confirmation.waitFor();assert.equal(await confirmation.locator('input').count(),0);
  await confirmation.getByRole('button',{name:ui('Hủy','Cancel'),exact:true}).click();assert.equal(await guest.locator('.comment').count(),1);
  const archived=(await work.state(auths[0],projects[0].id,{expectedVersion:0,state:'archived'})).project;
  await guest.reload();await guest.locator('.comment').first().waitFor();
  assert.equal(await guest.locator('.comments').getByRole('button',{name:ui('Xóa bình luận','Delete comment'),exact:true}).count(),0);
  await work.state(auths[0],projects[0].id,{expectedVersion:archived.version,state:'active'});
  await guest.reload();await guest.locator('.comment').first().waitFor();
  await guest.locator('.comments').getByRole('button',{name:ui('Xóa bình luận','Delete comment'),exact:true}).click();
  await confirmation.getByRole('button',{name:ui('Xóa bình luận','Delete comment'),exact:true}).click();
  await guest.locator('.comment').waitFor({state:'detached'});

  let reads=0;owner.on('request',r=>{if(r.url().startsWith('http://localhost:4000/'))reads++;});
  for(const [key,route,selector]of [['home','#home','.home-workspace-card'],['workspace','#workspace/'+ws.id,'.project-card'],['mine','#mine','.my-task-row']]){
   await rotate();await owner.goto(feOrigin+'/'+route);await owner.locator(selector).first().waitFor();await owner.waitForTimeout(400);
   const before=reads,count=await owner.locator(selector).count(),control=owner.locator('.collection-view');
   await control.getByRole('button').nth(1).click();await owner.waitForTimeout(250);assert.equal(await owner.locator(selector).count(),count);assert.equal(reads,before,'View changes network query');
   for(const w of [375,768,1024,1280,1440]){await owner.setViewportSize({width:w,height:1000});assert.ok(await owner.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));await assertReadable(owner,'.collection-view button');await owner.screenshot({path:out+'/'+key+'-'+theme+'-'+language+'-'+w+'.png',fullPage:true});}
   await owner.reload();await owner.locator(selector).first().waitFor();assert.equal(await owner.locator('.collection-view button').nth(1).getAttribute('aria-pressed'),'true');
  }
  await guest.goto(feOrigin+'/#shared');await guest.locator('.project-cards .card').first().waitFor();await guest.locator('.collection-view button').nth(1).click();await guest.waitForTimeout(250);
  for(const w of [375,768,1024,1280,1440]){await guest.setViewportSize({width:w,height:1000});assert.ok(await guest.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));await assertReadable(guest,'.collection-view button,.project-cards .card p');await guest.screenshot({path:out+'/shared-'+theme+'-'+language+'-'+w+'.png',fullPage:true});}
  // Account defaults remain separate despite Owner preferences in another context.
  await guest.goto(feOrigin+'/#home');await guest.locator('.collection-view button').first().waitFor();assert.equal(await guest.locator('.collection-view button').first().getAttribute('aria-pressed'),'true');
  assert.deepEqual(errors,[]);console.log('PASS M3b '+theme+'/'+language+': Workspace-only collection modes, same items/query, account-local reload, second account defaults, list layouts/5 widths, Guest Shared; fixtures only.');
}catch(error){if(browser)for(const context of browser.contexts())for(const page of context.pages()){await page.screenshot({path:out+'/failure.png',fullPage:true});console.log((await page.locator('main').innerText()).slice(-1000));}throw error;}
finally{await browser?.close();if(server)await new Promise(resolve=>server.close(resolve));await mongoose.disconnect();await repl?.stop();}
