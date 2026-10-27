import test from 'node:test';
import assert from 'node:assert/strict';
import {mergeUnifiedVacancies,runUnifiedSearch} from '../../worker/unified-search.mjs';

const vacancy=(provider,id,overrides={})=>({
  requisition_id:'synthetic-shared-requisition',
  id:`${provider}:${id}`,provider,source_id:id,title:'Learning Coordinator',company:'Example Ltd',
  location:'London',source_url:`https://${provider}.example/jobs/${id}`,
  canonical_key:'role:example-ltd:learning-coordinator:london',
  sources:[{provider,source_id:id,url:`https://${provider}.example/jobs/${id}`}],
  source_reliability:{level:provider==='greenhouse'?'high':'medium'},...overrides
});

test('unified search deduplicates providers and retains every source',()=>{
  const [result]=mergeUnifiedVacancies([vacancy('adzuna','1'),vacancy('jobicy','2'),vacancy('greenhouse','3',{description:'Full official advert',full_description:true})]);
  assert.equal(result.provider,'greenhouse');
  assert.deepEqual(result.sources.map(x=>x.provider).sort(),['adzuna','greenhouse','jobicy']);
  assert.equal(result.duplicate_count,3);
});

test('unified search returns partial results and names failed providers',async()=>{
  const calls=[];
  const result=await runUnifiedSearch({
    adzunaUrl:'/api/jobs?q=1',remoteUrl:'/api/sources/remote?q=1',boards:[{platform:'greenhouse',board:'example',employer:'Example Ltd'}],
    fetchJson:async(url)=>{calls.push(url);if(url.includes('/api/jobs'))return {results:[vacancy('adzuna','1')]};if(url.includes('/api/sources/remote'))throw Error('Jobicy unavailable');return {results:[vacancy('greenhouse','3')]};}
  });
  assert.equal(calls.length,3);
  assert.equal(result.results.length,1);
  assert.equal(result.partial,true);
  assert.deepEqual(result.errors.map(x=>x.source),['jobicy']);
  assert.deepEqual(result.sources.sort(),['adzuna','greenhouse']);
});

test('unified search works without configured employer boards',async()=>{
  const result=await runUnifiedSearch({adzunaUrl:'/api/jobs',remoteUrl:'/api/sources/remote',boards:[],fetchJson:async()=>({results:[]})});
  assert.equal(result.results.length,0);
  assert.equal(result.partial,false);
});

test('same provider with different source IDs remains separate',()=>{const results=mergeUnifiedVacancies([vacancy('greenhouse','1',{requisition_id:null}),vacancy('greenhouse','2',{requisition_id:null})]);assert.equal(results.length,2);assert.ok(results.every(item=>item.possible_duplicate_key));});

test('nested provider failures and pagination remain visible',async()=>{const result=await runUnifiedSearch({adzunaUrl:'/api/jobs',remoteUrl:'/api/sources/remote',boards:[],fetchJson:async url=>url.includes('/api/jobs')?{results:[vacancy('adzuna','1')]}:{results:[],partial:true,nextCursors:{jobicy:'next'},errors:[{source:'jobicy',message:'Temporary failure'}]}});assert.equal(result.results.length,1);assert.equal(result.partial,true);assert.equal(result.incomplete,true);assert.equal(result.errors[0].source,'jobicy');});
