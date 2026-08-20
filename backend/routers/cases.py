from fastapi import APIRouter, HTTPException
from backend.db import get_conn
from backend.routers.parcels import NOT_FOUND

router = APIRouter(prefix="/cases", tags=["cases"])


@router.get("/{case_id}")
def detail(case_id: str):
    conn = get_conn()
    c = conn.execute("SELECT * FROM CourtCase WHERE id=?", (case_id,)).fetchone()
    if c is None:
        raise HTTPException(404, NOT_FOUND)
    body = dict(c)
    body["parties"] = [dict(r) for r in conn.execute(
        "SELECT role, name_as_written FROM CaseParty WHERE case_id=?", (case_id,))]
    body["events"] = [dict(r) for r in conn.execute(
        "SELECT event_type, date, note FROM CourtEvent WHERE case_id=? ORDER BY date",
        (case_id,))]
    body["linked_parcels"] = [dict(r) for r in conn.execute(
        "SELECT parcel_id, confidence_score, status FROM ParcelCaseLink"
        " WHERE case_id=? ORDER BY confidence_score DESC", (case_id,))]
    return body
