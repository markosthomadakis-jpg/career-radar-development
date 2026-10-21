import test from 'node:test';
import assert from 'node:assert/strict';
import {evaluate,parseClosingDate,ENGINE_VERSION} from '../worker/match.mjs';

const cv=`Managed 225 international seminars per year and coordinated course administration for participants, trainers and suppliers.\nCoordinated 200 training programmes annually and managed scheduling, calendar logistics and participant registrations.\nProduced monthly Excel reports, validated reporting data, improved processes and documented governance decisions.\nSupported stakeholders globally and documented programme delivery milestones.\n`;
const full=(extra='')=>`Essential: Must have proven experience coordinating training programmes and course logistics, including scheduling and calendars.\nEssential: Must have proven stakeholder coordination, participant support and supplier communications.\nDesirable: Excel reporting and data quality experience would be beneficial.\nThe person will coordinate seminar administration across different learners, contribute to the accurate administration of records, monitor programme plans and resolve issues promptly with internal and external stakeholders. This operational coordination position supports an established training team, manages requests from delegates, prepares schedules, documents training workflows and communicates with facilitators. The ideal candidate understands busy training operations, handles multiple course dates, supports registrations and reviews information carefully before publication. You will liaise with different colleagues, maintain accurate documentation, administer enrolment processes, provide useful reporting information, respond to changing participant needs and help the learning team improve delivery. The organisation values clear communication, careful records, cooperative teamwork and practical problem solving. Our working pattern and final employment terms are contained in the separate structured fields that accompany this full advertisement. This paragraph adds responsibilities and operational context rather than introducing undocumented skills. ${extra}`;
const base={title:'Training Operations Coordinator',employer:'Example Training Company',description:full(),salary_min:38000,salary_max:42000,location:'London',contract_type:'permanent',closing_date:'2026-11-15',source_url:'https://example.test/vacancy/1'};
const run=(change={},opts={})=>evaluate({profile:cv,vacancy:{...base,...change},preferences:{salaryFloor:35000,minContractMonths:6},evaluationDate:'2026-10-20',...opts});
const allowed=new Set(['Skip','Not assessable','Stretch','Apply with tailoring','Apply']);

