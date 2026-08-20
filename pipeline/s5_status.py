"""s5 - status engine (PRD 17, 30, 45). Pure rules, no ML.

worst-case wins per parcel. RED needs HIGH band AND an identifier match AND an
active case. Anything incomplete degrades to AMBER, never silently to GREEN -
a false RED harms a seller, and a silent GREEN harms a buyer, so neither is
allowed to happen by omission.
Output: data/intermediate/parcel_status.json
"""
import json
import os

from common import DATA_MID, report

RANK = {"GREEN": 0, "AMBER": 1, "RED": 2}


def link_status(link, case):
    """Status this single link would imply."""
    band = link["confidence_band"]
    ident = link["identifier_match"] != "none"
    active = not bool(case.get("is_final"))
    unknown = case.get("is_final") is None

    if band == "LOW":
        return "GREEN", "below threshold"
    if link["location_unconfirmed"]:
        return "AMBER", "location unconfirmed"        # PRD 45
    if unknown:
        return "AMBER", "case status unknown"         # PRD 30
    if band == "HIGH" and ident and active:
        return "RED", "high confidence, identifier match, active case"
    if band == "HIGH" and ident and not active:
        return "AMBER", "high confidence but case is disposed"
    return "AMBER", "possible connection, verification recommended"


def run():
    norm = json.load(open(os.path.join(DATA_MID, "normalized.json"), encoding="utf-8"))
    links = json.load(open(os.path.join(DATA_MID, "links.json"), encoding="utf-8"))
    cases = {c["cnr"]: c for c in norm["cases"]}

    per_parcel = {p["parcel_id"]: [] for p in norm["parcels"]}
    for l in links:
        if l["confidence_band"] == "LOW":
            continue
        case = cases[l["cnr"]]
        st, why = link_status(l, case)
        per_parcel[l["parcel_id"]].append({**l, "status": st, "reason": why,
                                           "case_active": not bool(case.get("is_final"))})

    out = []
    for pid, ls in per_parcel.items():
        if not ls:
            out.append({"parcel_id": pid, "status": "GREEN", "confidence": 0.0,
                        "note": "No matching active litigation found in available records",
                        "closed_history": False, "links": []})
            continue
        ls.sort(key=lambda x: -x["confidence_score"])
        worst = max(ls, key=lambda x: (RANK[x["status"]], x["confidence_score"]))
        status = worst["status"]
        # PRD 30: a closed high-confidence link with nothing active is GREEN,
        # but the history is never hidden.
        closed_hist = (status != "RED"
                       and any(x["confidence_band"] == "HIGH" and not x["case_active"]
                               for x in ls))
        note = None
        if status == "GREEN":
            note = "No matching active litigation found in available records"
        elif status == "AMBER":
            note = "Possible connection - verification recommended"
        else:
            note = "High-confidence litigation connection found"
        if closed_hist:
            note += "; closed litigation history on record"
        out.append({
            "parcel_id": pid, "status": status,
            "confidence": worst["confidence_score"], "note": note,
            "closed_history": closed_hist, "reason": worst["reason"],
            "links": ls,
        })

    with open(os.path.join(DATA_MID, "parcel_status.json"), "w", encoding="utf-8") as fh:
        json.dump(out, fh, indent=1)

    counts = {s: sum(1 for x in out if x["status"] == s) for s in ("RED", "AMBER", "GREEN")}
    flag = next(x for x in out if x["parcel_id"] == "P-B01")
    clean = next(x for x in out if x["parcel_id"] == "P-A01")
    report("s5", {
        "parcels": len(out), "status_counts": counts,
        "with_closed_history": sum(1 for x in out if x["closed_history"]),
        "flagship_P-B01": flag["status"] + " @ " + str(flag["confidence"]),
        "clean_P-A01": clean["status"],
    })


if __name__ == "__main__":
    run()
