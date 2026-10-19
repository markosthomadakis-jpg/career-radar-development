import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
const source=readFileSync('worker/index.js','utf8');
const html=readFileSync('dist/index.html','utf8');
mkdirSync('dist/server',{recursive:true});mkdirSync('dist/.openai',{recursive:true});
writeFileSync('dist/server/index.js',source.replace('__HTML_LITERAL__',JSON.stringify(html)));
writeFileSync('dist/.openai/hosting.json',readFileSync('.openai/hosting.json'));
console.log('Career Radar V3 Worker built');
