# Automated QA V1

`npm run qa` rebuilds the Worker, runs the deterministic Node regression suite, starts the synthetic local preview and runs Playwright in desktop and mobile Chromium.

The browser suite checks that every main view opens without uncaught exceptions or console errors, navigation makes no live or paid API calls, and axe-core reports no serious or critical WCAG 2.0/2.1 A/AA violations in every active view. Synthetic mocked flows exercise Structured CV import, Remote Jobs, Employer Watchlist and Fit Calibration on desktop and mobile.

All browser data is synthetic. The local preview blocks paid AI routes. Failure traces, screenshots, videos and HTML reports are ignored by git.

- `npm run test:unit` — deterministic regression tests
- `npm run test:e2e` — browser and accessibility tests
- `npm test` — both suites
- `npm run qa` — build plus both suites
