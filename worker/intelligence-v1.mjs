// Limited contextual intelligence. No profile, score, storage, network or hidden clock.
import {describeVacancy,parseDate} from './engine-v54.mjs';
import {employerSources} from './employer-context-data.mjs';
export const INTELLIGENCE_VERSION='1.0.0';
export function sourceUrl(value){try{const u=new URL(String(value||''));return u.protocol==='https:'&&!u.username&&!u.password?u.href:null;}catch{return null;}}
const norm=s=>String(s||'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();
const textUnits=s=>String(s||'').replace(/<[^>]*>/g,' ').split(/\n+|(?<=[.!?;])\s+/).map(x=>x.trim()).filter(Boolean);
const rules=[
 [/\bpayroll\b/i,'Does this involve payroll calculation or submission, or only passing documents to the payroll team?'],
 [/\b(?:workforce|rota|roster|timesheets?)\b/i,'Which workforce records, rotas or timesheets would you own, and which systems would you use?'],
 [/\b(?:hr|human resources|personnel)\b/i,'Is this routine HR administration, or does it require specialist advice or employment-law knowledge?'],
 [/\b(?:contract|contracts|procurement|purchasing)\b/i,'Does the role support records and coordination, or require commercial, legal or procurement decisions?'],
 [/\b(?:shift|weekend|on.?site|hybrid)\b/i,'What are the actual working hours and required on-site days?']
];
export function buildIntelligence({vacancy={},peers=[],evaluationDate,enabled=true}={}){
 if(!parseDate(evaluationDate))throw Error('Explicit valid evaluationDate required');
 if(!enabled)return {version:INTELLIGENCE_VERSION,status:'disabled',employer:null,questions:[],comparisons:[],fit_adjustment:0,decision_adjustment:false};
 const company=norm(vacancy.company||vacancy.employer),src=employerSources.find(x=>x.aliases.includes(company)&&x.captured_at<=evaluationDate);
 const employer=src?{...src,stale:(Date.parse(evaluationDate)-Date.parse(src.captured_at))/86400000>30,source_label:'Official employer self-description; not an independent quality assessment',interpretation:src.question}:null;
 const original=String(vacancy.description||''),url=sourceUrl(vacancy.source_url||vacancy.url),questions=[];
 for(const [pattern,question] of rules){const excerpt=textUnits(original).find(x=>pattern.test(x));if(excerpt)questions.push({kind:'Question / interpretation, not a published requirement',question,excerpt,source:url,source_type:vacancy.description_kind==='summary'||vacancy.full_description===false?'Provider summary':'Supplied advert text',observed_at:evaluationDate});}
 if(employer)questions.push({kind:'Sector question / interpretation, not a published requirement',question:employer.interpretation,excerpt:employer.excerpt,source:employer.source,source_type:employer.source_type,observed_at:employer.captured_at});
 const own=describeVacancy(vacancy),ids=new Set(own.map(x=>x.id)),seen=new Set(),comparisons=[];
 const selfIdentity=String(vacancy.id||url||norm(vacancy.title)+'|'+company+'|'+norm(vacancy.location));
 for(const peer of peers){const peerUrl=sourceUrl(peer.source_url||peer.url);if(!peerUrl)continue;
  const identity=String(peer.id||peerUrl);const tuple=norm(peer.title)+'|'+norm(peer.company||peer.employer)+'|'+norm(peer.location);
  if(identity===selfIdentity||peerUrl===url||tuple===norm(vacancy.title)+'|'+company+'|'+norm(vacancy.location)||seen.has(identity)||seen.has(tuple))continue;
  seen.add(identity);seen.add(tuple);const reqs=describeVacancy(peer),shared=reqs.filter(x=>ids.has(x.id));if(shared.length<2)continue;
  const peerIds=new Set(reqs.map(x=>x.id));comparisons.push({title:String(peer.title||'Vacancy'),employer:String(peer.company||peer.employer||'Unknown'),source:peerUrl,source_description:String(peer.description||''),observed_at:evaluationDate,source_type:peer.description_kind==='summary'||peer.full_description===false?'Provider summary':'Supplied advert text',shared:shared.map(x=>({label:x.label,source_text:x.source,current_source_text:own.find(y=>y.id===x.id).source})),only_in_other:reqs.filter(x=>!ids.has(x.id)).map(x=>x.label),only_in_current:own.filter(x=>!peerIds.has(x.id)).map(x=>x.label),similarity:shared.length/new Set([...ids,...peerIds]).size});
 }
 comparisons.sort((a,b)=>b.similarity-a.similarity||a.source.localeCompare(b.source));
 return {version:INTELLIGENCE_VERSION,status:'enabled_limited',employer,employer_status:employer?'sourced snapshot':'No exact employer match in the checked source set; unknown, with no penalty.',questions,comparisons:comparisons.slice(0,3),fit_adjustment:0,decision_adjustment:false,limitations:['Local rules and a small dated employer source set; no automatic web research.','Shared detected categories do not establish equivalent roles or candidate suitability.','Recruitment agencies are not assumed to be the hiring employer.','No employer quality, hiring probability or contextual fit score is inferred.']};
}
// A content fingerprint identifies the supplied text, not its authenticity or completeness.
export async function fingerprint(text){const bytes=new TextEncoder().encode(String(text||''));return [...new Uint8Array(await crypto.subtle.digest('SHA-256',bytes))].map(x=>x.toString(16).padStart(2,'0')).join('');}
