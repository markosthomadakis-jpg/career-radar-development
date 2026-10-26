import {createJobicySource} from './jobicy.mjs';
import {applyRemoteFilters} from './normalization.mjs';
export function createRegistry({fetchFn=fetch,sources}={}){
 const entries=sources||[createJobicySource({fetchFn})],registry=new Map();for(const source of entries){if(!source.id||registry.has(source.id))throw new Error('Duplicate or missing provider id');registry.set(source.id,source);}
 return {list:()=>[...registry.values()].map(x=>({id:x.id,kind:x.kind,attribution:x.attribution})),
  async page({providers=['jobicy'],cursors={},cursor=null,tag='',count=100,now=new Date()}={}){const accepted=providers.filter(x=>registry.has(x));if(!accepted.length)throw new Error('No configured provider selected');const batches=await Promise.allSettled(accepted.map(async id=>({id,data:await registry.get(id).fetchPage({cursor:cursors[id]||(accepted.length===1?cursor:null),tag,count})})));const records=[],errors=[],nextCursors={};for(let i=0;i<batches.length;i++){const b=batches[i];if(b.status==='fulfilled'){records.push(...b.value.data.jobs);if(b.value.data.nextCursor)nextCursors[accepted[i]]=b.value.data.nextCursor;}else errors.push({source:accepted[i],message:String(b.reason?.message||'Provider error').slice(0,160)});}const hasMore=Object.keys(nextCursors).length>0;return {results:applyRemoteFilters(records,now,{ukOnly:true,includeUncertain:true}),nextCursor:accepted.length===1?nextCursors[accepted[0]]||null:null,nextCursors,hasMore,partial:errors.length>0||hasMore,errors,sources:accepted,returned:records.length,checkedAt:new Date(now).toISOString()};},
  async statuses(id,ids){const source=registry.get(id);if(!source?.statuses)throw new Error('Status check unavailable');return source.statuses(ids);}
 };
}
