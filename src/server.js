import http from 'node:http';
import fs from 'node:fs/promises';
import {randomUUID} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {config} from './config.js';
import {Store} from './store.js';
import {validTimezone} from './memory.js';
import {answer} from './agent.js';
const store=new Store(config.dir);await store.init();
const busy=new Set(),limits=new Map();
const assets=new Map([['/',['index.html','text/html']],['/app.js',['app.js','text/javascript']],['/style.css',['style.css','text/css']]]);
const publicDir=fileURLToPath(new URL('../public/',import.meta.url));
function send(res,status,data){res.writeHead(status,{'content-type':'application/json; charset=utf-8'});res.end(JSON.stringify(data));}
async function body(req){let size=0,chunks=[];for await(const chunk of req){size+=chunk.length;if(size>24000){const e=Error('Request body too large');e.status=413;throw e;}chunks.push(chunk);}try{return JSON.parse(Buffer.concat(chunks).toString());}catch{const e=Error('Invalid JSON');e.status=400;throw e;}}
const server=http.createServer(async(req,res)=>{
 const requestId=randomUUID();res.setHeader('x-request-id',requestId);res.setHeader('x-content-type-options','nosniff');res.setHeader('referrer-policy','no-referrer');res.setHeader('x-frame-options','DENY');res.setHeader('cache-control','no-store');
 res.setHeader('content-security-policy',"default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' https: data:; frame-src 'self' about:; connect-src 'self'; base-uri 'none'; form-action 'self'; frame-ancestors 'none'");
 let release=null;
 try{
  const pathname=new URL(req.url,'http://local').pathname;
  if(pathname==='/api/health'&&req.method==='GET')return send(res,200,{ok:true,configured:Boolean(config.key),demo:config.demo,model:config.model});
  if(assets.has(pathname)&&req.method==='GET'){const [file,mime]=assets.get(pathname);res.writeHead(200,{'content-type':mime+'; charset=utf-8'});return res.end(await fs.readFile(publicDir+file));}
  if(!pathname.startsWith('/api/'))return send(res,404,{error:'Not found'});
  if(!['GET','POST','DELETE'].includes(req.method))return send(res,405,{error:'Method not allowed'});
  if(req.method!=='GET' && req.headers.origin!==config.origin)return send(res,403,{error:'Origin rejected. Open the configured PUBLIC_ORIGIN.'});
  if(req.method==='POST'&&!req.headers['content-type']?.startsWith('application/json'))return send(res,415,{error:'Content-Type must be application/json'});
  const cookie=(req.headers.cookie||'').match(/(?:^|; )recall_sid=([a-f0-9-]{36})(?:;|$)/)?.[1];let sid=cookie;
  if(!sid||!store.session(sid)){
   // Bound anonymous session creation per remote IP, including read requests.
   const key='ip:'+req.socket.remoteAddress;const now=Date.now();const bucket=limits.get(key)||{count:0,until:now+60000};if(now>bucket.until){bucket.count=0;bucket.until=now+60000;}bucket.count++;limits.set(key,bucket);if(bucket.count>30)return send(res,429,{error:'Too many new sessions. Retry in one minute.'});
   sid=await store.createSession();res.setHeader('set-cookie',`recall_sid=${sid}; HttpOnly; SameSite=Strict; Path=/; Max-Age=2592000${config.secure?'; Secure':''}`);
  }
  const session=store.session(sid);
  if(pathname==='/api/conversations'&&req.method==='GET')return send(res,200,{conversations:session.conversations.map(c=>({id:c.id,title:c.title,createdAt:c.createdAt,count:c.messages.length}))});
  if(pathname==='/api/conversations'&&req.method==='POST'){
   if(busy.has(sid))return send(res,409,{error:'Wait for your active answer to finish.'});
   if(session.conversations.length>=100)return send(res,409,{error:'Conversation limit reached. Export and clear history.'});
   return send(res,201,await store.conversation(sid));
  }
  if(pathname==='/api/history'&&req.method==='DELETE'){if(busy.has(sid))return send(res,409,{error:'Wait for your active answer to finish.'});await store.clear(sid);return send(res,200,{ok:true});}
  if(pathname==='/api/export'&&req.method==='GET'){res.setHeader('content-disposition','attachment; filename="recall-history.json"');return send(res,200,session);}
  const match=pathname.match(/^\/api\/conversations\/([a-f0-9-]{36})$/);
  if(match&&req.method==='GET'){const c=session.conversations.find(c=>c.id===match[1]);return send(res,c?200:404,c||{error:'Conversation not found'});}
  if(pathname!=='/api/chat'||req.method!=='POST')return send(res,404,{error:'Not found'});
  if(busy.has(sid))return send(res,409,{error:'An answer is already running. Please wait.'});
  const input=await body(req);
  if(typeof input.text!=='string'||!input.text.trim()||input.text.length>8000)return send(res,400,{error:'Message must contain 1–8000 characters.'});
  if(typeof input.timezone!=='string'||!validTimezone(input.timezone))return send(res,400,{error:'A valid IANA timezone is required.'});
  if(!session.conversations.some(c=>c.id===input.conversationId))return send(res,404,{error:'Conversation not found'});
  if(session.conversations.reduce((n,c)=>n+c.messages.length,0)>=2000)return send(res,409,{error:'History limit reached. Export and clear history.'});
  const now=Date.now();const b=limits.get(sid)||{count:0,until:now+60000};if(now>b.until){b.count=0;b.until=now+60000;}b.count++;limits.set(sid,b);if(b.count>12)return send(res,429,{error:'Rate limit: 12 messages per minute.'});
  busy.add(sid);release=()=>busy.delete(sid);
  const controller=new AbortController();const timeout=setTimeout(()=>controller.abort(),60000);
  res.on('close',()=>{if(!res.writableEnded)controller.abort();});
  res.writeHead(200,{'content-type':'application/x-ndjson; charset=utf-8','x-accel-buffering':'no'});res.flushHeaders();
  const event=(type,data)=>{if(!res.destroyed)res.write(JSON.stringify({type,...data})+'\n');};
  try{const message=await answer({store,sid,cid:input.conversationId,text:input.text.trim(),timezone:input.timezone,config,signal:controller.signal,onProgress:data=>event('progress',data)});event('answer',{message});console.log(JSON.stringify({requestId,event:'answer',elapsedMs:message.audit.elapsedMs,sources:message.sources.length}));}
  catch(e){event('error',{error:e.message||'Unable to answer',requestId});console.error(JSON.stringify({requestId,event:'answer_failed',status:e.status||500}));}
  finally{clearTimeout(timeout);res.end();}
 }catch(e){console.error(JSON.stringify({requestId,event:'request_failed',status:e.status||500}));if(!res.headersSent)send(res,e.status||500,{error:e.status?e.message:'Internal server error',requestId});else res.end();}
 finally{release?.();}
});
const sweep=setInterval(()=>{const now=Date.now();for(const [k,v] of limits)if(v.until<now)limits.delete(k);},60000);sweep.unref();
server.requestTimeout=70000;server.headersTimeout=15000;server.listen(config.port,config.host,()=>console.log(`Recall: ${config.origin} | ${config.demo?'OFFLINE DEMO':config.key?'Gemini configured':'API key missing — see .env.example'}`));
for(const sig of ['SIGINT','SIGTERM'])process.on(sig,()=>{server.close(()=>process.exit(0));setTimeout(()=>process.exit(1),10000).unref();});
