# V5.4.5: decision consistency and limited intelligence

## Implemented

Unknown configured contract-duration, salary or location checks now require Investigate. Unknown closing date alone remains a Low-confidence source check. Not-assessable and ineligible gates still take precedence. Named expected role-family coverage gaps, concrete verification actions and tailoring examples now accompany the output. Examples cite existing evidence and published duty text. Removed the duplicate Priority score and disabled contextual-score panels.

Limited intelligence 1.0.0 is enabled by default with an explicit off switch. It takes vacancy text and the current search listings only, never a profile. It provides:

- Exact-name employer source matching: Elysium Healthcare and gategroup initially. Checked official corporate descriptions on 2026-10-21. Each retains a brief source excerpt, URL, checked date, exact excerpt SHA-256, hash scope and a label explaining corporate self-description is not independent employer-quality evidence. Snapshots older than 30 days are marked for recheck; future snapshots are not used.
- Text-triggered questions about payroll scope, workforce records, HR specialism, contract/procurement ownership and attendance patterns. Each has a source passage and is explicitly a question/interpretation, not a published requirement or candidate claim.
- Up to three sourced, distinct listings with at least two shared detected categories, with similarities, differences and comparison passages. Summaries remain labelled summaries. Search listings are not a sector-wide research sample. No claim of equivalent suitability.
- Optional original-source URL for manual adverts; exact supplied advert-text and comparison-text SHA-256 fingerprints. Observation date is explicitly not publication date. Hashes identify retained text, not authenticity/completeness.

All computation is browser-local. No automatic web crawler, new paid API, employer-quality rating, fit adjustment, recommendation adjustment, or unknown-employer penalty. Existing opt-in Semantic AI remains separate and was not exercised. No GitHub changes, invitations, Beta deployment or access expansion.

## Verification in this session

- npm run build: succeeded; node --check dist/server/index.js: succeeded; git diff --check: clean.
- npm test: 88 tests passed, 0 failed. Includes unknown eligibility, named expected categories, evidence-only tailoring, employer matching, hashes, stale sources, safe links, summary-labelled comparisons, on/off behavior, exact served module bytes, and component rendering of sourced/unknown/disabled states.
- Component tests execute the actual UI source using a test import adapter and minimal DOM stubs; these are not browser smoke tests.
- npm run simulate: 22 archived vacancies, fictional SYN-ADMIN-01, fixed evaluation date 2026-10-21, no personal CV or human labels. Two runs identical. Result SHA-256: 2630ea3e456507119b868f88aca57820cdeb2945e84b4e3c717ff7dbe92ad82b. 6 Apply with tailoring, 11 Investigate, 3 Not assessable, 2 Skip; no Skip with numeric score and no Low-confidence unqualified Apply.
- Cloud Browser preview opening and subsequent state request each timed out at the browser service. Visual/browser QA of this release is NOT verified. No alternate browser automation or browser installation attempted.

## Sources and limitations

https://www.elysiumhealthcare.co.uk/about-us/
https://www.gategroup.com/about/gategroup-at-a-glance/

Descriptions checked through public web retrieval; no vacancy-specific employer quality or workforce condition was inferred. Exact source excerpts and hashes are in worker/employer-context-data.mjs. The two initial source records do not constitute broad employer coverage. Full requirement extraction remains limited by the rule catalogue; no empirical accuracy claim is made without human review. The owner's two full adverts and personal profile were not rerun.
