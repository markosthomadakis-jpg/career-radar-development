# Unified Vacancy Model V1

Every vacancy adapter returns `vacancy.v1` before filtering, matching or display.

## Core identity and provenance

- `id`: provider-scoped record ID, for example `jobicy:12345`
- `canonical_key`: cross-provider fingerprint derived from normalised employer + title + location
- `provider`, `source_id`, `source_url`
- `sources[]`: every provider record merged into the vacancy
- `source_reliability`: transparent classification with `level`, `score`, `kind` and human-readable `reason`

## Common vacancy fields

`title`, `company`, `location`, `description`, `description_kind`, `full_description`, `posted_at`, `closing_date`, `salary_min`, `salary_max`, `salary_currency`, `salary_period`, `contract_type`, `job_type`, `remote_mode`, `uk_eligibility`, and `status`.

## Reliability policy

Reliability describes the provenance of the listing, not the quality of the employer or the candidate's chance of success.

- **High (0.95):** a direct public Greenhouse, Ashby or Lever employer board.
- **Medium (0.70):** Adzuna aggregator result; verify against the original employer advert.
- **Medium (0.65):** Jobicy remote-jobs feed; employer status may be unverified.
- **Unknown:** a provider not yet classified.

The score is deterministic product metadata. It must never change fit scores or become a hiring probability.

## Deduplication policy

1. Match normalised employer, title and location across all adapters. Legal suffixes and `&`/`and` differences are ignored.
2. Keep vacancies in different locations separate.
3. Preserve all contributing records in `sources[]`.
4. Select the highest-reliability, full-description, richest record as the displayed primary record.
5. Fill missing structured fields from the secondary records without overwriting known primary facts.

ATS employer display names retain explicit provenance: `provider_supplied` when the platform supplies the name, otherwise `user_supplied`. The verified platform and board identifier remain separate. Source reliability describes the listing source and never silently verifies a user-entered employer label.

