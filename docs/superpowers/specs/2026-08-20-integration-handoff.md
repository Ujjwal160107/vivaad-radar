# Integration handoff — pipeline `6bcbb4a` × backend `2d851e9`

**Date:** 2026-08-20
**Why this exists:** the pipeline and the backend were each fully green in isolation and returned 500 on all eight endpoints when connected. Both work items below are needed to close that gap. Authoritative schema is section 5b of `2026-08-20-vivaad-radar-architecture-design.md`; findings and decisions are section 12b.

---

## A. For the backend chat (`feature/backend-stub-api`)

The backend currently targets a schema the pipeline does not produce. Adopt the pipeline's schema — do not ask the pipeline to change.

### A1. Schema corrections

| Backend expects | Real schema |
|---|---|
| tables `parcel`, `court_case`, `parcel_case_link`, `source_record`, … | `Parcel`, `CourtCase`, `ParcelCaseLink`, `SourceRecord`, `Person`, `CaseParty`, `CourtEvent`, `Watchlist` |
| `parcel.survey_no_norm` | no such column — filter on `survey_no` + `village_canon` |
| `court_case.cnr` | `CourtCase.id` **is** the CNR; there is no `cnr` column |
| `land_event` table | `Parcel.land_events`, a JSON text column |
| `source_id` FK into `source_record` | `source_label`, a plain text provenance label |
| worst-case status computed per request | `Parcel.status` / `Parcel.confidence`, already precomputed |

Extra columns now available and worth surfacing: `ParcelCaseLink.identifier_match` and `.reason`, `Parcel.note` and `.closed_history`, `CourtCase.order_date`.

### A2. Litigation endpoint

Read `Parcel.status` and `Parcel.confidence` directly. Do **not** recompute a worst-case across links at query time — §36/§48 require the serving layer to be a plain SELECT. The pipeline's `s7_export_fallback.litigation_payload` is the canonical response shape; match it, including `note`, `closed_history`, and the per-link `band`, `reason`, `identifier_match`, `raw_text_ref`.

### A3. Parcel search normalization

Normalize the incoming survey number the way `s2_normalize` does (`1365-1` → `1365/1`) before comparing, and compare the village against `village_canon`. Without this, the flagship search misses: the land record holds `1365-1` and "Madanpur Panyar" while a user types `1365/1` and "Madanpur Paniyar".

### A4. Fallback middleware (task 8) — two conventions

`s7` writes nested paths for parcels and cases, flat-underscore for the rest. Resolve nested first, then flat:

| Request | File |
|---|---|
| `/parcels/P-B01/litigation` | `parcels/P-B01/litigation.json` |
| `/parcels/P-B01` | `parcels/P-B01.json` |
| `/cases/UPHC020611812025` | `cases/UPHC020611812025.json` |
| `/dashboard/overview` | `dashboard_overview.json` |
| `/dashboard/heatmap` | `dashboard_heatmap.json` |
| `/parcels/search` | `parcels_search.json` |
| `/watchlist` | `watchlist.json` |

Resolving only one convention silently 503s half the routes.

### A5. Flagship identifiers

`P-A01` (clean, GREEN) and `P-B01` (flagship, RED, confidence 0.9105). The stub's `P-001`/`P-002` do not exist as the flagship pair in real data — `P-001` is an ordinary parcel. Update `test_golden_case.py` accordingly.

### A6. The test that would have caught this

Add one integration test that sets `VIVAAD_DB` to the real `data/output/vivaad.db` and asserts every §37 endpoint returns 200 with `P-B01` RED at ≥ 0.85. Stub-only tests pass while the real DB fails on all eight routes; this is the test that matters. Keep the stub tests for fast iteration.

---

## B. For the pipeline owner (`main`)

### B1. Derived next-hearing dates

No case in the corpus has a `next_hearing_date` (0 of 38), but §37, §16 screen 5, §50 and §55 all display one. Derive it from the last order date, with three constraints:

- **Active cases only.** A disposed case must never carry a future hearing date.
- Add a `next_hearing_source` field valued `derived` (versus `real` for genuine court metadata), so §21 provenance stays intact and the API can pass the distinction to the UI.
- Keep it plausible relative to the order date rather than uniformly distant.

The UI will render these as visibly estimated. That labelling is a hard requirement, not a nicety: "our court data is real" is the strongest answer to §56's data-provenance question, and an unlabelled fabricated court date is both the easiest thing for a judge to check and the most expensive thing to lose.

### B2. Broaden the *lis pendens* evidence

Only `P-B01` has a sale after its filing date; every other RED parcel's sale predates its litigation, which demonstrates the opposite of §52. Since synthetic land events are ours to place and real court dates are not, place sales inside the pendency window for several RED parcels, including:

| Parcel | Case | Filed | Pendency | Confidence |
|---|---|---|---|---|
| `P-037` | `CLRE/6/2024` (mutation/revenue record) | 2024-02-12 | ~2.5 yrs | 0.967 |
| `P-052` / `P-053` | `WRIB/326/2024` (tenancy) | 2024-03-20 | ~2.4 yrs | 0.953 |
| `P-031` / `P-032` | `WRIB/712/2025` (possession) | 2025-02-20 | ~1.5 yrs | 0.977 |

`P-B01` stays the flagship. The rest give the officer view and the Q&A genuine depth, so the pattern reads as systemic rather than as one lucky row.

### B3. Docstring correction

`s7_export_fallback.py`'s module docstring states "Filenames are flat and URL-derived so the middleware can map a request path to a file with one replace." The code writes nested paths for parcels and cases and flat ones for dashboard routes. The backend now handles both, but the docstring should describe what the code does.

### B4. Pitch numbers to correct

Filing dates span 2024-01-17 to 2025-12-10, so the longest pendency is ~2.5 years. Any slide or script claiming the PRD's illustrative "pending 6 years" needs updating to the honest maximum.

---

## C. Already done in this pass

- Section 5b of the design doc now records the real `vivaad.db` schema as the authoritative pipeline↔backend contract.
- Section 12b records the integration findings, the verified-sound aspects of the matching engine, the corpus limitations, and the two decisions above.
- Verified independently: RED precision is sound (12/12 REDs rest on an `exact` identifier match, none on the weaker `subdivision` inference), and the flagship link is earned across the deliberate `1365-1`/`1365/1` and `Panyar`/`Paniyar` divergence.
