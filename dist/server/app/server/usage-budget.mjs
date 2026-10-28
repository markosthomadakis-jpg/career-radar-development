// Durable daily usage caps for cost-bearing routes (Adzuna search, OpenAI analysis).
// One atomic UPSERT per call: the counter is claimed before the external request, so a failed
// or slow provider call can never be retried past the cap. Fails closed when the database is absent.
export const DEFAULT_DAILY_LIMITS={adzuna:100,openai:10};

export function dailyLimit(env,route){
 const key=route==='adzuna'?'ADZUNA_DAILY_LIMIT':'AI_DAILY_LIMIT';
 const raw=env?.[key];
 const value=raw===undefined||raw===''?DEFAULT_DAILY_LIMITS[route]:Number(raw);
 return Number.isInteger(value)&&value>=0?value:DEFAULT_DAILY_LIMITS[route];
}

export function londonDay(now=new Date()){
 return new Intl.DateTimeFormat('en-CA',{timeZone:'Europe/London',year:'numeric',month:'2-digit',day:'2-digit'}).format(now);
}

const CLAIM_SQL='INSERT INTO usage_budget (day, route, used) VALUES (?1, ?2, 1) '+
 'ON CONFLICT(day, route) DO UPDATE SET used = used + 1 WHERE used < ?3 RETURNING used';

// Returns {allowed, used, limit, reason}. Never throws.
export async function claimUsage(env,route,now=new Date()){
 const limit=dailyLimit(env,route);
 if(limit===0)return {allowed:false,used:null,limit,reason:'disabled'};
 if(!env?.DB)return {allowed:false,used:null,limit,reason:'budget_unavailable'};
 try{
  const row=await env.DB.prepare(CLAIM_SQL).bind(londonDay(now),route,limit).first();
  return row?{allowed:true,used:Number(row.used),limit,reason:'ok'}:{allowed:false,used:limit,limit,reason:'daily_limit_reached'};
 }catch{return {allowed:false,used:null,limit,reason:'budget_unavailable'};}
}

export function budgetRefusal(claim){
 const message=claim.reason==='daily_limit_reached'?`Daily usage limit reached (${claim.limit}). No external request was made.`:
  claim.reason==='disabled'?'This cost-bearing route is disabled by configuration. No external request was made.':
  'Usage budget unavailable; no external request was made.';
 return Response.json({error:message,budget:{reason:claim.reason,limit:claim.limit}},{status:claim.reason==='daily_limit_reached'?429:503,headers:{'cache-control':'no-store'}});
}
