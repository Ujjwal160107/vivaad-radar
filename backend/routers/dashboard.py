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
