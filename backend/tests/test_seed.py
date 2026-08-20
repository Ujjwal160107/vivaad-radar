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
