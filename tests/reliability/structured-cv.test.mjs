import test from 'node:test';import assert from 'node:assert/strict';
import {structurePlainText,parseDocxXml,toAnalysisText,resolveReferences} from '../../worker/structured-cv.mjs';

test('plain CV text becomes stable referenced paragraphs and recognised sections',()=>{
 const doc=structurePlainText('PROFESSIONAL PROFILE\nLearning operations coordinator.\n\nPROFESSIONAL EXPERIENCE\nMoody’s Analytics\n• Coordinated 200 seminars.');
 assert.deepEqual(doc.paragraphs.map(p=>p.id),['P0001','P0002','P0003','P0004','P0005']);
 assert.equal(doc.paragraphs[1].section,'profile');assert.equal(doc.paragraphs[4].section,'experience');assert.equal(doc.paragraphs[4].kind,'list_item');
 assert.match(toAnalysisText(doc),/\[P0005\|experience\|list_item\]/);
});

test('DOCX XML preserves headings, list items and paragraph boundaries',()=>{
 const xml='<w:document><w:body><w:p><w:pPr><w:pStyle w:val="Heading1"/></w:pPr><w:r><w:t>Professional Experience</w:t></w:r></w:p><w:p><w:pPr><w:numPr/></w:pPr><w:r><w:t>Managed schedules &amp; suppliers</w:t></w:r></w:p></w:body></w:document>';
 const doc=parseDocxXml(xml,{fileName:'cv.docx'});assert.equal(doc.source_type,'docx');assert.equal(doc.paragraphs[0].kind,'heading');assert.equal(doc.paragraphs[1].kind,'list_item');assert.equal(doc.paragraphs[1].text,'Managed schedules & suppliers');
});

test('role and employer headings stay inside the current experience section',()=>{
 const xml='<w:document><w:body><w:p><w:r><w:t>Professional Experience</w:t></w:r></w:p><w:p><w:pPr><w:pStyle w:val="Heading2"/></w:pPr><w:r><w:t>Learning Coordinator</w:t></w:r></w:p><w:p><w:r><w:t>Coordinated learning schedules.</w:t></w:r></w:p></w:body></w:document>';
 const doc=parseDocxXml(xml);assert.deepEqual(doc.paragraphs.map(p=>p.section),['experience','experience','experience']);assert.equal(doc.paragraphs[1].kind,'heading');
});

test('evidence references resolve only to existing source paragraphs',()=>{
 const doc=structurePlainText('Skills\nExcel reporting\nStakeholder support');const refs=resolveReferences(doc,['P0002','P9999','P0002']);
 assert.equal(refs.length,1);assert.equal(refs[0].text,'Excel reporting');assert.equal(refs[0].paragraph_id,'P0002');
});
