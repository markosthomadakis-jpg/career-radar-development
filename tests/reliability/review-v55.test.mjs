// V5.5 regression tests from the independent review. Synthetic profiles only; explicit dates; no network.
// Each test states a product rule, not a snapshot of current output.
import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import vm from 'node:vm';import {createHash} from 'node:crypto';
import {evaluate as baseEvaluate,extractVacancyRequirements,salaryFromText,SECTORS} from '../../worker/engine-v54.mjs';
import {buildIntelligence,sourceUrl,isDocumentationDomain} from '../../worker/intelligence-v1.mjs';
import * as model from '../../worker/calibration-v54.mjs';import * as intelligence from '../../worker/intelligence-v1.mjs';
import worker from '../../dist/server/index.js';
const evaluate=a=>baseEvaluate({...a,preferences:{useInferredCore:true,...a.preferences}});
const D='2026-10-22';
const filler=' The office team provides administrative services to local community organisations across the region.'.repeat(8);
const ids=(text,title='Administrator')=>extractVacancyRequirements(text,title).requirements.map(r=>r.id);
const req=(text,id,title)=>extractVacancyRequirements(text,title).requirements.find(r=>r.id===id);
const full=fs.readFileSync(new URL('../../fixtures/elysium-full-advert-20261022.txt',import.meta.url),'utf8');

// --- Obligations in every section -------------------------------------------------------------
test('screening obligations in About us / employer sections are retained as pre-employment conditions',()=>{
 const x=extractVacancyRequirements('About us\nWe are a regional charity.\nAll candidates will be subject to an enhanced DBS check.\nBenefits\nFree parking.\nThe successful applicant must provide two references.');
 assert.ok(x.requirements.some(r=>r.id==='condition_dbs'&&r.match_mode==='condition'&&r.importance==='essential'));
 assert.ok(x.requirements.some(r=>r.id==='condition_references'));
 assert.equal(x.audit.find(u=>/Free parking/.test(u.source)).disposition,'excluded');
});
test('bare employer slogan about safeguarding is not a candidate condition; staff obligation is',()=>{
 assert.ok(!ids('About us\nWe are committed to safeguarding children.').includes('condition_safeguarding'));
 assert.ok(ids('About us\nWe expect all staff to share this commitment to safeguarding.').includes('condition_safeguarding'));
});
test('full owner-supplied advert keeps the DBS and safeguarding tail, with exact source text',()=>{
 assert.equal(createHash('sha256').update(full).digest('hex'),'bd5968a699944f94aa5c7fb032c3116fb822df0f5c243613b780661f19ade323');
 const x=extractVacancyRequirements(full,'Workforce Administrator/PA');
 const dbs=x.requirements.find(r=>r.id==='condition_dbs'),sg=x.requirements.find(r=>r.id==='condition_safeguarding');
 assert.ok(dbs&&sg);for(const r of [dbs,sg])for(const s of r.sources)assert.ok(full.includes(s.text));
});
test('mixed equal-opportunity sentence cannot hide a candidate obligation',()=>{
 const r=req('Requirements\nWe welcome applications from all backgrounds, but all applicants must hold a full UK driving licence.','driving');
 assert.ok(r);assert.equal(r.importance,'essential');
});
test('conditions never enter the score denominator or the evidence gaps',()=>{
 const base='Responsibilities\nMaintain records.\nPrepare documentation.\nLiaise with customers.\nPrepare reports in Excel.'+filler;
 const p='Maintained records. Prepared documentation. Liaised with customers. Prepared reports in Excel.';
 const a=evaluate({profile:p,vacancy:{title:'Administrator',description:base,description_kind:'full'},evaluationDate:D});
 const b=evaluate({profile:p,vacancy:{title:'Administrator',description:base+'\nAll candidates will be subject to an enhanced DBS check.',description_kind:'full'},evaluationDate:D});
 assert.equal(b.fit_score,a.fit_score);assert.equal(b.pre_employment_conditions.length,1);assert.ok(!b.critical_evidence_gaps.some(g=>g.id.startsWith('condition_')));
});

