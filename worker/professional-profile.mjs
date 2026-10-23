// Reviewed professional facts are distinct from search preferences. No network or storage.
export const PROFILE_VERSION='1.0.0';
export const CONCEPT_VERSION='cr-profile-1';
export const CONCEPTS=[
 ['training_operations','Training operations',/\b(?:learning operations|training operations|training admin\w*|course admin\w*|learning coordination|training coordination|training coordinator|l&d coordinator)\b/i],
 ['programme_support','Programme support',/\b(?:program(?:me)? support|program(?:me)? coordinat\w*|project support|pmo|program(?:me)? admin\w*)\b/i],
 ['records','Records and data quality',/\b(?:records?|data quality|data entry|reconcil\w*|accurate data)\b/i],
 ['reporting','Operational reporting',/\b(?:reporting|reports?|management information|dashboards?|\bmi\b)\b/i],
 ['excel','Excel',/\b(?:excel|spreadsheets?|power query)\b/i],
 ['stakeholder_support','Stakeholder and client support',/\b(?:stakeholder\w*|client support|customer service|customer support|liais\w*)\b/i],
 ['scheduling','Scheduling and coordination',/\b(?:schedul\w*|calendars?|bookings?|appointments?|logistics coordination)\b/i],
 ['documentation','Documentation and governance support',/\b(?:documentation|meeting minutes|minute.taking|action logs?|governance support)\b/i],
 ['lms','Learning platform administration',/\b(?:lms|learning management system\w*|moodle|totara|cornerstone|docebo|workday learning)\b/i],
 ['budget_support','Budget administration',/\b(?:budget tracking|budget monitoring|invoice\w*|invoic\w*|purchase orders?)\b/i],
 ['budget_ownership','Budget ownership',/\b(?:budget ownership|own(?:ed|ing)? (?:the )?budget|accountable for (?:the )?budget)\b/i],
 ['line_management','Line management',/\b(?:direct reports?|line manag\w*|managed a team|people management)\b/i],
 ['training_delivery','Training delivery',/\b(?:deliver(?:ed|ing)? training|facilitat(?:ed|ing) workshops?|classroom instruction)\b/i],
 ['accreditation','Accreditation administration',/\b(?:accreditation|awarding bod\w*|certification administration)\b/i]
].map(([id,label,re])=>({id,label,re}));
export const FAMILIES=[
 {id:'business_support',label:'Business and operations support',titles:['Business Support Administrator','Operations Administrator','Business Support Coordinator'],re:/\b(?:business support|office admin\w*|operations admin\w*|administrative (?:assistant|coordinator)|executive assistant)\b/i},
 {id:'learning',label:'Learning and training operations',titles:['Learning Operations Coordinator','Training Coordinator','Learning and Development Coordinator'],re:/\b(?:learning|training|l&d|course|accreditation)\b/i},
 {id:'programme',label:'Programme and project support',titles:['Programme Coordinator','Programme Administrator','Project Support Officer'],re:/\b(?:program(?:me)?|project|pmo)\b/i},
 {id:'reporting',label:'Reporting and management information',titles:['Reporting Analyst','MI Analyst','Reporting Administrator'],re:/\b(?:reporting|management information|mi analyst|data quality)\b/i},
 {id:'commercial',label:'Commercial operations support',titles:['Commercial Administrator','Commercial Operations Coordinator'],re:/\b(?:commercial (?:operations|admin|support)|sales operations)\b/i}
];
export const SECTORS=[['financial','Financial services',/\b(?:bank(?:ing)?|financial services|insurance|wealth|asset management)\b/i],['education','Education and training',/\b(?:university|college|education|training provider|professional learning|academy)\b/i],['professional','Professional services',/\b(?:professional services|consultancy|consulting|accountancy|law firm|legal services)\b/i],['public','Public and nonprofit services',/\b(?:council|local authority|public sector|charity|nonprofit)\b/i],['healthcare','Healthcare',/\b(?:healthcare|hospital|clinical|patient|nhs|care home)\b/i],['construction','Construction',/\b(?:construction|building site|civil engineering)\b/i],['logistics','Warehousing and logistics',/\b(?:warehouse|warehousing|distribution centre|freight|logistics)\b/i]].map(([id,label,re])=>({id,label,re}));
export function concepts(text){return CONCEPTS.filter(c=>String(text).split(/[.!?;\n]+/).some(sentence=>{const match=c.re.exec(sentence);return match&&!/\b(?:no|not|without|never)\b[^,;.!?]{0,45}$/i.test(sentence.slice(0,match.index));})).map(c=>c.id);}
export {fingerprint} from './intelligence-v1.mjs';

