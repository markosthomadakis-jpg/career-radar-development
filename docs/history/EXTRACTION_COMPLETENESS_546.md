# V5.4.6 — requirement retention and source accounting

Verified implementation: section-aware extraction retains duties and candidate criteria even when outside the catalogue. Retained manual facets include recruitment, employee onboarding, employment changes, HR records, compliance checks, employee relations, contract paperwork, named systems, reception, confidentiality, administrative experience, Office applications and general organisational skills. These are manual-review categories, not fabricated proven competence or specialist prerequisites. Unknown generic duties in recognised sections use a source-backed fallback. Ambiguous short duty labels such as Reporting are retained for scope clarification without becoming demonstrated reporting evidence.

Every parsed source unit has an ID, source text, section, disposition, reason and linked requirements where applicable. Category entries preserve repeated source occurrences. Candidate criteria headings supply recorded importance provenance. HTML paragraph/list boundaries and common typographic headings are supported. Benefits, clinic narrative and recruitment accessibility text remain auditable exclusions. Full clause-level semantic completeness is explicitly unverified.

## Source and concrete regression

fixtures/elysium-extraction-20261022.json contains only the employer advert extracted from the owner-supplied Pasted text(3).txt. UI output and personal evidence were excluded. The fixture records source URL, 2026-10-22 capture date, owner-supplied status, no independent refetch, and SHA-256 e731af362fe06504d349a057a901ddb5997403695911f63ab31a276c1fe4ef7f of the exact retained LF/UTF-8 description. No human label was assigned.

Verified extraction: 44 source units, 22 requirement entries: 4 existing catalogue categories plus 18 manual-review entries. Every listed duty and candidate criterion is retained; Reporting is an explicitly ambiguous manual item. GCSE grades, English/Mathematics and equivalence wording are retained. The generic synthetic four-sentence administrative profile yields Not assessable/null rather than the previous misleading generic-only 75. This is not a rerun of the owner's profile.

## Verification and behavior change

npm run build succeeded. npm test passed 100/100 (0 failed), including source traceability, every Elysium listed duty/criterion, HTML and alternative headings, non-requirement exclusions, deduplication, preserved qualification conditions, generic false-positive controls and full UI component rendering. node --check dist/server/index.js and git diff --check passed.

npm run simulate: 22 archived source cases, synthetic SYN-ADMIN-01, fixed 2026-10-21 evaluation date, no personal CV or human labels; two runs identical. SHA-256 1033c0a0d4329e2323e65c66ec29c805816129730630751b1ec28a0f1d565767. Decisions: 4 Investigate, 16 Not assessable, 2 Skip. Zero Skip with numeric score; zero Low-confidence unqualified Apply.

The increase in Not assessable is material: requirements previously omitted now remain unknown in the denominator. No claim is made that automatic matching is complete or that accuracy has been measured. Extending reliable evidence matching for manual categories remains future work; silent omission is not an acceptable substitute.

Visual/browser QA was not performed for this release; Cloud Browser had timed out twice in the preceding release task. Existing component tests execute actual UI source with a test import adapter and DOM stubs and are not browser smoke tests. Limited intelligence remains enabled and does not affect scores or decisions. No paid calls, personal CV scoring, GitHub modifications, Beta deployment or access changes were made.
