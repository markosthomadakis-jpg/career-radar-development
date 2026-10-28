import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import vm from 'node:vm';
test('matching mounts dependent DOM synchronously even when engine import is unresolved',()=>{
 const source=fs.readFileSync(new URL('../../src/web/clients/matching.js',import.meta.url),'utf8');let mounted=false;
 const element={value:'',textContent:'',innerHTML:'',files:[],querySelector(){return element;},insertAdjacentHTML(where,html){if(html.includes('id="matching"'))mounted=true;},addEventListener(){},elements:{salary_min:{value:'30000'}}};
 const document={querySelector(){return element;},querySelectorAll(){return [];},getElementById(){return element;}};
 const script=new vm.Script(source,{importModuleDynamically:()=>new Promise(()=>{})});
 script.runInNewContext({document,window:{addEventListener(){},dispatchEvent(){}},localStorage:{getItem(){return null;}},console,URL,Intl,Date});
 assert.equal(mounted,true,'Semantic/calibration scripts need #matching before their deferred execution');
});
test('versioned asset URLs prevent old script cache from restoring broken startup',()=>{
 const html=fs.readFileSync(new URL('../../dist/index.html',import.meta.url),'utf8');
 for(const file of ['clients/matching.js','clients/semantic.js','clients/calibration.js','app.js'])assert.match(html,new RegExp(`src="/${file.replace('.','\\.')}\\?v=\\d+\\.\\d+\\.\\d+"`));
});
