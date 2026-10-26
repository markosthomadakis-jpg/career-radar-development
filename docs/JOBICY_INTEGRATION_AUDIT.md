# Jobicy Remote Source V1 integration audit

Date: 26 October 2026. Local development branch only; not deployed or merged to `main`.

The integration is additive: it introduces a provider registry, Jobicy adapter, conservative normalization and filtering, Remote Jobs UI, two read-only Worker routes, and offline reliability tests. Existing Adzuna, CV matching, calibration, AI, and root routes remain in place.

The original GitHub V13 snapshot was superseded by the actual deployed Sites version 29 source at commit `d9c1ed148302443ce09b74dfe6370d4bb42e4fb6`. This reconciliation branch starts from that exact live source, including V5.5.1, structured vacancy input, professional profile, feedback-cycle and reliability work. The Jobicy changes were then applied additively, retaining both `normalizeAdzunaJob` and the new `createRegistry` integration.

The live Sites and GitHub histories are unrelated. No claim is made that GitHub `main` represents the deployed source; this branch is the reconciled candidate and remains local until owner approval.

No CV text or API secret is sent to Jobicy. Only provider name, optional search tag, cursor, and count are transmitted. Provider summaries are marked as incomplete and are not scored as full employer adverts.

Live Jobicy connectivity and browser results must be reported separately from offline fixture results. Adzuna live calls remain prohibited by the repository instructions unless the owner separately approves using quota.
