const rank={unknown:0,low:1,medium:2,high:3};
const keyOf=j=>j.canonical_key||['role',j.company,j.title,j.location].map(x=>String(x||'').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'')).join(':');
const sourcesOf=j=>Array.isArray(j.sources)&&j.sources.length?j.sources:[{provider:j.provider||'unknown',source_id:j.source_id||j.id||'',url:j.source_url||j.url||null}];
const quality=j=>(rank[j.source_reliability?.level]||0)*100+(j.full_description?30:0)+String(j.description||'').length/1000;
const canonicalUrl=value=>{try{const url=new URL(value);url.hash='';for(const name of [...url.searchParams.keys()])if(/^utm_|^(?:ref|source)$/i.test(name))url.searchParams.delete(name);return url.href;}catch{return null;}};
const known=value=>value!==null&&value!==undefined&&value!==''&&value!=='unknown';

export function canMergeVacancies(first,second){
 const firstSources=sourcesOf(first),secondSources=sourcesOf(second);
 if(firstSources.some(left=>secondSources.some(right=>left.provider===right.provider&&String(left.source_id)!==String(right.source_id))))return false;
 const sharedIdentity=firstSources.some(left=>secondSources.some(right=>(left.provider===right.provider&&left.source_id&&String(left.source_id)===String(right.source_id))||(canonicalUrl(left.url)&&canonicalUrl(left.url)===canonicalUrl(right.url))))||(known(first.requisition_id)&&String(first.requisition_id)===String(second.requisition_id));
 if(!sharedIdentity)return false;
 return !['contract_type','job_type','salary_currency','salary_period','uk_eligibility'].some(field=>known(first[field])&&known(second[field])&&String(first[field]).toLowerCase()!==String(second[field]).toLowerCase());
}

export function mergeUnifiedVacancies(vacancies=[]){
 const groups=new Map();
 for(const item of vacancies){if(!item?.title||!item?.company)continue;const key=keyOf(item),group=groups.get(key)||[],index=group.findIndex(prior=>canMergeVacancies(prior,item));if(index<0){group.push({...item,canonical_key:key,sources:sourcesOf(item),duplicate_count:sourcesOf(item).length});groups.set(key,group);continue;}const prior=group[index],preferred=quality(item)>quality(prior)?item:prior,other=preferred===item?prior:item,seen=new Set(),sources=[...sourcesOf(preferred),...sourcesOf(other)].filter(source=>{const identity=`${source.provider}:${source.source_id}:${source.url||''}`;if(seen.has(identity))return false;seen.add(identity);return true;}),next={...preferred,canonical_key:key,sources,duplicate_count:sources.length};for(const field of ['salary_min','salary_max','closing_date','contract_type','job_type','remote_mode','uk_eligibility'])if(!known(next[field])&&known(other[field]))next[field]=other[field];group[index]=next;}
 return [...groups.values()].flatMap(group=>group.map(job=>group.length>1?{...job,possible_duplicate_key:job.canonical_key}:job)).sort((first,second)=>(Date.parse(second.posted_at||second.created)||0)-(Date.parse(first.posted_at||first.created)||0));
}

const boardUrl=x=>'/api/watchlist/jobs?'+new URLSearchParams({platform:x.platform,board:x.board,employer:x.employer});
export async function runUnifiedSearch({adzunaUrl,remoteUrl,boards=[],fetchJson=async url=>{const r=await fetch(url,{headers:{Accept:'application/json'}}),data=await r.json();if(!r.ok)throw Error(data.error||`Search failed (${r.status})`);return data;}}={}){
 const requests=[{source:'adzuna',url:adzunaUrl},{source:'jobicy',url:remoteUrl},...boards.map(x=>({source:x.platform,url:boardUrl(x)}))].filter(x=>x.url);
 const settled=await Promise.allSettled(requests.map(request=>fetchJson(request.url))),vacancies=[],errors=[],sources=new Set();let incomplete=false;
 settled.forEach((entry,index)=>{const source=requests[index].source;if(entry.status==='rejected'){errors.push({source,message:String(entry.reason?.message||'Source unavailable').slice(0,160)});return;}const data=entry.value;if(!Array.isArray(data?.results)){errors.push({source,message:'Invalid vacancy response'});return;}const nested=Array.isArray(data.errors)?data.errors:[];errors.push(...nested.map(error=>({source:error.source||source,message:String(error.message||'Source unavailable').slice(0,160)})));incomplete||=Boolean(data.partial||data.hasMore||Object.keys(data.nextCursors||{}).length);vacancies.push(...data.results);if(!nested.some(error=>(error.source||source)===source)||data.results.length)sources.add(source);for(const row of data.results)for(const item of sourcesOf(row))sources.add(item.provider);});
 return {results:mergeUnifiedVacancies(vacancies),errors,sources:[...sources],partial:incomplete||errors.length>0,incomplete};
}
