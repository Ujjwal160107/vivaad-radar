"""Shared paths, provenance labels and IO helpers for the offline build.

Everything in this package runs BEFORE the demo (Excalidraw offline boundary,
PRD 36/48/49). Nothing here may be imported by request-time code.
"""
import json
import os

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA_IN = os.path.join(ROOT, "data", "input")
DATA_MID = os.path.join(ROOT, "data", "intermediate")
DATA_OUT = os.path.join(ROOT, "data", "output")
FALLBACK = os.path.join(DATA_OUT, "fallback")
DB = os.path.join(DATA_OUT, "vivaad.db")

DISTRICT = "Sultanpur"
FLAGSHIP_CNR = "UPHC020611812025"          # WRIB/784/2025, active, gata 153 + 1365/1
SEED = 20260820

# PRD 21 - every row must be traceable to exactly one of these.
PROVENANCE = {"real", "synthetic", "mocked", "derived", "model_generated", "cached"}

# PRD 27 - hackathon-initial weights, explicitly unvalidated starting points.
WEIGHTS = {
    "identifier": 0.40,
    "name": 0.25,
    "father_name": 0.15,
    "village": 0.10,
    "case_type": 0.10,
}

# PRD 28 bands.
HIGH, MEDIUM = 0.85, 0.60

# PRD 29 - dispute types weighted for matching relevance.
CASE_TYPE_RELEVANCE = {
    "partition": 1.0, "title_declaration": 1.0, "boundary_demarcation": 1.0,
    "encroachment": 1.0, "specific_performance": 0.9, "succession_inheritance": 0.9,
    "mutation_revenue_record": 0.9, "consolidation_chak": 0.8, "possession": 0.8,
    "injunction": 0.7, "sale_deed_transfer": 0.7, "tenancy": 0.6,
    "acquisition_compensation": 0.6,
}


def report(stage, payload):
    """Write a per-stage report; these feed the PRD 53 technical story."""
    os.makedirs(DATA_MID, exist_ok=True)
    path = os.path.join(DATA_MID, f"{stage}_report.json")
    with open(path, "w", encoding="utf-8") as fh:
        json.dump(payload, fh, indent=2, default=str)
    bits = ", ".join(f"{k}={v}" for k, v in payload.items()
                     if isinstance(v, (int, float, str)))
    print(f"[{stage}] {bits}")


class ContractError(Exception):
    """Raised by s1 when the handoff contract is violated. Fail loudly."""
