const DAYS7=7*24*60*60*1000;
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
export function normaliseJob(raw){
 const j={...raw};j.provider=String(j.provider||'unknown');j.source_id=String(j.source_id||j.id||'');j.id=`${j.provider}:${j.source_id}`;j.title=textOnly(j.title).slice(0,300);j.company=textOnly(j.company).slice(0,200);j.location=textOnly(j.location).slice(0,300);j.description=textOnly(j.description).slice(0,30000);j.source_url=httpLink(j.source_url);j.posted_at=Number.isFinite(Date.parse(j.posted_at))?new Date(j.posted_at).toISOString():null;j.salary_min=Number.isFinite(Number(j.salary_min))&&j.salary_min!==null&&j.salary_min!==''?Number(j.salary_min):null;j.salary_max=Number.isFinite(Number(j.salary_max))&&j.salary_max!==null&&j.salary_max!==''?Number(j.salary_max):null;j.salary_currency=String(j.salary_currency||'').toUpperCase()||null;j.salary_period=String(j.salary_period||'').toLowerCase()||null;j.salary_uk_annual_verified=j.salary_currency==='GBP'&&/^(year|yearly|annual|annually)$/.test(j.salary_period);j.status=['active','closed','unknown'].includes(j.status)?j.status:'unknown';j.remote_mode=String(j.remote_mode||'unknown');j.uk_eligibility=String(j.uk_eligibility||'unknown');j.description_kind='summary';j.full_description=false;j.sources=[{provider:j.provider,source_id:j.source_id,url:j.source_url}];return j;
}
export function deduplicate(jobs){const found=new Map();const companyTitle=j=>j.company.toLowerCase().replace(/[^a-z0-9]/g,'')+'|'+j.title.toLowerCase().replace(/[^a-z0-9]/g,'');for(const j of jobs){if(!j?.title||!j?.company||!j?.source_url)continue;const url=httpLink(j.canonical_employer_url);const key=url?'ats:'+url.replace(/[?#].*$/,'').replace(/\/$/,''):'role:'+companyTitle(j)+'|'+(j.location||'').toLowerCase().replace(/[^a-z0-9]/g,'');const old=found.get(key);if(!old){found.set(key,{...j,sources:[...j.sources]});continue;}if(old.id===j.id)continue;old.sources.push(...j.sources);if(old.uk_eligibility==='unknown'&&j.uk_eligibility!=='unknown')old.uk_eligibility=j.uk_eligibility;}return [...found.values()];}
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
