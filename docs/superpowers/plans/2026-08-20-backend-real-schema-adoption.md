# Backend Real-Schema Adoption Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the backend serve the pipeline's real `vivaad.db` (schema per design doc §5b) so the DB drop-in actually works — closing the integration gap recorded in `docs/superpowers/specs/2026-08-20-integration-handoff.md` items A1–A6.

**Architecture:** The backend adopts the pipeline's schema dialect wholesale: 8 CamelCase tables, `CourtCase.id` IS the CNR, `Parcel.status`/`Parcel.confidence` precomputed (no worst-case recompute at query time), `land_events` as a JSON column, `source_label` text provenance. Response shapes match `pipeline/s7_export_fallback.py` payload functions exactly, so fallback files and live responses are indistinguishable. The stub seed is rewritten in the same dialect with the real flagship IDs (`P-A01`/`P-B01`) so stub tests and the real-DB gate assert the same things.

**Tech Stack:** Python 3.11+, FastAPI, sqlite3 (stdlib), pytest, httpx. No new dependencies (normalization uses only `re`/`unicodedata`).

## Global Constraints

- Authoritative schema: `pipeline/s6_load_db.py` SCHEMA (design doc §5b). Do not ask the pipeline to change (handoff §A).
- Exactly the eight §37 endpoints — no more, no fewer.
- No scoring/matching at query time. `GET /parcels/{id}/litigation` reads `Parcel.status` and `Parcel.confidence` directly (§36/§48, handoff A2).
- Litigation response shape is canonically defined by `s7_export_fallback.litigation_payload`: top-level `{"parcel_id","status","confidence","note","closed_history","links":[...]}` where each link has `{"case_id","case_no","court","case_type","case_status","confidence","band","link_status","reason","evidence","filing_date","order_date","next_hearing","raw_text_ref"}`.
- Parcel detail matches `parcel_payload` (all Parcel columns + `owner` object + parsed `geometry`/`land_events`); case detail matches `case_payload` (all CourtCase columns + `parties` + `events` + `linked_parcels`); dashboard matches the `dashboard_overview.json` / `dashboard_heatmap.json` shapes.
- Search normalizes the incoming survey number the way `s2_normalize.norm_survey` does (`1365-1` → `1365/1`) and compares the village via `norm_place` against `Parcel.village_canon` (handoff A3).
- Failed lookup → HTTP 404 with TOP-LEVEL body `{"error": "not_found", "hint": "check spelling/format"}` (human ruling 2026-08-20; the global HTTPException handler in `backend/main.py` already unwraps `detail`). Never a raw 500 to a judge.
- Flagship identifiers: `P-B01` = RED at 0.9105, `P-A01` = GREEN, flagship CNR `UPHC020611812025` (case `WRIB/784/2025`, active, next hearing per real data). Stub seed uses the same IDs (handoff A5).
- DB path from env var `VIVAAD_DB` (default `data/output/vivaad.db`); fallback dir from `VIVAAD_FALLBACK_DIR` — both already implemented, do not change.
- Defensive serving: the DB is produced by another codebase. A `Parcel.status` not in {RED, AMBER, GREEN} counts as AMBER in dashboards (never RED, never silently GREEN); NULL status counts as GREEN; malformed `evidence` JSON is returned as the raw string, never a 500.
- The real-DB integration test (Task 8) is the §62 acceptance gate — it must run against a COPY of `data/output/vivaad.db` (never mutate the tracked file) and fail loudly if the file is missing.
- Run all tests from repo root: `python -m pytest backend/tests/ -v`.

---

### Task 1: Schema + stub seed in the real dialect

**Files:**
- Modify: `backend/schema.sql` (replace entirely)
- Modify: `backend/seed_stub.py` (replace entirely)
- Modify: `backend/tests/test_schema.py`
- Modify: `backend/tests/test_seed.py`

**Interfaces:**
- Produces: `vivaad.db` stub with tables `Parcel, Person, CourtCase, CaseParty, CourtEvent, ParcelCaseLink, Watchlist, SourceRecord` (exactly 8); parcels `P-A01` (GREEN 0.0), `P-B01` (RED 0.9105), `P-C01` (AMBER 0.68); cases keyed by CNR `UPHC020611812025` (active) and `UPHC020412342024` (disposed). `db.get_conn`/`init_schema` unchanged.
- Note: the old `parcel_case_link`/`court_case`/`land_event`/`source_record` names and `survey_no_norm`/`cnr`/`source_id` columns disappear. Later tasks update every query.

- [ ] **Step 1: Replace `backend/schema.sql`** with the s6 dialect (CREATE TABLE IF NOT EXISTS variant of `pipeline/s6_load_db.py` SCHEMA — copy the column lists verbatim):

