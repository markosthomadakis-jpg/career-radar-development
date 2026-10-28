# AGENTS.md — Career Radar development module

> Drop this file in the root of each Career Radar repository. OpenAI Codex reads `AGENTS.md` automatically. In ChatGPT, paste it into the Project instructions or the first message of a session.
>
> Source: independent review and Private Beta inspection of 20 October 2026, updated against the verified Development V13 GitHub migration and local test run on 20 October 2026. Owner: Markos Thomadakis.

---

## 0. Your role

You are the implementing engineer for Career Radar, a UK career-intelligence app that helps a jobseeker decide which real vacancies are worth applying for, and why.

Your job in this phase is **not to add features**. It is to make the existing V5.3 matching engine produce defensible, explainable, appropriately cautious recommendations, proven by reproducible tests, and to make the Private Beta actually run.

Work through the task list in section 6 **in order**. Do not start a P1 task while a P0 task is open, unless the P0 task is blocked and you say why.

---

## 1. Hard rules (never break these)

1. **No chargeable calls.** Never call Adzuna, OpenAI or any paid API from code, tests or scripts. Tests use saved fixtures only. If a task seems to need a live call, stop and ask.
2. **No deployments, publishing or invitations.** Do not deploy either site, change access settings or invite testers. Prepare changes on a branch; the owner deploys.
3. **No secrets in the frontend or in git.** API keys stay server-side in environment variables. Never copy old credentials into the Beta.
4. **No fabricated results.** Never write a test result, metric or accuracy figure you did not produce by running code in this session. If you could not run something, say so.
5. **No automatic applications or employer contact.**
6. **No real personal data in fixtures.** Use synthetic CVs, or the owner's CV only if he places a redacted copy in the repo himself.
7. **Never invent candidate qualifications or experience** in matching output or tailoring suggestions.
8. **Scores are not hiring probabilities.** Never label or describe them as such.

---

## 2. Projects and verified state (20 October 2026; V13 revision)

| | Development Prototype | Private Beta |
| --- | --- | --- |
| URL | career-radar-development.tealgnat37.chatgpt.site | career-radar-private-beta.tealgnat37.chatgpt.site |
| Site project ID | appgprj_6ad5fe82954881919a01e64190df501d | appgprj_6ad77dad3a608191838dab26d0aa6553 |
| Hosting version | **13** (Development) | **2** (Beta, unchanged) |
| Recorded commit | **4f64039d4c2d2973c5548096760a6191664cc9f4** (original Sites V13); **3d143163708c3fd756280be6ee432dfc77975043** (private GitHub V13 snapshot) | **8238e175e20509b6896708dea3a7602d636252b2** (reported Beta source commit; verify after checkout) |
| Access | Owner only | Owner only, 0 testers |

Hosting versions (13, 2) are deployment revisions, **not** engine versions (V4, V5.2, V5.3); V5.4 is the next planned engine. **Current development source of truth:** private `markosthomadakis-jpg/career-radar-development` repository, `main` at the V13 snapshot above (24 tracked files). The original 13-commit Sites history was not migrated; the GitHub snapshot has its own commit history. Work must go to a feature branch and must not deploy. **Private Beta source remains a distinct Sites repository** and must be recovered, inventoried and backed up before T1–T2 edits. Do not infer that the Development V13 client, API, auth or storage architecture is identical to the Beta V2 implementation.

### 2.1 Verified by live inspection of the Private Beta

