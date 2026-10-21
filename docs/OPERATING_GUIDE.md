# Career Radar: controlled daily use

Use Evidence matching to review your evidence profile, then Live vacancies for real source listings. The landing dashboard contains clearly marked illustrative demo cards; those are not current vacancies or engine outputs. Fit Calibration provides the full requirement/evidence table with its own visible salary and contract controls. Set these controls before evaluating a role.

Apply, Apply with tailoring, Investigate, Not assessable and Skip are advisory triage. Missing statements are unknown, not inability. You make the final Apply / Skip / Investigate choice. These buttons record a browser-local review only; no application is sent. Review records do not automatically retrain the engine. Use the original source link to verify availability and requirements before applying.

Unknown or small employers receive no penalty. Employer research scoring is disabled. Personal-profile fine tuning, two-track commute automation and expanded research are later work. Both search and calibration must use the intended salary/contract settings; there is no automatic London/local preference migration in this release.

Development runs `npm test` (45 tests), `npm run simulate` (22-source synthetic run), and `npm run build`. `npm run dev` is a local mocked QA server: it does not call Adzuna/OpenAI and is not the production server. Hosting uses the built Worker in dist/server/index.js.

The deterministic core does not send CV text to an external model. The inherited Semantic AI tab is a separate opt-in workflow and may require paid API consent/configuration; it was not exercised by this release. Personal data stays outside tests.
