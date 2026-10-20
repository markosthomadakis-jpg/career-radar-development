# T3 — Career Radar Source Audit (Beta-first)

**Date:** 20 October 2026  
**Status:** PARTIALLY VERIFIED — complete Beta source checkout and deployed browser/API checks remain open  
**Policy:** read-only inspection and offline tests; no live Adzuna/OpenAI calls, no deployment or access changes.

## 1. Source provenance

| Environment | Hosting revision | Recorded deployed Sites commit | Inspected material |
| --- | --- | --- | --- |
| Development Prototype | 13 | 4f64039d4c2d2973c5548096760a6191664cc9f4 | Full previously exported V13 ZIP, plus private GitHub main snapshot 3d143163708c3fd756280be6ee432dfc77975043 |
| Private Beta | 2 | 8238e175e20509b6896708dea3a7602d636252b2 | Previously recovered T1–T2 offline package containing nine selected source, build and test files; NOT a fresh full historical checkout |

**Verified this session:** Site metadata/deployment history identifies Development V13 and Beta V2 as distinct successful deployments; GitHub main includes the V13 code and AGENTS.md. The Development repository's main head is 07cdeeca7f4d12b015dcbc54466ed9a112148555 (documentation added after V13 migration).  
**Not verified this session:** byte equality of the live Beta V2 deployment and the complete T1–T2 package; a full Beta source-history diff. The T1–T2 package contains modified, not-yet-deployed Beta source.

Hosting revision numbers are separate from matching engine numbers V4, V5.2, V5.3, and proposed V5.4.

## 2. Inventory of engine and frontend pathways

### Development V13
- worker/calibration-model.mjs — shared V5.2 deterministic requirement extraction, evidence coverage and basic salary/FTC checks.
- worker/calibration-v53.mjs — Development-specific V5.3; role-specific risk patterns, short-description handling, date regex, contextual intelligence and score prioritization.
- worker/matching-client.js — browser-side evidence matching presentation.
- worker/calibration-client.js — browser-side V5.3/contextual evaluation presentation and manual comparison UI.
- worker/semantic-client.js — AI-related frontend flow; not exercised.
- worker/index.js — Worker/API routes including /api/jobs and guarded AI features; not exercised against live services.
- scripts/build-v3.mjs — source-to-dist build.
- tests/calibration-model.test.mjs, tests/calibration-v53.test.mjs, tests/contextual-intelligence.test.mjs — offline regression tests.
- tests/v4-v52-comparison.mjs — independent V4 *simulation/harness*, V5.2 and V5.3 over 25 *abbreviated* example listings. The V4 result here is NOT proof of a separately versioned production V4 implementation.

### Private Beta (T1–T2 offline subset)
- worker/index.js — authenticated backend, per-user D1 records, CV/preferences/applications/feedback, /api/evaluate and optional Adzuna /api/jobs.
- worker/page.js — rendered authenticated app HTML/JS; repaired source after T1.
- worker/calibration-model.mjs — byte-identical to Development V13 V5.2 module (SHA-256 9c8e0b1128db783224aef28410056838b8f015e4a7825ef5e9b39baa51c6a29e).
- worker/calibration-v53.mjs — Beta-specific V5.3, NOT identical to Development V5.3.
- scripts/bundle-worker.mjs, scripts/run-t2-smoke.mjs, tests/beta-script-smoke.test.mjs — offline packaging + browser smoke tests.

## 3. Material architecture differences and risks

### A. V5.3 has diverged (P0)
Development rates some 35–144-word advert excerpts with provisional numeric scores; the Beta requires >=145 description words and >=4 extracted requirements before showing a number. Beta additionally exposes screening_evidence, contextual_fit and vacancy_verification. Development has an extra evaluateContextualFit() path not present in Beta. The two separate V5.3 files must NOT be treated as one tested algorithm.

**Reproduced with synthetic CV and a 55-word training-operations vacancy:** Development score 89, decision APPLY CANDIDATE, confidence Low; Beta score null, decision VERIFY insufficient full requirements, confidence Low. This difference is intentional caution in Beta but confirms drift.

