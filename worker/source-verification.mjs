// Bounded public-source retrieval. No CV, provider credentials or cookies leave this module.
const ROOTS=['adzuna.co.uk','reed.co.uk','totaljobs.com','cv-library.co.uk','jobs.nhs.uk','jobs.ac.uk','gov.uk','myworkdayjobs.com','workdayjobs.com','greenhouse.io','lever.co','smartrecruiters.com','icims.com','successfactors.eu','successfactors.com','jobs2web.com','teamtailor.com','pinpointhq.com','tal.net','vacancy-filler.co.uk','peoplehr.net','bamboohr.com','elysiumhealthcare.co.uk','gategroup.com','ukpowernetworks.co.uk','nordanglia.com','place2be.org.uk','huntress.co.uk','driverhire.co.uk','firstrecruitment.co.uk','firstrecruitmentservices.co.uk','talentedpeople.co.uk'];
export function permittedSource(value){try{const u=new URL(value);return u.protocol==='https:'&&!u.username&&!u.password&&(!u.port||u.port==='443')&&ROOTS.some(h=>u.hostname===h||u.hostname.endsWith('.'+h))?u:null;}catch{return null;}}
const encode=x=>new TextEncoder().encode(x);
async function key(secret){return crypto.subtle.importKey('raw',encode(secret),{name:'HMAC',hash:'SHA-256'},false,['sign','verify']);}
const hex=b=>[...new Uint8Array(b)].map(x=>x.toString(16).padStart(2,'0')).join('');
export async function issueTicket(job,secret,now=Date.now()){
 const expires=now+15*60*1000;
 const signature=hex(await crypto.subtle.sign('HMAC',await key(secret),encode(JSON.stringify({job,expires}))));
 return {...job,verification_ticket:{expires,signature}};
}
export async function checkTicket(input,secret,now=Date.now()){
 const {verification_ticket:ticket,...job}=input||{};
 if(!ticket||!Number.isFinite(ticket.expires)||ticket.expires<now||ticket.expires>now+16*60*1000||!/^[a-f0-9]{64}$/.test(ticket.signature||''))return null;
 const bytes=Uint8Array.from(ticket.signature.match(/../g),h=>parseInt(h,16));
 return await crypto.subtle.verify('HMAC',await key(secret),bytes,encode(JSON.stringify({job,expires:ticket.expires})))?job:null;
}
export function htmlText(html){return String(html).replace(/<script\b[^>]*>[\s\S]*?<\/script\s*>|<style\b[^>]*>[\s\S]*?<\/style\s*>|<nav\b[^>]*>[\s\S]*?<\/nav\s*>|<footer\b[^>]*>[\s\S]*?<\/footer\s*>/gi,' ').replace(/<\/(?:p|div|li|h[1-6]|section|article)>|<br\s*\/?\s*>/gi,'\n').replace(/<[^>]+>/g,' ').replace(/&(?:nbsp|#160);/gi,' ').replace(/&amp;/gi,'&').replace(/&lt;/gi,'<').replace(/&gt;/gi,'>').replace(/&quot;/gi,'"').replace(/&#(?:39|x27);/gi,"'").replace(/[ \t]+/g,' ').replace(/\n\s*\n/g,'\n').trim();}
function postings(html){const found=[];function visit(v){if(!v||typeof v!=='object')return;if(Array.isArray(v)){v.forEach(visit);return;}if([v['@type']].flat().includes('JobPosting'))found.push(v);if(v['@graph'])visit(v['@graph']);}
 for(const m of html.matchAll(/<script\b[^>]*type\s*=\s*["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script\s*>/gi))try{visit(JSON.parse(m[1]));}catch{}
 return found;
}
function titleKey(v){return htmlText(v).toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();}
export function extractOriginal(html,job,finalUrl,observedAt){
 if(!titleKey(job.title))return {error:'identity_unverified'};
 const entries=postings(html),exact=entries.filter(x=>titleKey(x.title)===titleKey(job.title));
 // Multiple postings or a different role must not contaminate this vacancy's facts.
 if(entries.length&&exact.length!==1)return {error:'identity_unverified'};
 const p=exact[0];
 // A plain page must carry the requested role title and a vacancy-specific content boundary.
 if(!p&&!titleKey(htmlText(html.match(/<h1\b[^>]*>([\s\S]*?)<\/h1>/i)?.[1]||'')).includes(titleKey(job.title)))return {error:'identity_unverified'};
 const body=p?.description||html.match(/<article\b[^>]*>([\s\S]*?)<\/article>/i)?.[1]||html.match(/<main\b[^>]*>([\s\S]*?)<\/main>/i)?.[1];
 if(!body)return {error:'description_unavailable'};
 const text=htmlText(body);if(text.split(/\s+/).length<65)return {error:'source_summary_only'};
 if(/verify (?:you are|you're) human|access denied|captcha|enable javascript to (?:continue|view)/i.test(text))return {error:'source_access_restricted'};
 const loc=[p?.jobLocation].flat().filter(Boolean).map(x=>x.address).filter(Boolean).map(a=>[a.streetAddress,a.addressLocality,a.addressRegion,a.postalCode].filter(Boolean).join(', '));
 // Never carry indexed salary/location/contract into a verified source assessment by default.
 const verified={...job,provider_snapshot:{...job},provider_summary:job.description,description:text.slice(0,60000),description_kind:'observed_source',full_description:false,source_url:finalUrl,url:finalUrl,location:loc.join(' / '),salary_min:null,salary_max:null,salary_period:null,salary_is_predicted:null,contract_type:null,contract_time:null,closing_date:null};
 if(p?.validThrough&&/^\d{4}-\d{2}-\d{2}(?:T|$)/.test(p.validThrough))verified.closing_date=p.validThrough.slice(0,10);
 const salary=p?.baseSalary,value=salary?.value,unit=String(value?.unitText||'').toUpperCase();
 if(salary?.currency==='GBP'&&['YEAR','HOUR'].includes(unit)){
  const lo=Number(value?.minValue??value?.value),hi=Number(value?.maxValue??value?.value);
  if(lo>0||hi>0)Object.assign(verified,{salary_min:lo>0?lo:null,salary_max:hi>0?hi:null,salary_period:unit==='HOUR'?'hour':'year',salary_is_predicted:false});
 }
 const type=[p?.employmentType].flat().filter(Boolean).join(' ');if(/\bPERMANENT\b/i.test(type))verified.contract_type='permanent';
 return {job:verified,provenance:{observed_at:observedAt,requested_url:job.source_url||job.url,final_url:finalUrl,extraction:p?'JobPosting structured data':'vacancy article text',page_sha256:null,text_sha256:null,completeness:'not certified',hash_scope:'SHA-256 of UTF-8 decoded HTML and exact extracted text',publication_date:p?.datePosted||null}};
}
async function limitedText(response,limit){const reader=response.body?.getReader();if(!reader)return '';const chunks=[];let length=0;try{while(true){const {done,value}=await reader.read();if(done)break;length+=value.length;if(length>limit)throw Error('source_too_large');chunks.push(value);}const all=new Uint8Array(length);let offset=0;for(const c of chunks){all.set(c,offset);offset+=c.length;}return new TextDecoder().decode(all);}finally{await reader.cancel().catch(()=>{});}}
const cache=new Map();
export async function verifySource(job,{fetcher=fetch,now=Date.now(),useCache=true}={}){
 const requested=job.source_url||job.url,fail=reason=>({...job,source_verification:{status:'unverified',reason,observed_at:new Date(now).toISOString()}});
 const cached=useCache&&cache.get(requested);if(cached&&cached.until>now)return structuredClone(cached.value);
 let url=permittedSource(requested);if(!url||!/(^|\.)adzuna\.co\.uk$/.test(url.hostname))return fail('unsupported_discovery_source');
 const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),10000);const chain=[];
 try{
  for(let i=0;i<5;i++){
   chain.push(url.href);const r=await fetcher(url.href,{redirect:'manual',signal:controller.signal,headers:{accept:'text/html,application/xhtml+xml'}});
   if([301,302,303,307,308].includes(r.status)){const next=r.headers.get('location');await r.body?.cancel();if(!next)return fail('redirect_without_location');url=permittedSource(new URL(next,url).href);if(!url)return fail('source_domain_not_supported');continue;}
   if(!r.ok)return fail('source_http_'+r.status);
   if(!/text\/html|application\/xhtml\+xml/i.test(r.headers.get('content-type')||''))return fail('unsupported_source_format');
   const page=await limitedText(r,1000000);
   // An Adzuna page is still the aggregator, not an independently retrieved original.
   if(/(^|\.)adzuna\.co\.uk$/.test(url.hostname)){
    // Follow an ordinary HTML redirect, never execute a page script or guess a vacancy URL.
    const meta=[...page.matchAll(/<meta\b[^>]*>/gi)].find(m=>/http-equiv\s*=\s*["']refresh["']/i.test(m[0]));
    const target=meta?.[0].match(/content\s*=\s*["'][^"']*?url\s*=\s*([^"']+)["']/i)?.[1];
    if(target){const next=permittedSource(new URL(target.replace(/&amp;/g,'&').trim(),url).href);if(!next)return fail('source_domain_not_supported');if(chain.includes(next.href))return fail('redirect_limit');url=next;continue;}
    return fail('original_source_not_resolved');
   }
   const extracted=extractOriginal(page,job,url.href,new Date(now).toISOString());if(extracted.error)return fail(extracted.error);
   extracted.provenance.page_sha256=hex(await crypto.subtle.digest('SHA-256',encode(page)));
   extracted.provenance.text_sha256=hex(await crypto.subtle.digest('SHA-256',encode(extracted.job.description)));
   const value={...extracted.job,source_verification:{status:'retrieved',...extracted.provenance,redirect_chain:chain}};
   if(useCache){if(cache.size>=100)cache.delete(cache.keys().next().value);cache.set(requested,{until:now+10*60*1000,value:structuredClone(value)});}return value;
  }
  return fail('redirect_limit');
 }catch(e){return fail(controller.signal.aborted?'source_timeout':e.message==='source_too_large'?'source_too_large':'source_unavailable');}finally{clearTimeout(timer);}
}
