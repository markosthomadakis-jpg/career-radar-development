import {evaluateVacancy} from './calibration-model.mjs';

export const MODEL_VERSION='5.3.0-evaluation';
const risks=[
 {id:'ai_service',label:'Hands-on AI customer-service platform implementation',re:/\b(?:AI.driven customer service platforms?|Zendesk AI|Intercom|AI bot|automated chat resolution|AI support implementations?)\b/i,evidence:/\b(?:implemented|deployed|operated|configured)\b.{0,90}\b(?:AI customer|Zendesk AI|Intercom|chatbot|support automation)\b/i},
 {id:'travel_cx',label:'Travel-tech or marketplace customer operations',re:/\b(?:travel tech|traveler|traveller|travel marketplace|hospitality platform|tours and attractions)\b/i,evidence:/\b(?:travel tech|travel marketplace|traveler support|hospitality operations)\b/i},
 {id:'line_management',label:'Direct line or volunteer management',re:/\b(?:line manage|line management|manage \d+ volunteers|hire.{0,30}manage.{0,30}volunteers|direct reports|manage a team)\b/i,evidence:/\b(?:line.managed|direct reports|managed a team|supervised staff|hired.{0,30}volunteers)\b/i},
 {id:'public_health',label:'Public-health policy specialism',re:/\b(?:public health policy|health inequalities|epidemiology|public health strategy)\b/i,evidence:/\b(?:public health policy|health inequalities|epidemiology)\b/i},
 {id:'specialist_it',label:'Specialist IT programme ownership',re:/\b(?:IT and Business programme manager|technical programme manager|software engineering delivery|IT transformation programme)\b/i,evidence:/\b(?:led IT transformation|IT programme ownership|technical programme manager)\b/i},
 {id:'specialist_finance',label:'Specialist finance programme delivery',re:/\b(?:finance program manager|finance programme manager|financial close transformation|accounting programme)\b/i,evidence:/\b(?:finance transformation programme|financial close transformation|accounting programme)\b/i},
 {id:'lms',label:'Specific LMS implementation/administration',re:/\b(?:Degreed|Cornerstone|Moodle|Totara|SuccessFactors Learning|LMS administrator)\b/i,evidence:/\b(?:Degreed|Cornerstone|Moodle|Totara|SuccessFactors Learning|LMS administrator)\b/i}
];
const sourceWords=s=>String(s||'').trim().split(/\s+/).filter(Boolean).length;
export function evaluateV53(cv,job,preferences={}){
 const prior=evaluateVacancy(cv,job,preferences),description=String(job.description||''),title=String(job.title||'');
 const detected=risks.filter(r=>r.re.test(description+' '+title));
 const essentialGaps=detected.filter(r=>!r.evidence.test(cv)).map(r=>({id:r.id,label:r.label,status:'unverified_essential_or_role_specific',severity:['lms','travel_cx'].includes(r.id)?'desirable_or_contextual':'critical'}));
 const wordCount=sourceWords(description);
 // Evaluation excerpts 35-144 words may be scored provisionally, always Low
 // confidence; real application deployment should prefer full descriptions.
 const depth=wordCount>=145?'substantial':wordCount>=35?'partial':'insufficient';
 const hard=[...prior.hard_constraints];
 const closing=description.match(/closing date.{0,20}(\d{1,2})\s+(October|November|December)\s+2026/i);
 if(closing){const month={October:9,November:10,December:11}[closing[2]];const deadline=new Date(Date.UTC(2026,month,Number(closing[1]),23,59));const asOf=new Date(preferences.asOf||'2026-10-20T12:00:00Z');hard.push({name:'Advertised closing date',status:asOf>deadline?'not_met':'supported',source:closing[0]});}
 const blocked=hard.some(h=>h.status==='not_met');
 const deduction=essentialGaps.reduce((n,x)=>n+(x.severity==='critical'?18:4),0);
 const criticalGaps=essentialGaps.filter(x=>x.severity==='critical').length;
 // Sparse adverts must never generate a misleading perfect score.
 const coverage=prior.fit_score===null?null:Math.max(0,Math.min(100,prior.fit_score-deduction));
 const enoughEvidence=depth==='substantial'&&prior.requirements.length>=4;
 const score=enoughEvidence?coverage:null;
 const essential=prior.requirements.filter(x=>x.tier==='essential');
 const screening=essential.map(x=>({criterion:x.label,status:x.status==='supported'?'evidenced':x.status==='limited_evidence'?'partial':'unverified',advert_evidence:x.source,cv_evidence:x.evidence||null}));
 for(const gap of essentialGaps.filter(x=>x.severity==='critical'))screening.push({criterion:gap.label,status:'unverified',advert_evidence:'Specialist criterion detected in advert',cv_evidence:null});
 const screeningReady=screening.length>0&&screening.every(x=>x.status==='evidenced');
 const status=blocked?'SKIP — published hard constraint':!enoughEvidence?'VERIFY — insufficient full requirements':!screeningReady?'VERIFY — essential screening evidence':criticalGaps?'VERIFY — specialist requirement':score>=70?'CONSIDER — verify vacancy and logistics':'REVIEW — weaker evidence';
 return {...prior,version:MODEL_VERSION,fit_score:score,capability_fit:score,unadjusted_coverage:prior.fit_score,description_depth:depth,critical_evidence_gaps:essentialGaps,screening_evidence:{criteria:screening,ready:screeningReady,meaning:'Documented response to explicit essential criteria; not an ATS or hiring prediction'},contextual_fit:{score:null,status:'not_researched',reason:'No sourced employer/sector evidence provided'},vacancy_verification:{status:'not_verified',previous_application:'PENDING USER REVIEW',requires:['Live employer/ATS listing','Closing date','Salary and contract','Previous application status']},decision:status,confidence:{label:enoughEvidence&&!essentialGaps.length?'Moderate':'Low',reason:!enoughEvidence?'The available description does not disclose enough requirements for a trustworthy numeric score.':essentialGaps.length?'Specific role-critical requirements require additional evidence.':'Published criteria only; hidden requirements remain unknown.'},score_meaning:'Conservative evidence coverage with provisional gap deductions, not a hiring probability'};
}

