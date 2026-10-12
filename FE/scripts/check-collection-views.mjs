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
const { createOrganizationService } = await import('../../BE/src/organizations/service.js');
const { createMongoOrganizationStore } = await import('../../BE/src/organizations/mongo-store.js');
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
const out=fileURLToPath(new URL('../../.local/collection-views/',import.meta.url)); await mkdir(out,{recursive:true});
let repl,server,browser,origin; const errors=[];
try {
  repl=await MongoMemoryReplSet.create({binary:{version:'8.0.17',downloadDir:fileURLToPath(new URL('../../.local/mongodb-binaries/',import.meta.url))},instanceOpts:[{launchTimeout:30000}],replSet:{count:1,storageEngine:'wiredTiger',ip:'127.0.0.1'}});
  await mongoose.connect(repl.getUri('workflow_pin_browser_test'));for(const model of Object.values(models))await model.createIndexes();
  const config={...testConfig(),webOrigin:feOrigin,secureCookies:false},password='Web journey fixture password',hash=await hashPassword(password);
  const auth=await createAuthService({store:createMongoAuthStore(),config}),organizations=createOrganizationService({store:createMongoOrganizationStore({config})}),workspaces=createWorkspaceService({store:createMongoWorkspaceStore({config})}),work=createWorkService({store:createMongoWorkStore({config})}),usersService=createUsersService({store:createMongoUsersStore()});
  const cutoff=cutoffCodec(config.accessKeyHex),notificationsService=createNotificationsService({store:createMongoNotificationsStore({cutoff}),cutoff});
  const users=[],auths=[];for(let i=0;i<3;i++){const user=await User.create({email:`journey-${i}@example.com`,displayName:['QA Owner','QA Member','QA Guest'][i],passwordHash:hash,emailVerifiedAt:new Date(),termsAcceptance:{version:'fixture',acceptedAt:new Date()}});users.push(user);auths.push(await auth.authenticate((await auth.login({email:user.email,password})).accessToken));}
  const org=(await organizations.create(auths[0],{name:'QA Studio'})).organization;
  const invite=await organizations.invite(auths[0],org.id,{email:users[1].email});await organizations.acceptInvitationById(auths[1],invite.invitation.id,{});
  const ws=(await organizations.createWorkspace(auths[0],org.id,{name:'QA Workspace'})).workspace;
  await organizations.addMember(auths[0],org.id,ws.id,{expectedVersion:ws.version,userId:users[1].id});
  const app=()=>createApp({authService:auth,authConfig:config,usersService,workspaceService:workspaces,workService:work,organizationService:organizations,notificationsService});
  async function rotate(){const previous=server;server=app().listen(0,'127.0.0.1');await once(server,'listening');origin=`http://127.0.0.1:${server.address().port}`;if(previous)await new Promise(resolve=>previous.close(resolve));}
  await rotate();browser=await chromium.launch({executablePath:process.env.WORKFLOW_BROWSER_EXECUTABLE,headless:true});
  async function pageFor(index){const context=await browser.newContext({viewport:{width,height:1000},colorScheme:theme});await context.route('http://localhost:4000/**',async route=>{const response=await route.fetch({url:route.request().url().replace('http://localhost:4000',origin)});await route.fulfill({response});});const page=await context.newPage();await page.addInitScript(value=>localStorage.setItem('workflow.auth.locale',value),language);await page.addInitScript(value=>localStorage.setItem('workflow.theme',value),theme);page.setDefaultTimeout(15000);page.on('pageerror',error=>errors.push(error.message));page.on('console',message=>{if(message.type()==='error'&&!/status of (401|404)/.test(message.text()))console.log('Browser diagnostic:',message.text().slice(0,1200));});page.on('requestfailed',request=>{if(new URL(request.url()).pathname.startsWith('/src/')||new URL(request.url()).pathname.startsWith('/assets/'))console.log('Asset request failure:',new URL(request.url()).pathname,request.failure()?.errorText);});await page.goto(feOrigin+'/');await page.getByLabel('Email',{exact:true}).fill(users[index].email);await page.getByLabel(ui('Mật khẩu','Password'),{exact:true}).fill(password);await page.getByRole('button',{name:ui('Đăng nhập','Sign in'),exact:true}).click();await page.locator('.studio-home').waitFor();return page;}
  async function navigate(page,name){if(width===375){await page.getByRole('button',{name:ui('Mở menu điều hướng','Open navigation menu'),exact:true}).click();const menu=page.getByRole('dialog',{name:ui('Menu điều hướng','Navigation menu'),exact:true});await menu.getByRole('link',{name,exact:true}).click();await menu.waitFor({state:'hidden'});}else await page.getByRole('link',{name,exact:true}).first().click();}
  const projects=[];for(let i=0;i<3;i++)projects.push((await work.createProject(auths[0],ws.id,{name:'Collection Project '+i})).project);
  await work.createTask(auths[0],projects[0].id,{title:'Assigned view fixture',assigneeId:users[0].id});
  const guestInvite=await work.inviteGuest(auths[0],projects[0].id,{type:'LINK'});await work.acceptGuestInvitation(auths[2],{token:new URLSearchParams(new URL(guestInvite.url).hash.slice(1)).get('token')});
  const owner=await pageFor(0),guest=await pageFor(2);
  let reads=0;owner.on('request',r=>{if(r.url().startsWith('http://localhost:4000/'))reads++;});
  for(const [key,route,selector]of [['home','#home','.home-workspace-card'],['orgs','#organizations','.organization-card'],['org','#organization/'+org.id,'.organization-card'],['workspace','#workspace/'+ws.id,'.project-card'],['mine','#mine','.my-task-row']]){
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
  assert.deepEqual(errors,[]);console.log('PASS M3b '+theme+'/'+language+': six collection/density modes, same items/query, account-local reload, second account defaults, list layouts/5 widths, Guest Shared; fixtures only.');
}catch(error){if(browser)for(const context of browser.contexts())for(const page of context.pages()){await page.screenshot({path:out+'/failure.png',fullPage:true});console.log((await page.locator('main').innerText()).slice(-1000));}throw error;}
finally{await browser?.close();if(server)await new Promise(resolve=>server.close(resolve));await mongoose.disconnect();await repl?.stop();}
