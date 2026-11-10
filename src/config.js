import fs from 'node:fs';
// Small .env loader: existing process environment always wins.
if(fs.existsSync('.env')) for(const line of fs.readFileSync('.env','utf8').split(/\r?\n/)) {
 const m=line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/); if(m && process.env[m[1]]===undefined) process.env[m[1]]=m[2].trim().replace(/^(['"])(.*)\1$/, '$2');
}
export const config={port:Number(process.env.PORT||3000),host:process.env.HOST||'127.0.0.1',dir:process.env.DATA_DIR||'./data',key:process.env.GEMINI_API_KEY||'',model:process.env.GEMINI_MODEL||'gemini-2.5-flash',secure:process.env.COOKIE_SECURE==='true',demo:process.env.DEMO_MODE==='true',origin:process.env.PUBLIC_ORIGIN||`http://localhost:${process.env.PORT||3000}`};
