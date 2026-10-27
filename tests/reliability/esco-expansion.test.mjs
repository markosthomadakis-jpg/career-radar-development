import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import worker from '../../dist/server/index.js';
import {ESCO_SNAPSHOT,ESCO_SKILLS,ESCO_OCCUPATIONS,escoSkillMatches,escoRoleMatches} from '../../worker/esco-expansion.mjs';
import {CONCEPTS,concepts,assessRelevance,searchTerms} from '../../worker/professional-profile.mjs';

test('offline ESCO snapshot has real stable URIs and bounded evidence semantics',()=>{
 assert.equal(ESCO_SNAPSHOT.version,'v1.2.0');assert.equal(ESCO_SKILLS.length,9);
 for(const item of [...ESCO_SKILLS,...ESCO_OCCUPATIONS])assert.match(item.uri,/^http:\/\/data\.europa\.eu\/esco\/(?:skill|occupation)\/[0-9a-f-]{36}$/);
 const [match]=escoSkillMatches('Coordinate schedules and maintain records.');assert.equal(match.id,'records_management');assert.equal(match.candidate_evidence_required,true);assert.equal('demonstrated' in match,false);
});

test('synonyms map only when present in the supplied text and respect negation',()=>{
 assert.ok(concepts('Maintain records and write work-related reports.').includes('records_management'));
 assert.ok(concepts('Maintain records and write work-related reports.').includes('work_reports'));
 assert.ok(!concepts('No experience of training needs analysis.').includes('training_needs'));
 assert.ok(CONCEPTS.find(x=>x.id==='training_needs').evidence_rule==='confirmed_cv_passage_required');
});

test('related occupations expand discovery without inferring management or education experience',()=>{
 assert.equal(escoRoleMatches('Project Support Officer',{searchEligibleOnly:true})[0].family,'programme');
 assert.equal(escoRoleMatches('Training and Development Coordinator',{searchEligibleOnly:true}).length,0);
 const profile={preferences:{families:['programme'],excludeManual:true,level:'individual'},capabilities:[]};
 assert.equal(assessRelevance(profile,{title:'Project Support Officer',description:'Support project documentation.'}).visible,true);
 assert.ok(searchTerms(profile).includes('Project support officer'));
 assert.ok(!searchTerms({preferences:{families:['learning']}}).includes('Corporate training manager'));
});

test('built Worker serves the exact ESCO module used by the profile model',async()=>{
 const source=fs.readFileSync(new URL('../../worker/esco-expansion.mjs',import.meta.url),'utf8');
 const response=await worker.fetch(new Request('https://offline.example/esco-expansion.mjs'),{});
 assert.equal(response.status,200);assert.equal(await response.text(),source);
});
