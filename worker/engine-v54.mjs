// Pure offline engine. No clock, storage or network. Versioned separately from historical engines.
export const MODEL_VERSION='5.4.5';
const MONTHS=['january','february','march','april','may','june','july','august','september','october','november','december'];
const day=(y,m,d)=>{const dt=new Date(Date.UTC(y,m-1,d));return dt.getUTCFullYear()===y&&dt.getUTCMonth()===m-1&&dt.getUTCDate()===d?`${y}-${String(m).padStart(2,'0')}-${String(d).padStart(2,'0')}`:null;};
export function parseDate(value){
 const s=String(value??'').trim();let m=s.match(/^(\d{4})-(\d{2})-(\d{2})$/);if(m)return day(+m[1],+m[2],+m[3]);
 m=s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);if(m)return +m[1]<=12&&+m[2]<=12?null:day(+m[3],+m[2],+m[1]);
 m=s.match(/^(\d{1,2})(?:st|nd|rd|th)?\s+([a-z]+)\s+(\d{4})$/i);if(!m)return null;
 const month=MONTHS.findIndex(x=>x===m[2].toLowerCase()||x.slice(0,3)===m[2].toLowerCase());return month<0?null:day(+m[3],month+1,+m[1]);
}
const ACTION=/\b(?:coordinat(?:e|ed|es|ing)|manag(?:e|ed|es|ing)|maintain(?:ed|s|ing)?|reconcil(?:e|ed|es|ing)|prepar(?:e|ed|es|ing)|support(?:ed|s|ing)?|develop(?:ed|s|ing)?|implement(?:ed|s|ing)?|deliver(?:ed|s|ing)?|liais(?:e|ed|es|ing)|organis(?:e|ed|es|ing)|organiz(?:e|ed|es|ing)|led|supervis(?:e|ed|es|ing)|produc(?:e|ed|es|ing)|respond(?:ed|s|ing)?|administ(?:er|ered|ers|ering)|schedul(?:e|ed|es|ing))\b/i;
const PROFILE_SUMMARY=/^(?:an? experienced\b|experienced (?:in|at|with)\b|brings?\b|skilled (?:in|at)\b|professional (?:with|in)\b|[^.!?]{0,100}\bprofessional with\b)/i;
const NEG=/\b(?:no|not|never|without|lack\w*|do not|don't|cannot|not yet)\b/i;
const catalog=[
 ['courses','Course / training administration',/\b(?:courses?|training|learning operations?|seminars?|workshops?)\b/i],
 ['scheduling','Scheduling',/\b(?:schedul\w*|timetabl\w*|room bookings?|calendar)\b/i],
 ['participants','Participant administration',/\b(?:participant\w*|registration\w*|delegate\w*|attend\w*|learner\w*)\b/i],
 ['suppliers','Instructor / supplier coordination',/\b(?:instructor\w*|supplier\w*|vendor\w*|trainer\w*|external provider\w*)\b/i],
 ['excel','Excel / spreadsheets',/\b(?:excel|spreadsheets?|pivot tables?|vlookup|xlookup)\b/i],
 ['records','Records / data quality',/\b(?:records?|data accuracy|data quality|reconcil\w*|validat\w*)\b/i],
 ['reporting','Operational reporting',/\b(?:report\w*|dashboards?|kpis?)\b/i],
 ['documentation','Documentation',/\b(?:documents?|documentation|procedures?|meeting notes|minutes|process documentation)\b/i],
 ['projects','Project support',/\b(?:project coordination|programme coordination|action logs?|milestones?|dependencies|pmo)\b/i],
 ['stakeholders','Stakeholder / client support',/\b(?:stakeholders?|customer service|client support|customer quer\w*|liais\w*)\b/i],
 ['people','Line management',/\b(?:line manag\w*|people management|direct reports?|staff supervision|manag(?:e|es|ed|ing) (?:a |the |small )?team|supervis\w* staff)\b/i,'specialist'],
 ['developer','Software development',/\b(?:software develop\w*|software engineer\w*|lead developer|c#|dynamics 365|\.net\b|power platform)\b/i,'specialist'],
 ['surveying','Building surveying',/\b(?:building survey\w*|building defects?|rics|ciob)\b/i,'specialist'],
 ['procurement','Procurement ownership',/\b(?:procurement officer|category management|public procurement|tender\w*|cips)\b/i,'specialist'],
 ['accounting','Accounting / finance qualification',/\b(?:acca|cima|aat|chartered accountant|qualified accountant)\b/i,'specialist'],
 ['cipd','CIPD qualification',/\bcipd\b/i,'credential'],
 ['driving','Driving licence',/\b(?:driving licen[cs]e|driver.?s licen[cs]e)\b/i,'credential'],
 ['moodle','Moodle',/\bmoodle\b/i,'specialist'],
 ['sql','Advanced SQL / DAX',/\b(?:advanced sql|advanced dax|sql development|database engineer\w*)\b/i,'specialist'],
 ['zoo','Animal husbandry',/\b(?:zookeep\w*|animal husbandry|dmzaa)\b/i,'specialist'],
 ['cemetery','Cemetery machinery certification',/\b(?:cots|cemetery operativ\w*|360 digger)\b/i,'specialist'],
 ['research','Researcher development',/\b(?:researcher development|doctoral training|vitae framework)\b/i,'specialist'],
 ['housing','Housing legislation',/\b(?:housing legislation|homelessness legislation|housing options|landlord statutory compliance)\b/i,'specialist']
].map(([id,label,re,specificity='generic'])=>({id,label,re,specificity}));
const units=s=>String(s||'').replace(/<[^>]*>/g,' ').replace(/\r/g,'\n').split(/\n+|(?<=[.!?;])\s+/).map(s=>s.trim()).filter(Boolean);
function extract(text,title){
 const matched=new Map();let tier='context',benefits=false;
 for(const line of units(text)){
  // Employer recruitment/accessibility commitments are not candidate criteria.
  if(/\b(?:we (?:encourage|welcome) applications|applications from all backgrounds|equal opportunit(?:y|ies)|reasonable adjustments|fair (?:recruitment )?process|disability confident)\b/i.test(line))continue;
  if(/^(?:benefits|what we offer|what you(?:'ll| will) get|rewards|our offer)\s*:?$/i.test(line)){benefits=true;continue;}
  if(/^(?:responsibilities|duties|essential.*|desirable.*|requirements|person specification|about you|the role)\s*:?$/i.test(line))benefits=false;
  if(benefits)continue;
  if(/\b(?:training opportunities|training (?:is |will be )?provided|career (?:development|progression)|rewarding career)\b/i.test(line)&&!/\b(?:deliver|coordinate|administer|organise|manage)\w*\s+(?:the |staff |employee )?training\b/i.test(line))continue;
  if(tier==='context'&&line.split(/\s+/).length<=3&&!ACTION.test(line)&&!catalog.some(c=>c.specificity!=='generic'&&c.re.test(line))&&!/\b(?:essential|required|must)\b/i.test(line))continue;
  if(/^(?:essential(?: criteria| requirements| skills)?|what (?:we need|you need)|minimum requirements|must.have)\s*:?$/i.test(line)){tier='essential';continue;}
  if(/^(?:desirable(?: criteria| requirements| skills)?|preferred|nice.to.have)\s*:?$/i.test(line)){tier='desirable';continue;}
  if(/^(?:responsibilities|duties|benefits|about (?:us|the company)|the role|how to apply|\[SUPPLEMENT.*)\s*:?$/i.test(line)){tier='context';continue;}
  const explicitDesirable=/\b(?:desirable|preferred|advantageous|ideally|beneficial|not essential)\b/i.test(line);
  const importance=explicitDesirable?'desirable':/\b(?:essential|must|minimum|proven experience)\b|\b(?:you (?:are |will be )?required to|required (?:skills|experience|qualifications)|requirements? include)\b|\b(?:experience|qualification|licen[cs]e|certificate|degree|knowledge|skills)\b.{0,60}\b(?:is |are )?required\b/i.test(line.replace(/\bas required\b/gi,''))?'essential':tier;
  if(/\b(?:not required|no .{0,40}experience (?:is )?(?:required|needed))\b/i.test(line))continue;
  if(importance==='essential'&&/\b(?:degree|qualification|licen[cs]e|certificat\w*|professional registration)\b/i.test(line)&&!catalog.some(c=>c.specificity==='credential'&&c.re.test(line))){
   const id='credential_'+line.toLowerCase().replace(/[^a-z0-9]+/g,'_');matched.set(id,{id,label:'Stated qualification / credential',importance:'essential',tier:'essential',weight:3,specificity:'credential',source:line,uncatalogued:true});
  }
  if(importance==='essential'&&!catalog.some(c=>c.re.test(line))){
   const id='unclassified_'+line.toLowerCase().replace(/[^a-z0-9]+/g,'_');matched.set(id,{id,label:'Published requirement — manual review',importance,tier:importance,weight:3,specificity:'unclassified',source:line,uncatalogued:true});
  }
  for(const c of catalog){if(!c.re.test(line))continue;const old=matched.get(c.id);const rank={context:0,desirable:1,essential:2};if(!old||rank[importance]>rank[old.importance])matched.set(c.id,{id:c.id,label:c.label,importance,tier:importance,weight:importance==='essential'?3:importance==='desirable'?1:2,specificity:c.specificity,source:line});}
 }
 // A specialist occupation in the title is relevant, but its detailed criteria remain unverified.
 for(const c of catalog.filter(x=>x.specificity==='specialist'))if(c.re.test(title)&&!matched.has(c.id))matched.set(c.id,{id:c.id,label:c.label,importance:'essential',tier:'essential',weight:3,specificity:c.specificity,source:title,derived_from_title:true});
 // Specialist role titles establish core-role relevance, not an invented licence requirement.
 const roleCore=[['developer',/\b(?:developer|software engineer)\b/i],['surveying',/\bsurveyor\b/i],['procurement',/\bprocurement officer\b/i],['accounting',/\b(?:accountant|accounts payable)\b/i],['zoo',/\bzookeeper\b/i],['cemetery',/\bcemeteries|cemetery\b/i],['research',/\bresearcher development\b/i]];
 for(const [id,re] of roleCore)if(re.test(title)){const c=catalog.find(x=>x.id===id);const old=matched.get(id);matched.set(id,{...old,id,label:c.label,importance:'essential',tier:'essential',weight:3,specificity:'specialist',source:old?.source||title,derived_from_title:true,interpretation:'Core occupational relevance inferred from title; detailed employer criteria require verification.'});}
 return [...matched.values()];
}
function closingDate(v){
 if(v.closing_date!==undefined&&v.closing_date!==null&&String(v.closing_date).trim())return {date:parseDate(v.closing_date),source:String(v.closing_date)};
 const matches=[...String(v.description||'').matchAll(/(?:closing date|close date|apply by|applications? (?:close|deadline)|closing)\s*[:\-]?\s*(?:Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday)?\s*[,]?\s*(\d{4}-\d{2}-\d{2}|\d{1,2}\/\d{1,2}\/\d{4}|\d{1,2}(?:st|nd|rd|th)?\s+[a-z]+\s+\d{4})/gi)];
 const dates=matches.map(m=>parseDate(m[1]));return {date:dates.length&&dates.every(x=>x&&x===dates[0])?dates[0]:null,source:matches.map(m=>m[0]).join('; ')||'Not supplied'};
}
function eligibility(v,p,date){
 const checks=[];const add=(name,status,source)=>checks.push({name,status,source});
 const nonJob=/\b(?:focus group|paid survey|research stud(?:y|ies))\b/i.test(v.title||'')&&/\b(?:panelists?|panellists?|participants?|earn up to|paid participation)\b/i.test((v.title||'')+' '+(v.description||''));
 if(nonJob)add('Genuine employment vacancy','not_met','Research participation / panel listing, not an employment vacancy');
 if(v.status==='closed'||/this (?:opportunity|vacancy|position) is closed to applications/i.test(v.description||''))add('Published vacancy status','not_met','Source explicitly states closed to applications');const close=closingDate(v);add('Closing date',!close.date?'unknown':close.date<date?'not_met':'supported',close.source);
 const floor=Number(p.salaryFloor||0),lo=Number(v.salary_min),hi=Number(v.salary_max);
 if(floor)add('Salary floor',v.salary_is_predicted===true?'unknown':Number.isFinite(lo)&&lo>=floor?'supported':Number.isFinite(hi)&&hi<floor?'not_met':'unknown',`Advertised: ${v.salary_min??'unknown'}–${v.salary_max??'unknown'}; floor ${floor}`);
 const min=Number(p.minContractMonths||0),type=String(v.contract_type||'');let months=Number(v.contract_months)||null;
 let weeks=null;
 if(!months){const text=String(v.description||'');const m=text.match(/\b(\d{1,2})[- ]months?\s*(?:temporary\s+)?(?:fixed.term|contract|ftc)|(?:fixed.term|contract|ftc)\s*(?:for\s*)?(\d{1,2})\s*months?/i);months=m?Number(m[1]||m[2]):null;
 const w=text.match(/(?:temporary|contract|fixed.term|initially)\s*[:,-]?\s*(?:(?:temporary|initially|for)\s*[:,]?\s*)*(\d{1,2})(?:\s*[-–—]\s*(\d{1,2}))?\s*weeks?/i);weeks=w?Math.max(Number(w[1]),Number(w[2]||w[1])):null;
 }
 if(min){const permanent=/^permanent$/i.test(type.trim());add('Contract duration',weeks&&weeks<min*4?'not_met':permanent?'supported':months?months<min?'not_met':'supported':'unknown',weeks?`Initially up to ${weeks} weeks; extension not guaranteed`:permanent?type:months?`${months} months`:type||'Not supplied');}
 if(v.location_eligible!==undefined)add('Location',v.location_eligible===true?'supported':v.location_eligible===false?'not_met':'unknown',v.location||'Not supplied');
 else if(p.requireLocationCheck)add('Location','unknown','Walking distance / approved area not verified');
 const status=String(v.history_status||p.history?.find(x=>(v.id&&x.id===v.id)||(v.source_url&&x.source_url===v.source_url))?.status||'').toLowerCase();
 if(['applied','rejected','withdrawn','excluded'].includes(status))add('Previous application / exclusion','not_met',status);
 const state=checks.some(x=>x.status==='not_met')?'ineligible':checks.some(x=>x.status==='unknown')?'unknown':'eligible';return {status:state,reasons:checks.filter(x=>x.status!=='supported'),checks};
}
export function evaluate({profile,vacancy={},preferences={},evaluationDate,history}){
 const date=parseDate(String(evaluationDate||'').slice(0,10));if(!date)throw Error('Valid explicit evaluationDate required');const cv=typeof profile==='string'?profile:String(profile?.text||'');
 const v=vacancy,p={...preferences,history:history??preferences.history};const gate=eligibility(v,p,date);
 const reqs=extract(v.description,v.title||''),sentences=units(cv).filter(x=>!NEG.test(x)&&!/^\s*(?:skills|systems|keywords|qualifications)\s*:/i.test(x)&&!(x.includes('|')&&!/[.!?]/.test(x)));
 const requirements=reqs.map(req=>{
  const c=catalog.find(x=>x.id===req.id);const relevant=c?sentences.filter(x=>c.re.test(x)):[];
  const quote=relevant.find(x=>!PROFILE_SUMMARY.test(x)&&(c.specificity==='credential'?/\b(?:holds?|obtained|awarded|qualified|completed|certified)\b/i.test(x):ACTION.test(x)));
  const partial=quote?null:relevant.find(x=>c.specificity!=='credential'&&PROFILE_SUMMARY.test(x));
  return {...req,status:quote?'demonstrated':partial?'partial':'unknown',evidence:quote||partial||null,cv_evidence:quote||partial||null,evidence_basis:quote?'performed action':partial?'general self-description; needs a specific example':'no demonstrated evidence'};
 });
 const wordCount=String(v.description||'').trim().split(/\s+/).filter(Boolean).length;const evidence= requirements.filter(x=>x.status==='demonstrated').length,coverage=requirements.length?evidence/requirements.length:0;
 const missing=[];if(wordCount<65)missing.push('Detailed description');if(requirements.length<3)missing.push('Enough classifiable requirements');if(!reqs.some(x=>x.importance==='essential'))missing.push('Explicit essential criteria');if(!v.location)missing.push('Structured location');if(!v.contract_type)missing.push('Structured contract');if(v.salary_min==null&&v.salary_max==null)missing.push('Structured salary');
 const completeness=Math.min(1,(wordCount>=65?.3:0)+(requirements.length>=3?.25:0)+(reqs.some(x=>x.importance==='essential')?.15:0)+(v.location?.1:0)+(v.contract_type?.1:0)+(v.salary_min!=null||v.salary_max!=null?.1:0));
 const gaps=requirements.filter(x=>x.importance==='essential'&&x.status!=='demonstrated').map(x=>({id:x.id,label:x.label,status:'unknown',severity:x.specificity==='unclassified'?'manual review':x.specificity==='generic'?'evidence':'critical',source:x.source}));
 const critical=gaps.filter(x=>x.severity==='critical');const total=requirements.reduce((n,x)=>n+x.weight,0);let score=total?Math.round(100*requirements.filter(x=>x.status==='demonstrated').reduce((n,x)=>n+x.weight,0)/total):null;
 // Missing expected role-family capabilities affect denominator, never invent source requirements.
 const expected=/\b(?:course|training|learning)\b/i.test(v.title||'')?['courses','scheduling','participants','records','stakeholders']:/\b(?:admin(?:istrat(?:or|ion|ive))?|coordinator|assistant|support|pa)\b/i.test(v.title||'')?['records','documentation','stakeholders']:[];
 const expectedMissing=expected.filter(id=>!requirements.some(x=>x.id===id));const denominator=total+expectedMissing.length*2;
 if(score!==null)score=Math.round(100*requirements.filter(x=>x.status==='demonstrated').reduce((n,x)=>n+x.weight,0)/denominator);
 if(score!==null&&coverage<.5)score=Math.min(score,70);if(score!==null&&critical.length)score=Math.min(score,59);
 let confidence=gate.status==='unknown'||wordCount<145||requirements.length<4||critical.length?'Low':'Medium';
 let decision=score!==null&&score>=70?(gaps.length?'Apply with tailoring':'Apply'):'Investigate';
 if(confidence==='Low'&&decision==='Apply')decision='Apply with tailoring';
 if(critical.length||requirements.some(x=>x.uncatalogued)||gate.checks.some(x=>x.status==='unknown'&&x.name!=='Closing date'))decision='Investigate';
 if(wordCount<65||requirements.length<3||completeness<.5||coverage<.3||!cv.trim()){score=null;decision='Not assessable';confidence='Low';}
 const summaryOnly=v.description_kind==='summary'||v.full_description===false;
 if(summaryOnly){score=null;decision='Investigate — full advert needed';confidence='Low';missing.unshift('Full original advert including requirements');}
 if(gate.status==='ineligible'){score=null;decision='Skip';}
 const assessmentReasons=[];if(requirements.length<3)assessmentReasons.push('Too few classifiable requirements to support a numeric assessment.');if(wordCount<65)assessmentReasons.push('Insufficient original advert detail.');if(coverage<.3)assessmentReasons.push('Too little demonstrated evidence for the detected requirements.');if(!cv.trim())assessmentReasons.push('No evidence profile supplied.');if(completeness<.5)assessmentReasons.push('Advert completeness is below the assessment threshold.');if(requirements.some(x=>x.uncatalogued))assessmentReasons.push('Published requirements need manual review.');if(gate.status==='unknown')assessmentReasons.push('Eligibility facts remain unknown.');
 const expectedDetails=expectedMissing.map(id=>({id,label:catalog.find(x=>x.id===id).label,reason:'Expected role-family category not found in extracted advert requirements; not a candidate deficit or a published essential.'}));
 const verificationActions=gate.checks.filter(x=>x.status==='unknown').map(x=>({criterion:x.name,action:x.name==='Contract duration'?`Confirm permanent employment or a guaranteed contract of at least ${Number(p.minContractMonths)} months; a possible extension is insufficient.`:x.name==='Salary floor'?'Confirm the published base salary, paid hours and whether the amount is an estimate.':x.name==='Closing date'?'Check the original vacancy is still accepting applications and confirm any deadline.':x.name==='Location'?'Verify the workplace, commute and attendance pattern against your preferences.':'Verify this eligibility fact with the original source.'}));
 const tailoringActions=requirements.filter(x=>x.status==='demonstrated').map(x=>({criterion:x.label,what_to_evidence:'Use this existing example to address the quoted duty; do not claim broader expertise.',evidence:x.evidence,source:x.source}));
 const contextual_fit={status:'disabled',signals:[],reason:'Context does not change candidate fit or eligibility.'};
 return {version:MODEL_VERSION,engine_version:MODEL_VERSION,evaluation_date:date,fit_score:score,band:score===null?'Not assessable':score>=80?'Strong':score>=60?'Moderate':'Weak',decision,eligibility:{status:gate.status,reasons:gate.reasons},hard_constraints:gate.checks,advert_completeness:{score:Number(completeness.toFixed(2)),missing},confidence:{label:confidence,reason:summaryOnly?'Provider summary only; open the original and supply the full advert before fit scoring.':assessmentReasons.length?assessmentReasons.join(' '):critical.length?'Specialist essential evidence remains unverified.':wordCount<145?'Limited advert detail.':'Published requirement coverage; rules are not outcome-calibrated.'},requirements,screening_evidence:{criteria:requirements},critical_evidence_gaps:gaps,evidence_coverage:{evidenced:evidence,total:requirements.length,ratio:coverage},expected_capability_gaps:expectedMissing,expected_capability_details:expectedDetails,verification_actions:verificationActions,decision_reason:decision==='Skip'?'A configured hard constraint is not met.':decision==='Not assessable'?assessmentReasons.join(' '):decision.startsWith('Investigate')?verificationActions.length?'Resolve the listed checks before deciding whether to apply.':'Review the listed evidence or requirement uncertainties before deciding whether to apply.':decision==='Apply with tailoring'?'Relevant evidence was detected; address the listed checks and tailor with the cited examples.':'Detected requirements have evidence and configured eligibility checks pass; the final decision is yours.',tailoring_examples:tailoringActions,tailoring_prompts:gaps.filter(x=>x.severity!=='critical').map(x=>({criterion:x.label,what_to_evidence:'Provide an accurate example if you have one; do not invent experience.'})),contextual_fit,assessment_scope:{classified:requirements.filter(x=>!x.uncatalogued).length,manual_review:requirements.filter(x=>x.uncatalogued).map(x=>x.source),demonstrated:evidence,unknown:requirements.filter(x=>x.status==='unknown').length,partial:requirements.filter(x=>x.status==='partial').length,complete_job_coverage:false},score_meaning:'Evidence coverage within detected capability categories only; not overall job suitability or hiring probability. Full requirement extraction is not guaranteed.',limitations:['Limited rule catalogue; uncatalogued requirements need human review.','Scores are provisional and uncalibrated.','Structured salary/location/contract facts require verified input; absent facts are not inferred.']};
}
export function compareResults(a,b){const rank={High:2,Medium:1,Low:0};const skipped=Number(a.decision==='Skip')-Number(b.decision==='Skip');return skipped||(rank[b.confidence?.label]??0)-(rank[a.confidence?.label]??0)||(b.fit_score??-1)-(a.fit_score??-1);}
export function addIntelligence(result,{enabled=false,observations=[]}={}){const signals=enabled?observations.filter(x=>/^https:\/\//.test(x.source||'')&&parseDate(x.captured_at)&&typeof x.note==='string').map(x=>({source:x.source,captured_at:x.captured_at,note:x.note})):[];return {...result,contextual_fit:{status:!enabled?'disabled':signals.length?'sourced_notes':'unknown',signals,reason:'Research notes only; no automatic fit or decision adjustment. Small or unknown employers receive no penalty.'}};}
// A user's review is an auditable judgement, not an application submission or an automatic training label.
export function createReviewRecord({vacancyId,sourceUrl,decision,rationale='',engineVersion=MODEL_VERSION,reviewedAt}){
 if(!['apply','skip','investigate'].includes(decision))throw Error('Invalid human decision');
 if(!vacancyId&&!sourceUrl)throw Error('Source identity required');if(!reviewedAt||!Number.isFinite(Date.parse(reviewedAt)))throw Error('Explicit review timestamp required');
 return {vacancy_id:vacancyId||null,source_url:sourceUrl||null,human_decision:decision,rationale:String(rationale),engine_version:engineVersion,reviewed_at:reviewedAt,application_submitted:false,used_for_automatic_tuning:false};
}

// Vacancy-only extraction for explanatory comparisons; no profile or score involved.
export function describeVacancy(vacancy={}){return extract(vacancy.description,vacancy.title||'').filter(x=>!x.derived_from_title);}
