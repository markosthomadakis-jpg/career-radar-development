import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import vm from 'node:vm';
import worker from '../../dist/server/index.js';
const req=p=>new Request('https://offline.example'+p);
test('built app serves exact tested engine bytes and new UI adapter',async()=>{
 const response=await worker.fetch(req('/engine/evaluate.mjs'),{});assert.equal(response.status,200);
 assert.equal(await response.text(),fs.readFileSync(new URL('../../src/engine/evaluate.mjs',import.meta.url),'utf8'));
 const adapter=await (await worker.fetch(req('/engine/browser-adapter.mjs'),{})).text();assert.match(adapter,/from '\.\/evaluate\.mjs'/);
});
test('built frontend scripts parse and active matching no longer uses V4 denominator',async()=>{
 const matching=await (await worker.fetch(req('/clients/matching.js'),{})).text();new vm.Script(matching);assert.match(matching,/engine\.evaluate/);assert.doesNotMatch(matching,/const score=totalWeight/);
 const calibration=await (await worker.fetch(req('/clients/calibration.js'),{})).text();new vm.Script(calibration);assert.match(calibration,/\/engine\/browser-adapter\.mjs/);assert.doesNotMatch(calibration,/calibration-v53\.mjs/);
 const html=await (await worker.fetch(req('/'),{})).text();let n=0;for(const m of html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)){assert.equal(m[2].trim(),'','no inline scripts');const src=m[1].match(/src="([^"?]+)/)?.[1];const r=await worker.fetch(req(src),{});assert.equal(r.status,200,src);new vm.Script(await r.text());n++;}assert.ok(n>=9);
});
test('AI status remains disabled with empty environment; no network required',async()=>{
 const r=await worker.fetch(req('/api/ai/status'),{});assert.equal((await r.json()).enabled,false);
});
