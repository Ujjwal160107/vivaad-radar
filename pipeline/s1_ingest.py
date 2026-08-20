"""s1 - read both parquets, validate the contract, tag provenance. Fail loudly.

A silently half-built DB the night before a demo is worse than no DB, so every
violation raises at build time rather than surfacing at demo time.
Outputs: data/intermediate/cases.json, parcels.json
"""
import json
import os

import pandas as pd
import pyarrow.parquet as pq

from common import (DATA_IN, DATA_MID, DISTRICT, FLAGSHIP_CNR, PROVENANCE,
                    ContractError, report)

CASE_COLS = ["cnr", "case_no", "case_type", "court", "filing_date", "order_date",
             "next_hearing_date", "next_hearing_source", "is_final",
             "petitioner_raw", "respondent_raw",
             "extracted_survey_nos", "extracted_village", "extracted_taluk",
             "extracted_district", "extracted_relation", "raw_text_ref",
             "source_label"]
PARCEL_COLS = ["parcel_id", "survey_no", "khasra_no", "khata_no", "village",
               "taluk", "district", "owner_name", "owner_father_name", "area",
               "geometry", "land_events", "source_label"]


def _load(fname, cols):
    path = os.path.join(DATA_IN, fname)
    if not os.path.exists(path):
        raise ContractError("missing contract file: " + fname)
    df = pq.read_table(path).to_pandas()
    missing = [c for c in cols if c not in df.columns]
    if missing:
        raise ContractError(fname + " missing columns: " + str(missing))
    if df.source_label.isna().any():
        raise ContractError(fname + " has rows with no provenance label")
    bad = set(df.source_label.dropna().unique()) - PROVENANCE
    if bad:
        raise ContractError(fname + " bad provenance labels: " + str(bad))
    return df


def run():
    cases = _load("cases.parquet", CASE_COLS)
    parcels = _load("parcels.parquet", PARCEL_COLS)

    if cases.cnr.duplicated().any():
        raise ContractError("cases.cnr is not unique - it is the primary key")
    if parcels.parcel_id.duplicated().any():
        raise ContractError("parcels.parcel_id is not unique")
    for name, df, col in (("cases", cases, "extracted_district"),
                          ("parcels", parcels, "district")):
        stray = set(pd.Series(df[col]).dropna().unique()) - {DISTRICT}
        if stray:
            raise ContractError(name + " has rows outside " + DISTRICT + ": " + str(stray))

    # A disposed case carrying a future hearing is the most obvious tell that
    # dates were invented, so it is a build-time failure (handoff B1).
    bad = cases[cases.is_final.astype(bool) & cases.next_hearing_date.notna()]
    if len(bad):
        raise ContractError("disposed cases carry a next_hearing_date: "
                            + str(list(bad.cnr)[:3]))
    derived = cases[cases.next_hearing_date.notna()]
    if not derived.empty and set(derived.next_hearing_source.dropna()) - {"derived", "real"}:
        raise ContractError("next_hearing_source must be 'derived' or 'real'")

    # demo-critical rows (PRD 50). Without these the flagship cannot fire.
    if FLAGSHIP_CNR not in set(cases.cnr):
        raise ContractError("flagship case absent: " + FLAGSHIP_CNR)
    for pid in ("P-A01", "P-B01"):
        if pid not in set(parcels.parcel_id):
            raise ContractError("flagship parcel absent: " + pid)

    # contract requirement 3: a sale inside the flagship pendency window
    fl = cases[cases.cnr == FLAGSHIP_CNR].iloc[0]
    pb = parcels[parcels.parcel_id == "P-B01"].iloc[0]
    lo = pd.Timestamp(fl.filing_date)
    hi = pd.Timestamp(fl.next_hearing_date) if fl.next_hearing_date else pd.Timestamp("2026-08-20")
    events = list(pb.land_events) if pb.land_events is not None else []
    sales = [e for e in events
             if e.get("type") == "sale" and lo <= pd.Timestamp(e["date"]) <= hi]
    if not sales:
        raise ContractError("no sale event inside the flagship pendency window - "
                            "the timeline beat (PRD 51 step 4) would be empty")

    os.makedirs(DATA_MID, exist_ok=True)
    for name, df in (("cases", cases), ("parcels", parcels)):
        recs = json.loads(df.to_json(orient="records", date_format="iso"))
        with open(os.path.join(DATA_MID, name + ".json"), "w", encoding="utf-8") as fh:
            json.dump(recs, fh, ensure_ascii=False, indent=1)

    report("s1", {
        "cases": len(cases), "parcels": len(parcels), "district": DISTRICT,
        "active_cases": int((~cases.is_final.astype(bool)).sum()),
        "disposed_cases": int(cases.is_final.astype(bool).sum()),
        "cases_with_village": int(cases.extracted_village.notna().sum()),
        "cases_with_relation": int(cases.extracted_relation.notna().sum()),
        "filing_span": [str(cases.filing_date.min()), str(cases.filing_date.max())],
        "max_pendency_years": round(float(
            (pd.Timestamp("2026-08-21") - pd.to_datetime(cases.filing_date).min()).days / 365.25), 2),
        "next_hearing_derived": int(cases.next_hearing_date.notna().sum()),
        "next_hearing_real": int((cases.next_hearing_source == "real").sum()),
        "flagship_sale_in_window": sales[0]["date"],
        "provenance": sorted(set(cases.source_label) | set(parcels.source_label)),
        "contract": "ok",
    })


if __name__ == "__main__":
    run()
