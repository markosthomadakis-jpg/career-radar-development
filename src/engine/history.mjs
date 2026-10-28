// Pure conversion of locally stored records into the eligibility `history` consumed by evaluate().
// - A human "skip" review is an explicit exclusion.
// - Tracker statuses Applied / Interview -> applied, Rejected -> rejected, Withdrawn -> withdrawn.
// - A human "apply" review is an intention, not an application, and is not history.
const TRACKER_STATUS={Applied:'applied',Interview:'applied',Rejected:'rejected',Withdrawn:'withdrawn'};

export function historyFromRecords(reviews=[],manualJobs=[]){
 const out=[];
 for(const r of Array.isArray(reviews)?reviews:[])if(r&&r.human_decision==='skip'&&(r.vacancy_id||r.source_url))
  out.push({vacancy_id:r.vacancy_id?String(r.vacancy_id):null,source_url:r.source_url||null,status:'excluded'});
 for(const j of Array.isArray(manualJobs)?manualJobs:[]){
  const status=j&&TRACKER_STATUS[j.status];if(!status)continue;
  const id=String(j.id||'').replace(/^vacancy-/,'');
  if(id||j.url)out.push({vacancy_id:id||null,source_url:j.url||null,status});
 }
 return out;
}
