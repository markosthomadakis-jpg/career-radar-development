# V5.4 Chromium smoke / regression — owner run

**Date reported:** 21 October 2026  
**Evidence classification:** USER-REPORTED execution on owner's Windows machine, not rerun by the assistant.  
**Artifact exercised:** `CareerRadar_Private_Beta_V54_Chromium_Smoke_20261021.zip` (separate strict browser smoke package).  
**Environment:** Chromium + Playwright using mocked/offline data, no real CV, Adzuna/OpenAI API calls or deployment.

## Owner-provided terminal outcome

```text
Running strict V5.4 regression + Chromium smoke tests with mocked data only.
V5.4 verified: UI -> structured POST -> offline Worker -> Skip + null score; zero JS errors; no external APIs.
✔ V5.4 Chromium: manual structured advert travels through real offline Worker; expired -> Skip, no score
✔ T4/T5/T6: API uses V5.4 and structured expiry is Skip with null score
✔ T6: API excludes short contract despite matching CV
✔ T6: tracked application status prevents duplicate evaluation
✔ T5: old title and description-only API request still works conservatively
✔ T1: source HTML preserves regex backslashes and inline JS parses
✔ T2: built Worker serves parseable HTML with the six tabs
✔ T2: browser loads with mocked APIs and every navigation tab switches
✔ T4: engine returns deterministic backward-compatible shape
✔ T6: expired structured date produces Skip with null score
✔ T6: closing date equal evaluation date still open
✔ T6: future dated vacancy is not expired
✔ T5: parse date 15 October 2026
✔ T5: parse date 15 Oct 2026
✔ T5: parse date 15/10/2026
✔ T5: parse date 2026-10-15
✔ T5: ambiguous date is unknown, never guessed
✔ T5: invalid date is not silently normalized
✔ T6: expiry parsed from text Closing date: 15 October 2026
✔ T6: expiry parsed from text Apply by 15 Oct 2026
✔ T6: expiry parsed from text Applications close 15/10/2026
✔ T6: expiry parsed from text Deadline: 2026-10-15
✔ T6: salary below floor returns Skip null
✔ T6: missing salary is unknown rather than treated as above floor
✔ T6: overlapping salary band is unknown, not falsely rejected
✔ T6: three-month contract is ineligible, six-month is permitted
✔ T6: free-text contract is a fallback to missing structured duration
✔ T6: a previously withdrawn or applied vacancy is excluded
✔ T7: a three-line generic advert is not assessable
✔ T7: incomplete advert cannot obtain Strong or Apply
✔ T7: specialist requirement not demonstrated is a critical gap
✔ T8: Low confidence never produces Apply
✔ T7: adding specialist essential cannot increase fit
✔ T7: deleting advert text cannot raise confidence
✔ T4: no inputs are mutated and invalid evaluation date rejected
ℹ tests 35
ℹ suites 0
ℹ pass 35
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 1853.7875
```

## What it proves

- The offline V5.4 browser package booted and navigated through six tabs without JavaScript errors.
- Structured vacancy details traversed the actual offline Worker evaluation path; an expired vacancy led to `Skip` and `fit_score:null`.
- Core deterministic behavior, backward-compatible API usage and conservative constraints passed the 35 listed checks.

## What it does NOT prove

- Does not establish that the private GitHub branch itself contains every addition from the separately generated **35-test** smoke ZIP (inspect and import strict test files before making this the canonical release suite).
- Does not prove the actual published Beta V2 is updated or correct. The V5.4 changes are **not deployed**.
- Does not prove actual signed-in flows, real user data segregation/deletion or live Adzuna integration.
- Does not provide ground-truth real-world matching accuracy: `fixtures/validation-26.json` still contains 0/26 independent labels/full authentic advertisements.
- Full Private Beta original repository/deployment-assets reconciliation remains an open T3 step.

## Next gate

1. Reconcile complete source and deploy history of original Private Beta V2.
2. Incorporate strict `smoke:v54` browser test from tested ZIP into the canonical Private Beta branch, then rerun.
3. Supply 26 complete real adverts and independent pre-registered human labels before T10.
4. Privacy/auth/account-isolation staging checks before owner-only publication, with separate express owner approval.
