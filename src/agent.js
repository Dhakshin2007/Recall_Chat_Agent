import {randomUUID} from 'node:crypto';
import {retrieve} from './memory.js';
import {generate} from './gemini.js';
export async function answer({store,sid,cid,text,timezone,config,signal,onProgress=()=>{}}){
 const now=new Date().toISOString();onProgress({stage:'memory',message:'Retrieving dated conversation evidence'});
 const context=retrieve(store.session(sid),cid,text,now,timezone);
 const memory=context.memories.map(m=>({id:m.id,role:m.role,at:m.createdAt,text:m.text,sources:m.sources||[]}));
 const prompt=JSON.stringify({currentDate:now,timezone,resolvedDay:context.day,matchedDay:context.matchedDay,memoryScope:'This browser session, all conversations; selected excerpts only',historyTruncated:context.truncated,memories:memory,question:text});
 onProgress({stage:'research',message:config.demo?'Offline demo — no web search':'Gemini is answering; Google Search is available when needed'});
 const started=Date.now();
 const result=config.demo?{text:'OFFLINE DEMO — not a researched answer.\n\nYour message: '+text+'\n\n'+(context.memories.length?`Retrieved ${context.memories.length} historical messages. `:'No relevant historical messages were found. ')+(context.day?`Interpreted date: ${context.day}. `:'')+'Configure GEMINI_API_KEY and disable DEMO_MODE to get a real web-grounded answer.',sources:[],searchQueries:[],supportedSegments:0,searchWidget:null,usage:{},finishReason:'DEMO'}:await generate({key:config.key,model:config.model,prompt,signal});
 const audit={requestId:randomUUID(),model:config.demo?'offline-demo':config.model,elapsedMs:Date.now()-started,timezone,resolvedDay:context.day,memoryIds:memory.map(m=>m.id),memoryCount:memory.length,historyTruncated:context.truncated,searchQueries:result.searchQueries,sourceCount:result.sources.length,supportedSegments:result.supportedSegments,finishReason:result.finishReason,usage:result.usage};
 const user={id:randomUUID(),role:'user',text,createdAt:now};const assistant={id:randomUUID(),role:'assistant',text:result.text,createdAt:new Date().toISOString(),sources:result.sources,searchWidget:result.searchWidget,audit};
 // Commit the pair only after a successful response: failed requests are safely retryable.
 await store.append(sid,cid,[user,assistant]);return assistant;
}
