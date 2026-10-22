# Structured matching candidate 5.6.0-rc1

Built in an isolated checkout from V5.5.1 commit `6a92982cda5cf87e75302c15d97093a2022533d5`. Live remains V5.5.1. This candidate does not carry forward the failed original-source/completeness visibility gates from 5.5.2–5.5.3.

## Usage

1. Evidence matching: supply Core skills, Additional skills, Experience & evidence. A supported CV upload is initially placed in Experience & evidence so it remains verbatim; review and distribute the statements, then Build evidence profile. Existing local CV text is migrated into that field without deletion. No profile text leaves the browser in this workflow.
2. Live vacancies: keywords/area/radius plus the inclusive window from application opening back seven days. Same-day and last-24-hour listings are included. Missing salary, contract, deadline or source accessibility do not exclude discovery. Load next 20 results keeps the anchor fixed. NEW is displayed only if supplied by the provider, and never substitutes for a missing/old/future timestamp. A provider-created date can represent reposting; it is not authenticated original publication. API availability remains an external dependency.
3. Fit Calibration: copy published Essential criteria, Desirable/additional criteria and Experience requirements into three fields. Retain source URL and title; link to provider metadata only for the same vacancy. Experience priority is explicit or left unspecified, and each row can be corrected. Exact duplicate wording counts once; conflicting sections are flagged and remain unspecified until corrected. Confirm the copied requirement scope, then Evaluate evidence.
4. Matching searches all three profile sections; a profile's Additional skill can meet an employer Essential. Read the original evidence quotation, canonical concept, source field and unresolved qualifiers. Unsupported/manual requirements remain visible; named systems, minimum years, sectors and scope are not silently waived.
5. Only Apply and Discard/Skip are final review options. The candidate's provisional Apply retains a prominent verification checklist for unknowns. Unknown is not absence; a self-reported essential absence or confirmed hard block results in Skip. No application is submitted. Score bounds use all supplied requirement weights; they are not artificially narrowed or a hiring probability.
6. Save my review and export regular backups. Classification quality is now recorded separately from overall presentation quality. Old records, including Investigate decisions, remain historical and unchanged. No automatic rule updates or training.

## Dictionary boundaries

20 curated local `cr:` concepts cover initial administrative/learning-operations scenarios. Alias relationships are shared on both sides. O*NET Performing Administrative Activities (4.A.4.c.1) and Working with Computers (4.A.3.b.1) are verified broader references for selected local concepts; they do not make distinct local concepts equivalent. ESCO preferred/non-preferred terminology and the O*NET content model inform the design. This is NOT a complete ESCO import or a comprehensive per-industry vocabulary. Unmapped input is retained for review.

Sources checked 22 October 2026:
- https://esco.ec.europa.eu/en/classification
- https://www.onetcenter.org/content.html
- https://www.onetonline.org/find/descriptor/result/4.A.4.c.1
- https://www.onetonline.org/find/descriptor/result/4.A.3.b.1

## Validation and limits

The existing engine and historical rendering contracts are retained as regressions; legacy rendering tests explicitly read the archived 5.5.1 client. New tests exercise the structured matcher, bounds, shared concepts, cross-section evidence, explicit scope differences, named tools, years, duplicate/conflicting input, date boundaries, and feedback provenance. Browser QA uses only synthetic profile text and local mocked APIs.

`scripts/replay-structured-nine.mjs` reads the owner's nine source snapshots and verifies their original text hashes. It uses SYN-STRUCTURED-01, not the personal CV, and preserves original human labels as historical metadata. Its automatic section partition is a test helper requiring human confirmation; it is not gold truth. `reports/structured-nine-replay.json` therefore makes no accuracy/decision-agreement claim. Classification and matching must be reviewed by the owner before any live release.

Review exports retain exact structured source input, classification corrections, dictionary version/references, unresolved qualifiers, score range and SHA-256 provenance. They exclude CV text and quotations. The new local profile storage can be cleared with Clear local CV data. Legacy Semantic AI remains a separate opt-in path and has not been used in this work.
