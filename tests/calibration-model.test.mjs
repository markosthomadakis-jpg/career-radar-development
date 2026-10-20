import test from 'node:test';
import assert from 'node:assert/strict';
import {evaluateVacancy,extractCandidateEvidence,extractJobRequirements} from '../worker/calibration-model.mjs';

const cv='Coordinated global learning operations and delivered 200 seminars annually. Managed instructor schedules and participant registrations. Developed Excel reports and reconciled operational data.';
const evaluate=(text,resume=cv,extras={})=>evaluateVacancy(resume,{title:'Learning Coordinator',description:text,...extras},{salaryFloor:35000,minContractMonths:6});

test('semantically related, evidenced scheduling counts as direct evidence',()=>{
  const r=evaluate('Essential experience in training programmes and instructor scheduling, plus participant registrations and Excel reporting.');
  assert.ok(r.fit_score>=70);
  assert.equal(r.requirements.find(x=>x.id==='scheduling').status,'supported');
});
test('keywords in a CV skills-only list do not receive full strength',()=>{
  const r=evaluate('Required Excel reporting and learning operations.', 'Skills: Excel, learning operations, reporting.');
  assert.ok(r.fit_score<50);
  assert.ok(r.requirements.some(x=>x.status==='limited_evidence'));
});
test('unmentioned LMS remains unknown, not explicitly failed',()=>{
  const r=evaluate('Essential learning operations experience. LMS experience is desirable.');
  assert.equal(r.requirements.find(x=>x.id==='lms').status,'unknown');
  assert.equal(r.requirements.find(x=>x.id==='lms').tier,'desirable');
});
test('known salary below floor is a failed hard constraint',()=>{
  const r=evaluate('Coordinate training programmes and seminars.',cv,{salary_min:28000,salary_max:32000});
  assert.equal(r.hard_constraints.find(x=>x.name.startsWith('Salary')).status,'not_met');
  assert.equal(r.recommendation,'Check hard constraints');
});
test('missing salary is unknown, not a failed hard constraint',()=>{
  const r=evaluate('Coordinate training programmes and seminars.');
  assert.equal(r.hard_constraints.find(x=>x.name.startsWith('Salary')).status,'unknown');
});
test('short and sparse advertisements receive low confidence',()=>{
  assert.equal(evaluate('Coordinate seminars.').confidence.label,'Low');
});
test('no identifiable requirements produces no invented score',()=>{
  const r=evaluateVacancy(cv,{title:'Opportunity',description:'A great chance to grow with a friendly team.'});
  assert.equal(r.fit_score,null);
});
test('programme management is not evidence of line management',()=>{
  const r=evaluate('Essential line management and staff supervision experience.', 'Managed complex programmes and reports across five product teams.');
  assert.equal(r.requirements.find(x=>x.id==='people_management').status,'unknown');
});
test('explicitly unnecessary requirements are not scored',()=>{
  const requirements=extractJobRequirements({description:'No LMS experience needed. Coordinate seminars and schedules.'});
  assert.equal(requirements.some(x=>x.id==='lms'),false);
});
test('source quotations in candidate evidence come from the CV',()=>{
  const entries=extractCandidateEvidence(cv);
  const text=entries.find(x=>x.id==='instructors').evidence.quote;
  assert.ok(cv.includes(text));
});
