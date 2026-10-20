/* Career Radar V5.2 — transparent, deterministic evidence model.
 * The ontology is a small hand-curated pilot, NOT a complete ESCO/O*NET import.
 * Scores measure demonstrated coverage of advertised requirements, not a
 * probability of employment. All unknowns remain unknown.
 */
export const MODEL_VERSION='5.2.0-pilot';

const CATALOG=[
  ['learning_operations','Learning operations',/\b(?:learning operations?|training operations?|training programmes?|learning programmes?|course delivery|seminars?|workshops?|l&d operations?)\b/i],
  ['scheduling','Programme scheduling',/\b(?:schedul\w*|timetabl\w*|calendar management|course logistics|training logistics|capacity planning)\b/i],
  ['instructors','Instructor and supplier coordination',/\b(?:instructors?|trainers?|facilitators?|external providers?|suppliers?|vendors?|contractors?)\b/i],
  ['participants','Participant and client support',/\b(?:participants?|delegates?|registrations?|attendees?|client support|customer service|customer queries|learner support)\b/i],
  ['programme_governance','Programme governance and PMO',/\b(?:pmo|programme governance|program governance|project coordination|programme coordination|risk reporting|action log|dependencies|milestones?)\b/i],
  ['reporting','Reporting and management information',/\b(?:reporting|management information|dashboards?|kpis?|power bi|business intelligence|mi reports?)\b/i],
  ['data_quality','Data quality and reconciliation',/\b(?:data quality|reconcil\w*|validat\w*|data accuracy|data cleansing|data integrity|power query)\b/i],
  ['stakeholders','Stakeholder coordination',/\b(?:stakeholders?|liais\w*|cross-functional|interdepartmental|communications? with|relationship management)\b/i],
  ['documentation','Documentation and process improvement',/\b(?:documentation|process improvement|procedure\w*|standardis\w*|standardiz\w*|record keeping|audit trail|guidance materials?)\b/i],
  ['lms','Learning management system (LMS)',/\b(?:learning management system|lms|moodle|cornerstone|totara|docebo|successfactors learning)\b/i],
  ['virtual_delivery','Virtual learning delivery',/\b(?:virtual (?:instructor-led )?training|virtual learning|online seminars?|webinars?|adobe connect|zoom)\b/i],
  ['compliance','Regulatory and compliance support',/\b(?:compliance|regulatory|anti.money laundering|aml|financial regulation|risk and controls?)\b/i],
  ['people_management','Line management',/\b(?:line manag\w*|people manag\w*|direct reports?|performance appraisals?|staff supervision)\b/i],
  ['excel','Excel and spreadsheet reporting',/\b(?:excel|spreadsheets?|pivot tables?|vlookup|power query)\b/i]
].map(([id,label,re])=>({id,label,re}));
const TIER_WEIGHT={essential:3,important:2,desirable:1};
const TIER_RANK={essential:3,important:2,desirable:1};
const ACTION=/\b(?:coordinat\w*|manag\w*|deliver\w*|maintain\w*|develop\w*|produc\w*|support\w*|organis\w*|organiz\w*|administ\w*|implement\w*|lead|led|resolv\w*|reconcil\w*|document\w*|improv\w*|oversaw|supervis\w*)\b/i;
const SCALE=/\b(?:\d{2,}|global|international|across (?:emea|apac|regions)|annually|per year|multiple regions|five product teams)\b/i;
const SECTION_ONLY=/^(?:core skills?|systems?|technical skills?|competenc(?:y|ies)|capabilities|skills|experience)\s*:?$/i;