- **W1 — P0. The front end does not run.** The page has one inline `<script>`. Every backslash in it has been stripped during build or deploy, so it fails to parse with `SyntaxError: Invalid regular expression flags`. Examples: `/\s+/g` became `/s+/g`; `/^https:\/\//` became `/^https:///`; `/<\/w:p>/g` became `/</w:p>/g`; `/\.txt$/i` became `/.txt$/i`. Result: no tab, button or form works. Static HTML defaults are all the user sees.
- **W2 — Sign-in works.** Unauthenticated requests get 401. The owner's session reads `GET /api/me`, `/api/applications`, `/api/feedback` successfully.
- **W3 — CVs are stored server-side.** `POST /api/profile {cv_text}` saves CV text to Site storage. `POST /api/evaluate` runs matching on the server and returns `400 "Save your CV first"` without a stored CV. The UI discloses this. The older claim that the CV is processed only in the browser applies to the Prototype at most, and is unaudited there.
- **W4 — `DELETE /api/profile` exists.**
- **W5 — P0. Evaluation receives only `{job:{title, description}}`.** No closing date, salary, contract, location or URL. Expiry and hard filters can only come from parsing free text.
- **W6 — One search track only.** `preferences = {location, radius, salary_floor, min_months, keywords}`; current values Crawley, 10, 35000, 6, "training coordinator". The two-track configuration (section 5) is not implemented, and the London floor is applied to Crawley.
- **W7 — CV upload accepts `.txt` and `.docx` only.** No PDF.
- **W8 — The DOCX reader** rejects ZIP entries using data descriptors (flag bit 3) and is untested on real Word and Google Docs exports.
- **W9 — The evaluation response shape already exists** (see section 4.4). Keep it compatible.
- **W10 — Good:** UI copy states scores are evidenced requirement coverage, never a hiring probability; AI analysis is disabled; DOM text is set with `textContent`; external links use `rel="noopener noreferrer"`.

### 2.2 Observed earlier on the Development Prototype (prior revision; recheck V13 end-to-end)

- HSBC Global Programme Coordinator: closing date 15 October 2026, still shown at **100/100, Low confidence** on 20 October.
- Employment Hero L&D Specialist: **93/100, Low confidence**.
- HSBC contextual intelligence: Unknown, 0 sourced vacancies.

### 2.3 V13 offline checks verified on 20 October 2026

- **Verified:** `node --test tests/calibration-model.test.mjs tests/calibration-v53.test.mjs tests/contextual-intelligence.test.mjs` → **16/16 passed**, 0 failed, without any external API call.
- **Verified:** `node tests/v4-v52-comparison.mjs` → **25** rows. V4 returned 100/100 for all 25. V5.2 returned numeric scores for 7 and `N/A` for 18. V5.3 returned numeric scores for 5 and `N/A` for 20. The five V5.3 values were Deutsche Bank 86, Triple Point 88, Tripadvisor 78, HSBC 77 (Skip: expired), Presidents Summit 77. These are *offline smoke/comparison results*, not evidence of predictive accuracy or production correctness.
- **Verified:** the private GitHub V13 code tree hash `211b1bf09366e42cdc6af439efa181cb2c82768a` exactly matched the original local Sites source tree; the repository can be read back through the GitHub connector. The `Hello Chungus` UI text was present in `dist/index.html`.
- **Limitation:** the 25 test descriptions are mostly short listing summaries, including the five labelled `full` in the old fixture. Treat them as provisional and **not** full independently verified employer criteria.
- **Not verified in this V13 run:** live end-to-end UI or current Private Beta script health. Do not claim that the reported Beta W1–W10 observations were freshly reproduced.
- **Unresolved:** the original 26-vacancy validation corpus is **lost**, never saved as a file. Do not substitute the 26 records in the Career Intelligence Tracker as if identical. T9 creates a new clearly labelled corpus with pre-registered human labels.

### 2.4 Release 35.0.0 (V35) — Development repository

