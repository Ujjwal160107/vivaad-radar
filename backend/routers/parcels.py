import json

from fastapi import APIRouter, HTTPException
from backend.db import get_conn
from backend.normalize import norm_survey, norm_place

router = APIRouter(prefix="/parcels", tags=["parcels"])

NOT_FOUND = {"error": "not_found", "hint": "check spelling/format"}

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
            evidence = json.loads(r["evidence"])
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
