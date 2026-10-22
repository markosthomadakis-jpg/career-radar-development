// Curated, bounded vocabulary; local concepts are NOT represented as official ESCO identifiers.
export const DICTIONARY_VERSION='0.1.0';
const admin='https://www.onetonline.org/find/descriptor/result/4.A.4.c.1',computer='https://www.onetonline.org/find/descriptor/result/4.A.3.b.1';
export const FRAMEWORKS=[{name:'ESCO preferred/non-preferred term methodology',source:'https://esco.ec.europa.eu/en/classification',relationship:'methodology only; ESCO concept-level import not yet completed',checked:'2026-10-22'},{name:'O*NET content model',source:'https://www.onetcenter.org/content.html',relationship:'separates skills, activities and experience',checked:'2026-10-22'}];
export const CONCEPTS=[
 ['admin','Administrative support',/\b(?:administrat\w*|clerical|secretarial|office support)\b/i,admin],
 ['registration','Learner registration',/\b(?:course bookings?|delegate registrations?|participant registrations?|learner enrol\w*|enrol\w* participants?)\b/i,admin],
 ['schedule','Session scheduling',/\b(?:schedul\w*|timetabl\w*|training calendars?|session calendars?)\b/i,admin],
 ['records','Records and data quality',/\b(?:records?|data quality|data accuracy|data reconciliation|reconcil\w* data|checking inconsistent records|databases?)\b/i,admin],
 ['documentation','Documentation and minutes',/\b(?:documentation|documents?|meeting notes|minute.taking|minutes of meetings)\b/i,admin],
 ['reporting','Operational reporting',/\b(?:reports?|reporting|dashboards?|management information|kpis?)\b/i,computer],
 ['excel','Microsoft Excel',/\b(?:excel|spreadsheets?|pivot tables?|vlookup|xlookup)\b/i,computer],
 ['word','Microsoft Word',/\b(?:microsoft word|ms word|word processing)\b/i,computer],
 ['powerpoint','Microsoft PowerPoint',/\bpowerpoint\b/i,computer],
 ['outlook','Microsoft Outlook',/\b(?:outlook|microsoft outlook)\b/i,computer],
 ['stakeholder','Stakeholder and customer liaison',/\b(?:stakeholder\w*|customer service|client support|liais\w*|participant communications?)\b/i,null],
 ['lms','Learning management system administration',/\b(?:lms|learning management systems?|totara|docebo|moodle|workday learning|talentlms|degreed|vinciworks|litera ce manager)\b/i,computer],
 ['training_ops','Training operations',/\b(?:training coordination|training operations|learning operations|course administration|coordinat\w* (?:training|courses?|seminars?|workshops?))\b/i,admin],
 ['delivery','Training delivery and facilitation',/\b(?:deliver\w* (?:training|sessions?|workshops?)|facilitat\w* (?:training|sessions?|workshops?)|training delivery|classroom facilitation)\b/i,null],
 ['content','Learning content creation',/\b(?:instructional design|creat\w* (?:learning|training) (?:materials?|content)|authoring|articulate|storyline|canva)\b/i,null],
 ['budget_support','Budget tracking and invoice processing',/\b(?:budget tracking|track\w* (?:costs?|budgets?)|invoice processing|process\w* invoices?)\b/i,admin],
 ['budget_owner','Budget ownership',/\b(?:budget ownership|own\w* (?:the |a )?budget|p&l|profit and loss responsibility)\b/i,null],
 ['people','Line management',/\b(?:line management|people management|manag\w* (?:a |the )?team of|direct reports|supervis\w* staff)\b/i,null],
 ['accreditation','Accreditation operations',/\b(?:accreditation|awarding bodies|certification administration)\b/i,null],
 ['evaluation','Learner feedback and evaluation',/\b(?:learner feedback|participant feedback|course evaluation|training evaluation)\b/i,null]
].map(([id,label,pattern,source])=>({id:'cr:'+id,label,pattern,external:source?{source,relationship:'narrower local concept under verified O*NET activity',checked:'2026-10-22'}:null}));
export function normalizePhrase(text){return String(text||'').normalize('NFKC').replace(/[’‘]/g,"'").replace(/\s+/g,' ').trim();}
export function conceptsIn(text){const t=normalizePhrase(text);return CONCEPTS.filter(c=>c.pattern.test(t)&&!(c.id==='cr:people'&&/\b(?:reporting to|delegated by|supporting|assist\w*) (?:the |a )?line manager/i.test(t))&&!(c.id==='cr:training_ops'&&/\b(?:attend|travel|receive)\w*.*\btraining\b/i.test(t)&&!/\bcoordinat\w*/i.test(t)));}
export function sourceLines(text){return String(text||'').replace(/\r/g,'\n').split(/\n+|[•●▪]|(?<=[.!?])\s+(?=[A-Z])/).map(x=>x.replace(/^\s*[-*]\s*/,'').trim()).filter(Boolean);}
const action=/\b(?:maintained|coordinated|scheduled|prepared|produced|processed|reconciled|delivered|facilitated|created|managed|supported|liaised|administered|developed|used|worked|provided|tracked|wrote|held|completed|obtained|led)\b/i;
const terms=/\b(?:totara|docebo|moodle|workday learning|talentlms|degreed|vinciworks|litera ce manager|storyline|articulate|canva|advanced excel|power query|sql|dax|cipd|acca|cima|gcse|degree|licen[cs]e)\b/gi;
const sectors=/\b(?:law firm|legal sector|private banking|wealth management|healthcare|social care|security sector|recruitment sales|media and communications)\b/gi;
export function matchRequirement(requirement,profile){
 const concepts=conceptsIn(requirement),required=[...new Set([...(requirement.match(terms)||[]),...(requirement.match(sectors)||[])].map(x=>x.toLowerCase()))];
 const years=requirement.match(/\b(\d+)\s*\+?\s*years?\b/i)?.[1];
 const candidates=Object.entries(profile).flatMap(([field,text])=>sourceLines(text).map(quote=>({field,quote,concepts:conceptsIn(quote)})));
 const generic=concepts.length===0;
 const found=candidates.filter(c=>!( /\b(?:no experience|never|not yet|do not|don't|without experience)\b/i.test(c.quote))&& (generic?normalizePhrase(c.quote).toLowerCase().includes(normalizePhrase(requirement).toLowerCase()):concepts.every(r=>c.concepts.some(p=>p.id===r.id))));
 const scored=found.map(c=>{let missing=required.filter(t=>!c.quote.toLowerCase().includes(t));if(/\b(?:or|equivalent)\b/i.test(requirement)&&required.length>1){const tools=required.filter(t=>/totara|docebo|moodle|workday learning|talentlms|degreed|vinciworks|litera|storyline|articulate|canva/.test(t));if(tools.length>1&&tools.some(t=>c.quote.toLowerCase().includes(t)))missing=missing.filter(t=>!tools.includes(t));}if(years){const n=c.quote.match(/\b(\d+)\s*\+?\s*years?\b/i)?.[1];if(!n||Number(n)<Number(years))missing.push(years+' years of relevant experience');}
 if(concepts.some(x=>x.id==='cr:delivery')&&/\b(?:support\w*|assist\w*|coordinat\w*)\b/i.test(c.quote)&&!/\b(?:personally delivered|facilitated|led workshops)\b/i.test(c.quote))missing.push('Independent delivery / facilitation');
 if(concepts.some(x=>['cr:budget_owner','cr:people'].includes(x.id))&&/\b(?:support\w*|assist\w*)\b/i.test(c.quote)&&!/\b(?:owned|managed a team|supervised staff)\b/i.test(c.quote))missing.push('Independent ownership / management');
 return {...c,missing,specific:action.test(c.quote)};}).sort((a,b)=>a.missing.length-b.missing.length||Number(b.specific)-Number(a.specific));
 const best=scored[0];return {concepts:concepts.map(c=>({id:c.id,label:c.label,external:c.external})),state:!best?'unknown':!best.specific?'partial':best.missing.length?'partial':'demonstrated',quote:best?.quote||null,profile_field:best?.field||null,missing:best?.missing||required,manual:generic&&!best};
}
