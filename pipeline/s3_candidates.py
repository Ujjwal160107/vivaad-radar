"""s3 - candidate generation by village blocking (PRD 26.2).

Blocking keeps this out of O(n^2). Primary block is the canonical village. A
case with no extracted village blocks district-wide instead and is flagged
location_unconfirmed, which s5 uses to cap status at AMBER (PRD 45).
Output: data/intermediate/candidates.json
"""
import json
import os
from collections import defaultdict

from common import DATA_MID, report


def run():
    norm = json.load(open(os.path.join(DATA_MID, "normalized.json"), encoding="utf-8"))
    cases, parcels = norm["cases"], norm["parcels"]

    by_village = defaultdict(list)
    for p in parcels:
        by_village[p["village_canon"]].append(p)

    pairs = []
    for c in cases:
        vc = c.get("village_canon")
        if vc and vc in by_village:
            cand, block, unconfirmed = by_village[vc], "village", False
        else:
            cand, block, unconfirmed = parcels, "district", True
        for p in cand:
            pairs.append({
                "cnr": c["cnr"], "parcel_id": p["parcel_id"],
                "block": block, "location_unconfirmed": unconfirmed,
            })

    with open(os.path.join(DATA_MID, "candidates.json"), "w", encoding="utf-8") as fh:
        json.dump(pairs, fh, indent=1)

    report("s3", {
        "cases": len(cases), "parcels": len(parcels), "candidate_pairs": len(pairs),
        "via_village_block": sum(1 for x in pairs if x["block"] == "village"),
        "via_district_fallback": sum(1 for x in pairs if x["block"] == "district"),
        "full_cross_join_would_be": len(cases) * len(parcels),
    })


if __name__ == "__main__":
    run()
