"""s7 - render every PRD 37 endpoint response to data/output/fallback/.

Tier 2 of the reliability ladder (PRD 73): if the DB is missing or a query
fails, the backend middleware serves these files at the same URLs and the
frontend never knows. Tier 3 flagship payloads are written separately so the
demo renders with no DB and no network at all.

Filenames are flat and URL-derived so the middleware can map a request path to
a file with one replace.
"""
import json
import os
import sqlite3

from common import DB, FALLBACK, FLAGSHIP_CNR, report


def _rows(con, sql, args=()):
    cur = con.execute(sql, args)
    cols = [d[0] for d in cur.description]
    return [dict(zip(cols, r)) for r in cur.fetchall()]


def _write(name, payload):
    path = os.path.join(FALLBACK, name)
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, "w", encoding="utf-8") as fh:
        json.dump(payload, fh, ensure_ascii=False, indent=1)


def parcel_payload(con, pid):
    p = _rows(con, "SELECT * FROM Parcel WHERE id=?", (pid,))
    if not p:
        return None
    p = p[0]
    owner = _rows(con, "SELECT name, father_name FROM Person WHERE id=?",
                  (p["owner_ref"],))
    p["owner"] = owner[0] if owner else None
    p["geometry"] = json.loads(p["geometry"]) if p["geometry"] else None
    p["land_events"] = json.loads(p["land_events"] or "[]")
    return p


def litigation_payload(con, pid):
    """Exactly the PRD 37 documented response shape."""
    p = _rows(con, "SELECT id,status,confidence,note,closed_history FROM Parcel WHERE id=?",
              (pid,))[0]
    links = _rows(con, """
        SELECT l.case_id, l.confidence_score, l.confidence_band, l.identifier_match,
               l.evidence, l.status AS link_status, l.reason,
               c.case_no, c.court, c.status AS case_status, c.filing_date,
               c.order_date, c.next_hearing_date, c.case_type, c.raw_text_ref
        FROM ParcelCaseLink l JOIN CourtCase c ON c.id = l.case_id
        WHERE l.parcel_id = ? ORDER BY l.confidence_score DESC""", (pid,))
    for l in links:
        l["evidence"] = json.loads(l["evidence"])
    return {
        "parcel_id": p["id"], "status": p["status"],
        "confidence": p["confidence"], "note": p["note"],
        "closed_history": bool(p["closed_history"]),
        "links": [{
            "case_id": l["case_id"], "case_no": l["case_no"], "court": l["court"],
            "case_type": l["case_type"], "case_status": l["case_status"],
            "confidence": l["confidence_score"], "band": l["confidence_band"],
            "link_status": l["link_status"], "reason": l["reason"],
            "evidence": l["evidence"], "filing_date": l["filing_date"],
            "order_date": l["order_date"], "next_hearing": l["next_hearing_date"],
            "raw_text_ref": l["raw_text_ref"],
        } for l in links],
    }


def case_payload(con, cid):
    c = _rows(con, "SELECT * FROM CourtCase WHERE id=?", (cid,))
    if not c:
        return None
    c = c[0]
    c["parties"] = _rows(con, "SELECT role, name_as_written FROM CaseParty WHERE case_id=?",
                         (cid,))
    c["events"] = _rows(con, "SELECT event_type, date, note FROM CourtEvent "
                             "WHERE case_id=? ORDER BY date", (cid,))
    c["linked_parcels"] = _rows(con, "SELECT parcel_id, confidence_score, status "
                                     "FROM ParcelCaseLink WHERE case_id=? "
                                     "ORDER BY confidence_score DESC", (cid,))
    return c


def run():
    os.makedirs(FALLBACK, exist_ok=True)
    con = sqlite3.connect(DB)
    parcels = _rows(con, "SELECT id, survey_no, khasra_no, khata_no, village, "
                         "village_canon, taluk, status, confidence FROM Parcel")
    cases = _rows(con, "SELECT id FROM CourtCase")

    # GET /parcels/search - one index the middleware can filter in memory
    _write("parcels_search.json", {"parcels": parcels})

    n = 0
    for p in parcels:
        _write("parcels/" + p["id"] + ".json", parcel_payload(con, p["id"]))
        _write("parcels/" + p["id"] + "/litigation.json",
               litigation_payload(con, p["id"]))
        n += 2
    for c in cases:
        _write("cases/" + c["id"] + ".json", case_payload(con, c["id"]))
        n += 1

    # GET /dashboard/overview
    counts = {s: sum(1 for p in parcels if p["status"] == s)
              for s in ("RED", "AMBER", "GREEN")}
    overview = {
        "district": "Sultanpur",
        "parcels": len(parcels), "cases": len(cases),
        "status_counts": counts,
        "active_cases": _rows(con, "SELECT COUNT(*) n FROM CourtCase WHERE status='active'")[0]["n"],
        "high_confidence_links": _rows(con, "SELECT COUNT(*) n FROM ParcelCaseLink "
                                            "WHERE confidence_band='HIGH'")[0]["n"],
        "possible_matches": _rows(con, "SELECT COUNT(*) n FROM ParcelCaseLink "
                                       "WHERE confidence_band='MEDIUM'")[0]["n"],
    }
    _write("dashboard_overview.json", overview)

    # GET /dashboard/heatmap - village-level litigation density
    agg = {}
    for p in parcels:
        v = p["village_canon"] or "unknown"
        a = agg.setdefault(v, {"village": p["village"], "village_canon": v,
                               "parcels": 0, "RED": 0, "AMBER": 0, "GREEN": 0})
        a["parcels"] += 1
        a[p["status"]] += 1
    for a in agg.values():
        a["density"] = round((a["RED"] * 2 + a["AMBER"]) / (a["parcels"] * 2), 3)
    _write("dashboard_heatmap.json",
           {"villages": sorted(agg.values(), key=lambda x: -x["density"])})

    _write("watchlist.json", {"items": []})

    # tier 3 - the flagship pair, bundled into the frontend
    _write("flagship.json", {
        "parcel_b": {"parcel": parcel_payload(con, "P-B01"),
                     "litigation": litigation_payload(con, "P-B01")},
        "parcel_a": {"parcel": parcel_payload(con, "P-A01"),
                     "litigation": litigation_payload(con, "P-A01")},
        "case": case_payload(con, FLAGSHIP_CNR),
    })
    con.close()

    report("s7", {"files_written": n + 5, "parcels": len(parcels),
                  "cases": len(cases), "status_counts": counts,
                  "villages_in_heatmap": len(agg), "dir": FALLBACK})


if __name__ == "__main__":
    run()