// --- Distinct semantics for not assessed / no match / absent ----------------------------------
test('items without an automated matcher are "not_assessed" and never claim a CV search',()=>{
 const r=evaluate({profile:'Maintained records. Prepared documentation.',vacancy:{title:'Administrator',description:'Essential criteria\nExcellent time management skills.\nMaintain records.\nPrepare documentation.'+filler,description_kind:'full'},evaluationDate:D});
 const m=r.requirements.find(x=>x.id==='manual_general_skills');
 assert.equal(m.evidence_state,'not_assessed');assert.match(m.evidence_basis,/no CV search was performed/);assert.equal(m.evidence,null);
});
test('automated miss, manual unassessed and self-reported absence are three different states',()=>{
 const v={title:'Administrator',description:'Essential criteria\nAdvanced knowledge of Moodle.\nExcellent time management skills.\nMaintain records.\nPrepare documentation.'+filler,description_kind:'full'};
 const r=evaluate({profile:'Maintained records. Prepared documentation.',vacancy:v,evaluationDate:D,attestations:{manual_general_skills:'no'}});
 assert.equal(r.requirements.find(x=>x.id==='moodle').evidence_state,'no_match_found');
 assert.equal(r.requirements.find(x=>x.id==='manual_general_skills').evidence_state,'absent_self_reported');
 const r2=evaluate({profile:'Maintained records. Prepared documentation.',vacancy:v,evaluationDate:D});
 assert.equal(r2.requirements.find(x=>x.id==='manual_general_skills').evidence_state,'not_assessed');
});
test('unresolved essentials give Investigate with explicit bounds, never a candidate-shortfall message',()=>{
 const p='Maintained records at a fictional office. Prepared documentation. Liaised with customers. Prepared reports in Excel.';
 const v='Responsibilities\nMaintain records.\nPrepare documentation.\nLiaise with customers.\nEssential criteria\nExcellent time management skills.\nSecretarial experience.\nAwareness of confidentiality.\nAbility to work under pressure.'+filler;
 const r=evaluate({profile:p,vacancy:{title:'Administrator',description:v,description_kind:'full'},evaluationDate:D});
 assert.equal(r.decision,'Investigate');assert.ok(r.decision_basis.includes('essential_needs_confirmation'));
 assert.match(r.decision_reason,/at least \d+%, up to \d+%/);assert.doesNotMatch(r.decision_reason,/Too little demonstrated evidence/);
 assert.equal(r.thresholds.essential.required,.75);assert.equal(r.thresholds.non_essential.required,.5);
});
test('weak candidate: Weak score now; once the open essentials are answered "no", the 75% threshold is reported as unreachable',()=>{
 const v={title:'Course Administrator',description:'Responsibilities\nCoordinate course schedules.\nMaintain participant registrations.\nLiaise with instructors and suppliers.\nMaintain Excel reporting.\nPrepare process documentation.'+filler,description_kind:'full'};
 const p='Answered customer telephone queries at a fictional leisure centre. Maintained the reception rota.';
 const r=evaluate({profile:p,vacancy:v,evaluationDate:D});
 assert.notEqual(r.decision,'Not assessable');assert.ok(r.fit_score!==null&&r.fit_score<50);assert.equal(r.band,'Weak');assert.equal(r.decision,'Investigate');
 const open=r.requirements.filter(x=>x.importance==='essential'&&x.evidence_state==='no_match_found').map(x=>x.id);assert.ok(open.length);
 const r2=evaluate({profile:p,vacancy:v,evaluationDate:D,attestations:Object.fromEntries(open.map(id=>[id,'no']))});
 assert.ok(r2.decision_basis.includes('essential_below_threshold'));assert.equal(r2.decision,'Investigate');
});
test('owner rules: essentials ≥75% and non-essentials ≥50% → Apply with tailoring; any essential "no" → Investigate, never Skip',()=>{
 const p='Maintained records at a fictional office. Prepared documentation. Liaised with customers. Prepared reports in Excel.';
 const v={title:'Workforce Administrator/PA',description:full,description_kind:'full',contract_type:'permanent'};
 const base=evaluate({profile:p,vacancy:v,evaluationDate:D});
 const open=base.requirements.filter(x=>x.match_mode!=='condition'&&(x.evidence_state==='not_assessed'||x.evidence_state==='no_match_found')).map(x=>x.id);
 const all=Object.fromEntries(open.map(id=>[id,'have']));
 const yes=evaluate({profile:p,vacancy:v,evaluationDate:D,attestations:all});
 assert.equal(yes.decision,'Apply with tailoring');assert.ok(yes.thresholds.essential.low>=.75);assert.ok(yes.coverage.matching.self_attested_weight>0);
 assert.ok(yes.requirements.filter(x=>x.match_mode==='manual').every(x=>x.evidence===null),'self-confirmation never becomes a CV quote');
 const essentialIds=base.requirements.filter(x=>x.importance==='essential'&&open.includes(x.id)).map(x=>x.id);
 const oneNo=evaluate({profile:p,vacancy:v,evaluationDate:D,attestations:{...all,[essentialIds[0]]:'no'}});
 assert.equal(oneNo.decision,'Investigate');assert.ok(oneNo.decision_basis.includes('essential_absent_self_reported'));assert.notEqual(oneNo.fit_score,null);
 if(oneNo.thresholds.essential.low>=.75)assert.match(oneNo.decision_reason,/threshold is still met/);
 const manyNo=evaluate({profile:p,vacancy:v,evaluationDate:D,attestations:{...all,...Object.fromEntries(essentialIds.map(id=>[id,'no']))}});
 assert.equal(manyNo.decision,'Investigate');assert.ok(manyNo.decision_basis.includes('essential_below_threshold'));assert.ok(manyNo.fit_score<=59);
});
test('non-essential duties must reach 50% of those assessed',()=>{
 const v={title:'Office Administrator',description:'Essential criteria\nMaintain accurate records.\nResponsibilities\nCoordinate the team calendar and schedule meetings.\nLiaise with external suppliers.\nPrepare monthly KPI reports.'+filler,description_kind:'full',contract_type:'permanent'};
 const good=evaluate({profile:'Maintained records. Scheduled meetings for directors. Liaised with suppliers. Prepared KPI reports.',vacancy:v,evaluationDate:D});
 assert.ok(good.thresholds.non_essential.low>=.5);assert.ok(good.decision.startsWith('Apply'));
 const ids=good.requirements.filter(x=>x.importance!=='essential'&&x.match_mode==='automated').map(x=>x.id);
 const bad=evaluate({profile:'Maintained records.',vacancy:v,evaluationDate:D,attestations:Object.fromEntries(ids.map(id=>[id,'no']))});
 assert.ok(bad.decision_basis.includes('nonessential_below_threshold'));assert.equal(bad.decision,'Investigate');
});
test('thresholds are configurable preferences',()=>{
 const r=evaluate({profile:'Maintained records.',vacancy:{title:'Administrator',description:'Essential criteria\nMaintain records.\nPrepare documentation.\nLiaise with customers.'+filler,description_kind:'full'},preferences:{essentialThreshold:.9,nonEssentialThreshold:.6},evaluationDate:D});
 assert.equal(r.thresholds.essential.required,.9);assert.equal(r.thresholds.non_essential.required,.6);
});

