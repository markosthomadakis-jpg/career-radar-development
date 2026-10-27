import {normaliseJob} from './sources/normalization.mjs';

// Provider input normalization. A search excerpt is not certified full advert text.
export function normalizeAdzunaJob(j){
 const raw=String(j.description||'').replace(/<[^>]*>/g,' ');
 const predicted=[true,1,'1'].includes(j.salary_is_predicted)?true:[false,0,'0'].includes(j.salary_is_predicted)?false:null;
 const result=normaliseJob({provider:'adzuna',source_id:j.id,title:j.title,company:j.company?.display_name||'',location:j.location?.display_name||'',salary_min:j.salary_min,salary_max:j.salary_max,salary_currency:'GBP',salary_period:'year',salary_is_predicted:predicted,contract_type:j.contract_type,contract_time:j.contract_time,description:raw.slice(0,20000),description_truncated:raw.length>20000,description_kind:'summary',full_description:false,source_url:j.redirect_url,posted_at:j.created,status:'unknown'});
 result.created=typeof j.created==='string'?j.created:null;return result;
}
