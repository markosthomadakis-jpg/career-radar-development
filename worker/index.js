import {normalizeAdzunaJob} from './vacancy-input.mjs';
const originalHtml = __HTML_LITERAL__;
const matchingScript = __MATCHING_LITERAL__;
const semanticScript = __SEMANTIC_LITERAL__;
const calibrationScript = __CALIBRATION_LITERAL__;
const calibrationModel = __CALIBRATION_MODEL_LITERAL__;
const calibrationV53 = __CALIBRATION_V53_LITERAL__;
const engineV54 = __ENGINE_V54_LITERAL__;
const calibrationV54 = __CALIBRATION_V54_LITERAL__;
const feedbackCycle = __FEEDBACK_CYCLE_LITERAL__;
const intelligenceV1 = __INTELLIGENCE_V1_LITERAL__;
const employerContextData = __EMPLOYER_CONTEXT_LITERAL__;
const liveHtml = `<section class="view hide" id="live"><div class="eyebrow">Adzuna / UK vacancies</div><h1>Search live vacancies.</h1><p class="sub">Live source listings. Always verify the position is still open before applying.</p><div class="panel"><form class="fields" id="liveForm"><div class="field"><label>Keywords</label><input name="what" value="learning coordinator" maxlength="100" required></div><div class="field"><label>Location</label><input name="where" value="Crawley" maxlength="80" required></div><div class="field"><label>Radius (miles)</label><input name="distance" value="10" type="number" min="1" max="100"></div><div class="field"><label>Minimum salary (£)</label><input name="salary_min" type="number" min="0" max="250000" value="30000"></div><div class="row wide"><button class="btn" type="submit">Search Adzuna</button><small id="liveMessage">A new private API key is required to enable search.</small></div></form><div class="callout">Your API credentials never appear in the browser. Listings are not exclusive or verified open. No application is submitted automatically.</div></div><div class="sectionhead"><h2>Results</h2></div><div class="cards" id="liveResults"></div></section>`;
const addon = `<script>(()=>{const btn='<button data-view="live"><span>⌕</span> Live vacancies</button>';document.querySelector('.sidebar .nav').insertAdjacentHTML('beforeend',btn);document.querySelector('.mobile').insertAdjacentHTML('beforeend',btn);document.querySelectorAll('[data-view="live"]').forEach(b=>b.onclick=()=>go('live'));const form=document.querySelector('#liveForm'),msg=document.querySelector('#liveMessage'),results=document.querySelector('#liveResults');const safe=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));form.onsubmit=async e=>{e.preventDefault();msg.textContent='Searching…';results.innerHTML='';const p=new URLSearchParams(new FormData(form));try{const r=await fetch('/api/jobs?'+p);const data=await r.json();if(!r.ok)throw Error(data.error||'Search failed');msg.textContent=data.results.length+' results · powered by Adzuna';results.innerHTML=data.results.map(j=>'<article class="job"><h3>'+safe(j.title)+'</h3><div class="company">'+safe(j.company)+' · '+safe(j.location)+'</div><div class="tags"><span>'+safe(j.salary_min?'£'+Math.round(j.salary_min).toLocaleString('en-GB'):'Salary not disclosed')+'</span><span>Adzuna</span></div><p class="risk">Check the original listing for availability and conditions.</p><a target="_blank" rel="noopener noreferrer" href="'+(String(j.url).startsWith('https://')?safe(j.url):'#')+'">View listing ↗</a></article>').join('')||'<div class="empty">No results for these filters.</div>';}catch(err){msg.textContent=err.message}}})();</script>`;
const html=originalHtml.replace('<section class="view hide" id="profile">',liveHtml+'<section class="view hide" id="profile">').replace('</body>',addon+'<script src="/matching-client.js?v=5.5.2" defer></script><script src="/semantic-client.js?v=5.5.2" defer></script><script src="/calibration-client.js?v=5.5.2" defer></script></body>');