// --- Sector / role-family core skills ------------------------------------------------------------
const eduAdvert='About us\nBrightPath is a training provider delivering accredited courses to adult learners.\nResponsibilities\nCoordinate course bookings and timetables.\nMaintain learner registrations.\nPrepare documentation.\nLiaise with customers.'+filler;
test('core skills: education employer + listed course duties become essential, with a visible basis',()=>{
 const r=evaluate({profile:'Maintained records.',vacancy:{title:'Office Administrator',company:'BrightPath',description:eduAdvert,description_kind:'full'},evaluationDate:D});
 assert.equal(r.sector.employer.id,'training_provider');assert.ok(r.sector.evidence.some(e=>/training provider/.test(e.text)));
 const courses=r.requirements.find(x=>x.id==='courses');assert.equal(courses.importance,'essential');assert.equal(courses.core,true);assert.equal(courses.published_importance,'context');assert.match(courses.importance_basis,/employer sector: Training provider/);
 assert.notEqual(r.requirements.find(x=>x.id==='documentation').importance,'essential','generic admin duties are not sector core');
});
test('core skills: education role title in a non-education employer also qualifies',()=>{
 const r=evaluate({profile:'Maintained records.',vacancy:{title:'Learning Operations Coordinator',company:'Fictional Bank',description:'Responsibilities\nCoordinate course bookings.\nMaintain records.\nPrepare documentation.'+filler,description_kind:'full'},evaluationDate:D});
 assert.equal(r.requirements.find(x=>x.id==='courses').core,true);assert.match(r.requirements.find(x=>x.id==='courses').importance_basis,/role title/);
});
test('sector never invents requirements, never overrides "desirable", and unknown sector changes nothing',()=>{
 const neutral={title:'Office Administrator',description:eduAdvert.replace('is a training provider delivering accredited courses to adult learners','is a small local firm'),description_kind:'full'};
 const r0=evaluate({profile:'Maintained records.',vacancy:neutral,evaluationDate:D});
 assert.equal(r0.sector.employer,null);assert.ok(r0.requirements.every(x=>!x.core));
 const r1=evaluate({profile:'Maintained records.',vacancy:{...neutral,description:eduAdvert},evaluationDate:D});
 assert.deepEqual(r1.requirements.map(x=>x.id).sort(),extractVacancyRequirements(eduAdvert,'Office Administrator').requirements.map(x=>x.id).sort());
 const des=evaluate({profile:'Maintained records.',vacancy:{title:'Office Administrator',description:eduAdvert+'\nDesirable\nExperience with workshops is desirable.',description_kind:'full'},evaluationDate:D});
 assert.ok(des.requirements.filter(x=>x.importance==='desirable').every(x=>!x.core));
 const off=evaluate({profile:'Maintained records.',vacancy:{title:'Office Administrator',description:eduAdvert,sector:'none',description_kind:'full'},evaluationDate:D});
 assert.ok(off.requirements.every(x=>!x.core));
});
test('a hospital employer does not turn an admin role into a clinical one',()=>{
 const r=evaluate({profile:'Maintained records.',vacancy:{title:'Workforce Administrator/PA',description:full,description_kind:'full'},evaluationDate:D});
 assert.equal(r.sector.employer.id,'healthcare');
 assert.ok(r.requirements.filter(x=>x.core).every(x=>SECTORS.find(s=>s.id==='healthcare').core.includes(x.id)));
});

