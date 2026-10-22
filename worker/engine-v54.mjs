// Pure offline engine. No clock, storage or network. Versioned separately from historical engines.
// V5.5.0 separates five things that V5.4.x conflated:
//   1. source completeness      (is this the full advert?)
//   2. extraction coverage       (which source units became requirements, conditions or exclusions)
//   3. automated matching coverage (how much requirement weight the engine can actually check)
//   4. candidate evidence         (CV quote / partial / self-attested / not found / explicit absence)
//   5. eligibility                (hard constraints and pre-employment conditions)
// Engine limitations are never reported as candidate shortcomings.
export const MODEL_VERSION='5.5.1';
const MONTHS=['january','february','march','april','may','june','july','august','september','october','november','december'];
const day=(y,m,d)=>{const dt=new Date(Date.UTC(y,m-1,d));return dt.getUTCFullYear()===y&&dt.getUTCMonth()===m-1&&dt.getUTCDate()===d?`${y}-${String(m).padStart(2,'0')}-${String(d).padStart(2,'0')}`:null;};
export function parseDate(value){
 const s=String(value??'').trim().replace(/^(?:mon|tues|wednes|thurs|fri|satur|sun)day,?\s+/i,'').replace(/,/g,' ').replace(/\s+/g,' ');
 let m=s.match(/^(\d{4})-(\d{2})-(\d{2})$/);if(m)return day(+m[1],+m[2],+m[3]);
 m=s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);if(m)return +m[1]<=12&&+m[2]<=12?null:day(+m[3],+m[2],+m[1]);
 m=s.match(/^(\d{1,2})(?:st|nd|rd|th)?\s+([a-z]+)\s+(\d{4})$/i);if(!m)return null;
 const month=MONTHS.findIndex(x=>x===m[2].toLowerCase()||x.slice(0,3)===m[2].toLowerCase());return month<0?null:day(+m[3],month+1,+m[1]);
}
const ACTION=/\b(?:coordinat(?:e|ed|es|ing)|manag(?:e|ed|es|ing)|maintain(?:ed|s|ing)?|reconcil(?:e|ed|es|ing)|prepar(?:e|ed|es|ing)|support(?:ed|s|ing)?|develop(?:ed|s|ing)?|implement(?:ed|s|ing)?|deliver(?:ed|s|ing)?|liais(?:e|ed|es|ing)|organis(?:e|ed|es|ing)|organiz(?:e|ed|es|ing)|led|supervis(?:e|ed|es|ing)|produc(?:e|ed|es|ing)|respond(?:ed|s|ing)?|administ(?:er|ered|ers|ering)|schedul(?:e|ed|es|ing)|built|designed|designing|creat(?:e|ed|es|ing)|author(?:ed|s|ing)|facilitat(?:e|ed|es|ing)|launch(?:ed|es|ing)?|ran|running|trained|coach(?:ed|es|ing)|mentor(?:ed|s|ing)|evaluat(?:e|ed|es|ing)|analys(?:e|ed|es|ing)|migrat(?:e|ed|es|ing)|configur(?:e|ed|es|ing)|curat(?:e|ed|es|ing)|wrote|written|introduc(?:e|ed|es|ing)|establish(?:ed|es|ing)?|rolled out|administered)\b/i;
const PROFILE_SUMMARY=/^(?:an? experienced\b|experienced (?:in|at|with)\b|brings?\b|skilled (?:in|at)\b|professional (?:with|in)\b|[^.!?]{0,100}\bprofessional with\b)/i;
const NEG=/\b(?:no|not|never|without|lack\w*|do not|don't|cannot|not yet)\b/i;
// Outcome phrases such as "no backlog" are positive evidence, not negation of the duty.
const POSITIVE_NEG=/\b(?:no|zero|without)\s+(?:backlogs?|errors?|complaints?|delays?|issues?|missed \w+|breaches?|incidents?|escalations?|downtime|disruption)\b/gi;
// Credential evidence that is not currently held.
const LAPSED=/\b(?:expired|suspended|revoked|lapsed|not valid|invalid|not yet (?:completed|obtained|awarded)|studying (?:for|towards)|working towards|in progress|pending)\b/i;
const CLAUSE_SPLIT=/[,;:()]|\s[-–—]\s|\b(?:but|although|however|whereas|while)\b/i;
const catalog=[
 ['courses','Course / training administration',/\b(?:courses?|training|learning operations?|seminars?|workshops?)\b/i],
 ['scheduling','Scheduling',/\b(?:schedul\w*|timetabl\w*|room bookings?|calendar)\b/i],
 // "attend meetings" is not participant administration.
 ['participants','Participant administration',/\b(?:participant\w*|registration\w*|delegate\w*|attendees?|attendance (?:records?|registers?|lists?|monitoring|tracking)|learner\w*)\b/i],
 ['suppliers','Instructor / supplier coordination',/\b(?:instructor\w*|supplier\w*|vendor\w*|trainer\w*|external (?:\w+ )?providers?|(?:external |third.party )?training providers?)\b/i],
 ['excel','Excel / spreadsheets',/\b(?:excel|spreadsheets?|pivot tables?|vlookup|xlookup)\b/i],
 ['records','Records / data quality',/\b(?:records?|files?|data accuracy|data quality|reconcil\w*|validat\w*)\b/i],
 // "Reporting to the Office Manager" describes a reporting line, not a reporting duty.
 ['reporting','Operational reporting',/\b(?:report\w*|dashboards?|kpis?)\b/i,'generic',/\b(?:reporting (?:directly )?(?:in)?to|reports? (?:directly )?(?:in)?to|report into|reporting lines?)\b/gi],
 ['word','Microsoft Word',/\b(?:ms |microsoft )?word\b(?! of mouth)/i],
 ['powerpoint','Microsoft PowerPoint',/\bpowerpoint\b/i],
 ['outlook','Microsoft Outlook',/\b(?:ms |microsoft )?outlook\b/i],
 ['documentation','Documentation',/\b(?:documents?|documentation|procedures?|meeting notes|minutes|process documentation)\b/i],
 ['projects','Project support',/\b(?:project coordination|programme coordination|action logs?|milestones?|dependencies|pmo)\b/i],
 ['stakeholders','Stakeholder / client support',/\b(?:stakeholders?|customer service|client support|customer quer\w*|liais\w*)\b/i],
 // "manage the team diary/inbox" is not line management.
 ['people','Line management',/\b(?:line manag\w*|people management|direct reports?|staff supervision|manag(?:e|es|ed|ing) (?:a |the |small )?team(?!\s+(?:diar(?:y|ies)|inbox(?:es)?|calendars?|mailbox(?:es)?|meetings?|schedules?|rotas?|emails?|events?|budgets?|travel|admin\w*|drive|folders?))|supervis\w* staff)\b/i,'specialist'],
 ['developer','Software development',/\b(?:software develop\w*|software engineer\w*|lead developer|c#|dynamics 365|\.net\b|power platform)\b/i,'specialist'],
 ['surveying','Building surveying',/\b(?:building survey\w*|building defects?|rics|ciob)\b/i,'specialist'],
 // "support tender documentation" is not procurement ownership.
 ['procurement','Procurement ownership',/\b(?:procurement officer|category management|public procurement|tender(?:ing| management| evaluation| process\w*)|(?:open|run|running|manag\w*|lead\w*) tenders?|cips)\b/i,'specialist'],
 ['accounting','Accounting / finance qualification',/\b(?:acca|cima|aat|chartered accountant|qualified accountant)\b/i,'specialist'],
 ['cipd','CIPD qualification',/\bcipd\b/i,'credential'],
 ['driving','Driving licence',/\b(?:driving licen[cs]e|driver.?s licen[cs]e)\b/i,'credential'],
 ['moodle','Moodle',/\bmoodle\b/i,'specialist'],
 // L&D / training-provider categories (added for the owner's target sectors).
 ['lms','Learning management system (LMS)',/\b(?:lms|learning management systems?|learning platforms?|moodle|totara|cornerstone|docebo|canvas (?:lms|by instructure)|instructure|blackboard (?:learn|lms|ultra)|workday learning|successfactors learning|360learning|talentlms|learnupon|absorb lms|lxp|learning experience platforms?|degreed|vle|virtual learning environments?|veeva vault|saba)\b/i],
 ['accreditation','Accreditation / awarding body / certification',/\b(?:accredit\w*|awarding bod(?:y|ies)|certificat(?:ion|es) (?:admin\w*|process\w*|issu\w*|requests?)|ofqual|city (?:&|and) guilds|ncfe|ilm)\b/i],
 ['evaluation','Training evaluation / learner feedback',/\b(?:training evaluations?|course evaluations?|evaluation (?:forms?|data|reports?)|(?:delegate|learner|participant|course) feedback|feedback (?:forms?|surveys?)|post.course)\b/i],
 ['compliance_training','Mandatory / compliance training records',/\b(?:mandatory training|compliance training|statutory training|training matrix|training compliance)\b/i],
 ['sql','Advanced SQL / DAX',/\b(?:advanced sql|advanced dax|sql development|database engineer\w*)\b/i,'specialist'],
 ['zoo','Animal husbandry',/\b(?:zookeep\w*|animal husbandry|dmzaa)\b/i,'specialist'],
 // Case-sensitive COTS: nursery "cots" are not cemetery certification.
 ['cemetery','Cemetery machinery certification',/\b(?:[Cc]emetery [Oo]perativ\w*|360 digger)\b|\bCOTS\b/,'specialist'],
 ['research','Researcher development',/\b(?:researcher development|doctoral training|vitae framework)\b/i,'specialist'],
 ['housing','Housing legislation',/\b(?:housing legislation|homelessness legislation|housing options|landlord statutory compliance)\b/i,'specialist']
].map(([id,label,re,specificity='generic',exclude=null])=>({id,label,re,specificity,exclude}));
const stripExcluded=(c,s)=>c.exclude?String(s).replace(c.exclude,' '):String(s);
const catMatch=(c,s)=>c.re.test(stripExcluded(c,s));
// Vacancy side: a category mention preceded by negation inside its clause ("no direct reports") is not a requirement.
function negatedMention(c,line){const t=stripExcluded(c,line);const clause=t.split(CLAUSE_SPLIT).find(x=>c.re.test(x));if(!clause)return false;const idx=clause.search(c.re);return NEG.test(clause.slice(0,idx));}
// CV side: negation anywhere in the clause carrying the term blocks it; outcome phrases do not.
function cvNegated(c,sentence){const t=stripExcluded(c,sentence).replace(POSITIVE_NEG,' ');const clause=t.split(CLAUSE_SPLIT).find(x=>c.re.test(x));return clause?NEG.test(clause):true;}
const units=s=>String(s||'').replace(/<[^>]*>/g,' ').replace(/\r/g,'\n').split(/\n+|(?<=[.!?;])\s+|(?<=[a-z0-9)][.!?])(?=[A-Z])/).map(s=>s.trim()).filter(Boolean);
// Retain every source unit; category coverage is distinct from full semantic coverage.
const sourceUnits=text=>String(text||'').replace(/<(?:br\b[^>]*|\/(?:p|div|li|h[1-6]|tr))>/gi,'\n').replace(/<[^>]*>/g,' ').replace(/\r/g,'\n').split(/\n+|[•●▪]|(?<=[.!?;])\s+|(?<=[a-z0-9)][.!?])(?=[A-Z])/).map(x=>x.trim()).filter(Boolean);
const DUTY_ACTION=/\b(?:support(?:ing)?|creat\w*|updat\w*|process\w*|review\w*|monitor\w*|handl\w*|cover\w*|assist\w*|check\w*|administration|responsib\w*)\b/i;
const facets=[
 ['payroll_support','Payroll queries / document liaison (scope to verify)',/\bpayroll\b/i],
 ['recruitment','Recruitment administration',/\brecruitment\b/i],
 ['onboarding','Employee onboarding / induction',/\b(?:onboarding|new starters?|new employees?|induction)\b/i],
 ['employment_changes','Employment changes / leavers',/\b(?:employment changes|leavers?|maternity|paternity|changes to (?:employment|contracts?))\b/i],
 ['hr_records','HR / personnel records',/\b(?:hr (?:paper )?files?|personnel (?:files?|records?)|employee records?)\b/i],
 ['workforce_compliance','Workforce / operational compliance checks',/\b(?:compliance checks?|workforce compliance)\b/i],
 ['er_processes','Employee relations processes',/\b(?:internal er|employee relations)\b/i],
 ['contract_paperwork','Employment contract paperwork',/\b(?:variation to contract|contract (?:variation|paperwork))\b/i],
 ['named_systems','Named systems / platforms',/\b(?:[Uu]nit4|[Hh]oneydew)\b|\b[A-Z][a-z]+[A-Z][A-Za-z0-9]+\b.{0,30}\b(?:systems?|platforms?)\b/],
 ['confidentiality','Confidentiality / information security',/\b(?:confidentiality|information security|data protection)\b/i],
 ['reception','Reception / front desk',/\b(?:reception|front desk)\b/i],
 ['admin_experience','Stated administrative / secretarial experience',/\b(?:secretarial|administration|administrative)\b.{0,30}\bexperience\b/i],
 ['general_skills','Organisation / communication / time management',/\b(?:organisational|organizational|communication|time management|prioritis\w*|prioritiz\w*)\b/i]
];
// Pre-employment conditions are detected in EVERY section (including About us / benefits / EO text).
// They are neither CV-matchable skills nor candidate deficits: the candidate confirms them.
const CONDITIONS=[
 ['condition_dbs','Criminal record check (DBS / disclosure)',/\b(?:dbs|disclosure and barring|criminal (?:record|background) checks?|(?:basic|standard|enhanced) disclosure|pvg)\b/i],
 ['condition_safeguarding','Safeguarding responsibility / safer recruitment',/\b(?:safeguard\w*|safer recruitment)\b/i],
 ['condition_right_to_work','Right to work / immigration status',/\b(?:right to work|eligib\w* to work|work permit|visa sponsorship)\b/i],
 ['condition_clearance','Security clearance / vetting',/\b(?:security clearance|vetting|bpss|counter.terroris[mt] check|sc clearance|dv clearance|nppv|airside pass)\b/i],
 ['condition_references','Pre-employment references',/\b(?:satisfactory references?|(?:two|2) references|reference checks?|employment references?)\b/i],
 ['condition_health','Occupational health / medical clearance',/\b(?:occupational health (?:check|clearance|assessment|questionnaire)|medical (?:check|assessment|clearance|questionnaire))\b/i]
];
// A condition is retained when the unit states it applies to candidates/staff (not a bare employer slogan).
const CONDITION_OBLIGATION=/\b(?:all (?:candidates|applicants|staff|employees|appointments|posts|roles)|(?:the )?successful (?:candidate|applicant)|you (?:will|must|are|would|need)|subject to|condition of (?:employment|appointment|your)|required?|requirement|must|expects? (?:all|every)|undertak\w*|share (?:this|the|our|their|its|the council.s) commitment|responsibilit\w*|follows safer recruitment)\b/i;
// Candidate obligations inside employer/benefits sections are retained, not silently excluded.
const CANDIDATE_MUST=/\b(?:you|candidates?|applicants?|the successful (?:candidate|applicant)|all staff)\b[^.!?]{0,60}\b(?:must|will need to|need to have|are required to|will be required to|should have|should hold)\b/i;
const EO=/\b(?:we (?:encourage|welcome) applications|applications from all backgrounds|equal opportunit(?:y|ies)|reasonable adjustments|fair (?:recruitment )?process|disability confident)\b/i;
const WAIVED=/\b(?:not (?:required|necessary|needed)|(?:do|does|will) not need|don'?t need|no need (?:for|to)|no (?:previous |prior |formal )?(?:[\w-]+ ){0,4}(?:experience|qualifications?|degree)s? (?:is |are )?(?:required|needed|necessary))\b/i;
const DESIRABLE=/\b(?:desirable|preferred|advantageous|an advantage|(?:would be|is|are) (?:an? )?(?:plus|bonus|asset|helpful|useful|beneficial)|ideally|beneficial|not essential|nice to have|desired)\b/i;
const ESSENTIAL=/\b(?:essential|must|minimum (?:of \d|\d|requirements?|qualifications?|criteria|experience)|proven experience)\b|\b(?:you (?:are |will be )?required to|required (?:skills|experience|qualifications)|requirements? include)\b|\b(?:experience|qualification|licen[cs]e|certificate|degree|knowledge|skills)\b.{0,60}\b(?:is |are )?required\b/i;
export function extractVacancyRequirements(text,title=''){
 const matched=new Map(),audit=[];let section='context',tier='context';
 const rank={context:0,desirable:1,essential:2};
 const add=(req,unit)=>{const old=matched.get(req.id),ref={unit_id:unit.unit_id,text:unit.source,section:unit.section};
  if(old){if(!old.sources.some(x=>x.text===ref.text))old.sources.push(ref);if(rank[req.importance]>rank[old.importance])Object.assign(old,{...req,sources:old.sources});}
  else matched.set(req.id,{...req,sources:[ref]});
  if(!unit.requirement_ids.includes(req.id))unit.requirement_ids.push(req.id);
 };
 const lines=sourceUnits(text);
 for(let i=0;i<lines.length;i++){
  const line=lines[i],heading=line.replace(/[’‘]/g,"'").replace(/^#{1,6}\s+|^[-*]\s+/,'').replace(/[:.]+$/,'').trim();
  const unit={unit_id:`unit-${i+1}`,source:line,section,disposition:'context_unreviewed',reason:'Context text; no reliable requirement boundary identified.',requirement_ids:[]};audit.push(unit);
  const setHeading=(next,nextTier,reason)=>{section=next;tier=nextTier;Object.assign(unit,{section,disposition:'heading',reason});};
  if(/^(?:essential(?: criteria| requirements| skills)?|what (?:we need|you need)|minimum requirements|must.have|to be successful.*you (?:will|must|should) have|what you(?:'ll| will) (?:need|bring)|person specification|(?:key )?requirements|skills and experience|what we(?:'re| are) looking for|about you)$/i.test(heading)){setHeading('criteria','essential','Candidate criteria heading');continue;}
  if(/^(?:desirable(?: criteria| requirements| skills)?|preferred|nice.to.have)$/i.test(heading)){setHeading('criteria','desirable','Desirable criteria heading');continue;}
  if(/^(?:responsibilities|(?:key |main )?duties|(?:key |main )?responsibilities|the role|(?:as .{1,90} )?you (?:will|would) (?:be|do|be responsible for)|your responsibilities|your role|about the role|what you(?:'ll| will) (?:do|be doing)|you will|\[SUPPLEMENT.*)$/i.test(heading)){setHeading('duties','context','Published duties heading');continue;}
  if(/^(?:benefits|what we offer|what you(?:'ll| will) get|rewards|our offer)$/i.test(heading)){setHeading('benefits','context','Employer benefits heading');continue;}
  if(/^(?:where you (?:will|would) be working|location|about (?:us|the company|the service|the employer)|how to apply|application process)$/i.test(heading)){setHeading('employer_context','context','Employer/location/application context heading');continue;}
  // New: screening/additional-information headings reset any previous employer/benefits section.
  if(/^(?:safeguarding(?: statement)?|pre.employment (?:checks|screening)|vetting|screening|additional information|important information|please note|other information|eligibility|right to work|disclosure(?: and barring)?)$/i.test(heading)){setHeading('additional','context','Screening / additional-information heading');continue;}
  // 1. Pre-employment conditions: checked in every section, before any exclusion.
  const conditionHits=CONDITION_OBLIGATION.test(line)?CONDITIONS.filter(([, ,re])=>re.test(line)):[];
  for(const [id,label] of conditionHits)add({id,label,importance:'essential',tier:'essential',weight:0,source:line,specificity:'condition',match_mode:'condition',importance_basis:'Candidate pre-employment condition stated in '+(section==='context'?'advert text':section.replace('_',' ')+' section')},unit);
  // 2. Mixed statements: drop EO / waived clauses but keep any remaining candidate obligation.
  const clauses=line.split(/;|\bbut\b|\bhowever\b/i).map(x=>x.trim()).filter(Boolean);
  const kept=clauses.filter(c=>!EO.test(c)&&!WAIVED.test(c));
  const effective=kept.join(' ; ');
  const mixed=kept.length&&kept.length<clauses.length;
  if(!kept.length||(!mixed&&(EO.test(line)||WAIVED.test(line)))){
   if(conditionHits.length){Object.assign(unit,{disposition:'condition',reason:'Pre-employment condition retained from a statement that also contains employer/waiver wording.'});continue;}
   Object.assign(unit,{disposition:'excluded',reason:WAIVED.test(line)?'Requirement explicitly waived; not evidence of candidate inability':'Employer recruitment/accessibility statement'});continue;
  }
  const candidateObligation=CANDIDATE_MUST.test(effective);
  if((section==='benefits'||section==='employer_context')&&!candidateObligation){
   if(conditionHits.length){Object.assign(unit,{disposition:'condition',reason:'Pre-employment condition retained from employer/benefits section.'});continue;}
   Object.assign(unit,{disposition:'excluded',reason:section==='benefits'?'Employer benefit; not a candidate requirement':'Employer/location/application context'});continue;
  }
  const trainingBenefit=/\b(?:training opportunities|training (?:is |will be )?provided|full training|(?:receive|given|offer\w*) (?:full |comprehensive |ongoing |on.the.job )?training|on.the.job training|career (?:development|progression)|rewarding career)\b/i.test(effective)&&!/\b(?:deliver|coordinate|administer|organise|manage)\w*\s+(?:the |staff |employee )?training\b/i.test(effective);
  const candidateSkill=/\b(?:experience|skills|knowledge|qualification|degree|gcse|confidentiality)\b/i.test(effective);
  if(trainingBenefit&&!candidateSkill&&!candidateObligation){Object.assign(unit,{disposition:conditionHits.length?'condition':'excluded',reason:'Training / career development offered by employer'});continue;}
  const explicitDesirable=DESIRABLE.test(effective);
  const explicitEssential=ESSENTIAL.test(effective.replace(/\bas required\b/gi,''))||candidateObligation;
  const importance=explicitDesirable?'desirable':explicitEssential?'essential':tier;
  const shortHeading=section!=='criteria'&&line.split(/\s+/).length<=3&&!ACTION.test(line)&&!DUTY_ACTION.test(line)&&!catalog.some(c=>c.specificity!=='generic'&&catMatch(c,line))&&!explicitEssential;
  if(shortHeading){
   if(section==='duties'){
    add({id:'ambiguous_'+line.toLowerCase().replace(/[^a-z0-9]+/g,'_'),label:'Ambiguous duty — clarify scope',importance:'context',tier:'context',weight:2,source:line,specificity:'unclassified',uncatalogued:true,match_mode:'manual'},unit);
    Object.assign(unit,{disposition:'manual_review',reason:'Short duty/heading retained for clarification; no competence inferred.'});
   }else if(!conditionHits.length)Object.assign(unit,{disposition:'context_unreviewed',reason:'Short ambiguous heading; confirm whether it represents a duty'});
   continue;
  }
  const negated=catalog.filter(c=>catMatch(c,effective)&&negatedMention(c,effective));
  const known=catalog.filter(c=>catMatch(c,effective)&&!negated.includes(c)&&!(trainingBenefit&&c.id==='courses'));
  const relevant=section==='duties'||section==='criteria'||explicitEssential||known.length>0||ACTION.test(effective)||DUTY_ACTION.test(effective)||candidateSkill||facets.some(([, ,re])=>re.test(effective));
  if(!relevant){if(conditionHits.length)Object.assign(unit,{disposition:'condition',reason:'Pre-employment condition retained.'});continue;}
  const basis=candidateObligation&&(section==='benefits'||section==='employer_context')?'Candidate obligation stated inside employer/benefits section':explicitEssential?'Explicit candidate obligation':explicitDesirable?'Explicit desirable wording':section==='criteria'?'Candidate criteria heading':'Duty / contextual wording';
  const common={importance,tier:importance,weight:importance==='essential'?3:importance==='desirable'?1:2,source:line,importance_basis:basis};
  for(const c of known)if(!(c.id==='lms'&&known.some(k=>k.id==='moodle')&&!/\b(?:lms|learning management|learning platform|totara|cornerstone|docebo|instructure|blackboard (?:learn|lms|ultra))\b/i.test(effective)))add({...common,id:c.id,label:c.label,specificity:c.specificity,match_mode:'automated'},unit);
  const credential=/\b(?:degree|qualification|licen[cs]e|certificat\w*|professional registration|gcses?|a.levels?)\b/i.test(effective)&&!known.some(c=>c.specificity==='credential');
  if(credential)add({...common,id:'credential_'+line.toLowerCase().replace(/[^a-z0-9]+/g,'_'),label:'Stated qualification / credential — verify full condition',specificity:'credential',uncatalogued:true,match_mode:'manual'},unit);
  for(const [id,label,re] of facets)if(re.test(effective)&&!(id==='onboarding'&&known.some(k=>k.id==='ld_onboarding_programmes')))add({...common,id:'manual_'+id,label,specificity:'unclassified',uncatalogued:true,match_mode:'manual'},unit);
  const candidateIds=unit.requirement_ids.filter(id=>!id.startsWith('condition_'));
  if(!candidateIds.length&&!conditionHits.length)add({...common,id:'unclassified_'+line.toLowerCase().replace(/[^a-z0-9]+/g,'_'),label:'Published duty / criterion — manual review',specificity:'unclassified',uncatalogued:true,match_mode:'manual'},unit);
  const ids=unit.requirement_ids.filter(id=>!id.startsWith('condition_'));
  Object.assign(unit,{disposition:!ids.length?'condition':ids.some(id=>matched.get(id)?.uncatalogued)?'manual_review':'classified',reason:(mixed?'Mixed statement: employer/waiver clause set aside, candidate obligation retained. ':'')+(negated.length?`Negated mention not treated as a requirement: ${negated.map(c=>c.label).join(', ')}. `:'')+'Source retained. Category matches do not certify complete interpretation of every clause.'});
 }
 for(const c of catalog.filter(x=>x.specificity==='specialist'))if(c.re.test(title)&&!matched.has(c.id))matched.set(c.id,{id:c.id,label:c.label,importance:'essential',tier:'essential',weight:3,specificity:c.specificity,match_mode:'automated',source:title,sources:[{unit_id:'title',text:title,section:'title'}],derived_from_title:true});
 // "Accounts Payable" no longer implies an ACCA/CIMA qualification.
 const roleCore=[['developer',/\b(?:developer|software engineer)\b/i],['surveying',/\bsurveyor\b/i],['procurement',/\bprocurement officer\b/i],['accounting',/\baccountant\b/i],['zoo',/\bzookeeper\b/i],['cemetery',/\bcemeteries|cemetery\b/i],['research',/\bresearcher development\b/i]];
 for(const [id,re] of roleCore)if(re.test(title)){const c=catalog.find(x=>x.id===id),old=matched.get(id);matched.set(id,{...old,id,label:c.label,importance:'essential',tier:'essential',weight:3,specificity:'specialist',match_mode:'automated',source:old?.source||title,sources:old?.sources||[{unit_id:'title',text:title,section:'title'}],derived_from_title:true,interpretation:'Core occupational relevance inferred from title; detailed employer criteria require verification.'});}
 const count=d=>audit.filter(x=>x.disposition===d).length;
 return {requirements:[...matched.values()],audit,summary:{source_units:audit.length,classified_units:count('classified'),manual_review_units:count('manual_review'),condition_units:count('condition'),excluded_units:count('excluded'),context_unreviewed_units:count('context_unreviewed'),heading_units:count('heading'),semantic_completeness:'unverified'}};
}
function extract(text,title){return extractVacancyRequirements(text,title).requirements;}
export const isAutomatedRequirement=r=>r.match_mode==='automated'||(!r.uncatalogued&&!String(r.id).startsWith('condition_'));

function closingDate(v){
 if(v.closing_date!==undefined&&v.closing_date!==null&&String(v.closing_date).trim())return {date:parseDate(v.closing_date),source:String(v.closing_date)};
 const matches=[...String(v.description||'').matchAll(/(?:closing date|close date|apply by|applications? (?:close|deadline)|closing)\s*[:\-]?\s*(?:Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday)?\s*[,]?\s*(\d{4}-\d{2}-\d{2}|\d{1,2}\/\d{1,2}\/\d{4}|\d{1,2}(?:st|nd|rd|th)?\s+[a-z]+\s+\d{4})/gi)];
 const dates=matches.map(m=>parseDate(m[1]));return {date:dates.length&&dates.every(x=>x&&x===dates[0])?dates[0]:null,source:matches.map(m=>m[0]).join('; ')||'Not supplied'};
}
// Published salary inside the advert text (e.g. "Annual base salary of £28,000"). Returned with its source passage.
export function salaryFromText(text){
 for(const u of units(text)){
  if(!/\b(?:salary|pay|paid|per annum|p\.?a\.?|annual|annum|per hour|an hour|hourly|ote|wage)\b|£\s?\d+(?:\.\d+)?k\b/i.test(u))continue;
  if(/\b(?:bonus|allowance|budget|turnover|revenue|funding|worth|grant|savings?|discounts?|relocation|referral|minimum wage|living wage)\b/i.test(u))continue;
  const m=u.match(/£\s?(\d{1,3}(?:,\d{3})+|\d+(?:\.\d{1,2})?)(k)?(?:\s*(?:-|–|—|to)\s*£?\s?(\d{1,3}(?:,\d{3})+|\d+(?:\.\d{1,2})?)(k)?)?/i);
  if(!m)continue;
  const n=(x,k)=>Number(String(x).replace(/,/g,''))*(k?1000:1);
  const min=n(m[1],m[2]),max=m[3]?n(m[3],m[4]||m[2]):min;
  if(!(min>0))continue;
  const hourly=/\b(?:per hour|an hour|hourly|p\/h|ph)\b/i.test(u)||max<200;
  return {min,max,period:hourly?'hour':'year',source:u};
 }
 return null;
}
function eligibility(v,p,date){
 const checks=[];const add=(name,status,source,extra={})=>checks.push({name,status,source,...extra});
 const nonJob=/\b(?:focus group|paid survey|research stud(?:y|ies))\b/i.test(v.title||'')&&/\b(?:panelists?|panellists?|participants?|earn up to|paid participation)\b/i.test((v.title||'')+' '+(v.description||''));
 if(nonJob)add('Genuine employment vacancy','not_met','Research participation / panel listing, not an employment vacancy');
 if(v.status==='closed'||/this (?:opportunity|vacancy|position) is closed to applications/i.test(v.description||''))add('Published vacancy status','not_met','Source explicitly states closed to applications');const close=closingDate(v);add('Closing date',!close.date?'unknown':close.date<date?'not_met':'supported',close.source);
 const floor=Number(p.salaryFloor||0);
 if(floor){
  let lo=v.salary_min==null||v.salary_min===''?NaN:Number(v.salary_min),hi=v.salary_max==null||v.salary_max===''?NaN:Number(v.salary_max),period=v.salary_period||null,origin='structured',passage=null;
  if(!Number.isFinite(lo)&&!Number.isFinite(hi)){const t=salaryFromText(v.description);if(t){lo=t.min;hi=t.max;period=t.period;origin='advert_text';passage=t.source;}}
  if(!period&&Number.isFinite(hi)&&hi>0&&hi<200)period='hour';
  const hours=Number(p.hoursPerWeek||0);
  if(period==='hour'&&hours){lo=lo*hours*52;hi=hi*hours*52;}
  const label=`Advertised: ${Number.isFinite(lo)?lo:'unknown'}–${Number.isFinite(hi)?hi:'unknown'}${period==='hour'&&!hours?' per hour':''}; floor ${floor}`+(origin==='advert_text'?` (from advert text: "${passage}")`:'');
  const status=v.salary_is_predicted===true?'unknown':period==='hour'&&!hours?'unknown':Number.isFinite(lo)&&lo>=floor?'supported':Number.isFinite(hi)&&hi<floor?'not_met':'unknown';
  add('Salary floor',status,label,{origin,period:period||'year'});
 }
 const min=Number(p.minContractMonths||0),type=String(v.contract_type||'');let months=Number(v.contract_months)||null;
 let weeks=null,textPermanent=false;
 if(!months){const text=String(v.description||'');const m=text.match(/\b(\d{1,2})[- ]months?\s*(?:temporary\s+)?(?:fixed.term|contract|ftc)|(?:fixed.term|contract|ftc)\s*(?:for\s*)?(\d{1,2})\s*months?/i);months=m?Number(m[1]||m[2]):null;
 const w=text.match(/(?:temporary|contract|fixed.term|initially)\s*[:,-]?\s*(?:(?:temporary|initially|for)\s*[:,]?\s*)*(\d{1,2})(?:\s*[-–—]\s*(\d{1,2}))?\s*weeks?/i);weeks=w?Math.max(Number(w[1]),Number(w[2]||w[1])):null;
 textPermanent=!type&&/\bpermanent\b/i.test(text)&&!/\b(?:temporary|fixed.term|ftc|maternity cover|interim|secondment)\b/i.test(text);
 }
 if(min){const permanent=/^permanent$/i.test(type.trim())||textPermanent;add('Contract duration',weeks&&weeks<min*4?'not_met':permanent?'supported':months?months<min?'not_met':'supported':'unknown',weeks?`Initially up to ${weeks} weeks; extension not guaranteed`:permanent?(type||'Permanent (from advert text)'):months?`${months} months`:type||'Not supplied');}
 if(v.location_eligible!==undefined)add('Location',v.location_eligible===true?'supported':v.location_eligible===false?'not_met':'unknown',v.location||'Not supplied');
 else if(p.requireLocationCheck)add('Location','unknown','Walking distance / approved area not verified');
 const status=String(v.history_status||p.history?.find(x=>(v.id&&(x.id===v.id||x.vacancy_id===String(v.id)))||(v.source_url&&x.source_url===v.source_url))?.status||'').toLowerCase();
 if(['applied','rejected','withdrawn','excluded'].includes(status))add('Previous application / exclusion','not_met',status);
 const state=checks.some(x=>x.status==='not_met')?'ineligible':checks.some(x=>x.status==='unknown')?'unknown':'eligible';return {status:state,reasons:checks.filter(x=>x.status!=='supported'),checks};
}
// Qualifiers attached to a requirement that a category-level CV quote does not prove.
const QUALIFIERS=[['advanced',/\badvanced\b/i],['expert',/\bexpert\b/i],['proficient',/\bproficien\w*\b/i],['in-depth',/\bin.depth\b/i],['extensive',/\bextensive\b/i],['chartered',/\bchartered\b/i],['macros / VBA',/\b(?:macros?|vba)\b/i],['Power Query',/\bpower query\b/i],['pivot tables',/\bpivot\b/i],['lookups',/\b[vx]lookups?\b/i],['senior',/\bsenior\b/i]];
function unverifiedQualifiers(c,req,evidence){
 // Qualifiers count only near the category mention (±80 chars), so one long unit cannot attach them to everything.
 const reqText=(req.sources||[{text:req.source}]).map(s=>stripExcluded(c,s.text)).flatMap(t=>{const out=[];const re=new RegExp(c.re.source,c.re.flags.includes('g')?c.re.flags:c.re.flags+'g');let m;while((m=re.exec(t))){out.push(t.slice(Math.max(0,m.index-80),m.index+m[0].length+80));if(!m[0].length)re.lastIndex++;}return out;}).join(' ');
 const missing=[];
 const toolGroups={lms:[['Totara',/\btotara\b/i],['Docebo',/\bdocebo\b/i],['Cornerstone',/\bcornerstone\b/i],['Moodle',/\bmoodle\b/i],['Canvas LMS',/\bcanvas lms\b/i],['Blackboard',/\bblackboard\b/i],['SuccessFactors',/\bsuccessfactors\b/i],['Workday Learning',/\bworkday learning\b/i]],ld_authoring_tools:[['Articulate Storyline',/\b(?:articulate(?: 360)?|storyline)\b/i],['Rise',/\b(?:rise 360|articulate rise)\b/i],['Canva',/\bcanva\b/i],['Camtasia',/\bcamtasia\b/i],['Loom',/\bloom\b/i],['Captivate',/\bcaptivate\b/i]]};
 const tools=(toolGroups[c.id]||[]).filter(([,re])=>re.test(reqText));
 const alternative=/\b(?:or|such as|for example|e\.g|equivalent|similar)\b/i.test(reqText);
 if(tools.length){if(alternative){if(!tools.some(([,re])=>re.test(evidence)))missing.push('Named platform or demonstrably equivalent experience — verify');}else for(const [label,re] of tools)if(!re.test(evidence))missing.push(label);}
 for(const [label,re] of QUALIFIERS)if(re.test(reqText)&&!re.test(evidence))missing.push(label);
 const lv=[...reqText.matchAll(/\blevel\s*(\d)\b/gi)].map(m=>+m[1]);if(lv.length){const have=[...evidence.matchAll(/\blevel\s*(\d)\b/gi)].map(m=>+m[1]);if(!have.length||Math.max(...have)<Math.max(...lv))missing.push('Level '+Math.max(...lv));}
 const yr=[...reqText.matchAll(/\b(\d{1,2})\+?\s*years?\b/gi)].map(m=>+m[1]);if(yr.length){const have=[...evidence.matchAll(/\b(\d{1,2})\+?\s*years?\b/gi)].map(m=>+m[1]);if(!have.length||Math.max(...have)<Math.max(...yr))missing.push(Math.max(...yr)+'+ years');}
 return missing;
}
// Sector / role-family core skills. A catalogue item becomes "core" (treated as essential) only when
//  (a) the employer sector or the role title points to that line of work, AND
//  (b) the advert itself lists the item (no requirement is ever invented), AND
//  (c) the employer did not explicitly mark it desirable.
// Sector-specific L&D skills apply only to L&D roles or training providers. Unknown sector = no change.
// ---------------------------------------------------------------------------------------------------
// Sector-specific L&D skills (owner-supplied table, 2026-10-22 14:43).
// mode 'auto'   = named tool / method / framework: checked against the CV (keyword + performed action).
// mode 'manual' = soft or judgement-based skill: never auto-evidenced; you confirm it.
// Regexes require skill context (e.g. "compliance training", not bare "GDPR") to avoid firing on generic text.
export const LD_SKILLS=[
 ['ld_instructional_design','Instructional design (ADDIE / SAM)',/\b(?:instructional design\w*|learning design(?:er)?|addie|sam (?:model|methodology)|successive approximation model)\b/i,'auto'],
 ['ld_authoring_tools','eLearning authoring / content tools (Articulate 360, Storyline, Rise, Camtasia, Canva, Loom)',/\b(?:articulate(?: 360)?|storyline|rise 360|articulate rise|camtasia|captivate|evolve authoring|gomo|canva|loom|e-?learning (?:authoring|development|content (?:design|creation))|authoring tools?)\b/i,'auto'],
 ['ld_sales_enablement','Sales enablement / revenue ramp programmes',/\b(?:sales enablement|revenue ramp|ramp(?:-up)? programmes?|sales onboarding)\b/i,'auto'],
 ['ld_technical_onboarding','Technical / scientific onboarding',/\b(?:technical|scientific|product) onboarding\b/i,'auto'],
 ['ld_microlearning','Microlearning design',/\bmicro-?learning\b/i,'auto'],
 ['ld_ai_content','AI-assisted content creation',/\b(?:ai.(?:assisted|generated|powered|enabled) (?:content|learning|course)\w*|generative ai)\b/i,'auto'],
 ['ld_data_literacy','Data literacy',/\bdata literacy\b/i,'manual'],
 ['ld_agile','Agile project management / sprint planning',/\b(?:agile (?:project management|methodolog\w*|delivery|ways of working)|sprint planning|scrum)\b/i,'auto'],
 ['ld_remote_facilitation','Remote / virtual facilitation (incl. cross-border)',/\b(?:(?:remote|virtual|online|live online|cross.border virtual) (?:facilitation|delivery|classrooms?|training sessions?|workshops?)|vilt|virtual instructor.led)\b/i,'auto'],
 ['ld_async_curation','Asynchronous learning / content curation',/\b(?:(?:asynchronous|async) learning|(?:content|learning|cost.effective content) curation)\b/i,'auto'],
 ['ld_learning_analytics','Learning analytics / ROI / engagement metrics',/\b(?:roi (?:metrics|of (?:training|learning))|learning (?:analytics|metrics|data)|training (?:metrics|kpis|data analysis|impact (?:data|reports?))|engagement metrics)\b/i,'auto'],
 ['ld_stakeholder_influencing','Stakeholder influencing / partnership stakeholder management',/\b(?:stakeholder influenc\w*|influencing (?:senior )?stakeholders|partnership stakeholder)\b/i,'manual'],
 ['ld_regulatory_training','Regulatory compliance training (FCA, AML, GDPR, conduct)',/\b(?:regulatory|fca|aml|anti.money laundering|gdpr|data protection|conduct(?: risk)?|consumer duty|sm&?cr) (?:compliance )?(?:training|e-?learning|learning|modules?|programmes?|courses?)\b/i,'auto'],
 ['ld_kirkpatrick','Kirkpatrick / Phillips evaluation model',/\b(?:kirkpatrick|phillips roi)\b/i,'auto'],
 ['ld_leadership_dev','Leadership / management development (incl. compassionate, mission-aligned)',/\b(?:(?:leadership|management|store management) (?:development|programmes?|academ\w*)|compassionate leadership|mission.aligned leadership)\b/i,'auto'],
 ['ld_coaching','Coaching and mentoring (incl. performance, on-site, technical)',/\b(?:coaching|mentoring|mentorship)\b/i,'auto'],
 ['ld_presentation','Executive / high-impact / large-group presentation',/\b(?:(?:executive|high.impact|large.group|senior.level) presentations?|presenting to (?:senior|executive|board))\b/i,'manual'],
 ['ld_business_partnering','Business partnering',/\bbusiness partner(?:ing|ship)\b/i,'manual'],
 ['ld_succession','Talent / succession planning',/\b(?:succession planning|talent (?:management|reviews?|pipelines?))\b/i,'auto'],
 ['ld_psychometrics','Psychometrics (MBTI, Insights Discovery etc.)',/\b(?:psychometric\w*|mbti|myers.briggs|insights discovery|disc profil\w*|hogan|cliftonstrengths|strengthsfinder)\b/i,'auto'],
 ['ld_risk_awareness','Risk awareness',/\brisk awareness\b/i,'manual'],
 ['ld_hybrid_delivery','Hybrid / blended delivery and learning architecture',/\b(?:hybrid|blended) (?:learning|delivery|training|workshops?|learning architecture|programmes?)\b/i,'auto'],
 ['ld_apprenticeships','Apprenticeships and Levy management',/\b(?:apprenticeship (?:levy|pathways?|programmes?|standards|management|providers?)|(?:trade )?apprenticeships? (?:programme|scheme|pathway)s?|levy (?:governance|funding|spend|management)|manag\w* apprenticeships?)\b/i,'auto'],
 ['ld_clinical_governance','Clinical governance / CQC standards',/\b(?:clinical governance|cqc (?:standards|compliance|inspections?|requirements))\b/i,'auto'],
 ['ld_esr','ESR (Electronic Staff Record) administration',/\b(?:esr|electronic staff record)\b/i,'auto'],
 ['ld_simulation','Simulation-based / VR training',/\b(?:simulation.based (?:training|education|learning)|simulation (?:training|suites?|centres?)|virtual reality|vr (?:training|learning|delivery))\b/i,'auto'],
 ['ld_preceptorship','Preceptorship development',/\bpreceptorship\b/i,'auto'],
 ['ld_competency_frameworks','Competency frameworks (clinical / engineering / technical)',/\b(?:(?:clinical|engineering|technical) )?competen(?:cy|cies|ce) frameworks?\b/i,'auto'],
 ['ld_inclusive_facilitation','Inclusive / trauma-informed / neuroinclusive / empathic facilitation',/\b(?:inclusive (?:facilitation|learning design|delivery)|neuro-?inclusive|trauma.informed|empathic facilitation)\b/i,'manual'],
 ['ld_collaboration','Cross-functional collaboration',/\bcross.functional (?:collaboration|working|teams?)\b/i,'manual'],
 ['ld_change_mgmt','Change management',/\bchange management\b/i,'auto'],
 ['ld_budget','Training budget tracking / management',/\b(?:(?:training |learning |l&d )?budget (?:tracking|management|monitoring|constraints?)|manag\w* (?:the |a )?(?:training |learning |l&d )budgets?)\b/i,'auto'],
 ['ld_curriculum_design','Curriculum / programme design and mapping',/\b(?:(?:technical )?curriculum (?:design|development|mapping)|course design|programme design|policy.(?:driven|led) learning design)\b/i,'auto'],
 ['ld_safety_training','Health & safety / safety-critical training (HSE, IOSH, NEBOSH, inductions, toolbox talks, manual handling)',/\b(?:hse|iosh|nebosh|safety.critical|health (?:and|&) safety training|site (?:safety )?inductions?|toolbox talks?|manual handling|behaviou?ral safety|warehouse compliance)\b/i,'auto'],
 ['ld_sop_training','Standard operating procedure (SOP) training',/\b(?:sop|sops|standard operating procedures?)\b/i,'auto'],
 ['ld_needs_analysis','Training needs / skills gap analysis (TNA)',/\b(?:training needs analys\w*|learning needs analys\w*|tna|skills? gap analys\w*|consultative needs assessments?|needs assessments?)\b/i,'auto'],
 ['ld_project_mgmt','Project lifecycle management',/\b(?:project lifecycle|project management (?:methodolog\w*|qualification)|prince2|apm pfq)\b/i,'auto'],
 ['ld_cscs_citb','CSCS / CITB levy coordination',/\b(?:cscs|citb)\b/i,'auto'],
 ['ld_multisite','Multi-site training logistics',/\bmulti.site\b/i,'auto'],
 ['ld_conflict_resolution','Conflict resolution',/\bconflict (?:resolution|management)\b/i,'manual'],
 ['ld_cpd','CPD auditing / professional CPD compliance (SRA, ICAEW)',/\b(?:cpd (?:audit\w*|records?|compliance|points|hours|accreditation)|continuing professional (?:development|education)|sra cpd|icaew cpd)\b/i,'auto'],
 ['ld_onboarding_programmes','High-volume onboarding / induction programmes',/\b(?:high.volume (?:onboarding|induction)|onboarding (?:programmes?|journeys?)|induction programmes?)\b/i,'auto'],
 ['ld_customer_service_programmes','Customer service excellence programmes',/\bcustomer (?:service|experience) (?:excellence )?(?:programmes?|training)\b/i,'auto'],
 ['ld_mobile_learning','Mobile-first learning design',/\bmobile.(?:first|friendly) (?:learning|content|design)|mobile learning\b/i,'auto'],
 ['ld_train_the_trainer','Train-the-trainer frameworks',/\btrain.the.trainer\b/i,'auto'],
 ['ld_classroom_facilitation','Classroom / workshop facilitation and training delivery',/\b(?:(?:classroom|face.to.face|workshop) (?:facilitation|delivery|training)|facilitat(?:e|es|ing|ion of) (?:training|workshops?|sessions?|courses?)|deliver(?:ing|s)? (?:training|workshops?)(?! (?:administration|logistics)))\b/i,'auto'],
 ['ld_systems_adoption','Systems adoption / rollout and LMS migration',/\b(?:(?:pos|system|systems|technology|software) adoption|systems? roll.?outs?|lms migration)\b/i,'auto'],
 ['ld_retention','Employee retention initiatives',/\b(?:employee )?retention (?:initiatives?|strategies|programmes?)\b/i,'auto'],
 ['ld_graduate_academy','Trainee / graduate academy management',/\b(?:trainee|graduate|early careers?) (?:academ\w*|programmes?|schemes?|intakes?)\b/i,'auto'],
 ['ld_commercial_acumen','Commercial acumen / client-facing skills',/\b(?:commercial (?:acumen|awareness)|client.facing (?:soft )?skills)\b/i,'manual'],
 ['ld_emotional_intelligence','Emotional intelligence / active listening',/\b(?:emotional intelligence|active listening)\b/i,'manual'],
 ['ld_360_feedback','360-degree feedback facilitation',/\b360(?:.degree)? feedback\b/i,'auto'],
 ['ld_career_pathways','Career pathway mapping',/\b(?:career (?:pathway|path) (?:mapping|design|frameworks?)|career frameworks?)\b/i,'auto'],
 ['ld_civil_service_behaviours','Civil Service Behaviours / Success Profiles',/\b(?:civil service (?:behaviours|success profiles|competency framework)|success profiles)\b/i,'auto'],
 ['ld_edi','EDI programme rollout',/\b(?:edi|ed&i|dei|equality,? diversity (?:and|&) inclusion|inclusion) (?:training|programmes?|initiatives?|learning|roll.?outs?|workshops?)\b/i,'auto'],
 ['ld_wellbeing_training','Resilience and wellbeing training',/\b(?:resilience|wellbeing|well-being|mental health (?:first aid|awareness)) (?:training|programmes?|workshops?|sessions?)\b/i,'auto'],
 ['ld_union_consultation','Union / staff association consultation',/\b(?:trade unions?|union consultation|staff (?:association|side) consultation)\b/i,'auto'],
 ['ld_governance','Public sector governance',/\bpublic sector governance\b/i,'manual'],
 ['ld_pedagogy','Pedagogical / andragogical theory',/\b(?:pedagog\w*|andragog\w*|adult learning (?:theory|principles))\b/i,'auto'],
 ['ld_staff_development','Academic / staff development',/\b(?:academic|faculty) (?:staff )?development\b/i,'auto'],
 ['ld_accessibility','Accessibility / WCAG compliance in digital materials',/\b(?:wcag|digital accessibility|accessib\w* (?:standards|compliance|guidelines|requirements))\b/i,'auto'],
 ['ld_assessment_design','Formative / summative assessment design',/\b(?:(?:formative|summative) assessments?|assessment design)\b/i,'auto'],
 ['ld_peer_observation','Peer observation schemes',/\b(?:peer observation|observation of (?:teaching|learning))\b/i,'auto'],
 ['ld_volunteer_training','Volunteer training programme design',/\bvolunteer (?:training|induction|learning|development)\b/i,'auto'],
 ['ld_safeguarding_training','Safeguarding training',/\bsafeguarding (?:training|awareness|courses?|modules?|programmes?)\b/i,'auto'],
 ['ld_grant_reporting','Grant-funded training / donor compliance reporting',/\b(?:grant.(?:funded|funding) (?:reporting|programmes?|training)|funder reporting|donor (?:compliance|reporting))\b/i,'auto'],
 ['ld_community','Community building / learning communities',/\b(?:community building|learning communit\w*|communities of practice)\b/i,'manual'],
 ['ld_lean','Lean / Six Sigma training',/\b(?:lean (?:manufacturing|six sigma|principles|methodolog\w*)|six sigma|kaizen)\b/i,'auto'],
 ['ld_twi','Training Within Industry (TWI)',/\b(?:twi|training within industry)\b/i,'auto'],
 ['ld_shift_delivery','Shift-based delivery planning',/\b(?:shift.based (?:delivery|training)|training across (?:all |multiple )?shifts)\b/i,'auto'],
 ['ld_machinery_cert','Machinery / equipment certification tracking',/\b(?:(?:machinery|equipment|forklift|flt|mhe) (?:certification|licen[cs]es?|tickets?)|certification tracking)\b/i,'auto'],
 ['ld_bilingual_materials','Bilingual / visual training materials',/\b(?:bilingual (?:training )?materials?|visual (?:training )?(?:materials|aids|work instructions))\b/i,'auto'],
 ['ld_performance_consulting','Operational performance consulting',/\bperformance consult\w*\b/i,'manual'],
 ['ld_root_cause','Root-cause capability analysis',/\broot.cause (?:analys\w*|capability)\b/i,'auto'],
 ['ld_gxp','GxP / GMP regulatory compliance',/\b(?:gxp|gmp|gcp|glp|good (?:manufacturing|clinical|laboratory|distribution) practice)\b/i,'auto'],
 ['ld_audit_ready','Audit-ready training documentation',/\b(?:audit|inspection).ready\b/i,'auto'],
 ['ld_validation','Validation protocols / validated LMS (Veeva, Saba)',/\b(?:validation protocols?|computer system validation|validated (?:lms|systems?|learning)|veeva(?: vault)?|saba)\b/i,'auto'],
 ['ld_medical_affairs','Medical affairs enablement',/\bmedical affairs\b/i,'auto'],
 ['ld_instructional_writing','Instructional writing for complex / clinical topics',/\b(?:instructional writing|technical writing|scientific writing)\b/i,'auto']
];
for(const [id,label,re,mode] of LD_SKILLS){if(mode==='auto')catalog.push({id,label,re,specificity:'generic',exclude:null,family:'ld'});else facets.push([id,label,re]);}
const LD_AUTO=new Set(LD_SKILLS.filter(x=>x[3]==='auto').map(x=>x[0]));
const LD_MANUAL=new Set(LD_SKILLS.filter(x=>x[3]==='manual').map(x=>x[0]));
const ldId=id=>LD_MANUAL.has(id)?'manual_'+id:id;
const L=(...ids)=>ids.map(ldId);
// Generic L&D core for L&D roles and training providers.
const LD_GENERIC=['courses','participants','scheduling','suppliers','lms','evaluation','compliance_training','ld_needs_analysis'];
// employer: phrases describing the employer; title: role family from job title; core: old general core (mismatch detection);
// ld: sector-specific L&D skills from the owner's table (apply only to L&D roles / training providers).
export const SECTORS=[
 {id:'training_provider',target:true,label:'Training provider (target)',employer:/\b(?:training (?:provider|company|organisation|organization|centre|center|consultancy|business|academy)|learning (?:provider|company)|apprenticeship (?:provider|training provider)|awarding bod(?:y|ies)|accredited (?:training|courses?)|e.?learning (?:company|provider)|cpd provider|professional development provider|we (?:deliver|provide|run) (?:accredited |professional |corporate )?(?:training|courses))\b/i,title:/(?!)/,core:[...LD_GENERIC,'accreditation'],ld:[]},
 {id:'corporate_ld',target:true,label:'Corporate learning & development (target)',employer:/\b(?:learning (?:and|&) development (?:team|function|department)|l&d (?:team|function|department)|(?:our|the) (?:academy|training) team)\b/i,title:/\b(?:l&d|learning (?:and|&) development|learning (?:operations|coordinator|co-ordinator|administrator|officer|specialist|partner|advisor|adviser|manager|experience|designer|technologist)|training (?:coordinator|co-ordinator|administrator|officer|advisor|adviser|specialist|manager|assistant|lead)|course (?:administrator|coordinator|co-ordinator)|talent development|early careers|instructional designer|e-?learning (?:developer|designer)|trainer|facilitator|enablement)\b/i,core:LD_GENERIC,ld:[]},
 {id:'technology',label:'Technology & SaaS',employer:/\b(?:software (?:company|house|studio|business|vendor)|tech(?:nology)? (?:company|business|scale-?up|start-?up|firm)|saas|b2b software|it consultancy|digital agency|cloud (?:platform|provider|company))\b/i,title:/\b(?:developer|software|data engineer|devops)\b/i,core:['developer','sql'],ld:L('ld_instructional_design','ld_authoring_tools','lms','ld_sales_enablement','ld_technical_onboarding','ld_microlearning','ld_ai_content','ld_data_literacy','ld_agile','ld_remote_facilitation','ld_async_curation','ld_learning_analytics','ld_stakeholder_influencing')},
 {id:'financial_services',label:'Financial services & banking',employer:/\b(?:financial services|bank(?!\s+holidays?)|banking group|building society|insurance (?:company|broker|group|provider)|insurer|asset manag\w*|wealth management|investment (?:bank|firm|management)|fintech|accountancy (?:firm|practice)|accounting firm)\b/i,title:/\b(?:accountant|accounts|finance|financial|payroll)\b/i,core:['accounting'],ld:L('ld_regulatory_training','ld_kirkpatrick','ld_leadership_dev','ld_coaching','cipd','ld_presentation','ld_business_partnering','ld_succession','ld_psychometrics','suppliers','ld_risk_awareness','ld_learning_analytics','ld_hybrid_delivery','ld_apprenticeships')},
 {id:'healthcare',label:'Healthcare & NHS',employer:/\b(?:hospital|clinic|nhs|healthcare (?:provider|organisation|services|company|trust)|care home|inpatient|mental health services|gp practice|nursing home|integrated care board)\b/i,title:/\b(?:nurse|clinical|healthcare|care (?:assistant|worker)|medical)\b/i,core:['manual_confidentiality'],ld:L('compliance_training','ld_clinical_governance','ld_esr','ld_simulation','ld_preceptorship','ld_competency_frameworks','ld_inclusive_facilitation','ld_leadership_dev','ld_presentation','ld_collaboration','ld_budget','ld_change_mgmt')},
 {id:'engineering_energy',label:'Engineering, energy & utilities',employer:/\b(?:(?<!civil )engineering (?:company|firm|consultancy|business|group)|energy (?:company|supplier|provider|business)|utilit(?:y|ies) (?:company|provider|business)|water company|power (?:station|generation)|renewable energy|oil and gas|nuclear|national grid|electricity (?:network|distribution))\b/i,title:/(?!)/,core:[],ld:L('ld_curriculum_design','ld_safety_training','ld_hybrid_delivery','ld_apprenticeships','ld_sop_training','ld_simulation','ld_needs_analysis','suppliers','ld_competency_frameworks','ld_project_mgmt','ld_coaching')},
 {id:'construction',label:'Construction, built environment & infrastructure',employer:/\b(?:construction (?:company|firm|group|business|contractor)|main contractor|civil engineering (?:contractor|company|firm|business)|groundworks|infrastructure (?:company|provider|group)|housebuilder|built environment|housing association|property (?:management|company)|surveying (?:firm|practice))\b/i,title:/\b(?:surveyor|housing|property)\b/i,core:['surveying','housing'],ld:L('ld_cscs_citb','ld_apprenticeships','ld_safety_training','suppliers','ld_coaching','ld_multisite','ld_authoring_tools','ld_conflict_resolution','ld_cpd')},
 {id:'retail_hospitality',label:'Retail, FMCG & hospitality',employer:/\b(?:retailer|retail (?:company|business|group|chain|stores?)|supermarket|fmcg|consumer goods|hospitality (?:company|group|business)|hotel (?:group|chain)|restaurant (?:group|chain)|pub (?:company|group)|leisure (?:operator|group))\b/i,title:/(?!)/,core:[],ld:L('ld_onboarding_programmes','ld_customer_service_programmes','ld_mobile_learning','ld_train_the_trainer','ld_classroom_facilitation','ld_systems_adoption','ld_leadership_dev','ld_learning_analytics','ld_retention','ld_coaching','ld_emotional_intelligence','manual_general_skills')},
 {id:'professional_services',label:'Professional services & legal',employer:/\b(?:law firm|legal (?:practice|services firm)|solicitors|barristers.? chambers|professional services (?:firm|organisation)|management consultanc\w*|big four|audit firm)\b/i,title:/(?!)/,core:[],ld:L('ld_graduate_academy','ld_cpd','ld_commercial_acumen','ld_presentation','ld_needs_analysis','ld_emotional_intelligence','ld_360_feedback','ld_career_pathways','ld_stakeholder_influencing')},
 {id:'government',label:'Central & local government',employer:/\b(?:(?:borough|district|county|city|town|parish|unitary) council|local authority|civil service|government department|central government|local government|ministry of|cabinet office|home office|hm (?:revenue|treasury|prison)|police (?:force|service)|fire and rescue service)\b/i,title:/(?!)/,core:[],ld:L('ld_civil_service_behaviours','ld_edi','ld_curriculum_design','procurement','ld_systems_adoption','ld_hybrid_delivery','ld_classroom_facilitation','ld_wellbeing_training','ld_budget','ld_union_consultation','ld_governance')},
 {id:'education',label:'Education & higher education',employer:/\b(?:college|university|school|academy trust|multi-academy trust|further education|higher education|sixth form)\b/i,title:/\b(?:education|tutor|teacher|lecturer|student|programme administrat\w*|curriculum)\b/i,core:['courses','participants','scheduling','lms','research'],ld:L('ld_pedagogy','lms','ld_staff_development','ld_accessibility','ld_curriculum_design','research','ld_classroom_facilitation','ld_assessment_design','ld_peer_observation')},
 {id:'charity',label:'Charity, NGOs & non-profit',employer:/\b(?:charity|charitable (?:trust|organisation|organization)|not.for.profit|non.profit|ngo|third sector|registered charity|voluntary (?:sector|organisation)|social enterprise)\b/i,title:/(?!)/,core:[],ld:L('ld_volunteer_training','ld_authoring_tools','ld_async_curation','ld_safeguarding_training','ld_inclusive_facilitation','ld_leadership_dev','ld_grant_reporting','ld_community','ld_agile')},
 {id:'manufacturing_logistics',label:'Manufacturing, automotive & logistics',employer:/\b(?:manufactur\w* (?:company|business|site|plant|facility|group)|manufacturer|factory|production (?:site|facility|plant)|automotive|logistics (?:company|provider|business|operator)|distribution (?:centre|center)|warehous\w* (?:operation|site|business)|supply chain (?:company|business)|3pl)\b/i,title:/(?!)/,core:[],ld:L('ld_lean','ld_safety_training','ld_twi','ld_shift_delivery','ld_machinery_cert','ld_bilingual_materials','ld_performance_consulting','ld_root_cause')},
 {id:'pharma',label:'Pharmaceutical & life sciences',employer:/\b(?:pharmaceutical\w*|biopharma\w*|pharma (?:company|business|group)|life sciences|biotech\w*|clinical research organi[sz]ation|medical devices? (?:company|manufacturer))\b/i,title:/(?!)/,core:[],ld:L('ld_gxp','ld_audit_ready','ld_validation','ld_sales_enablement','ld_medical_affairs','ld_technical_onboarding','lms','ld_instructional_writing','ld_remote_facilitation')},
 // Kept from the earlier table (not in the owner's sector list).
 {id:'events',label:'Events / conferences',employer:/\b(?:events? (?:company|agency|venue|business)|conference (?:centre|center|venue))\b/i,title:/\bevents?\b/i,core:['scheduling','suppliers','participants'],ld:[]},
 {id:'recruitment_hr',label:'Recruitment / HR services',employer:/\b(?:recruitment (?:agency|consultancy)|hr consultancy|staffing agency)\b/i,title:/\b(?:recruit\w*|hr|human resources|people (?:advisor|officer|partner))\b/i,core:['manual_recruitment','manual_onboarding'],ld:[]}
];
const IS_LD_TITLE=/\b(?:training|learning|l&d|instructional|e-?learning|trainer|facilitator|course|enablement|talent development|early careers|academy)\b/i;
export function inferSector(vacancy={},audit=null){
 const override=String(vacancy.sector||'').trim();
 if(override==='none')return {employer:null,role:null,source:'override',core_ids:[],evidence:[],note:'Sector-based core skills disabled by you.'};
 if(override){const s=SECTORS.find(x=>x.id===override);if(s){const role=SECTORS.find(x=>x.title.test(vacancy.title||''))||null;const isLD=s.id==='training_provider'||role?.id==='corporate_ld'||IS_LD_TITLE.test(vacancy.title||'');return {employer:{id:s.id,label:s.label},role:role?{id:role.id,label:role.label}:null,is_ld_role:isLD,source:'override',core_ids:[...new Set([...s.core,...(role?role.core:[]),...(isLD?s.ld:[])])],evidence:[{kind:'override',text:'Selected by you'}]};}}
 // An agency describing itself is not the hiring employer's line of work.
 const agency=/\b(?:acting as an? (?:recruitment|employment) (?:agency|business)|on behalf of (?:our|a|the) client|our client(?: is|,)|employment business)\b/i.test(String(vacancy.description||''));
 // Employer/company text weighs 2; duties/criteria text weighs 1 (it often describes the candidate's past setting).
 const items=[{text:String(vacancy.company||vacancy.employer||''),section:'company'},...(audit?audit.map(u=>({text:u.source,section:u.section})):units(vacancy.description).map(t=>({text:t,section:'context'})))].filter(x=>x.text&&!(agency&&/\b(?:recruitment|employment) (?:agency|business|consultancy)\b/i.test(x.text)));
 const weight=x=>x.section==='duties'||x.section==='criteria'?1:2;
 const scored=SECTORS.map(s=>{const hits=items.filter(x=>s.employer.test(x.text));return {s,hits,score:hits.reduce((n,x)=>n+weight(x),0)};}).filter(x=>x.hits.length).sort((a,b)=>b.score-a.score);
 const employer=scored.length&&(scored.length===1||scored[0].score>scored[1].score)?scored[0]:null;
 const role=SECTORS.find(s=>s.title.test(vacancy.title||''))||null;
 const isLD=employer?.s.id==='training_provider'||role?.id==='corporate_ld'||IS_LD_TITLE.test(vacancy.title||'');
 const core=[...new Set([...(employer?employer.s.core:[]),...(role?role.core:[]),...(employer&&isLD?employer.s.ld:[])])];
 return {is_ld_role:isLD,agency_posting:agency,employer:employer?{id:employer.s.id,label:employer.s.label}:null,role:role?{id:role.id,label:role.label}:null,source:'inferred',core_ids:core,
  ambiguous:scored.length>1&&!employer?scored.map(x=>x.s.label):[],
  evidence:[...(employer?employer.hits.slice(0,2).map(x=>({kind:weight(x)===1?'advert requirement text (weaker)':'employer',text:x.text})):[]),...(role?[{kind:'title',text:vacancy.title}]:[])]};
}
const ATTEST=new Set(['have','partial','no','unsure']);
export function evaluate({profile,vacancy={},preferences={},evaluationDate,history,attestations={}}){
 const date=parseDate(String(evaluationDate||'').slice(0,10));if(!date)throw Error('Valid explicit evaluationDate required');const cv=typeof profile==='string'?profile:String(profile?.text||'');
 const v=vacancy,p={...preferences,history:history??preferences.history};const gate=eligibility(v,p,date);
 const extraction=extractVacancyRequirements(v.description,v.title||'');
 const sector=inferSector(v,extraction.audit);
 const reqs=extraction.requirements.map(r=>{
  const enriched={...r,published_importance:r.importance,inferred_core:sector.core_ids.includes(r.id)&&r.importance!=='desirable'};
  if(!preferences.useInferredCore)return enriched;
  if(!sector.core_ids.includes(r.id)||r.importance==='essential'||r.importance==='desirable'||r.derived_from_title)return r;
  const emp=sector.employer&&SECTORS.find(x=>x.id===sector.employer.id),rol=sector.role&&SECTORS.find(x=>x.id===sector.role.id);
  const why=[emp?.core.includes(r.id)?`employer sector: ${sector.employer.label}`:'',rol?.core.includes(r.id)?`role title: ${sector.role.label}`:'',sector.is_ld_role&&emp?.ld.includes(r.id)?`L&D skill for ${emp.label}`:''].filter(Boolean).join('; ');
  return {...r,published_importance:r.importance,importance:'essential',tier:'essential',weight:3,core:true,importance_basis:`Core skill for this role (${why}); listed in the advert as a duty`};
 });
 const sentences=units(cv).filter(x=>!/^\s*(?:skills|systems|keywords|qualifications)\s*:/i.test(x)&&!(x.includes('|')&&!/[.!?]/.test(x)));
 const att=Object.fromEntries(Object.entries(attestations||{}).filter(([,a])=>ATTEST.has(a)));
 const requirements=reqs.map(req=>{
  const mode=req.match_mode||(req.uncatalogued?'manual':'automated');
  if(mode==='condition')return {...req,match_mode:mode,status:'unknown',evidence_state:'to_confirm',evidence:null,cv_evidence:null,evidence_basis:'Pre-employment condition; confirm with the employer and yourself. Not CV-matched and not a fit deficit.'};
  if(mode==='manual'){
   const a=att[req.id]==='unsure'?null:att[req.id];
   const state=a==='have'?'self_attested':a==='partial'?'self_attested_partial':a==='no'?'absent_self_reported':'not_assessed';
   return {...req,match_mode:mode,status:a==='have'?'supported':a==='partial'?'partial':a==='no'?'not_met':'unknown',evidence_state:state,attestation:a||null,evidence:null,cv_evidence:null,evidence_basis:state==='not_assessed'?'No automated matcher exists for this item; no CV search was performed.':state==='absent_self_reported'?'You indicated you do not meet this item.':'Your own confirmation; no CV quotation was checked.'};
  }
  const c=catalog.find(x=>x.id===req.id);
  const relevant=c?sentences.filter(x=>catMatch(c,x)&&!cvNegated(c,x)&&!(c.specificity==='credential'&&LAPSED.test(x))):[];
  const quote=relevant.filter(x=>!PROFILE_SUMMARY.test(x)&&(c.specificity==='credential'?/\b(?:holds?|held|obtained|awarded|qualified|completed|certified|passed)\b/i.test(x):ACTION.test(x))).map((text,index)=>({text,index,missing:unverifiedQualifiers(c,req,text).length})).sort((a,b)=>a.missing-b.missing||a.index-b.index)[0]?.text;
  const partial=quote?null:relevant.find(x=>c.specificity!=='credential'&&PROFILE_SUMMARY.test(x));
  const missingQ=quote?unverifiedQualifiers(c,req,quote):[];
  const status=quote&&!missingQ.length?'demonstrated':quote||partial?'partial':'unknown';
  const state=status==='demonstrated'?'cv_quoted':missingQ.length?'qualifier_unverified':partial?'partial':'no_match_found';
  const a=att[req.id]==='unsure'?null:state==='cv_quoted'&&att[req.id]!=='no'?null:att[req.id];
  if(a){const st=a==='have'?'self_attested':a==='partial'?'self_attested_partial':'absent_self_reported';return {...req,match_mode:mode,status:a==='have'?'supported':a==='partial'?'partial':'not_met',evidence_state:st,automated_state:state,attestation:a,evidence:quote||partial||null,cv_evidence:quote||partial||null,unverified_qualifiers:missingQ,evidence_basis:st==='absent_self_reported'?'You indicated you do not meet this item.':'Your own confirmation; the CV '+(state==='no_match_found'?'does not mention it.':'only partly evidences it.')};}
  return {...req,match_mode:mode,status,evidence_state:state,evidence:quote||partial||null,cv_evidence:quote||partial||null,unverified_qualifiers:missingQ,evidence_basis:state==='cv_quoted'?'performed action':state==='qualifier_unverified'?`CV quote covers the category but not: ${missingQ.join(', ')}`:state==='partial'?'general self-description; needs a specific example':'Automated search found no matching CV sentence; unknown, not absent.'};
 });
 const conditions=requirements.filter(x=>x.match_mode==='condition');
 const candidateReqs=requirements.filter(x=>x.match_mode!=='condition');
 const automated=candidateReqs.filter(x=>x.match_mode==='automated'),manual=candidateReqs.filter(x=>x.match_mode==='manual');
 const sum=list=>list.reduce((n,x)=>n+x.weight,0);
 // Credit per evidence state. null = unknown (not yet resolved by CV or by you).
 const FULL=new Set(['cv_quoted','self_attested']),HALF=new Set(['qualifier_unverified','partial','self_attested_partial']),ZERO=new Set(['absent_self_reported']),UNKNOWN=new Set(['not_assessed','no_match_found']);
 const creditOf=x=>FULL.has(x.evidence_state)?1:HALF.has(x.evidence_state)?.5:ZERO.has(x.evidence_state)?0:null;
 const credit=x=>(creditOf(x)??0)*x.weight;
 const attested=candidateReqs.filter(x=>x.attestation);
 const assessed=candidateReqs.filter(x=>creditOf(x)!==null||x.evidence_state==='no_match_found');
 const assessedW=sum(assessed),totalW=sum(candidateReqs),assessedRatio=totalW?assessedW/totalW:0;
 // Threshold bounds: low counts unknowns as unmet, high counts them as met. Decided when both sides agree.
 const bounds=list=>{const w=sum(list);if(!w)return null;const low=list.reduce((n,x)=>n+(creditOf(x)??0)*x.weight,0)/w,high=list.reduce((n,x)=>n+(creditOf(x)??1)*x.weight,0)/w;return {low:Number(low.toFixed(3)),high:Number(high.toFixed(3)),weight:w,open:list.filter(x=>creditOf(x)===null).length};};
 const essentials=candidateReqs.filter(x=>x.importance==='essential'),others=candidateReqs.filter(x=>x.importance!=='essential');
 // Non-essential duties are numerous and descriptive: their ratio uses items assessed by CV or by you only.
 const othersAssessed=others.filter(x=>creditOf(x)!==null||x.evidence_state==='no_match_found');
 const E=bounds(essentials),N=bounds(othersAssessed);
 const threshold=(x,d)=>Number.isFinite(Number(x))&&Number(x)>=0&&Number(x)<=1?Number(x):d;
 const ESSENTIAL_MIN=threshold(preferences.essentialThreshold,.75),OTHER_MIN=threshold(preferences.nonEssentialThreshold,.5);
 const wordCount=String(v.description||'').trim().split(/\s+/).filter(Boolean).length;
 const evidence=automated.filter(x=>x.status==='demonstrated').length,coverage=automated.length?evidence/automated.length:0;
 const missing=[];if(wordCount<65)missing.push('Detailed description');if(candidateReqs.length<3)missing.push('Enough classifiable requirements');if(!essentials.length)missing.push('Explicit essential criteria');if(!v.location)missing.push('Structured location');if(!v.contract_type)missing.push('Structured contract');if(v.salary_min==null&&v.salary_max==null)missing.push('Structured salary');
 const completeness=Math.min(1,(wordCount>=65?.3:0)+(candidateReqs.length>=3?.25:0)+(essentials.length?.15:0)+(v.location?.1:0)+(v.contract_type?.1:0)+(v.salary_min!=null||v.salary_max!=null?.1:0));
 const gaps=essentials.filter(x=>!FULL.has(x.evidence_state)).map(x=>({id:x.id,label:x.label,status:x.evidence_state==='absent_self_reported'?'not_met':'unknown',evidence_state:x.evidence_state,core:!!x.core,severity:x.evidence_state==='absent_self_reported'?'self-reported absent':x.match_mode==='manual'&&x.evidence_state==='not_assessed'?'manual review':x.specificity==='generic'||x.match_mode==='manual'?'evidence':'critical',source:x.source}));
 const critical=gaps.filter(x=>x.severity==='critical'&&x.evidence_state==='no_match_found'),selfAbsent=gaps.filter(x=>x.severity==='self-reported absent'),openEssential=essentials.filter(x=>creditOf(x)===null);
 let score=assessedW?Math.round(100*assessed.reduce((n,x)=>n+credit(x),0)/assessedW):null;
 // A strong-looking number must not hide failing screening criteria.
 if(score!==null&&(critical.length||(E&&E.high<ESSENTIAL_MIN)))score=Math.min(score,59);
 const expected=/\b(?:course|training|learning)\b/i.test(v.title||'')?['courses','scheduling','participants','records','stakeholders']:/\b(?:admin(?:istrat(?:or|ion|ive))?|coordinator|assistant|support|pa)\b/i.test(v.title||'')?['records','documentation','stakeholders']:[];
 const expectedMissing=expected.filter(id=>!requirements.some(x=>x.id===id));
 const summaryOnly=v.description_kind==='summary'||v.full_description===false;
 const hardUnknown=gate.checks.filter(x=>x.status==='unknown'&&x.name!=='Closing date');
 const unratedReasons=[];
 if(!cv.trim())unratedReasons.push('No evidence profile supplied.');
 if(wordCount<65)unratedReasons.push('Insufficient original advert detail.');
 if(candidateReqs.length<3)unratedReasons.push('Too few classifiable requirements to support a numeric assessment.');
 if(completeness<.5)unratedReasons.push('Advert completeness is below the assessment threshold.');
 if(!unratedReasons.length&&assessed.length<3)unratedReasons.push(`Only ${assessed.length} requirement(s) can be checked. Confirm checklist items to obtain a rating. This is an engine limitation, not a candidate shortfall.`);
 const pct=x=>Math.round(x*100)+'%';
 const basis=[],reasons=[];let decision,confidence;
 if(gate.status==='ineligible'){decision='Skip';score=null;basis.push('hard_constraint_not_met');reasons.push('A configured hard constraint is not met.');}
 else if(summaryOnly){decision='Investigate — full advert needed';score=null;basis.push('summary_only');missing.unshift('Full original advert including requirements');reasons.push('Provider summary only; supply the full advert.');}
 else if(unratedReasons.length){decision='Not assessable';score=null;basis.push('unrated');reasons.push(...unratedReasons);}
 else{
  if(hardUnknown.length){basis.push('eligibility_unknown');reasons.push('Resolve the eligibility checks.');}
  if(E){
   if(E.high<ESSENTIAL_MIN){basis.push('essential_below_threshold');reasons.push(`Essential/core criteria met: ${pct(E.low)}; even if every open item were met it would reach only ${pct(E.high)}, below the ${pct(ESSENTIAL_MIN)} threshold. Likely mismatch unless you have unlisted evidence.`);}
   else if(E.low<ESSENTIAL_MIN){basis.push('essential_needs_confirmation');reasons.push(`Essential/core criteria met: at least ${pct(E.low)}, up to ${pct(E.high)}. Confirm ${E.open} open item(s) to see whether the ${pct(ESSENTIAL_MIN)} threshold is reached.`);}
  }
  // Your rule: a "no" on an essential always means Investigate (it may fall inside the acceptable 25%).
  if(selfAbsent.length){basis.push('essential_absent_self_reported');reasons.push(`You marked ${selfAbsent.length} essential/core criterion/criteria as not met${E&&E.low>=ESSENTIAL_MIN?`; the ${pct(ESSENTIAL_MIN)} threshold is still met (${pct(E.low)}), so review whether the gap is acceptable`:''}.`);}
  if(critical.length){basis.push('specialist_essential_unevidenced');reasons.push('A critical published credential or specialist requirement remains unverified; it cannot be offset by other matches.');}
  const unresolvedCredential=essentials.some(x=>x.specificity==='credential'&&x.evidence_state!=='cv_quoted'&&x.evidence_state!=='self_attested');
  if(unresolvedCredential&&!critical.length){basis.push('mandatory_credential_unverified');reasons.push('Verify the complete credential condition before applying.');}
  const prerequisite=conditions.filter(x=>/\b(?:already|current(?:ly)?|existing|hold|held|possess)\b/i.test(x.source));
  if(prerequisite.length){basis.push('existing_precondition_unverified');reasons.push('A condition requires an existing status or clearance; confirm it before deciding to apply.');}
  if(assessedRatio<.6){basis.push('limited_matching_coverage');reasons.push('Less than 60% of published requirement weight is assessed. Review the remaining items before an application recommendation.');}
  if(N){if(N.high<OTHER_MIN){basis.push('nonessential_below_threshold');reasons.push(`Non-essential duties met: ${pct(N.low)} of those assessed, below the ${pct(OTHER_MIN)} threshold.`);}else if(N.low<OTHER_MIN){basis.push('nonessential_needs_confirmation');reasons.push(`Non-essential duties met: ${pct(N.low)}–${pct(N.high)} of those assessed; confirm the open items.`);}}
  const blocking=basis;
  if(blocking.length)decision='Investigate';
  else{const allEssential=!E||E.low>=.95,partials=candidateReqs.some(x=>HALF.has(x.evidence_state));decision=allEssential&&(!N||N.low>=.8)&&!partials?'Apply':'Apply with tailoring';reasons.push(E?`Essential/core criteria met: ${pct(E.low)} (threshold ${pct(ESSENTIAL_MIN)}).`:'',N?`Non-essential duties met: ${pct(N.low)} of those assessed (threshold ${pct(OTHER_MIN)}).`:'');}
 }
 confidence=decision==='Not assessable'||score===null||summaryOnly||gate.status==='unknown'||wordCount<145||assessedRatio<.6||assessed.length<4||(E&&E.open>0)||attested.length>assessed.length/2?'Low':'Medium';
 if(confidence==='Low'&&decision==='Apply')decision='Apply with tailoring';
 const assessmentReasons=[...unratedReasons];if(summaryOnly)assessmentReasons.unshift('Provider summary only; open the original and supply the full advert before fit scoring.');if(gate.status==='unknown')assessmentReasons.push('Eligibility facts remain unknown.');if(E&&E.open)assessmentReasons.push(`${E.open} essential/core criterion/criteria are not yet resolved by CV evidence or by you.`);if(attested.length)assessmentReasons.push(`${attested.length} item(s) rest on your own confirmation.`);
 const expectedDetails=expectedMissing.map(id=>({id,label:catalog.find(x=>x.id===id).label,reason:'Expected role-family category not found in extracted advert requirements; information only — not a candidate deficit, a published essential or a score input.'}));
 const verificationActions=gate.checks.filter(x=>x.status==='unknown').map(x=>({kind:'eligibility',criterion:x.name,action:x.name==='Contract duration'?`Confirm permanent employment or a guaranteed contract of at least ${Number(p.minContractMonths)} months; a possible extension is insufficient.`:x.name==='Salary floor'?(x.period==='hour'?'Hourly rate: confirm weekly hours to compare with your annual floor.':'Confirm the published base salary, paid hours and whether the amount is an estimate.'):x.name==='Closing date'?'Check the original vacancy is still accepting applications and confirm any deadline.':x.name==='Location'?'Verify the workplace, commute and attendance pattern against your preferences.':'Verify this eligibility fact with the original source.'}));
 for(const req of conditions)verificationActions.push({kind:'condition',criterion:req.label,action:'Pre-employment condition: confirm you can meet it. It does not affect the evidence score.',source:req.source});
 for(const req of candidateReqs.filter(x=>creditOf(x)===null))verificationActions.push({kind:req.importance==='essential'?'manual_essential':'manual_other',criterion:req.label,action:req.evidence_state==='no_match_found'?'No matching CV sentence was found. Mark whether you have this experience (your CV may not mention it).':'Not checked automatically. Read the published condition and mark whether you have evidence.',source:req.source,requirement_id:req.id});
 for(const req of automated.filter(x=>x.evidence_state==='qualifier_unverified'))verificationActions.push({kind:'qualifier',criterion:req.label,action:`Your CV quote covers the category but not: ${req.unverified_qualifiers.join(', ')}. Add a specific example if accurate.`,source:req.source});
 const tailoringActions=automated.filter(x=>x.status==='demonstrated').map(x=>({criterion:x.label,what_to_evidence:'Use this existing example to address the quoted duty; do not claim broader expertise.',evidence:x.evidence,source:x.source}));
 const contextual_fit={status:'disabled',signals:[],reason:'Context does not change candidate fit or eligibility.'};
 const coverageReport={
  source:{kind:summaryOnly?'summary':'full',word_count:wordCount,flattened_text:String(v.description||'').length>1500&&(String(v.description||'').match(/\n/g)||[]).length<3,completeness:Number(completeness.toFixed(2)),missing},
  extraction:{...extraction.summary,candidate_requirements:candidateReqs.length,conditions:conditions.length},
  matching:{automated:automated.length,manual:manual.length,confirmed_by_user:attested.length,automated_weight:sum(automated),manual_weight:sum(manual),assessed_weight:assessedW,total_weight:totalW,assessed_ratio:Number(assessedRatio.toFixed(2)),cv_quoted_weight:sum(candidateReqs.filter(x=>x.evidence_state==='cv_quoted')),self_attested_weight:attested.reduce((n,x)=>n+credit(x),0),denominator:'Score = credited weight / assessed weight (CV quotes, CV searches without a match, and items you confirmed). Conditions excluded.'},
  thresholds:{essential:{required:ESSENTIAL_MIN,...(E||{low:null,high:null,weight:0,open:0}),met:E?E.low>=ESSENTIAL_MIN:null,count:essentials.length,core_promoted:essentials.filter(x=>x.core).length},non_essential:{required:OTHER_MIN,...(N||{low:null,high:null,weight:0,open:0}),met:N?N.low>=OTHER_MIN:null,assessed_count:othersAssessed.length,unassessed_count:others.length-othersAssessed.length,scope:'non-essential items assessed by CV or by you'}},
  sector,
  candidate_evidence:Object.fromEntries(['cv_quoted','qualifier_unverified','partial','no_match_found','self_attested','self_attested_partial','absent_self_reported','not_assessed'].map(k=>[k,candidateReqs.filter(x=>x.evidence_state===k).length])),
  eligibility:{status:gate.status,unknown:gate.checks.filter(x=>x.status==='unknown').map(x=>x.name),not_met:gate.checks.filter(x=>x.status==='not_met').map(x=>x.name),conditions_to_confirm:conditions.map(x=>x.label)}
 };
 const decisionReason=reasons.filter(Boolean).join(' ')||(decision==='Apply'?'Thresholds met and eligibility checks pass; the final decision is yours.':'Review the listed items.');
 return {version:MODEL_VERSION,engine_version:MODEL_VERSION,evaluation_date:date,fit_score:score,band:score===null?'Not assessable':score>=80?'Strong':score>=60?'Moderate':'Weak',decision,decision_basis:basis,thresholds:coverageReport.thresholds,sector,eligibility:{status:gate.status,reasons:gate.reasons},hard_constraints:gate.checks,advert_completeness:{score:Number(completeness.toFixed(2)),missing},confidence:{label:confidence,reason:assessmentReasons.length?assessmentReasons.join(' '):wordCount<145?'Limited advert detail.':'Published requirement coverage; rules are not outcome-calibrated.'},requirements,pre_employment_conditions:conditions,extraction_audit:extraction.audit,extraction_summary:extraction.summary,coverage:coverageReport,unrated_reasons:unratedReasons,screening_evidence:{criteria:candidateReqs},critical_evidence_gaps:gaps,evidence_coverage:{evidenced:evidence,total:automated.length,ratio:coverage,scope:'automated requirements only'},expected_capability_gaps:expectedMissing,expected_capability_details:expectedDetails,verification_actions:verificationActions,decision_reason:decisionReason,tailoring_examples:tailoringActions,tailoring_prompts:gaps.filter(x=>x.severity==='evidence'||x.severity==='critical').map(x=>({criterion:x.label,what_to_evidence:'Provide an accurate example if you have one; do not invent experience.'})),contextual_fit,assessment_scope:{classified:automated.length,manual_review:[...new Set(candidateReqs.filter(x=>x.evidence_state==='not_assessed').flatMap(x=>(x.sources||[{text:x.source}]).map(s=>s.text)))],demonstrated:evidence,unknown:candidateReqs.filter(x=>x.status==='unknown').length,partial:candidateReqs.filter(x=>x.status==='partial').length,self_attested:attested.length,conditions:conditions.length,complete_job_coverage:false},score_meaning:'Share of assessed requirement weight with evidence (CV quotation or your own confirmation). Decision thresholds are shown separately. Inferred sector relevance is advisory by default. Not overall job suitability or hiring probability.',limitations:['Limited rule catalogue; items without an automated matcher need your confirmation.','Self-confirmed items are your judgement and are labelled as such.','Scores are provisional and uncalibrated.','Structured salary/location/contract facts require verified input; salary found in advert text is shown with its source passage.']};
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
