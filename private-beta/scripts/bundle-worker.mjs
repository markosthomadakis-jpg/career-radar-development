import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const read = name => readFile(resolve(root, 'worker', name), 'utf8');
const [model, match, page, entry] = await Promise.all([
  read('calibration-model.mjs'),
  read('match.mjs'),
  read('page.js'),
  read('index.js'),
]);
const modelPart = model.replaceAll('export ', '');
const matchPart = match.replace(/^import\s+\{extractCandidateEvidence, extractJobRequirements\}\s+from\s+'\.\/calibration-model\.mjs';\s*/m, '').replaceAll('export ', '');
const pagePart = page.replace(/^export\s+const\s+page=/m, 'const page=');
const entryPart = entry.replace(/^import[^\n]+\n/gm, '');
if (/^import |^export (?!default)/m.test(modelPart + matchPart + pagePart + entryPart)) {
  throw new Error('Unbundled local import or export remains');
}
await writeFile(resolve(root, 'dist/server/index.js'), [modelPart, matchPart, pagePart, entryPart].join('\n\n'));