// --- Compound requirements, credentials, negation ----------------------------------------------
test('category-level CV quote does not prove attached qualifiers (advanced / VBA / Power Query)',()=>{
 const r=evaluate({profile:'Maintained a shared spreadsheet of contacts.',vacancy:{title:'Analyst Administrator',description:'Essential criteria\nAdvanced Excel including VBA macros and Power Query.\nMaintain records.\nPrepare documentation.'+filler,description_kind:'full'},evaluationDate:D});
 const x=r.requirements.find(q=>q.id==='excel');assert.equal(x.status,'partial');assert.equal(x.evidence_state,'qualifier_unverified');assert.ok(x.unverified_qualifiers.includes('advanced'));
});
test('credential level is compared; lower level is partial, lapsed credential is not evidence',()=>{
 const v=d=>({title:'HR Administrator',description:'Essential criteria\n'+d+'\nMaintain records.\nPrepare documentation.'+filler,description_kind:'full'});
 assert.equal(evaluate({profile:'Completed CIPD Level 3 Foundation Certificate.',vacancy:v('CIPD Level 5 qualification.'),evaluationDate:D}).requirements.find(x=>x.id==='cipd').status,'partial');
 assert.equal(evaluate({profile:'Completed CIPD Level 5 Associate Diploma.',vacancy:v('CIPD Level 5 qualification.'),evaluationDate:D}).requirements.find(x=>x.id==='cipd').status,'demonstrated');
 assert.notEqual(evaluate({profile:'Held a full UK driving licence, currently suspended.',vacancy:v('Full UK driving licence.'),evaluationDate:D}).requirements.find(x=>x.id==='driving').status,'demonstrated');
});
test('vacancy negation and desirable wording are respected',()=>{
 assert.equal(ids('About you\nYou do not need a degree.').length,0);
 assert.equal(req('About you\nExperience of Moodle would be an advantage.','moodle').importance,'desirable');
 assert.ok(!ids('Responsibilities\nThis role has no direct reports.').includes('people'));
 assert.ok(extractVacancyRequirements('We pay above the national minimum wage for administration experience.').requirements.every(r=>r.importance!=='essential'),'"minimum wage" is not an essential criterion');
});
test('CV outcome phrases such as "no backlog" are positive evidence, explicit negation is not',()=>{
 const v={title:'Records Administrator',description:'Essential criteria\nMaintain accurate records.\nPrepare documentation.\nLiaise with customers.'+filler,description_kind:'full'};
 assert.equal(evaluate({profile:'Maintained training records with no backlog for three years.',vacancy:v,evaluationDate:D}).requirements.find(x=>x.id==='records').status,'demonstrated');
 assert.notEqual(evaluate({profile:'Have never maintained records.',vacancy:v,evaluationDate:D}).requirements.find(x=>x.id==='records').status,'demonstrated');
});

// --- Generic overlap must not imply specialist ownership ---------------------------------------
test('generic wording does not create specialist or wrong categories',()=>{
 assert.ok(!ids('Responsibilities\nYou will manage the team diary and meeting rooms.').includes('people'));
 assert.ok(ids('Responsibilities\nYou will manage a team of five administrators.').includes('people'));
 assert.ok(!ids('Responsibilities\nReporting to the Office Manager, you will maintain records.').includes('reporting'));
 assert.ok(!ids('Responsibilities\nAttend weekly meetings and take minutes.').includes('participants'));
 assert.ok(!ids('Responsibilities\nPrepare cots and changing areas for children.','Nursery Assistant').includes('cemetery'));
 assert.ok(ids('Essential criteria\nHolder of COTS.').includes('cemetery'));
 assert.ok(!ids('Responsibilities\nSupport the bid team with tender documentation.').includes('procurement'));
 assert.ok(!ids('Responsibilities\nProcess supplier invoices.','Accounts Payable Clerk').includes('accounting'));
});
test('"Managed the team inbox" and "Reporting to the Director" are not line-management or reporting evidence',()=>{
 const v=d=>({title:'Office Manager',description:'Essential criteria\n'+d+'\nMaintain records.\nPrepare documentation.'+filler,description_kind:'full'});
 assert.notEqual(evaluate({profile:'Managed the team inbox and diary for six directors.',vacancy:v('Line management of four direct reports.'),evaluationDate:D}).requirements.find(x=>x.id==='people').status,'demonstrated');
 assert.notEqual(evaluate({profile:'Reporting to the Director, supported office moves.',vacancy:v('Produce monthly KPI reports and dashboards.'),evaluationDate:D}).requirements.find(x=>x.id==='reporting').status,'demonstrated');
});

