# Career Radar — Release 35.0.0 (V35)

**Owner:** Markos Thomadakis · **Baseline:** V34, commit `21817ae` (PR #5, merged 28 October 2026) · **Engine rules:** 5.5.1-r5 (unchanged)

V35 consolidates the owner's work up to V34 into a coherent, hardened release. It adds no new product features. The exact delivered files are fingerprinted in `docs/V35_CONTRIBUTION_MANIFEST.json`.

PR #6 (an unmerged third-party review candidate: UK applicant-geography gate and offline QA preview) is **not** included. It can be rebased onto V35. Its offline-preview change overlaps with V35's own fix in `qa-preview/server.mjs`. Its geography rule should first gain negative tests (see the PR #6 review).

## 1. Corrections

| # | Problem in V34 | V35 change | Proof |
|---|---|---|---|
| 1 | The search list showed every non-Skip result (Not assessable, Investigate, Apply with tailoring) as **"Apply"**. The calibration tab did the same, and a missing engine also defaulted to "Apply". | The engine decision is shown unaltered ("Engine assessment: …"). The human choice is labelled separately as "Your decision: Apply / Discard-Skip". The fallback without an engine is "Not assessable". `applicationDecision()` was removed. | `tests/unit/v35-hardening.test.mjs`, `decision-presentation.test.mjs`, `calibration-ui.test.mjs` |
| 2 | Search passed `history=[]`, so applied, withdrawn or discarded vacancies resurfaced. The code comment claimed the opposite. | New pure `src/engine/history.mjs`: Discard-Skip reviews and tracker Applied/Interview/Rejected/Withdrawn entries become eligibility history, which gives Skip with no score. An "apply" review is an intention, not history. | v35-hardening: history test |
| 3 | PDF.js 3.11.174 was loaded without integrity and with eval enabled (CVE-2024-4367). | Subresource Integrity (sha384, verified byte-for-byte against npm `pdfjs-dist@3.11.174`), `crossorigin`, and `isEvalSupported:false`. | Unit test, plus a browser check: a synthetic PDF CV parsed under the enforcing CSP with zero console errors |
| 4 | No cost cap on Adzuna or OpenAI routes. AI routes relied only on the Origin header. | Durable daily budgets in D1 (`0003_usage_budget.sql`), claimed atomically before any external call, per London day. They fail closed. Cross-site requests are refused. | v35-hardening: budget SQL run on real SQLite; Adzuna 429 after limit with exactly one provider call; AI 429 after limit |
| 5 | No security headers. Inline scripts and inline `onclick`/`onchange` handlers (one interpolated a tracker id into JavaScript). | Enforcing CSP without `unsafe-inline` for scripts, plus `nosniff`, `X-Frame-Options`, `Referrer-Policy`, `Permissions-Policy` and COOP. All inline scripts are moved to files and all handlers replaced by delegated listeners reading `data-*`. | `npm run check`; v35-hardening CSP test; e2e under CSP |
| 6 | Greenhouse adverts kept literal `<p>` markup (entity-escaped HTML). | Unescaped before normalisation. | v35-hardening |
| 7 | The owner's name was hard-coded in `scripts/real-cv-structured-smoke.mjs`. | Read from `REDACT_NAMES`. A guard test keeps names out of source. | v35-hardening |
| 8 | The QA preview listened on all interfaces and could forward Jobicy/ATS requests to live services. | Listens on loopback only. All server-side outbound requests are blocked and remote/board routes return synthetic empty results. | e2e "paid and live APIs are not contacted" |
| 9 | The build spliced code with `String.replace(placeholder, string)`, a latent `$&` corruption of the same class as Beta W1. `dist/index.html` was both source and output. | New deterministic build (`scripts/build.mjs`): `JSON.stringify` only, a clean `dist/`, and a source page in `src/web/`. CI checks that the committed `dist/` matches the source. | v35-hardening: deterministic build |
| 10 | 16 legacy tests were outside `npm test`. | `npm test` = build + syntax/CSP check + unit + legacy + browser. | — |
| 11 | Committed reports carried an old engine stamp. | Regenerated. `npm run validate` added (AGENTS T10 harness). | Byte-identical re-run |

## 2. Structure and naming

| Before (V34) | V35 |
|---|---|
| `worker/engine-v54.mjs` (engine version 5.5.1-r5) | `src/engine/evaluate.mjs`, exporting `ENGINE_VERSION` |
| `worker/calibration-v54.mjs` exporting `evaluateV53` | `src/engine/browser-adapter.mjs` exporting `evaluateForToday` |
| `worker/intelligence-v1.mjs`, `feedback-cycle.mjs`, `employer-context-data.mjs` | `src/engine/…` |
| `worker/structured-cv.mjs`, `professional-profile.mjs`, `esco-expansion.mjs` | `src/profile/…` |
| `worker/unified-search.mjs`, `vacancy-input.mjs`, `shortlist.mjs`, `sources/` | `src/vacancies/…` (`vacancy-input` → `adzuna-input`) |
| `worker/index.js` with 20 literal placeholders and runtime HTML patching | `src/server/worker.mjs` with `createWorker(assets)`, plus `security.mjs` and `usage-budget.mjs` |
| `worker/*-client.js` and three inline scripts | `src/web/app.js`, `src/web/clients/*.js` |
| `worker/calibration-model.mjs`, `calibration-v53.mjs` (bundled but never served) | `legacy/engines/`, not bundled |
| `scripts/build-v3.mjs` ("V3 Worker built"), root `simulate.mjs` | `scripts/build.mjs`, `scripts/simulate.mjs` |
| `tests/reliability/simple-551…`, `review-v55…`, `integration-fixes-v551…` | `tests/unit/decision-presentation…`, `evaluation-review…`, `integration-fixes…` |
| Release version only in file names (V34) | `src/version.mjs` and `package.json` = 35.0.0. Engine rules are versioned separately. |
| CRLF line endings, no `.gitattributes` | LF everywhere; `.gitattributes` |
| 16 per-version notes in `docs/` | `docs/history/`. Current docs: `ARCHITECTURE.md`, `OPERATING_GUIDE.md`, this file |

Served URLs mirror source paths (for example `/engine/evaluate.mjs`). Browser storage keys are **unchanged**, so existing local data keeps working.

## 3. Verification (run 28 October 2026, offline, synthetic data only)

- `npm test`: build; syntax/CSP check (53 script files); **236/236** unit; **16/16** legacy; **14 passed / 2 skipped** browser checks (desktop and mobile; the two skipped need an owner-supplied redacted CV).
- `npm run simulate` and `npm run validate`: deterministic. 22 adverts → Investigate 18, Not assessable 2, Skip 2. Zero Skip with a score, zero Low-confidence Apply.
- Browser check under the enforcing CSP: all views opened, a synthetic PDF CV parsed through the pinned PDF.js, zero console errors or CSP violations.
- No Adzuna, OpenAI or other live provider was called. No real CV was used. Nothing was deployed.

Not verified: behaviour on the hosting platform (CSP interaction with any host-injected script; `CSP_MODE=report-only` exists for that); the D1 migration on the hosted database; the two real-CV browser cases.

## 4. Deployment notes for the owner

1. Apply migration `0003_usage_budget.sql` before deploying the new worker. Without it, Adzuna and AI routes refuse requests: they fail closed.
2. Optional limits: `ADZUNA_DAILY_LIMIT` (default 100) and `AI_DAILY_LIMIT` (default 10). Set `0` to disable a route.
3. If the hosted page reports CSP violations from the host itself, set `CSP_MODE=report-only`, inspect, and then restore enforcement.

## 5. Open decisions (owner)

These are deliberately unchanged in V35 because they change product behaviour:

- **Accuracy evidence:** `fixtures/validation-22.json` has no pre-registered human labels, so no accuracy or agreement figure exists. Fill in `fixtures/validation-22.labels.template.json` before looking at engine output.
- **Decision vocabulary:** the engine uses Investigate where AGENTS.md specifies Stretch, and never emits High confidence.
- **Score ceiling:** a long, repetitive advert can reach 100/Strong on a short CV. The decision stays cautious (Low confidence), but the number has no evidence-coverage ceiling (AGENTS §4.3 "fix the denominator").
- **Two search tracks** (London / Local, AGENTS §5, T12): not implemented. There is one salary floor, and location is not checked against approved areas.
- **Accounts:** no authentication. Access relies on the host's owner-only setting. Accounts, durable CV storage and payments need the governance agreed first.
