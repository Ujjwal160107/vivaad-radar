"""Golden-case test - automates PRD 62's acceptance criterion.

Run after every data drop. If these fail, the demo is broken regardless of what
the UI looks like.

    python -m pytest tests/ -q
"""
import json
import os
import sqlite3

import pytest

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DB = os.path.join(ROOT, "data", "output", "vivaad.db")
FALLBACK = os.path.join(ROOT, "data", "output", "fallback")
FLAGSHIP_CNR = "UPHC020611812025"


@pytest.fixture(scope="module")
def con():
    assert os.path.exists(DB), "vivaad.db missing - run pipeline/run_all.py first"
    c = sqlite3.connect(DB)
    yield c
    c.close()


def test_parcel_b_is_red(con):
    """PRD 50 flagship: Parcel B must be RED at >= 0.85 (PRD 28 HIGH band)."""
    row = con.execute("SELECT status, confidence FROM Parcel WHERE id='P-B01'").fetchone()
    assert row, "Parcel B missing"
    assert row[0] == "RED", "Parcel B is " + row[0] + ", expected RED"
    assert row[1] >= 0.85, "Parcel B confidence %.4f below HIGH band" % row[1]


def test_parcel_a_is_green(con):
    """PRD 50: the clean parcel must have no surfaced litigation."""
    row = con.execute("SELECT status FROM Parcel WHERE id='P-A01'").fetchone()
    assert row and row[0] == "GREEN", "Parcel A is not GREEN"


def test_flagship_link_survives_divergence(con):
    """The link must be earned, not assumed: the land record says 1365-1 and
    'Madanpur Panyar' while the court says 1365/1 and 'Madanpur Paniyar'."""
    ev = con.execute("SELECT evidence FROM ParcelCaseLink WHERE parcel_id='P-B01'"
                     " AND case_id=?", (FLAGSHIP_CNR,)).fetchone()
    assert ev, "flagship link absent"
    e = json.loads(ev[0])
    assert e["survey_match"] == "exact", "normalization failed to reconcile 1365-1 / 1365/1"
    assert e["village_match"] is True, "gazetteer failed to reconcile Panyar / Paniyar"


def test_red_requires_active_case(con):
    """PRD 30: no RED parcel may rest solely on a disposed case."""
    bad = con.execute("""
        SELECT p.id FROM Parcel p WHERE p.status='RED' AND NOT EXISTS (
          SELECT 1 FROM ParcelCaseLink l JOIN CourtCase c ON c.id=l.case_id
          WHERE l.parcel_id=p.id AND c.status='active'
            AND l.confidence_band='HIGH' AND l.identifier_match!='none')
    """).fetchall()
    assert not bad, "RED without an active high-confidence identifier match: " + str(bad)


def test_collision_decoys_never_red(con):
    """PRD 45: a same-number-different-village collision may be AMBER, never RED."""
    red = con.execute("SELECT COUNT(*) FROM Parcel WHERE status='RED'").fetchone()[0]
    assert red > 0, "no RED parcels at all - the demo has nothing to show"
    # every RED must have a village-blocked (not district-fallback) link
    bad = con.execute("""
        SELECT p.id FROM Parcel p WHERE p.status='RED' AND NOT EXISTS (
          SELECT 1 FROM ParcelCaseLink l WHERE l.parcel_id=p.id
            AND json_extract(l.evidence,'$.village_match')=1)
    """).fetchall()
    assert not bad, "RED resting on an unconfirmed location: " + str(bad)


def test_eight_tables_present(con):
    got = {r[0] for r in con.execute(
        "SELECT name FROM sqlite_master WHERE type='table'").fetchall()}
    want = {"Parcel", "Person", "CourtCase", "CaseParty", "CourtEvent",
            "ParcelCaseLink", "Watchlist", "SourceRecord"}
    assert want <= got, "missing PRD 19 tables: " + str(want - got)


def test_provenance_is_traceable(con):
    """PRD 21: every parcel and case must carry a provenance label."""
    for table in ("Parcel", "CourtCase"):
        n = con.execute("SELECT COUNT(*) FROM " + table +
                        " WHERE source_label IS NULL").fetchone()[0]
        assert n == 0, table + " has " + str(n) + " rows with no provenance label"


def test_fallback_covers_flagship():
    """PRD 73 tier 2 and 3 must render with no DB and no network."""
    for rel in ("flagship.json", "dashboard_overview.json", "dashboard_heatmap.json",
                "parcels/P-B01/litigation.json", "parcels/P-A01/litigation.json"):
        p = os.path.join(FALLBACK, rel)
        assert os.path.exists(p), "fallback missing: " + rel
    fl = json.load(open(os.path.join(FALLBACK, "flagship.json"), encoding="utf-8"))
    assert fl["parcel_b"]["litigation"]["status"] == "RED"
    assert fl["parcel_a"]["litigation"]["status"] == "GREEN"


def test_timeline_has_sale_during_pendency():
    """PRD 51 step 4 - the emotional beat needs a sale inside the pendency window."""
    fl = json.load(open(os.path.join(FALLBACK, "flagship.json"), encoding="utf-8"))
    events = fl["parcel_b"]["parcel"]["land_events"]
    filed = fl["case"]["filing_date"]
    sales = [e for e in events if e["type"] == "sale" and e["date"] >= filed]
    assert sales, "no sale registered after filing - the timeline beat is empty"