const profileSchema={type:'object',additionalProperties:false,required:['professional_identity','summary','roles','capabilities','career_paths','uncertainties'],properties:{
  professional_identity:{type:'string'},summary:{type:'string'},
  roles:{type:'array',items:{type:'object',additionalProperties:false,required:['employer','title','scope','responsibilities','evidence'],properties:{employer:{type:'string'},title:{type:'string'},scope:{type:'string'},responsibilities:{type:'array',items:{type:'string'}},evidence:{type:'string'}}}},
  capabilities:{type:'array',items:{type:'object',additionalProperties:false,required:['name','strength','evidence','confidence'],properties:{name:{type:'string'},strength:{type:'string'},evidence:{type:'string'},confidence:{type:'string'}}}},
  career_paths:{type:'array',items:{type:'object',additionalProperties:false,required:['role_family','rationale'],properties:{role_family:{type:'string'},rationale:{type:'string'}}}},
  uncertainties:{type:'array',items:{type:'string'}}
}};
const matchSchema={type:'object',additionalProperties:false,required:['overall_assessment','fit_score','confidence','aligned_requirements','gaps','hard_requirements','recommendation'],properties:{
  overall_assessment:{type:'string'},fit_score:{type:'integer'},confidence:{type:'string'},
  aligned_requirements:{type:'array',items:{type:'object',additionalProperties:false,required:['requirement','cv_evidence'],properties:{requirement:{type:'string'},cv_evidence:{type:'string'}}}},
  gaps:{type:'array',items:{type:'object',additionalProperties:false,required:['requirement','reason'],properties:{requirement:{type:'string'},reason:{type:'string'}}}},
  hard_requirements:{type:'array',items:{type:'object',additionalProperties:false,required:['requirement','status'],properties:{requirement:{type:'string'},status:{type:'string'}}}},
  recommendation:{type:'string'}
}};
function fail(message,status=400){return Response.json({error:message},{status,headers:{'cache-control':'no-store'}})}
function redactCvContactDetails(source,names=''){
  // Mask contact spans rather than deleting lines: PDF extraction can flatten
  // a whole page into one line containing both an email and job evidence.
  // Names to mask come from configuration (REDACT_NAMES, comma-separated), never from source code.
  let out=String(source);
  for(const n of String(names||'').split(',').map(x=>x.trim()).filter(Boolean)){const re=new RegExp('\\b'+n.replace(/[.*+?^${}()|[\]\\]/g,'\\$&').replace(/\s+/g,'\\s+')+'\\b','gi');out=out.replace(re,'[name removed]');}
  return out
    .replace(/[\w.+-]+@[\w.-]+\.[a-z]{2,}/gi,'[email removed]')
    .replace(/(?:https?:\/\/|www\.|linkedin\.com\/)[^\s|,;]+/gi,'[link removed]')
    .replace(/(?:\+44\s?\(?0?\)?|\b0)(?:[\s().-]*\d){9,11}\b/g,'[phone removed]')
    .replace(/\b(?:telephone|mobile|phone|email|linkedin)\s*:\s*(?=\[(?:phone|email|link) removed\])/gi,'')
    .trim();
}
async function cvProfileOnce(request,env){
  if(request.method!=='POST')return fail('POST required',405);
  if(request.headers.get('origin')!==new URL(request.url).origin)return fail('Same-origin request required',403);
  if(!env.OPENAI_API_KEY||!env.DB)return fail('Profile analysis is not configured',503);
  if(Number(request.headers.get('content-length')||0)>75000)return fail('Request too large',413);
  let body;try{body=await request.json()}catch{return fail('Invalid JSON')}
  if(body?.consent!==true||body?.purpose!=='career_profile_once')return fail('Specific CV-transmission consent is required',403);
  const original=typeof body.cv==='string'?body.cv.trim():'';
  if(original.length<200||original.length>60000)return fail('CV text must be between 200 and 60000 characters');
  const cv=redactCvContactDetails(original,env.REDACT_NAMES);
  if(cv.length<150)return fail('Insufficient professional content after removing contact details');
  let claimed;
  try{claimed=await env.DB.prepare('UPDATE cv_profile_budget SET used=1 WHERE id=1 AND used=0 RETURNING id').first()}
  catch{return fail('Profile budget unavailable; no API call was made',503)}
  if(!claimed)return fail('The one-time CV profile analysis has already been used',409);
  const payload={model:env.OPENAI_MODEL||'gpt-4.1-mini',store:false,max_output_tokens:2200,
    instructions:'Create a rigorous structured Career Intelligence Profile from the CV only. Ground every capability in a brief exact quotation from the CV. Distinguish demonstrable skills from plausible transferable potential. Do not invent qualifications, line-management authority, results or dates. Do not infer sensitive/protected characteristics. Mark missing information as unknown, and make confidence appropriately conservative. Use concise English.',
    input:'REDACTED CV TEXT:\n'+cv,
    text:{format:{type:'json_schema',name:'career_profile',strict:true,schema:profileSchema}}};
  try{
    const response=await fetch('https://api.openai.com/v1/responses',{method:'POST',
      headers:{authorization:'Bearer '+env.OPENAI_API_KEY,'content-type':'application/json'},
      body:JSON.stringify(payload),signal:AbortSignal.timeout(30000)});
    if(!response.ok){let code='';try{const issue=await response.json();code=String(issue?.error?.code||issue?.error?.type||'').slice(0,70).replace(/[^a-zA-Z0-9_-]/g,'')}catch{}
      return fail('One profile request was attempted; OpenAI responded '+response.status+(code?' ('+code+')':'')+'. No retry was made.',502)}
    const responseBody=await response.json();
    const raw=(responseBody.output||[]).flatMap(x=>x.content||[]).filter(x=>x.type==='output_text').map(x=>x.text).join('');
    if(!raw)return fail('OpenAI returned no structured profile. No retry was made.',502);
    return Response.json({result:JSON.parse(raw),model:responseBody.model,redacted:true,trial:'consumed'},
      {headers:{'cache-control':'no-store'}});
  }catch{return fail('Profile request failed or timed out. The one-time budget was consumed; no retry was made.',502)}
}
// A durable one-attempt budget. The atomic UPDATE is committed before the
// external request, so failures never trigger a second billable attempt.
async function syntheticTrial(request,env){
  if(request.method!=='POST')return fail('POST required',405);
  const origin=new URL(request.url).origin;
  if(request.headers.get('origin')!==origin)return fail('Same-origin request required',403);
  if(!env.OPENAI_API_KEY)return fail('OpenAI API key is not configured',503);
  if(!env.DB)return fail('Trial database is not configured',503);
  let claimed;
  try{claimed=await env.DB.prepare('UPDATE ai_trial_budget SET used = 1 WHERE id = 1 AND used = 0 RETURNING id').first()}
  catch{return fail('Trial budget is not ready; no API request was made',503)}
  if(!claimed)return fail('The single-use trial has already been claimed',409);
  const payload={model:env.OPENAI_MODEL||'gpt-4.1-mini',store:false,max_output_tokens:120,
    instructions:'Return one short English sentence. Do not ask follow-up questions.',
    input:'Synthetic career test only: A fictional applicant coordinated 40 workshops and maintained a monthly attendance report. Summarise the directly supported experience.'};
  try{
    const response=await fetch('https://api.openai.com/v1/responses',{method:'POST',
      headers:{authorization:'Bearer '+env.OPENAI_API_KEY,'content-type':'application/json'},
      body:JSON.stringify(payload),signal:AbortSignal.timeout(20000)});
    if(!response.ok){
      let code='';try{const problem=await response.json();code=String(problem?.error?.code||problem?.error?.type||'').slice(0,70).replace(/[^a-zA-Z0-9_-]/g,'')}catch{}
      return fail('One test request was attempted, but OpenAI responded '+response.status+(code?' ('+code+')':'')+'. The trial cannot be repeated.',502);
    }
    const data=await response.json();
    const output=(data.output||[]).flatMap(x=>x.content||[]).filter(x=>x.type==='output_text').map(x=>x.text).join('');
    return Response.json({success:true,model:data.model,output,trial:'consumed',personal_data_sent:false},
      {headers:{'cache-control':'no-store'}});
  }catch{return fail('One test request was attempted but could not be verified. The trial cannot be repeated.',502)}
}
async function semantic(request,env,kind){
  if(request.method!=='POST')return fail('POST required',405);
  // Paid route: a missing Origin is rejected too (previously any non-browser client could call it).
  // NOTE: Origin is not authentication; production should also sit behind Cloudflare Access or a per-user session.
  if(request.headers.get('origin')!==new URL(request.url).origin)return fail('Same-origin request required',403);
  if(!env.OPENAI_API_KEY||env.AI_BILLING_APPROVED!=='true')return fail('AI is not activated. API credentials and explicit billing approval are required.',503);
  const contentLength=Number(request.headers.get('content-length')||0);if(contentLength>75000)return fail('Request too large',413);
  let data;try{data=await request.json()}catch{return fail('Invalid JSON')};
  if(data?.consent!==true)return fail('Explicit consent to transmit professional data to OpenAI is required',403);
  const rawCv=typeof data.cv==='string'?data.cv.trim():'';
  if(rawCv.length<100||rawCv.length>60000)return fail('CV text must be between 100 and 60000 characters');
  // Same contact-detail redaction as the one-time profile route.
  const cv=redactCvContactDetails(rawCv,env.REDACT_NAMES);
  let input='';let schema=profileSchema;let name='career_profile';
  if(kind==='profile')input='CV TEXT:\n'+cv;
  else{
    const job=data.job;if(!job||typeof job!=='object'||typeof job.title!=='string'||typeof job.description!=='string'||job.description.length<60||job.description.length>10000)return fail('A sufficiently detailed job description is required');
    input='CV TEXT:\n'+cv+'\n\nJOB TITLE:\n'+job.title.slice(0,250)+'\n\nJOB DESCRIPTION:\n'+job.description;
    schema=matchSchema;name='job_match';
  }
  const instructions=kind==='profile'?
    'You are a rigorous career evidence analyst. Extract only claims supported by the CV. Ground capabilities in short exact CV quotations. Distinguish scope from seniority and never invent certifications, management authority, dates or outcomes. Use unknowns for missing facts. Write concise English. Do not infer protected characteristics.' :
    'You are a rigorous hiring-criteria analyst. Compare CV evidence to the given vacancy; distinguish essential requirements from preferences. Mark requirements as supported, unproven or not met. Never invent CV evidence or hiring probabilities. fit_score is an indicative relevance measure 0-100, not likelihood of interview. If job content is incomplete, lower confidence and explicitly mention unknowns. Write concise English.';
  const payload={model:env.OPENAI_MODEL||'gpt-4.1-mini',store:false,max_output_tokens:2200,instructions,input, text:{format:{type:'json_schema',name,strict:true,schema}}};
  try{
    const response=await fetch('https://api.openai.com/v1/responses',{method:'POST',headers:{authorization:'Bearer '+env.OPENAI_API_KEY,'content-type':'application/json'},body:JSON.stringify(payload),signal:AbortSignal.timeout(30000)});
    if(!response.ok)return fail('OpenAI request failed ('+response.status+'). Check API account and model access.',502);
    const result=await response.json();const raw=(result.output||[]).flatMap(o=>o.content||[]).filter(c=>c.type==='output_text').map(c=>c.text).join('');
    if(!raw)return fail('No structured output returned',502);
    const parsed=JSON.parse(raw);if(kind==='match')parsed.fit_score=Math.max(0,Math.min(100,Number(parsed.fit_score)||0));
    return Response.json({result:parsed,model:result.model,source:'OpenAI semantic analysis'},{headers:{'cache-control':'no-store'}});
  }catch{return fail('Semantic analysis failed; no CV data was stored by Career Radar.',502)}
}
export default {async fetch(request,env){const url=new URL(request.url);
  if(url.pathname==='/api/ai/profile-once')return cvProfileOnce(request,env);
  if(url.pathname==='/api/ai/test-once')return syntheticTrial(request,env);
  if(url.pathname==='/semantic-client.js')return new Response(semanticScript,{headers:{'content-type':'application/javascript; charset=utf-8'}});
  if(url.pathname==='/calibration-client.js')return new Response(calibrationScript,{headers:{'content-type':'application/javascript; charset=utf-8'}});
  if(url.pathname==='/feedback-cycle.mjs')return new Response(feedbackCycle,{headers:{'content-type':'text/javascript; charset=utf-8','cache-control':'no-store'}});
  if(url.pathname==='/intelligence-v1.mjs')return new Response(intelligenceV1,{headers:{'content-type':'text/javascript; charset=utf-8','cache-control':'no-store'}});
  if(url.pathname==='/employer-context-data.mjs')return new Response(employerContextData,{headers:{'content-type':'text/javascript; charset=utf-8','cache-control':'no-store'}});
  if(url.pathname==='/engine-v54.mjs')return new Response(engineV54,{headers:{'content-type':'text/javascript; charset=utf-8','cache-control':'no-store'}});
  if(url.pathname==='/calibration-v54.mjs')return new Response(calibrationV54,{headers:{'content-type':'text/javascript; charset=utf-8','cache-control':'no-store'}});
  if(url.pathname==='/api/ai/status'){
    let profileOnceAvailable=false;
    if(env.DB&&env.OPENAI_API_KEY)try{const row=await env.DB.prepare('SELECT used FROM cv_profile_budget WHERE id=1').first();profileOnceAvailable=row?.used===0}catch{}
    return Response.json({enabled:Boolean(env.OPENAI_API_KEY&&env.AI_BILLING_APPROVED==='true'),profileOnceAvailable},{headers:{'cache-control':'no-store'}});
  }
  if(url.pathname==='/api/ai/profile')return semantic(request,env,'profile');
  if(url.pathname==='/api/ai/match')return semantic(request,env,'match');
  if(url.pathname==='/matching-client.js')return new Response(matchingScript,{headers:{'content-type':'application/javascript; charset=utf-8','cache-control':'no-store'}});if(url.pathname==='/api/jobs'){
  if(!env.ADZUNA_APP_ID||!env.ADZUNA_APP_KEY)return Response.json({error:'Adzuna not configured. Rotate the exposed key, then configure the replacement securely.'},{status:503});
  const what=(url.searchParams.get('what')||'').trim().slice(0,100),where=(url.searchParams.get('where')||'').trim().slice(0,80);
  if(!what||!where)return Response.json({error:'Keywords and location are required.'},{status:400});
  const distance=Math.max(1,Math.min(100,Number(url.searchParams.get('distance'))||10)),salary_min=Math.max(0,Math.min(250000,Number(url.searchParams.get('salary_min'))||0));
  const api=new URL('https://api.adzuna.com/v1/api/jobs/gb/search/1');for(const [k,v] of Object.entries({app_id:env.ADZUNA_APP_ID,app_key:env.ADZUNA_APP_KEY,what,where,distance,salary_min,results_per_page:20,'content-type':'application/json'}))api.searchParams.set(k,String(v));
  try{const response=await fetch(api,{signal:AbortSignal.timeout(12000)});if(!response.ok)return Response.json({error:'Adzuna returned HTTP '+response.status},{status:502});const data=await response.json();return Response.json({count:data.count,results:(data.results||[]).map(normalizeAdzunaJob)},{headers:{'cache-control':'private, max-age=300'}})}catch{return Response.json({error:'Adzuna temporarily unavailable.'},{status:502})}
}if(url.pathname!=='/')return new Response('Not found',{status:404});return new Response(html,{headers:{'content-type':'text/html; charset=utf-8','cache-control':'no-store'}})}};
