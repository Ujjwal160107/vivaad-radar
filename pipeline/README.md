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
| Sale during pendency | 8 of 12 RED parcels (PRD 52 evidence) |
| Flagship | **P-B01 = RED @ 0.9105**, P-A01 = GREEN |
| Tests | 13 pipeline golden + 33 backend, all green |

## Corpus facts worth quoting accurately

Numbers for slides and the demo script. These come from `s1_report.json`, so
they stay honest as the data changes.

| | |
|---|---|
| Filing dates span | 2024-01-17 to 2025-12-10 |
| **Longest pendency** | **~2.6 years** |
| Cases with a real next-hearing date | **0 of 38** (all displayed ones are derived) |
| Cases stating a patronymic | 6 of 38 |

The PRD's illustrative "filed 2019, pending 6 years" is a worked example, not a
fact about this corpus. **Any slide or script must say ~2.6 years**, which is
the real maximum here. A judge who checks a filing date will find 2024, and an
inflated claim is the cheapest possible credibility loss.

## Two deliberate deviations, both flagged

1. **Absent features are redistributed, not scored zero.** Only 6 of 38 cases
   state a patronymic. Scoring the missing 0.15 as 0 would depress every case
   that simply did not write "s/o" - punishing a data artefact as if it were
   evidence. The weight is renormalised over the features that exist; the
   per-pair evidence records `weights_used` and `features_absent`.
2. **Next-hearing dates are derived, and say so.** No case in the corpus has
   one (0 of 38), but PRD 37, 16 screen 5, 50 and 55 all display one. So the
   pipeline derives it for **active cases only**, anchored on the later of the
   order date or today plus a varied 3-14 week listing gap, and stamps
   `next_hearing_source = 'derived'`. Disposed cases never get one. Three
   golden tests enforce this, because an unlabelled fabricated court date is
   the easiest thing for a judge to check and the most expensive thing to lose.

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
