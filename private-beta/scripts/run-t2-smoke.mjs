import {spawnSync} from 'node:child_process';
import {mkdir} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {resolve} from 'node:path';

// This runner is portable to PowerShell: no Bash, real hosting secrets, or live APIs.
const root=resolve(fileURLToPath(new URL('..',import.meta.url)));
await mkdir(resolve(root,'dist/server'),{recursive:true});
await import('./bundle-worker.mjs');

console.log('Built the offline Private Beta Worker. Starting REQUIRED Chromium smoke test.');
const result=spawnSync(process.execPath,['--test','tests/beta-script-smoke.test.mjs'],{
  cwd:root,
  env:{...process.env,CAREER_RADAR_REQUIRE_BROWSER:'1'},
  stdio:'inherit',
});
if(result.error)throw result.error;
process.exitCode=result.status??1;
