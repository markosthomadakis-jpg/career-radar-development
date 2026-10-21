# Career Radar: controlled daily use

Use Evidence matching to review your evidence profile, then Live vacancies for real source listings. The landing dashboard contains clearly marked illustrative demo cards; those are not current vacancies or engine outputs. Fit Calibration provides the full requirement/evidence table with its own visible salary and contract controls. Set these controls before evaluating a role.

Apply, Apply with tailoring, Investigate, Not assessable and Skip are advisory triage. Missing statements are unknown, not inability. You make the final Apply / Skip / Investigate choice. These buttons record a browser-local review only; no application is sent. Review records do not automatically retrain the engine. Use the original source link to verify availability and requirements before applying.

Unknown or small employers receive no penalty. Limited intelligence is enabled by default in Fit Calibration and can be switched off per evaluation. It provides dated official-source employer descriptions (initially Elysium Healthcare and gategroup), questions triggered by advert text, and up to three distinct sourced comparisons from the latest search. It does not run automatic web searches, assess employer quality, or change fit scores/recommendations. Unknown employers receive no penalty. Source links, dates, excerpts and SHA-256 fingerprints are available in provenance details. Provider summaries remain labelled summaries. Personal-profile fine tuning, two-track commute automation and broader research coverage are later work. Both search and calibration must use the intended salary/contract settings; there is no automatic London/local preference migration in this release.

Development runs `npm test`, `npm run simulate` (22-source synthetic run), and `npm run build`. `npm run dev` is a local mocked QA server: it does not call Adzuna/OpenAI and is not the production server. Hosting uses the built Worker in dist/server/index.js.

The deterministic core does not send CV text to an external model. The inherited Semantic AI tab is a separate opt-in workflow and may require paid API consent/configuration; it was not exercised by this release. Personal data stays outside tests.

## Search-summary correction (5.4.2)

Adzuna search excerpts are explicitly marked summaries and receive no numeric fit score. Use Original listing to verify the vacancy. Assess full advert opens Fit Calibration and carries the selected title/source and your current search salary floor. Paste the full original text including criteria, check the completeness box, then Evaluate evidence. This is an explicit user attestation, not automatic source certification.

Headline/self-description CV lines are not demonstrated work evidence. Supporting a management team does not establish line management. A temporary 3–4 week initial contract does not meet the six-month floor, regardless of a possible extension. Research-panel participation listings are excluded from employment triage. Indexed salary ranges and estimated flags must be checked against original pay/hours; estimates cannot prove eligibility.

## Decision clarity (5.4.5)

An unknown configured contract-duration, salary or location check now produces Investigate before an application recommendation. A missing closing date alone keeps confidence Low and adds a source-verification action. Insufficient advert evidence still takes precedence as Not assessable; blocked eligibility remains Skip. Expected role-family categories are named and explicitly described as extraction-coverage checks, not candidate deficits or invented published essentials. Tailoring examples cite only existing profile evidence and the matching advert duty. Limited intelligence needs no extra action: leave Include limited intelligence checked, supply the original advert and employer, and Evaluate evidence. An optional original vacancy URL provides a link for a manually pasted advert. The old duplicate Priority and disabled contextual-score panels have been replaced by the explanatory intelligence section.

## Source accounting (5.4.6)

Fit Calibration retains unknown published duties and criteria as manual-review entries rather than dropping them because they are outside the capability catalogue. HTML list boundaries and common duties, candidate-criteria, benefits and employer/location headings are recognised. Mixed training-benefit text retains stated candidate skills while excluding the benefit as course-administration evidence. Qualification conditions retain grades, subjects and equivalence wording. Manual items remain unknown: they are not automatically classified as absent, inferred credentials, line management or specialist ownership.

Use Requirement extraction coverage and its expandable source-unit table to inspect how each supplied passage was treated, including exclusions and unresolved context. Repeated category occurrences retain all source references without multiplying the same manual-facet weight. Counts describe source accounting, not guaranteed semantic completeness. Generic overlap can no longer hide the newly retained manual conditions; many vacancies will therefore be Not assessable until their requirements can be checked. This release improves extraction transparency; it does not add automatic evidence matching for the retained manual categories.
