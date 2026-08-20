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
