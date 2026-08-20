from datetime import date
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from backend.db import get_conn

router = APIRouter(prefix="/watchlist", tags=["watchlist"])


class Subscribe(BaseModel):
    parcel_id: str


@router.post("", status_code=201)
def subscribe(body: Subscribe):
    conn = get_conn()
    if conn.execute("SELECT 1 FROM parcel WHERE id=?", (body.parcel_id,)).fetchone() is None:
        raise HTTPException(400, {"error": "unknown_parcel"})
    today = date.today().isoformat()
    cur = conn.execute(
        "INSERT INTO watchlist (parcel_id, subscribed_at) VALUES (?, ?)",
        (body.parcel_id, today),
    )
    conn.commit()
    return {"id": cur.lastrowid, "parcel_id": body.parcel_id, "subscribed_at": today}


@router.get("")
def list_watchlist():
    conn = get_conn()
    rows = conn.execute(
        """SELECT w.id, w.parcel_id, w.subscribed_at, w.has_update,
                  p.survey_no, p.village
           FROM watchlist w JOIN parcel p ON p.id = w.parcel_id
           ORDER BY w.id"""
    ).fetchall()
    return {"items": [
        {"id": r["id"], "parcel_id": r["parcel_id"], "survey_no": r["survey_no"],
         "village": r["village"], "subscribed_at": r["subscribed_at"],
         "has_update": bool(r["has_update"])} for r in rows]}
