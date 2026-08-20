import json as _json

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
