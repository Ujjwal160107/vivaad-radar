# Vivaad Radar Backend (Stub-Data API) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A read-only FastAPI serving the 8 PRD §37 endpoints over a stub SQLite `vivaad.db` seeded with the flagship demo pair, so the frontend can build immediately and the ML pipeline's real DB drops in later as a file swap.

**Architecture:** SQLite file (`data/output/vivaad.db`) built by a seed script implementing the PRD §19 schema; FastAPI routers do SELECT + JSON shaping only (no scoring at query time, §36/§48); a fallback middleware serves cached JSON from `data/output/fallback/` when the DB fails (§73 tier 2). Watchlist POST is the only write.

**Tech Stack:** Python 3.11+, FastAPI, uvicorn, sqlite3 (stdlib), pytest, httpx (TestClient).

## Global Constraints

- Exactly the eight §37 endpoints — no more, no fewer.
- No scoring/matching/ML at query time; every endpoint is SELECT + shaping (§36, §48).
- `GET /parcels/{id}/litigation` must return exactly the §37 response shape shown in Task 4.
- RED requires HIGH band + identifier match + active case; unknown status caps at AMBER; worst-case wins per parcel (§30). The stub data must already respect this (statuses are precomputed rows, not computed live).
- Failed lookup → structured `{"error": "not_found", "hint": "check spelling/format"}`, never a raw 500 to a judge (§16).
- Provenance: every seeded row references a `source_record` label (real/synthetic/derived/mocked) (§21).
- Dates as ISO `YYYY-MM-DD` TEXT columns.
- DB path resolved from env var `VIVAAD_DB` (default `data/output/vivaad.db`) so tests can point at temp files.
- Note: schema adds a 9th table `land_event` beyond §19's eight — required by the §31 timeline (sale-inside-litigation-window beat). Documented deviation, agreed in the design doc's timeline requirement.

---

### Task 1: Backend scaffold, schema, DB helper

**Files:**
- Create: `backend/requirements.txt`
- Create: `backend/schema.sql`
- Create: `backend/db.py`
- Test: `backend/tests/test_schema.py`

**Interfaces:**
- Produces: `db.get_conn(db_path: Path | None = None) -> sqlite3.Connection` (row_factory=Row), `db.init_schema(conn) -> None`, env var `VIVAAD_DB`.

- [ ] **Step 1: Write requirements and schema**

`backend/requirements.txt`:

```
fastapi==0.115.*
uvicorn==0.30.*
pytest==8.*
httpx==0.27.*
```

`backend/schema.sql`:

```sql
CREATE TABLE IF NOT EXISTS person (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  name_normalized TEXT NOT NULL,
  father_name TEXT,
  address TEXT,
  source_id TEXT
);

CREATE TABLE IF NOT EXISTS parcel (
  id TEXT PRIMARY KEY,
  survey_no TEXT NOT NULL,
  survey_no_norm TEXT NOT NULL,
  khasra_no TEXT,
  khata_no TEXT,
  village TEXT NOT NULL,
  taluk TEXT,
  district TEXT NOT NULL,
  area TEXT,
  geometry TEXT,
  owner_ref TEXT REFERENCES person(id),
  source_id TEXT
);

CREATE TABLE IF NOT EXISTS court_case (
  id TEXT PRIMARY KEY,
  case_no TEXT NOT NULL,
  cnr TEXT,
  court TEXT,
  case_type TEXT,
  filing_date TEXT,
  status TEXT NOT NULL CHECK (status IN ('active','closed','disposed','unknown')),
  next_hearing_date TEXT,
  raw_text_ref TEXT,
  source_id TEXT
);

CREATE TABLE IF NOT EXISTS case_party (
  case_id TEXT NOT NULL REFERENCES court_case(id),
  person_id TEXT REFERENCES person(id),
  role TEXT NOT NULL,
  name_as_written TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS court_event (
  id TEXT PRIMARY KEY,
  case_id TEXT NOT NULL REFERENCES court_case(id),
  event_type TEXT NOT NULL CHECK (event_type IN ('filed','hearing','interim_order','judgment')),
  date TEXT NOT NULL,
  note TEXT
);

CREATE TABLE IF NOT EXISTS land_event (
  id TEXT PRIMARY KEY,
  parcel_id TEXT NOT NULL REFERENCES parcel(id),
  event_type TEXT NOT NULL CHECK (event_type IN ('sale','mutation','transfer')),
  date TEXT NOT NULL,
  note TEXT
);

CREATE TABLE IF NOT EXISTS parcel_case_link (
  id TEXT PRIMARY KEY,
  parcel_id TEXT NOT NULL REFERENCES parcel(id),
  case_id TEXT NOT NULL REFERENCES court_case(id),
  confidence_score REAL NOT NULL,
  confidence_band TEXT NOT NULL CHECK (confidence_band IN ('HIGH','MEDIUM','LOW')),
  evidence TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('RED','AMBER','GREEN')),
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS watchlist (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_ref TEXT NOT NULL DEFAULT 'demo-user',
  parcel_id TEXT NOT NULL REFERENCES parcel(id),
  subscribed_at TEXT NOT NULL,
  last_notified_at TEXT,
  has_update INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS source_record (
  id TEXT PRIMARY KEY,
  source_type TEXT NOT NULL CHECK (source_type IN ('real','synthetic','mocked','derived','model-generated','cached')),
  origin TEXT NOT NULL,
  ingested_at TEXT NOT NULL,
  raw_ref TEXT
);

CREATE INDEX IF NOT EXISTS idx_parcel_search ON parcel(survey_no_norm, village);
CREATE INDEX IF NOT EXISTS idx_link_parcel ON parcel_case_link(parcel_id);
```

