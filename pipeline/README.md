# Vivaad Radar — offline pipeline

Everything here runs **before** the demo. Nothing in this package may be
imported by request-time code (PRD §36, §48, §49).

```
python pipeline/run_all.py          # full build, ~1.3s
python pipeline/run_all.py --skip-handoff   # rebuild without regenerating data/input
python -m pytest tests/ -q          # golden-case acceptance test
```

Dependency direction is one-way and never reversed:
`pipeline → vivaad.db → backend → frontend`.

## Stages

| Stage | Does | Writes |
|---|---|---|
| s0_handoff | Builds the data contract from the extracted HC corpus | `data/input/{cases,parcels}.parquet` |
| s1_ingest | Validates contract, provenance, flagship rows. **Raises on any violation** | `cases.json`, `parcels.json` |
| s2_normalize | Survey-no + name normalization, village gazetteer | `normalized.json` |
| s3_candidates | Village blocking; district fallback flagged `location_unconfirmed` | `candidates.json` |
| s4_score | §27 features, §28 bands, per-pair evidence JSON | `links.json` |
| s5_status | §30 status engine, worst-case wins | `parcel_status.json` |
| s6_load_db | Eight §19 tables | `data/output/vivaad.db` |
| s7_export_fallback | Every §37 endpoint response + flagship payloads | `data/output/fallback/` |

Intermediates land in `data/intermediate/` (gitignored, regenerable) alongside
one `sN_report.json` per stage — those reports are the numbers for the §53
technical story and the §43 evaluation slide.

## What the backend consumes

`Parcel` carries **derived `status`, `confidence`, `note`, `closed_history`**
columns, so `GET /parcels/{id}/litigation` is a SELECT and a join — no scoring
at query time. `ParcelCaseLink.evidence` is the JSON the methodology panel
renders. `land_events` is JSON on `Parcel` (kept there rather than as a ninth
table, to hold the schema at the contracted eight).

Fallback filenames are URL-shaped so the middleware maps a path to a file with
one replace:

```
GET /parcels/P-B01/litigation  ->  data/output/fallback/parcels/P-B01/litigation.json
GET /dashboard/heatmap         ->  data/output/fallback/dashboard_heatmap.json
GET /cases/UPHC020611812025    ->  data/output/fallback/cases/UPHC020611812025.json
```
`flagship.json` holds the tier-3 payloads to bundle into `api/client.ts`.

## Current build

| | |
|---|---|
| District | Sultanpur |
| Cases / parcels | 38 real cases (8 active) / 135 synthetic parcels |
| Links surfaced | 84 (48 HIGH, 36 MEDIUM) from 1,674 scored pairs |
| Parcel status | 12 RED · 62 AMBER · 61 GREEN |
| Flagship | **P-B01 = RED @ 0.9105**, P-A01 = GREEN |

## Two deliberate deviations, both flagged

1. **Absent features are redistributed, not scored zero.** Only 6 of 38 cases
   state a patronymic. Scoring the missing 0.15 as 0 would depress every case
   that simply did not write "s/o" — punishing a data artefact as if it were
   evidence. The weight is renormalised over the features that exist; the
   per-pair evidence records `weights_used` and `features_absent`.
2. **`next_hearing_date` is null, not invented.** The source corpus does not
   carry it, and fabricating a court date into a file labelled provenance
   `real` would be dishonest. For active cases the pendency window is
   filed → present, and the flagship sale (2025-12-13) sits inside it, so the
   §51 step-4 timeline beat works without a fabricated hearing date.

## Why the linkage is not circular

The synthetic land side deliberately diverges from how the court cites it, and
s2/s4 have to earn the match back:

| Court says | Land record says | Reconciled by |
|---|---|---|
| `1365/1` | `1365-1` | s2 survey normalization |
| `Madanpur Paniyar` | `Madanpur Panyar` | s2 village gazetteer |
| `SHYAMDHAR DUBEY` | `Shyam Dhar Dubey` | s4 RapidFuzz name similarity |
| gata `153` | `153/1`, `153/2` | s4 sub-division kinship (0.6 partial) |

`tests/test_golden.py::test_flagship_link_survives_divergence` asserts exactly
this, so the property cannot silently regress.
