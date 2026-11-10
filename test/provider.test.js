import test from 'node:test';
import assert from 'node:assert/strict';
import {generate} from '../src/gemini.js';
test('provider wire contract uses server header and only Google Search',async()=>{
 const old=globalThis.fetch;let request;
 globalThis.fetch=async(url,init)=>{request={url,init};return new Response(JSON.stringify({candidates:[{content:{parts:[{text:'A grounded answer.'}]},finishReason:'STOP',groundingMetadata:{groundingChunks:[{web:{title:'Official',uri:'https://example.org'}}],groundingSupports:[{segment:{text:'A grounded answer.'},groundingChunkIndices:[0]}],webSearchQueries:['official pricing']}}],usageMetadata:{totalTokenCount:100}}),{status:200});};
 try{const r=await generate({key:'unit-test-placeholder',model:'gemini-2.5-flash',prompt:'question',signal:new AbortController().signal});const b=JSON.parse(request.init.body);assert.deepEqual(b.tools,[{google_search:{}}]);assert.equal(request.init.headers['x-goog-api-key'],'unit-test-placeholder');assert.ok(!request.url.includes('unit-test-placeholder'));assert.equal(r.text,'A grounded answer. [1]');assert.equal(r.usage.totalTokenCount,100);}finally{globalThis.fetch=old;}
});
test('provider does not leak an upstream error body',async()=>{const old=globalThis.fetch;globalThis.fetch=async()=>new Response('sensitive upstream detail',{status:403});try{await assert.rejects(generate({key:'placeholder',model:'x',prompt:'x',signal:new AbortController().signal}),e=>/permission/.test(e.message)&&!e.message.includes('sensitive'));}finally{globalThis.fetch=old;}});