`backend/db.py`:

```python
import os
import sqlite3
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[1]
DEFAULT_DB = REPO_ROOT / "data" / "output" / "vivaad.db"


def db_path() -> Path:
    return Path(os.environ.get("VIVAAD_DB", str(DEFAULT_DB)))


def get_conn(path: Path | None = None) -> sqlite3.Connection:
    conn = sqlite3.connect(path or db_path())
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON")
    return conn


def init_schema(conn: sqlite3.Connection) -> None:
    sql = (Path(__file__).parent / "schema.sql").read_text(encoding="utf-8")
    conn.executescript(sql)
```

- [ ] **Step 2: Write the failing test**

`backend/tests/test_schema.py`:

```python
import sqlite3
from backend.db import get_conn, init_schema

EXPECTED_TABLES = {
    "person", "parcel", "court_case", "case_party", "court_event",
    "land_event", "parcel_case_link", "watchlist", "source_record",
}


def test_schema_creates_all_tables(tmp_path):
    conn = get_conn(tmp_path / "t.db")
    init_schema(conn)
    rows = conn.execute(
        "SELECT name FROM sqlite_master WHERE type='table'"
    ).fetchall()
    names = {r["name"] for r in rows}
    assert EXPECTED_TABLES <= names
```

- [ ] **Step 3: Run test to verify it passes** (schema + code written together above)

Run from repo root: `python -m pytest backend/tests/test_schema.py -v`
Expected: PASS. If import fails, add empty `backend/__init__.py` and `backend/tests/__init__.py`.

- [ ] **Step 4: Commit**

```bash
git add backend/
git commit -m "feat(backend): schema and DB helper for vivaad.db"
```

---

### Task 2: Stub seed script (flagship demo pair + AMBER decoy)

**Files:**
- Create: `backend/seed_stub.py`
- Test: `backend/tests/test_seed.py`

**Interfaces:**
- Consumes: `db.get_conn`, `db.init_schema` (Task 1).
- Produces: `seed_stub.seed(conn) -> None`; running `python -m backend.seed_stub` creates the default DB. Parcel IDs `P-001` (GREEN flagship A), `P-002` (RED flagship B), `P-003` (AMBER decoy); case IDs `C-001` (active, real flagship), `C-002` (disposed).

- [ ] **Step 1: Write the failing test**

`backend/tests/test_seed.py`:

```python
from backend.db import get_conn, init_schema
from backend.seed_stub import seed


def make_db(tmp_path):
    conn = get_conn(tmp_path / "t.db")
    init_schema(conn)
    seed(conn)
    return conn


def test_flagship_red_link_exists(tmp_path):
    conn = make_db(tmp_path)
    row = conn.execute(
        "SELECT * FROM parcel_case_link WHERE parcel_id='P-002' AND status='RED'"
    ).fetchone()
    assert row is not None
    assert row["confidence_score"] >= 0.85
    assert row["confidence_band"] == "HIGH"


def test_parcel_a_has_no_links(tmp_path):
    conn = make_db(tmp_path)
    n = conn.execute(
        "SELECT COUNT(*) c FROM parcel_case_link WHERE parcel_id='P-001'"
    ).fetchone()["c"]
    assert n == 0


def test_flagship_case_is_active_with_hearing(tmp_path):
    conn = make_db(tmp_path)
    case = conn.execute("SELECT * FROM court_case WHERE id='C-001'").fetchone()
    assert case["status"] == "active"
    assert case["next_hearing_date"] is not None


def test_sale_event_inside_litigation_window(tmp_path):
    conn = make_db(tmp_path)
    sale = conn.execute(
        "SELECT date FROM land_event WHERE parcel_id='P-002' AND event_type='sale'"
    ).fetchone()
    case = conn.execute("SELECT * FROM court_case WHERE id='C-001'").fetchone()
    assert case["filing_date"] < sale["date"] < case["next_hearing_date"]
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `python -m pytest backend/tests/test_seed.py -v`
Expected: FAIL with `ModuleNotFoundError: backend.seed_stub`.

- [ ] **Step 3: Write the seed script**

`backend/seed_stub.py`:

```python
"""Stub vivaad.db seeder. Mirrors the real Sultanpur flagship case so the
frontend and tests work before the ML pipeline delivers the real DB."""
import json
from backend.db import get_conn, init_schema, db_path


