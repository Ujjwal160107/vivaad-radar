"""§62 acceptance gate: the app must serve the REAL pipeline DB.

The real_client fixture copies the tracked data/output/vivaad.db into a temp
path and points VIVAAD_DB at that copy. The test module fails at collection
time if the tracked file is missing (run pipeline/run_all.py first).

Run: python -m pytest backend/tests/test_integration_real_db.py -v"""
import shutil
from pathlib import Path

import pytest
from fastapi.testclient import TestClient

REAL_DB = Path(__file__).resolve().parents[2] / "data" / "output" / "vivaad.db"
FLAGSHIP_CNR = "UPHC020611812025"


@pytest.fixture()
def real_client(tmp_path, monkeypatch):
    assert REAL_DB.exists(), (
        f"real DB missing at {REAL_DB} — run the pipeline (pipeline/run_all.py)")
    db_copy = tmp_path / "real.db"
    shutil.copy(REAL_DB, db_copy)
    monkeypatch.setenv("VIVAAD_DB", str(db_copy))
    from backend.main import app
    return TestClient(app)


def test_flagship_parcel_b_is_red_high_confidence(real_client):
    body = real_client.get("/parcels/P-B01/litigation").json()
    assert body["status"] == "RED"
    assert body["confidence"] >= 0.85
    assert body["links"], "flagship parcel must carry at least one link"
    link = next(l for l in body["links"] if l["case_id"] == FLAGSHIP_CNR)
    assert link["next_hearing_source"] == "derived"
    assert link["next_hearing"]


def test_flagship_parcel_a_is_green(real_client):
    assert real_client.get("/parcels/P-A01/litigation").json()["status"] == "GREEN"


def test_flagship_search_bridges_divergence(real_client):
    r = real_client.get("/parcels/search",
                        params={"survey_no": "1365/1", "village": "Madanpur Paniyar"})
    assert any(p["id"] == "P-B01" for p in r.json()["parcels"])


def test_every_endpoint_returns_200(real_client):
    checks = [
        "/parcels/search?survey_no=1365/1&village=Madanpur Paniyar",
        "/parcels/P-B01",
        "/parcels/P-B01/litigation",
        f"/cases/{FLAGSHIP_CNR}",
        "/dashboard/overview",
        "/dashboard/heatmap",
        "/watchlist",
    ]
    for path in checks:
        assert real_client.get(path).status_code == 200, path
    r = real_client.post("/watchlist", json={"parcel_id": "P-B01"})
    assert r.status_code == 201
