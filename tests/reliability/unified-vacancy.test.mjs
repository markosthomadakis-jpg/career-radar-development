import test from 'node:test';
import assert from 'node:assert/strict';
import {normaliseJob,deduplicate,VACANCY_SCHEMA_VERSION} from '../../worker/sources/normalization.mjs';
import {normalizeAdzunaJob} from '../../worker/vacancy-input.mjs';
import {normalizeGreenhouse} from '../../worker/sources/ats.mjs';
import {normalizeJobicy} from '../../worker/sources/jobicy.mjs';

test('all vacancy sources produce the same core schema',()=>{
 const records=[
  normalizeAdzunaJob({id:1,title:'Training Coordinator',description:'Summary',created:'2026-10-26T12:00:00Z',redirect_url:'https://www.adzuna.co.uk/jobs/details/1',company:{display_name:'Acme Ltd'},location:{display_name:'London'}}),
  normalizeGreenhouse({id:2,title:'Training Coordinator',content:'Full advert',absolute_url:'https://boards.greenhouse.io/acme/jobs/2',location:{name:'London'}},'Acme','acme'),
  normalizeJobicy({id:3,jobTitle:'Training Coordinator',jobDescription:'Remote advert',companyName:'Acme',jobGeo:'UK',url:'https://jobicy.com/jobs/3',pubDate:'2026-10-26T12:00:00Z'})
 ];
 for(const job of records){assert.equal(job.schema_version,VACANCY_SCHEMA_VERSION);for(const field of ['id','provider','source_id','title','company','location','description','source_url','canonical_key','source_reliability','sources'])assert.ok(Object.hasOwn(job,field),`${job.provider} missing ${field}`);}
 assert.equal(records[0].source_reliability.level,'medium');assert.equal(records[1].source_reliability.level,'high');
});

test('deduplication merges cross-source records and prefers richer reliable evidence',()=>{
 const aggregate=normaliseJob({provider:'adzuna',source_id:'a1',title:'Learning & Development Coordinator',company:'Example Ltd',location:'London',description:'Short summary',source_url:'https://www.adzuna.co.uk/jobs/details/a1'});
 const official=normaliseJob({provider:'greenhouse',source_id:'g1',title:'Learning and Development Coordinator',company:'Example',location:'London',description:'A complete official description with essential criteria and responsibilities.',source_url:'https://boards.greenhouse.io/example/jobs/g1',full_description:true});
 // The canonical fingerprint intentionally normalises ampersands and legal suffixes.
 assert.equal(aggregate.canonical_key,official.canonical_key);
 const [merged]=deduplicate([aggregate,official]);assert.equal(merged.provider,'greenhouse');assert.equal(merged.full_description,true);assert.equal(merged.sources.length,2);assert.equal(merged.duplicate_count,2);assert.equal(merged.source_reliability.level,'high');
});

test('same title at different locations remains distinct',()=>{
 const base={provider:'jobicy',title:'Programme Coordinator',company:'Acme',description:'Description'};
 const jobs=[normaliseJob({...base,source_id:'1',location:'London',source_url:'https://jobicy.com/jobs/1'}),normaliseJob({...base,source_id:'2',location:'Manchester',source_url:'https://jobicy.com/jobs/2'})];
 assert.equal(deduplicate(jobs).length,2);
});
