/* Career Radar V5.4 evaluation lab — browser-local and zero OpenAI calls. */
(()=>{
  const section=`<section class="view hide" id="calibration"><div class="eyebrow">Career Radar V5.4 / contextual intelligence</div><h1>Is this application worth pursuing?</h1><p class="sub">Compare your evidence with published vacancy requirements. You make the final application decision. Local analysis only; no OpenAI request or charge.</p><div class="panel"><div class="fields"><div class="field"><label>Minimum salary (£)</label><input id="calSalary" type="number" min="0" value="35000"></div><div class="field"><label>Minimum FTC duration (months)</label><input id="calMonths" type="number" min="0" value="6"></div><div class="field wide"><label>Real vacancy from your latest Adzuna search</label><select id="calJob"><option value="">Or paste a vacancy below</option></select></div><div class="field wide"><label>Vacancy title (optional if selected above)</label><input id="calTitle" placeholder="e.g. Learning Operations Coordinator"></div><div class="field wide"><label>Employer (optional)</label><input id="calEmployer" placeholder="e.g. Deutsche Bank"></div><div class="field wide"><label>Vacancy description (optional if selected above)</label><textarea id="calDescription" rows="7" placeholder="Paste the full responsibilities and essential/desirable requirements. Short summaries are not rated."></textarea></div><div class="field wide"><label><input type="checkbox" id="calFull"> I pasted the full original advert, including its requirements.</label><small>Search results are summaries. They can identify leads, but do not support a full fit score.</small></div><div class="row wide"><button class="btn" id="calEvaluate">Evaluate evidence</button><span class="pill" id="calStatus">Loading model…</span></div></div><div class="callout">Capability fit, contextual fit and confidence are distinct. Employer research is not enabled; this does not lower an employer’s suitability. Neither score predicts hiring probability.</div></div><div class="sectionhead"><h2>Evidence, uncertainty and employer context</h2></div><div class="panel" id="calOutput"><p class="sub">Choose a complete vacancy and your evidence profile. You decide whether to apply, skip or investigate.</p></div></section>`;
  const anchor=document.getElementById('semantic')||document.getElementById('matching');
  anchor.insertAdjacentHTML('afterend',section);
  const nav='<button data-view="calibration"><span>⚖</span> Fit Calibration (V5.4)</button>';
  document.querySelector('.sidebar .nav').insertAdjacentHTML('beforeend',nav);
  document.querySelector('.mobile').insertAdjacentHTML('beforeend',nav);
  document.querySelectorAll('[data-view="calibration"]').forEach(b=>b.onclick=()=>go('calibration'));
  const el=id=>document.getElementById(id),esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  let model=null;
  import('/calibration-v54.mjs').then(m=>{model=m;el('calStatus').textContent='V5.4 model ready'}).catch(()=>el('calStatus').textContent='Model unavailable');
  const companyContext={};
  function updateJobs(){const jobs=window.__careerRadarJobs||[];el('calJob').innerHTML='<option value="">Paste a vacancy below</option>'+jobs.map((j,i)=>`<option value="${i}">${esc(j.title)} — ${esc(j.company)}</option>`).join('')}
  window.addEventListener('career-radar-results',updateJobs);updateJobs();
  const tag=status=>status==='demonstrated'||status==='supported'?'Supported':status==='partial'||status==='limited_evidence'?'Partial evidence':status==='not_met'?'Not met':'Unknown';
  function render(result,job,context,sector){
    const score=result.fit_score===null?(job.description_kind==='summary'&&result.decision!=='Skip'?'Full advert needed':'Unrated'):result.fit_score+'/100';
    const unknownHard=result.hard_constraints.filter(x=>x.status==='unknown').length;
    const rows=result.requirements.map(req=>`<tr><td><b>${esc(req.label)}</b><div style="color:#647770;font-size:12px">${esc(req.tier)} · weight ${req.weight}</div></td><td>${esc(tag(req.status))}</td><td style="font-size:12px">${req.evidence?'<i>“'+esc(req.evidence)+'”</i>':'No direct CV evidence'}<div style="color:#647770;margin-top:5px">Ad: ${esc(req.source)}</div></td></tr>`).join('');
    const hard=result.hard_constraints.map(x=>`<div style="margin:6px 0">${esc(tag(x.status))} — <b>${esc(x.name)}</b>: ${esc(x.source)}</div>`).join('')||'No hard criteria configured';
    const gaps=result.critical_evidence_gaps.map(g=>`<div class="risk">${esc(g.severity)} — ${esc(g.label)}: CV evidence unverified</div>`).join('')||'<p class="sub">No specialist gap detected by current rule catalogue; this is not a guarantee.</p>';
    const signals=context.intel_signals.map(s=>`<div>${esc(s.type)}: ${esc(s.value)} · ${esc(s.source)} · change ${s.delta>0?'+':''}${s.delta}</div>`).join('')||'<p class="sub">No reliable employer research in this pilot. Adjustment = 0.</p>';
    const sectorSignals=sector.signals.map(s=>`<div style="margin:8px 0"><b>${esc(s.requirement)}</b> · frequency ${Math.round(s.frequency*100)}% · essential intensity ${Math.round(s.criticality*100)}% · ${s.supported?'text overlap':'CV evidence unverified'}<div style="font-size:12px;color:#647770">Sources: ${s.sources.map(esc).join(' · ')}</div></div>`).join('')||'<p class="sub">No repeated, sourced sector capability signals.</p>';
    return `<div class="row" style="justify-content:space-between;align-items:center"><div><div class="eyebrow">${esc(result.version)} · ${esc(job.title)}</div><h2 style="margin:6px 0">Demonstrated fit: ${score}</h2></div><span class="pill">Confidence: ${esc(result.confidence.label)}</span></div><p class="sub">${esc(result.score_meaning)}</p><div class="callout"><b>${esc(result.decision)}</b><div style="margin-top:8px">${esc(result.confidence.reason)}</div></div><h3>Critical and specialist requirements</h3>${gaps}<div style="margin:16px 0"><b>Hard constraints</b>${hard}${unknownHard?`<div class="risk">${unknownHard} hard constraint(s) remain unverified.</div>`:''}</div><h3>Employer & sector capability intelligence</h3><div class="callout"><b>Contextual fit: ${sector.score===null?'Unknown':sector.score+'/100'} · Confidence: ${esc(sector.confidence)} · ${sector.sample_size} sourced vacancies</b><p class="sub">${esc(sector.reason)}</p>${sectorSignals}<p class="sub">Observed text overlap is not proof of capability. This test does not override hard criteria.</p></div><h3>Employer research — application priority only</h3><div class="callout"><b>Evidence fit ${score} · Priority ${context.priority_score===null?'Unrated':context.priority_score+'/100'}</b><div style="margin-top:8px">${signals}</div></div><h3>Requirement-by-requirement evidence</h3><div style="overflow-x:auto"><table style="width:100%;border-collapse:collapse;text-align:left;font-size:13px"><thead><tr><th>Requirement / weight</th><th>Status</th><th>Evidence and source</th></tr></thead><tbody>${rows||'<tr><td colspan="3">The vacancy provides too little classifiable requirement evidence. No score should be used.</td></tr>'}</tbody></table></div><div class="callout" style="margin-top:15px"><b>Unknown does not mean incapable.</b> Incomplete source text, unpublished criteria and salary are not inferred.</div>`;
  }
  el('calEvaluate').onclick=()=>{
    if(!model){el('calStatus').textContent='Model has not loaded';return}
    const cv=el('matchText')?.value.trim()||'';
    if(cv.length<100){el('calStatus').textContent='First upload or paste your CV in Evidence Matching';return}
    const selection=el('calJob').value,jobs=window.__careerRadarJobs||[];
    const manual=el('calDescription').value.trim();
    const selected=selection!==''?jobs[Number(selection)]:null;
    const job=manual?{...selected,title:el('calTitle').value.trim()||selected?.title||'Pasted vacancy',company:el('calEmployer').value.trim()||selected?.company,description:manual,description_kind:el('calFull').checked?'full':'summary',full_description:el('calFull').checked,source_provider:'manual_original',source_url:selected?.source_url||selected?.url} : selected;
    if(!job||String(job.description||'').length<30){el('calStatus').textContent='Choose a detailed vacancy or paste its description';return}
    const preferences={salaryFloor:Number(el('calSalary').value)||0,minContractMonths:Number(el('calMonths').value)||0};
    const outcome=model.evaluateV53(cv,job,preferences);
    const employer=String(job.company||el('calEmployer').value||'').toLowerCase().trim();
    const intel=companyContext[employer]||{};
    const contextual=model.withEmployerIntelligence(outcome,intel);
    const sectorEvidence={};
    const sector=model.evaluateContextualFit(outcome,cv,sectorEvidence);
    el('calOutput').innerHTML=render(outcome,job,contextual,sector);
    el('calStatus').textContent='Evaluated locally · no API charge';
  };
})();
