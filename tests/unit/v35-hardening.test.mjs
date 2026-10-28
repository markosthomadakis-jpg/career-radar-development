// Regression tests for the V35 fixes. Synthetic data only; no network.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import worker from '../../dist/server/index.js';
import {evaluate,historyFromRecords,ENGINE_VERSION,MODEL_VERSION} from '../../src/engine/evaluate.mjs';
import {claimUsage,dailyLimit} from '../../src/server/usage-budget.mjs';
import {normalizeGreenhouse,decodeEscapedHtml} from '../../src/vacancies/sources/ats.mjs';
import {RELEASE} from '../../src/version.mjs';
import {fakeD1} from '../helpers/fake-d1.mjs';

const req=(path,init)=>new Request('https://offline.example'+path,init);
const adzunaEnv=extra=>({ADZUNA_APP_ID:'synthetic',ADZUNA_APP_KEY:'synthetic',...extra});
async function withFetch(stub,fn){const previous=globalThis.fetch;globalThis.fetch=stub;try{return await fn();}finally{globalThis.fetch=previous;}}

const cv='Coordinated more than 200 seminars a year for international participants.\nMaintained accurate training records and Excel reports.\nLiaised with instructors, suppliers and participants to schedule courses.\nPrepared programme documentation and governance action logs.';
const advert='Coordinate course schedules and participant registrations. Maintain Excel reporting and accurate records. Liaise with instructors and suppliers. Prepare process documentation and project action logs. Essential: experience coordinating training programmes. '+'The team supports delivery and bookings across the UK. '.repeat(12);
const vacancy={id:'g-77',source_url:'https://boards.greenhouse.io/fictional/jobs/77',title:'Training Coordinator',description:advert,location:'London',contract_type:'permanent',salary_min:36000,closing_date:'2026-11-30'};
const run=history=>evaluate({profile:cv,vacancy,history,preferences:{salaryFloor:35000,minContractMonths:6},evaluationDate:'2026-10-28'});

test('release and engine versions have one source each',()=>{
 assert.equal(RELEASE,JSON.parse(fs.readFileSync('package.json','utf8')).version);
 assert.equal(MODEL_VERSION,ENGINE_VERSION);
 assert.match(fs.readFileSync('dist/index.html','utf8'),new RegExp('RELEASE '+RELEASE.replace(/\./g,'\\.')));
});

test('tracker and Discard-Skip history make a vacancy ineligible; an apply intention does not',()=>{
 assert.notEqual(run([]).decision,'Skip');
 for(const [reviews,jobs] of [[[{vacancy_id:'g-77',human_decision:'skip'}],[]],[[],[{id:'vacancy-g-77',url:vacancy.source_url,status:'Applied'}]],[[],[{id:'manual-1',url:vacancy.source_url,status:'Withdrawn'}]]]){
  const r=run(historyFromRecords(reviews,jobs));
  assert.equal(r.decision,'Skip');assert.equal(r.fit_score,null);assert.ok(r.hard_constraints.some(c=>c.name==='Previous application / exclusion'));
 }
 assert.deepEqual(historyFromRecords([{vacancy_id:'g-77',human_decision:'apply'}],[{id:'vacancy-g-77',url:vacancy.source_url,status:'Saved'}]),[]);
 assert.notEqual(run(historyFromRecords([{vacancy_id:'g-77',human_decision:'apply'}],[])).decision,'Skip');
});

test('search results show the engine decision; no fallback claims Apply',()=>{
 const matching=fs.readFileSync('src/web/clients/matching.js','utf8');
 assert.doesNotMatch(matching,/applicationDecision|decision:'Apply'/);
 assert.match(matching,/decision:'Not assessable'/);
 assert.match(matching,/'Engine assessment: '\+esc\(a\.decision\)/);
 assert.match(matching,/history=applicationHistory\(\)/);
 const calibration=fs.readFileSync('src/web/clients/calibration.js','utf8');
 assert.match(calibration,/decision:originalOutcome\.decision,/);
});

test('PDF.js is pinned with Subresource Integrity and eval disabled',()=>{
 const matching=fs.readFileSync('src/web/clients/matching.js','utf8');
 assert.match(matching,/PDFJS_INTEGRITY='sha384-[A-Za-z0-9+/=]{64}'/);
 assert.match(matching,/s\.integrity=PDFJS_INTEGRITY;s\.crossOrigin='anonymous'/);
 assert.match(matching,/isEvalSupported:false/);
});

test('HTML responses carry an enforcing CSP and security headers; report-only is opt-in',async()=>{
 const page=await worker.fetch(req('/'),{});
 const csp=page.headers.get('content-security-policy');
 assert.match(csp,/script-src 'self' https:\/\/cdnjs\.cloudflare\.com(;|$)/);assert.doesNotMatch(csp,/script-src[^;]*unsafe/);
 assert.match(csp,/frame-ancestors 'none'/);assert.match(csp,/object-src 'none'/);
 assert.equal(page.headers.get('x-content-type-options'),'nosniff');assert.equal(page.headers.get('x-frame-options'),'DENY');
 const reportOnly=await worker.fetch(req('/'),{CSP_MODE:'report-only'});
 assert.equal(reportOnly.headers.get('content-security-policy'),null);assert.ok(reportOnly.headers.get('content-security-policy-report-only'));
 const api=await worker.fetch(req('/api/version'),{});
 assert.equal((await api.json()).release,RELEASE);assert.equal(api.headers.get('x-content-type-options'),'nosniff');
 assert.equal((await worker.fetch(req('/no-such-file.js'),{})).status,404);
});