```sql
CREATE TABLE IF NOT EXISTS Parcel (
  id TEXT PRIMARY KEY, survey_no TEXT, khasra_no TEXT, khata_no TEXT,
  village TEXT, village_canon TEXT, taluk TEXT, district TEXT, area TEXT,
  geometry TEXT, land_events TEXT, owner_ref TEXT,
  status TEXT, confidence REAL, note TEXT, closed_history INTEGER,
  source_label TEXT);
CREATE TABLE IF NOT EXISTS Person (
  id TEXT PRIMARY KEY, name TEXT, name_normalized TEXT, father_name TEXT,
  address TEXT, source_label TEXT);
CREATE TABLE IF NOT EXISTS CourtCase (
  id TEXT PRIMARY KEY, case_no TEXT, court TEXT, case_type TEXT,
  filing_date TEXT, order_date TEXT, status TEXT, next_hearing_date TEXT,
  raw_text_ref TEXT, source_label TEXT);
CREATE TABLE IF NOT EXISTS CaseParty (
  case_id TEXT, person_id TEXT, role TEXT, name_as_written TEXT);
CREATE TABLE IF NOT EXISTS CourtEvent (
  id INTEGER PRIMARY KEY AUTOINCREMENT, case_id TEXT, event_type TEXT,
  date TEXT, note TEXT);
CREATE TABLE IF NOT EXISTS ParcelCaseLink (
  id INTEGER PRIMARY KEY AUTOINCREMENT, parcel_id TEXT, case_id TEXT,
  confidence_score REAL, confidence_band TEXT, identifier_match TEXT,
  evidence TEXT, status TEXT, reason TEXT, created_at TEXT);
CREATE TABLE IF NOT EXISTS Watchlist (
  id INTEGER PRIMARY KEY AUTOINCREMENT, user_ref TEXT, parcel_id TEXT,
  subscribed_at TEXT, last_notified_at TEXT, has_update INTEGER DEFAULT 0);
CREATE TABLE IF NOT EXISTS SourceRecord (
  id INTEGER PRIMARY KEY AUTOINCREMENT, source_type TEXT, origin TEXT,
  ingested_at TEXT, raw_ref TEXT);

CREATE INDEX IF NOT EXISTS ix_parcel_lookup ON Parcel(survey_no, village_canon);
CREATE INDEX IF NOT EXISTS ix_parcel_village ON Parcel(village_canon);
CREATE INDEX IF NOT EXISTS ix_link_parcel ON ParcelCaseLink(parcel_id);
CREATE INDEX IF NOT EXISTS ix_link_case ON ParcelCaseLink(case_id);
CREATE INDEX IF NOT EXISTS ix_event_case ON CourtEvent(case_id);
```

- [ ] **Step 2: Update `backend/tests/test_schema.py`** — expected tables become exactly the eight:

```python
from backend.db import get_conn, init_schema

EXPECTED_TABLES = {
    "Parcel", "Person", "CourtCase", "CaseParty", "CourtEvent",
    "ParcelCaseLink", "Watchlist", "SourceRecord",
}


def test_schema_creates_exactly_eight_tables(tmp_path):
    conn = get_conn(tmp_path / "t.db")
    init_schema(conn)
    rows = conn.execute(
        "SELECT name FROM sqlite_master WHERE type='table'"
        " AND name NOT LIKE 'sqlite_%'"
    ).fetchall()
    assert {r["name"] for r in rows} == EXPECTED_TABLES
```

- [ ] **Step 3: Run to verify it fails** (old schema has 9 snake_case tables): `python -m pytest backend/tests/test_schema.py -v` — expected FAIL.

- [ ] **Step 4: Rewrite `backend/seed_stub.py`** in the new dialect. The stub mirrors the real flagship: `P-B01` raw survey `1365-1` / village `Madanpur Panyar` with canon `madanpur paniyar`, so search Task 3 proves the normalization bridge:

```python
"""Stub vivaad.db seeder in the REAL pipeline dialect (design doc §5b).
Mirrors the real flagship IDs so stub tests and the real-DB gate agree."""
import json
from backend.db import get_conn, init_schema, db_path

FLAGSHIP_CNR = "UPHC020611812025"
DISPOSED_CNR = "UPHC020412342024"
NOW = "2026-08-20"


def seed(conn) -> None:
    conn.executemany(
        "INSERT INTO Person (id,name,name_normalized,father_name,address,source_label)"
        " VALUES (?,?,?,?,?,?)",
        [
            ("PR-001", "Ramesh Verma", "ramesh verma", "Sohan Lal", "Baraunsa, Sultanpur", "synthetic"),
            ("PR-002", "Shyam Dhar Dubey", "shyam dhar dubey", "Santu", "Madanpur Panyar, Sultanpur", "synthetic"),
            ("PR-003", "Rakesh Kumar", "rakesh kumar", "Mahesh", "Kurwar, Sultanpur", "synthetic"),
        ],
    )
    conn.executemany(
        "INSERT INTO Parcel VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)",
        [
            ("P-A01", "88", None, "KH-88", "Baraunsa", "baraunsa", "Sadar", "Sultanpur",
             "0.5 bigha", None,
             json.dumps([{"event_type": "mutation", "date": "2023-06-10", "note": "Routine mutation"}]),
             "PR-001", "GREEN", 0.0, None, 0, "synthetic"),
            ("P-B01", "1365-1", "1365-1", "KH-153", "Madanpur Panyar", "madanpur paniyar",
             "Sadar", "Sultanpur", "1 bigha", None,
             json.dumps([{"event_type": "sale", "date": "2025-11-05", "note": "Sale registered during pendency"}]),
             "PR-002", "RED", 0.9105, "Sale registered during pendency", 0, "synthetic"),
            ("P-C01", "142/3", None, "KH-142", "Kurwar", "kurwar", "Sadar", "Sultanpur",
             "0.8 bigha", None, json.dumps([]),
             "PR-003", "AMBER", 0.68, None, 0, "synthetic"),
        ],
    )
    conn.executemany(
        "INSERT INTO CourtCase VALUES (?,?,?,?,?,?,?,?,?,?)",
        [
            (FLAGSHIP_CNR, "WRIB/784/2025", "Allahabad High Court", "consolidation/title",
             "2025-08-11", "2025-08-22", "active", "2026-09-12", None, "real"),
            (DISPOSED_CNR, "WRIB/312/2024", "Allahabad High Court", "partition",
             "2024-03-02", "2025-01-15", "disposed", None, None, "real"),
        ],
    )
    conn.executemany(
        "INSERT INTO CaseParty (case_id,person_id,role,name_as_written) VALUES (?,?,?,?)",
        [
            (FLAGSHIP_CNR, "PR-002", "petitioner", "SHYAMDHAR DUBEY AND 9 OTHERS"),
            (FLAGSHIP_CNR, None, "respondent", "DEPUTY DIRECTOR OF CONSOLIDATION, SULTANPUR"),
            (DISPOSED_CNR, "PR-003", "petitioner", "RAKESH KUMAR"),
            (DISPOSED_CNR, None, "respondent", "STATE OF UP"),
        ],
    )
    conn.executemany(
        "INSERT INTO CourtEvent (case_id,event_type,date,note) VALUES (?,?,?,?)",
        [
            (FLAGSHIP_CNR, "filed", "2025-08-11", "Case filed"),
            (FLAGSHIP_CNR, "interim_order", "2025-08-22", "Latest order on record"),
            (FLAGSHIP_CNR, "next_hearing", "2026-09-12", "Next hearing"),
            (DISPOSED_CNR, "filed", "2024-03-02", "Case filed"),
            (DISPOSED_CNR, "judgment", "2025-01-15", "Latest order on record"),
        ],
    )
    conn.executemany(
        "INSERT INTO ParcelCaseLink (parcel_id,case_id,confidence_score,confidence_band,"
        "identifier_match,evidence,status,reason,created_at) VALUES (?,?,?,?,?,?,?,?,?)",
        [
            ("P-B01", FLAGSHIP_CNR, 0.9105, "HIGH", "exact",
             json.dumps({"survey_match": "exact", "name_similarity": 0.88,
                         "village_match": True, "father_name_similarity": 0.90,
                         "case_type_relevance": "high"}),
             "RED", "high-band link to active case with exact identifier match", NOW),
            ("P-C01", DISPOSED_CNR, 0.68, "MEDIUM", "none",
             json.dumps({"survey_match": "normalized", "name_similarity": 0.55,
                         "village_match": True, "father_name_similarity": 0.20,
                         "case_type_relevance": "medium"}),
             "AMBER", "medium-band link to disposed case", NOW),
        ],
    )
    conn.executemany(
        "INSERT INTO SourceRecord (source_type,origin,ingested_at,raw_ref) VALUES (?,?,?,?)",
        [
            ("real", "Allahabad HC parquet corpus", NOW, None),
            ("synthetic", "stub seed script", NOW, None),
            ("derived", "hand-set stub links (pipeline replaces)", NOW, None),
        ],
    )
    conn.commit()


if __name__ == "__main__":
    path = db_path()
    path.parent.mkdir(parents=True, exist_ok=True)
    path.unlink(missing_ok=True)
    conn = get_conn(path)
    init_schema(conn)
    seed(conn)
    print(f"Seeded stub DB at {path}")
```

