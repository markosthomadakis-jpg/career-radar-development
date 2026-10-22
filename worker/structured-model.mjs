import {evaluate} from './engine-v54.mjs';
import {DICTIONARY_VERSION,matchRequirement,sourceLines,normalizePhrase,FRAMEWORKS} from './concept-dictionary.mjs';
export const VERSION='5.6.0-rc1';
export function profileText(p){return ['core','additional','experience'].map(k=>k.toUpperCase()+'\n'+String(p[k]||'')).join('\n\n');}
export function vacancyText(s){return ['essential','desirable','experience'].map(k=>k.toUpperCase()+'\n'+String(s[k]||'')).join('\n\n');}
export function compileRequirements(sections,experiencePriority='context'){
 const rows=new Map();for(const field of ['essential','desirable','experience'])for(const source of sourceLines(sections[field])){
 if(/^(?:essential(?: criteria| requirements)?|(?:non.essential|desirable)(?: criteria| requirements)?|experience(?: requirements)?|nice to have|what you(?:'|’)ll bring)\s*:?$/i.test(source))continue;
 const key=normalizePhrase(source).toLowerCase().replace(/[.;:]$/,'');const importance=field==='experience'?experiencePriority:field;
 if(rows.has(key)){const r=rows.get(key);r.input_fields.push(field);if(r.importance!==importance){r.conflict=true;r.importance='context';}continue;}
 rows.set(key,{id:'structured-'+rows.size,label:source,source,importance,input_fields:[field],conflict:false});
 }return [...rows.values()];
}
export function evaluateStructured({profile,sections,vacancy={},preferences={},attestations={},overrides={},experiencePriority='context',evaluationDate}){
 const base=evaluate({profile:profileText(profile),vacancy:{...vacancy,description:vacancyText(sections),description_kind:'full',full_description:true},preferences,evaluationDate});
 const requirements=compileRequirements(sections,experiencePriority).map(r=>{
 const importance=['essential','desirable','context'].includes(overrides[r.id])?overrides[r.id]:r.importance;
 const match=matchRequirement(r.source,profile),a=attestations[r.id];const state=a==='have'?'self_attested':a==='partial'?'self_attested_partial':a==='no'?'absent_self_reported':match.state==='demonstrated'?'cv_quoted':match.state==='partial'?'partial':match.manual?'not_assessed':'no_match_found';
 return {...r,importance,published_importance:r.importance,classification_basis:overrides[r.id]?'user correction':'user supplied section; source classification not independently verified',weight:importance==='essential'?3:importance==='desirable'?1:2,match_mode:match.manual?'manual':'automated',evidence_state:state,evidence:match.quote,attestation:a||null,normalization:match,status:state==='cv_quoted'||state==='self_attested'?'supported':state==='absent_self_reported'?'not_met':state.includes('partial')?'partial':'unknown'};
 });
 const credit=r=>['cv_quoted','self_attested'].includes(r.evidence_state)?1:['partial','self_attested_partial'].includes(r.evidence_state)?.5:r.evidence_state==='absent_self_reported'?0:null;
 const bounds=list=>{const w=list.reduce((n,r)=>n+r.weight,0);return {low:w?list.reduce((n,r)=>n+(credit(r)??0)*r.weight,0)/w:null,high:w?list.reduce((n,r)=>n+(r.evidence_state==='partial'?1:(credit(r)??1))*r.weight,0)/w:null,count:list.length,open:list.filter(r=>credit(r)===null).length};};
 const by_group=Object.fromEntries(['essential','desirable','experience'].map(k=>[k,bounds(requirements.filter(r=>k==='experience'?r.input_fields.includes('experience'):r.importance===k))]));
 const range=bounds(requirements),known=requirements.filter(r=>credit(r)!==null).length;
 const unmetEssential=requirements.filter(r=>r.importance==='essential'&&credit(r)===0),hardBlocked=base.hard_constraints.some(c=>c.status==='not_met');
 const decision=hardBlocked||unmetEssential.length?'Skip':'Apply';
 const checks=[...base.hard_constraints.filter(c=>c.status==='unknown').map(c=>c.name),...requirements.filter(r=>credit(r)===null).map(r=>r.source),...requirements.filter(r=>r.evidence_state==='partial'&&r.normalization.missing.length).map(r=>'Verify qualifiers: '+r.normalization.missing.join(', ')),...requirements.filter(r=>r.conflict&&!overrides[r.id]).map(r=>'Resolve section conflict: '+r.source)];
 const attested=requirements.filter(r=>r.attestation).length;
 return {engine_version:VERSION,version:VERSION,evaluation_date:evaluationDate,decision,decision_reason:decision==='Skip'?'A confirmed hard constraint or self-reported essential requirement is not met.':checks.length?'Apply is provisional: verify the listed unknowns before submission. Unknown does not mean inability.':'Available evidence supports proceeding; you make the final decision.',requires_verification:checks.length>0,verification_checks:checks,fit_score:known&&requirements.length?Math.round(range.low*100):null,score_range:known?{low:Math.round(range.low*100),high:Math.round(range.high*100)}:null,score_meaning:'Weighted evidence across all supplied requirements. Open items widen the range; no hiring probability.',confidence:{label:checks.length||attested?'Low':'Medium'},hard_constraints:base.hard_constraints,requirements,thresholds:by_group,coverage:{matching:{assessed_ratio:requirements.length?known/requirements.length:0}},dictionary:{version:DICTIONARY_VERSION,frameworks:FRAMEWORKS},input_scope:'User supplied essential/desirable/experience sections; not certified full advert',normalization_trace:requirements.map(r=>({id:r.id,original:r.source,concepts:r.normalization.concepts,quote:r.evidence,profile_field:r.normalization.profile_field,missing:r.normalization.missing}))};
}
