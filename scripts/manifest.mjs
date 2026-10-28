// Writes docs/V35_CONTRIBUTION_MANIFEST.json: SHA-256 of every tracked file in this release, so the
// exact delivered contribution can be identified later. Deterministic: no timestamps, sorted paths.
import {execFileSync} from 'node:child_process';
import {readFileSync,writeFileSync} from 'node:fs';
import crypto from 'node:crypto';
import {RELEASE,PRODUCT} from '../src/version.mjs';
import {ENGINE_VERSION} from '../src/engine/evaluate.mjs';

const OUT='docs/V35_CONTRIBUTION_MANIFEST.json';
const files=execFileSync('git',['ls-files','-z'],{encoding:'utf8'}).split('\0').filter(f=>f&&f!==OUT).sort();
const sha=b=>crypto.createHash('sha256').update(b).digest('hex');
const entries=files.map(path=>{const bytes=readFileSync(path);return {path,bytes:bytes.length,sha256:sha(bytes)};});
const tree=sha(entries.map(e=>`${e.sha256}  ${e.path}\n`).join(''));
const manifest={
 product:PRODUCT,release:RELEASE,engine_version:ENGINE_VERSION,
 owner:JSON.parse(readFileSync('package.json','utf8')).author,
 baseline:{description:'V34 as merged to main (PR #5)',commit:'21817ae480c0c2acfff79318460d3141cab8a373'},
 excludes:'PR #6 (unmerged review candidate by a third party) is not included.',
 tree_sha256:tree,file_count:entries.length,files:entries
};
writeFileSync(OUT,JSON.stringify(manifest,null,1)+'\n');
console.log(`${OUT}: ${entries.length} files, tree ${tree}`);