- [ ] **Step 5: Update `backend/tests/test_seed.py`**:

```python
import json
from backend.db import get_conn, init_schema
from backend.seed_stub import seed, FLAGSHIP_CNR


def make_db(tmp_path):
    conn = get_conn(tmp_path / "t.db")
    init_schema(conn)
    seed(conn)
    return conn


def test_flagship_parcel_is_precomputed_red(tmp_path):
    conn = make_db(tmp_path)
    p = conn.execute("SELECT * FROM Parcel WHERE id='P-B01'").fetchone()
    assert p["status"] == "RED"
    assert p["confidence"] >= 0.85


def test_parcel_a_is_green_with_no_links(tmp_path):
    conn = make_db(tmp_path)
    p = conn.execute("SELECT * FROM Parcel WHERE id='P-A01'").fetchone()
    assert p["status"] == "GREEN"
    n = conn.execute(
        "SELECT COUNT(*) c FROM ParcelCaseLink WHERE parcel_id='P-A01'"
    ).fetchone()["c"]
    assert n == 0


def test_flagship_case_is_active_with_hearing(tmp_path):
    conn = make_db(tmp_path)
    case = conn.execute("SELECT * FROM CourtCase WHERE id=?", (FLAGSHIP_CNR,)).fetchone()
    assert case["status"] == "active"
    assert case["next_hearing_date"] == "2026-09-12"


def test_sale_event_inside_litigation_window(tmp_path):
    conn = make_db(tmp_path)
    p = conn.execute("SELECT land_events FROM Parcel WHERE id='P-B01'").fetchone()
    sale = next(e for e in json.loads(p["land_events"]) if e["event_type"] == "sale")
    case = conn.execute("SELECT * FROM CourtCase WHERE id=?", (FLAGSHIP_CNR,)).fetchone()
    assert case["filing_date"] < sale["date"] < case["next_hearing_date"]
```

- [ ] **Step 6: Run both test files** — `python -m pytest backend/tests/test_schema.py backend/tests/test_seed.py -v`. Expected: all PASS. (Other test files will now FAIL — that is expected until Tasks 3–7; do NOT run the full suite as a gate for this task.)

- [ ] **Step 7: Commit**

```bash
git add backend/schema.sql backend/seed_stub.py backend/tests/test_schema.py backend/tests/test_seed.py
git commit -m "feat(backend): adopt real pipeline schema dialect in stub seed (A1, A5)"
```

---

### Task 2: Shared-by-copy normalization module

**Files:**
- Create: `backend/normalize.py`
- Test: `backend/tests/test_normalize.py`

**Interfaces:**
- Produces: `normalize.norm_survey(s: str | None) -> str | None`, `normalize.norm_place(s: str | None) -> str | None`. Behavior MUST be identical to the same-named functions in `pipeline/s2_normalize.py` (copied verbatim minus the rapidfuzz/gazetteer parts, which serving does not need). The parity tests are the contract; a comment at top of the file names `pipeline/s2_normalize.py` as the source of truth.

- [ ] **Step 1: Write the failing test** `backend/tests/test_normalize.py`:

