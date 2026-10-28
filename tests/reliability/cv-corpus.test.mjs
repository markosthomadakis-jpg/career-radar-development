import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {structurePlainText,parseDocxXml,toPlainText,toAnalysisText} from '../../worker/structured-cv.mjs';
const corpus=JSON.parse(fs.readFileSync(new URL('../../fixtures/synthetic-cv-corpus.json',import.meta.url)));
for(const fixture of corpus)test(`synthetic CV corpus: ${fixture.id} preserves sections and source evidence`,()=>{const document=structurePlainText(fixture.text);assert.deepEqual(document.paragraphs.map(paragraph=>paragraph.section),fixture.sections);assert.ok(toPlainText(document).includes(fixture.evidence));assert.ok(toAnalysisText(document).includes('[P0001|'));});
test('numeric XML entities, split runs, tables and explicit breaks remain readable',()=>{const xml='<w:document><w:body><w:p><w:r><w:t>EXPERIENCE:</w:t></w:r></w:p><w:tbl><w:tr><w:tc><w:p><w:r><w:t>Prepared learner&#x2019;s </w:t></w:r><w:r><w:t>reports &#38; records.</w:t><w:cr/><w:t>No licence claimed.</w:t></w:r></w:p></w:tc></w:tr></w:tbl></w:body></w:document>';const document=parseDocxXml(xml);assert.equal(document.paragraphs[1].section,'experience');assert.equal(document.paragraphs[1].text,'Prepared learner’s reports & records.\nNo licence claimed.');});
test('XML entity decoding occurs once',()=>{const document=parseDocxXml('<w:p><w:r><w:t>Keep &#38;lt; and &amp;gt; literal.</w:t></w:r></w:p>');assert.equal(document.paragraphs[0].text,'Keep &lt; and &gt; literal.');});
