/* Career Radar V5.2 evaluation lab — browser-local and zero OpenAI calls. */
(()=>{
  const section=`<section class="view hide" id="calibration"><div class="eyebrow">Career Radar V5.2 / transparent matching pilot</div><h1>Why does this job fit?</h1><p class="sub">A rule-based, evidence-weighted comparison. Nothing entered here is sent to OpenAI. Scores indicate demonstrated coverage of published requirements, never interview probabilities.</p><div class="panel"><div class="fields"><div class="field"><label>Minimum salary (£)</label><input id="calSalary" type="number" min="0" value="35000"></div><div class="field"><label>Minimum FTC duration (months)</label><input id="calMonths" type="number" min="0" value="6"></div><div class="field wide"><label>Real vacancy from your latest Adzuna search</label><select id="calJob"><option value="">Or paste a vacancy below</option></select></div><div class="field wide"><label>Vacancy title (optional if selected above)</label><input id="calTitle" placeholder="e.g. Learning Operations Coordinator"></div><div class="field wide"><label>Vacancy description (optional if selected above)</label><textarea id="calDescription" rows="7" placeholder="Paste the actual requirements section to evaluate a vacancy that is not in Adzuna."></textarea></div><div class="row wide"><button class="btn" id="calEvaluate">Evaluate with V5.2 model</button><span class="pill" id="calStatus">Loading model…</span></div></div><div class="callout">Pilot weights: essential = 3, important = 2, desirable = 1. CV actions and scale determine evidence strength. Missing CV evidence means unknown, not proof of inability. Weights are not yet empirically calibrated.</div></div><div class="sectionhead"><h2>Evidence and requirements</h2></div><div class="panel" id="calOutput"><p class="sub">Upload or paste your CV under Evidence Matching, then select a real vacancy here to review its requirements.</p></div></section>`;
  const anchor=document.getElementById('semantic')||document.getElementById('matching');
  anchor.insertAdjacentHTML('afterend',section);
  const nav='<button data-view="calibration"><span>⚖</span> Fit Calibration (V5.2)</button>';
  document.querySelector('.sidebar .nav').insertAdjacentHTML('beforeend',nav);
  document.querySelector('.mobile').insertAdjacentHTML('beforeend',nav);
  document.querySelectorAll('[data-view="calibration"]').forEach(b=>b.onclick=()=>go('calibration'));
  const el=id=>document.getElementById(id),esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  let model=null;
  import('/calibration-model.mjs').then(m=>{model=m;el('calStatus').textContent='Pilot model ready'}).catch(()=>el('calStatus').textContent='Model unavailable');
  function updateJobs(){const jobs=window.__careerRadarJobs||[];el('calJob').innerHTML='<option value="">Paste a vacancy below</option>'+jobs.map((j,i)=>`<option value="${i}">${esc(j.title)} — ${esc(j.company)}</option>`).join('')}
  window.addEventListener('career-radar-results',updateJobs);updateJobs();
  const tag=status=>status==='supported'?'Supported':status==='limited_evidence'?'Limited evidence':status==='not_met'?'Not met':'Unknown';
  function render(result,job){
    const score=result.fit_score===null?'Unrated':result.fit_score+'/100';
    const unknownHard=result.hard_constraints.filter(x=>x.status==='unknown').length;
    const rows=result.requirements.map(req=>`<tr><td><b>${esc(req.label)}</b><div style="color:#647770;font-size:12px">${esc(req.tier)} · weight ${req.weight}</div></td><td>${esc(tag(req.status))}</td><td style="font-size:12px">${req.evidence?'<i>“'+esc(req.evidence)+'”</i>':'No direct CV evidence'}<div style="color:#647770;margin-top:5px">Ad: ${esc(req.source)}</div></td></tr>`).join('');
    const hard=result.hard_constraints.map(x=>`<div style="margin:6px 0">${esc(tag(x.status))} — <b>${esc(x.name)}</b>: ${esc(x.source)}</div>`).join('')||'No hard criteria configured';
    return `<div class="row" style="justify-content:space-between;align-items:center"><div><div class="eyebrow">${esc(result.version)} · ${esc(job.title)}</div><h2 style="margin:6px 0">Demonstrated fit: ${score}</h2></div><span class="pill">Confidence: ${esc(result.confidence.label)}</span></div><p class="sub">${esc(result.score_meaning)}</p><div class="callout"><b>${esc(result.recommendation)}</b><div style="margin-top:8px">${esc(result.confidence.reason)}</div></div><div style="margin:16px 0"><b>Hard constraints</b>${hard}${unknownHard?`<div class="risk">${unknownHard} hard constraint(s) remain unverified.</div>`:''}</div><h3>Requirement-by-requirement evidence</h3><div style="overflow-x:auto"><table style="width:100%;border-collapse:collapse;text-align:left;font-size:13px"><thead><tr><th>Requirement / weight</th><th>Status</th><th>Evidence and source</th></tr></thead><tbody>${rows||'<tr><td colspan="3">The vacancy provides too little classifiable requirement evidence. No score should be used.</td></tr>'}</tbody></table></div><div class="callout" style="margin-top:15px"><b>Unknown does not mean incapable.</b> The model cannot see an employer's unpublished priorities. This is a pilot, not an outcome-calibrated predictor.</div>`;
  }
  el('calEvaluate').onclick=()=>{
    if(!model){el('calStatus').textContent='Model has not loaded';return}
    const cv=el('matchText')?.value.trim()||'';
    if(cv.length<100){el('calStatus').textContent='First upload or paste your CV in Evidence Matching';return}
    const selection=el('calJob').value,jobs=window.__careerRadarJobs||[];
    const manual=el('calDescription').value.trim();
    const job=manual?{title:el('calTitle').value.trim()||'Pasted vacancy',description:manual}:(selection!==''?jobs[Number(selection)]:null);
    if(!job||String(job.description||'').length<30){el('calStatus').textContent='Choose a detailed vacancy or paste its description';return}
    const preferences={salaryFloor:Number(el('calSalary').value)||0,minContractMonths:Number(el('calMonths').value)||0};
    const outcome=model.evaluateVacancy(cv,job,preferences);
    el('calOutput').innerHTML=render(outcome,job);
    el('calStatus').textContent='Evaluated locally · no API charge';
  };
})();
