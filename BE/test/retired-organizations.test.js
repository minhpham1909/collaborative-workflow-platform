import {test} from 'node:test';
import assert from 'node:assert/strict';
import {once} from 'node:events';
import {createApp} from '../src/app.js';
test('Runtime rejects Organization routes and scope without calling injected legacy services',async()=>{
 let calls=0;const legacy=new Proxy({}, {get(){calls++;return async()=>({});}});
 const authService={authenticate:async()=>({}),requireVerified(){}};
 const server=createApp({authService,authConfig:{webOrigin:'http://localhost:5173'},organizationService:legacy}).listen(0,'127.0.0.1');await once(server,'listening');
 try{const origin=`http://127.0.0.1:${server.address().port}`;
 for(const path of ['/organizations','/organizations/'+ 'a'.repeat(24)+'/members','/organization-invitations/preview','/moderation/organization/'+ 'a'.repeat(24)+'/bans']){
  const response=await fetch(origin+path,{method:'POST',headers:{Origin:'http://localhost:5173',Authorization:'Bearer fixture','Content-Type':'application/json'},body:'{}'});
  assert.equal(response.status,410);assert.equal((await response.json()).error.code,'ORGANIZATIONS_RETIRED');
 }
 assert.equal(calls,0);assert.equal((await fetch(origin+'/organizations')).status,401);
 assert.equal((await fetch(origin+'/organizations',{headers:{Origin:'https://foreign.example',Authorization:'Bearer fixture'}})).status,403);
 }finally{await new Promise(resolve=>server.close(resolve));}
});
