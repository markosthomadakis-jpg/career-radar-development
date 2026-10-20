# Career Radar V5.2 — Evidence-weighted matching pilot

## Purpose and non-goals

This is an auditable prioritisation aid, not an ATS simulator, hiring decision,
or an estimate of interview/offer probability. It never infers unpublished
employer preferences as established facts. V5.2 performs all calculations in
the owner's browser using local CV text and job descriptions. It makes **zero
OpenAI calls** and does not transmit CV content for scoring.

## Inputs

- Local CV text, reviewed by the owner (not necessarily the V5.1 AI profile).
- Current Adzuna description or manually pasted vacancy.
- User hard preferences: minimum annual salary and minimum FTC months.

## Model

The 14-category skills pilot is explicitly hand curated and *not* an imported
or complete ESCO/O*NET taxonomy. Each recognized advertised requirement is
classified by its own wording as essential (weight 3), important (2), or
desirable (1). Duplicate mentions of a category do not increase its weight.

Candidate evidence is 1.0 when an action verb and scale/context are present,
0.85 for an action without scale, 0.35 for a bare mention, and unknown when no
evidence is found. The quoted source line is retained for user review.

`demonstrated_fit = round(100 * sum(weight * evidence_strength) / sum(weight))`

This score measures supported *coverage of published, classifiable criteria*.
Unknown evidence contributes zero to demonstrated coverage but is labelled
**unknown**, not absent skill or proven failure. If no classifiable requirement
exists, fit is null, not zero. The heuristic does not measure proficiency,
true job competence, or a statistical probability.

Known salary below the user floor blocks an unconditional apply recommendation.
Unknown salary, duration, and mandatory credentials remain unverified rather
than auto-failing. Confidence is separately assessed from description length
and number of identifiable requirements, and never exceeds Moderate in this
pilot because employer-specific private criteria remain unknown.

## Known limitations

1. Pattern matching still misses paraphrases, inflections and implicit duties.
2. A strong CV statement is not independently verified work performance.
3. Requirements appearing in headings can be misclassified without paragraph
   structure; negations can be ambiguous.
4. Mandatory credentials, immigration/work rights and commute time are not
   verified automatically.
5. No employer history, reviews, interview feedback or outcome-calibrated
   probabilities are present.
6. The initial weights are assumptions and must not be represented as learned
   from historical application results.

## Evaluation gates before wider activation

- Unit/regression tests for omissions, negations, bare keywords, essential vs
  desirable, hard constraints and incomplete postings.
- Blind manual rating of a diverse real-vacancy holdout sample with defined
  rubric, then compare requirement extraction and recommendation agreement.
- Error analysis per occupation family and advertisement completeness.
- Only after a sufficient representative sample of observed outcomes, explore
  probability calibration separately; never use an outcome from one applicant
  or a rejection without context as an automatic negative training label.
- Preserve a versioned scoring rubric so score changes can be audited.

## Next step

Collect 20–30 actual Adzuna job descriptions across target role families,
hand-label requirement importance and evidence, and compare V4 vs V5.2
rankings before changing weights or adding employer intelligence sources.