// Normalise typography only; return an exact span from the original source, never a paraphrase.
export function resolveQuotation(cv,quote){
 const q=String(quote||'').trim();if(q.length<12)return null;
 const literal=cv.indexOf(q);if(literal>=0)return {text:cv.slice(literal,literal+q.length),start:literal,end:literal+q.length,method:'exact'};
 function normalise(text){let out='',starts=[],ends=[];for(let i=0;i<text.length;){const ch=String.fromCodePoint(text.codePointAt(i)),end=i+ch.length;let value=ch.normalize('NFKC').toLowerCase().replace(/[‘’]/g,"'").replace(/[“”]/g,'"').replace(/[‐‑‒–—−]/g,'-');if(/\s/u.test(value))value=' ';if(value===' '&&out.endsWith(' ')){ends[ends.length-1]=end;i=end;continue;}for(let j=0;j<value.length;j++){out+=value[j];starts.push(i);ends.push(end);}i=end;}return {text:out,starts,ends};}
 const source=normalise(cv),needle=normalise(q).text.trim();const index=source.text.indexOf(needle);if(index<0)return null;
 const start=source.starts[index],end=source.ends[index+needle.length-1];return {text:cv.slice(start,end),start,end,method:'typography_normalised'};
}
export function repairEvidence(profile,cv){
 let changed=false;for(const row of [...profile.capabilities,...profile.roles]){const match=resolveQuotation(cv,row.evidence);if(match){if(row.evidence!==match.text||!row.verified_quote){row.original_ai_evidence??=row.evidence;row.evidence=match.text;changed=true;}row.verified_quote=true;row.quote_match=match.method;row.source_span={start:match.start,end:match.end};if(row.concepts)row.concepts=concepts(row.evidence);}else{if(row.verified_quote)changed=true;row.verified_quote=false;row.quote_match='unverified';delete row.source_span;}}if(changed){profile.status='draft';profile.confirmed_at=null;delete profile.profile_sha256;}return changed;
}
export function validateDraft(ai,cv){
 if(!ai||!Array.isArray(ai.capabilities)||!Array.isArray(ai.roles))throw Error('Invalid profile response');
 const exact=q=>Boolean(resolveQuotation(cv,q));
 const capabilities=ai.capabilities.slice(0,35).map((c,i)=>({id:'cap-'+i,name:String(c.name||'').slice(0,200),evidence:String(c.evidence||'').trim(),verified_quote:exact(c.evidence),concepts:concepts(c.evidence),category:['core','secondary','additional'].includes(c.category)?c.category:'secondary',scope:['support','independent','coordination','people_management','budget_ownership'].includes(c.scope)?c.scope:'support',review:'pending',use_search:true}));
 const roles=ai.roles.slice(0,20).map((r,i)=>({id:'role-'+i,title:String(r.title||''),employer:String(r.employer||''),scope:String(r.scope||''),dates:String(r.dates||'Unknown'),evidence:String(r.evidence||'').trim(),verified_quote:exact(r.evidence),review:'pending'}));
 const draft={schema_version:PROFILE_VERSION,dictionary_version:CONCEPT_VERSION,status:'draft',identity:String(ai.professional_identity||''),summary:String(ai.summary||''),capabilities,roles,uncertainties:Array.isArray(ai.uncertainties)?ai.uncertainties.map(String):[],suggested_families:FAMILIES.filter(f=>f.re.test([ai.professional_identity,...capabilities.map(c=>c.name+' '+c.evidence)].join(' '))).map(f=>f.id),confirmed_at:null};repairEvidence(draft,cv);return draft;
}
export function confirmProfile(draft,cvHash,preferences,now){
 if(draft.cv_sha256!==cvHash)throw Error('CV changed. Analyse or restore the original CV before confirming.');
 const retained=[...draft.capabilities,...draft.roles].filter(c=>c.review!=='excluded');
 if(!retained.length||!draft.capabilities.some(c=>c.review==='confirmed'))throw Error('Confirm at least one capability.');
 if(retained.some(c=>c.review!=='confirmed'||!c.verified_quote))throw Error('Confirm or exclude every finding. Unsupported quotations must be excluded.');
 if(!preferences.families?.length)throw Error('Choose at least one role family.');
 if(!preferences.location?.trim())throw Error('Set your search location.');
 if(!Number.isFinite(preferences.salaryFloor)||preferences.salaryFloor<0||!Number.isFinite(preferences.radius)||preferences.radius<1||preferences.radius>100||!Number.isFinite(preferences.minContractMonths)||preferences.minContractMonths<0)throw Error('Check salary, radius and contract preferences.');
 return {...draft,status:'confirmed',preferences:structuredClone(preferences),confirmed_at:now};
}
export function activeProfile(profile,cvHash){return Boolean(profile?.status==='confirmed'&&profile.cv_sha256===cvHash);}
export function assessRelevance(profile,job){
 const prefs=profile.preferences||{},title=String(job.title||''),text=title+'\n'+String(job.description||'');
 const hardManual=/\b(?:warehouse operativ\w*|warehouse assistant|picker|packer|forklift|construction worker|site labourer|bricklayer|scaffold\w*|delivery driver)\b/i.test(title)||(/\b(?:operations assistant|operations administrator)\b/i.test(title)&&/\b(?:picking and packing|manual handling|loading and unloading|operate a forklift)\b/i.test(text));
 if(prefs.excludeManual!==false&&hardManual)return {visible:false,reason:'Manual warehouse, driving or construction duties outside the selected professional remit',signals:[]};
 const managementSentences=text.split(/[.!?\n]+/).filter(s=>!/\b(?:no|without|not) (?:direct reports?|line management|people management)/i.test(s));
 if(prefs.level==='individual'&&managementSentences.some(s=>/\b(?:you will (?:line )?manage (?:a |the )?team|responsib\w* for (?:line |people )?management|(?:have|with|managing) \d+ direct reports)\b/i.test(s)))return {visible:false,reason:'Explicit people-management responsibility outside selected remit',signals:[]};
 const generic=/^(?:administrator|administrative assistant|coordinator|assistant|officer|operations administrator|business support administrator)$/i.test(title.trim());
 const matched=FAMILIES.filter(f=>prefs.families?.includes(f.id)&&(f.re.test(title)||(generic&&f.re.test(text))));
 if(!matched.length)return {visible:false,reason:'No selected role-family signal in the available title or summary',signals:[]};
 const selected=profile.capabilities.filter(c=>c.review==='confirmed'&&c.use_search!==false),ids=new Set(selected.flatMap(c=>c.concepts));
 const overlap=concepts(text).filter(id=>ids.has(id));
 const sector=SECTORS.find(s=>s.re.test(text));const preferred=prefs.sectors||[];
 return {visible:true,signals:matched.map(f=>f.label),overlap:overlap.map(id=>({id,label:CONCEPTS.find(c=>c.id===id).label,evidence:selected.filter(c=>c.concepts.includes(id)).map(c=>c.evidence)})),sector:sector?.label||'Unknown',sector_preferred:!preferred.length?null:sector?preferred.includes(sector.id):null,reason:'Preliminary relevance from supplied text; full requirements still need assessment'};
}
export function searchTerms(p){return FAMILIES.filter(f=>p.preferences?.families?.includes(f.id)).flatMap(f=>f.titles);}
export function confirmedEvidence(profile){return [...new Set([...profile.capabilities,...profile.roles].filter(c=>c.review==='confirmed'&&c.verified_quote).map(c=>c.evidence))].join('\n');}