// Context never changes demonstrated capability fit. It can only reorder
// verification priority within a small, explicitly bounded range.
export function withEmployerIntelligence(v53,intel={}){
 const signals=[];let delta=0;
 const reviews=intel.employee_reviews;
 if(reviews&&Number.isFinite(reviews.rating)&&Number.isFinite(reviews.count)&&reviews.count>=25){
   const regional=reviews.scope==='office';
   const reliability=reviews.count>=100?(regional?1:0.7):0.35;
   const contribution=Math.max(-3,Math.min(3,Math.round((reviews.rating-3.5)*4*reliability)));
   delta+=contribution;signals.push({type:'employee_reviews',value:`${reviews.rating}/5 (${reviews.count} reviews)`,source:reviews.source,scope:reviews.scope,delta:contribution});
 }
 if(intel.business_evidence?.status==='reported_positive'){delta+=1;signals.push({type:'business_evidence',value:intel.business_evidence.note,source:intel.business_evidence.source,delta:1});}
 if(intel.salary_evidence?.employer_confirmed_below_floor){delta-=4;signals.push({type:'confirmed_salary',value:'Employer-confirmed salary below minimum',source:intel.salary_evidence.source,delta:-4});}
 delta=Math.max(-5,Math.min(5,delta));
 const priorityScore=v53.fit_score===null?null:Math.max(0,Math.min(100,v53.fit_score+delta));
 return {...v53,intel_signals:signals,priority_adjustment:delta,priority_score:priorityScore,fit_score:v53.fit_score,decision:v53.decision,context_rule:'Context does not erase missing essential skills, expired vacancies, or other hard constraints.'};
}
