// In-memory D1 stand-in backed by real SQLite (node:sqlite) with every migration applied,
// so budget SQL is tested against a real SQL engine rather than a hand-written mock.
import {DatabaseSync} from 'node:sqlite';
import {readFileSync,readdirSync} from 'node:fs';

export function fakeD1(){
 const db=new DatabaseSync(':memory:');
 const dir=new URL('../../drizzle/',import.meta.url);
 for(const file of readdirSync(dir).filter(f=>f.endsWith('.sql')).sort())db.exec(readFileSync(new URL(file,dir),'utf8'));
 const statement=(sql,params=[])=>({
  bind:(...values)=>statement(sql,values),
  first:async()=>{const row=db.prepare(sql).get(...params);return row?{...row}:null;},
  all:async()=>({results:db.prepare(sql).all(...params).map(r=>({...r}))}),
  run:async()=>db.prepare(sql).run(...params)
 });
 return {prepare:sql=>statement(sql),raw:db};
}
