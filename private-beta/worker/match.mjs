/** Career Radar 5.4.0 — deterministic and conservative matching.
 * Public evaluation contract. No IO, clock, random, network or storage.
 * CV evidence and job evidence remain separate; never a hiring probability.
 */
import {extractCandidateEvidence, extractJobRequirements} from './calibration-model.mjs';
export const ENGINE_VERSION='5.4.0';
const DEFAULT_FAMILIES={
  learning:['learning_operations','scheduling','instructors','participants','stakeholders','documentation','reporting'],
  programme:['programme_governance','scheduling','stakeholders','documentation','reporting','data_quality'],
  operations:['documentation','stakeholders','reporting','data_quality','scheduling','participants'],
  reporting:['reporting','data_quality','excel','documentation','stakeholders'],
};
const SPECIALIST=[
  {id:'credential',label:'Specific professional qualification / licence',requirement:/\b(?:CIPD|ACCA|CIMA|ACA|qualified accountant|professional licence|professional license|QTS|registration with|chartered)\b/i},
  {id:'management',label:'Direct line-management responsibility',requirement:/\b(?:line manag\w*|direct reports?|manag\w* a team of \d+|supervis\w* \d+ staff|people management)\b/i},
  {id:'technical',label:'Advanced specialist technical experience',requirement:/\b(?:advanced SQL|advanced DAX|SQL engineering|machine learning deployment|AI implementation|architect\w* platform|data engineer)\b/i},
  {id:'lms_platform',label:'Named LMS administrator / implementation requirement',requirement:/\b(?:Cornerstone|Moodle|Totara|Degreed|SuccessFactors Learning)\b/i},
];
function specialistSupported(id,keyword,cv){
 const rows=String(cv||'').split(/\n+|(?<=[.!?;])\s+/).filter(x=>new RegExp(keyword.replace(/[.*+?^${}()|[\]\\]/g,'\\$&'),'i').test(x));
 return rows.some(row=>{
   if(/\b(?:not|never|without|lack(?:s|ing)?)\b.{0,45}\b(?:qualified|certified|experience|CIPD|ACCA|SQL|manager|management)\b/i.test(row))return false;
   if(id==='credential')return /\b(?:hold|holds|held|achiev\w*|earn\w*|obtain\w*|qualified|certified|completed|possess\w*|awarded)\b/i.test(row);
   if(id==='management')return /\b(?:line.manag\w*|direct reports?|supervis\w* staff|manag\w* (?:a )?team of \d+)\b/i.test(row);
   if(id==='lms_platform')return /\b(?:administ\w*|configur\w*|implement\w*|deploy\w*|operat\w*)\b/i.test(row);
   return /\b(?:design\w*|deploy\w*|implement\w*|built|engineer\w*|develop\w*)\b/i.test(row);
 });
}
const nonempty=s=>String(s??'').trim();
const words=s=>nonempty(s).split(/\s+/).filter(Boolean).length;
const idate=(y,m,d)=>{const date=new Date(Date.UTC(y,m-1,d));return date.getUTCFullYear()===y&&date.getUTCMonth()===m-1&&date.getUTCDate()===d?date.toISOString().slice(0,10):null};
const MONTHS=Object.fromEntries(['january','february','march','april','may','june','july','august','september','october','november','december'].flatMap((x,i)=>[[x,i+1],[x.slice(0,3),i+1]]));
export function parseClosingDate(value){
 const s=nonempty(value);
 if(!s)return null;
 let m=s.match(/^(\d{4})-(\d{2})-(\d{2})$/);
 if(m)return idate(+m[1],+m[2],+m[3]);
 m=s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
 if(m){ // When both day and month <=12 the advert is ambiguous; do not guess.
   if(+m[1]<=12 && +m[2]<=12)return null;
   return idate(+m[3],+m[2],+m[1]);
 }
 m=s.match(/^(\d{1,2})\s+([a-z]+)\s+(\d{4})$/i);
 if(m&&MONTHS[m[2].toLowerCase()])return idate(+m[3],MONTHS[m[2].toLowerCase()],+m[1]);
 return null;
}
function dateFromDescription(description){
 const r=/\b(?:closing date|applications? clos(?:e|es)|apply by|deadline)\s*[:\-]?\s*(\d{4}-\d{2}-\d{2}|\d{1,2}\/\d{1,2}\/\d{4}|\d{1,2}\s+[A-Za-z]+\s+\d{4})\b/ig;
 const m=r.exec(description);
 return m?{date:parseClosingDate(m[1]),source:m[0],present:true}:{date:null,source:'Closing date not disclosed',present:false};
}
function durationFromDescription(description){
 const rx=[/\b(\d{1,2})\s*(?:-|\s)?months?\s*(?:fixed[- ]term|contract|ftc)\b/i,/\b(?:fixed[- ]term|contract|ftc)\s*(?:for\s*)?(\d{1,2})\s*months?\b/i];
 for(const r of rx){const m=description.match(r);if(m)return +m[1]}
 return null;
}
function finite(v){return v===null||v===undefined||v===''?null:Number.isFinite(Number(v))&&Number(v)>=0?Number(v):null}
function detectFamily(vacancy){
 const s=(nonempty(vacancy.title)+' '+nonempty(vacancy.description).slice(0,260)).toLowerCase();
 if(/\b(training|learning|l&d|seminar|course|education)\b/.test(s))return 'learning';
 if(/\b(pmo|programme|program|project|governance)\b/.test(s))return 'programme';
 if(/\b(report|insight|analyst|dashboard|data)\b/.test(s))return 'reporting';
 return 'operations';
}
function getImportance(line){return /\b(?:essential|mandatory|must have|must demonstrate|required|requirement|minimum|you will need|proven experience)\b/i.test(line)?'essential':/\b(?:desirable|preferred|nice to have|advantageous|ideally)\b/i.test(line)?'desirable':'context'}
function flattenHistory(history){return Array.isArray(history)?history:[]}
const ISO=/^\d{4}-\d{2}-\d{2}$/;
export function evaluate({profile,vacancy,preferences={},evaluationDate,history=[]}){
 if(!ISO.test(nonempty(evaluationDate))||!parseClosingDate(evaluationDate))throw new TypeError('Valid evaluationDate YYYY-MM-DD is required');
 const cv=typeof profile==='string'?profile:nonempty(profile?.cv_text);
 const job=vacancy||{},description=nonempty(job.description),title=nonempty(job.title);
 const contract=nonempty(job.contract_type).toLowerCase();
 const closingEvidence=job.closing_date?{date:parseClosingDate(job.closing_date),source:'Structured closing date: '+job.closing_date,present:true}:dateFromDescription(description);
 const reasons=[],hard=[],unknown=[];
 if(closingEvidence.present){
   if(!closingEvidence.date){unknown.push('Closing date format ambiguous or invalid');hard.push({name:'Closing date',status:'unknown',source:closingEvidence.source});}
   else {const expired=closingEvidence.date<evaluationDate;if(expired)reasons.push('Closing date '+closingEvidence.date+' has passed');hard.push({name:'Closing date',status:expired?'not_met':'supported',source:closingEvidence.source});}
 } else {unknown.push('Closing date not disclosed');hard.push({name:'Closing date',status:'unknown',source:'Not disclosed'});}
 const floor=finite(preferences.salaryFloor??preferences.salary_floor)??0;
 const minSalary=finite(job.salary_min),maxSalary=finite(job.salary_max);
 if(floor){let status='unknown';if(maxSalary!==null&&maxSalary<floor){status='not_met';reasons.push('Advertised salary ceiling below £'+floor)}else if(minSalary!==null&&minSalary>=floor)status='supported';else unknown.push('Salary unknown or range overlaps minimum');hard.push({name:'Salary at least £'+floor,status,source:minSalary!==null||maxSalary!==null?('Salary range '+(minSalary??'?')+'–'+(maxSalary??'?')):'Not disclosed'});}
 const minimumMonths=finite(preferences.minContractMonths??preferences.min_months)??0;
 const months=finite(job.contract_months)??durationFromDescription(description);
 const permanent=/(^|\W)permanent(\W|$)/.test(contract)||(!contract&&/\bpermanent(?:\s+(?:full|part)[- ]time)?\b/i.test(description));
 if(minimumMonths){let status='unknown';if(permanent)status='supported';else if(months!==null){status=months<minimumMonths?'not_met':'supported';if(months<minimumMonths)reasons.push(months+'-month contract below '+minimumMonths+'-month minimum')}else unknown.push('Contract duration unknown');hard.push({name:'Contract at least '+minimumMonths+' months or permanent',status,source:permanent?'Permanent':months!==null?months+' months stated':'Not disclosed'});}
 const previous=flattenHistory(history).find(item=>{
   const source=nonempty(job.source_url),id=nonempty(job.id||job.job_id);
   if(source&&nonempty(item.url||item.source_url)===source)return true;
   if(id&&nonempty(item.job_id||item.id)===id)return true;
   return nonempty(item.title).toLowerCase()===title.toLowerCase()&&nonempty(item.employer).toLowerCase()===nonempty(job.employer||job.company).toLowerCase()&&title&&nonempty(job.employer||job.company);
 });
 if(previous&&['Saved','Applied','Interview','Rejected','Offer','Withdrawn','Excluded'].includes(previous.status)){reasons.push('Previously tracked opportunity: '+previous.status);hard.push({name:'Application history',status:'not_met',source:previous.status});}
 const eligibility={status:reasons.length?'ineligible':unknown.length?'unknown':'eligible',reasons:[...reasons,...unknown]};
 const wc=words(description),extracted=extractJobRequirements({title,description});
 const explicitEssentials=extracted.filter(x=>x.tier==='essential');
 const missing=[];
 const descPart=wc>=200?.40:wc>=145?.34:wc>=100?.22:wc>=60?.12:0;
 const completeness=descPart+(explicitEssentials.length>=2?.30:explicitEssentials.length===1?.18:0)+((minSalary!==null||maxSalary!==null)?.075:0)+(closingEvidence.present&&closingEvidence.date?.075:0)+((contract||permanent||months!==null)?.075:0)+(nonempty(job.location)?.075:0);
 if(wc<100)missing.push('Substantial job description');if(!explicitEssentials.length)missing.push('Explicit essential requirements');
 if(minSalary===null&&maxSalary===null)missing.push('Salary');if(!closingEvidence.date)missing.push('Unambiguous closing date');if(!contract&&!permanent&&months===null)missing.push('Contract type/duration');if(!nonempty(job.location))missing.push('Location');
 const advert_completeness={score:Number(completeness.toFixed(3)),missing,word_count:wc};
 const family=detectFamily(job),candidate=extractCandidateEvidence(cv);const evidenceMap=new Map(candidate.map(x=>[x.id,x.evidence]));
 const requirements=extracted.map(x=>{
   const ev=evidenceMap.get(x.id),importance=x.tier==='important'?'context':x.tier;
   const specialist=['people_management','lms'].includes(x.id);
   const status=ev?.strength>=0.8?'demonstrated':ev?'partial':'unknown';
   return {...x,importance,specificity:specialist?'specialist':family==='learning'?'domain':'generic',status,evidence:ev?.quote||null,cv_evidence:ev?.quote||null};
 });
 const core=DEFAULT_FAMILIES[family];const ids=new Set([...core,...requirements.map(x=>x.id)]);
 let earned=0,denominator=0,evidenced=0;
 for(const id of ids){const req=requirements.find(x=>x.id===id),weight=req?.weight??1.5,ev=evidenceMap.get(id);denominator+=weight;if(ev){earned+=weight*ev.strength;evidenced++;}}
 const evidenceRatio=ids.size?evidenced/ids.size:0;
 let provisional=denominator?Math.round(100*earned/denominator):null;
 if(evidenceRatio<.30)provisional=null;else if(evidenceRatio<.50)provisional=Math.min(provisional,70);
 // Only explicit employer essentials are used as potential specialist hard gaps.
 const sentences=description.split(/\n+|(?<=[.!?;])\s+/).filter(Boolean);
 const critical_evidence_gaps=[];
 for(const sentence of sentences){if(getImportance(sentence)!=='essential')continue;
  for(const s of SPECIALIST){const found=sentence.match(s.requirement);if(!found)continue;
    const exact=found[0];if(!specialistSupported(s.id,exact,cv)){
      const id=s.id+'-'+exact.toLowerCase();if(!critical_evidence_gaps.some(x=>x.id===id))critical_evidence_gaps.push({id,label:s.label+': '+exact,severity:'critical',status:'unverified',advert_evidence:sentence.trim().slice(0,250)});
    }
  }
 }
 const screening=explicitEssentials.map(r=>{const req=requirements.find(x=>x.id===r.id);return {criterion:r.label,status:req?.status==='demonstrated'?'evidenced':req?.status==='partial'?'partial':'unverified',advert_evidence:r.source,cv_evidence:req?.evidence||null}});
 for(const gap of critical_evidence_gaps)screening.push({criterion:gap.label,status:'unverified',advert_evidence:gap.advert_evidence,cv_evidence:null});
 const screeningReady=screening.length>0&&screening.every(x=>x.status==='evidenced');
 const thin=wc<100||completeness<.5||provisional===null;
 const confidenceLabel=thin||eligibility.status==='unknown'||critical_evidence_gaps.length||wc<200||explicitEssentials.length<2?'Low':wc>=280&&explicitEssentials.length>=3&&evidenceRatio>=.75?'High':'Medium';
 const confidence={label:confidenceLabel,reason:thin?'Insufficient full employer requirements and/or evidence coverage.':eligibility.status==='unknown'?'Some hard constraints lack verified values.':critical_evidence_gaps.length?'Specialist essential evidence not established.':'Sufficiently detailed advertised requirements; internal hiring criteria remain unknown.'};
 let decision=eligibility.status==='ineligible'?'Skip':thin?'Not assessable':critical_evidence_gaps.length?'Stretch':!screeningReady?'Apply with tailoring':confidenceLabel==='Low'?'Apply with tailoring':provisional>=80?'Apply':provisional>=60?'Apply with tailoring':'Stretch';
 // A poor match must not become Apply merely because the ad is lengthy.
 if(provisional!==null&&provisional<60&&decision==='Apply with tailoring')decision='Stretch';
 const fit_score=eligibility.status==='ineligible'||thin?null:provisional;
 const band=fit_score===null?'Not assessable':fit_score>=80?'Strong':fit_score>=60?'Moderate':'Weak';
 return {version:ENGINE_VERSION,engine_version:ENGINE_VERSION,evaluation_date:evaluationDate,fit_score,capability_fit:fit_score,band,decision,eligibility,advert_completeness,confidence,requirements,hard_constraints:hard,unknowns:unknown,screening_evidence:{criteria:screening,ready:screeningReady,meaning:'CV evidence of published criteria; not an ATS or hiring prediction'},tailoring_prompts:screening.filter(x=>x.status!=='evidenced').map(x=>({criterion:x.criterion,what_to_evidence:'Provide a truthful, specific CV example if one exists; otherwise leave unverified.'})),critical_evidence_gaps,contextual_fit:{score:null,status:'not_researched'},vacancy_verification:{status:closingEvidence.date&&closingEvidence.date<evaluationDate?'expired':'not_verified',previous_application:previous?.status||'PENDING USER REVIEW',requires:['Employer vacancy page','Closing date','Salary and contract','Previous application status']},description_depth:wc>=200?'substantial':wc>=100?'partial':'insufficient',evidence_coverage:{evidenced,total:ids.size,ratio:Number(evidenceRatio.toFixed(3))},unadjusted_coverage:denominator?Math.round(100*earned/denominator):null,score_meaning:'Conservative documented capability coverage; not a hiring probability',limitations:['Only published requirements are visible.','Unknown does not mean incapable.','No employer intelligence is applied.']};
}