test('T4: engine returns deterministic backward-compatible shape',()=>{
 const one=run(),two=run();assert.deepEqual(one,two);assert.equal(one.engine_version,ENGINE_VERSION);
 assert.ok(allowed.has(one.decision));assert.ok('fit_score' in one);assert.ok(one.screening_evidence.criteria.length>0);
 assert.equal(one.evaluation_date,'2026-10-20');assert.equal(one.eligibility.status,'eligible');
});
test('T6: expired structured date produces Skip with null score',()=>{
 const r=run({closing_date:'2026-10-15'});assert.equal(r.decision,'Skip');assert.equal(r.fit_score,null);assert.equal(r.eligibility.status,'ineligible');
});
test('T6: closing date equal evaluation date still open',()=>{
 const r=run({closing_date:'2026-10-20'});assert.notEqual(r.eligibility.status,'ineligible');
});
test('T6: future dated vacancy is not expired',()=>assert.notEqual(run({closing_date:'2026-10-22'}).decision,'Skip'));
for(const raw of ['15 October 2026','15 Oct 2026','15/10/2026','2026-10-15'])test('T5: parse date '+raw,()=>assert.equal(parseClosingDate(raw),'2026-10-15'));
test('T5: ambiguous date is unknown, never guessed',()=>{
 assert.equal(parseClosingDate('03/04/2026'),null);
 const r=run({closing_date:'03/04/2026'});assert.equal(r.eligibility.status,'unknown');assert.equal(r.confidence.label,'Low');
});
test('T5: invalid date is not silently normalized',()=>assert.equal(parseClosingDate('31 November 2026'),null));
for(const phrase of ['Closing date: 15 October 2026','Apply by 15 Oct 2026','Applications close 15/10/2026','Deadline: 2026-10-15'])test('T6: expiry parsed from text '+phrase,()=>{
 const r=run({closing_date:'',description:full()+'\n'+phrase});assert.equal(r.decision,'Skip');assert.equal(r.fit_score,null);
});
test('T6: salary below floor returns Skip null',()=>{
 const r=run({salary_min:28000,salary_max:32000});assert.equal(r.decision,'Skip');assert.equal(r.fit_score,null);
});
test('T6: missing salary is unknown rather than treated as above floor',()=>{
 const r=run({salary_min:null,salary_max:null});assert.equal(r.eligibility.status,'unknown');assert.equal(r.confidence.label,'Low');assert.notEqual(r.decision,'Apply');
});
test('T6: overlapping salary band is unknown, not falsely rejected',()=>{
 const r=run({salary_min:32000,salary_max:39000});assert.equal(r.eligibility.status,'unknown');assert.notEqual(r.decision,'Skip');
});
test('T6: three-month contract is ineligible, six-month is permitted',()=>{
 const short=run({contract_type:'fixed-term',contract_months:3});const six=run({contract_type:'fixed-term',contract_months:6});
 assert.equal(short.decision,'Skip');assert.equal(short.fit_score,null);assert.notEqual(six.eligibility.status,'ineligible');
});
test('T6: free-text contract is a fallback to missing structured duration',()=>{
 const r=run({contract_type:'fixed-term',contract_months:null,description:full()+'\n3 month FTC role'});assert.equal(r.decision,'Skip');
});
test('T6: a previously withdrawn or applied vacancy is excluded',()=>{
 for(const status of ['Applied','Withdrawn','Rejected','Excluded']){
  const r=run({}, {history:[{title:base.title,employer:base.employer,status}]});assert.equal(r.decision,'Skip');assert.equal(r.fit_score,null);
 }
});
test('T7: a three-line generic advert is not assessable',()=>{
 const r=run({description:'Good team player needed. Excellent communication. Please apply quickly.'});assert.equal(r.fit_score,null);assert.equal(r.decision,'Not assessable');
});
test('T7: incomplete advert cannot obtain Strong or Apply',()=>{
 const r=run({description:'Essential: Must have training coordination experience and scheduling ability.'});assert.equal(r.fit_score,null);assert.notEqual(r.band,'Strong');assert.notEqual(r.decision,'Apply');
});
test('T7: specialist requirement not demonstrated is a critical gap',()=>{
 const r=run({description:full()+'\nEssential: Must hold CIPD Level 5 qualification.'});assert.ok(r.critical_evidence_gaps.length>0);assert.notEqual(r.decision,'Apply');
});
test('T8: Low confidence never produces Apply',()=>{
 const r=run({closing_date:'',salary_min:null,salary_max:null});assert.equal(r.confidence.label,'Low');assert.notEqual(r.decision,'Apply');
});
test('T7: adding specialist essential cannot increase fit',()=>{
 const a=run(),b=run({description:full()+'\nEssential: Must have advanced SQL engineering expertise.'});
 assert.ok(b.fit_score===null||a.fit_score===null||b.fit_score<=a.fit_score);
 assert.notEqual(b.decision,'Apply');
});
test('T7: deleting advert text cannot raise confidence',()=>{
 const fullOne=run(),short=run({description:full().slice(0,120)});
 const rank={Low:0,Medium:1,High:2};assert.ok(rank[short.confidence.label]<=rank[fullOne.confidence.label]);
});
test('T4: no inputs are mutated and invalid evaluation date rejected',()=>{
 const frozenJob=Object.freeze({...base}),frozenPrefs=Object.freeze({salaryFloor:35000,minContractMonths:6});
 evaluate({profile:cv,vacancy:frozenJob,preferences:frozenPrefs,evaluationDate:'2026-10-20'});
 assert.throws(()=>evaluate({profile:cv,vacancy:base,evaluationDate:'bad date'}),/evaluationDate/);
});
