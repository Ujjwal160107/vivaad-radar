"""s2 - normalization + village gazetteer (PRD 26.1, 25).

This is where the divergence injected by s0 gets undone: 1365-1 and 1365/1
become one key, Panyar and Paniyar collapse to one village, and SHYAMDHAR DUBEY
and Shyam Dhar Dubey normalize toward each other.
Output: data/intermediate/normalized.json
"""
import json
import os
import re
import unicodedata

from rapidfuzz import fuzz

from common import DATA_MID, report

HONORIFICS = {"smt", "shri", "sri", "ms", "mr", "mrs", "dr", "late", "m/s"}
PAT = re.compile(r"(s/o|son of|d/o|daughter of|w/o|wife of)", re.I)


def norm_survey(pid):
    """1365-1, 1365 / 1, 4095M -> 1365/1, 1365/1, 4095m"""
    if not pid:
        return None
    s = unicodedata.normalize("NFKC", str(pid)).strip().lower()
    s = re.sub(r"\s+", "", s)
    s = re.sub(r"[-_]", "/", s)
    s = re.sub(r"/+", "/", s).strip("/.")
    return s or None


def norm_name(name):
    if not name:
        return None
    s = unicodedata.normalize("NFKC", str(name)).lower()
    s = PAT.sub(" s/o ", s)
    s = re.sub(r"[^a-z0-9/ ]+", " ", s)
    toks = [t for t in s.split() if t and t not in HONORIFICS]
    return " ".join(toks) or None


def norm_place(v):
    if not v:
        return None
    s = unicodedata.normalize("NFKC", str(v)).lower()
    return re.sub(r"\s+", " ", re.sub(r"[^a-z ]+", " ", s)).strip() or None


def father_from(relation):
    """'Santu s/o Bhola.' -> 'bhola'"""
    if not relation:
        return None
    parts = PAT.split(str(relation))
    return norm_name(parts[-1]) if len(parts) > 1 else None


def build_gazetteer(values, threshold=82):
    forms = sorted({v for v in values if v}, key=lambda x: (-len(x), x))
    canon, mapping = [], {}
    for f in forms:
        hit = next((c for c in canon
                    if fuzz.token_set_ratio(f, c) >= threshold
                    or fuzz.ratio(f, c) >= threshold), None)
        if hit is None:
            canon.append(f)
            hit = f
        mapping[f] = hit
    return mapping, canon


def run():
    cases = json.load(open(os.path.join(DATA_MID, "cases.json"), encoding="utf-8"))
    parcels = json.load(open(os.path.join(DATA_MID, "parcels.json"), encoding="utf-8"))

    for c in cases:
        c["survey_norms"] = [norm_survey(s) for s in (c.get("extracted_survey_nos") or [])]
        c["survey_norms"] = [s for s in c["survey_norms"] if s]
        c["village_norm"] = norm_place(c.get("extracted_village"))
        c["taluk_norm"] = norm_place(c.get("extracted_taluk"))
        c["petitioner_norm"] = norm_name(c.get("petitioner_raw"))
        c["respondent_norm"] = norm_name(c.get("respondent_raw"))
        c["father_norm"] = father_from(c.get("extracted_relation"))

    for p in parcels:
        # a parcel may carry its number under any of the three UP field names
        p["survey_norms"] = sorted({s for s in (
            norm_survey(p.get("survey_no")), norm_survey(p.get("khasra_no")),
            norm_survey(p.get("khata_no"))) if s})
        p["village_norm"] = norm_place(p.get("village"))
        p["taluk_norm"] = norm_place(p.get("taluk"))
        p["owner_norm"] = norm_name(p.get("owner_name"))
        p["owner_father_norm"] = norm_name(p.get("owner_father_name"))

    mapping, canon = build_gazetteer(
        [c["village_norm"] for c in cases] + [p["village_norm"] for p in parcels])
    for row in cases + parcels:
        row["village_canon"] = mapping.get(row["village_norm"])

    out = {"cases": cases, "parcels": parcels,
           "gazetteer": {"canonical": canon, "mapping": mapping}}
    with open(os.path.join(DATA_MID, "normalized.json"), "w", encoding="utf-8") as fh:
        json.dump(out, fh, ensure_ascii=False, indent=1)

    collapses = {k: v for k, v in mapping.items() if k != v}
    report("s2", {
        "villages_surface": len(mapping), "villages_canonical": len(canon),
        "collapsed": len(collapses), "sample_collapse": list(collapses.items())[:3],
        "cases_with_survey": sum(1 for c in cases if c["survey_norms"]),
        "cases_with_father": sum(1 for c in cases if c["father_norm"]),
        "parcels_with_survey": sum(1 for p in parcels if p["survey_norms"]),
    })


if __name__ == "__main__":
    run()
