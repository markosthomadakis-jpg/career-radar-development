const rank={unknown:0,low:1,medium:2,high:3};
const keyOf=j=>j.canonical_key||['role',j.company,j.title,j.location].map(x=>String(x||'').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'')).join(':');
const sourcesOf=j=>Array.isArray(j.sources)&&j.sources.length?j.sources:[{provider:j.provider||'unknown',source_id:j.source_id||j.id||'',url:j.source_url||j.url||null}];
const quality=j=>(rank[j.source_reliability?.level]||0)*100+(j.full_description?30:0)+String(j.description||'').length/1000;

export function mergeUnifiedVacancies(vacancies=[]){
 const merged=new Map();
 for(const item of vacancies){if(!item?.title||!item?.company)continue;const key=keyOf(item),prior=merged.get(key);if(!prior){merged.set(key,{...item,canonical_key:key,sources:sourcesOf(item),duplicate_count:sourcesOf(item).length});continue;}const preferred=quality(item)>quality(prior)?item:prior,other=preferred===item?prior:item;const all=[...sourcesOf(preferred),...sourcesOf(other)],seen=new Set(),sources=all.filter(x=>{const k=`${x.provider}:${x.source_id}:${x.url||''}`;if(seen.has(k))return false;seen.add(k);return true;});const next={...other,...preferred,canonical_key:key,sources,duplicate_count:sources.length};for(const field of ['salary_min','salary_max','closing_date','contract_type','job_type','remote_mode','uk_eligibility'])if(next[field]===null||next[field]===undefined||next[field]===''||next[field]==='unknown')next[field]=other[field];merged.set(key,next);}
 return [...merged.values()].sort((a,b)=>Date.parse(b.posted_at||b.created||0)-Date.parse(a.posted_at||a.created||0));
}

const boardUrl=x=>'/api/watchlist/jobs?'+new URLSearchParams({platform:x.platform,board:x.board,employer:x.employer});
export async function runUnifiedSearch({adzunaUrl,remoteUrl,boards=[],fetchJson=async url=>{const r=await fetch(url,{headers:{Accept:'application/json'}}),data=await r.json();if(!r.ok)throw Error(data.error||`Search failed (${r.status})`);return data;}}={}){
 const requests=[{source:'adzuna',url:adzunaUrl},{source:'jobicy',url:remoteUrl},...boards.map(x=>({source:x.platform,url:boardUrl(x)}))].filter(x=>x.url);
 const settled=await Promise.allSettled(requests.map(async x=>({source:x.source,data:await fetchJson(x.url)}))),vacancies=[],errors=[],sources=new Set();
 settled.forEach((entry,i)=>{const source=requests[i].source;if(entry.status==='rejected'){errors.push({source,message:String(entry.reason?.message||'Source unavailable').slice(0,160)});return;}const rows=entry.value.data?.results||[];vacancies.push(...rows);sources.add(source);for(const row of rows)for(const item of sourcesOf(row))sources.add(item.provider);});
 return {results:mergeUnifiedVacancies(vacancies),errors,sources:[...sources],partial:errors.length>0};
}
