# ESCO Skill Expansion V1

## Scope

Career Radar uses a small offline English-language ESCO v1.2.0 snapshot. The selected labels and URIs were verified against the European Commission ESCO API on 27 October 2026. There is no runtime ESCO dependency and no CV text is sent to ESCO.

The first snapshot contains nine relevant skills and three occupations covering training organisation, training evaluation, training-needs analysis, records management, operational reporting, scheduling, event coordination, stakeholder engagement and project-progress documentation.

## Evidence boundary

ESCO provides vocabulary and occupational relationships, not evidence about a person.

- A synonym can map wording in an already confirmed CV passage to a canonical concept.
- A related occupation can expand vacancy discovery.
- Neither operation creates a candidate claim, changes responsibility scope, or marks a requirement demonstrated.
- Every retained capability still requires an exact verified CV passage and explicit human confirmation.
- Management, education-specific and other ambiguous occupation mappings remain search-ineligible pending manual review.

In particular, ESCO lists “training and development coordinator” as an alternative hit under “corporate training manager”. Career Radar deliberately does not use that relationship for discovery or infer management responsibility from it.

## Provenance

- Classification: ESCO v1.2.0, English
- API: `https://ec.europa.eu/esco/api`
- Snapshot module: `worker/esco-expansion.mjs`
- Profile dictionary version: `cr-profile-esco-1`