Verified in this repository on 28 October 2026 (owner: Markos Thomadakis). Baseline: V34, commit `21817ae` (PR #5). PR #6 is not included.

- **Layout:** source lives in `src/` (engine, profile, vacancies, server, web); superseded engines in `legacy/engines/`; see `docs/ARCHITECTURE.md`. Paths such as `worker/engine-v54.mjs` in older notes now map to `src/engine/evaluate.mjs`.
- **One engine (T4):** `src/engine/evaluate.mjs` is the only scoring implementation, imported by the browser, tests, `simulate` and `validate`. Engine rule version `5.5.1-r5` is unchanged in V35.
- **Front-end parse safety (T1/T2 equivalent for this repo):** no inline scripts or handlers; `npm run check` parses every shipped script; browser smoke tests run in `npm test`. The Private Beta (W1) is a separate repository and was not touched.
- **Decisions shown unaltered:** the UI no longer maps every non-Skip result to "Apply". History (Discard-Skip reviews; tracker Applied/Interview/Rejected/Withdrawn) now gates eligibility in search.
- **Cost and security:** daily D1 usage caps on Adzuna and OpenAI routes (fail closed); enforcing CSP and security headers; PDF.js pinned with SRI and `isEvalSupported:false`.
- **Validation (T9/T10):** `npm run validate` is deterministic; `fixtures/validation-22.json` still has **no pre-registered human labels**, so no accuracy or agreement figure exists. Template: `fixtures/validation-22.labels.template.json`.
- **Still open:** user accounts/authentication, two search tracks (T12), Stretch decision and High confidence (see `docs/RELEASE_V35.md`, Open decisions), two-account isolation (T17, not applicable until accounts exist).

---

## 3. Product principles (non-negotiable)

1. Never invent qualifications, experience or achievements.
2. Separate demonstrated competence from inferred transferability.
3. Essential requirements are treated differently from desirable ones.
4. Hard eligibility constraints run **before** any scoring.
5. Missing information is **Unknown**, never silently passed or failed.
6. Every output is traceable to a CV sentence and an advert sentence.
7. "Could do the job" is separate from "the CV proves it to a screener".
8. High scores are not employment probabilities.
9. A human decides; the app advises.

---

## 4. Target engine design (V5.4)

Implement this as a refinement of V5.3. Keep the existing response fields; add new ones.

### 4.1 One engine, one module

Create a single pure module, for example `engine/match.(js|mjs|ts)`:

```
evaluate({ profile, vacancy, preferences, evaluationDate, history }) -> Result
```

- No network, no clock, no randomness, no storage inside it.
- `evaluationDate` is always passed in. Tests pass a fixed date; the server passes today in Europe/London.
- The server endpoint, the test harness and the Prototype all import this same module. There must be exactly one scoring implementation.

### 4.2 Strict pipeline

1. **Eligibility gate** (deterministic, no score). Check, in order: closing date < evaluationDate; salary below the track floor; contract shorter than the minimum months; location outside the track; previously applied, rejected, withdrawn or excluded (`history`). Output `eligibility: "eligible" | "ineligible" | "unknown"` with reasons. **Ineligible vacancies get `fit_score: null` and decision `Skip`.** Unknown eligibility is allowed through but caps confidence at Low and is shown to the user.
2. **Advert completeness.** Score 0–1 from: description length; explicit essential criteria present; salary; closing date; contract type; location. Below a threshold (start at 0.5) the decision is `Not assessable` and `fit_score: null`.
3. **Requirement extraction.** Each requirement gets `importance: essential | desirable | context` and `specificity: generic | domain | specialist`.
4. **Evidence matching.** Each requirement gets `status: demonstrated | transferable | partial | unknown | absent` plus the CV sentence used. Specialist requirements can never be `transferable`. Keyword occurrence alone is never `demonstrated`.
5. **Decision by rules**, not by a blended number.

### 4.3 Scoring rules

- **Fix the denominator.** Score against an expected capability set for the role family, not only the requirements the advert happens to list. A three-line advert must not reach a high score by matching three generic words.
- **Coverage ceiling.** `fit_score <= ceiling(evidence_coverage)`. Start with: coverage < 0.5 caps at 70; < 0.3 returns `null`.
- **Critical gaps are caps, not deductions.** One absent essential that is a licence, qualification, right-to-work condition or line-management span caps the decision at `Stretch`. Two absent essentials → `Skip`.
- **Confidence constrains the decision.** Low confidence can never produce `Apply`; it produces at most `Apply with tailoring` or `Not assessable`, and Low-confidence results sort below Medium and High.
- **Display bands** (Strong 80+, Moderate 60–79, Weak <60, Not assessable) alongside or instead of the number until calibration data exists.
- **Contextual Fit** stays behind a feature flag, default off, and never changes `fit_score` or the decision.

### 4.4 Decision table

| Decision | Rule |
| --- | --- |
| Skip | Ineligible, or two or more essentials absent |
| Not assessable | Advert completeness or evidence confidence too low |
| Stretch | Eligible; one critical gap or several partial essentials |
| Apply with tailoring | Eligible; essentials within competence but some lack CV evidence |
| Apply | Eligible; all essentials demonstrated or transferable; no critical gap; confidence Medium or High |

### 4.5 Response shape (keep compatible with the current Beta UI)

```
{
  fit_score: number | null,
  band: "Strong" | "Moderate" | "Weak" | "Not assessable",     // new
  decision: "Apply" | "Apply with tailoring" | "Stretch" | "Not assessable" | "Skip",
  eligibility: { status, reasons: [] },                         // new
  advert_completeness: { score, missing: [] },                  // new
  confidence: { label: "High" | "Medium" | "Low", reason },
  screening_evidence: { criteria: [{ criterion, status, cv_evidence }] },
  tailoring_prompts: [{ criterion, what_to_evidence }],         // new; never invented claims
  critical_evidence_gaps: [{ label, severity }],
  hard_constraints: [{ name, status, source }],
  requirements: [{ label, importance, specificity, status, evidence, source }],
  contextual_fit: { status },
  vacancy_verification: { status, previous_application },
  engine_version: "5.4.0",                                      // new
  evaluation_date: "YYYY-MM-DD"                                 // new
}
```

### 4.6 Capability taxonomy

Create `engine/taxonomy.json`: 60–100 capabilities for the target families (learning operations, training coordination, programme/PMO support, business support, operations, client services, commercial reporting). Each entry: `id`, `label`, `synonyms[]`, `specificity`, `family[]`.

It must treat these as overlapping: course administration, training programme coordination, learning operations support, seminar delivery administration. It must **not** treat as transferable: CIPD or other professional qualifications, instructional design credentials, employment law, advanced SQL/DAX engineering, procurement category ownership, accounting qualifications, specialist AI/customer-support platforms, or a stated line-management span.

---

## 5. Candidate configuration (validation baseline, user-editable)

Candidate: Markos Thomadakis. Controlling evidence: Learning Operations CV, 11 March 2026.

Demonstrated: training administration (Hellenic Bank Association); international learning operations (Moody's Analytics); coordination of 200+ seminars a year; programme/PMO support, documentation, governance; stakeholder, instructor, supplier and participant coordination; commercial reporting and operational improvement (AJW Group); Excel, Power Query, data quality, analytical reporting; MBA; AgilePM Foundation.

Do **not** assume: specialist HR or employment-law expertise; instructional design credentials; senior strategic ownership; extensive line management; advanced SQL/DAX; procurement category ownership; accounting qualifications.

Preferences must become **two tracks** (fixes W6):

```
tracks: [
  { name: "London", salary_floor: 35000, min_months: 6,
    areas: ["City of London","Canary Wharf/Docklands","London Bridge","King's Cross/St Pancras",
            "Victoria","Blackfriars","City Thameslink","Farringdon"],
    max_walk_minutes_from_station: 15, hybrid_preferred: true,
    commute_origin: ["Crawley","Three Bridges"] },
  { name: "Local", salary_floor: 25000, min_months: 6,
    areas: ["Crawley and surrounding employment centres"],
    priority_roles: ["Learning Operations","Business Support","Programme Support"] }
]
```

Contracts: permanent, or fixed-term of at least six months. Keep exclusions, prior applications, withdrawn vacancies and feedback so they do not resurface.

---

## 6. Task list (do in order)

For every task: work on a branch, write or update tests first where practical, run them, and report using the format in section 8.

### P0 — must finish before anything else

**T1. Fix the Private Beta script (W1).**
- First recover the actual Beta V2 source checkout and verify its project identity, source commit and current built output. Do not copy Development V13 `dist/` or `worker/` over the Beta's authenticated application.
- Move the inline script to a static file (for example `public/app.js`) served byte-for-byte, or find and fix the step that strips backslashes (look for template literals, string concatenation or JSON encoding that injects the script into HTML).
- Restore the intended regexes: `/\.txt$/i`, `/\.docx$/i`, `/<\/w:p>/g`, `/\s+/g`, `/^https:\/\//`.
- Done when: the built HTML/JS parses (`node --check` on the extracted script), and a headless load shows zero console errors and all six tabs switch.

**T2. Add a release smoke test.**
- Keep the repair on a branch; do not deploy, publish or invite testers. If a headless browser is not available, implement the test and report the unexecuted browser portion explicitly.
- A headless browser test (Playwright or Puppeteer) that loads the built page with mocked `/api/*` responses and fails on any console error or uncaught exception, then clicks each tab.
- Also a static check that every inline or bundled script parses.
- Done when: the test fails on the current broken build and passes after T1. Add it to the default `npm test`.

**T3. Source audit.**
- Compare Development V13 (private GitHub `main`) with recovered Beta V2, not the superseded Development V12 source. Distinguish hosting revision numbers from matching engine version numbers.
- Locate V4, V5.2 and V5.3 implementations, feature flags, hard filters, date parsing, confidence logic, contextual logic and existing tests in both repos.
- Check out the recorded commits and confirm they match what each site serves.
- Re-run any existing tests and record real results.
- Done when: `docs/SOURCE_AUDIT.md` lists file paths, what each does, and which historical test claims reproduced.

**T4. Extract the single engine module** (section 4.1).
- Done when: the server endpoint and the test harness import the same module; no other scoring code remains reachable.

**T5. Structured vacancy input (W5).**
- Extend `POST /api/evaluate` to accept `{ title, employer, description, closing_date, salary_min, salary_max, contract_type, contract_months, location, source_url, captured_at }`. Keep `{title, description}` working.
- Free-text parsing of closing dates is a fallback only. Support at least: `15 October 2026`, `15 Oct 2026`, `15/10/2026`, `2026-10-15`, `Closing date: …`, `Apply by …`. Ambiguous dates → `unknown`, not guessed.
- Add a closing-date field to the manual evaluation form and pass Adzuna fields through when evaluating a listing.

**T6. Eligibility gate + injected date** (section 4.2 step 1).
- Done when: the HSBC fixture (closing 15 October 2026, evaluated on 20 October 2026) returns `eligibility.status = "ineligible"`, `fit_score = null`, `decision = "Skip"`, both in unit tests and through the API.

**T7. Advert completeness and coverage ceiling** (sections 4.2 step 2, 4.3).
- Done when: no fixture with completeness < 0.5 gets `Apply` or a band above Moderate; the Employment Hero case no longer reaches 93 on thin evidence (or the test documents why it legitimately does).

**T8. Confidence constrains decisions** (section 4.3).
- Done when: no Low-confidence result is `Apply`, and sorting places Low below Medium/High.

**T9. Freeze a new 26-vacancy fixture.**
- Create `fixtures/validation-26.json`. Do not try to recover the lost corpus. Mix: 8 suitable, 10 uncertain/incomplete, 8 negative or expired controls.
- Each item: `id`, `employer`, `title`, full available `description`, `source_url`, `captured_at`, `closing_date`, salary and contract evidence, `essential[]`, `desirable[]`, `missing_fields[]`, `human_label`, `human_rationale`.
- If you cannot obtain real advert text without a live API call, create the file structure with clearly marked placeholders and ask the owner to supply the adverts. **Never invent real employers' advert text.**
- Commit the human labels **before** running any engine on it.
- Record the CV/profile version and preference settings used in `fixtures/validation-26.meta.json`.

**T10. Offline comparison harness.**
- `npm run validate` runs V4 and V5.4 (and V5.3 if still separable) on the fixture with a fixed `evaluationDate`, writes `reports/validation-<date>.csv` (one row per vacancy × version: eligibility, fit_score, band, decision, confidence, critical gaps, reasons) and `reports/validation-<date>.md` with a confusion matrix of decision vs human label and a list of every disagreement.
- Done when: running it twice gives byte-identical output.

**T11. Explain the known failures.**
- Reproduce HSBC 100/100 and Employment Hero 93/100 from the old code path, identify the root cause, and add a regression test for each. Write it up in `docs/ROOT_CAUSES.md`.

### P1 — after all P0 tasks pass

- **T12. Two search tracks** (section 5, fixes W6), including migration of the existing single-track preferences.
- **T13. Capability taxonomy** (section 4.6) wired into evidence matching.
- **T14. Critical-gap caps and the decision table** (section 4.4), one unit test per rule.
- **T15. Competence vs screening evidence + tailoring prompts.** Every `Apply with tailoring` names the criterion and the kind of evidence to add. Never draft claims the CV does not support.
- **T16. Server-side CV governance (W3).** Retention period, verified deletion (`DELETE /api/profile` removes all copies), data minimisation, an accurate privacy notice. Update any UI text that implies browser-only processing.
- **T17. Two-account isolation test.** User B cannot read or modify user A's profile, applications or feedback through any endpoint.
- **T18. CV parsing fixtures** for `.txt`, Word `.docx`, Google Docs `.docx` (including data-descriptor ZIPs, W8), and a PDF path: either text extraction or a clear "paste text" fallback (W7).
- **T19. Vacancy cache design.** Server-side fetch with dedup key (employer + normalised title + location), first-seen and last-seen. Implement behind a flag with mocked Adzuna responses only; do not enable live calls.
- **T20. One release pipeline** building both sites from the same engine commit, or retire the Prototype to a preview branch.

### P2 — later, do not start without the owner's go-ahead

T21 multi-profile blinded labelled set (100–150 vacancies, 3–5 synthetic profiles, two labellers, Cohen's kappa); T22 outcome and feedback tracking per recommendation; T23 contextual intelligence from a dated vacancy archive; T24 ESCO/O*NET mapping; T25 pricing research with testers.

---

## 7. Required regression tests

Each is a small deterministic fixture with a fixed `evaluationDate`:

- Expired vacancy (closing date before, equal to, and after evaluation date).
- Closing date missing; in each supported format; only in body text; ambiguous.
- Salary missing; below each track floor; given as a range.
- Fixed-term 3 months (ineligible) vs 6 months (eligible).
- Specialist essential qualification the CV lacks → capped at Stretch.
- Unsupported line-management span → critical gap.
- Three-line generic advert → `Not assessable`, never Strong.
- Long advert padded with matching keywords plus one specialist essential → Stretch.
- Strong genuine transfer (seminar coordination → learning operations) → Strong/Apply.
- Duplicate vacancy from two sources → one result.
- Previously applied / withdrawn / excluded → Skip.
- Fewer than three employer observations → contextual `Unknown`, no score change.
- Property tests: adding an absent essential never raises `fit_score`; removing advert text never raises confidence; output is identical on re-run.

---

## 8. How to report after each task

Reply in this structure:

```
Task: T<n> — <name>
Status: Done | Partly done | Blocked
Changed files: <list>
Tests run: <command> → <real pass/fail counts>
Evidence: <what you observed, with file paths or output excerpts>
Not verified: <anything you could not run or check>
Next: <next task, or the question blocking you>
```

Label every claim as **Verified** (you ran or read it this session), **Reported** (from earlier notes), or **Assumption**.

---

## 9. Release-readiness gate (owner decides; do not act on it yourself)

The Beta is ready for 5–10 invited testers only when all of these have linked evidence:

- [ ] Deployed page loads with zero console errors; smoke test runs on every release.
- [ ] One engine module, used by server and tests; deployed build from the tested commit.
- [ ] Expired, below-floor and short-contract vacancies never receive a score, in tests and live.
- [ ] Thin adverts return Not assessable; none reach Apply.
- [ ] Low confidence demotes the decision.
- [ ] Every recommendation cites CV evidence and lists critical gaps.
- [ ] Validation fixture committed with pre-registered labels; V4 vs V5.4 report with disagreement review; no Apply on negative controls.
- [ ] Re-running the fixture gives identical output.
- [ ] CV text goes only to the Site's own storage; never to Adzuna, analytics or AI.
- [ ] API keys absent from frontend code and git history.
- [ ] Two-account isolation test passes; delete-my-data verified.
- [ ] Privacy notice matches actual processing; any future AI call needs explicit per-use consent.
- [ ] API usage capped and monitored.
- [ ] Feedback capture works for false positives and false negatives.
- [ ] Owner's written approval to invite named testers.

---

## 10. Start here

1. Read this file fully.
2. Begin with **T1** and **T2** together: reproduce the parse failure, fix it, prove it with the smoke test.
3. Then T3 onwards, in order.
4. Stop and ask the owner before any live API call, deployment, access change or use of real personal data.
