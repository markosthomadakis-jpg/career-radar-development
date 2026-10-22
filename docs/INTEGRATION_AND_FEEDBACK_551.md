# V5.5.1 — reviewed integration and ongoing human review

## Selected changes

Adopted the external V5.5.0 separation of source completeness, extraction, matching capability, evidence states and eligibility, plus screening conditions in every section, source-link validation, explicit linkage of pasted text to selected provider metadata, compound qualifier checks, additional L&D categories, honest manual/no-match wording, and same-origin/contact-redaction improvements for existing paid routes. No paid call was made. Preserved our Site identity, existing corpus hashes, synthetic profiles and generated fresh reports.

Independent fixes: unsure is never absence; specific Totara/Docebo and Storyline/Canva are not interchangeable evidence; candidate quotations are ranked by qualifier coverage rather than first occurrence. Unresolved critical credentials cannot be offset by other matched essentials. Conditions requiring an existing clearance block application recommendations until reviewed, unlike routine later screening. A provisional minimum assessed-weight ratio of 60% blocks application recommendations when too much remains unchecked; the scoped numeric score may remain visible. This is a transparent conservative rule, not calibrated accuracy.

Published essential/desirable/context importance remains distinct from inferred sector relevance. Sector tables are advisory by default; they neither invent published criteria nor change fit/decisions. The engine's explicit `useInferredCore` experimental preference is not exposed or enabled by the UI. The imported external sector-policy regression suite explicitly opts into that separate mode; independent V5.5.1 tests verify the actual default advisory behavior. 75% essential and 50% assessed non-essential thresholds remain provisional visible decision preferences; critical unresolved conditions override them.

An application Skip recorded as a preference does not automatically become ineligibility. Existing explicit history/exclusion inputs remain supported. AI commentary no longer displays its separate numerical relevance score. Origin checks are not authentication/rate limiting; those protections and self-hosted PDF.js remain follow-up work. Existing hosted owner-only audience is preserved.

## Human improvement cycle

The local feedback ledger records application decision independently from the user's judgement of engine quality, a reason dimension, optional requirement reference and free-text explanation. Snapshots include the exact advert and SHA-256, available structured eligibility facts, source URL, observation date, engine version, requirement/evidence states, effective threshold output and preference/profile hash references. The module does not copy CV text or CV quotations into the ledger/export. User-entered notes can contain personal information and should be reviewed before sharing.

The legacy Apply/Skip/Investigate actions open the detailed review path. They alone are not human truth labels for fit. The detailed form adds the reason and assessment needed for contextual feedback. Review saves are append-only, and revisions reference superseded records. Period reports use the latest review per advert/profile/preferences/engine, preserving all events in exports. Same-millisecond revisions respect append order. Repeated reported engine errors are separated from salary, commute, employer and role preferences.

Choose a 7-, 30- or 90-day rolling window. Summaries refresh on opening, saving or manual refresh. Three distinct adverts reporting the same engine-error area create a review candidate; fewer remain examples to inspect. This is not statistical evidence of correctness. There is no background scheduler and no automatic code/model change. Export produces the complete ledger plus the selected-period summary, integrity hash and explicit workflow: review cases → propose correction → regression/fixed-sample comparison → owner approval → versioned release/rollback. Store the exported report as a backup; browser storage can be cleared or exhausted. An export/import restore UI is not included yet; exported reports can be supplied for subsequent development review.

WebCrypto is preferred for SHA-256. A browser-local SHA-256 fallback supports plain-HTTP mock preview with tests against Node digests over padding boundaries and Unicode; no profile is sent to a hashing endpoint.

## Verification this session

- Build and built-worker syntax pass; 164 tests passed, zero failed. Includes all independently reproduced review regressions, actual default/advisory policy and optional inferred-core policy, feedback integrity/privacy, review revisions, periods and preference/error separation.
- 22 archived cases with SYN-ADMIN-01, no personal CV and no human labels, fixed 2026-10-21 evaluation date: identical repeat SHA-256 f0335a1f5bbdefe070f200da8d44646e7479d0308ea1791dacdd345c138b3387. Decisions: 18 Investigate, 2 Not assessable, 2 Skip. Zero Skip with score and zero Low-confidence unqualified Apply. Counts are not accuracy and were not tuned toward a preferred distribution.
- Cloud Browser mock preview: V5.5.1 rendered; Totara versus Docebo remained partial with explicit qualifier; DBS displayed separately. A synthetic Skip/accurate/commute review saved, appeared in the period summary as a preference rather than error, survived reload, and exported a JSON download successfully. No paid provider requests. The browser logged extension metadata errors unrelated to the app; no app error was observed in the exercised flow.

Known limits: rule-based segmentation still imperfect; source categories can be incomplete or conflated; no measured accuracy or real-profile validation. No automatic evidence inference for unsupported manual criteria. Fine-tuning or rule release is a subsequent reviewed engineering action, not an automatic consequence of feedback.

Previous published rollback source: 1eddf83704b01de8d5b834af7e5bcf9882e37443 (V5.4.6). External input hashes are in EXTERNAL_REVIEW_INPUTS_551.json.
