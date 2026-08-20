"""s4 - pairwise feature scoring (PRD 27, 28).

Weights are the PRD's hackathon-initial values and are explicitly labelled
unvalidated starting points, not calibrated constants.

Two judgement calls worth knowing about:

1. Missing features are redistributed, not scored zero. Only 6 of 38 cases state
   a patronymic, so scoring the absent 0.15 as 0 would systematically depress
   every case that simply did not write "s/o" - punishing a data artefact as if
   it were evidence. The weight is renormalised over the features that exist.
2. The identifier feature recognises sub-division kinship: a court citing gata
   153 against a land record holding 153/1 is a partial match (0.6), not a miss.
   That is the PRD's own "45/1" story (PRD 4, 30).

Output: data/intermediate/links.json
"""
import json
import os

from rapidfuzz import fuzz

from common import CASE_TYPE_RELEVANCE, DATA_MID, HIGH, MEDIUM, WEIGHTS, report


def _identifier(case_surveys, parcel_surveys):
    """-> (score, evidence_label)"""
    cs, ps = set(case_surveys or []), set(parcel_surveys or [])
    if cs & ps:
        return 1.0, "exact"
    for a in cs:
        for b in ps:
            # 153 vs 153/1 - parent/child after partition
            if a.split("/")[0] == b.split("/")[0] and a.split("/")[0]:
                return 0.6, "subdivision"
    return 0.0, "none"


def _name(case, parcel):
    owner = parcel.get("owner_norm")
    if not owner:
        return None
    best = 0.0
    for side in (case.get("petitioner_norm"), case.get("respondent_norm")):
        if side:
            best = max(best, fuzz.token_set_ratio(side, owner) / 100.0,
                       fuzz.token_sort_ratio(side, owner) / 100.0)
    return best


def _father(case, parcel):
    a, b = case.get("father_norm"), parcel.get("owner_father_norm")
    if not a or not b:
        return None
    return fuzz.ratio(a, b) / 100.0


def _village(case, parcel):
    if case.get("village_canon") and case["village_canon"] == parcel.get("village_canon"):
        return 1.0
    if case.get("taluk_norm") and case["taluk_norm"] == parcel.get("taluk_norm"):
        return 0.5
    return 0.0


def score_pair(case, parcel):
    ident, ident_label = _identifier(case.get("survey_norms"), parcel.get("survey_norms"))
    feats = {
        "identifier": ident,
        "name": _name(case, parcel),
        "father_name": _father(case, parcel),
        "village": _village(case, parcel),
        "case_type": CASE_TYPE_RELEVANCE.get(case.get("case_type"), 0.5),
    }
    present = {k: v for k, v in feats.items() if v is not None}
    total_w = sum(WEIGHTS[k] for k in present) or 1.0
    score = sum(v * WEIGHTS[k] for k, v in present.items()) / total_w

    evidence = {
        "survey_match": ident_label,
        "name_similarity": round(feats["name"], 3) if feats["name"] is not None else None,
        "father_name_similarity": (round(feats["father_name"], 3)
                                   if feats["father_name"] is not None else None),
        "village_match": feats["village"] == 1.0,
        "taluk_match": feats["village"] == 0.5,
        "case_type_relevance": feats["case_type"],
        "weights_used": {k: WEIGHTS[k] for k in present},
        "features_absent": [k for k in feats if feats[k] is None],
    }
    return score, ident_label, evidence


def band_of(score, ident_label):
    """PRD 28. HIGH additionally requires an identifier match."""
    if score >= HIGH and ident_label != "none":
        return "HIGH"
    if score >= MEDIUM:
        return "MEDIUM"
    return "LOW"


def run():
    norm = json.load(open(os.path.join(DATA_MID, "normalized.json"), encoding="utf-8"))
    cands = json.load(open(os.path.join(DATA_MID, "candidates.json"), encoding="utf-8"))
    cases = {c["cnr"]: c for c in norm["cases"]}
    parcels = {p["parcel_id"]: p for p in norm["parcels"]}

    links = []
    for pair in cands:
        c, p = cases[pair["cnr"]], parcels[pair["parcel_id"]]
        score, ident_label, evidence = score_pair(c, p)
        evidence["block"] = pair["block"]
        evidence["location_unconfirmed"] = pair["location_unconfirmed"]
        links.append({
            "cnr": pair["cnr"], "parcel_id": pair["parcel_id"],
            "confidence_score": round(score, 4),
            "confidence_band": band_of(score, ident_label),
            "identifier_match": ident_label,
            "location_unconfirmed": pair["location_unconfirmed"],
            "evidence": evidence,
        })

    kept = [l for l in links if l["confidence_band"] != "LOW"]
    with open(os.path.join(DATA_MID, "links.json"), "w", encoding="utf-8") as fh:
        json.dump(links, fh, indent=1)

    bands = {b: sum(1 for l in links if l["confidence_band"] == b)
             for b in ("HIGH", "MEDIUM", "LOW")}
    report("s4", {
        "pairs_scored": len(links), "bands": bands,
        "surfaced_links": len(kept),
        "identifier_exact": sum(1 for l in links if l["identifier_match"] == "exact"),
        "identifier_subdivision": sum(1 for l in links if l["identifier_match"] == "subdivision"),
        "weights": WEIGHTS,
    })


if __name__ == "__main__":
    run()
