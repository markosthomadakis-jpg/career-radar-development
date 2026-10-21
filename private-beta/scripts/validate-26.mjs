import {readFile,mkdir,writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {evaluate} from '../worker/match.mjs';
import {evaluateV53} from '../worker/calibration-v53.mjs';
const root=resolve(import.meta.dirname,'..');
const items=JSON.parse(await readFile(resolve(root,'fixtures/validation-26.json'),'utf8'));
const meta=JSON.parse(await readFile(resolve(root,'fixtures/validation-26.meta.json'),'utf8'));
if(items.length!==26)throw new Error('Fixture requires exactly 26 rows');
const incomplete=items.filter(x=>!x.employer||!x.title||!x.description||!x.source_url||!x.captured_at||!x.human_label||!x.human_rationale||!x.independent_labeler||x.provenance==='PENDING_REAL_ADVERT');
if(incomplete.length){
 console.error('T9 BLOCKED: '+incomplete.length+'/26 adverts lack complete real source text and independently pre-registered human labels.');
 console.error('Validation intentionally not run. Do not invent listings or label the output using the engine itself.');
 process.exitCode=2;
}else{
 const profile=process.env.CAREER_RADAR_SYNTHETIC_PROFILE||'Synthetic profile: coordinated 200 training seminars annually, including course scheduling and participant administration. Produced Excel reporting. Managed vendor, instructor and stakeholder correspondence across international regions.';
 const dims=[{weight:25,terms:['training','learning','course','seminar','workshop','l&d','facilitator','trainer']},{weight:20,terms:['programme','program','project','pmo','coordinat','schedule','delivery']},{weight:15,terms:['administrat','records','documentation','governance','audit']},{weight:15,terms:['report','excel','dashboard','analysis','kpi']},{weight:15,terms:['stakeholder','customer','client','participant']},{weight:10,terms:['commercial','supplier','procurement','pricing','contract']}];
 const oldV4=(j)=>{const d=(j.title+' '+j.description).toLowerCase(),cv=profile.toLowerCase(),active=dims.filter(x=>x.terms.some(t=>d.includes(t)));const total=active.reduce((n,x)=>n+x.weight,0);return total?Math.round(100*active.filter(x=>x.terms.some(t=>cv.includes(t))).reduce((n,x)=>n+x.weight,0)/total):null};
 const rows=[];for(const j of items){
  const prefs={salaryFloor:meta.salary_floor,minContractMonths:meta.min_months,asOf:meta.evaluation_date+'T12:00:00Z'};
  const versions=[['v4-simulation',{fit_score:oldV4(j),decision:'legacy-coverage-only',confidence:{label:'N/A'},eligibility:{status:'not_implemented'}}],['v5.3',{...evaluateV53(profile,j,prefs),eligibility:{status:'legacy-unscoped'}}],['v5.4',evaluate({profile,vacancy:j,preferences:prefs,evaluationDate:meta.evaluation_date})]];
  for(const [version,r] of versions)rows.push({id:j.id,employer:j.employer,title:j.title,version,human_label:j.human_label,eligibility:r.eligibility.status,fit_score:r.fit_score??'',band:r.band||'',decision:r.decision,confidence:r.confidence?.label||'',critical_gaps:r.critical_evidence_gaps?.map(x=>x.label).join('; ')||''});
 }
 const fields=Object.keys(rows[0]);const esc=x=>'"'+String(x??'').replaceAll('"','""')+'"';const csv=[fields.join(','),...rows.map(r=>fields.map(k=>esc(r[k])).join(','))].join('\n')+'\n';
 const tally={};for(const r of rows){const key=r.version+'|'+r.human_label+'|'+r.decision;tally[key]=(tally[key]||0)+1}
 const report='# Independent validation — '+meta.evaluation_date+'\n\nAll 26 advert texts and human labels were registered before running.\n\n'+Object.entries(tally).sort().map(([k,n])=>'| '+k.split('|').join(' | ')+' | '+n+' |').join('\n')+'\n';
 await mkdir(resolve(root,'reports'),{recursive:true});await writeFile(resolve(root,'reports/validation-'+meta.evaluation_date+'.csv'),csv);await writeFile(resolve(root,'reports/validation-'+meta.evaluation_date+'.md'),report);console.log('Wrote '+rows.length+' comparison rows.');
}
