export function ground(candidate){
 const text=(candidate?.content?.parts||[]).map(p=>p.text||'').join('');
 const meta=candidate?.groundingMetadata||{};
 const sources=[],indexMap=new Map();
 for(const [i,c] of (meta.groundingChunks||[]).entries()){
  const w=c.web;if(!w)continue;try{const u=new URL(w.uri);if(!['https:','http:'].includes(u.protocol))continue;}catch{continue;}
  let n=sources.findIndex(s=>s.url===w.uri);if(n<0){n=sources.length;sources.push({id:n+1,title:w.title||'Source',url:w.uri});}indexMap.set(i,n+1);
 }
 const inserts=new Map();let supportedSegments=0;
 for(const support of meta.groundingSupports||[]){
  const ids=[...new Set((support.groundingChunkIndices||[]).map(i=>indexMap.get(i)).filter(Boolean))];
  const segment=support.segment?.text;
  // Use exact returned segment text, avoiding UTF-8 byte vs JS UTF-16 offset bugs.
  if(!segment||!ids.length)continue;
  const start=text.lastIndexOf(segment);if(start<0)continue;const end=start+segment.length;
  inserts.set(end,[...new Set([...(inserts.get(end)||[]),...ids])]);supportedSegments++;
 }
 let answer=text;for(const [offset,ids] of [...inserts].sort((a,b)=>b[0]-a[0]))answer=answer.slice(0,offset)+' '+ids.map(n=>`[${n}]`).join('')+answer.slice(offset);
 return {text:answer,sources,supportedSegments,searchQueries:meta.webSearchQueries||[],searchWidget:meta.searchEntryPoint?.renderedContent||null};
}
