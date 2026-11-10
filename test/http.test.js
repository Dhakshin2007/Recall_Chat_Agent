import test from 'node:test';
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {setTimeout as sleep} from 'node:timers/promises';
test('HTTP lifecycle, ownership, security, streaming and deletion',async t=>{
 const dir=await fs.mkdtemp(path.join(os.tmpdir(),'recall-http-'));
 const port=38000+Math.floor(Math.random()*15000),origin=`http://localhost:${port}`,base=`http://127.0.0.1:${port}`;
 const child=spawn(process.execPath,['src/server.js'],{env:{...process.env,PORT:String(port),HOST:'127.0.0.1',PUBLIC_ORIGIN:origin,DATA_DIR:dir,DEMO_MODE:'true'},stdio:'ignore'});
 try{
  let ready=false;for(let i=0;i<80;i++){try{if((await fetch(base+'/api/health')).ok){ready=true;break;}}catch{}await sleep(50);}assert.equal(ready,true,'server starts');
  let cookie,cid;
  await t.test('health never reveals credentials',async()=>{const r=await fetch(base+'/api/health');const data=await r.json();assert.equal(data.demo,true);assert.equal(data.key,undefined);assert.match(r.headers.get('content-security-policy'),/script-src 'self'/);});
  await t.test('create conversation returns protected session cookie',async()=>{const r=await fetch(base+'/api/conversations',{method:'POST',headers:{origin,'content-type':'application/json'},body:'{}'});assert.equal(r.status,201);const raw=r.headers.get('set-cookie');assert.match(raw,/HttpOnly/);assert.match(raw,/SameSite=Strict/);cookie=raw.split(';')[0];cid=(await r.json()).id;});
  await t.test('cross-origin write is blocked',async()=>{const r=await fetch(base+'/api/conversations',{method:'POST',headers:{cookie,origin:'https://evil.example','content-type':'application/json'},body:'{}'});assert.equal(r.status,403);});
  await t.test('other session cannot read conversation ID',async()=>{const r=await fetch(base+'/api/conversations/'+cid);assert.equal(r.status,404);});
  await t.test('invalid timezone rejected before generation',async()=>{const r=await fetch(base+'/api/chat',{method:'POST',headers:{cookie,origin,'content-type':'application/json'},body:JSON.stringify({conversationId:cid,text:'hello',timezone:'invalid'})});assert.equal(r.status,400);});
  await t.test('chat emits progress and labelled answer events',async()=>{const r=await fetch(base+'/api/chat',{method:'POST',headers:{cookie,origin,'content-type':'application/json'},body:JSON.stringify({conversationId:cid,text:'Hello world',timezone:'Asia/Kolkata'})});assert.equal(r.status,200);assert.match(r.headers.get('content-type'),/ndjson/);const events=(await r.text()).trim().split('\n').map(JSON.parse);assert.equal(events[0].type,'progress');const last=events.at(-1);assert.equal(last.type,'answer');assert.match(last.message.text,/OFFLINE DEMO/);});
  await t.test('history persists successful user-assistant pair and exports',async()=>{const r=await fetch(base+'/api/export',{headers:{cookie}});const data=await r.json();assert.equal(data.conversations[0].messages.length,2);assert.match(r.headers.get('content-disposition'),/attachment/);});
  await t.test('static traversal is not served',async()=>{const r=await fetch(base+'/.env');assert.equal(r.status,404);});
  await t.test('history deletion removes conversations',async()=>{const r=await fetch(base+'/api/history',{method:'DELETE',headers:{cookie,origin}});assert.equal(r.status,200);const data=await(await fetch(base+'/api/conversations',{headers:{cookie}})).json();assert.equal(data.conversations.length,0);});
 }finally{child.kill('SIGTERM');await new Promise(resolve=>{child.once('exit',resolve);setTimeout(()=>{child.kill('SIGKILL');resolve();},1500).unref();});await fs.rm(dir,{recursive:true,force:true});}
});
