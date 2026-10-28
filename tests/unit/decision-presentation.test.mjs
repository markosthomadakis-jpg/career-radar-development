import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import * as engine from '../../src/engine/evaluate.mjs';import {fakeD1} from '../helpers/fake-d1.mjs';
const {publicationWindow}=engine,applicationDecision=engine.applicationDecision;
import {normalizeAdzunaJob} from '../../src/vacancies/adzuna-input.mjs';
import worker from '../../dist/server/index.js';
const anchor='2026-10-23T12:00:00Z';
test('seven day discovery includes now, last 24 hours and exact boundary, excludes older and unknown',()=>{
 for(const created of [anchor,'2026-10-23T11:00:00Z','2026-10-22T18:00:00Z','2026-10-16T12:00:00Z'])assert.equal(publicationWindow(normalizeAdzunaJob({created}),anchor).visible,true);
 for(const created of ['2026-10-16T11:59:59Z','2026-10-23T12:00:01Z',null])assert.equal(publicationWindow(normalizeAdzunaJob({created}),anchor).visible,false);
});
test('discovery requests seven days newest first and preserves provider timestamp',async()=>{
 const previous=globalThis.fetch;let endpoint;
 globalThis.fetch=async url=>{endpoint=new URL(url);return Response.json({count:1,results:[{id:'synthetic',created:anchor}]});};
 try{const r=await worker.fetch(new Request('https://offline.example/api/jobs?what=admin&where=Crawley'),{ADZUNA_APP_ID:'synthetic',ADZUNA_APP_KEY:'synthetic',DB:fakeD1()});assert.equal((await r.json()).results[0].created,anchor);assert.equal(endpoint.searchParams.get('max_days_old'),'7');assert.equal(endpoint.searchParams.get('sort_by'),'date');}finally{globalThis.fetch=previous;}
});
test('original single fields are restored, two human review choices remain, and engine decisions are shown unaltered',()=>{
 const calibration=fs.readFileSync('src/web/clients/calibration.js','utf8');const matching=fs.readFileSync('src/web/clients/matching.js','utf8');
 assert.match(calibration,/id="calDescription"/);assert.doesNotMatch(calibration,/id="calEssential"|id="calExperience"|value="investigate"/);
 assert.match(matching,/id="matchText"/);assert.doesNotMatch(matching,/id="matchCore"|id="matchAdditional"|data-choice="investigate"/);
 assert.equal(applicationDecision,undefined,'engine decisions must not be collapsed to Apply');assert.doesNotMatch(matching,/applicationDecision/);assert.match(matching,/data-choice="apply"/);assert.match(matching,/data-choice="skip"/);
});
