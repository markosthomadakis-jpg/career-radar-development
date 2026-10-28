# Changelog

Release numbers are product releases (`src/version.mjs`). Engine rule versions are listed separately because saved assessments are stamped with them.

## 35.0.0 — 2026-10-28 (engine 5.5.1-r5, unchanged)

Consolidation and hardening of the owner's V34 work. Details and evidence: `docs/RELEASE_V35.md`.

- Engine decisions shown unaltered in search and calibration. Human Apply / Discard-Skip choice kept separate.
- Eligibility history from Discard-Skip reviews and tracker statuses now applied in search.
- Daily usage budgets for Adzuna and OpenAI routes (D1 migration 0003). Cross-site requests refused.
- Enforcing Content-Security-Policy and security headers. No inline scripts or handlers.
- PDF.js pinned with Subresource Integrity and eval disabled (CVE-2024-4367).
- Greenhouse escaped HTML decoded. Owner name removed from scripts.
- Offline QA preview: loopback only, outbound network blocked.
- New `src/` layout, single release version, deterministic build, LF line endings, legacy engines isolated.
- `npm test` covers build, syntax/CSP, unit, legacy and browser suites. `npm run validate` added.

## 34 — 2026-10-28 (engine 5.5.1-r5)

Selective adoption of reviewed reliability patches (PR #5). See `docs/history/V34_SELECTIVE_REVIEW_PATCHES.md`. Earlier releases: `docs/history/`.
