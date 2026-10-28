# Career Radar — architecture (Release 35.0.0)

Career Radar helps a UK jobseeker decide which real vacancies are worth applying for, and why. It advises; it never applies or contacts an employer. Scores are evidenced requirement coverage, never hiring probabilities.

## Source layout

```
src/
  version.mjs                 Release identity (single source: RELEASE = 35.0.0)
  engine/                     Evidence engine: pure, deterministic, no network/clock/storage
    evaluate.mjs              evaluate({profile, vacancy, preferences, evaluationDate, history})
    history.mjs               stored reviews/tracker -> eligibility history
    browser-adapter.mjs       supplies today's Europe/London date for the browser
    intelligence.mjs          sourced employer context (never changes score or decision)
    employer-context-data.mjs dated official-source employer notes
    feedback-cycle.mjs        human review records and period summaries
  profile/                    CV structuring and confirmed professional profile
    structured-cv.mjs  professional-profile.mjs  esco-expansion.mjs
  vacancies/                  Vacancy sources and the unified vacancy model
    unified-search.mjs  adzuna-input.mjs  shortlist.mjs
    sources/  ats.mjs (Greenhouse/Ashby/Lever)  jobicy.mjs  rss.mjs  registry.mjs  normalization.mjs
  server/                     Worker (runs on the host)
    worker.mjs                createWorker(assets): static files + JSON API
    security.mjs              security headers and Content-Security-Policy
    usage-budget.mjs          durable daily caps for cost-bearing routes
  web/                        Browser application (site root)
    index.html  app.js  clients/{matching,semantic,calibration,remote,watchlist,shortlist,live-search,a11y-labels}.js
legacy/engines/               Superseded engines (V4/V5.2 model, V5.3) kept only for historical comparison tests
tests/unit/  tests/legacy/  tests/e2e/  tests/helpers/
scripts/                      build, check-syntax, simulate, validate, manifest, smoke scripts (owner-approved live checks only)
fixtures/  reports/  drizzle/ (D1 migrations)  docs/ (current)  docs/history/ (per-release notes up to V34)
```

There is exactly one scoring implementation: `src/engine/evaluate.mjs`. The browser, the tests, `simulate` and `validate` all import it. The legacy engines are not served and not bundled.

## Served URL map

The browser URL mirrors the source path, with `src/web/` as the site root:

| URL | Source |
|---|---|
| `/` | `src/web/index.html` (release stamped at build) |
| `/app.js`, `/clients/*.js` | `src/web/…` (classic scripts) |
| `/engine/*.mjs`, `/profile/*.mjs` | `src/engine/…`, `src/profile/…` (ES modules) |
| `/vacancies/unified-search.mjs`, `/vacancies/shortlist.mjs` | `src/vacancies/…` |
| `/api/*` | `src/server/worker.mjs` |

Relative imports between modules therefore resolve identically in Node and in the browser.

## Build

`npm run build` (scripts/build.mjs) is deterministic and does no string splicing of code:

- `dist/server/static-assets.mjs` — generated map of every browser-served file, embedded with `JSON.stringify` only;
- `dist/server/app/` — server modules copied byte-for-byte from `src/`;
- `dist/server/index.js` — entry: `createWorker(assets)`;
- `dist/index.html`, `dist/drizzle/`, `dist/.openai/hosting.json`.

`npm run check` parses every shipped script and fails if the page contains any inline script or inline event handler.

## API

| Route | Cost | Guards |
|---|---|---|
| `GET /api/jobs` (Adzuna) | paid quota | cross-site refused; daily budget `ADZUNA_DAILY_LIMIT` (default 100) |
| `POST /api/ai/match`, `/api/ai/profile`, `/api/ai/professional-profile` (OpenAI) | paid | same-origin; explicit consent; `AI_BILLING_APPROVED` / `AI_PROFILE_APPROVED`; daily budget `AI_DAILY_LIMIT` (default 10); contact details redacted |
| `POST /api/ai/profile-once`, `/api/ai/test-once` | paid, one-time | same-origin; consent; single-use D1 budget row |
| `GET /api/sources/remote`, `/api/sources/remote/status` (Jobicy) | free | cross-site refused; 1 h cache |
| `GET /api/watchlist/jobs` (ATS boards) | free | cross-site refused; fixed official hosts; validated board id |
| `GET /api/ai/status`, `/api/version` | none | — |

Budgets are claimed atomically in D1 (`drizzle/0003_usage_budget.sql`) before the external call, per Europe/London day, and fail closed when the database is unavailable. **There is no user authentication in this release**; access control relies on the host's owner-only setting. Accounts are out of scope for V35.

## Security

- CSP on every HTML response: `script-src 'self' https://cdnjs.cloudflare.com` (no inline script), `object-src 'none'`, `frame-ancestors 'none'`, `base-uri 'none'`. `CSP_MODE=report-only` switches to report-only if the host injects scripts.
- `nosniff`, `X-Frame-Options: DENY`, `Referrer-Policy`, `Permissions-Policy`, `Cross-Origin-Opener-Policy` on all responses.
- PDF.js 3.11.174 is loaded with Subresource Integrity (hash verified against npm `pdfjs-dist@3.11.174`) and `isEvalSupported:false` (CVE-2024-4367).
- DOM output is escaped; generated controls use `data-*` attributes and delegated listeners, never values interpolated into JavaScript.

## Data

CV text and the confirmed profile stay in the browser (`localStorage`). They are sent to OpenAI only on an explicit, per-use consent action and only when the owner has enabled billing. Vacancy providers never receive CV data.

Browser storage keys (unchanged since earlier releases, so existing data keeps working): `career-radar-v1` (settings, tracker), `career-radar-v4-profile` (CV text), `career-radar-structured-profile-v1`, `career-radar-professional-profile-v1`, `career-radar-human-reviews-v1`, `career-radar-review-ledger-v1`, `career-radar-employer-watchlist-v1`.

## Versions

| Identifier | Value | Changes when |
|---|---|---|
| Release | 35.0.0 (`src/version.mjs`, `package.json`) | every delivered release |
| Engine rules | 5.5.1-r5 (`ENGINE_VERSION`) | scoring or decision rules change; stamped on saved assessments |
| Storage keys | see above | never silently; migrations must be explicit |

## Configuration (environment)

`ADZUNA_APP_ID`, `ADZUNA_APP_KEY`, `ADZUNA_DAILY_LIMIT`, `OPENAI_API_KEY`, `OPENAI_MODEL`, `AI_BILLING_APPROVED`, `AI_PROFILE_APPROVED`, `AI_DAILY_LIMIT`, `REDACT_NAMES`, `CSP_MODE`, D1 binding `DB`. Secrets live only in the host environment.