```python
from backend.normalize import norm_survey, norm_place


def test_norm_survey_bridges_the_flagship_divergence():
    assert norm_survey("1365-1") == "1365/1"
    assert norm_survey("1365 / 1") == "1365/1"
    assert norm_survey("1365/1") == "1365/1"
    assert norm_survey("4095M") == "4095m"
    assert norm_survey("") is None
    assert norm_survey(None) is None


def test_norm_place_lowercases_and_strips():
    assert norm_place("Madanpur Paniyar") == "madanpur paniyar"
    assert norm_place("  KURWAR  ") == "kurwar"
    assert norm_place(None) is None


def test_parity_with_pipeline_s2():
    """Guard against drift: import the pipeline originals and compare."""
    import importlib.util, sys
    from pathlib import Path
    pipe = Path(__file__).resolve().parents[2] / "pipeline"
    sys.path.insert(0, str(pipe))
    try:
        spec = importlib.util.spec_from_file_location("s2n", pipe / "s2_normalize.py")
        s2 = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(s2)
    finally:
        sys.path.remove(str(pipe))
    for v in ("1365-1", "1365 / 1", "88", "142/3", "4095M"):
        assert norm_survey(v) == s2.norm_survey(v)
    for v in ("Madanpur Paniyar", "Madanpur Panyar", "Baraunsa"):
        assert norm_place(v) == s2.norm_place(v)
```

(If importing `s2_normalize.py` fails in CI because `rapidfuzz` is not installed, wrap the parity test in `pytest.importorskip("rapidfuzz")` — the first two tests still pin the behavior.)

- [ ] **Step 2: Run to verify it fails**: `python -m pytest backend/tests/test_normalize.py -v` — expected FAIL with `ModuleNotFoundError: backend.normalize`.

- [ ] **Step 3: Implement `backend/normalize.py`** (functions copied verbatim from `pipeline/s2_normalize.py`):

```python
"""Survey-number and place normalization for query-time comparison.
Source of truth: pipeline/s2_normalize.py (norm_survey / norm_place).
test_normalize.py::test_parity_with_pipeline_s2 guards against drift."""
import re
import unicodedata


def norm_survey(pid):
    """1365-1, 1365 / 1, 4095M -> 1365/1, 1365/1, 4095m"""
    if not pid:
        return None
    s = unicodedata.normalize("NFKC", str(pid)).strip().lower()
    s = re.sub(r"\s+", "", s)
    s = re.sub(r"[-_]", "/", s)
    s = re.sub(r"/+", "/", s).strip("/.")
    return s or None


def norm_place(v):
    if not v:
        return None
    s = unicodedata.normalize("NFKC", str(v)).lower()
    return re.sub(r"\s+", " ", re.sub(r"[^a-z ]+", " ", s)).strip() or None
```

- [ ] **Step 4: Run to verify it passes**: `python -m pytest backend/tests/test_normalize.py -v` — expected PASS.

- [ ] **Step 5: Commit**

```bash
git add backend/normalize.py backend/tests/test_normalize.py
git commit -m "feat(backend): normalization module mirroring pipeline s2 (A3)"
```

---

### Task 3: Parcel search + detail on the real schema

**Files:**
- Modify: `backend/routers/parcels.py` (search + detail functions only; litigation is Task 4)
- Modify: `backend/tests/test_parcels.py`

