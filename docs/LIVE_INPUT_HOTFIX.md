# 5.4.2 — real-input defects corrected

The owner supplied rendered search results, revealing that provider summaries were being scored as full descriptions. 14 new regression cases were written using fictional evidence and synthetic descriptions only. Eight initially failed. All now pass along with the original 45 tests (59 total). The owner's CV was not used for scoring or stored in fixtures.

Fixes: summary provenance preserved by provider normalizer; no fit score on summaries; explicit full-original-text confirmation for manual assessment; noun headings/general self-descriptions no longer demonstrated evidence; management-team support no longer a line-management requirement; week-range and temporary-contract parsing; research-participation exclusion; salary-estimate uncertainty; six-month contract gate applied to live matching.

Browser: five mocked search cases; summaries unscored, short contract and research-panel cases skipped; Assess full advert opens the correct selected case; unconfirmed pasted text unscored; confirmed full synthetic text scored; no application console errors. No paid API call or personal-CV scoring was performed.

Limits: full advert retrieval is not automatic. The user supplies and confirms the original text. Possible cross-agency duplicates are not silently merged without evidence. These fixes establish tested behavior, not calibrated personal-fit accuracy.
