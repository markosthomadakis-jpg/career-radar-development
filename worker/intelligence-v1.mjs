// Limited contextual intelligence. No profile, score, storage, network or hidden clock.
import {describeVacancy,parseDate,isAutomatedRequirement} from './engine-v54.mjs';
import {employerSources} from './employer-context-data.mjs';
export const INTELLIGENCE_VERSION='1.1.0';
// Reserved/non-routable TLDs (RFC 2606/6761) are never accepted as a vacancy source, e.g. the UI placeholder https://employer.example/vacancy.
const RESERVED_TLD=/\.(?:example|invalid|test|localhost|local)$/i;
export function sourceUrl(value){try{const u=new URL(String(value||'').trim());return u.protocol==='https:'&&!u.username&&!u.password&&!RESERVED_TLD.test(u.hostname)&&u.hostname!=='localhost'?u.href:null;}catch{return null;}}
// example.com/.org/.net are documentation domains: accepted for fixtures but flagged in the UI.
export const isDocumentationDomain=value=>{try{return /(?:^|\.)example\.(?:com|org|net)$/i.test(new URL(String(value)).hostname)}catch{return false}};
const AGENCY=/\b(?:recruitment (?:agency|consultancy|business)|employment (?:agency|business)|staffing (?:agency|company|solutions)|on behalf of (?:our|a|the) client|our client is|we are recruiting for)\b/i;
export const looksLikeAgency=v=>AGENCY.test(String(v?.description||''))||/\b(?:recruitment|staffing|personnel|resourcing)\b/i.test(String(v?.company||v?.employer||''));
const norm=s=>String(s||'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();
const textUnits=s=>String(s||'').replace(/<[^>]*>/g,' ').split(/\n+|(?<=[.!?;])\s+/).map(x=>x.trim()).filter(Boolean);
const rules=[
 [/\bpayroll\b/i,'Does this involve payroll calculation or submission, or only passing documents to the payroll team?'],
 [/\b(?:workforce|rota|roster|timesheets?)\b/i,'Which workforce records, rotas or timesheets would you own, and which systems would you use?'],
 [/\b(?:hr|human resources|personnel)\b/i,'Is this routine HR administration, or does it require specialist advice or employment-law knowledge?'],
 // Employment-contract wording ("permanent contract", "variation to contract") must not trigger a procurement question.
 [/\b(?:commercial contracts?|contract management|supplier contracts?|procurement|purchasing|tender\w*)\b/i,'Does the role support records and coordination, or require commercial, legal or procurement decisions?'],
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
 // Only automated catalogue categories are compared: manual facets, line-derived items and conditions would create spurious overlap.
 const own=describeVacancy(vacancy).filter(isAutomatedRequirement),ids=new Set(own.map(x=>x.id)),seen=new Set(),comparisons=[];
 const selfIdentity=String(vacancy.id||url||norm(vacancy.title)+'|'+company+'|'+norm(vacancy.location));
 for(const peer of peers){const peerUrl=sourceUrl(peer.source_url||peer.url);if(!peerUrl)continue;
  const identity=String(peer.id||peerUrl);const tuple=norm(peer.title)+'|'+norm(peer.company||peer.employer)+'|'+norm(peer.location);
  // Identical advert text is the same vacancy even when IDs/URLs differ (e.g. an unlinked paste of a selected listing).
  if(norm(peer.description)&&norm(peer.description)===norm(original))continue;
  if(identity===selfIdentity||peerUrl===url||tuple===norm(vacancy.title)+'|'+company+'|'+norm(vacancy.location)||seen.has(identity)||seen.has(tuple))continue;
  seen.add(identity);seen.add(tuple);const reqs=describeVacancy(peer).filter(isAutomatedRequirement),shared=reqs.filter(x=>ids.has(x.id));if(shared.length<2)continue;
  const peerIds=new Set(reqs.map(x=>x.id));comparisons.push({title:String(peer.title||'Vacancy'),employer:String(peer.company||peer.employer||'Unknown'),source:peerUrl,source_description:String(peer.description||''),observed_at:evaluationDate,source_type:peer.description_kind==='summary'||peer.full_description===false?'Provider summary':'Supplied advert text',shared:shared.map(x=>({label:x.label,source_text:x.source,current_source_text:own.find(y=>y.id===x.id).source})),only_in_other:[...new Set(reqs.filter(x=>!ids.has(x.id)).map(x=>x.label))],only_in_current:[...new Set(own.filter(x=>!peerIds.has(x.id)).map(x=>x.label))],agency_text:looksLikeAgency(peer),caution:looksLikeAgency(peer)?'Agency/intermediary text: categories may describe the agency process, not the hiring role.':(peer.description_kind==='summary'||peer.full_description===false)?'Provider summary: absent categories may simply be omitted from the summary.':null,similarity:shared.length/new Set([...ids,...peerIds]).size});
 }
 comparisons.sort((a,b)=>b.similarity-a.similarity||a.source.localeCompare(b.source));
 return {version:INTELLIGENCE_VERSION,status:'enabled_limited',employer,employer_status:employer?'sourced snapshot':'No exact employer match in the checked source set; unknown, with no penalty.',questions,comparisons:comparisons.slice(0,3),fit_adjustment:0,decision_adjustment:false,limitations:['Local rules and a small dated employer source set; no automatic web research.','Shared detected categories do not establish equivalent roles or candidate suitability.','Recruitment agencies are not assumed to be the hiring employer; agency text is flagged in comparisons.','Only automated catalogue categories are compared; summaries can omit requirements.','No employer quality, hiring probability or contextual fit score is inferred.']};
}
// A content fingerprint identifies the supplied text, not its authenticity or completeness.
// SHA-256 fallback for browser previews without WebCrypto (plain HTTP). Hashing only; never authentication.
function portableSha256(bytes){
 const k=[0x428a2f98,0x71374491,0xb5c0fbcf,0xe9b5dba5,0x3956c25b,0x59f111f1,0x923f82a4,0xab1c5ed5,0xd807aa98,0x12835b01,0x243185be,0x550c7dc3,0x72be5d74,0x80deb1fe,0x9bdc06a7,0xc19bf174,0xe49b69c1,0xefbe4786,0x0fc19dc6,0x240ca1cc,0x2de92c6f,0x4a7484aa,0x5cb0a9dc,0x76f988da,0x983e5152,0xa831c66d,0xb00327c8,0xbf597fc7,0xc6e00bf3,0xd5a79147,0x06ca6351,0x14292967,0x27b70a85,0x2e1b2138,0x4d2c6dfc,0x53380d13,0x650a7354,0x766a0abb,0x81c2c92e,0x92722c85,0xa2bfe8a1,0xa81a664b,0xc24b8b70,0xc76c51a3,0xd192e819,0xd6990624,0xf40e3585,0x106aa070,0x19a4c116,0x1e376c08,0x2748774c,0x34b0bcb5,0x391c0cb3,0x4ed8aa4a,0x5b9cca4f,0x682e6ff3,0x748f82ee,0x78a5636f,0x84c87814,0x8cc70208,0x90befffa,0xa4506ceb,0xbef9a3f7,0xc67178f2];
 const h=[0x6a09e667,0xbb67ae85,0x3c6ef372,0xa54ff53a,0x510e527f,0x9b05688c,0x1f83d9ab,0x5be0cd19],size=Math.ceil((bytes.length+9)/64)*64,padded=new Uint8Array(size);padded.set(bytes);padded[bytes.length]=0x80;
 const view=new DataView(padded.buffer),bits=bytes.length*8;view.setUint32(size-8,Math.floor(bits/4294967296));view.setUint32(size-4,bits>>>0);const w=new Uint32Array(64),rotr=(x,n)=>(x>>>n)|(x<<(32-n));
 for(let off=0;off<size;off+=64){for(let i=0;i<16;i++)w[i]=view.getUint32(off+i*4);for(let i=16;i<64;i++){const a=w[i-15],b=w[i-2],s0=rotr(a,7)^rotr(a,18)^(a>>>3),s1=rotr(b,17)^rotr(b,19)^(b>>>10);w[i]=(w[i-16]+s0+w[i-7]+s1)>>>0;}let [a,b,c,d,e,f,g,hh]=h;for(let i=0;i<64;i++){const s1=rotr(e,6)^rotr(e,11)^rotr(e,25),ch=(e&f)^(~e&g),t1=(hh+s1+ch+k[i]+w[i])>>>0,s0=rotr(a,2)^rotr(a,13)^rotr(a,22),maj=(a&b)^(a&c)^(b&c),t2=(s0+maj)>>>0;hh=g;g=f;f=e;e=(d+t1)>>>0;d=c;c=b;b=a;a=(t1+t2)>>>0;}[a,b,c,d,e,f,g,hh].forEach((x,i)=>h[i]=(h[i]+x)>>>0);}
 return h.map(x=>x.toString(16).padStart(8,'0')).join('');
}
export async function fingerprint(text,{portable=false}={}){const bytes=new TextEncoder().encode(String(text||''));if(!portable&&typeof crypto!=='undefined'&&crypto.subtle)return [...new Uint8Array(await crypto.subtle.digest('SHA-256',bytes))].map(x=>x.toString(16).padStart(2,'0')).join('');return portableSha256(bytes);}
