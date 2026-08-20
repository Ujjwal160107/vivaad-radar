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
