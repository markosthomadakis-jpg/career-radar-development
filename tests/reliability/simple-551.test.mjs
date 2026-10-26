import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {publicationWindow,applicationDecision} from '../../worker/engine-v54.mjs';
import {normalizeAdzunaJob} from '../../worker/vacancy-input.mjs';
import worker from '../../dist/server/index.js';
const anchor='2026-10-23T12:00:00Z';
test('seven day discovery includes now, last 24 hours and exact boundary, excludes older and unknown',()=>{
 for(const created of [anchor,'2026-10-23T11:00:00Z','2026-10-22T18:00:00Z','2026-10-16T12:00:00Z'])assert.equal(publicationWindow(normalizeAdzunaJob({created}),anchor).visible,true);
 for(const created of ['2026-10-16T11:59:59Z','2026-10-23T12:00:01Z',null])assert.equal(publicationWindow(normalizeAdzunaJob({created}),anchor).visible,false);
});
test('discovery requests seven days newest first and preserves provider timestamp',async()=>{
 const previous=globalThis.fetch;let endpoint;
 globalThis.fetch=async url=>{endpoint=new URL(url);return Response.json({count:1,results:[{id:'synthetic',created:anchor}]});};
 try{const r=await worker.fetch(new Request('https://offline.example/api/jobs?what=admin&where=Crawley'),{ADZUNA_APP_ID:'synthetic',ADZUNA_APP_KEY:'synthetic'});assert.equal((await r.json()).results[0].created,anchor);assert.equal(endpoint.searchParams.get('max_days_old'),'7');assert.equal(endpoint.searchParams.get('sort_by'),'date');}finally{globalThis.fetch=previous;}
});
test('original single fields are restored and only two review choices remain',()=>{
 const calibration=fs.readFileSync('worker/calibration-client.js','utf8');const matching=fs.readFileSync('worker/matching-client.js','utf8');
 assert.match(calibration,/id="calDescription"/);assert.doesNotMatch(calibration,/id="calEssential"|id="calExperience"|value="investigate"/);
 assert.match(matching,/id="matchText"/);assert.doesNotMatch(matching,/id="matchCore"|id="matchAdditional"|data-choice="investigate"/);
 for(const d of ['Apply','Apply with tailoring','Investigate','Not assessable'])assert.equal(applicationDecision(d),'Apply');assert.equal(applicationDecision('Skip'),'Discard-Skip');
});
