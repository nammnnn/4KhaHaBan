// Checks that th.js and en.js have the same keys and placeholders, and that every t('key') used in src exists.
// Run: npm run check:i18n
import th from '../src/i18n/th.js';
import en from '../src/i18n/en.js';
import fs from 'fs'; import path from 'path';
const kt=Object.keys(th), ke=Object.keys(en);
console.log('th keys',kt.length,'en keys',ke.length);
console.log('missing in en:',kt.filter(k=>!(k in en)));
console.log('missing in th:',ke.filter(k=>!(k in th)));
const used=new Set();
const walk=d=>fs.readdirSync(d,{withFileTypes:true}).forEach(e=>{const p=path.join(d,e.name); if(e.isDirectory()) walk(p); else if(/\.(jsx?|mjs)$/.test(e.name)){const s=fs.readFileSync(p,'utf8'); for(const m of s.matchAll(/\bt\(\s*'([a-zA-Z0-9_.]+)'/g)) used.add(m[1]); for(const m of s.matchAll(/\bt\(\s*`([a-zA-Z0-9_.]+)\$\{/g)) used.add(m[1]+'*');}});
walk(new URL('../src', import.meta.url).pathname);
const missing=[...used].filter(k=>!k.endsWith('*') && !(k in th));
console.log('used keys',used.size,'missing from dict:',missing);
// placeholders consistent
for (const k of kt) { if (typeof th[k]!=='string') continue; const a=(th[k].match(/\{\w+\}/g)||[]).sort().join(), b=(String(en[k]).match(/\{\w+\}/g)||[]).sort().join(); if(a!==b) console.log('placeholder mismatch',k,a,'|',b); }
const problems = kt.filter(k=>!(k in en)).length + ke.filter(k=>!(k in th)).length + missing.length;
if (problems) process.exit(1);
