import fs from 'node:fs/promises';
import path from 'node:path';
import {randomUUID} from 'node:crypto';
export class Store {
 constructor(dir){this.dir=dir;this.tail=Promise.resolve();this.state={version:1,sessions:{}};}
 async init(){await fs.mkdir(this.dir,{recursive:true,mode:0o700});try{this.state=JSON.parse(await fs.readFile(path.join(this.dir,'store.json'),'utf8'));if(this.state.version!==1)throw Error('Unsupported database version');}catch(e){if(e.code!=='ENOENT')throw e;}}
 session(id){return this.state.sessions[id]||null;}
 async transaction(fn){const work=this.tail.then(async()=>{const draft=structuredClone(this.state);const result=fn(draft);const temp=path.join(this.dir,'store.tmp');await fs.writeFile(temp,JSON.stringify(draft),{mode:0o600});await fs.rename(temp,path.join(this.dir,'store.json'));this.state=draft;return result;});this.tail=work.catch(()=>{});return work;}
 async createSession(){const id=randomUUID();await this.transaction(s=>{s.sessions[id]={createdAt:new Date().toISOString(),conversations:[]};});return id;}
 async conversation(sid,title='New conversation'){const c={id:randomUUID(),title:title.slice(0,80),createdAt:new Date().toISOString(),messages:[]};await this.transaction(s=>s.sessions[sid].conversations.push(c));return c;}
 async append(sid,cid,messages){await this.transaction(s=>{const c=s.sessions[sid]?.conversations.find(c=>c.id===cid);if(!c)throw Error('Conversation not found');c.messages.push(...messages);if(c.title==='New conversation')c.title=messages.find(m=>m.role==='user')?.text.slice(0,70)||c.title;});}
 async clear(sid){await this.transaction(s=>{s.sessions[sid].conversations=[];});}
}
