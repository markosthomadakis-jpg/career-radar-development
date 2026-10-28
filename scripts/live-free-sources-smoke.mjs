import fs from 'node:fs';
import zlib from 'node:zlib';
import {createJobicySource} from '../worker/sources/jobicy.mjs';
import {fetchEmployerBoard} from '../worker/sources/ats.mjs';
import {mergeUnifiedVacancies} from '../worker/unified-search.mjs';
import {parseDocxXml,toPlainText} from '../worker/structured-cv.mjs';
import {evaluate} from '../worker/engine-v54.mjs';

const startedAt=new Date().toISOString();
const checks=[];
let vacancies=[];
const [cvPath]=process.argv.slice(2);

function documentXml(path){const bytes=fs.readFileSync(path),view=new DataView(bytes.buffer,bytes.byteOffset,bytes.byteLength);let eocd=-1;for(let i=Math.max(0,bytes.length-65557);i<=bytes.length-22;i++)if(view.getUint32(i,true)===0x06054b50)eocd=i;if(eocd<0)throw Error('Invalid DOCX');let pos=view.getUint32(eocd+16,true),entries=view.getUint16(eocd+10,true);for(let i=0;i<entries;i++){const method=view.getUint16(pos+10,true),size=view.getUint32(pos+20,true),nameLen=view.getUint16(pos+28,true),extra=view.getUint16(pos+30,true),comment=view.getUint16(pos+32,true),local=view.getUint32(pos+42,true),name=bytes.subarray(pos+46,pos+46+nameLen).toString();if(name==='word/document.xml'){const start=local+30+view.getUint16(local+26,true)+view.getUint16(local+28,true),raw=bytes.subarray(start,start+size);return (method===8?zlib.inflateRawSync(raw):raw).toString('utf8')}pos+=46+nameLen+extra+comment}throw Error('document.xml unavailable');}

async function check(name,run){
 try{const result=await run();checks.push({name,status:'passed',...result.summary});vacancies.push(...result.jobs);}
 catch(error){checks.push({name,status:'failed',message:String(error?.message||error).slice(0,160)});}
}

await check('jobicy',async()=>{const page=await createJobicySource().fetchPage({count:20,tag:'learning'});return {jobs:page.jobs,summary:{returned:page.jobs.length,api_version:page.apiVersion||null,next_page_available:Boolean(page.hasMore),safe_https_urls:page.jobs.every(job=>String(job.source_url||'').startsWith('https://jobicy.com/')),summary_only:page.jobs.every(job=>job.description_kind==='summary'&&job.full_description===false)}};});
await check('lever',async()=>{const jobs=await fetchEmployerBoard({platform:'lever',board:'cprime',employer:'Cprime'});return {jobs,summary:{returned:jobs.length,provider_supplied_or_explicit_identity:jobs.every(job=>['provider_supplied','user_supplied'].includes(job.employer_identity?.status)),safe_https_urls:jobs.every(job=>String(job.source_url||'').startsWith('https://')),full_adverts:jobs.filter(job=>job.description_kind==='full').length}};});

const merged=mergeUnifiedVacancies(vacancies);
let localMatch=null;
if(cvPath){const profile=toPlainText(parseDocxXml(documentXml(cvPath),{fileName:'approved-redacted-cv.docx'})),full=merged.find(job=>job.description_kind==='full'&&/learning|training/i.test(job.title))||merged.find(job=>job.description_kind==='full'&&/programme|coordinator|support/i.test(job.title))||merged.find(job=>job.description_kind==='full'&&/learning|training/i.test(job.description))||merged.find(job=>job.description_kind==='full');if(full){const result=evaluate({profile,vacancy:full,preferences:{salaryFloor:0,minContractMonths:0},evaluationDate:'2026-10-28',history:[]});localMatch={provider:full.provider,title:full.title,source_kind:full.description_kind,decision:result.decision,fit_score:result.fit_score,band:result.band,confidence:result.confidence?.label,eligibility:result.eligibility?.status,requirements:result.requirements?.length||0,cv_transmitted:false};}}
console.log(JSON.stringify({started_at:startedAt,api_requests:2,cv_transmitted:false,chargeable_services_used:false,checks,combined:{input:vacancies.length,output:merged.length,merged_records:merged.filter(job=>job.duplicate_count>1).length,possible_duplicate_records:merged.filter(job=>job.possible_duplicate_key).length},local_match:localMatch},null,2));
if(checks.every(check=>check.status==='failed'))process.exitCode=1;