// --- Eligibility facts --------------------------------------------------------------------------
test('published salary in advert text is used with its source passage; hourly is not compared with an annual floor',()=>{
 const t=salaryFromText(full);assert.equal(t.min,28000);assert.equal(t.period,'year');assert.ok(full.includes(t.source));
 const r=evaluate({profile:'Maintained records.',vacancy:{title:'Workforce Administrator/PA',description:full,description_kind:'full'},preferences:{salaryFloor:35000},evaluationDate:D});
 const s=r.hard_constraints.find(x=>x.name==='Salary floor');assert.equal(s.status,'not_met');assert.equal(s.origin,'advert_text');assert.match(s.source,/Annual base salary of £28,000/);
 const h=evaluate({profile:'Maintained records.',vacancy:{title:'Administrator',description:'Maintain records.'+filler,salary_min:13.5,salary_max:14},preferences:{salaryFloor:25000},evaluationDate:D});
 assert.equal(h.hard_constraints.find(x=>x.name==='Salary floor').status,'unknown');assert.notEqual(h.decision,'Skip');
 const h2=evaluate({profile:'Maintained records.',vacancy:{title:'Administrator',description:'Maintain records.'+filler,salary_min:13.5,salary_max:14},preferences:{salaryFloor:25000,hoursPerWeek:37.5},evaluationDate:D});
 assert.equal(h2.hard_constraints.find(x=>x.name==='Salary floor').status,'supported');
});
test('weekday-prefixed closing dates are parsed',()=>{
 const r=evaluate({profile:'Maintained records.',vacancy:{title:'Administrator',description:'Maintain records.'+filler,closing_date:'Friday 31 October 2026'},evaluationDate:'2026-11-05'});
 assert.equal(r.hard_constraints.find(x=>x.name==='Closing date').status,'not_met');
});

// --- Provenance / intelligence ------------------------------------------------------------------
test('placeholder and reserved-domain URLs are never accepted as the advert source',()=>{
 assert.equal(sourceUrl('https://employer.example/vacancy'),null);assert.equal(sourceUrl('https://jobs.test/1'),null);
 assert.equal(sourceUrl('https://www.adzuna.co.uk/jobs/details/1'),'https://www.adzuna.co.uk/jobs/details/1');
 assert.equal(isDocumentationDomain('https://example.org/x'),true);
});
test('comparisons use catalogue categories only, flag agency text and skip identical text',()=>{
 const v={title:'Workforce Administrator/PA',company:'Elysium Healthcare',description:full,description_kind:'full'};
 const agency={id:'ag',title:'Warehouse Operative',company:'Bright Staffing Ltd',source_url:'https://jobs.example.co.uk/ag',description_kind:'summary',description:'Bright Staffing is a recruitment agency. We will review your CV and records for compliance checks. Excellent communication skills. Weekly pay through payroll.'};
 const copy={id:'copy',title:'Admin',company:'Other',source_url:'https://jobs.example.co.uk/copy',description:full};
 const i=buildIntelligence({vacancy:v,peers:[agency,copy],evaluationDate:D});
 assert.ok(!i.comparisons.some(c=>c.title==='Warehouse Operative'),'manual facets must not create similarity');
 assert.ok(!i.comparisons.some(c=>c.title==='Admin'),'identical advert text is the same vacancy');
 for(const c of i.comparisons)assert.ok(c.shared.every(s=>!/manual review|verify full condition/.test(s.label)));
});
test('employment-contract wording does not trigger a procurement question',()=>{
 const i=buildIntelligence({vacancy:{title:'Admin',company:'Acme',description:'Permanent contract. Variation to contract paperwork. Maintain records.'},evaluationDate:D});
 assert.ok(!i.questions.some(q=>/procurement/.test(q.question)));
});

