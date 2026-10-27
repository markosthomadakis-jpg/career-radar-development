/* Remote listings only. CV stays in the browser; provider API receives search terms only. */
(()=>{
 const nav='<button data-view="remote"><span>⌂</span> Remote jobs</button>';
 for(const selector of ['.sidebar .nav','.mobile'])document.querySelector(selector)?.insertAdjacentHTML('beforeend',nav);
 document.querySelectorAll('[data-view="remote"]').forEach(b=>b.onclick=()=>go('remote'));
 const $=id=>document.getElementById(id),esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const safeUrl=u=>{try{const x=new URL(u);return x.protocol==='https:'?x.href:'#'}catch{return '#'}};
 const form=$('remoteForm'),status=$('remoteMessage'),out=$('remoteResults'),more=$('remoteMore');
 if(!form)return;
 let tag='',cursors={},displayed=new Map(),filters={includeUncertain:false,relevantOnly:true,minimumSalary:30000};
 function salary(j){return j.salary_uk_annual_verified&&j.salary_min!==null
  ?'£'+Math.round(j.salary_min).toLocaleString('en-GB')+(j.salary_max?'–£'+Math.round(j.salary_max).toLocaleString('en-GB'):'')+' / year'
  :j.salary_min!==null?`${j.salary_currency||'Currency unknown'} ${j.salary_min} ${j.salary_period||'period unknown'} — verify salary`: 'Salary not disclosed';}
 function card(j){
  const elig=j.uk_eligibility==='eligible'?'UK eligible (provider location)':j.uk_eligibility==='unknown'?'UK eligibility needs confirmation':'UK not eligible';
  const rest=j.status==='active'?'Reported active':j.status==='closed'?'Reported closed':'Not yet checked';
  const descr=j.description.slice(0,500),fit=j.career_relevance?.band==='target'?'Target role family':'Broader role';
  const reliability=j.source_reliability?.level||'unknown';
  return `<article class="job"><div class="eyebrow">Remote · ${esc(j.provider)} · Reliability: ${esc(reliability)} · ${esc(new Date(j.posted_at).toLocaleDateString('en-GB'))}</div><h3>${esc(j.title)}</h3><div class="company">${esc(j.company)} · ${esc(j.location)}</div><div class="tags"><span>${esc(fit)}</span><span>${esc(salary(j))}</span><span>${esc(elig)}</span><span>${esc(rest)}</span></div><p>${esc(descr)}${j.description.length>500?'…':''}</p><p class="risk">${esc(j.source_reliability?.reason||'Source reliability not classified')}. Check UK eligibility, contract terms and the employer’s original advert before treating this as an application-ready match.</p><div class="row"><a href="${esc(safeUrl(j.source_url))}" target="_blank" rel="noopener noreferrer">View on ${esc(j.provider)}</a>${j.provider==='jobicy'?`<button type="button" class="btn secondary" data-check="${esc(j.id)}">Check status</button>`:''}<button type="button" class="btn secondary" data-match="${esc(j.id)}">Add to evidence matching</button></div></article>`;
 }
 function render(){out.innerHTML=[...displayed.values()].map(card).join('')||'<div class="empty">No verified recent listings for this search. Try another keyword.</div>';}
 async function load(append=false){
  status.textContent='Searching remote listings…';more.disabled=true;
  try{
   const p=new URLSearchParams({provider:'all',count:'100'});
   if(tag)p.set('tag',tag);
   p.set('include_uncertain',filters.includeUncertain?'1':'0');p.set('relevant_only',filters.relevantOnly?'1':'0');p.set('minimum_salary',String(filters.minimumSalary));
   if(append&&Object.keys(cursors).length)p.set('cursors',JSON.stringify(cursors));
   const r=await fetch('/api/sources/remote?'+p,{headers:{Accept:'application/json'}});
   const data=await r.json();if(!r.ok)throw Error(data.error||`Remote source error (${r.status})`);
   if(!append)displayed=new Map();for(const j of data.results)displayed.set(j.id,j);
   cursors=data.nextCursors||{};more.hidden=!Object.keys(cursors).length;more.disabled=false;
   render();if(!displayed.size&&data.errors?.length)out.innerHTML='<div class="empty">Remote source temporarily unavailable; no zero-results conclusion can be drawn.</div>';status.textContent=`${displayed.size} listings shown · ${data.returned} retrieved on this page`+(data.partial?' · More pages or sources pending':'')+(data.errors?.length?' · Some sources failed: '+data.errors.map(x=>x.source).join(', '):'');
  }catch(err){status.textContent=err.message;more.disabled=false;}
 }
 form.onsubmit=e=>{e.preventDefault();const data=new FormData(form);tag=String(data.get('tag')||'').trim();if(tag.length&&tag.length<3){status.textContent='Enter at least three characters, or leave keywords empty.';return;}if(tag.length>50){status.textContent='Maximum 50 characters allowed.';return;}filters={includeUncertain:data.get('include_uncertain')==='on',relevantOnly:data.get('broader_roles')!=='on',minimumSalary:Math.max(0,Number(data.get('minimum_salary'))||0)};cursors={};load(false);};
 more.onclick=()=>{if(Object.keys(cursors).length)load(true)};
 out.addEventListener('click',async e=>{
  const btn=e.target.closest('button[data-check],button[data-match]');if(!btn)return;
  const id=btn.dataset.match||btn.dataset.check;const j=displayed.get(id);if(!j)return;
  if(btn.dataset.match){const current=window.__careerRadarJobs||[];window.__careerRadarJobs=[...current.filter(x=>x.id!==j.id),j];window.dispatchEvent(new Event('career-radar-results'));btn.textContent='Added — open Fit Calibration';return;}
  btn.disabled=true;const before=btn.textContent;btn.textContent='Checking…';
  try{const r=await fetch('/api/sources/remote/status?provider=jobicy&id='+encodeURIComponent(j.source_id));const data=await r.json();if(!r.ok)throw Error(data.error||'Status unavailable');j.status=data.status||'unknown';render();}
  catch(err){btn.textContent=err.message;btn.disabled=false;setTimeout(()=>{if(btn.isConnected)btn.textContent=before},2500)}
 });
})();
