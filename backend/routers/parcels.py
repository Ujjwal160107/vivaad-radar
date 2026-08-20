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


# Unknown statuses from a foreign-built DB rank as AMBER-equivalent (1), never RED.
_RANK = {"RED": 0, "AMBER": 1, "GREEN": 2}
_UNKNOWN_RANK = 1


def _parse_evidence(raw):
    if raw is None:
        return None
    try:
        return json.loads(raw)
    except (ValueError, TypeError):
        return raw


@router.get("/{parcel_id}/litigation")
def litigation(parcel_id: str):
    conn = get_conn()
    if conn.execute("SELECT 1 FROM parcel WHERE id=?", (parcel_id,)).fetchone() is None:
        raise HTTPException(404, NOT_FOUND)
    rows = conn.execute(
        """SELECT l.*, c.case_no, c.court, c.status AS case_status,
                  c.next_hearing_date
           FROM parcel_case_link l JOIN court_case c ON c.id = l.case_id
           WHERE l.parcel_id = ?
           ORDER BY CASE l.status
                        WHEN 'RED' THEN 0 WHEN 'AMBER' THEN 1 WHEN 'GREEN' THEN 2
                        ELSE 1 END,
                    l.confidence_score DESC, l.case_id""",
        (parcel_id,),
    ).fetchall()
    if not rows:
        return {"parcel_id": parcel_id, "status": "GREEN", "confidence": None, "links": []}
    worst = min(rows, key=lambda r: _RANK.get(r["status"], _UNKNOWN_RANK))
    return {
        "parcel_id": parcel_id,
        "status": worst["status"],
        "confidence": worst["confidence_score"],
        "links": [
            {"case_id": r["case_id"], "case_no": r["case_no"], "court": r["court"],
             "case_status": r["case_status"], "evidence": _parse_evidence(r["evidence"]),
             "next_hearing": r["next_hearing_date"]}
            for r in rows
        ],
    }
