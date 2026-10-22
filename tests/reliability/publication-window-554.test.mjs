import test from 'node:test';
import assert from 'node:assert/strict';
import {publicationWindow} from '../../worker/engine-v54.mjs';
import {normalizeAdzunaJob} from '../../worker/vacancy-input.mjs';
import worker from '../../dist/server/index.js';
const start='2026-10-22T12:00:00.000Z';
const at=ms=>new Date(Date.parse(start)-ms).toISOString();
test('publication window includes now, last 24 hours and exactly seven days',()=>{
 for(const age of [0,1,3600000,24*3600000-1,24*3600000,7*86400000])assert.equal(publicationWindow({created:at(age)},start).visible,true);
 assert.equal(publicationWindow({created:at(7*86400000+1)},start).visible,false);
 assert.equal(publicationWindow({created:at(-1)},start).visible,false);
});
test('publication comparison respects timezone offsets; missing facts and failed source retrieval do not hide recent jobs',()=>{
 const job={created:'2026-10-22T13:00:00+01:00',salary_min:null,location:'',contract_type:null,closing_date:null,source_verification:{status:'unverified',reason:'source_http_403'}};
 assert.equal(publicationWindow(job,start).visible,true);
 assert.equal(publicationWindow({...job,created:'2026-10-22'},start).visible,false);
 assert.equal(publicationWindow({...job,created:'invalid'},start).visible,false);
});
test('NEW is retained as provider evidence and cannot make an old or future timestamp eligible',()=>{
 const n=normalizeAdzunaJob({id:1,created:at(3600000),is_new:true});assert.equal(n.freshness_badge,'NEW');assert.equal(n.created,at(3600000));assert.equal(publicationWindow(n,start).new_badge,true);
 for(const created of [at(8*86400000),at(-3600000),null])assert.equal(publicationWindow({...n,created},start).visible,false);
 assert.equal(normalizeAdzunaJob({description:'New systems and a new office'}).freshness_badge,null);
});
test('search passes seven-day/date pagination without salary/contract eligibility filters or source retrieval',async()=>{
 const original=globalThis.fetch,calls=[];globalThis.fetch=async u=>{calls.push(new URL(u));return Response.json({count:45,results:[{id:1,created:start,description:'Summary',redirect_url:'https://www.adzuna.co.uk/jobs/details/1'}]});};
 try{const response=await worker.fetch(new Request('https://radar.invalid/api/jobs?what=administrator&where=Crawley&salary_min=35000&page=2'),{ADZUNA_APP_ID:'synthetic-id',ADZUNA_APP_KEY:'synthetic-key'}),data=await response.json();assert.equal(response.status,200);assert.equal(calls.length,1);assert.match(calls[0].pathname,/search\/2$/);assert.equal(calls[0].searchParams.get('max_days_old'),'7');assert.equal(calls[0].searchParams.get('sort_by'),'date');assert.equal(calls[0].searchParams.has('salary_min'),false);assert.equal(calls[0].searchParams.has('permanent'),false);assert.equal(data.results[0].created,start);assert.equal(data.results[0].verification_ticket,undefined);}finally{globalThis.fetch=original;}
});
