// Default isolated preflight. --send-to explicitly enables at most4 real SMTP messages.
// Uses temporary Mongo/API/FE only; never reads the development database or queues.
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {once} from 'node:events';
import {mkdir,writeFile} from 'node:fs/promises';
import {spawn} from 'node:child_process';
import {fileURLToPath} from 'node:url';
const require=createRequire(import.meta.url),{chromium}=require(process.env.WORKFLOW_PLAYWRIGHT_MODULE||'playwright');
const {MongoMemoryReplSet}=await import('../../BE/node_modules/mongodb-memory-server-core/lib/index.js');
const {default:mongoose}=await import('../../BE/node_modules/mongoose/index.js');
const {models,User,WorkspaceMembership,EmailOutbox,AuthToken}=await import('../../BE/src/models/index.js');
const {createApp}=await import('../../BE/src/app.js');
const {createAuthService}=await import('../../BE/src/auth/service.js');
const {createMongoAuthStore}=await import('../../BE/src/auth/mongo-store.js');
const {createUsersService}=await import('../../BE/src/users/service.js');
const {createMongoUsersStore}=await import('../../BE/src/users/mongo-store.js');
const {createAccountsService}=await import('../../BE/src/auth/accounts-service.js');
const {createMongoAccountStore}=await import('../../BE/src/auth/mongo-accounts.js');
const {hashPassword}=await import('../../BE/src/auth/passwords.js');
const {createWorkspaceService}=await import('../../BE/src/workspaces/service.js');
const {createMongoWorkspaceStore}=await import('../../BE/src/workspaces/mongo-store.js');
const {createWorkService}=await import('../../BE/src/work/service.js');
const {createMongoWorkStore}=await import('../../BE/src/work/mongo-store.js');
const {createNotificationsService}=await import('../../BE/src/notifications/service.js');
const {createMongoNotificationsStore}=await import('../../BE/src/notifications/mongo-store.js');
const {cutoffCodec}=await import('../../BE/src/notifications/input.js');
const {testConfig}=await import('../../BE/test-support/auth-store.js');
const {dispatchAuthMail}=await import('../../BE/src/mail/auth-mail.js');
const {dispatchInvitationMail}=await import('../../BE/src/mail/invitation-mail.js');
const {dispatchWorkMail}=await import('../../BE/src/mail/work-mail.js');
const {createMailProvider}=await import('../../BE/src/mail/provider.js');
const args=process.argv.slice(2),live=args.length===2&&args[0]==='--send-to';
if(args.length&&!live)throw new Error('Use no args for preflight or --send-to ONE_EMAIL for4 real emails');
const recipient=live?args[1]:'mail-lifecycle@example.com';
if(!/^[^\s@,;<>]+@[^\s@,;<>]+\.[^\s@,;<>]+$/u.test(recipient))throw new Error('ONE_RECIPIENT_REQUIRED');
if(live&&process.env.EMAIL_MODE!=='smtp')throw new Error('SMTP_MODE_REQUIRED');
const sendProvider=live?createMailProvider():async()=> 'fixture-accepted';
const out=fileURLToPath(new URL('../../.local/mail-lifecycle/',import.meta.url));await mkdir(out,{recursive:true});
const report={startedAt:new Date().toISOString(),liveSmtp:live,devDatabaseAccessed:false,devQueueProcessed:false,checks:[],deliveries:[],inboxConfirmed:false},reportFile=out+Date.now()+'.json';
let repl,server,browser,vite,page;const errors=[],mails=[],webOrigin='http://localhost:5188';
try{
  const {createServer}=await import('node:net');const guard=createServer();await new Promise((resolve,reject)=>{guard.once('error',reject);guard.listen(5188,'localhost',resolve);});await new Promise(resolve=>guard.close(resolve));
  repl=await MongoMemoryReplSet.create({binary:{version:'8.0.17',downloadDir:fileURLToPath(new URL('../../.local/mongodb-binaries/',import.meta.url))},instanceOpts:[{launchTimeout:30000}],replSet:{count:1,storageEngine:'wiredTiger',ip:'127.0.0.1'}});
  await mongoose.connect(repl.getUri('workflow_mail_lifecycle_test'));for(const model of Object.values(models))await model.createIndexes();
  const config={...testConfig(),webOrigin,secureCookies:false,googleClientId:''},password='Fixture mail password 123',nextPassword='Fixture changed password 456';
  const auth=await createAuthService({store:createMongoAuthStore(),config}),accounts=createAccountsService({store:createMongoAccountStore(),config,verifyGoogle:async()=>{throw new Error('NO_GOOGLE_PROVIDER');}}),workspaces=createWorkspaceService({store:createMongoWorkspaceStore({config})}),work=createWorkService({store:createMongoWorkStore({config})});
  const usersService=createUsersService({store:createMongoUsersStore()}),cutoff=cutoffCodec(config.accessKeyHex),notificationsService=createNotificationsService({store:createMongoNotificationsStore({cutoff}),cutoff});
  server=createApp({authService:auth,authConfig:config,accountsService:accounts,usersService,workspaceService:workspaces,workService:work,notificationsService}).listen(0,'localhost');await once(server,'listening');const apiOrigin='http://localhost:'+server.address().port;
  vite=spawn(process.execPath,['node_modules/vite/bin/vite.js','--host','localhost','--port','5188','--strictPort'],{cwd:fileURLToPath(new URL('../',import.meta.url)),windowsHide:true,stdio:'ignore',env:{...process.env,VITE_API_ORIGIN:apiOrigin}});
  const deadline=Date.now()+15000;while(true){if(vite.exitCode!==null)throw new Error('FIXTURE_FE_EXITED');try{if((await fetch(webOrigin)).ok)break;}catch{}if(Date.now()>deadline)throw new Error('FIXTURE_FE_TIMEOUT');await new Promise(resolve=>setTimeout(resolve,100));}
  browser=await chromium.launch({executablePath:process.env.WORKFLOW_BROWSER_EXECUTABLE,headless:true});const context=await browser.newContext({viewport:{width:1440,height:1000}});page=await context.newPage();page.setDefaultTimeout(15000);page.on('pageerror',e=>errors.push(e.message));
  async function send(mail){
    assert.equal(mail.to,recipient);assert.ok(mail.url.startsWith(webOrigin+'/'));assert.ok(mails.length<4);assert.ok(!mails.some(old=>old.eventId===mail.eventId));
    report.deliveries.push({purpose:mail.purpose,state:'attempting',attempt:1});await writeFile(reportFile,JSON.stringify(report,null,2));
    const result=await sendProvider(mail);mails.push(mail);report.deliveries.at(-1).state=live?'smtp_accepted':'fixture_accepted';await writeFile(reportFile,JSON.stringify(report,null,2));return result;
  }
  async function dispatch(fn){assert.equal((await fn({config,send})).state,'sent');assert.equal(await EmailOutbox.countDocuments({state:'sent',encryptedDeliveryData:{$ne:null}}),0);return mails.at(-1);}
  async function http(path,body){const res=await fetch(apiOrigin+path,{method:'POST',headers:{Origin:webOrigin,'Content-Type':'application/json'},body:JSON.stringify(body)});return {status:res.status,data:await res.json()};}
  await page.goto(webOrigin+'/#register');await page.getByLabel('Tên hiển thị',{exact:true}).fill('S12 Email Fixture');await page.getByLabel('Email',{exact:true}).fill(recipient);await page.getByLabel('Mật khẩu mới',{exact:true}).fill(password);await page.getByLabel('Xác nhận mật khẩu',{exact:true}).fill(password);await page.getByRole('checkbox').check();await page.getByRole('button',{name:'Tạo tài khoản thử nghiệm',exact:true}).click();await page.getByText(/Đã tiếp nhận đăng ký/).waitFor();
  const verification=await dispatch(dispatchAuthMail),user=await User.findOne({emailCanonical:recipient});assert.equal(user.emailVerifiedAt,null);
  await page.goto(verification.url);await page.getByRole('button',{name:'Xác minh email',exact:true}).waitFor();assert.ok(!page.url().includes('token='));assert.equal((await User.findById(user.id)).emailVerifiedAt,null);await page.getByRole('button',{name:'Xác minh email',exact:true}).click();await page.getByText('Email từ liên kết đã được xác minh.',{exact:true}).waitFor();
  const verifyToken=new URLSearchParams(new URL(verification.url).hash.slice(1)).get('token');assert.equal((await http('/auth/verify-email',{token:verifyToken})).status,400);report.checks.push('register_verify_scrub_explicit_single_use');
  const oldSession=await auth.login({email:recipient,password});await page.goto(webOrigin+'/#recover');await page.getByLabel('Email',{exact:true}).fill(recipient);await page.getByRole('button',{name:'Yêu cầu khôi phục',exact:true}).click();await page.getByText(/Đã tiếp nhận yêu cầu/).waitFor();const reset=await dispatch(dispatchAuthMail);
  await page.goto(reset.url);await page.getByLabel('Mật khẩu mới',{exact:true}).fill(nextPassword);await page.getByLabel('Xác nhận mật khẩu',{exact:true}).fill(nextPassword);await page.getByRole('button',{name:'Đặt lại mật khẩu',exact:true}).click();await page.getByText(/Đã đặt lại mật khẩu và thu hồi/).waitFor();await assert.rejects(auth.authenticate(oldSession.accessToken));await assert.rejects(auth.login({email:recipient,password}));await auth.login({email:recipient,password:nextPassword});report.checks.push('reset_password_revokes_sessions');
  const owner=await User.create({email:'fixture-owner@example.com',displayName:'S12 Fixture Owner',passwordHash:await hashPassword(password),emailVerifiedAt:new Date(),termsAcceptance:{version:config.termsVersion,acceptedAt:new Date()}}),ownerAuth=await auth.authenticate((await auth.login({email:owner.email,password})).accessToken);
  const ws=(await workspaces.create(ownerAuth,{name:'[S12 TEST] Email workspace'})).workspace;await workspaces.invite(ownerAuth,ws.id,{type:'EMAIL',email:recipient});const invitation=await dispatch(dispatchInvitationMail);
  await page.goto(invitation.url);await page.getByLabel('Email',{exact:true}).fill(recipient);await page.getByLabel('Mật khẩu',{exact:true}).fill(nextPassword);await page.getByRole('button',{name:'Đăng nhập',exact:true}).click();await page.getByRole('button',{name:'Tham gia Workspace',exact:true}).waitFor();assert.ok(!page.url().includes('token='));assert.equal(await WorkspaceMembership.countDocuments({workspaceId:ws.id,userId:user.id,state:'active'}),0);await page.getByRole('button',{name:'Tham gia Workspace',exact:true}).click();await page.waitForURL('**/#workspace/'+ws.id);assert.equal(await WorkspaceMembership.countDocuments({workspaceId:ws.id,userId:user.id,state:'active'}),1);report.checks.push('invitation_login_explicit_accept');
  const project=(await work.createProject(ownerAuth,ws.id,{name:'[S12 TEST] Mail task project'})).project,task=(await work.createTask(ownerAuth,project.id,{title:'[S12 TEST] Kiểm tra link công việc',assigneeId:user.id})).task;
  const assigned=await dispatch(dispatchWorkMail);assert.equal(assigned.url,webOrigin+'/#task/'+task.id);await page.goto(assigned.url);await page.getByRole('heading',{name:task.title,exact:true}).waitFor();await page.screenshot({path:out+'task-link.png'});report.checks.push('assignment_link_opens_correct_task');
  await accounts.requestRecovery({email:recipient});const token=await AuthToken.findOne({userId:user.id,purpose:'reset_password',usedAt:null,revokedAt:null});await AuthToken.collection.updateOne({_id:token._id},{$set:{expiresAt:new Date(Date.now()-1000)}});assert.equal((await dispatchAuthMail({config,send:async()=>{throw new Error('EXPIRED_TOKEN_MUST_NOT_SEND');}})).state,'cancelled');
  const pendingTask=(await work.createTask(ownerAuth,project.id,{title:'[S12 TEST] Cancel on leaving',assigneeId:user.id})).task;assert.ok(pendingTask.id);await WorkspaceMembership.collection.deleteOne({workspaceId:new mongoose.Types.ObjectId(ws.id),userId:user._id});assert.equal((await dispatchWorkMail({config,send:async()=>{throw new Error('LEFT_MEMBER_MUST_NOT_SEND');}})).state,'cancelled');report.checks.push('expired_token_departed_member_cancelled');
  assert.deepEqual(errors,[]);assert.equal(mails.length,4);report.state='passed';report.completedAt=new Date().toISOString();await writeFile(reportFile,JSON.stringify(report,null,2));console.info(JSON.stringify({state:'passed',liveSmtp:live,messages:4,checks:report.checks,inboxConfirmed:false}));
}catch(error){report.state='failed_or_unconfirmed';report.errorType=error?.name??'Error';await writeFile(reportFile,JSON.stringify(report,null,2));console.error('MAIL_LIFECYCLE_FAILED: '+report.checks.join(','));if(page){await page.screenshot({path:out+'failure.png'}).catch(()=>{});console.error((await page.locator('main').innerText().catch(()=>'' )).replaceAll(recipient,'[recipient]').slice(-700));}process.exitCode=1;}
finally{await browser?.close();if(vite){vite.kill();await new Promise(resolve=>{if(vite.exitCode!==null)return resolve();vite.once('exit',resolve);});}if(server)await new Promise(resolve=>server.close(resolve));await mongoose.disconnect();await repl?.stop();}
