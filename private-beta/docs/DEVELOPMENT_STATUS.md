# Private Beta V5.4 offline development checkpoint — 21 October 2026

The complete Private Beta Git repository, deployment configuration, database migrations and auth configuration were NOT recovered in this package. The enclosed code is an extension of the nine-source-file T1/T2 offline bundle and MUST NOT be published without full source reconciliation and operator sign-off.

## Done locally
- T4: `worker/match.mjs` is the one deterministic, pure **active scoring implementation** imported by `worker/index.js` and engine tests. Historical V5.3 retained only for comparisons.
- T5: extend `/api/evaluate` request and form to pass structured date, salary, contract, location, source fields while supporting title+description legacy input.
- T6: date/contract/salary/application-history eligibility gates and `Skip`+`fit_score:null` for ineligible vacancies. Europe/London date is injected by endpoint; engine has no clock.
- T7: advert completeness check, expected role-family capability denominator, coverage ceilings, and critical specialist evidence flags. These are conservative heuristics, not validated predictive thresholds.
- T8: Low-confidence cannot produce Apply. No ranking system for multiple scored listings exists yet (confidence sorting is NOT verified).
- T9: strict 26-row placeholder schema; **0/26 are real labelled adverts**. The corpus is not validated, and no employer description was invented.
- T10: deterministic offline harness; refuses to generate a misleading accuracy report before the 26 real ads and independently registered human labels exist. V4 comparator is a simplified historical simulation, not original deployed model.

## Tests
- `npm run build` creates single-file Worker offline; no Site, Adzuna or OpenAI APIs.
- `npm test` Node suite includes the T2 source/build smoke checks, 27 engine regression tests, 4 API tests. Browser smoke skipped automatically if Node Playwright is unavailable. `npm run test:t2` requires Chromium and fails if absent.
- Separate Python Playwright browser test is **not verified** in this managed sandbox: navigation is blocked by administrator. Run the required browser test on the owner's local machine.

## Blockers
- Confirm the original Beta Site Git commit and complete source/build assets, including migrations, before deployment.
- User supplies/approves 26 full original adverts and *independent human labels* for T9/T10.
- Manual privacy retention and account-isolation tests, full CV deletion test, live authenticated integrations and staged smoke test are needed before broader use.
