import {normaliseJob,httpLink,textOnly} from './normalization.mjs';

const PLATFORMS=new Set(['greenhouse','ashby','lever']);
export function validateBoard(platform,board){
 const p=String(platform||'').toLowerCase(),raw=String(board||'').trim(),b=p==='lever'?raw:raw.toLowerCase();
 if(!PLATFORMS.has(p))throw new Error('Unsupported employer board platform');
 if(!/^[A-Za-z0-9][A-Za-z0-9_.-]{0,79}$/.test(b))throw new Error('Invalid employer board identifier');
 return {platform:p,board:b};
}
export function boardFromInput(value,platform=''){
 let p=String(platform||'').toLowerCase(),board=String(value||'').trim();
 try{const u=new URL(board);if(/greenhouse\.io$/.test(u.hostname)||u.hostname==='boards.greenhouse.io'){p='greenhouse';board=u.pathname.split('/').filter(Boolean)[0]||'';}else if(u.hostname==='jobs.ashbyhq.com'){p='ashby';board=u.pathname.split('/').filter(Boolean)[0]||'';}else if(/lever\.co$/.test(u.hostname)){p='lever';board=u.pathname.split('/').filter(Boolean)[0]||'';}}catch{}
 return validateBoard(p,board);
}
function full(job,extra={}){return {...job,...extra,description_kind:'full',full_description:true,status:'active'};}
function identity(platform,board,entered,providerName=''){
 const supplied=textOnly(providerName),company=supplied||textOnly(entered);
 return {company,employer_identity:{display_name:company,status:supplied?'provider_supplied':'user_supplied',platform,board},source_reliability:{level:'high',score:0.95,kind:'official_ats_listing',reason:`Direct public ${platform} ATS listing; employer label is ${supplied?'provider-supplied':'user-supplied and must be verified against the board'}`}};
}
export function normalizeGreenhouse(job,employer,board){
 const id=identity('greenhouse',board,employer,job.company_name);const description=String(job.content||'');return full(normaliseJob({provider:'greenhouse',source_id:job.id,title:job.title||job.name,company:id.company,location:job.location?.name||'',description,source_url:httpLink(job.absolute_url),posted_at:job.first_published||job.updated_at,date_kind:job.first_published?'published':'updated',closing_date:job.application_deadline||null,job_type:null,remote_mode:/\bremote\b/i.test(job.location?.name||'')?'remote_explicit':'unknown',uk_eligibility:'unknown',status:'active'}),{board,employer_identity:id.employer_identity,source_reliability:id.source_reliability,department:(job.departments||[]).map(x=>textOnly(x.name)).filter(Boolean).join(', ')||null,offices:(job.offices||[]).map(x=>textOnly(x.name)).filter(Boolean)});
}
export function normalizeAshby(job,employer,board){
 const id=identity('ashby',board,employer,job.companyName);const description=String(job.descriptionPlain||job.descriptionHtml||'');const comp=job.compensation||{};return full(normaliseJob({provider:'ashby',source_id:job.jobUrl||job.applyUrl||job.title,title:job.title,company:id.company,location:[job.location,...(job.secondaryLocations||[]).map(x=>x.location||x)].filter(Boolean).join(' / '),description,source_url:httpLink(job.jobUrl||job.applyUrl,'ashbyhq.com'),posted_at:job.publishedAt,date_kind:'published',job_type:job.employmentType,remote_mode:job.isRemote===true||job.workplaceType==='Remote'?'remote_provider_claim':job.workplaceType==='Hybrid'?'not_100_percent_remote':'unknown',uk_eligibility:'unknown',salary_min:comp.minValue,salary_max:comp.maxValue,salary_currency:comp.currencyCode,salary_period:comp.interval,status:'active'}),{board,employer_identity:id.employer_identity,source_reliability:id.source_reliability,department:textOnly(job.department)||null,team:textOnly(job.team)||null,workplace_type:textOnly(job.workplaceType)||null,compensation_summary:textOnly(comp.compensationTierSummary)||null});
}
export function normalizeLever(job,employer,board){
 const id=identity('lever',board,employer,job.companyName);const description=[job.descriptionPlain||job.description,...(job.lists||[]).flatMap(x=>[x.text,x.content]),job.additional].filter(Boolean).join('\n');const salary=job.salaryRange||{};return full(normaliseJob({provider:'lever',source_id:job.id,title:job.text,company:id.company,location:job.categories?.location||'',description,source_url:httpLink(job.hostedUrl||job.applyUrl,'lever.co'),posted_at:Number.isFinite(Number(job.createdAt))?new Date(Number(job.createdAt)).toISOString():null,date_kind:'published',job_type:job.categories?.commitment,remote_mode:job.workplaceType==='remote'?'remote_provider_claim':job.workplaceType==='hybrid'?'not_100_percent_remote':'unknown',uk_eligibility:'unknown',salary_min:salary.min,salary_max:salary.max,salary_currency:salary.currency,salary_period:salary.interval,status:'active'}),{board,employer_identity:id.employer_identity,source_reliability:id.source_reliability,department:textOnly(job.categories?.department)||null,team:textOnly(job.categories?.team)||null,workplace_type:textOnly(job.workplaceType)||null});
}
async function json(fetchFn,url){const response=await fetchFn(url,{headers:{Accept:'application/json'},signal:AbortSignal.timeout(12000)});if(!response.ok)throw new Error(`Employer board HTTP ${response.status}`);return response.json();}
export async function fetchEmployerBoard({platform,board,employer,fetchFn=fetch}){
 ({platform,board}=validateBoard(platform,board));const company=textOnly(employer).slice(0,160);if(company.length<2)throw new Error('Employer name is required');
 if(platform==='greenhouse'){const data=await json(fetchFn,`https://boards-api.greenhouse.io/v1/boards/${board}/jobs?content=true`);if(!Array.isArray(data?.jobs))throw new Error('Invalid Greenhouse jobs response');return data.jobs.map(x=>normalizeGreenhouse(x,company,board));}
 if(platform==='ashby'){const data=await json(fetchFn,`https://api.ashbyhq.com/posting-api/job-board/${board}?includeCompensation=true`);if(!Array.isArray(data?.jobs))throw new Error('Invalid Ashby jobs response');return data.jobs.map(x=>normalizeAshby(x,company,board));}
 const data=await json(fetchFn,`https://api.lever.co/v0/postings/${board}?mode=json&limit=100`);if(!Array.isArray(data))throw new Error('Invalid Lever jobs response');return data.map(x=>normalizeLever(x,company,board));
}
