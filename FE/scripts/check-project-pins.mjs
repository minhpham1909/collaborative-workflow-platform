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
const { createOrganizationService } = await import('../../BE/test-support/organizations/service.js');
const { createMongoOrganizationStore } = await import('../../BE/test-support/organizations/mongo-store.js');
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
const out=fileURLToPath(new URL('../../.local/project-pins/',import.meta.url)); await mkdir(out,{recursive:true});
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
  const projects=[];for(let i=0;i<7;i++)projects.push((await work.createProject(auths[0],ws.id,{name:'M2 Project '+i})).project);
  const owner=await pageFor(0);await owner.goto(feOrigin+'/#workspace/'+ws.id);
  const mark=owner.locator('.project-card').filter({hasText:projects[0].name}).getByRole('button',{name:ui('Ghim Dự án','Pin project'),exact:true});await mark.waitFor();const target=await mark.boundingBox();assert.ok(target.width>=44&&target.height>=44,'Pin card hit target');await mark.click();
  await owner.locator('.app-sidebar .project-pins-nav a').first().waitFor({state:'attached'});
  assert.equal((await work.pins(auths[0],{})).items.length,1);assert.equal((await work.pins(auths[1],{})).items.length,0);
  await owner.reload();await owner.locator('.project-card').filter({hasText:projects[0].name}).getByRole('button',{name:ui('Bỏ ghim','Unpin'),exact:true}).waitFor();
  async function side(page){if(width===375){await page.getByRole('button',{name:ui('Mở menu điều hướng','Open navigation menu'),exact:true}).click();return page.locator('.mobile-sidebar .project-pins-nav');}return page.locator('.app-sidebar .project-pins-nav');}
  let nav=await side(owner);await nav.getByRole('link').first().click();await owner.waitForURL('**/#project/'+projects[0].id);await owner.locator('.board').waitFor();
  await owner.locator('.board-project-header').getByRole('button',{name:ui('Bỏ ghim','Unpin'),exact:true}).click();
  await owner.locator('.board-project-header').getByRole('button',{name:ui('Ghim Dự án','Pin project'),exact:true}).waitFor();assert.equal((await work.pins(auths[0],{})).items.length,0);
  // Response loss commits once, locks further action, and recovers by readback.
  let writes=0;await owner.context().route('**/projects/'+projects[0].id+'/pin',async route=>{writes++;await route.fetch({url:route.request().url().replace('http://localhost:4000',origin)});await route.abort();});
  await owner.locator('.board-project-header').getByRole('button',{name:ui('Ghim Dự án','Pin project'),exact:true}).click();
  await owner.locator('.project-pin-action [role=alert]').waitFor();assert.equal(writes,1);assert.equal((await work.pins(auths[0],{})).items.length,1);
  await owner.context().unroute('**/projects/'+projects[0].id+'/pin');nav=await side(owner);await nav.getByRole('button',{name:ui('Thử lại','Retry'),exact:true}).click();await nav.getByRole('link').first().waitFor();await owner.locator('.project-pin-action [role=alert]').waitFor({state:'hidden'});if(width===375)await owner.getByRole('button',{name:ui('Đóng menu điều hướng','Close navigation menu'),exact:true}).click();
  for(const project of projects.slice(1,7))await work.setPin(auths[0],project.id,{pinned:true});
  await owner.goto(feOrigin+'/#home');nav=await side(owner);await nav.getByRole('button',{name:ui('Xem thêm','Show more'),exact:true}).waitFor();assert.equal(await nav.getByRole('link').count(),5);await nav.getByRole('button',{name:ui('Xem thêm','Show more'),exact:true}).click();assert.equal(await nav.getByRole('link').count(),7);
  await assertReadable(owner,width===375?'.mobile-sidebar .project-pins-nav strong,.mobile-sidebar .project-pins-nav small':'.app-sidebar .project-pins-nav strong,.app-sidebar .project-pins-nav small');
  await owner.screenshot({path:out+'/pins-'+theme+'-'+language+'-'+width+'.png',fullPage:true});
  if(width===375)await owner.getByRole('button',{name:ui('Đóng menu điều hướng','Close navigation menu'),exact:true}).click();
  const guestInvite=await work.inviteGuest(auths[0],projects[0].id,{type:'LINK'});const token=new URLSearchParams(new URL(guestInvite.url).hash.slice(1)).get('token');await work.acceptGuestInvitation(auths[2],{token});
  const guest=await pageFor(2);await guest.goto(feOrigin+'/#shared');await guest.locator('.project-cards .card').first().getByRole('button',{name:ui('Ghim Dự án','Pin project'),exact:true}).click();
  await guest.locator('.project-cards .card').first().getByRole('button',{name:ui('Bỏ ghim','Unpin'),exact:true}).waitFor();const latest=(await work.getProject(auths[0],projects[0].id)).project;await work.state(auths[0],latest.id,{expectedVersion:latest.version,state:'archived'});
  await guest.goto(feOrigin+'/#project/'+projects[0].id);await guest.locator('.board-project-header').getByRole('button',{name:ui('Bỏ ghim','Unpin'),exact:true}).waitFor();nav=await side(guest);await nav.getByText(new RegExp(ui('Chỉ đọc','Read only'))).waitFor();if(width===375)await guest.getByRole('button',{name:ui('Đóng menu điều hướng','Close navigation menu'),exact:true}).click();
  const {ProjectGuest}=await import('../../BE/src/models/index.js');await ProjectGuest.collection.updateOne({projectId:new mongoose.Types.ObjectId(projects[0].id),userId:users[2]._id},{$set:{state:'inactive',revokedAt:new Date()}});
  await guest.goto(feOrigin+'/#home');nav=await side(guest);await nav.getByText(ui('Dự án không còn truy cập','Project unavailable'),{exact:true}).waitFor();assert.equal(await nav.getByRole('link').count(),0);assert.ok(!(await nav.innerText()).includes(projects[0].name));await nav.getByRole('button',{name:ui('Bỏ ghim','Unpin'),exact:true}).click();await nav.getByText(ui('Chưa có Dự án đã ghim.','No pinned projects yet.'),{exact:true}).waitFor();assert.equal((await work.pins(auths[2],{})).items.length,0);
  assert.deepEqual(errors,[]);console.log('PASS M2 pins '+theme+'/'+language+'/'+width+': card/header pin, reload/sidebar Kanban, account isolation, lost-response readback, bounded expansion, Guest Archive/revoke/redaction/unpin; isolated DB/API, no providers/dev data.');
} catch(error){if(browser)for(const context of browser.contexts())for(const page of context.pages()){await page.screenshot({path:out+'/failure.png',fullPage:true});console.log((await page.locator('body').innerText()).slice(-900));}throw error;}
finally{await browser?.close();if(server)await new Promise(resolve=>server.close(resolve));await mongoose.disconnect();await repl?.stop();}
