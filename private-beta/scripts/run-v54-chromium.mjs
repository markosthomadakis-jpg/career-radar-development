import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';

// Fail-closed, PowerShell/Windows-compatible: Chromium is required, not optional.
const root = resolve(fileURLToPath(new URL('..', import.meta.url)));
const build = spawnSync(process.execPath, ['scripts/build-offline.mjs'], {cwd: root, stdio:'inherit'});
if (build.error) throw build.error;
if (build.status !== 0) {process.exitCode = build.status ?? 1;}
else {
  console.log('\nRunning strict V5.4 regression + Chromium smoke tests with mocked data only.');
  const tests = spawnSync(process.execPath, [
    '--test', 'tests/match-v54.test.mjs', 'tests/api-v54.test.mjs',
    'tests/beta-script-smoke.test.mjs', 'smoke/v54-browser-form.test.mjs'
  ], {
    cwd: root,
    env: {...process.env, CAREER_RADAR_REQUIRE_BROWSER: '1'},
    stdio: 'inherit'
  });
  if (tests.error) throw tests.error;
  process.exitCode = tests.status ?? 1;
}
