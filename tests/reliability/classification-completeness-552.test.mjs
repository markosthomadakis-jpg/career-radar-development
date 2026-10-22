import test from 'node:test';
import assert from 'node:assert/strict';
import {evaluate,extractVacancyRequirements,vacancyReadiness} from '../../worker/engine-v54.mjs';
import {createFeedbackRecord} from '../../worker/feedback-cycle.mjs';
const date='2026-10-22';
const description=`Location: Crawley\nSalary: £30,000 per annum\nPermanent\nClosing date: 1 November 2026\nResponsibilities\nMaintain records and prepare documentation.\nAbout you\nGood communication skills.\nEssential criteria\nExperience using Excel.\nDesirable criteria\nAdvanced Excel skills preferred.\n${'The role supports administrative delivery across several teams with clear processes and accurate records. '.repeat(5)}`;
const vacancy={title:'Administrator',description,description_kind:'full',full_description:true,source_url:'https://careers.company.co.uk/jobs/123'};
const preferences={requireClassificationReview:true,requireListingCompleteness:true,salaryFloor:25000,minContractMonths:6};
const profile='Prepared Excel reports. Maintained records and documentation. Liaised with customers.';
function reviewed(v=vacancy){const rs=extractVacancyRequirements(v.description,v.title,{strictImportance:true}).requirements;return {...v,requirement_review:{title:v.title,description:v.description,confirmed:true,overrides:Object.fromEntries(rs.filter(r=>r.match_mode!=='condition').map(r=>[r.id,r.importance]))}};}
const run=v=>evaluate({profile,vacancy:v,preferences,evaluationDate:date});
test('generic candidate heading stays unspecified; same Excel category retains essential and desirable separately',()=>{
 const rs=extractVacancyRequirements(description,'Administrator',{strictImportance:true}).requirements;
 assert.equal(rs.find(r=>/communication/i.test(r.source)).importance,'context');
 assert.ok(rs.some(r=>r.catalog_id==='excel'&&r.importance==='essential'));
 assert.ok(rs.some(r=>r.catalog_id==='excel'&&r.importance==='desirable'));
});
test('strict flow suppresses score until complete review; title or source edits invalidate review',()=>{
 assert.equal(run(vacancy).fit_score,null);
 const good=reviewed();assert.equal(run(good).classification_review.confirmed,true);
 assert.equal(run({...good,description:description+'\nNew essential criterion.'}).classification_review.confirmed,false);
 assert.equal(run({...good,title:'Different role'}).fit_score,null);
 const incomplete=reviewed();delete incomplete.requirement_review.overrides[Object.keys(incomplete.requirement_review.overrides)[0]];
 assert.equal(run(incomplete).fit_score,null);
});
test('user correction changes threshold denominator and preserves original classification',()=>{
 const v=reviewed(),key=Object.keys(v.requirement_review.overrides).find(x=>x==='excel__desirable');
 const before=run(v).thresholds.non_essential.weight;v.requirement_review.overrides[key]='essential';const r=run(v),req=r.requirements.find(x=>x.id===key);
 assert.equal(req.importance,'essential');assert.equal(req.published_importance,'desirable');assert.equal(req.classification_origin,'user_review');
 assert.equal(r.thresholds.non_essential.weight,before-1);
});
test('strict source gate excludes missing dates, estimated salaries, broad London and hourly rates without hours',()=>{
 assert.equal(vacancyReadiness(vacancy,date).ready,true);
 for(const [from,to,missing] of [['Closing date: 1 November 2026','','Published closing date'],['Salary: £30,000 per annum','Salary: competitive','Published salary (not an estimate)'],['Location: Crawley','Location: London','Specific workplace location'],['Salary: £30,000 per annum','Salary: £17 per hour','Paid weekly hours']]){
  const v={...vacancy,description:description.replace(from,to)};assert.ok(vacancyReadiness(v,date).missing.includes(missing));assert.equal(run(reviewed(v)).fit_score,null);
 }
 const estimated={...vacancy,description:description.replace('Salary: £30,000 per annum',''),salary_min:30000,salary_is_predicted:true};assert.equal(vacancyReadiness(estimated,date).ready,false);
 assert.ok(vacancyReadiness({...vacancy,closing_date:'2026-10-01'},date).missing.includes('Vacancy closed'));
 assert.equal(vacancyReadiness({...vacancy,description:description.replace('£30,000 per annum','£17 per hour'),hours_per_week:30},date).ready,true);
});
test('feedback export preserves review corrections and source fingerprint without copying CV',async()=>{
 const v=reviewed(),result=run(v),r=await createFeedbackRecord({vacancy:v,result,profileHash:'a'.repeat(64),preferences,humanDecision:'investigate',assessment:'accurate',reason:'requirement_extraction',reviewedAt:date+'T12:00:00Z'});
 assert.deepEqual(r.source.facts.requirement_review,v.requirement_review);assert.match(r.source.sha256,/^[a-f0-9]{64}$/);assert.ok(r.evaluation.requirements.some(x=>x.classification_origin==='user_review'));assert.ok(!JSON.stringify(r).includes(profile));
});
