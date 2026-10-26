# V5.5.1-r4 quotation recovery

The user's screenshot showed all 20 AI findings unverified, not a failed button handler. The exact reason cannot be determined from a screenshot of labels alone. Literal matching previously rejected typography or whitespace changes; paraphrases also remain possible.

Quotation resolution now tolerates only whitespace, casing, Unicode compatibility typography, curly quotes and dash variations. It returns the exact source span, retaining original AI wording and source offsets. It does not use semantic/fuzzy matching or certify a paraphrase. Existing saved profiles are rechecked locally when the original CV SHA-256 matches, preserving human choices and original response provenance. Changed evidence invalidates the confirmed profile hash until reconfirmed.

Unmatched findings offer a supporting-source field and Verify and link CV passage button. The entered text must resolve to the source CV; the original AI evidence is retained, the source is marked user_linked_source and human review returns to pending. Full confirmation remains blocked for retained unverified findings. No additional API request is necessary.

Validation: 179 offline tests plus Cloud Browser synthetic flow repairing two unmatched findings, confirming all rows, and transferring the confirmed profile to Live. No user CV or paid API calls were used.