function units(text){return String(text||'').replace(/\r/g,'\n').split(/\n+|(?<=[.!?;])\s+|\s+[•·]\s+/).map(x=>x.trim()).filter(x=>x.length>=9).slice(0,180)}
function tierOf(text){
  if(/\b(?:essential|mandatory|must have|required|minimum requirement|you will need|proven experience|critical)\b/i.test(text))return 'essential';
  if(/\b(?:desirable|preferred|nice to have|advantageous|bonus|ideally|would be beneficial)\b/i.test(text))return 'desirable';
  return 'important';
}
function certainty(jobText,requirements){
  const words=jobText.split(/\s+/).filter(Boolean).length;
  if(words<65||requirements.length<3)return {label:'Low',reason:'Short or incomplete job description; hidden requirements are likely.'};
  if(words<160||requirements.length<5)return {label:'Limited',reason:'Some requirements are explicit, but the advertisement may omit critical operational details.'};
  return {label:'Moderate',reason:'Several requirements are described, but internal priorities and selection criteria remain unobserved.'};
}
export function extractCandidateEvidence(cv){
  const lines=units(cv);
  return CATALOG.map(skill=>{
    const matches=lines.filter(line=>skill.re.test(line)&&!SECTION_ONLY.test(line));
    const rated=matches.map(line=>{
      const action=ACTION.test(line),scale=SCALE.test(line);
      const strength=action?(scale?1:0.85):0.35;
      return {quote:line.slice(0,240),strength,grade:action?(scale?'direct-scaled':'direct'):'mentioned-only'};
    }).sort((a,b)=>b.strength-a.strength);
    return {id:skill.id,label:skill.label,evidence:rated[0]||null,mentions:rated.length};
  });
}
export function extractJobRequirements(job){
  const text=[job?.title,job?.description].filter(Boolean).join('\n');
  const lines=units(text);
  const out=[];
  for(const skill of CATALOG){
    const matches=lines.filter(line=>skill.re.test(line)&&!/\b(?:not required|not essential|no\s+.{0,45}?\s*experience\s+(?:is\s+)?needed|no\s+experience\s+(?:is\s+)?needed)\b/i.test(line));
    if(!matches.length)continue;
    const rated=matches.map(line=>({line,tier:tierOf(line)})).sort((a,b)=>TIER_RANK[b.tier]-TIER_RANK[a.tier]);
    out.push({id:skill.id,label:skill.label,tier:rated[0].tier,weight:TIER_WEIGHT[rated[0].tier],source:rated[0].line.slice(0,250),weight_basis:'explicit wording / pilot rules'});
  }
  return out;
}
function hardConstraints(job,preferences,cv){
  const out=[];
  const floor=Number(preferences?.salaryFloor)||0;
  const salaryMax=Number(job?.salary_max)||0;
  const salaryMin=Number(job?.salary_min)||0;
  if(floor){
    const status=salaryMax&&salaryMax<floor?'not_met':salaryMin&&salaryMin>=floor?'supported':'unknown';
    out.push({name:`Salary at least £${floor.toLocaleString('en-GB')}`,status,source:salaryMax||salaryMin?'Advertised salary range':'Not disclosed or overlapping range'});
  }
  const description=String(job?.description||'');
  const duration=description.match(/\b(\d{1,2})\s*[- ]?months?\s*(?:fixed[- ]term|contract|ftc)/i)||description.match(/\b(?:fixed[- ]term|contract|ftc)\s*(?:for\s*)?(\d{1,2})\s*months?/i);
  const months=duration?Number(duration[1]):null;
  const minMonths=Number(preferences?.minContractMonths)||0;
  if(minMonths){out.push({name:`Contract duration ≥ ${minMonths} months`,status:months!==null?(months<minMonths?'not_met':'supported'):'unknown',source:months!==null?`${months} months stated`:'No unambiguous duration disclosed'});}
  if(/\b(?:must hold|required to hold|valid)\b.{0,50}\b(?:certification|certificate|licen[cs]e)\b/i.test(description)){
    out.push({name:'Specific mandatory certification/licence',status:'unknown',source:'Employer asks for a credential; exact match requires manual verification'});
  }
  return out;
}
export function evaluateVacancy(cv,job,preferences={}){
  const candidate=extractCandidateEvidence(cv),requirements=extractJobRequirements(job);
  const index=new Map(candidate.map(x=>[x.id,x]));
  const assessed=requirements.map(req=>{
    const found=index.get(req.id)?.evidence||null;
    return {...req,status:found?(found.strength>=0.8?'supported':'limited_evidence'):'unknown',evidence:found?.quote||null,evidence_strength:found?.strength??null,contribution:found?req.weight*found.strength:0};
  });
  const total=assessed.reduce((n,x)=>n+x.weight,0);
  const fit=total?Math.round(100*assessed.reduce((n,x)=>n+x.contribution,0)/total):null;
  const covered=assessed.filter(x=>x.status!=='unknown').length;
  const confidence=certainty(String(job?.description||''),requirements);
  const hard=hardConstraints(job,preferences,cv);
  const conflict=hard.some(x=>x.status==='not_met');
  const recommendation=conflict?'Check hard constraints':fit===null?'Insufficient advertisement evidence':fit>=70?'Worth applying after verification':fit>=45?'Review essential gaps':'Low demonstrated coverage — investigate';
  return {version:MODEL_VERSION,fit_score:fit,score_meaning:'Weighted demonstrated coverage of advertised requirements; NOT a hiring probability',confidence,requirements:assessed,hard_constraints:hard,unknowns:assessed.filter(x=>x.status==='unknown').map(x=>x.label),evidence_coverage:{evidenced:covered,total:requirements.length},recommendation,limitations:['Weights are provisional and not outcome-calibrated.','Only published requirements are visible.','An absent CV statement is unknown, not proof of inability.','No employer-specific intelligence has been applied.']};
}