test('usage budget is atomic per London day and fails closed',async()=>{
 const env={DB:fakeD1(),ADZUNA_DAILY_LIMIT:'2'};const day=new Date('2026-10-28T12:00:00Z');
 assert.deepEqual((await claimUsage(env,'adzuna',day)).allowed,true);
 assert.deepEqual((await claimUsage(env,'adzuna',day)).allowed,true);
 const third=await claimUsage(env,'adzuna',day);assert.equal(third.allowed,false);assert.equal(third.reason,'daily_limit_reached');
 assert.equal((await claimUsage(env,'adzuna',new Date('2026-10-29T12:00:00Z'))).allowed,true,'new London day resets');
 assert.equal((await claimUsage({},'adzuna')).reason,'budget_unavailable');
 assert.equal((await claimUsage({DB:fakeD1(),AI_DAILY_LIMIT:'0'},'openai')).reason,'disabled');
 assert.equal(dailyLimit({AI_DAILY_LIMIT:'abc'},'openai'),10);
});

test('Adzuna route stops at the daily limit without contacting the provider',async()=>{
 let calls=0;const env=adzunaEnv({DB:fakeD1(),ADZUNA_DAILY_LIMIT:'1'});
 await withFetch(async()=>{calls++;return Response.json({count:0,results:[]});},async()=>{
  assert.equal((await worker.fetch(req('/api/jobs?what=admin&where=Crawley'),env)).status,200);
  const limited=await worker.fetch(req('/api/jobs?what=admin&where=Crawley'),env);
  assert.equal(limited.status,429);assert.match((await limited.json()).error,/No external request/);
  assert.equal((await worker.fetch(req('/api/jobs?what=admin&where=Crawley'),adzunaEnv())).status,503,'no database, no call');
  assert.equal((await worker.fetch(req('/api/jobs?what=admin&where=Crawley',{headers:{'sec-fetch-site':'cross-site'}}),adzunaEnv({DB:fakeD1()}))).status,403);
 });
 assert.equal(calls,1);
});

test('AI analysis is bounded by the daily budget after consent and approval',async()=>{
 let calls=0;const env={OPENAI_API_KEY:'synthetic',AI_BILLING_APPROVED:'true',DB:fakeD1(),AI_DAILY_LIMIT:'1'};
 const body=JSON.stringify({consent:true,cv:'Coordinated training schedules and maintained accurate records for many programmes. '.repeat(3),job:{title:'Coordinator',description:'Coordinate training schedules and maintain accurate records. '.repeat(3)}});
 const call=()=>worker.fetch(req('/api/ai/match',{method:'POST',headers:{origin:'https://offline.example','content-type':'application/json'},body}),env);
 await withFetch(async()=>{calls++;return Response.json({model:'synthetic',output:[{content:[{type:'output_text',text:JSON.stringify({overall_assessment:'x',fit_score:50,confidence:'Low',aligned_requirements:[],gaps:[],hard_requirements:[],recommendation:'x'})}]}]});},async()=>{
  assert.equal((await call()).status,200);assert.equal((await call()).status,429);
 });
 assert.equal(calls,1);
});

test('Greenhouse entity-escaped HTML becomes plain advert text',()=>{
 assert.equal(decodeEscapedHtml('&lt;p&gt;A &amp;amp; B&lt;/p&gt;'),'<p>A &amp; B</p>');
 const job=normalizeGreenhouse({id:5,title:'Coordinator',content:'&lt;p&gt;Coordinate &lt;strong&gt;training&lt;/strong&gt; events.&lt;/p&gt;',absolute_url:'https://boards.greenhouse.io/x/jobs/5',location:{name:'London'}},'Acme','x');
 assert.equal(job.description,'Coordinate training events.');
});

test('no owner personal name is hard-coded in shipped or script source',()=>{
 const files=['src','scripts','qa-preview','tests'].flatMap(function walk(d){return fs.readdirSync(d,{withFileTypes:true}).flatMap(e=>e.isDirectory()?walk(d+'/'+e.name):[d+'/'+e.name]);});
 for(const f of files.filter(f=>/\.(m?js|html)$/.test(f)&&!f.endsWith('v35-hardening.test.mjs')))for(const line of fs.readFileSync(f,'utf8').split('\n'))if(!/doesNotMatch/.test(line))assert.doesNotMatch(line,/Thomadakis/i,f);
});

test('build output is deterministic',async()=>{
 const {execFileSync}=await import('node:child_process');
 const snapshot=()=>fs.readFileSync('dist/server/static-assets.mjs','utf8')+fs.readFileSync('dist/index.html','utf8');
 const before=snapshot();execFileSync(process.execPath,['scripts/build.mjs']);assert.equal(snapshot(),before);
});
