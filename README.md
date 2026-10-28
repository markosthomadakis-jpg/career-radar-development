# Career Radar

A UK career-intelligence app that helps a jobseeker decide which real vacancies are worth applying for, and why. It separates demonstrated evidence from assumptions, treats missing information as unknown, and never applies or contacts employers on the user's behalf. Scores are evidenced requirement coverage, not hiring probabilities.

**Release 35.0.0** · engine rules 5.5.1-r5 · © 2026 Markos Thomadakis, all rights reserved (see `LICENSE`).

## Quick start

```
npm ci
npx playwright install chromium
npm test            # build, syntax/CSP check, unit, legacy and browser tests (offline)
npm run dev         # offline QA preview on http://127.0.0.1:4173 (synthetic data, no network)
npm run validate    # deterministic validation report in reports/
```

Requires Node.js 22 or later. Tests use synthetic data and mocked providers only. They never call Adzuna, OpenAI or any live service.

## Documentation

- `docs/ARCHITECTURE.md`: layout, URL map, API, security, data and configuration
- `docs/OPERATING_GUIDE.md`: how to use the app day to day
- `docs/RELEASE_V35.md`: what V35 changed, verification and open decisions
- `AGENTS.md`: rules and task list for implementing engineers
- `CHANGELOG.md`; `docs/history/` for earlier release notes
