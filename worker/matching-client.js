/* Career Radar V4: local, explainable evidence matching. No CV text leaves the browser. */
(()=>{
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
  let profile='',jobs=[];
  const settings=`<section class="view hide" id="matching"><div class="eyebrow">Career Radar V4 / Evidence engine</div><h1>Your professional evidence.</h1><p class="sub">Analyse your own CV locally and compare it with live vacancies. Evidence matches are indicative, not hiring probabilities. No CV content is uploaded to our server or Adzuna.</p><div class="panel"><div class="fields"><div class="field wide"><label for="matchFile">CV file (.txt, .docx, .pdf)</label><input id="matchFile" type="file" accept=".txt,.docx,.pdf"><small>Files are processed in your browser. PDF parsing needs an optional third-party PDF.js script; if unavailable, paste text below.</small></div><div class="field wide"><label for="matchText">Your experience — review and edit before analysis</label><textarea id="matchText" rows="9" placeholder="Paste your CV or upload a supported file. Include real responsibilities, not just a list of skills."></textarea></div><div class="row wide"><button class="btn" id="matchAnalyse">Build evidence profile</button><button class="btn outline" id="matchClear">Clear local CV data</button></div></div><div id="matchStatus" class="callout">No professional evidence analysed yet.</div><div id="matchProfile" style="margin-top:16px"></div></div><div class="sectionhead"><h2>Matching methodology</h2></div><div class="panel"><p class="sub">This initial engine detects evidence across six capability groups and checks which are requested by each job description. It does not invent qualifications or assess protected characteristics. Missing evidence is labelled unknown, not absent. Results with limited descriptions are marked low confidence.</p><p class="sub">To rank jobs, enter your CV here, then visit <b>Live vacancies</b> and run a search. Results will include an explainable fit assessment.</p></div></section>`;
  document.querySelector('#profile').insertAdjacentHTML('beforebegin',settings);
  const button='<button data-view="matching"><span>◈</span> Evidence matching</button>';
  document.querySelector('.sidebar .nav').insertAdjacentHTML('beforeend',button);
  document.querySelector('.mobile').insertAdjacentHTML('beforeend',button);
  document.querySelectorAll('[data-view="matching"]').forEach(b=>b.onclick=()=>go('matching'));
  const cv=document.querySelector('#matchText'),stat=document.querySelector('#matchStatus'),evidence=document.querySelector('#matchProfile');
  try{profile=localStorage.getItem(STORE)||'';cv.value=profile}catch{}
  function findTerms(text,dim){const low=text.toLowerCase();return dim.terms.filter(x=>low.includes(x));}
  function explainProfile(){
    if(!profile.trim()){stat.textContent='Enter a CV to enable matching. The application does not assume any qualifications.';evidence.innerHTML='';return;}
    const groups=dimensions.map(d=>({...d,found:findTerms(profile,d)}));
    stat.textContent='Local evidence extracted. Please check each finding against your actual experience; keyword occurrences are not proof of proficiency.';
    evidence.innerHTML=groups.map(g=>`<div style="margin:10px 0;padding:12px;border:1px solid #e1e7e5;border-radius:10px"><b>${esc(g.name)}</b><div class="source-note">${g.found.length?'Keywords evidenced in CV: '+g.found.map(esc).join(', '):'No matching phrases identified — unknown, not a proven gap.'}</div></div>`).join('');
  }
  function updateProfile(){profile=cv.value.slice(0,60000);try{localStorage.setItem(STORE,profile)}catch{stat.textContent='Browser storage unavailable; profile exists only in this tab.'}explainProfile();}
  document.querySelector('#matchAnalyse').onclick=()=>{updateProfile();if(jobs.length)displayJobs(jobs);};
  document.querySelector('#matchClear').onclick=()=>{if(!confirm('Remove the CV text stored locally in this browser?'))return;profile='';cv.value='';localStorage.removeItem(STORE);explainProfile();if(jobs.length)displayJobs(jobs);};
  document.querySelector('#matchFile').onchange=async e=>{
    const file=e.target.files?.[0];if(!file)return;stat.textContent='Reading CV locally…';
    try{
      let text;if(/\.txt$/i.test(file.name))text=await file.text();
      else if(/\.docx$/i.test(file.name))text=await parseDocx(file);
      else if(/\.pdf$/i.test(file.name))text=await parsePdf(file);
      else throw Error('Unsupported file type');
      if(!text.trim())throw Error('No readable CV text found');cv.value=text.slice(0,60000);stat.textContent='File extracted locally. Please review the text and select Build evidence profile.';
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
    const desc=[job.title,job.description].filter(Boolean).join(' ').toLowerCase();
    const assessed=dimensions.map(d=>{const required=findTerms(desc,d),available=findTerms(profile,d);return {...d,required,available,hit:required.length>0&&available.length>0}});
    const active=assessed.filter(d=>d.required.length),totalWeight=active.reduce((n,d)=>n+d.weight,0);
    const score=totalWeight?Math.round(active.filter(d=>d.hit).reduce((n,d)=>n+d.weight,0)/totalWeight*100):null;
    const words=String(job.description||'').split(/\s+/).filter(Boolean).length;
    return {score,confidence:words<45?'Low':words<110?'Limited':'Moderate',assessed,active};
  }
  function displayJobs(list){const target=document.querySelector('#liveResults');if(!profile.trim()){target.innerHTML='<div class="empty" style="grid-column:1/-1">Add your CV in Evidence matching to score these results.</div>'+list.map(renderBasic).join('');return;}
    const ranked=list.map(j=>({...j,assessment:scoreJob(j)})).sort((a,b)=>(b.assessment.score??-1)-(a.assessment.score??-1));
    target.innerHTML=ranked.map(j=>{const a=j.assessment;return `<article class="job"><div class="jobtop"><span class="mark">${esc((j.company||'J').slice(0,1))}</span><span class="score ${a.score===null||a.score<60?'weak':''}">${a.score===null?'Unrated':a.score+'% indicative'}</span></div><div><h3>${esc(j.title)}</h3><div class="company">${esc(j.company)} · ${esc(j.location)}</div></div><div class="tags"><span>${j.salary_min?'From £'+Math.round(j.salary_min).toLocaleString('en-GB'):'Salary unknown'}</span><span>Evidence confidence: ${a.confidence}</span></div><div class="explain"><b>Supported overlaps</b><div>${a.active.filter(d=>d.hit).map(d=>esc(d.name)+' ('+esc(d.available.slice(0,2).join(', '))+')').join(' · ')||'No confirmed overlaps from available text'}</div></div><div class="risk"><b>Unknown or unproven:</b> ${a.active.filter(d=>!d.hit).map(d=>esc(d.name)).join(', ')||'No detected category gaps; specific mandatory requirements remain unverified'}. Seniority, licences and essential qualifications require manual verification.</div><p class="source-note">${esc((j.description||'').slice(0,240))}${(j.description||'').length>240?'…':''}</p><div class="actions"><button data-save-id="${esc(j.id)}">Save lead</button><a href="${esc(validUrl(j.url))}" target="_blank" rel="noopener noreferrer">Original listing ↗</a></div></article>`}).join('')||'<div class="empty">No results.</div>';
    target.querySelectorAll('[data-save-id]').forEach(button=>button.onclick=()=>window.careerRadarSave(button.dataset.saveId));
  }
  function renderBasic(j){return `<article class="job"><h3>${esc(j.title)}</h3><div class="company">${esc(j.company)} · ${esc(j.location)}</div><p class="risk">Not rated — CV missing.</p><a href="${esc(validUrl(j.url))}" target="_blank" rel="noopener noreferrer">View on Adzuna ↗</a></article>`}
  window.careerRadarSave=id=>{const j=jobs.find(x=>String(x.id)===String(id));if(!j)return;const key='career-radar-v1';let s;try{s=JSON.parse(localStorage.getItem(key)||'{}')}catch{s={}}if(!Array.isArray(s.manualJobs))s.manualJobs=[];if(s.manualJobs.some(x=>x.url===j.url))return alert('Already tracked');s.manualJobs.unshift({id:'adzuna-'+String(j.id),title:j.title,employer:j.company,url:j.url,location:j.location,salary:j.salary_min||'',contract:j.contract_type||'Unknown',status:'Saved',notes:'Source: Adzuna. Active status, salary and essential requirements unverified.',added:new Date().toISOString()});localStorage.setItem(key,JSON.stringify(s));alert('Saved locally. Reload the page to refresh the Application Tracker.');};
  const form=document.querySelector('#liveForm'),message=document.querySelector('#liveMessage'),buttonSearch=form.querySelector('button[type=submit]');
  form.onsubmit=async e=>{e.preventDefault();buttonSearch.disabled=true;message.textContent='Searching Adzuna…';const params=new URLSearchParams(new FormData(form));try{const response=await fetch('/api/jobs?'+params),data=await response.json();if(!response.ok)throw Error(data.error||'Search failed');jobs=data.results||[];message.textContent=`${jobs.length} source listings · ${profile.trim()?'ranked by evidence':'add CV to enable matching'}`;displayJobs(jobs)}catch(err){message.textContent=err.message;document.querySelector('#liveResults').innerHTML=''}finally{buttonSearch.disabled=false}};
  explainProfile();
})();
