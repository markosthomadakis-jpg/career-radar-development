import {evaluate,addIntelligence,SECTORS} from './engine-v54.mjs';
export {SECTORS};
export function evaluateV53(profile,job,preferences={},attestations={}){return evaluate({profile,vacancy:job,preferences,attestations,evaluationDate:preferences.asOf||new Intl.DateTimeFormat('en-CA',{timeZone:'Europe/London',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date())});}
export function withEmployerIntelligence(result){return {...addIntelligence(result),intel_signals:[],priority_adjustment:0,priority_score:result.fit_score};}
export function evaluateContextualFit(){return {score:null,confidence:'Unknown',sample_size:0,signals:[],reason:'Contextual scoring is disabled. Sourced research can be added separately without changing evidence fit.'};}