### B. Eligibility rules are incomplete (P0; T5–T6)
- Beta /api/evaluate builds the job with title, description, salary_min and salary_max only; it does not pass structured closing_date, contract_months, location, source_url or captured_at.
- V5.3 closing-date parsing supports a narrow textual pattern (English 'closing date DD October/November/December 2026') with a *hard-coded fallback asOf = 2026-10-20T12:00:00Z*. Beta API does not pass asOf. This is unsafe for continuing daily use.
- The 'blocked' hard-constraint condition changes the decision to SKIP, but the Beta result may still retain a numeric fit_score. Required policy is eligibility ineligible => score null.
- The Beta has one settings track (Crawley with £35k floor by default), not independent Local and London tracks.

### C. Evidence and confidence limitations (P0; T7–T8)
- The V5.2 underlying denominator is only extracted advertised requirements; this can inflate coverage on generic/thin adverts.
- Critical specialist gaps use heuristic subtraction, not an enforced rule-gated decision table.
- Text-pattern matching must not be treated as proof of qualifications, management responsibility or specialist skills.
- Contextual intelligence in the Beta is not researched by default and is not the same as the Development contextual scoring.

### D. Personal data, search and user safety (P1)
- Beta GET/POST/DELETE /api/profile uses server-side storage keyed by user_id; do NOT describe it as browser-only CV processing.
- /api/jobs can call Adzuna only if server credentials exist. Code imposes a per-user/day cap of 10 requests; live configuration and quota consumption were not checked.
- Profile/application/feedback user_id filters are visible in inspected queries, but independent two-account isolation and deletion completeness have NOT been proven.
- Real profile-data retention, privacy-notice fidelity, and production auth integration need checks before broader use.

## 4. Test evidence

| Test / source | Observed result | Evidence status |
| --- | --- | --- |
| V13 Node unit suite (calibration-model, calibration-v53, contextual intelligence) | 16 pass / 0 fail / 0 skipped | VERIFIED in this session; no API calls |
| V13 25-listing comparison harness | 25 records; V4 simulation 25/25 scored 100; V5.3 5 numeric and 20 N/A | VERIFIED in this session; this is not real-world accuracy evaluation |
| Beta strict T2 browser smoke test on owner's Windows Chromium | 3 pass / 0 fail / 0 skipped | REPORTED by owner with full console output in conversation |
| Beta strict T2 test in current environment | 2 pass, 1 fail because Playwright is absent | VERIFIED environment limitation; not an application failure |
| Live Beta login/write/isolation, live Adzuna, live CV deletion | Not run | NOT VERIFIED |
| Original 26-vacancy fixture | Not available | NOT VERIFIED; do not invent or substitute |

The five more detailed V13 test listings are *summaries*, not authoritative full employer job specifications. No statistically valid false-positive/negative rate can be stated.

## 5. Development order (Private Beta primary)

1. **T3 close-out:** re-check out the complete Beta source and record exact build/runtime paths, source commit and future branch reproducibility; add this audit to Beta's own source workflow.
2. **T4:** consolidate to a single pure evaluation module used by Beta API and tests; retain response backwards compatibility. Port useful V13 features deliberately, not a wholesale V13 file replacement.
3. **T5:** structured vacancy payload, manual fields and source metadata.
4. **T6:** deterministic eligibility gate with injected Europe/London evaluation date; expiry/salary/FTC/historical application exclusions mean null score + Skip.
5. **T7–T8:** advert completeness/coverage ceilings and confidence-based decision restrictions.
6. **T9–T10:** freeze 26 real adverts with human reference labels before running the engine; deterministic offline V4/V5.3/V5.4 comparison.
7. **T11:** reproduce score inflation and expired-vacancy failures and add regression tests.
8. **Controlled owner-only Beta release only after** code review, security/data smoke tests, a full build, and explicit owner authorization. Re-run Chromium smoke against the deployed version, not just a local mock.

Daily *owner* dogfooding should capture per-vacancy observed errors and user feedback, distinguishing mocked searches from actual live-source results. Do not turn on chargeable APIs or import private CV data into fixtures.

## 6. Status / next step

**T3 status: PARTLY DONE.** Source/algorithm mapping and offline tests reproduced. The full Beta Site repository/history and live build equivalence remain to be established. **Next implementation:** T4 only after that reconciliation. No production-site or GitHub main modifications were made for this audit.