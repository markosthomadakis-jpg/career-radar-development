export const STRUCTURED_CV_VERSION='1.0.0';

const SECTION_PATTERNS=[
 ['profile',/^(?:professional\s+)?(?:profile|summary|introduction|personal statement|about me)$/i],
 ['experience',/^(?:professional\s+|employment\s+|work\s+)?(?:experience|history)|career history$/i],
 ['education',/^(?:education|academic background|qualifications)$/i],
 ['skills',/^(?:key |core |additional |technical )?(?:skills|capabilities|competencies)$/i],
 ['certifications',/^(?:certifications?|professional development|training|courses)$/i],
 ['achievements',/^(?:key )?(?:achievements?|accomplishments?)$/i],
 ['languages',/^languages?$/i]
];
const clean=s=>String(s||'').replace(/\u00a0/g,' ').replace(/[ \t]+/g,' ').trim();
const decode=s=>String(s||'').replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&quot;/g,'"').replace(/&apos;/g,"'").replace(/&amp;/g,'&');
function headingType(text,style=''){
 const value=clean(text),known=SECTION_PATTERNS.find(([,re])=>re.test(value));
 if(known)return known[0];
 if(/^Heading[1-6]$/i.test(style)||/^(?:Title|Subtitle)$/i.test(style))return 'other';
 if(value.length<=70&&value.split(/\s+/).length<=8&&(/^[A-Z][A-Z &/+-]+$/.test(value)||/:$/.test(value)))return 'other';
 return null;
}
export function structureParagraphs(items,{sourceType='text',fileName=''}={}){
 let section='unclassified',sectionLabel='Unclassified';const paragraphs=[];
 for(const item of items){
  const text=clean(typeof item==='string'?item:item.text);if(!text)continue;
  const style=clean(item.style),kind=headingType(text,style);
  if(kind&&kind!=='other'){section=kind;sectionLabel=text.replace(/:$/,'');}
  paragraphs.push({id:'P'+String(paragraphs.length+1).padStart(4,'0'),section,section_label:sectionLabel,kind:kind?'heading':(item.list?'list_item':'paragraph'),style:style||null,text});
 }
 return {schema_version:STRUCTURED_CV_VERSION,source_type:sourceType,file_name:fileName||'',paragraphs};
}
export function structurePlainText(text,options={}){
 const lines=String(text||'').replace(/\r\n?/g,'\n').split(/\n+/).map(x=>({text:x,list:/^\s*(?:[-•▪◦*]|\d+[.)])\s+/.test(x)}));
 return structureParagraphs(lines,options);
}
export function parseDocxXml(xml,options={}){
 const paragraphs=[];
 for(const match of String(xml||'').matchAll(/<w:p\b[\s\S]*?<\/w:p>/g)){
  const block=match[0],style=(block.match(/<w:pStyle\b[^>]*w:val=["']([^"']+)/)||[])[1]||'';
  const list=/<w:numPr\b/.test(block);let text='';
  for(const token of block.matchAll(/<w:t\b[^>]*>([\s\S]*?)<\/w:t>|<w:tab\b[^>]*\/?\s*>|<w:br\b[^>]*\/?\s*>/g))text+=token[1]!=null?decode(token[1]):(/w:tab/.test(token[0])?'\t':'\n');
  paragraphs.push({text,style,list});
 }
 return structureParagraphs(paragraphs,{...options,sourceType:'docx'});
}
export function toPlainText(document){return (document?.paragraphs||[]).map(p=>p.text).join('\n');}
export function toAnalysisText(document){return (document?.paragraphs||[]).map(p=>`[${p.id}|${p.section}|${p.kind}] ${p.text}`).join('\n');}
export function resolveReferences(document,refs){
 const byId=new Map((document?.paragraphs||[]).map(p=>[p.id,p]));
 const ids=[...new Set((Array.isArray(refs)?refs:[]).map(String))];
 return ids.map(id=>byId.get(id)).filter(Boolean).map(p=>({text:p.text,start:null,end:null,method:'paragraph_reference',paragraph_id:p.id,section:p.section,section_label:p.section_label}));
}
