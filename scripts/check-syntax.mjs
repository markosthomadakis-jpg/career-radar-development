// Static release check (AGENTS.md T2): every shipped script parses, and the page carries no inline
// script or inline event handler (required by the Content-Security-Policy).
import {readFileSync,readdirSync} from 'node:fs';
import {join} from 'node:path';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';

const root=fileURLToPath(new URL('..',import.meta.url));
const list=dir=>readdirSync(dir,{withFileTypes:true}).flatMap(e=>e.isDirectory()?list(join(dir,e.name)):[join(dir,e.name)]);
const files=['src','dist/server','scripts','legacy'].flatMap(d=>list(join(root,d))).filter(f=>/\.(m?js)$/.test(f)).sort();
const failures=[];
for(const file of files){
 const run=spawnSync(process.execPath,['--check',file],{encoding:'utf8'});
 if(run.status!==0)failures.push(`${file}: ${run.stderr.split('\n').find(Boolean)}`);
}
for(const page of ['src/web/index.html','dist/index.html']){
 const html=readFileSync(join(root,page),'utf8');
 for(const m of html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi))if(!/\bsrc=/.test(m[1])||m[2].trim())failures.push(`${page}: inline script found`);
 const handler=html.match(/<[^>]+\son[a-z]+\s*=/i);if(handler)failures.push(`${page}: inline event handler ${handler[0].slice(0,60)}`);
}
if(failures.length){console.error(failures.join('\n'));process.exit(1);}
console.log(`Syntax check passed: ${files.length} script files; no inline scripts or handlers.`);