**Interfaces:**
- Consumes: `normalize.norm_survey`, `normalize.norm_place` (Task 2); `Parcel`/`Person` tables (Task 1).
- Produces: `GET /parcels/search?survey_no=&village=` → `{"parcels": [{"id","survey_no","khasra_no","khata_no","village","village_canon","taluk","status","confidence"}]}` (same row shape as `s7`'s `parcels_search.json` index). `GET /parcels/{id}` → `parcel_payload` shape: every Parcel column, plus `owner` `{"name","father_name"}` or null, `geometry` parsed JSON or null, `land_events` parsed JSON list. 404 body `{"error":"not_found","hint":"check spelling/format"}` (top-level via the existing exception handler).

- [ ] **Step 1: Rewrite the tests** in `backend/tests/test_parcels.py`:

```python
def test_search_bridges_survey_and_village_divergence(client):
    # user types the court's citation; the land record stores 1365-1 / Panyar
    r = client.get("/parcels/search",
                   params={"survey_no": "1365/1", "village": "Madanpur Paniyar"})
    assert r.status_code == 200
    parcels = r.json()["parcels"]
    assert any(p["id"] == "P-B01" for p in parcels)


def test_search_no_match_returns_empty_list(client):
    r = client.get("/parcels/search", params={"survey_no": "999", "village": "Nowhere"})
    assert r.status_code == 200
    assert r.json()["parcels"] == []


def test_parcel_detail_matches_parcel_payload_shape(client):
    r = client.get("/parcels/P-B01")
    assert r.status_code == 200
    body = r.json()
    assert body["survey_no"] == "1365-1"
    assert body["status"] == "RED"
    assert body["owner"]["name"] == "Shyam Dhar Dubey"
    assert body["source_label"] == "synthetic"
    assert isinstance(body["land_events"], list)
    assert body["land_events"][0]["event_type"] == "sale"


def test_parcel_not_found_shape(client):
    r = client.get("/parcels/P-999")
    assert r.status_code == 404
    assert r.json() == {"error": "not_found", "hint": "check spelling/format"}
```

- [ ] **Step 2: Run to verify they fail**: `python -m pytest backend/tests/test_parcels.py -v` — expected FAIL (old queries reference `survey_no_norm` etc.).

- [ ] **Step 3: Rewrite search + detail** in `backend/routers/parcels.py` (keep `router`, `NOT_FOUND`, and the litigation endpoint in place — litigation changes in Task 4):

```python
from backend.normalize import norm_survey, norm_place

SEARCH_COLS = ("id, survey_no, khasra_no, khata_no, village, village_canon,"
               " taluk, status, confidence")


@router.get("/search")
def search(survey_no: str = "", village: str = ""):
    conn = get_conn()
    want_survey = norm_survey(survey_no)
    want_village = norm_place(village)
    if want_village:
        rows = conn.execute(
            f"SELECT {SEARCH_COLS} FROM Parcel WHERE village_canon = ?",
            (want_village,)).fetchall()
    else:
        rows = conn.execute(f"SELECT {SEARCH_COLS} FROM Parcel").fetchall()
    out = []
    for r in rows:
        if want_survey and want_survey not in {
            norm_survey(r["survey_no"]), norm_survey(r["khasra_no"]),
            norm_survey(r["khata_no"]),
        }:
            continue
        out.append(dict(r))
    return {"parcels": out}


@router.get("/{parcel_id}")
def detail(parcel_id: str):
    conn = get_conn()
    r = conn.execute("SELECT * FROM Parcel WHERE id = ?", (parcel_id,)).fetchone()
    if r is None:
        raise HTTPException(404, NOT_FOUND)
    body = dict(r)
    owner = conn.execute(
        "SELECT name, father_name FROM Person WHERE id = ?",
        (r["owner_ref"],)).fetchone()
    body["owner"] = dict(owner) if owner else None
    for col in ("geometry", "land_events"):
        try:
            body[col] = json.loads(body[col]) if body[col] else ([] if col == "land_events" else None)
        except (TypeError, ValueError):
            pass  # serve the raw value rather than 500 on foreign data
    return body
```

(`import json` at module top; the Python-side survey filter runs on at most one village's parcels — no scoring, just normalization equality, per handoff A3.)

- [ ] **Step 4: Run to verify they pass**: `python -m pytest backend/tests/test_parcels.py -v` — expected 4 PASS.

- [ ] **Step 5: Commit**

```bash
git add backend/routers/parcels.py backend/tests/test_parcels.py
git commit -m "feat(backend): parcel search/detail on real schema with s2 normalization (A1, A3)"
```

---

### Task 4: Litigation endpoint reads precomputed status (s7 shape)

**Files:**
- Modify: `backend/routers/parcels.py` (litigation endpoint)
- Modify: `backend/tests/test_golden_case.py`
- Modify: `backend/tests/test_hardening.py`

**Interfaces:**
- Consumes: `Parcel.status/.confidence/.note/.closed_history`, `ParcelCaseLink`, `CourtCase` (Task 1).
- Produces: `GET /parcels/{id}/litigation` in exactly the `litigation_payload` shape (see Global Constraints). Links ordered by `confidence_score DESC` (matching s7). NO worst-case computation — delete `_RANK` and the `min()` logic.

- [ ] **Step 1: Rewrite `backend/tests/test_golden_case.py`**:

```python
def test_parcel_b_is_red_high_confidence(client):
    r = client.get("/parcels/P-B01/litigation")
    assert r.status_code == 200
    body = r.json()
    assert body["status"] == "RED"
    assert body["confidence"] >= 0.85
    assert body["closed_history"] is False
    link = next(l for l in body["links"] if l["case_no"] == "WRIB/784/2025")
    assert link["case_status"] == "active"
    assert link["band"] == "HIGH"
    assert link["evidence"]["survey_match"] == "exact"
    assert link["next_hearing"] == "2026-09-12"


def test_parcel_a_is_green(client):
    r = client.get("/parcels/P-A01/litigation")
    assert r.status_code == 200
    body = r.json()
    assert body["status"] == "GREEN"
    assert body["links"] == []


def test_amber_decoy(client):
    assert client.get("/parcels/P-C01/litigation").json()["status"] == "AMBER"


def test_link_fields_match_s7_contract(client):
    link = client.get("/parcels/P-B01/litigation").json()["links"][0]
    assert set(link) == {
        "case_id", "case_no", "court", "case_type", "case_status",
        "confidence", "band", "link_status", "reason", "evidence",
        "filing_date", "order_date", "next_hearing", "raw_text_ref",
    }
```

(Note: the previous `test_mixed_status_links_worst_case_wins` is deleted — worst-case now lives in the pipeline's s5, not the serving layer.)

- [ ] **Step 2: Run to verify they fail**: `python -m pytest backend/tests/test_golden_case.py -v` — expected FAIL.

- [ ] **Step 3: Rewrite the litigation endpoint** in `backend/routers/parcels.py` (replace the whole function and delete `_RANK`):

```python
@router.get("/{parcel_id}/litigation")
def litigation(parcel_id: str):
    conn = get_conn()
    p = conn.execute(
        "SELECT id, status, confidence, note, closed_history FROM Parcel WHERE id=?",
        (parcel_id,)).fetchone()
    if p is None:
        raise HTTPException(404, NOT_FOUND)
    rows = conn.execute(
        """SELECT l.case_id, l.confidence_score, l.confidence_band,
                  l.identifier_match, l.evidence, l.status AS link_status, l.reason,
                  c.case_no, c.court, c.status AS case_status, c.filing_date,
                  c.order_date, c.next_hearing_date, c.case_type, c.raw_text_ref
           FROM ParcelCaseLink l JOIN CourtCase c ON c.id = l.case_id
           WHERE l.parcel_id = ? ORDER BY l.confidence_score DESC""",
        (parcel_id,)).fetchall()
    links = []
    for r in rows:
        try:
            evidence = _json.loads(r["evidence"])
        except (TypeError, ValueError):
            evidence = r["evidence"]
        links.append({
            "case_id": r["case_id"], "case_no": r["case_no"], "court": r["court"],
            "case_type": r["case_type"], "case_status": r["case_status"],
            "confidence": r["confidence_score"], "band": r["confidence_band"],
            "link_status": r["link_status"], "reason": r["reason"],
            "evidence": evidence, "filing_date": r["filing_date"],
            "order_date": r["order_date"], "next_hearing": r["next_hearing_date"],
            "raw_text_ref": r["raw_text_ref"],
        })
    return {
        "parcel_id": p["id"], "status": p["status"] or "GREEN",
        "confidence": p["confidence"], "note": p["note"],
        "closed_history": bool(p["closed_history"]), "links": links,
    }
```

- [ ] **Step 4: Update `backend/tests/test_hardening.py`** — the unknown-link-status test is obsolete (status is a Parcel column now); replace both tests:

```python
import json
from backend.db import get_conn


def test_malformed_evidence_json_returns_raw_string(client):
    conn = get_conn()
    conn.execute(
        "INSERT INTO ParcelCaseLink (parcel_id,case_id,confidence_score,"
        "confidence_band,identifier_match,evidence,status,reason,created_at)"
        " VALUES ('P-C01','UPHC020412342024',0.5,'LOW','none','not json','AMBER','x','2026-08-20')")
    conn.commit()
    r = client.get("/parcels/P-C01/litigation")
    assert r.status_code == 200
    assert any(l["evidence"] == "not json" for l in r.json()["links"])


def test_null_parcel_status_serves_as_green(client):
    conn = get_conn()
    conn.execute(
        "INSERT INTO Parcel (id,survey_no,village,village_canon,district,"
        "land_events,status,confidence,closed_history,source_label)"
        " VALUES ('P-X01','7','Testpur','testpur','Sultanpur','[]',NULL,NULL,0,'synthetic')")
    conn.commit()
    body = client.get("/parcels/P-X01/litigation").json()
    assert body["status"] == "GREEN"
    assert body["links"] == []
```

(The `client` fixture sets `VIVAAD_DB`; `get_conn()` inside the test reads the same env var, so inserts land in the fixture DB.)

- [ ] **Step 5: Run to verify all pass**: `python -m pytest backend/tests/test_golden_case.py backend/tests/test_hardening.py -v` — expected PASS.

- [ ] **Step 6: Commit**

```bash
git add backend/routers/parcels.py backend/tests/test_golden_case.py backend/tests/test_hardening.py
git commit -m "feat(backend): litigation serves precomputed status in s7 shape (A2, A5)"
```

---

### Task 5: Case detail in the `case_payload` shape

**Files:**
- Modify: `backend/routers/cases.py`
- Modify: `backend/tests/test_cases.py`

**Interfaces:**
- Consumes: `CourtCase` (id IS the CNR), `CaseParty`, `CourtEvent`, `ParcelCaseLink` (Task 1).
- Produces: `GET /cases/{cnr}` → all CourtCase columns (`id, case_no, court, case_type, filing_date, order_date, status, next_hearing_date, raw_text_ref, source_label`) plus `parties` `[{"role","name_as_written"}]`, `events` `[{"event_type","date","note"}]` ordered by date ascending, `linked_parcels` `[{"parcel_id","confidence_score","status"}]` ordered by confidence descending — exactly `s7.case_payload`.

- [ ] **Step 1: Rewrite `backend/tests/test_cases.py`**:

```python
FLAGSHIP_CNR = "UPHC020611812025"


def test_case_detail_flagship(client):
    r = client.get(f"/cases/{FLAGSHIP_CNR}")
    assert r.status_code == 200
    body = r.json()
    assert body["id"] == FLAGSHIP_CNR          # the id IS the CNR
    assert body["case_no"] == "WRIB/784/2025"
    assert body["status"] == "active"
    assert body["order_date"] == "2025-08-22"
    roles = {p["role"] for p in body["parties"]}
    assert {"petitioner", "respondent"} <= roles
    dates = [e["date"] for e in body["events"]]
    assert dates == sorted(dates)
    assert body["linked_parcels"][0]["parcel_id"] == "P-B01"


def test_case_not_found(client):
    r = client.get("/cases/C-999")
    assert r.status_code == 404
    assert r.json() == {"error": "not_found", "hint": "check spelling/format"}
```

- [ ] **Step 2: Run to verify they fail**: `python -m pytest backend/tests/test_cases.py -v` — expected FAIL.

- [ ] **Step 3: Rewrite `backend/routers/cases.py`**:

```python
from fastapi import APIRouter, HTTPException
from backend.db import get_conn
from backend.routers.parcels import NOT_FOUND

router = APIRouter(prefix="/cases", tags=["cases"])


@router.get("/{case_id}")
def detail(case_id: str):
    conn = get_conn()
    c = conn.execute("SELECT * FROM CourtCase WHERE id=?", (case_id,)).fetchone()
    if c is None:
        raise HTTPException(404, NOT_FOUND)
    body = dict(c)
    body["parties"] = [dict(r) for r in conn.execute(
        "SELECT role, name_as_written FROM CaseParty WHERE case_id=?", (case_id,))]
    body["events"] = [dict(r) for r in conn.execute(
        "SELECT event_type, date, note FROM CourtEvent WHERE case_id=? ORDER BY date",
        (case_id,))]
    body["linked_parcels"] = [dict(r) for r in conn.execute(
        "SELECT parcel_id, confidence_score, status FROM ParcelCaseLink"
        " WHERE case_id=? ORDER BY confidence_score DESC", (case_id,))]
    return body
```

- [ ] **Step 4: Run to verify they pass**: `python -m pytest backend/tests/test_cases.py -v` — expected 2 PASS.

- [ ] **Step 5: Commit**

```bash
git add backend/routers/cases.py backend/tests/test_cases.py
git commit -m "feat(backend): case detail keyed by CNR in case_payload shape (A1)"
```

---

### Task 6: Dashboard in the s7 shapes

**Files:**
- Modify: `backend/routers/dashboard.py`
- Modify: `backend/tests/test_dashboard.py`

**Interfaces:**
- Consumes: `Parcel` (precomputed `status`), `CourtCase`, `ParcelCaseLink` (Task 1).
- Produces: `GET /dashboard/overview` → `{"district","parcels","cases","status_counts":{"RED","AMBER","GREEN"},"active_cases","high_confidence_links","possible_matches"}`; `GET /dashboard/heatmap` → `{"villages":[{"village","village_canon","parcels","RED","AMBER","GREEN","density"}]}` sorted by density descending, `density = round((RED*2 + AMBER) / (parcels*2), 3)` — exactly the `dashboard_overview.json` / `dashboard_heatmap.json` shapes.

- [ ] **Step 1: Rewrite `backend/tests/test_dashboard.py`**:

```python
def test_overview_counts(client):
    body = client.get("/dashboard/overview").json()
    assert body["district"] == "Sultanpur"
    assert body["parcels"] == 3
    assert body["cases"] == 2
    assert body["status_counts"] == {"RED": 1, "AMBER": 1, "GREEN": 1}
    assert body["active_cases"] == 1
    assert body["high_confidence_links"] == 1
    assert body["possible_matches"] == 1


def test_heatmap_villages_sorted_by_density(client):
    body = client.get("/dashboard/heatmap").json()
    villages = body["villages"]
    densities = [v["density"] for v in villages]
    assert densities == sorted(densities, reverse=True)
    by_canon = {v["village_canon"]: v for v in villages}
    assert by_canon["madanpur paniyar"]["RED"] == 1
    assert by_canon["madanpur paniyar"]["density"] == 1.0
    assert by_canon["baraunsa"]["GREEN"] == 1
```

- [ ] **Step 2: Run to verify they fail**: `python -m pytest backend/tests/test_dashboard.py -v` — expected FAIL.

- [ ] **Step 3: Rewrite `backend/routers/dashboard.py`**:

```python
from fastapi import APIRouter
from backend.db import get_conn

router = APIRouter(prefix="/dashboard", tags=["dashboard"])

STATUSES = ("RED", "AMBER", "GREEN")


def _bucket(status):
    """Foreign-DB defense: NULL -> GREEN, unrecognized -> AMBER (never RED)."""
    if status is None:
        return "GREEN"
    return status if status in STATUSES else "AMBER"


@router.get("/overview")
def overview():
    conn = get_conn()
    parcels = conn.execute("SELECT district, status FROM Parcel").fetchall()
    counts = {s: 0 for s in STATUSES}
    for p in parcels:
        counts[_bucket(p["status"])] += 1
    one = lambda sql: conn.execute(sql).fetchone()["n"]
    return {
        "district": parcels[0]["district"] if parcels else None,
        "parcels": len(parcels),
        "cases": one("SELECT COUNT(*) n FROM CourtCase"),
        "status_counts": counts,
        "active_cases": one("SELECT COUNT(*) n FROM CourtCase WHERE status='active'"),
        "high_confidence_links": one(
            "SELECT COUNT(*) n FROM ParcelCaseLink WHERE confidence_band='HIGH'"),
        "possible_matches": one(
            "SELECT COUNT(*) n FROM ParcelCaseLink WHERE confidence_band='MEDIUM'"),
    }


@router.get("/heatmap")
def heatmap():
    conn = get_conn()
    rows = conn.execute(
        "SELECT village, village_canon, status FROM Parcel").fetchall()
    agg: dict[str, dict] = {}
    for r in rows:
        v = r["village_canon"] or "unknown"
        a = agg.setdefault(v, {"village": r["village"], "village_canon": v,
                               "parcels": 0, "RED": 0, "AMBER": 0, "GREEN": 0})
        a["parcels"] += 1
        a[_bucket(r["status"])] += 1
    for a in agg.values():
        a["density"] = round((a["RED"] * 2 + a["AMBER"]) / (a["parcels"] * 2), 3)
    return {"villages": sorted(agg.values(), key=lambda x: -x["density"])}
```

- [ ] **Step 4: Run to verify they pass**: `python -m pytest backend/tests/test_dashboard.py -v` — expected 2 PASS.

- [ ] **Step 5: Commit**

```bash
git add backend/routers/dashboard.py backend/tests/test_dashboard.py
git commit -m "feat(backend): dashboard endpoints in s7 fallback-parity shapes (A1)"
```

---

### Task 7: Watchlist on the real tables

**Files:**
- Modify: `backend/routers/watchlist.py` (table/column names only)
- Modify: `backend/tests/test_watchlist.py`

**Interfaces:**
- Consumes: `Watchlist`, `Parcel` (Task 1).
- Produces: unchanged API contract — `POST /watchlist` `{"parcel_id"}` → 201 `{"id","parcel_id","subscribed_at"}`, 400 `{"error":"unknown_parcel"}` (top-level) if parcel unknown; `GET /watchlist` → `{"items":[{"id","parcel_id","survey_no","village","subscribed_at","has_update"}]}`. Only the SQL changes: `watchlist`→`Watchlist`, `parcel`→`Parcel`, and INSERT must set `user_ref` explicitly to `'demo-user'` (the real schema has no column default).

- [ ] **Step 1: Update the tests** in `backend/tests/test_watchlist.py`:

```python
def test_subscribe_and_list(client):
    r = client.post("/watchlist", json={"parcel_id": "P-B01"})
    assert r.status_code == 201
    assert r.json()["parcel_id"] == "P-B01"
    items = client.get("/watchlist").json()["items"]
    assert len(items) == 1
    assert items[0]["survey_no"] == "1365-1"
    assert items[0]["has_update"] is False


def test_subscribe_unknown_parcel_rejected(client):
    r = client.post("/watchlist", json={"parcel_id": "P-999"})
    assert r.status_code == 400
    assert r.json() == {"error": "unknown_parcel"}
```

- [ ] **Step 2: Run to verify they fail**: `python -m pytest backend/tests/test_watchlist.py -v` — expected FAIL (P-B01 not in old queries' tables).

- [ ] **Step 3: Update `backend/routers/watchlist.py`** — only the SQL changes:

```python
@router.post("", status_code=201)
def subscribe(body: Subscribe):
    conn = get_conn()
    if conn.execute("SELECT 1 FROM Parcel WHERE id=?", (body.parcel_id,)).fetchone() is None:
        raise HTTPException(400, {"error": "unknown_parcel"})
    today = date.today().isoformat()
    cur = conn.execute(
        "INSERT INTO Watchlist (user_ref, parcel_id, subscribed_at) VALUES ('demo-user', ?, ?)",
        (body.parcel_id, today),
    )
    conn.commit()
    return {"id": cur.lastrowid, "parcel_id": body.parcel_id, "subscribed_at": today}


@router.get("")
def list_watchlist():
    conn = get_conn()
    rows = conn.execute(
        """SELECT w.id, w.parcel_id, w.subscribed_at, w.has_update,
                  p.survey_no, p.village
           FROM Watchlist w JOIN Parcel p ON p.id = w.parcel_id
           ORDER BY w.id"""
    ).fetchall()
    return {"items": [
        {"id": r["id"], "parcel_id": r["parcel_id"], "survey_no": r["survey_no"],
         "village": r["village"], "subscribed_at": r["subscribed_at"],
         "has_update": bool(r["has_update"])} for r in rows]}
```

(Keep the existing imports and `Subscribe` model as they are.)

- [ ] **Step 4: Run to verify they pass**, then run the ENTIRE backend suite: `python -m pytest backend/tests/ -v` — every file was updated by now; expected ALL PASS.

- [ ] **Step 5: Commit**

```bash
git add backend/routers/watchlist.py backend/tests/test_watchlist.py
git commit -m "feat(backend): watchlist on real Watchlist/Parcel tables (A1)"
```

---

### Task 8: The real-DB acceptance gate (§62 / handoff A6)

**Files:**
- Create: `backend/tests/test_integration_real_db.py`

**Interfaces:**
- Consumes: the tracked real DB at `data/output/vivaad.db` (committed by pipeline `6bcbb4a`), the full app.
- Produces: the acceptance gate for every future DB drop. Runs against a COPY in tmp_path (the POST /watchlist check writes; the tracked file must never be mutated). FAILS (not skips) if the DB file is missing — a missing DB is a broken build.

- [ ] **Step 1: Write the test**:

```python
"""§62 acceptance gate: the app must serve the REAL pipeline DB.
Run: python -m pytest backend/tests/test_integration_real_db.py -v
For a new DB drop: VIVAAD_DB=<file> python -m pytest backend/tests/ -v"""
import shutil
from pathlib import Path

import pytest
from fastapi.testclient import TestClient

REAL_DB = Path(__file__).resolve().parents[2] / "data" / "output" / "vivaad.db"
FLAGSHIP_CNR = "UPHC020611812025"


@pytest.fixture()
def real_client(tmp_path, monkeypatch):
    assert REAL_DB.exists(), (
        f"real DB missing at {REAL_DB} — run the pipeline (pipeline/run_all.py)")
    db_copy = tmp_path / "real.db"
    shutil.copy(REAL_DB, db_copy)
    monkeypatch.setenv("VIVAAD_DB", str(db_copy))
    from backend.main import app
    return TestClient(app)


def test_flagship_parcel_b_is_red_high_confidence(real_client):
    body = real_client.get("/parcels/P-B01/litigation").json()
    assert body["status"] == "RED"
    assert body["confidence"] >= 0.85
    assert body["links"], "flagship parcel must carry at least one link"


def test_flagship_parcel_a_is_green(real_client):
    assert real_client.get("/parcels/P-A01/litigation").json()["status"] == "GREEN"


def test_flagship_search_bridges_divergence(real_client):
    r = real_client.get("/parcels/search",
                        params={"survey_no": "1365/1", "village": "Madanpur Paniyar"})
    assert any(p["id"] == "P-B01" for p in r.json()["parcels"])


def test_every_endpoint_returns_200(real_client):
    checks = [
        "/parcels/search?survey_no=1365/1&village=Madanpur Paniyar",
        "/parcels/P-B01",
        "/parcels/P-B01/litigation",
        f"/cases/{FLAGSHIP_CNR}",
        "/dashboard/overview",
        "/dashboard/heatmap",
        "/watchlist",
    ]
    for path in checks:
        assert real_client.get(path).status_code == 200, path
    r = real_client.post("/watchlist", json={"parcel_id": "P-B01"})
    assert r.status_code == 201
```

- [ ] **Step 2: Run it**: `python -m pytest backend/tests/test_integration_real_db.py -v` — expected 4 PASS against the real DB. If any fail, the serving code (not the test) is wrong — fix and re-run; this test is the deliverable.

- [ ] **Step 3: Run everything**: `python -m pytest backend/tests/ tests/ -v` — expected ALL PASS (backend suite + pipeline golden tests untouched).

- [ ] **Step 4: Manual smoke** — `uvicorn backend.main:app --port 8000` (default `VIVAAD_DB` now points at the real DB), request `/parcels/P-B01/litigation`, confirm RED ≥ 0.85, stop the server (do not leave it running — it locks the DB file).

- [ ] **Step 5: Commit**

```bash
git add backend/tests/test_integration_real_db.py
git commit -m "test(backend): real-DB acceptance gate for every future drop (A6)"
```

---

## Non-goals / deferred

- Handoff A4 (dual nested/flat fallback naming) already landed on main in the stub-API plan's final fix wave (`backend/fallback.py` resolves nested first, then flat) — no task needed.
- Per-link `identifier_match` is deliberately NOT in the litigation link payload: `s7.litigation_payload` selects it but omits it from the emitted dict, and live responses must stay byte-compatible with the fallback files. If the frontend needs it, the pipeline owner changes s7 first.
- Pipeline-side items B1–B4 of the handoff (derived hearing dates, broader lis-pendens evidence, docstring, pitch numbers) belong to the pipeline owner.
- Deferred minors carried from the stub-API plan's ledger and still open after this plan: watchlist duplicate-subscription guard, per-request connection closing, `X-Vivaad-Source: fallback` header, exact-key-set assertions on every endpoint. None block the frontend.

## Handoff notes

- **For the frontend:** response shapes after this plan are byte-compatible with the files in `data/output/fallback/` — code against those files directly.
- **For the ML owner:** the gate for a new DB drop is `VIVAAD_DB=<file> python -m pytest backend/tests/test_integration_real_db.py -v` (plus the stub suite for serving-logic regressions).
