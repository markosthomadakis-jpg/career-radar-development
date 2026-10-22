/* Career Radar V4: local, explainable evidence matching. No CV text leaves the browser. */
(()=>{
  let engine=null;import('/engine-v54.mjs').then(m=>{engine=m;if(jobs.length)displayJobs(jobs)}).catch(()=>{const target=document.querySelector('#matchStatus');if(target)target.textContent='Evidence engine unavailable. Results are not scored.';});
  const STORE='career-radar-v4-profile';
  const dimensions=[
    {name:'Training operations',weight:25,terms:['training','learning','course','seminar','workshop','l&d','accreditation','facilitator','trainer','lms']},
    {name:'Programme support',weight:20,terms:['programme','program','project','pmo','coordinat','schedule','logistics','planning','delivery']},
    {name:'Administration & governance',weight:15,terms:['administrat','records','documentation','compliance','governance','minutes','policy','audit']},
    {name:'Reporting & data',weight:15,terms:['report','excel','power bi','dashboard','data quality','analysis','metrics','kpi']},
    {name:'Stakeholder & client service',weight:15,terms:['stakeholder','customer','client','participant','communication','liaison','relationship']},
    {name:'Commercial operations',weight:10,terms:['commercial','supplier','procurement','purchas','quote','pricing','contract']}
  ];
  const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const validUrl=v=>{try{const u=new URL(v);return u.protocol==='https:'?u.href:'#'}catch{return '#'}};
  const applicationOpenedAt=new Date().toISOString();
  let profile='',jobs=[],searchStartedAt=null,searchPage=0,searchParams=null;
  const settings=`<section class="view hide" id="matching"><div class="eyebrow">Career Radar V5.6 candidate / Structured evidence</div><h1>Your professional evidence.</h1><p class="sub">Analyse your own CV locally and compare it with live vacancies. Evidence matches are indicative, not hiring probabilities. No CV content is uploaded to our server or Adzuna.</p><div class="panel"><div class="fields"><div class="field wide"><label for="matchFile">CV file (.txt, .docx, .pdf)</label><input id="matchFile" type="file" accept=".txt,.docx,.pdf"><small>Files are processed in your browser. PDF parsing needs an optional third-party PDF.js script; if unavailable, paste text below.</small></div><textarea id="matchText" hidden aria-hidden="true"></textarea><div class="field wide"><label for="matchCore">Core skills</label><textarea id="matchCore" rows="5" placeholder="Keep truthful original evidence, tools and scope. One statement per line."></textarea></div><div class="field wide"><label for="matchAdditional">Additional skills</label><textarea id="matchAdditional" rows="5" placeholder="Keep truthful original evidence, tools and scope. One statement per line."></textarea></div><div class="field wide"><label for="matchExperience">Experience & evidence</label><textarea id="matchExperience" rows="5" placeholder="Keep truthful original evidence, tools and scope. One statement per line."></textarea></div><div class="row wide"><button class="btn" id="matchAnalyse">Build evidence profile</button><button class="btn outline" id="matchClear">Clear local CV data</button></div></div><div id="matchStatus" class="callout">No professional evidence analysed yet.</div><div id="matchProfile" style="margin-top:16px"></div></div><div class="sectionhead"><h2>Matching methodology</h2></div><div class="panel"><p class="sub">This initial engine detects evidence against published requirements and specialist criteria and checks which are requested by each job description. It does not invent qualifications or assess protected characteristics. Missing evidence is labelled unknown, not absent. Results with limited descriptions are marked low confidence.</p><p class="sub">Build the three-part profile here, discover recent vacancies, then compare the published criteria in Fit Calibration. Discovery summaries do not receive fit scores.</p></div></section>`;
  document.querySelector('#profile').insertAdjacentHTML('beforebegin',settings);
  const button='<button data-view="matching"><span>◈</span> Evidence matching</button>';
  document.querySelector('.sidebar .nav').insertAdjacentHTML('beforeend',button);
  document.querySelector('.mobile').insertAdjacentHTML('beforeend',button);
  document.querySelectorAll('[data-view="matching"]').forEach(b=>b.onclick=()=>go('matching'));
  const cv=document.querySelector('#matchText'),stat=document.querySelector('#matchStatus'),evidence=document.querySelector('#matchProfile');
  try{profile=localStorage.getItem(STORE)||'';cv.value=profile}catch{}
  const structuredKey='career-radar-structured-profile-v1';
  function structuredProfile(){return {core:document.getElementById('matchCore').value,additional:document.getElementById('matchAdditional').value,experience:document.getElementById('matchExperience').value};}
  function syncStructured(){const p=structuredProfile();cv.value=['core','additional','experience'].map(k=>k.toUpperCase()+'\n'+p[k]).join('\n\n');window.__careerRadarStructuredProfile=p;window.dispatchEvent(new CustomEvent('career-radar-profile-changed'));}
  try{const p=JSON.parse(localStorage.getItem(structuredKey)||'null');if(p){document.getElementById('matchCore').value=p.core||'';document.getElementById('matchAdditional').value=p.additional||'';document.getElementById('matchExperience').value=p.experience||'';}else document.getElementById('matchExperience').value=profile;syncStructured();}catch{}
  ['matchCore','matchAdditional','matchExperience'].forEach(id=>document.getElementById(id).addEventListener('input',syncStructured));
  function findTerms(text,dim){const low=text.toLowerCase();return dim.terms.filter(x=>low.includes(x));}
  function explainProfile(){
    if(!profile.trim()){stat.textContent='Enter a CV to enable matching. The application does not assume any qualifications.';evidence.innerHTML='';return;}
    const groups=dimensions.map(d=>({...d,found:findTerms(profile,d)}));
    stat.textContent='Local evidence extracted. Please check each finding against your actual experience; keyword occurrences are not proof of proficiency.';
    evidence.innerHTML=groups.map(g=>`<div style="margin:10px 0;padding:12px;border:1px solid #e1e7e5;border-radius:10px"><b>${esc(g.name)}</b><div class="source-note">${g.found.length?'Keywords evidenced in CV: '+g.found.map(esc).join(', '):'No matching phrases identified — unknown, not a proven gap.'}</div></div>`).join('');
  }
  function updateProfile(){syncStructured();localStorage.setItem(structuredKey,JSON.stringify(structuredProfile()));profile=cv.value.slice(0,60000);try{localStorage.setItem(STORE,profile)}catch{stat.textContent='Browser storage unavailable; profile exists only in this tab.'}explainProfile();}
  document.querySelector('#matchAnalyse').onclick=()=>{updateProfile();import('/concept-dictionary.mjs').then(d=>{evidence.innerHTML=Object.entries(structuredProfile()).map(([field,text])=>`<div class="callout"><b>${esc(field)}</b><p>${d.conceptsIn(text).map(c=>esc(c.label)+' ['+esc(c.id)+']').join(' · ')||'No mapped concepts; original text is retained.'}</p><small>Dictionary ${esc(d.DICTIONARY_VERSION)}. Concept detection is not proof of proficiency; evaluation checks the original statements.</small></div>`).join('');});if(jobs.length)displayJobs(jobs);};
  document.querySelector('#matchClear').onclick=()=>{if(!confirm('Remove the CV text stored locally in this browser?'))return;profile='';cv.value='';['matchCore','matchAdditional','matchExperience'].forEach(id=>document.getElementById(id).value='');localStorage.removeItem(structuredKey);localStorage.removeItem(STORE);syncStructured();cv.value='';explainProfile();if(jobs.length)displayJobs(jobs);};
  document.querySelector('#matchFile').onchange=async e=>{
    const file=e.target.files?.[0];if(!file)return;stat.textContent='Reading CV locally…';
    try{
      let text;if(/\.txt$/i.test(file.name))text=await file.text();
      else if(/\.docx$/i.test(file.name))text=await parseDocx(file);
      else if(/\.pdf$/i.test(file.name))text=await parsePdf(file);
      else throw Error('Unsupported file type');
      if(!text.trim())throw Error('No readable CV text found');cv.value=text.slice(0,60000);document.getElementById('matchExperience').value=cv.value;document.getElementById('matchCore').value='';document.getElementById('matchAdditional').value='';syncStructured();stat.textContent='File extracted locally. Please review the text and select Build evidence profile.';
    }catch(err){stat.textContent=err.message+' — you can paste the CV text instead.'}
  };
  async function parseDocx(file){
    const bytes=new Uint8Array(await file.arrayBuffer());let pos=0;
    while(pos+30<bytes.length){const dv=new DataView(bytes.buffer,bytes.byteOffset+pos);
      if(dv.getUint32(0,true)!==0x04034b50)break;
      const flags=dv.getUint16(6,true),method=dv.getUint16(8,true),compressed=dv.getUint32(18,true),nameLen=dv.getUint16(26,true),extra=dv.getUint16(28,true);
      const name=new TextDecoder().decode(bytes.slice(pos+30,pos+30+nameLen));const start=pos+30+nameLen+extra;
      if(flags&8)throw Error('Unsupported DOCX layout; paste CV text');
      if(name==='word/document.xml'){
        let raw=bytes.slice(start,start+compressed);
        if(method===8){const stream=new Blob([raw]).stream().pipeThrough(new DecompressionStream('deflate-raw'));raw=new Uint8Array(await new Response(stream).arrayBuffer())}
        else if(method!==0)throw Error('Unsupported DOCX compression');
        return new TextDecoder().decode(raw).replace(/<w:tab\b[^>]*\/>/g,'\t').replace(/<\/w:p>/g,'\n').replace(/<[^>]*>/g,' ').replace(/&amp;/g,'&').replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/[ \t]+/g,' ').slice(0,60000);
      }
      pos=start+compressed;
    }throw Error('Could not locate document text in DOCX');
  }
  async function parsePdf(file){
    if(!window.pdfjsLib){await new Promise((resolve,reject)=>{const s=document.createElement('script');s.src='https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js';s.onload=resolve;s.onerror=()=>reject(Error('PDF reader unavailable'));document.head.appendChild(s)})}
    const pdfjs=window.pdfjsLib;pdfjs.GlobalWorkerOptions.workerSrc='https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
    const pdf=await pdfjs.getDocument({data:new Uint8Array(await file.arrayBuffer())}).promise;let output=[];
    for(let i=1;i<=Math.min(pdf.numPages,30);i++){const page=await pdf.getPage(i),content=await page.getTextContent();output.push(content.items.map(x=>x.str||'').join(' '))}
    return output.join('\n');
  }
  function scoreJob(job){
    if(!engine)return {score:null,confidence:'Low',confidenceLabel:'Low',decision:'Not assessable',active:[]};
    // Human Skip reviews become an explicit exclusion; preferences come from the same controls as the evaluation screen.
    let reviews=[];try{reviews=JSON.parse(localStorage.getItem('career-radar-human-reviews-v1')||'[]')}catch{}
    const history=[]; // Review choices are feedback; only explicit exclusions may gate eligibility.
    const months=Number(document.getElementById('calMonths')?.value);
    const result=engine.evaluate({profile,vacancy:job,history,preferences:{requireClassificationReview:true,requireListingCompleteness:false,salaryFloor:Number(document.getElementById('calSalary')?.value)||0,minContractMonths:Number.isFinite(months)?months:6},evaluationDate:new Intl.DateTimeFormat('en-CA',{timeZone:'Europe/London',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date())});
    return {...result,score:result.fit_score,confidenceLabel:result.confidence.label,confidence:result.confidence.label,active:result.requirements.map(r=>({name:r.label,hit:r.status==='demonstrated',available:r.evidence?[r.evidence]:[]}))};
  }
  function freshInfo(j){const f=engine?.publicationWindow(j,searchStartedAt);const date=f?.published_at?new Date(f.published_at).toLocaleString('en-GB',{timeZone:'Europe/London'}):'Not supplied';return `<p class="source-note">${f?.new_badge?'<b>NEW — provider label</b> · ':''}Provider publication: ${esc(date)} (London). Original publication/reposting not independently verified.</p>`;}
  function facts(j){const pay=j.salary_min||j.salary_max;return `<p class="source-note">Salary: ${pay?'£'+esc(j.salary_min||j.salary_max)+(j.salary_max&&j.salary_max!==j.salary_min?'–£'+esc(j.salary_max):'')+(j.salary_is_predicted?' (provider estimate)':' (provider figure; verify)'):'Not supplied'} · Contract: ${esc(j.contract_type||'Not supplied')} · Closing date: ${esc(j.closing_date||'Not supplied')}</p>`;}
  function displayJobs(list){const target=document.querySelector('#liveResults');const visible=engine?list.filter(j=>engine.publicationWindow(j,searchStartedAt).visible):[];visible.sort((a,b)=>Date.parse(b.created)-Date.parse(a.created));target.innerHTML=`<div class="callout" style="grid-column:1/-1">${visible.length} recent listing(s). From app opening back seven days, including today. No completeness or source-access exclusion.</div>`+visible.map(renderBasic).join('');bindAssess(target);}
  function bindAssess(target){
    const jobs=window.__careerRadarJobs||[];
    target.querySelectorAll('[data-assess-id]').forEach(button=>button.onclick=()=>{
      const index=jobs.findIndex(j=>String(j.id)===button.dataset.assessId);if(index<0)return;
      const pick=document.getElementById('calJob');if(!pick)return;window.dispatchEvent(new CustomEvent('career-radar-vacancy-changed'));pick.value=String(index);
      document.getElementById('calTitle').value=jobs[index].title||'';document.getElementById('calEmployer').value=jobs[index].company||'';const source=document.getElementById('calSource');if(source)source.value=jobs[index].source_url||jobs[index].url||'';const linked=document.getElementById('calLinked');if(linked)linked.checked=true;['calEssential','calDesirable','calExperience'].forEach(id=>document.getElementById(id).value='');
      document.getElementById('calSalary').value=document.getElementById('calSalary')?.value||'0';
      document.getElementById('calStatus').textContent='Open Original listing, paste its full text including requirements, then confirm completeness below.';go('calibration');
    });
  }
  function renderBasic(j){return `<article class="job"><h3>${esc(j.title)}</h3><div class="company">${esc(j.company||'Employer not supplied')} · ${esc(j.location||'Location not supplied')}</div>${freshInfo(j)}${facts(j)}<p class="risk">Provider summary — full original advert needed for fit scoring.</p><button data-assess-id="${esc(j.id)}">Assess full advert</button><a href="${esc(validUrl(j.url))}" target="_blank" rel="noopener noreferrer">Original listing ↗</a></article>`}
  window.careerRadarSave=id=>{const j=jobs.find(x=>String(x.id)===String(id));if(!j)return;const key='career-radar-v1';let s;try{s=JSON.parse(localStorage.getItem(key)||'{}')}catch{s={}}if(!Array.isArray(s.manualJobs))s.manualJobs=[];if(s.manualJobs.some(x=>x.url===j.url))return alert('Already tracked');s.manualJobs.unshift({id:'adzuna-'+String(j.id),title:j.title,employer:j.company,url:j.url,location:j.location,salary:j.salary_min||'',contract:j.contract_type||'Unknown',status:'Saved',notes:'Source: Adzuna. Active status, salary and essential requirements unverified.',added:new Date().toISOString()});localStorage.setItem(key,JSON.stringify(s));alert('Saved locally. Reload the page to refresh the Application Tracker.');};
  const form=document.querySelector('#liveForm'),message=document.querySelector('#liveMessage'),buttonSearch=form.querySelector('button[type=submit]');
  form.insertAdjacentHTML('afterend','<button type="button" class="btn outline" id="liveMore" hidden>Load next 20 results</button>');
  const more=document.querySelector('#liveMore');
  async function runSearch(append=false){
   if(buttonSearch.disabled)return;buttonSearch.disabled=true;more.disabled=true;
   if(!append){searchStartedAt=applicationOpenedAt;searchPage=0;searchParams=new URLSearchParams(new FormData(form));jobs=[];window.__careerRadarJobs=[];window.dispatchEvent(new CustomEvent('career-radar-results'));document.querySelector('#liveResults').innerHTML='';more.hidden=true;}
   message.textContent='Searching Adzuna…';
   const params=new URLSearchParams(searchParams);params.set('page',String(searchPage+1));
   try{const response=await fetch('/api/jobs?'+params),data=await response.json();if(!response.ok)throw Error(data.error||'Search failed');searchPage++;const seen=new Set(jobs.map(j=>String(j.id||j.url)));for(const j of data.results||[]){const id=String(j.id||j.url);if(!seen.has(id)){jobs.push({...j,search_started_at:searchStartedAt});seen.add(id);}}
    // Waiting for the local module must never drop discovery results silently.
    if(!engine)engine=await import('/engine-v54.mjs');
    window.__careerRadarJobs=jobs.filter(j=>engine.publicationWindow(j,searchStartedAt).visible);window.__careerRadarSearchStartedAt=searchStartedAt;window.dispatchEvent(new CustomEvent('career-radar-results',{detail:{count:window.__careerRadarJobs.length}}));
    message.textContent=`${jobs.length} fetched · ${window.__careerRadarJobs.length} within seven days · full adverts needed for scoring`;displayJobs(jobs);more.hidden=!(data.results?.length&&Number(data.count)>searchPage*20&&searchPage<1000);
   }catch(err){message.textContent=err.message;}
   finally{buttonSearch.disabled=false;more.disabled=false;}
  }
  form.onsubmit=e=>{e.preventDefault();runSearch(false);};more.onclick=()=>runSearch(true);
  explainProfile();
})();