// --- UI and server ------------------------------------------------------------------------------
async function renderUi({linked}){
 const elements={};const el=id=>elements[id]??=({value:'',checked:false,textContent:'',innerHTML:'',insertAdjacentHTML(){},addEventListener(){}});
 const selected={id:'sel',title:'Selected Listing',company:'Elysium Healthcare',description:'Short provider summary about payroll.',salary_min:50000,contract_type:'permanent',location:'Crawley',source_url:'https://www.adzuna.co.uk/jobs/details/1',description_kind:'summary'};
 const source=fs.readFileSync(new URL('../../worker/calibration-client.js',import.meta.url),'utf8').replace(/import\(/g,'testImport(');
 new vm.Script(source).runInNewContext({document:{getElementById:el,querySelector:()=>el('anchor'),querySelectorAll:()=>[]},window:{__careerRadarJobs:[selected],addEventListener(){}},testImport:async n=>n.includes('intelligence')?intelligence:model,console});
 Object.assign(el('matchText'),{value:'Maintained records at a fictional office. Prepared documentation. Liaised with customers. Prepared reports in Excel.'});
 Object.assign(el('calDescription'),{value:'Responsibilities\nMaintain records.\nPrepare documentation.\nLiaise with customers.\nEssential criteria\nExcellent time management skills.'+filler});
 Object.assign(el('calJob'),{value:'0'});Object.assign(el('calFull'),{checked:true});Object.assign(el('calLinked'),{checked:linked});el('calSalary').value='40000';el('calMonths').value='6';
 await Promise.resolve();await el('calEvaluate').onclick();el('calClassConfirmed').checked=true;await el('calEvaluate').onclick();return {html:el('calOutput').innerHTML,el};
}
test('UI: an unlinked paste never inherits the selected listing salary or employer; a linked paste says what it reused',async()=>{
 const off=await renderUi({linked:false});assert.match(off.html,/not linked to this paste/);assert.doesNotMatch(off.html,/Source fact — Elysium/);assert.match(off.html,/Salary floor<\/b>: Advertised: unknown/);
 const on=await renderUi({linked:true});assert.match(on.html,/Reused from the selected listing: salary_min/);assert.match(on.html,/Salary floor<\/b>: Advertised: 50000/);
});
test('UI: manual items say no CV search ran and offer a checklist; old misleading wording is gone',async()=>{
 const {html,el}=await renderUi({linked:false});
 assert.match(html,/No automated matcher for this item — your CV was not searched for it/);assert.match(html,/data-attest="manual_general_skills__essential"/);
 assert.doesNotMatch(html,/No direct CV evidence/);assert.doesNotMatch(html,/CV evidence unverified/);
 el('calOutput').onchange({target:{dataset:{attest:'manual_general_skills__essential'},value:'have'}});await new Promise(r=>setTimeout(r,0));
 assert.match(el('calOutput').innerHTML,/Confirmed by you/);
});
test('paid semantic route rejects requests without a same-origin header before any network call',async()=>{
 const env={OPENAI_API_KEY:'test-key-not-real',AI_BILLING_APPROVED:'true'};const real=globalThis.fetch;let called=false;globalThis.fetch=async()=>{called=true;throw Error('no network')};
 try{const r=await worker.fetch(new Request('https://app.invalid/api/ai/match',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({consent:true,cv:'Maintained records for a fictional office. '.repeat(6),job:{title:'Administrator',description:'Maintain records and prepare documentation for a fictional office. '.repeat(3)}})}),env);assert.equal(r.status,403);assert.equal(called,false);}finally{globalThis.fetch=real;}
});
test('source no longer hard-codes a personal name for redaction',()=>{
 assert.doesNotMatch(fs.readFileSync(new URL('../../worker/index.js',import.meta.url),'utf8'),/thomadakis/i);
});
test('determinism: identical inputs give identical output; attestations do not alter CV quotes',()=>{
 const a={profile:'Maintained records. Prepared documentation.',vacancy:{title:'Workforce Administrator/PA',description:full,description_kind:'full'},evaluationDate:D};
 assert.equal(JSON.stringify(evaluate(a)),JSON.stringify(evaluate(a)));
 const q=r=>r.requirements.filter(x=>x.match_mode==='automated').map(x=>[x.id,x.evidence]);
 assert.deepEqual(q(evaluate({...a,attestations:{manual_word:'have'}})),q(evaluate(a)));
});
test('UI: headline shows the 75% / 50% thresholds and CV misses can be confirmed by you',async()=>{
 const {html}=await renderUi({linked:false});
 assert.match(html,/Published essentials met: .*need ≥75%/);assert.match(html,/Desirable: .*need ≥50%/);assert.match(html,/Source checks still open/);
 assert.match(html,/Core skills basis/);
 const noMatch=[...html.matchAll(/No CV match found<\/td><td[^>]*>([\s\S]*?)<\/td><\/tr>/g)];
 for(const m of noMatch)assert.match(m[1],/data-attest=/,'automated misses must offer a confirmation');
});
test('sector detection ignores agency self-description and "bank holidays"',()=>{
 const base='Responsibilities\nMaintain records.\nPrepare documentation.\nLiaise with customers.'+filler;
 assert.equal(evaluate({profile:'x',vacancy:{title:'Office Coordinator',description:base+'\nWe are acting as a recruitment agency for this vacancy.'},evaluationDate:D}).sector.employer,null);
 assert.equal(evaluate({profile:'x',vacancy:{title:'Office Coordinator',description:base+'\n25 days annual leave plus bank holidays.'},evaluationDate:D}).sector.employer,null);
});

