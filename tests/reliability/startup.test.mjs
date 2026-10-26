import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import vm from 'node:vm';import {MODEL_VERSION} from '../../worker/engine-v54.mjs';
test('matching mounts dependent DOM synchronously even when engine import is unresolved',()=>{
 const source=fs.readFileSync(new URL('../../worker/matching-client.js',import.meta.url),'utf8');let mounted=false;
 const element={value:'',textContent:'',innerHTML:'',files:[],querySelector(){return element;},insertAdjacentHTML(where,html){if(html.includes('id="matching"'))mounted=true;},addEventListener(){},elements:{salary_min:{value:'30000'}}};
 const document={querySelector(){return element;},querySelectorAll(){return [];},getElementById(){return element;}};
 const script=new vm.Script(source,{importModuleDynamically:()=>new Promise(()=>{})});
 script.runInNewContext({document,window:{addEventListener(){},dispatchEvent(){}},localStorage:{getItem(){return null;}},console,URL,Intl,Date});
 assert.equal(mounted,true,'Semantic/calibration scripts need #matching before their deferred execution');
});
test('versioned asset URLs prevent old script cache from restoring broken startup',()=>{
 const worker=fs.readFileSync(new URL('../../worker/index.js',import.meta.url),'utf8');
 for(const file of ['matching-client.js','semantic-client.js','calibration-client.js'])assert.ok(worker.includes(`src="/${file}?v=${MODEL_VERSION}"`));
});
