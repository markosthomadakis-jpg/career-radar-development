import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
const source=readFileSync('worker/index.js','utf8');
const html=readFileSync('dist/index.html','utf8');
const matching=readFileSync('worker/matching-client.js','utf8');
const semantic=readFileSync('worker/semantic-client.js','utf8');
mkdirSync('dist/server',{recursive:true});mkdirSync('dist/.openai',{recursive:true});
writeFileSync('dist/server/index.js',source.replace('__HTML_LITERAL__',JSON.stringify(html)).replace('__MATCHING_LITERAL__',JSON.stringify(matching)).replace('__SEMANTIC_LITERAL__',JSON.stringify(semantic)));
writeFileSync('dist/.openai/hosting.json',readFileSync('.openai/hosting.json'));
console.log('Career Radar V3 Worker built');
