# Unified Search V1

## Purpose

The Live vacancies view now runs one search across:

- Adzuna UK search results;
- Jobicy remote listings; and
- Greenhouse, Ashby and Lever boards already saved in Employer Watchlist.

The browser sends only search terms and public board identifiers. CV text is not sent to vacancy providers.

## Result handling

- All returned records use the existing unified vacancy fields.
- Matching canonical vacancies are combined and retain every source record.
- The richer, more reliable record supplies the displayed vacancy details.
- Each result displays its contributing provider names.
- Provider failures are shown as partial-result warnings; successful sources remain usable.
- Individual Remote Jobs and Employer Watchlist views remain available for source-specific checks.

## Safety and verification

Automated tests use synthetic responses only. They verify cross-source deduplication, retained provenance, empty Watchlists, partial provider failure, the combined browser workflow, mobile behaviour and accessibility. They do not call Adzuna, Jobicy, employer boards, OpenAI or any other live provider.
