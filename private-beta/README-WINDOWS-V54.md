# Career Radar Private Beta — V5.4 offline development test package

This ZIP is an **offline, un-deployed development snapshot** based on the nine-source-file T1/T2 Private Beta recovery. It is not a complete production backup and is not authorized for deployment.

## Windows 10/11 quick test

1. Extract ZIP. Open its folder containing `package.json` in File Explorer. Type `powershell` in the address bar.
2. Confirm `node --version` displays an installed Node.js version (Node 22 recommended).
3. Run `npm.cmd test`. This builds the Worker and runs 31+ deterministic engine/API checks plus static smoke tests. If Playwright is not installed, one browser test is reported **skipped**, not passed.
4. To run the strict browser test, run `npm.cmd install --no-save playwright` and `npx.cmd playwright install chromium` if needed. Then run `npm.cmd run test:t2`. It must report 3 passes and 0 skips. The test mocks all API responses and makes no Adzuna or OpenAI requests.
5. Run `npm.cmd run validate` to confirm the 26-advert validation gate is BLOCKED until authentic saved advert descriptions and independent human labels have been supplied. Exit status 2 is the **expected** safe behaviour for the provided placeholder fixture.

## Files and architectural changes

- `worker/match.mjs` — pure deterministic V5.4 engine: injected evaluation date, structured eligibility rules, advert completeness, conservative capability coverage and screening evidence.
- `worker/index.js` — Beta `/api/evaluate` imports the V5.4 engine, passes structured job properties and per-user tracker history; account isolation in mocked tests, not independently proven live.
- `worker/page.js` — new structured input fields for manual vacancy assessment.
- `worker/calibration-v53.mjs` — **legacy** preserved for comparisons, NOT imported into the active Beta endpoint.
- `tests/match-v54.test.mjs` and `tests/api-v54.test.mjs` — regression suite with no real CV text.
- `fixtures/validation-26.json` — 26 explicitly unlabelled slots; no invented listings.
- `scripts/validate-26.mjs` — comparator that refuses to run without authentic advertisements and human labels.

## Guardrails

No deployment, no live API calls, no real personal CV data in fixtures, no production credentials. Do not mistake offline test success for deployment readiness, privacy verification, or a real-world accuracy score. See `docs/DEVELOPMENT_STATUS.md`.
