import test from 'node:test';
import assert from 'node:assert/strict';
import {Script} from 'node:vm';
import worker from '../../dist/server/index.js';
const u=p=>new Request('https://offline.career-radar.invalid'+p);
test('Jobicy route integrated without losing original app and Adzuna controls',async()=>{
 const html=await (await worker.fetch(u('/'),{})).text();
 assert.match(html,/Adzuna/);assert.match(html,/id="remote"/);assert.match(html,/Fit Calibration/);assert.match(html,/\/clients\/remote\.js/);
 const js=await (await worker.fetch(u('/clients/remote.js'),{})).text();new Script(js);assert.match(js,/Remote jobs/);assert.match(js,/career-radar-results/);
 const err=await worker.fetch(u('/api/sources/remote?tag=a'),{});assert.equal(err.status,400);assert.match(await err.text(),/3.*50/);
 const invalid=await worker.fetch(u('/api/sources/remote/status?id=abc'),{});assert.equal(invalid.status,400);
 const unknown=await worker.fetch(u('/api/sources/remote?provider=unknown'),{});assert.equal(unknown.status,400);
 const ai=await (await worker.fetch(u('/api/ai/status'),{})).json();assert.equal(ai.enabled,false);
});
