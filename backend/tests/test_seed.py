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
