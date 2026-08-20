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
