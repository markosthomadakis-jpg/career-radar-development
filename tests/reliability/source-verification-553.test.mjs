import test from 'node:test';
import assert from 'node:assert/strict';
import {issueTicket,checkTicket,verifySource,permittedSource,extractOriginal} from '../../worker/source-verification.mjs';
import {vacancyReadiness} from '../../worker/engine-v54.mjs';
import worker from '../../dist/server/index.js';
const now=Date.parse('2026-10-22T12:00:00Z');
const job={id:'123',title:'Administrator',source_provider:'adzuna',source_url:'https://www.adzuna.co.uk/jobs/land/ad/123',url:'https://www.adzuna.co.uk/jobs/land/ad/123',description:'Indexed summary with missing closing date.',description_kind:'summary',full_description:false,salary_min:99999,salary_is_predicted:false,location:'London',contract_type:'permanent'};
const description='Responsibilities\nMaintain records and prepare documentation.\nEssential criteria\nExperience using Excel.\nPermanent.\n'+('Provide accurate administrative support and liaise with customers across the organisation. '.repeat(8));
const posting={ '@type':'JobPosting',title:'Administrator',description,validThrough:'2026-11-01T23:59:00Z',datePosted:'2026-10-21',baseSalary:{currency:'GBP',value:{minValue:30000,maxValue:32000,unitText:'YEAR'}},jobLocation:{address:{addressLocality:'Crawley',postalCode:'RH10 1AA'}},employmentType:'FULL_TIME'};
const html=p=>'<html><script type="application/ld+json">'+JSON.stringify(p)+'</script></html>';
const mocked=p=>async url=>url.includes('adzuna')?new Response(null,{status:302,headers:{location:'https://www.driverhire.co.uk/job/administrator/'}}):new Response(html(p),{headers:{'content-type':'text/html'}});
test('signed search tickets reject tampering and expiry without making network requests',async()=>{
 const signed=await issueTicket(job,'synthetic-secret',now);assert.deepEqual(await checkTicket(signed,'synthetic-secret',now),job);
 assert.equal(await checkTicket({...signed,url:'https://localhost/'},'synthetic-secret',now),null);
 assert.equal(await checkTicket(signed,'different-secret',now),null);
 assert.equal(await checkTicket(signed,'synthetic-secret',now+16*60*1000),null);
});
test('original retrieval precedes completeness: missing summary deadline becomes a ready original advert',async()=>{
 assert.equal(vacancyReadiness(job,'2026-10-22').ready,false);
 const result=await verifySource(job,{fetcher:mocked(posting),now,useCache:false});
 assert.equal(result.source_verification.status,'retrieved');assert.equal(result.salary_min,30000);assert.equal(result.location,'Crawley, RH10 1AA');assert.equal(result.closing_date,'2026-11-01');assert.equal(result.full_description,false);
 assert.equal(vacancyReadiness(result,'2026-10-22').ready,true);
 assert.match(result.source_verification.text_sha256,/^[a-f0-9]{64}$/);assert.match(result.source_verification.page_sha256,/^[a-f0-9]{64}$/);assert.equal(result.provider_summary,job.description);
});
test('missing original facts never inherit indexed salary, location or closing date',async()=>{
 const {baseSalary,jobLocation,validThrough,...p}=posting;const result=await verifySource({...job,closing_date:'2026-11-01'},{fetcher:mocked(p),now,useCache:false});
 assert.equal(result.source_verification.status,'retrieved');assert.equal(result.salary_min,null);assert.equal(result.location,'');assert.equal(result.closing_date,null);assert.equal(vacancyReadiness(result,'2026-10-22').ready,false);
});
test('publication date is never treated as closing date and different roles do not contaminate facts',()=>{
 const {validThrough,...p}=posting;assert.equal(extractOriginal(html(p),job,'https://www.driverhire.co.uk/job/x',now).job.closing_date,null);
 assert.equal(extractOriginal(html({...posting,title:'Payroll Manager'}),job,'https://www.driverhire.co.uk/job/x',now).error,'identity_unverified');
});
test('blocked, aggregator-only and unsupported sources stay unverified rather than missing',async()=>{
 const blocked=await verifySource(job,{fetcher:async()=>new Response('Denied',{status:403}),now,useCache:false});assert.equal(blocked.source_verification.status,'unverified');assert.equal(blocked.source_verification.reason,'source_http_403');
 const agg=await verifySource(job,{fetcher:async()=>new Response(html(posting),{headers:{'content-type':'text/html'}}),now,useCache:false});assert.equal(agg.source_verification.reason,'original_source_not_resolved');
});
test('redirect targets cannot turn source retrieval into a generic URL proxy',async()=>{
 for(const u of ['http://www.driverhire.co.uk/job/x','https://127.0.0.1/','https://localhost/','https://www.driverhire.co.uk.attacker.net/','https://user:password@www.driverhire.co.uk/'])assert.equal(permittedSource(u),null);
 let calls=0;const r=await verifySource(job,{fetcher:async()=>{calls++;return new Response(null,{status:302,headers:{location:'https://127.0.0.1/secret'}})},now,useCache:false});assert.equal(calls,1);assert.equal(r.source_verification.reason,'source_domain_not_supported');
});
test('same-origin verification route rejects forged requests before source retrieval',async()=>{
 const env={ADZUNA_APP_KEY:'synthetic-secret'},url='https://radar.invalid/api/jobs/verify';
 const noOrigin=await worker.fetch(new Request(url,{method:'POST',body:JSON.stringify(job)}),env);assert.equal(noOrigin.status,403);
 const forged=await worker.fetch(new Request(url,{method:'POST',headers:{origin:'https://radar.invalid'},body:JSON.stringify(job)}),env);assert.equal(forged.status,400);
});
test('ordinary HTML refresh follows a permitted source without running JavaScript',async()=>{
 const result=await verifySource(job,{now,useCache:false,fetcher:async u=>u.includes('adzuna')?new Response('<meta http-equiv="refresh" content="0;url=https://www.driverhire.co.uk/job/administrator/">',{headers:{'content-type':'text/html'}}):new Response(html(posting),{headers:{'content-type':'text/html'}})});
 assert.equal(result.source_verification.status,'retrieved');assert.equal(result.source_verification.redirect_chain.length,2);
});
