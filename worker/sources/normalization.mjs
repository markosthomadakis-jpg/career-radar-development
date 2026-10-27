const DAYS7=7*24*60*60*1000;
export const VACANCY_SCHEMA_VERSION='vacancy.v1';
const SOURCE_RELIABILITY={
 greenhouse:{level:'high',score:0.95,kind:'official_employer_board',reason:'Direct public employer ATS board'},
 ashby:{level:'high',score:0.95,kind:'official_employer_board',reason:'Direct public employer ATS board'},
 lever:{level:'high',score:0.95,kind:'official_employer_board',reason:'Direct public employer ATS board'},
 adzuna:{level:'medium',score:0.7,kind:'aggregator',reason:'Third-party vacancy aggregator; verify against the employer advert'},
 jobicy:{level:'medium',score:0.65,kind:'aggregator',reason:'Third-party remote-jobs feed; employer status may be unverified'}
};
export function textOnly(input=''){
 return String(input||'').replace(/<script\b[^>]*>[\s\S]*?<\/script\s*>/gi,' ').replace(/<style\b[^>]*>[\s\S]*?<\/style\s*>/gi,' ').replace(/<[^>]*>/g,' ').replace(/&nbsp;|&#160;/gi,' ').replace(/&amp;/gi,'&').replace(/&lt;/gi,'<').replace(/&gt;/gi,'>').replace(/&quot;/gi,'"').replace(/&#39;|&apos;/gi,"'").replace(/\s+/g,' ').trim();
}
export function httpLink(value,allowedHost=null){try{const url=new URL(String(value||''));if(url.protocol!=='https:')return null;if(allowedHost&&url.hostname!==allowedHost&&!url.hostname.endsWith('.'+allowedHost))return null;return url.href;}catch{return null;}}
export function publishedInLast7Days(value,now=new Date()){const pub=Date.parse(value),instant=+new Date(now);return Number.isFinite(pub)&&pub<=instant&&pub>=instant-DAYS7;}
export function ukEligibility(location='',description=''){
 const geo=String(location||'').toLowerCase(),body=textOnly(description).toLowerCase(),combined=`${geo} ${body}`;
 if(/\b(?:excluding|except|not available in|not hiring in|cannot hire in|outside of)\s+(?:the\s+)?(?:uk|u\.k\.|united kingdom|britain)\b/i.test(combined))return 'ineligible';
 if(/\b(?:us(?:a)?[- ]only|united states only|canada only|eu[- ]only|european union only|must be (?:based|located|resident) in (?:the )?(?:united states|us|usa|canada|eu)\b)/i.test(combined)&&!/(?:\buk\b|united kingdom|britain)/i.test(geo))return 'ineligible';
 if(/\b(?:united kingdom|\bu\.k\.|\buk\b|britain|great britain)\b/i.test(geo))return 'eligible';
 if(/\b(?:worldwide|anywhere|global|globally|all countries)\b/i.test(geo))return 'eligible';
 return 'unknown';
}
export function remoteMode(title='',description='',sourceIsRemote=false){const str=`${title} ${textOnly(description).slice(0,3500)}`;const assertions=str.replace(/\b(?:no|without|zero)\s+(?:hybrid|on[- ]site|onsite|in[- ]office|office attendance)\b/gi,'');if(/\b(?:hybrid|on[- ]site|onsite|office[- ]based|in[- ]office|office attendance required)\b/i.test(assertions))return 'not_100_percent_remote';if(sourceIsRemote)return 'remote_provider_claim';return /\b(?:fully remote|100% remote|remote[- ]only|work from anywhere)\b/i.test(str)?'remote_explicit':'unknown';}
export function sourceReliability(provider){return {...(SOURCE_RELIABILITY[String(provider||'').toLowerCase()]||{level:'unknown',score:null,kind:'unknown',reason:'Source has not yet been reliability-classified'})};}
function slug(value=''){return textOnly(value).toLowerCase().replace(/&/g,'and').replace(/\b(?:limited|ltd|plc|inc|llc)\b/g,'').replace(/[^a-z0-9]+/g,' ').trim().replace(/\s+/g,'-');}
export function vacancyCanonicalKey(job){
 const official=httpLink(job?.canonical_employer_url);if(official)return 'url:'+official.replace(/[?#].*$/,'').replace(/\/$/,'').toLowerCase();
 return ['role',slug(job?.company),slug(job?.title),slug(job?.location)].join(':');
}
export function normaliseJob(raw){
 const j={...raw};j.schema_version=VACANCY_SCHEMA_VERSION;j.provider=String(j.provider||j.source_provider||'unknown').toLowerCase();j.source_provider=j.provider;j.source_id=String(j.source_id||j.id||'');j.id=`${j.provider}:${j.source_id}`;j.title=textOnly(j.title).slice(0,300);j.company=textOnly(j.company).slice(0,200);j.location=textOnly(j.location).slice(0,300);j.description=textOnly(j.description).slice(0,30000);j.source_url=httpLink(j.source_url||j.url);j.url=j.source_url;j.posted_at=Number.isFinite(Date.parse(j.posted_at||j.created))?new Date(j.posted_at||j.created).toISOString():null;j.created=j.posted_at;j.closing_date=j.closing_date||null;j.salary_min=Number.isFinite(Number(j.salary_min))&&j.salary_min!==null&&j.salary_min!==''?Number(j.salary_min):null;j.salary_max=Number.isFinite(Number(j.salary_max))&&j.salary_max!==null&&j.salary_max!==''?Number(j.salary_max):null;j.salary_currency=String(j.salary_currency||'').toUpperCase()||null;j.salary_period=String(j.salary_period||'').toLowerCase()||null;j.salary_uk_annual_verified=j.salary_currency==='GBP'&&/^(year|yearly|annual|annually)$/.test(j.salary_period);j.status=['active','closed','unknown'].includes(j.status)?j.status:'unknown';j.remote_mode=String(j.remote_mode||'unknown');j.uk_eligibility=String(j.uk_eligibility||'unknown');j.description_kind=j.description_kind==='full'||j.full_description===true?'full':'summary';j.full_description=j.description_kind==='full';j.source_reliability=sourceReliability(j.provider);j.canonical_key=vacancyCanonicalKey(j);j.sources=[{provider:j.provider,source_id:j.source_id,url:j.source_url}];return j;
}
function quality(j){return (j.source_reliability?.score||0)*100000+(j.full_description?50000:0)+(j.description?.length||0);}
function mergeSources(...lists){const seen=new Map();for(const source of lists.flat()){if(!source)continue;seen.set(`${source.provider}:${source.source_id}`,source);}return [...seen.values()].sort((a,b)=>(sourceReliability(b.provider).score||0)-(sourceReliability(a.provider).score||0));}
export function deduplicate(jobs){const found=new Map();for(const input of jobs){const j=input?.schema_version===VACANCY_SCHEMA_VERSION?input:{...input,schema_version:VACANCY_SCHEMA_VERSION,source_reliability:input?.source_reliability||sourceReliability(input?.provider),canonical_key:vacancyCanonicalKey(input),sources:input?.sources||[{provider:input?.provider||'unknown',source_id:input?.source_id||input?.id||'',url:input?.source_url||null}]};if(!j.title||!j.company||!j.source_url)continue;const key=j.canonical_key||vacancyCanonicalKey(j),old=found.get(key);if(!old){found.set(key,{...j,sources:[...j.sources]});continue;}if(old.id===j.id)continue;const preferred=quality(j)>quality(old)?j:old,other=preferred===j?old:j,sources=mergeSources(preferred.sources,other.sources),merged={...preferred,sources,duplicate_count:sources.length};for(const field of ['closing_date','salary_min','salary_max','salary_currency','salary_period','job_type','contract_type','remote_mode','uk_eligibility'])if((merged[field]===null||merged[field]===''||merged[field]==='unknown'||merged[field]===undefined)&&other[field]!==null&&other[field]!==undefined)merged[field]=other[field];found.set(key,merged);}return [...found.values()];}
const TARGET_TITLE=/(?:learning|training|l&d|programme|program|pmo|project support|business support|operations (?:coordinator|administrator|associate|analyst)|people operations|governance|data quality|reporting (?:analyst|coordinator)|course|seminar|workforce administrator|executive assistant|administrative assistant)/i;
const OUT_OF_SCOPE_TITLE=/\b(?:chief|director|head|vice president|vp|principal|manager|account executive|engineer|developer|architect|scientist|clinical|counsel|attorney)\b/i;
export function careerRelevance(job){
 const title=String(job?.title||'').trim();
 if(!title)return {band:'excluded',reason:'Missing job title'};
 if(OUT_OF_SCOPE_TITLE.test(title))return {band:'excluded',reason:'Specialist or senior title outside the target coordination and support level'};
 if(TARGET_TITLE.test(title))return {band:'target',reason:'Title matches a target coordination, operations or support role family'};
 return {band:'broader',reason:'No target role-family signal in the title'};
}
export function applyRemoteFilters(jobs,now=new Date(),{ukOnly=false,includeUncertain=true,relevantOnly=false,minimumSalary=0}={}){
 return deduplicate(jobs.filter(j=>publishedInLast7Days(j.posted_at,now))
  .filter(j=>['remote_provider_claim','remote_explicit'].includes(j.remote_mode))
  .filter(j=>j.uk_eligibility!=='ineligible')
  .filter(j=>!ukOnly||j.uk_eligibility==='eligible'||includeUncertain&&j.uk_eligibility==='unknown')
  .filter(j=>j.status!=='closed')
  .map(j=>({...j,career_relevance:careerRelevance(j)}))
  .filter(j=>!relevantOnly||j.career_relevance.band==='target')
  .filter(j=>!minimumSalary||!j.salary_uk_annual_verified||j.salary_max===null||j.salary_max>=minimumSalary))
  .sort((a,b)=>Date.parse(b.posted_at)-Date.parse(a.posted_at));
}
