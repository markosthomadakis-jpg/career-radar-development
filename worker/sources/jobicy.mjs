import {normaliseJob,remoteMode,ukEligibility,httpLink} from './normalization.mjs';

const FEED='https://jobicy.com/api/jobs';
const STATUS='https://jobicy.com/api/jobs/status';
async function requestJson(url,fetchFn){
 const result=await fetchFn(url,{headers:{Accept:'application/json'},signal:AbortSignal.timeout(12000)});
 if(!result.ok){const err=new Error(`Jobicy HTTP ${result.status}`);err.status=result.status;throw err;}
 const data=await result.json();
 if(data?.success===false||!data||!Array.isArray(data.jobs))throw new Error('Jobicy response is not a valid jobs payload');
 return data;
}
export function normalizeJobicy(job){
 const description=String(job.jobDescription||job.jobExcerpt||'');
 return normaliseJob({provider:'jobicy',source_id:job.id,title:job.jobTitle,company:job.companyName,location:job.jobGeo,job_type:job.jobType,seniority:job.jobLevel,description,source_url:httpLink(job.url,'jobicy.com'),posted_at:job.pubDate,salary_min:job.salaryMin,salary_max:job.salaryMax,salary_currency:job.salaryCurrency,salary_period:job.salaryPeriod,source_description_is_full:Boolean(job.jobDescription),remote_mode:remoteMode(job.jobTitle,description,true),uk_eligibility:ukEligibility(job.jobGeo,description),status:'unknown'});
}
export function createJobicySource({fetchFn=fetch}={}){
 return {id:'jobicy',kind:'api',attribution:'Jobicy',homepage:'https://jobicy.com/',
  async fetchPage({cursor=null,count=100,tag=''}={}){
   const params=new URLSearchParams({count:String(Math.min(200,Math.max(1,Number(count)||100)))});
   if(cursor)params.set('cursor',cursor);if(tag){const term=String(tag).trim();if(term.length<3||term.length>50)throw new Error('Jobicy tag requires 3–50 characters');params.set('tag',term);}
   const data=await requestJson(`${FEED}?${params.toString()}`,fetchFn);
   return {jobs:data.jobs.map(normalizeJobicy),nextCursor:typeof data.nextCursor==='string'?data.nextCursor:null,hasMore:Boolean(data.hasMore||data.nextCursor),apiVersion:data.apiVersion||null};
  },
  async statuses(ids){
   const good=[...new Set(ids.map(x=>String(x).replace(/^jobicy:/,'')).filter(x=>/^[1-9]\d*$/.test(x)))];
   if(good.length>100)throw new Error('Jobicy status batch limit is 100');
   if(!good.length)return {};
   const data=await requestJson(`${STATUS}?ids=${good.join(',')}`,fetchFn);
   return Object.fromEntries(data.jobs.map(j=>[String(j.id),['active','closed'].includes(j.status)?j.status:'unknown']));
  }
 };
}
