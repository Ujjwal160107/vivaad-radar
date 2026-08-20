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
