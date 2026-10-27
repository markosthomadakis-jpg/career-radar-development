# V34 selective review patches

## Scope

This branch treats the independently reviewed package as a patch library. It preserves Career Radar's existing Structured CV → confirmed evidence → keyword expansion → matching → Unified Search workflow.

## Adopted and redesigned

- Cross-source deduplication now requires corroborating vacancy identity (shared provider ID, canonical URL or requisition ID). Similar title, employer and location alone produce a possible-duplicate warning instead of a destructive merge.
- Provider failures and incomplete pagination are carried through the unified result so partial results are visibly partial.
- Saved leads retain assessment provenance, bounded supporting CV quotations, unresolved checks and original source links. A changed profile marks the assessment stale; clearing CV data removes saved quotations but retains vacancy facts.
- Structured CV parsing handles heading punctuation, explicit Word line breaks and numeric XML entities more safely.
- First-use guidance explains the confirmed-evidence workflow without bypassing it.
- Mobile navigation shares the available width across all seven controls; no reviewed-package mobile layout was copied.
- Synthetic regression fixtures cover CV parsing, shortlist provenance, provider failure and cautious deduplication.

## Explicitly not adopted

- Synthetic AI output as an independent fact, seniority rating or replacement matching engine.
- Any path that skips source-CV confirmation or scores a provider summary as a full advert.
- The reviewed package's mobile navigation changes, which failed its own viewport/click tests.
- Deployment, production data changes, live paid-provider calls or automatic applications.

## Validation boundaries

- Automated tests use synthetic CVs and mocked provider responses only.
- A real redacted CV is not committed in this repository, so real-CV validation requires the owner to place an approved redacted copy in the repository.
- Live provider validation requires separate owner approval under the repository rules. No live provider or chargeable API call is made by this branch.
