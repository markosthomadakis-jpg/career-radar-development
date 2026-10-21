import {page} from './page.js';
import {evaluate} from './match.mjs';

const json=(body,status=200)=>new Response(JSON.stringify(body),{status,headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store','x-content-type-options':'nosniff'}});
const txt=(v,n=200)=>String(v??'').trim().slice(0,n);
const bounded=(v,min,max,fall)=>Number.isFinite(Number(v))?Math.min(max,Math.max(min,Math.trunc(Number(v)))):fall;
const statuses=new Set(['Saved','Applied','Interview','Rejected','Offer','Withdrawn']);
async function body(req,max=45000){if(+(req.headers.get('content-length')||0)>max)return null;const t=await req.text();if(t.length>max)return null;try{const d=JSON.parse(t);return d&&typeof d==='object'&&!Array.isArray(d)?d:null}catch{return null}}
const owner=req=>txt(req.headers.get('oai-authenticated-user-id'),180);
function sameOrigin(req){const o=req.headers.get('origin');try{return !o||new URL(o).origin===new URL(req.url).origin}catch{return false}}
async function api(req,env,user,path,url){
  if(!user)return json({error:'Sign in with ChatGPT to open your private workspace.'},401);
  if(!env.DB)return json({error:'Database not provisioned'},503);
  if(req.method!=='GET'&&!sameOrigin(req))return json({error:'Cross-origin write blocked'},403);
  const db=env.DB;
  if(path==='/api/me'&&req.method==='GET'){
    const [p,s,c]=await Promise.all([
      db.prepare('SELECT cv_text,updated_at FROM beta_profiles WHERE user_id=?').bind(user).first(),
      db.prepare('SELECT location,radius,salary_floor,min_months,keywords FROM beta_preferences WHERE user_id=?').bind(user).first(),
      db.prepare('SELECT consent_ai FROM beta_consent WHERE user_id=?').bind(user).first()
    ]);
    return json({email:txt(req.headers.get('oai-authenticated-user-email'),180),cv_text:p?.cv_text||'',updated_at:p?.updated_at||null,preferences:s||{location:'Crawley',radius:10,salary_floor:35000,min_months:6,keywords:'training coordinator'},consent_ai:!!c?.consent_ai,ai_enabled:false});
  }
  if(path==='/api/profile'){
    if(req.method==='DELETE'){await db.prepare('DELETE FROM beta_profiles WHERE user_id=?').bind(user).run();return json({ok:true})}
    if(req.method==='POST'){const p=await body(req);if(!p||typeof p.cv_text!=='string'||p.cv_text.length<100||p.cv_text.length>40000)return json({error:'CV must contain 100–40,000 characters.'},400);await db.prepare('INSERT INTO beta_profiles(user_id,cv_text) VALUES(?,?) ON CONFLICT(user_id) DO UPDATE SET cv_text=excluded.cv_text,updated_at=CURRENT_TIMESTAMP').bind(user,p.cv_text).run();return json({ok:true})}
  }
  if(path==='/api/preferences'&&req.method==='POST'){
    const p=await body(req,4000);if(!p)return json({error:'Invalid settings'},400);
    const loc=txt(p.location,90),keywords=txt(p.keywords,120);if(!loc||!keywords)return json({error:'Location and search terms required'},400);
    await db.prepare('INSERT INTO beta_preferences(user_id,location,radius,salary_floor,min_months,keywords) VALUES(?,?,?,?,?,?) ON CONFLICT(user_id) DO UPDATE SET location=excluded.location,radius=excluded.radius,salary_floor=excluded.salary_floor,min_months=excluded.min_months,keywords=excluded.keywords,updated_at=CURRENT_TIMESTAMP').bind(user,loc,bounded(p.radius,1,100,10),bounded(p.salary_floor,0,200000,35000),bounded(p.min_months,0,36,6),keywords).run();return json({ok:true});
  }
  if(path==='/api/consent'&&req.method==='POST'){
    const p=await body(req,1200);if(!p||typeof p.consent_ai!=='boolean')return json({error:'Explicit consent selection required'},400);
    await db.prepare('INSERT INTO beta_consent(user_id,consent_ai) VALUES(?,?) ON CONFLICT(user_id) DO UPDATE SET consent_ai=excluded.consent_ai,updated_at=CURRENT_TIMESTAMP').bind(user,p.consent_ai?1:0).run();
    return json({ok:true,consent_ai:p.consent_ai,ai_enabled:false});
  }
  if(path==='/api/applications'){
    if(req.method==='GET'){const r=await db.prepare('SELECT id,job_id,title,employer,url,status,notes,created_at FROM beta_applications WHERE user_id=? ORDER BY created_at DESC LIMIT 150').bind(user).all();return json({results:r.results||[]})}
    if(req.method==='POST'){const p=await body(req,7000);if(!p||!txt(p.title)||!txt(p.employer))return json({error:'Title and employer required'},400);const id=crypto.randomUUID();await db.prepare('INSERT INTO beta_applications(id,user_id,job_id,title,employer,url,status,notes) VALUES(?,?,?,?,?,?,?,?)').bind(id,user,txt(p.job_id,180),txt(p.title),txt(p.employer),txt(p.url,900),statuses.has(p.status)?p.status:'Saved',txt(p.notes,2000)).run();return json({ok:true,id})}
    if(req.method==='PATCH'){const p=await body(req,5000);if(!p||!statuses.has(p.status))return json({error:'Invalid status'},400);const r=await db.prepare('UPDATE beta_applications SET status=?,notes=?,updated_at=CURRENT_TIMESTAMP WHERE user_id=? AND id=?').bind(p.status,txt(p.notes,2000),user,txt(p.id,80)).run();return json({ok:!!r.meta?.changes})}
    if(req.method==='DELETE'){const p=await body(req,1200);if(!p)return json({error:'Invalid request'},400);const r=await db.prepare('DELETE FROM beta_applications WHERE user_id=? AND id=?').bind(user,txt(p.id,80)).run();return json({ok:!!r.meta?.changes})}
  }
  if(path==='/api/feedback'){
    if(req.method==='GET'){const r=await db.prepare('SELECT id,job_id,rating,note,created_at FROM beta_feedback WHERE user_id=? ORDER BY created_at DESC LIMIT 100').bind(user).all();return json({results:r.results||[]})}
    if(req.method==='POST'){const p=await body(req,3500);if(!p||!Number.isInteger(p.rating)||p.rating<1||p.rating>5)return json({error:'Rating must be 1–5'},400);await db.prepare('INSERT INTO beta_feedback(id,user_id,job_id,rating,note) VALUES(?,?,?,?,?)').bind(crypto.randomUUID(),user,txt(p.job_id,180),p.rating,txt(p.note,2500)).run();return json({ok:true})}
  }
  if(path==='/api/evaluate'&&req.method==='POST'){
    const p=await body(req,28000);if(!p||!p.job?.description)return json({error:'Job description required'},400);
    const profile=await db.prepare('SELECT cv_text FROM beta_profiles WHERE user_id=?').bind(user).first();if(!profile?.cv_text)return json({error:'Save your CV first'},400);
    const settings=await db.prepare('SELECT salary_floor,min_months FROM beta_preferences WHERE user_id=?').bind(user).first();
    const job={
      id:txt(p.job.id||p.job.job_id,180),title:txt(p.job.title),employer:txt(p.job.employer||p.job.company),
      description:txt(p.job.description,18000),closing_date:txt(p.job.closing_date,80),
      salary_min:p.job.salary_min??null,salary_max:p.job.salary_max??null,
      contract_type:txt(p.job.contract_type,100),contract_months:p.job.contract_months??null,
      location:txt(p.job.location,200),source_url:txt(p.job.source_url,900),captured_at:txt(p.job.captured_at,30)
    };
    // Europe/London calendar day; the pure engine owns no clock or storage.
    const evaluationDate=new Intl.DateTimeFormat('en-CA',{timeZone:'Europe/London',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
    const tracked=await db.prepare('SELECT job_id,title,employer,url,status FROM beta_applications WHERE user_id=? ORDER BY created_at DESC LIMIT 150').bind(user).all();
    return json({result:evaluate({profile:profile.cv_text,vacancy:job,
      preferences:{salaryFloor:settings?.salary_floor??35000,minContractMonths:settings?.min_months??6},
      evaluationDate,history:tracked.results||[]})});
  }
  if(path==='/api/jobs'&&req.method==='GET'){
    if(!env.ADZUNA_APP_ID||!env.ADZUNA_APP_KEY)return json({error:'Adzuna connection pending for this separate Beta environment. No search was sent.',code:'SOURCE_NOT_CONFIGURED'},503);
    const p=await db.prepare('SELECT location,radius,salary_floor,keywords FROM beta_preferences WHERE user_id=?').bind(user).first();
    const day=new Date().toISOString().slice(0,10);
    await db.prepare('INSERT INTO beta_job_quota(user_id,day,calls) VALUES(?,?,0) ON CONFLICT(user_id,day) DO NOTHING').bind(user,day).run();
    const q=await db.prepare('UPDATE beta_job_quota SET calls=calls+1 WHERE user_id=? AND day=? AND calls<10').bind(user,day).run();
    if(!q.meta?.changes)return json({error:'Daily Beta search limit (10) reached'},429);
    const params=new URLSearchParams({app_id:env.ADZUNA_APP_ID,app_key:env.ADZUNA_APP_KEY,results_per_page:'20',what:txt(url.searchParams.get('what')||p?.keywords||'training coordinator',100),where:txt(url.searchParams.get('where')||p?.location||'Crawley',90),distance:String(Math.ceil((p?.radius||10)*1.60934)),salary_min:String(p?.salary_floor||0),'content-type':'application/json'});
    try{const r=await fetch('https://api.adzuna.com/v1/api/jobs/gb/search/1?'+params,{signal:AbortSignal.timeout(9000)});if(!r.ok)return json({error:'Adzuna temporarily unavailable',upstream_status:r.status},502);const d=await r.json();return json({results:(d.results||[]).slice(0,20).map(j=>({id:txt(j.id),title:txt(j.title),company:txt(j.company?.display_name),location:txt(j.location?.display_name),description:txt(j.description,18000),salary_min:j.salary_min??null,salary_max:j.salary_max??null,url:txt(j.redirect_url,900),closing_date:txt(j.closing_date,40),contract_type:txt(j.contract_type,60),contract_months:j.contract_months??null,captured_at:txt(j.created,35)})),count:d.count||0})}catch{return json({error:'Search timed out'},502)}
  }
  return json({error:'Not found'},404);
}
export default {async fetch(request,env){
  const url=new URL(request.url);
  if(url.pathname.startsWith('/api/'))return api(request,env,owner(request),url.pathname,url);
  if(url.pathname!=='/')return new Response('Not found',{status:404});
  return new Response(page,{headers:{'content-type':'text/html; charset=utf-8','cache-control':'no-store','referrer-policy':'no-referrer','x-content-type-options':'nosniff','content-security-policy':"default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; connect-src 'self'; img-src 'self' data:; frame-ancestors 'none'"}});
}};