def seed(conn) -> None:
    now = "2026-08-20"
    conn.executemany(
        "INSERT INTO source_record VALUES (?,?,?,?,?)",
        [
            ("SRC-REAL", "real", "Allahabad HC parquet corpus", now, None),
            ("SRC-SYN", "synthetic", "stub seed script", now, None),
            ("SRC-DER", "derived", "hand-set stub links (pipeline replaces)", now, None),
        ],
    )
    conn.executemany(
        "INSERT INTO person VALUES (?,?,?,?,?,?)",
        [
            ("PER-001", "Ramesh Verma", "ramesh verma", "Sohan Lal", "Baraunsa, Sultanpur", "SRC-SYN"),
            ("PER-002", "Shyam Dhar Dubey", "shyamdhar dubey", "Santu", "Madanpur Paniyar, Sultanpur", "SRC-SYN"),
            ("PER-003", "Rakesh Kumar", "rakesh kumar", "Mahesh", "Kurwar, Sultanpur", "SRC-SYN"),
        ],
    )
    conn.executemany(
        "INSERT INTO parcel VALUES (?,?,?,?,?,?,?,?,?,?,?,?)",
        [
            ("P-001", "88", "88", None, "KH-88", "Baraunsa", "Sadar", "Sultanpur",
             "0.5 bigha", None, "PER-001", "SRC-SYN"),
            ("P-002", "153", "153", "1365/1", "KH-153", "Madanpur Paniyar", "Sadar",
             "Sultanpur", "1 bigha", None, "PER-002", "SRC-SYN"),
            ("P-003", "142/3", "142/3", None, "KH-142", "Kurwar", "Sadar", "Sultanpur",
             "0.8 bigha", None, "PER-003", "SRC-SYN"),
        ],
    )
    conn.executemany(
        "INSERT INTO court_case VALUES (?,?,?,?,?,?,?,?,?,?)",
        [
            ("C-001", "WRIB/784/2025", "UPHC020611812025", "Allahabad High Court",
             "consolidation/title", "2025-08-11", "active", "2026-09-12", None, "SRC-REAL"),
            ("C-002", "WRIB/312/2024", "UPHC020412342024", "Allahabad High Court",
             "partition", "2024-03-02", "disposed", None, None, "SRC-REAL"),
        ],
    )
    conn.executemany(
        "INSERT INTO case_party VALUES (?,?,?,?)",
        [
            ("C-001", None, "petitioner", "SHYAMDHAR DUBEY AND 9 OTHERS"),
            ("C-001", None, "respondent", "DEPUTY DIRECTOR OF CONSOLIDATION, SULTANPUR"),
            ("C-002", None, "petitioner", "RAKESH KUMAR"),
            ("C-002", None, "respondent", "STATE OF UP"),
        ],
    )
    conn.executemany(
        "INSERT INTO court_event VALUES (?,?,?,?,?)",
        [
            ("E-001", "C-001", "filed", "2025-08-11", "Writ petition filed"),
            ("E-002", "C-001", "interim_order", "2025-08-22", "Order on consolidation proceedings"),
            ("E-003", "C-001", "hearing", "2026-09-12", "Next hearing"),
            ("E-004", "C-002", "filed", "2024-03-02", None),
            ("E-005", "C-002", "judgment", "2025-01-15", "Disposed"),
        ],
    )
    conn.executemany(
        "INSERT INTO land_event VALUES (?,?,?,?,?)",
        [
            ("LE-001", "P-002", "sale", "2025-11-05", "Sale registered during pendency"),
            ("LE-002", "P-001", "mutation", "2023-06-10", "Routine mutation"),
        ],
    )
    conn.executemany(
        "INSERT INTO parcel_case_link VALUES (?,?,?,?,?,?,?,?)",
        [
            ("L-001", "P-002", "C-001", 0.94, "HIGH",
             json.dumps({"survey_match": "exact", "name_similarity": 0.88,
                         "village_match": True, "father_name_similarity": 0.90,
                         "case_type_relevance": "high"}),
             "RED", now),
            ("L-002", "P-003", "C-002", 0.68, "MEDIUM",
             json.dumps({"survey_match": "normalized", "name_similarity": 0.55,
                         "village_match": True, "father_name_similarity": 0.20,
                         "case_type_relevance": "medium"}),
             "AMBER", now),
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

- [ ] **Step 4: Run tests to verify they pass**

Run: `python -m pytest backend/tests/test_seed.py -v`
Expected: 4 PASS.

- [ ] **Step 5: Build the default DB and commit**

Run: `python -m backend.seed_stub`

```bash
git add backend/seed_stub.py backend/tests/test_seed.py
git commit -m "feat(backend): stub seed with flagship demo pair and AMBER decoy"
```

(Do not commit `data/output/vivaad.db` — regenerable; add `data/output/` to `.gitignore` if not present.)

---

### Task 3: FastAPI app + parcel search/detail endpoints

**Files:**
- Create: `backend/main.py`
- Create: `backend/routers/__init__.py`
- Create: `backend/routers/parcels.py`
- Test: `backend/tests/test_parcels.py`
- Test helper: `backend/tests/conftest.py`

**Interfaces:**
- Consumes: `db.get_conn`, `seed_stub.seed`.
- Produces: FastAPI `app` in `backend.main`; `GET /parcels/search?survey_no=&village=` → `{"results": [{"parcel_id","survey_no","village","taluk","district"}]}`; `GET /parcels/{id}` → parcel dict with `owner_name`, `provenance`. 404 shape: `{"error":"not_found","hint":"check spelling/format"}`.

- [ ] **Step 1: Write the shared test fixture**

`backend/tests/conftest.py`:

```python
import pytest
from fastapi.testclient import TestClient
from backend.db import get_conn, init_schema
from backend.seed_stub import seed


@pytest.fixture()
def client(tmp_path, monkeypatch):
    dbfile = tmp_path / "t.db"
    conn = get_conn(dbfile)
    init_schema(conn)
    seed(conn)
    conn.close()
    monkeypatch.setenv("VIVAAD_DB", str(dbfile))
    from backend.main import app
    return TestClient(app)
```

- [ ] **Step 2: Write the failing tests**

`backend/tests/test_parcels.py`:

```python
def test_search_finds_flagship(client):
    r = client.get("/parcels/search", params={"survey_no": "153", "village": "Madanpur Paniyar"})
    assert r.status_code == 200
    results = r.json()["results"]
    assert any(p["parcel_id"] == "P-002" for p in results)


def test_search_no_match_returns_empty_list(client):
    r = client.get("/parcels/search", params={"survey_no": "999", "village": "Nowhere"})
    assert r.status_code == 200
    assert r.json()["results"] == []


def test_parcel_detail(client):
    r = client.get("/parcels/P-002")
    assert r.status_code == 200
    body = r.json()
    assert body["survey_no"] == "153"
    assert body["owner_name"] == "Shyam Dhar Dubey"
    assert body["provenance"] == "synthetic"


def test_parcel_not_found_shape(client):
    r = client.get("/parcels/P-999")
    assert r.status_code == 404
    assert r.json()["detail"]["error"] == "not_found"
```

- [ ] **Step 3: Run tests to verify they fail**

Run: `python -m pytest backend/tests/test_parcels.py -v`
Expected: FAIL with `ModuleNotFoundError: backend.main`.

- [ ] **Step 4: Implement app and router**

`backend/routers/__init__.py`: empty file.

`backend/routers/parcels.py`:

```python
from fastapi import APIRouter, HTTPException
from backend.db import get_conn

router = APIRouter(prefix="/parcels", tags=["parcels"])

NOT_FOUND = {"error": "not_found", "hint": "check spelling/format"}


@router.get("/search")
def search(survey_no: str = "", village: str = ""):
    conn = get_conn()
    rows = conn.execute(
        """SELECT id, survey_no, village, taluk, district FROM parcel
           WHERE survey_no_norm = ? AND lower(village) = lower(?)""",
        (survey_no.strip().replace("-", "/"), village.strip()),
    ).fetchall()
    return {"results": [
        {"parcel_id": r["id"], "survey_no": r["survey_no"], "village": r["village"],
         "taluk": r["taluk"], "district": r["district"]} for r in rows]}


@router.get("/{parcel_id}")
def detail(parcel_id: str):
    conn = get_conn()
    r = conn.execute(
        """SELECT p.*, per.name AS owner_name, s.source_type AS provenance
           FROM parcel p
           LEFT JOIN person per ON per.id = p.owner_ref
           LEFT JOIN source_record s ON s.id = p.source_id
           WHERE p.id = ?""",
        (parcel_id,),
    ).fetchone()
    if r is None:
        raise HTTPException(404, NOT_FOUND)
    return {
        "parcel_id": r["id"], "survey_no": r["survey_no"], "khasra_no": r["khasra_no"],
        "khata_no": r["khata_no"], "village": r["village"], "taluk": r["taluk"],
        "district": r["district"], "area": r["area"], "geometry": r["geometry"],
        "owner_name": r["owner_name"], "provenance": r["provenance"],
    }
```

`backend/main.py`:

```python
from fastapi import FastAPI
from backend.routers import parcels

app = FastAPI(title="Vivaad Radar API")
app.include_router(parcels.router)
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `python -m pytest backend/tests/test_parcels.py -v`
Expected: 4 PASS.

- [ ] **Step 6: Commit**

```bash
git add backend/main.py backend/routers/ backend/tests/
git commit -m "feat(backend): parcel search and detail endpoints"
```

---

### Task 4: Litigation endpoint (§37 exact shape) + golden-case test

**Files:**
- Modify: `backend/routers/parcels.py` (append endpoint)
- Test: `backend/tests/test_golden_case.py`

**Interfaces:**
- Consumes: `parcel_case_link`, `court_case` tables; router from Task 3.
- Produces: `GET /parcels/{id}/litigation` → `{"parcel_id","status","confidence","links":[{"case_id","case_no","court","case_status","evidence","next_hearing"}]}`. Status logic: worst-case across link rows (RED > AMBER > GREEN); no links → GREEN with empty list and confidence null. **This test doubles as the §62 acceptance gate for every future real DB drop.**

- [ ] **Step 1: Write the failing golden-case test**

`backend/tests/test_golden_case.py`:

```python
def test_parcel_b_is_red_high_confidence(client):
    r = client.get("/parcels/P-002/litigation")
    assert r.status_code == 200
    body = r.json()
    assert body["status"] == "RED"
    assert body["confidence"] >= 0.85
    link = body["links"][0]
    assert link["case_no"] == "WRIB/784/2025"
    assert link["case_status"] == "active"
    assert link["evidence"]["survey_match"] == "exact"
    assert link["next_hearing"] == "2026-09-12"


def test_parcel_a_is_green(client):
    r = client.get("/parcels/P-001/litigation")
    assert r.status_code == 200
    body = r.json()
    assert body["status"] == "GREEN"
    assert body["links"] == []


def test_amber_decoy(client):
    r = client.get("/parcels/P-003/litigation")
    assert r.json()["status"] == "AMBER"
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `python -m pytest backend/tests/test_golden_case.py -v`
Expected: FAIL with 404 (endpoint missing).

- [ ] **Step 3: Implement the endpoint** (append to `backend/routers/parcels.py`)

```python
import json as _json

_RANK = {"RED": 0, "AMBER": 1, "GREEN": 2}


@router.get("/{parcel_id}/litigation")
def litigation(parcel_id: str):
    conn = get_conn()
    if conn.execute("SELECT 1 FROM parcel WHERE id=?", (parcel_id,)).fetchone() is None:
        raise HTTPException(404, NOT_FOUND)
    rows = conn.execute(
        """SELECT l.*, c.case_no, c.court, c.status AS case_status,
                  c.next_hearing_date
           FROM parcel_case_link l JOIN court_case c ON c.id = l.case_id
           WHERE l.parcel_id = ?""",
        (parcel_id,),
    ).fetchall()
    if not rows:
        return {"parcel_id": parcel_id, "status": "GREEN", "confidence": None, "links": []}
    worst = min(rows, key=lambda r: _RANK[r["status"]])
    return {
        "parcel_id": parcel_id,
        "status": worst["status"],
        "confidence": worst["confidence_score"],
        "links": [
            {"case_id": r["case_id"], "case_no": r["case_no"], "court": r["court"],
             "case_status": r["case_status"], "evidence": _json.loads(r["evidence"]),
             "next_hearing": r["next_hearing_date"]}
            for r in rows
        ],
    }
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `python -m pytest backend/tests/test_golden_case.py -v`
Expected: 3 PASS.

- [ ] **Step 5: Commit**

```bash
git add backend/routers/parcels.py backend/tests/test_golden_case.py
git commit -m "feat(backend): litigation endpoint with golden-case acceptance test"
```

---

### Task 5: Case detail endpoint (with events for the timeline)

**Files:**
- Create: `backend/routers/cases.py`
- Modify: `backend/main.py` (register router)
- Test: `backend/tests/test_cases.py`

**Interfaces:**
- Consumes: `court_case`, `case_party`, `court_event` tables.
- Produces: `GET /cases/{id}` → `{"case_id","case_no","cnr","court","case_type","filing_date","status","next_hearing","parties":[{"role","name"}],"events":[{"type","date","note"}]}`. Events sorted by date ascending — the frontend Timeline consumes this order directly.

- [ ] **Step 1: Write the failing test**

`backend/tests/test_cases.py`:

```python
def test_case_detail_flagship(client):
    r = client.get("/cases/C-001")
    assert r.status_code == 200
    body = r.json()
    assert body["cnr"] == "UPHC020611812025"
    assert body["status"] == "active"
    roles = {p["role"] for p in body["parties"]}
    assert {"petitioner", "respondent"} <= roles
    dates = [e["date"] for e in body["events"]]
    assert dates == sorted(dates)


def test_case_not_found(client):
    r = client.get("/cases/C-999")
    assert r.status_code == 404
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `python -m pytest backend/tests/test_cases.py -v`
Expected: FAIL with 404 on both (router not registered).

- [ ] **Step 3: Implement**

`backend/routers/cases.py`:

```python
from fastapi import APIRouter, HTTPException
from backend.db import get_conn
from backend.routers.parcels import NOT_FOUND

router = APIRouter(prefix="/cases", tags=["cases"])


@router.get("/{case_id}")
def detail(case_id: str):
    conn = get_conn()
    c = conn.execute("SELECT * FROM court_case WHERE id=?", (case_id,)).fetchone()
    if c is None:
        raise HTTPException(404, NOT_FOUND)
    parties = conn.execute(
        "SELECT role, name_as_written FROM case_party WHERE case_id=?", (case_id,)
    ).fetchall()
    events = conn.execute(
        "SELECT event_type, date, note FROM court_event WHERE case_id=? ORDER BY date",
        (case_id,),
    ).fetchall()
    return {
        "case_id": c["id"], "case_no": c["case_no"], "cnr": c["cnr"],
        "court": c["court"], "case_type": c["case_type"],
        "filing_date": c["filing_date"], "status": c["status"],
        "next_hearing": c["next_hearing_date"],
        "parties": [{"role": p["role"], "name": p["name_as_written"]} for p in parties],
        "events": [{"type": e["event_type"], "date": e["date"], "note": e["note"]}
                   for e in events],
    }
```

In `backend/main.py` add:

```python
from backend.routers import cases
app.include_router(cases.router)
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `python -m pytest backend/tests/test_cases.py -v`
Expected: 2 PASS.

- [ ] **Step 5: Commit**

```bash
git add backend/routers/cases.py backend/main.py backend/tests/test_cases.py
git commit -m "feat(backend): case detail endpoint with ordered events"
```

---

### Task 6: Dashboard endpoints (overview + heatmap)

**Files:**
- Create: `backend/routers/dashboard.py`
- Modify: `backend/main.py` (register router)
- Test: `backend/tests/test_dashboard.py`

**Interfaces:**
- Consumes: `parcel`, `parcel_case_link`, `court_case` tables.
- Produces: `GET /dashboard/overview` → `{"district","total_parcels","red","amber","green","active_cases"}`; `GET /dashboard/heatmap` → `{"villages":[{"village","red","amber","green","total_links"}]}`. Parcels with no links count as green.

- [ ] **Step 1: Write the failing test**

`backend/tests/test_dashboard.py`:

```python
def test_overview_counts(client):
    body = client.get("/dashboard/overview").json()
    assert body["district"] == "Sultanpur"
    assert body["total_parcels"] == 3
    assert body["red"] == 1
    assert body["amber"] == 1
    assert body["green"] == 1
    assert body["active_cases"] == 1


def test_heatmap_villages(client):
    body = client.get("/dashboard/heatmap").json()
    by_village = {v["village"]: v for v in body["villages"]}
    assert by_village["Madanpur Paniyar"]["red"] == 1
    assert by_village["Baraunsa"]["green"] == 1
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `python -m pytest backend/tests/test_dashboard.py -v`
Expected: FAIL with 404.

- [ ] **Step 3: Implement**

`backend/routers/dashboard.py`:

```python
from fastapi import APIRouter
from backend.db import get_conn

router = APIRouter(prefix="/dashboard", tags=["dashboard"])

PARCEL_STATUS_SQL = """
SELECT p.id, p.village, p.district,
       COALESCE(MIN(CASE l.status WHEN 'RED' THEN 0 WHEN 'AMBER' THEN 1 ELSE 2 END), 2) AS rank
FROM parcel p LEFT JOIN parcel_case_link l ON l.parcel_id = p.id
GROUP BY p.id
"""
STATUS = {0: "red", 1: "amber", 2: "green"}


@router.get("/overview")
def overview():
    conn = get_conn()
    rows = conn.execute(PARCEL_STATUS_SQL).fetchall()
    counts = {"red": 0, "amber": 0, "green": 0}
    for r in rows:
        counts[STATUS[r["rank"]]] += 1
    active = conn.execute(
        "SELECT COUNT(DISTINCT c.id) c FROM court_case c "
        "JOIN parcel_case_link l ON l.case_id = c.id WHERE c.status='active'"
    ).fetchone()["c"]
    district = rows[0]["district"] if rows else None
    return {"district": district, "total_parcels": len(rows),
            **counts, "active_cases": active}


@router.get("/heatmap")
def heatmap():
    conn = get_conn()
    rows = conn.execute(PARCEL_STATUS_SQL).fetchall()
    villages: dict[str, dict] = {}
    for r in rows:
        v = villages.setdefault(
            r["village"],
            {"village": r["village"], "red": 0, "amber": 0, "green": 0, "total_links": 0},
        )
        v[STATUS[r["rank"]]] += 1
    for r in conn.execute(
        "SELECT p.village, COUNT(*) n FROM parcel_case_link l "
        "JOIN parcel p ON p.id = l.parcel_id GROUP BY p.village"
    ):
        villages[r["village"]]["total_links"] = r["n"]
    return {"villages": list(villages.values())}
```

In `backend/main.py` add:

```python
from backend.routers import dashboard
app.include_router(dashboard.router)
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `python -m pytest backend/tests/test_dashboard.py -v`
Expected: 2 PASS.

- [ ] **Step 5: Commit**

```bash
git add backend/routers/dashboard.py backend/main.py backend/tests/test_dashboard.py
git commit -m "feat(backend): dashboard overview and heatmap endpoints"
```

---

### Task 7: Watchlist endpoints (the only write path)

**Files:**
- Create: `backend/routers/watchlist.py`
- Modify: `backend/main.py` (register router)
- Test: `backend/tests/test_watchlist.py`

**Interfaces:**
- Consumes: `watchlist`, `parcel` tables.
- Produces: `POST /watchlist` body `{"parcel_id": "P-002"}` → `{"id","parcel_id","subscribed_at"}` (400 if parcel unknown); `GET /watchlist` → `{"items":[{"id","parcel_id","survey_no","village","subscribed_at","has_update"}]}`. `has_update` is the scripted demo badge (§34) — flipped manually in the DB during the demo, never by real notifications.

- [ ] **Step 1: Write the failing test**

`backend/tests/test_watchlist.py`:

```python
def test_subscribe_and_list(client):
    r = client.post("/watchlist", json={"parcel_id": "P-002"})
    assert r.status_code == 201
    assert r.json()["parcel_id"] == "P-002"
    items = client.get("/watchlist").json()["items"]
    assert len(items) == 1
    assert items[0]["survey_no"] == "153"
    assert items[0]["has_update"] is False


def test_subscribe_unknown_parcel_rejected(client):
    r = client.post("/watchlist", json={"parcel_id": "P-999"})
    assert r.status_code == 400
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `python -m pytest backend/tests/test_watchlist.py -v`
Expected: FAIL with 404.

- [ ] **Step 3: Implement**

`backend/routers/watchlist.py`:

```python
from datetime import date
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from backend.db import get_conn

router = APIRouter(prefix="/watchlist", tags=["watchlist"])


class Subscribe(BaseModel):
    parcel_id: str


@router.post("", status_code=201)
def subscribe(body: Subscribe):
    conn = get_conn()
    if conn.execute("SELECT 1 FROM parcel WHERE id=?", (body.parcel_id,)).fetchone() is None:
        raise HTTPException(400, {"error": "unknown_parcel"})
    today = date.today().isoformat()
    cur = conn.execute(
        "INSERT INTO watchlist (parcel_id, subscribed_at) VALUES (?, ?)",
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
           FROM watchlist w JOIN parcel p ON p.id = w.parcel_id
           ORDER BY w.id"""
    ).fetchall()
    return {"items": [
        {"id": r["id"], "parcel_id": r["parcel_id"], "survey_no": r["survey_no"],
         "village": r["village"], "subscribed_at": r["subscribed_at"],
         "has_update": bool(r["has_update"])} for r in rows]}
```

In `backend/main.py` add:

```python
from backend.routers import watchlist
app.include_router(watchlist.router)
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `python -m pytest backend/tests/test_watchlist.py -v`
Expected: 2 PASS.

- [ ] **Step 5: Commit**

```bash
git add backend/routers/watchlist.py backend/main.py backend/tests/test_watchlist.py
git commit -m "feat(backend): watchlist subscribe and list endpoints"
```

---

### Task 8: Fallback middleware (§73 tier 2) + full smoke test

**Files:**
- Create: `backend/fallback.py`
- Modify: `backend/main.py` (install middleware)
- Test: `backend/tests/test_fallback.py`

**Interfaces:**
- Consumes: the FastAPI `app`; fallback dir `data/output/fallback/` (env override `VIVAAD_FALLBACK_DIR`).
- Produces: any 5xx or unhandled exception → serve `<fallback_dir>/<path with '/'→'_'>.json` if present (e.g. `/parcels/P-002/litigation` → `parcels_P-002_litigation.json`), else `503 {"error":"unavailable"}`. A judge never sees a stack trace.

- [ ] **Step 1: Write the failing test**

`backend/tests/test_fallback.py`:

```python
import json


def test_fallback_serves_cached_json(client, tmp_path, monkeypatch):
    fb = tmp_path / "fallback"
    fb.mkdir()
    payload = {"parcel_id": "P-002", "status": "RED", "confidence": 0.94, "links": []}
    (fb / "parcels_P-002_litigation.json").write_text(json.dumps(payload))
    monkeypatch.setenv("VIVAAD_FALLBACK_DIR", str(fb))
    monkeypatch.setenv("VIVAAD_DB", str(tmp_path / "missing.db"))  # break the DB
    r = client.get("/parcels/P-002/litigation")
    assert r.status_code == 200
    assert r.json()["status"] == "RED"


def test_all_endpoints_smoke(client):
    checks = [
        ("/parcels/search?survey_no=153&village=Madanpur Paniyar", 200),
        ("/parcels/P-002", 200),
        ("/parcels/P-002/litigation", 200),
        ("/cases/C-001", 200),
        ("/dashboard/overview", 200),
        ("/dashboard/heatmap", 200),
        ("/watchlist", 200),
    ]
    for path, expected in checks:
        assert client.get(path).status_code == expected, path
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `python -m pytest backend/tests/test_fallback.py -v`
Expected: first test FAILS (500 or empty-DB error, no fallback); smoke test passes already.

- [ ] **Step 3: Implement**

`backend/fallback.py`:

```python
import os
from pathlib import Path
from starlette.responses import JSONResponse, Response
from backend.db import REPO_ROOT

DEFAULT_FALLBACK = REPO_ROOT / "data" / "output" / "fallback"


def fallback_dir() -> Path:
    return Path(os.environ.get("VIVAAD_FALLBACK_DIR", str(DEFAULT_FALLBACK)))


def install(app) -> None:
    @app.middleware("http")
    async def fallback_middleware(request, call_next):
        try:
            response = await call_next(request)
            if response.status_code < 500:
                return response
        except Exception:
            pass
        name = request.url.path.strip("/").replace("/", "_") + ".json"
        candidate = fallback_dir() / name
        if candidate.exists():
            return Response(candidate.read_bytes(), media_type="application/json")
        return JSONResponse({"error": "unavailable"}, status_code=503)
```

In `backend/main.py` add (after routers):

```python
from backend import fallback
fallback.install(app)
```

- [ ] **Step 4: Run the full suite**

Run: `python -m pytest backend/tests/ -v`
Expected: ALL PASS (schema 1, seed 4, parcels 4, golden 3, cases 2, dashboard 2, watchlist 2, fallback 2 = 20 tests).

- [ ] **Step 5: Run the server manually once**

Run: `python -m backend.seed_stub` then `uvicorn backend.main:app --reload`
Open `http://127.0.0.1:8000/docs` and hit `/parcels/P-002/litigation` — confirm RED 0.94.

- [ ] **Step 6: Commit**

```bash
git add backend/fallback.py backend/main.py backend/tests/test_fallback.py
git commit -m "feat(backend): tier-2 fallback middleware and endpoint smoke test"
```

---

## Handoff notes

- **For the ML guy:** when the real pipeline produces `vivaad.db`, it must satisfy `backend/tests/test_golden_case.py` (run `python -m pytest backend/tests/test_golden_case.py` with `VIVAAD_DB` pointing at his file). That test is the §62 acceptance gate.
- **For the frontend (next plan):** all response shapes are fixed by the tests above; `api/client.ts` types come straight from the Produces blocks.
