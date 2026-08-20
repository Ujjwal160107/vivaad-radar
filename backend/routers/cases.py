from fastapi import APIRouter, HTTPException
from backend.db import get_conn
from backend.routers.parcels import NOT_FOUND

router = APIRouter(prefix="/cases", tags=["cases"])


@router.get("/{case_id}")
def detail(case_id: str):
    conn = get_conn()
    c = conn.execute("SELECT * FROM court_case WHERE id=?", (case_id,)).fetchone()
    if c is None:
        raise HTTPException(404, NOT_FOUND)
    parties = conn.execute(
        "SELECT role, name_as_written FROM case_party WHERE case_id=?", (case_id,)
    ).fetchall()
    events = conn.execute(
        "SELECT event_type, date, note FROM court_event WHERE case_id=? ORDER BY date",
        (case_id,),
    ).fetchall()
    return {
        "case_id": c["id"], "case_no": c["case_no"], "cnr": c["cnr"],
        "court": c["court"], "case_type": c["case_type"],
        "filing_date": c["filing_date"], "status": c["status"],
        "next_hearing": c["next_hearing_date"],
        "parties": [{"role": p["role"], "name": p["name_as_written"]} for p in parties],
        "events": [{"type": e["event_type"], "date": e["date"], "note": e["note"]}
                   for e in events],
    }
