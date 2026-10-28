# PR #6 rebased onto V35

## Scope and provenance

The review candidate is based on the owner's `v35` branch at `9c5e0da028a64d34aac8fabe8ed7164a75c8400f` (PR #7). `main` remains V34 at `21817ae480c0c2acfff79318460d3141cab8a373` as checked on 28 October 2026. This PR is compared against `v35`, not against the older main branch.

The original PR #6 head was `30a0b33f832b3ea964f615b2c64eeb850c0941f9`. A local backup branch retains that head. No independent enhanced archive or Fenton Creative local redesign was copied into the owner's source.

## Preserved from V35

- The `src/` architecture, deterministic build and generated asset map.
- The unaltered engine decision presentation and separate human choices.
- History gates for discarded or previously applied vacancies.
- CSP, security headers, PDF reader safeguards and daily usage budgets.
- The owner's loopback-only, outbound-blocked offline QA preview; the superseded preview patch and old build script were not restored.
- Existing source/CV confirmation, shortlist provenance, storage keys, ownership and licence declarations.

`docs/V35_CONTRIBUTION_MANIFEST.json` remains the original owner's V35 snapshot. It is not a manifest for V35 plus this proposed PR.

## Remaining change

The engine now consumes UK applicant geography before scoring. Source-ineligible or explicitly foreign-only applicant restrictions yield Skip with no score. Unknown geography stays unresolved. A positive geography result is not proof of personal right to work.

The existing shared normalizer is served at `/vacancies/sources/normalization.mjs` and imported by `/engine/evaluate.mjs`; there is no second browser-only geography implementation. Its candidate-restriction parsing now distinguishes unrelated customer/supplier markets and a negated restriction from an applicant exclusion. Engine rules advance to `5.5.1-r6`; the owner's product release remains `35.0.0`.

The PR's regression moves to `tests/unit/uk-eligibility-gate.test.mjs`. Eight additional geography-context cases cover false exclusions and explicit applicant restrictions. Before the contextual repair, four of those eight cases failed; afterwards all eight pass. This is a bounded language-rule regression set, not complete natural-language eligibility validation.

## Verification on 28 October 2026

- Locked dependencies installed with `npm ci --ignore-scripts`.
- Build passed; syntax/CSP check passed for 53 scripts.
- 250 unit/regression tests passed, including the six original PR #6 cases and eight geography-context cases.
- 16 separate legacy tests passed.
- Browser suite: 18 synthetic checks passed on desktop and mobile; the two optional real-redacted-CV cases were skipped with `CAREER_RADAR_REDACTED_CV` unset.
- The adapted browser regression confirms evidence through visible controls, excludes an unsupported quotation, and checks a blocked role through search, saved shortlist and linked full-advert evaluation. Its assertions preserve V35's engine-decision wording.
- The retained preview returns synthetic remote/board responses and rejects unknown API routes; tests accept the existing V35 HTTP 404 rejection as well as HTTP 403.
- Built output is regenerated from current source. CI checks committed dist against a clean rebuild.

Local browser verification used installed Chrome via the optional `REVIEW_CHROMIUM_PATH` override, with video disabled. Default Playwright behaviour is unchanged. No real CV, live provider or paid AI was used. Local test success is not proof of deployed behaviour, real-data matching accuracy or release acceptance.

## Boundaries

No merge, deployment, invitation, production configuration, database migration, account/storage feature, billing change, ownership/licence decision, or employer contact is part of this PR. V35's owner release gates and open decisions remain intact.
