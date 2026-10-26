# Final QA: pass within local scope

- Base source verified against saved V13: 4f64039d4c2d2973c5548096760a6191664cc9f4.
- 45 regression/integration tests passed.
- Eight tabs clicked and visibly rendered in Cloud Chromium.
- Synthetic evidence entry and three mocked vacancy results passed.
- General role: Apply; specialist role: Investigate with 59; expired role: Skip and Unrated.
- Detailed calibration rendered with explicit salary controls.
- Human Apply / Skip / Investigate reviews persisted after reload; no application submitted.
- Final application console error count: zero (browser-extension errors excluded).
- 22-source synthetic simulation repeatable; zero Skip-with-score and zero Low-confidence unqualified Apply.

Publication boundary: this is a locally tested release candidate of the Development Prototype, not a published update and not an update of the separate Private Beta. Real paid data/API search and personal-profile calibration were not exercised. A hosted post-deployment check would still be needed after owner authorization.

The browser-found startup race and stale-cache risk were fixed. No automatic re-tuning or company reputation score was enabled. Reports/RELIABILITY_REPORT.md contains the prior engine comparison; this file supersedes its earlier browser-QA and V12-base limitations.