// --- Owner target sectors: training providers and corporate L&D ---------------------------------
const tp='About us\nSkillBridge is a training provider delivering accredited courses for employers.\nResponsibilities\nAdminister course bookings in our Totara LMS.\nIssue certificates and manage awarding body registrations.\nCollate delegate feedback and course evaluations.\nLiaise with freelance trainers.\nPrepare documentation.'+filler;
test('training provider: LMS, accreditation, evaluation and trainers are core essentials with visible basis',()=>{
 const r=evaluate({profile:'Maintained records.',vacancy:{title:'Training Administrator',company:'SkillBridge',description:tp,description_kind:'full'},evaluationDate:D});
 assert.equal(r.sector.employer.id,'training_provider');assert.equal(r.sector.role.id,'corporate_ld');
 for(const id of ['lms','accreditation','evaluation','suppliers','courses'])assert.equal(r.requirements.find(x=>x.id===id)?.core,true,id);
 assert.notEqual(r.requirements.find(x=>x.id==='documentation').importance,'essential');
});
test('any LMS in the CV evidences a generic LMS duty; a named Moodle requirement still needs Moodle',()=>{
 const v=d=>({title:'Training Administrator',description:'Responsibilities\n'+d+'\nPrepare documentation.\nLiaise with customers.'+filler,description_kind:'full'});
 assert.equal(evaluate({profile:'Administered course enrolments in Totara LMS.',vacancy:v('Administer the learning management system.'),evaluationDate:D}).requirements.find(x=>x.id==='lms').status,'demonstrated');
 const m=evaluate({profile:'Administered course enrolments in Totara LMS.',vacancy:v('Administer Moodle course enrolments.'),evaluationDate:D});
 assert.equal(m.requirements.find(x=>x.id==='moodle').status,'unknown');assert.ok(!m.requirements.some(x=>x.id==='lms'),'no duplicate generic LMS row for a Moodle-only duty');
});
test('corporate L&D role inside a bank: L&D duties are core, the bank sector adds nothing unlisted',()=>{
 const r=evaluate({profile:'Maintained records.',vacancy:{title:'Learning & Development Coordinator',company:'Fictional Bank plc',description:'About us\nWe are a bank serving retail customers.\nResponsibilities\nCoordinate the mandatory training matrix.\nBook external training providers.\nRun training needs analysis with managers.\nPrepare documentation.'+filler,description_kind:'full'},evaluationDate:D});
 assert.equal(r.sector.role.id,'corporate_ld');
 for(const id of ['compliance_training','suppliers','ld_needs_analysis'])assert.equal(r.requirements.find(x=>x.id===id)?.core,true,id);
 assert.ok(!r.requirements.some(x=>x.id==='accounting'),'finance sector never invents an accounting requirement');
});
test('a university is a school/college/university employer, not a training provider',()=>{
 const r=evaluate({profile:'Maintained records.',vacancy:{title:'Office Administrator',description:'About us\nThe university is a leading higher education institution.\nResponsibilities\nMaintain student timetables.\nPrepare documentation.\nLiaise with customers.'+filler,description_kind:'full'},evaluationDate:D});
 assert.equal(r.sector.employer.id,'education');
});
test('new L&D categories do not fire on generic wording',()=>{
 assert.ok(!ids('Responsibilities\nProvide feedback to the office manager.').includes('evaluation'));
 assert.ok(!ids('Essential criteria\nA valid first aid certificate.').includes('accreditation'));
 assert.ok(!ids('Responsibilities\nUse the canvas bags provided.').includes('lms'));
 assert.ok(ids('Responsibilities\nAdminister courses in Canvas LMS.').includes('lms'));
});

