const stop=new Set('what when where which about that this have with from them then since today asked last week monday tuesday wednesday thursday friday saturday sunday'.split(' '));
export function tokens(s){return [...new Set(s.toLowerCase().match(/[a-z0-9]+/g)||[])].filter(t=>t.length>2&&!stop.has(t));}
export function localDay(date,tz){return new Intl.DateTimeFormat('en-CA',{timeZone:tz,year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date(date));}
export function validTimezone(tz){try{new Intl.DateTimeFormat('en',{timeZone:tz});return true;}catch{return false;}}
export function targetDay(query,now,tz){
 const today=localDay(now,tz),d=new Date(today+'T12:00:00Z');
 if(/\byesterday\b/i.test(query))d.setUTCDate(d.getUTCDate()-1);
 else if(/\btoday\b/i.test(query))return today;
 else {
  const weekday=query.match(/\b(?:(last|this)\s+)?(sunday|monday|tuesday|wednesday|thursday|friday|saturday)\b/i);
  const explicit=query.match(/\b(\d{4}-\d{2}-\d{2})\b/);
  if(explicit)return explicit[1];
  const named=query.match(/\b(\d{1,2})\s+(January|February|March|April|May|June|July|August|September|October|November|December)(?:\s+(\d{4}))?\b/i);
  if(named){const month=['january','february','march','april','may','june','july','august','september','october','november','december'].indexOf(named[2].toLowerCase())+1;return `${named[3]||d.getUTCFullYear()}-${String(month).padStart(2,'0')}-${named[1].padStart(2,'0')}`;}
  if(!weekday)return null;
  const w=['sunday','monday','tuesday','wednesday','thursday','friday','saturday'].indexOf(weekday[2].toLowerCase());
  let delta=(d.getUTCDay()-w+7)%7;if(delta===0)delta=7;d.setUTCDate(d.getUTCDate()-delta);
 }
 return d.toISOString().slice(0,10);
}
export function retrieve(session,cid,query,now,tz,budget=24000){
 const day=targetDay(query,now,tz),terms=tokens(query);
 const all=session.conversations.flatMap(c=>c.messages.map((m,i)=>({...m,conversationId:c.id,position:i})));
 const scored=all.filter(m=>m.role==='user').map(m=>{const matches=terms.filter(t=>m.text.toLowerCase().includes(t)).length;return {m,score:matches*4+(day&&localDay(m.createdAt,tz)===day?40:0)+(m.conversationId===cid?1:0)};}).filter(x=>x.score>0).sort((a,b)=>b.score-a.score||b.m.createdAt.localeCompare(a.m.createdAt)).slice(0,12);
 const picked=new Map();
 for(const {m} of scored){const c=session.conversations.find(c=>c.id===m.conversationId);for(const adjacent of c.messages.slice(Math.max(0,m.position-1),m.position+3))picked.set(adjacent.id,adjacent);}
 // Pronoun-only cross-conversation follow-ups still need the most recent baseline.
 if(scored.length===0 || /\b(them|those|previous|shortlisted|since then)\b/i.test(query))for(const m of all.slice(-8))picked.set(m.id,m);
 // Always retain immediate conversational context, even without lexical overlap.
 for(const m of (session.conversations.find(c=>c.id===cid)?.messages||[]).slice(-12))picked.set(m.id,m);
 let used=0;const memories=[...picked.values()].sort((a,b)=>a.createdAt.localeCompare(b.createdAt)).filter(m=>{used+=m.text.length;return used<=budget;});
 const matchedDay=day?all.some(m=>m.role==='user'&&localDay(m.createdAt,tz)===day):null;
 return {day,matchedDay,memories,totalMessages:all.length,truncated:used>budget};
}
