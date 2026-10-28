# PR #6 on V35 main

## Scope and provenance

The owner-supplied V35 release was introduced by PR #7 from `v35` at `9c5e0da028a64d34aac8fabe8ed7164a75c8400f` and merged into `main` as `574403e9bee306698337efdcf079df8db3ef95c3` on 28 October 2026. PR #6 now targets `main`.

The original PR #6 head was `30a0b33f832b3ea964f615b2c64eeb850c0941f9`. It was adapted to the V35 architecture before retargeting. No independent enhanced archive or Fenton Creative local redesign was copied into the owner's source.

## Preserved from V35

- The `src/` architecture, deterministic build and generated asset map.
- The unaltered engine decision presentation and separate human choices.
- History gates for discarded or previously applied vacancies.
- CSP, security headers, PDF reader safeguards and daily usage budgets.
- The owner's loopback-only, outbound-blocked offline QA preview; the superseded preview patch and old build script were not restored.
- Existing source/CV confirmation, shortlist provenance, storage keys, ownership and licence declarations.

`docs/V35_CONTRIBUTION_MANIFEST.json` remains the owner's historical V35 snapshot. It is not a manifest for V35 plus this proposed follow-up.

## Proposed follow-up change

The engine consumes UK applicant geography before scoring. Source-ineligible or explicitly foreign-only applicant restrictions yield Skip with no score. Unknown geography stays unresolved. A positive geography result is not proof of personal right to work.

The shared normalizer is served at `/vacancies/sources/normalization.mjs` and imported by `/engine/evaluate.mjs`; there is no second browser-only geography implementation. Its candidate-restriction parsing distinguishes unrelated customer or supplier markets and a negated restriction from an applicant exclusion. Engine rules advance to `5.5.1-r6`; the product release remains `35.0.0`.

The regression is in `tests/unit/uk-eligibility-gate.test.mjs`. Eight additional geography-context cases cover false exclusions and explicit applicant restrictions. Before the contextual repair, four of those eight cases failed; afterwards all eight passed. This is a bounded language-rule regression set, not complete natural-language eligibility validation.

## Verification recorded on 28 October 2026

- Locked dependencies installed with `npm ci --ignore-scripts`.
- Build passed; syntax/CSP check passed for 53 scripts.
- 250 unit/regression tests passed, including the six original PR #6 cases and eight geography-context cases.
- 16 separate legacy tests passed.
- Browser suite: 18 synthetic checks passed on desktop and mobile; the two optional real-redacted-CV cases were skipped with `CAREER_RADAR_REDACTED_CV` unset.
- The adapted browser regression confirms evidence through visible controls, excludes an unsupported quotation, and checks a blocked role through search, saved shortlist and linked full-advert evaluation.
- The retained preview returns synthetic remote/board responses and rejects unknown API routes.
- Built output is regenerated from current source. CI checks committed `dist` against a clean rebuild.

Local browser verification used installed Chrome via the optional `REVIEW_CHROMIUM_PATH` override, with video disabled. Default Playwright behaviour is unchanged. No real CV, live provider or paid AI was used. Test success is not proof of deployed behaviour, real-data matching accuracy or release acceptance.

## Boundaries

No deployment, invitation, production configuration, database migration, account/storage feature, billing change, ownership/licence decision or employer contact is part of PR #6. V35's release gates and open decisions remain intact. The required `0003_usage_budget.sql` migration must still be applied before any deployment.
