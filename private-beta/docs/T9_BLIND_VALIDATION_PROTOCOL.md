# T9 — Blind 26-vacancy sourcing and independent labelling protocol

Date opened: 2026-10-21. **Status: SOURCE LEADS ONLY; T9 NOT FROZEN; T10 NOT RUN.**

## What exists and what it means

- `fixtures/t9-source-leads-26.json` contains exactly **26 traced source leads**, extracted from real public job URLs and the owner's pre-existing opportunity tracker. The original lost 26-advert validation set was **not recovered**, and this is explicitly a NEW candidate queue.
- 14/26 have a readable public advert page at the time of review (includes one historical and one expired advert). Other statuses: 2 search-index-only; 1 HTTP 404; 1 HTTP 410; 5 URL inaccessible; 3 not reviewed. These are **source-access categories, NOT human match labels**.
- **0/26** full source descriptions have been archived in the actual `fixtures/validation-26.json` fixture. **0/26** have independent human labels.
- The workbook `CareerRadar_T9_Blind_Validation_Workbook_20261021.xlsx` is an owner's local blind annotation worksheet, not a Git-tracked personal-data store.
- Do **not** copy third-party public job adverts verbatim from the web into the Git repository without suitable rights/permission. Users may provide documents they are entitled to process for a private study.
- Source metadata is fallible, even when a page is readable: some salary/contract fields are marked "tracker" or unavailable. Missing is Unknown, not an assumed positive or negative.

## Step-by-step readiness

1. Verify the actual advertised responsibilities, criteria, salary, contract type/duration, location and closing date for each job. Save permitted full-text snapshots individually with the capture date and URL; flag any missing fields.
2. Deduplicate on employer + role + place + requisition. Preserve a mix of roles from different employers, including genuine strong-fit, ambiguous/incomplete and specialist/expired controls **identified by an independent assessor, not by model scores**.
3. Use the same explicitly specified candidate profile and preferences for both human judgement and engine evaluation. The existing T10 default profile is **synthetic** (seminars, schedules, participant admin, Excel reporting, vendor/stakeholder communication); do not secretly judge a real CV while the engine sees a synthetic one.
4. Before using any model output, a human assessor reads each full advert and fills: eligibility = Eligible/Ineligible/Unknown; decision = Apply / Apply with tailoring / Stretch / Not assessable / Skip; essential evidence gaps; rationale referencing advertised criteria and actual allowed profile evidence; confidence = High/Medium/Low; labeler ID and date.
5. Add a second independent assessor when feasible. Resolve conflicts after both sets are saved; retain disagreements as evidence instead of overwriting the first label.
6. Select and freeze a final **26 complete records** aiming for 8 suitable, 10 uncertain, 8 negative/expired reference cases. These are *sampling targets*, not preassigned labels and cannot be filled based on the model's answer. Record a frozen git commit and SHA-256 of the profile/advert fixture and annotation file **before** any comparative evaluation.
7. Only after freeze, run the offline validation harness and preserve raw per-vacancy V4-simulation / V5.3 / V5.4 outputs and disagreements. Clearly call V4 a simulation, not the original deployed V4 code. Do not claim hiring probability or statistical population accuracy.

## Blocking gate

The existing `npm run validate` exits with **code 2** when source texts or pre-registered human labels are missing. This gate was exercised on the offline V5.4 ZIP on 2026-10-21 and reported:

```text
T9 BLOCKED: 26/26 adverts lack complete real source text and independently pre-registered human labels.
Validation intentionally not run. Do not invent listings or label the output using the engine itself.
VALIDATION_EXIT:2
```

**Do not remove the gate, fabricate human labels or use any paid Adzuna/OpenAI API.**

## Product/release separation

This research source queue is not the Private Beta owner-only launch. The original Beta source checkout and staging auth/CV data isolation/deletion checks remain necessary. Publishing requires separate owner approval.