// --- Owner sector table (2026-10-22 14:43): 12 sectors × L&D skills ---------------------------------
import {LD_SKILLS,inferSector} from '../../worker/engine-v54.mjs';
test('every sector from the owner table exists and every referenced skill is defined in the catalogue',()=>{
 const want=['technology','financial_services','healthcare','engineering_energy','construction','retail_hospitality','professional_services','government','education','charity','manufacturing_logistics','pharma'];
 for(const id of want){const s=SECTORS.find(x=>x.id===id);assert.ok(s,id);assert.ok(s.ld.length>=8,id+' has too few L&D skills');}
 const auto=new Set(extractVacancyRequirements('x').requirements.map(x=>x.id));const known=new Set([...LD_SKILLS.filter(x=>x[3]==='auto').map(x=>x[0]),...LD_SKILLS.filter(x=>x[3]==='manual').map(x=>'manual_'+x[0]),'courses','participants','scheduling','suppliers','lms','evaluation','compliance_training','accreditation','cipd','procurement','research','developer','sql','accounting','surveying','housing','manual_confidentiality','manual_recruitment','manual_onboarding','manual_general_skills']);
 for(const s of SECTORS)for(const id of [...s.core,...s.ld])assert.ok(known.has(id),`${s.id}: ${id}`);
});
const ldAd=(about,duties)=>`About us\n${about}\nResponsibilities\n${duties.join('\n')}\nPrepare documentation.`+filler;
test('L&D role at a SaaS company: Articulate, LXP and sales enablement are core; CV evidence is checked',()=>{
 const v={title:'Learning Experience Designer',company:'CloudCo',description:ldAd('CloudCo is a B2B software company.',['Build courses in Articulate 360 and Rise.','Administer the Docebo LXP.','Design sales enablement programmes.']),description_kind:'full'};
 const r=evaluate({profile:'Built compliance courses in Articulate Rise and Storyline. Administered the Docebo LMS for 2,000 users.',vacancy:v,evaluationDate:D});
 assert.equal(r.sector.employer.id,'technology');assert.equal(r.sector.is_ld_role,true);
 for(const id of ['ld_authoring_tools','lms','ld_sales_enablement'])assert.equal(r.requirements.find(x=>x.id===id)?.core,true,id);
 assert.equal(r.requirements.find(x=>x.id==='ld_authoring_tools').status,'demonstrated');assert.equal(r.requirements.find(x=>x.id==='ld_sales_enablement').evidence_state,'no_match_found');
 assert.match(r.requirements.find(x=>x.id==='ld_authoring_tools').importance_basis,/L&D skill for Technology/);
});
test('L&D role in the NHS: ESR and statutory training are core',()=>{
 const r=evaluate({profile:'Maintained records.',vacancy:{title:'Training Coordinator',description:ldAd('We are an NHS trust providing acute hospital services.',['Maintain ESR training records.','Monitor statutory and mandatory training compliance.']),description_kind:'full'},evaluationDate:D});
 assert.equal(r.sector.employer.id,'healthcare');for(const id of ['ld_esr','compliance_training'])assert.equal(r.requirements.find(x=>x.id===id)?.core,true,id);
});
test('sector L&D skills apply only to L&D roles: the same bank duty is not core for an Accounts Assistant',()=>{
 const desc=ldAd('We are a bank serving retail customers.',['Support the evaluation of courses using the Kirkpatrick model.','Process invoices.']);
 const ld=evaluate({profile:'x',vacancy:{title:'Learning Coordinator',description:desc,description_kind:'full'},evaluationDate:D});
 const acc=evaluate({profile:'x',vacancy:{title:'Accounts Assistant',description:desc,description_kind:'full'},evaluationDate:D});
 assert.equal(ld.requirements.find(x=>x.id==='ld_kirkpatrick').core,true);assert.ok(!acc.requirements.find(x=>x.id==='ld_kirkpatrick').core);
});
test('soft skills from the table are confirmation items, never auto-evidenced',()=>{
 const r=evaluate({profile:'Demonstrated emotional intelligence and commercial acumen in client work.',vacancy:{title:'Graduate Academy Coordinator',description:ldAd('We are a law firm.',['Manage the trainee academy.','Coach trainees on emotional intelligence and commercial acumen.']),description_kind:'full'},evaluationDate:D});
 for(const id of ['manual_ld_emotional_intelligence','manual_ld_commercial_acumen']){const x=r.requirements.find(q=>q.id===id);assert.ok(x,id);assert.equal(x.match_mode,'manual');assert.equal(x.evidence_state,'not_assessed');}
 assert.equal(r.sector.employer.id,'professional_services');
});
test('pharma, manufacturing, construction, government and charity are detected from employer text',()=>{
 const det=t=>inferSector({title:'Learning Coordinator',description:'About us\n'+t}).employer?.id;
 assert.equal(det('A global pharmaceutical company.'),'pharma');assert.equal(det('We operate a 24/7 distribution centre.'),'manufacturing_logistics');
 assert.equal(det('A leading construction contractor and housebuilder.'),'construction');assert.equal(det('Crawley Borough Council serves 120,000 residents.'),'government');
 assert.equal(det('We are a registered charity.'),'charity');
});
test('new L&D skills do not fire on generic admin wording',()=>{
 const none=t=>extractVacancyRequirements('Responsibilities\n'+t).requirements.filter(x=>String(x.id).includes('ld_')).map(x=>x.id);
 assert.deepEqual(none('Export the data as a CSV file.'),[]);assert.deepEqual(none('Handle personal data in line with GDPR.'),[]);
 assert.deepEqual(none('We are committed to equality, diversity and inclusion.'),[]);assert.deepEqual(none('Answer the phone and greet visitors.'),[]);
 assert.deepEqual(none('Support the delivery of training administration.'),[]);
});
test('attending training or a noun like "building" is not a performed action',()=>{
 const v={title:'Office Administrator',description:'Essential criteria\nAdvanced use of Excel.\nMaintain records.\nPrepare documentation.'+filler,description_kind:'full'};
 assert.notEqual(evaluate({profile:'Attended training on Excel at the office building.',vacancy:v,evaluationDate:D}).requirements.find(x=>x.id==='excel').status,'demonstrated');
});
test('civil engineering / groundworks company is construction; employer text outweighs candidate-background text',()=>{
 assert.equal(inferSector({title:'Learning Coordinator',description:'About us\nAn established groundworks and civil engineering company.'}).employer.id,'construction');
 const x=extractVacancyRequirements('About us\nWe are a registered charity.\nEssential criteria\nExperience in a law firm or a bank would be helpful.');
 assert.equal(inferSector({title:'Learning Coordinator',description:'About us\nWe are a registered charity.\nEssential criteria\nExperience in a law firm or a bank would be helpful.'},x.audit).employer.id,'charity');
});
