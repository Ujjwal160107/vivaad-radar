import json
import os
import sqlite3


def test_parcel_b_is_red_high_confidence(client):
    r = client.get("/parcels/P-002/litigation")
    assert r.status_code == 200
    body = r.json()
    assert body["status"] == "RED"
    assert body["confidence"] >= 0.85
    link = next(l for l in body["links"] if l["case_no"] == "WRIB/784/2025")
    assert link["case_status"] == "active"
    assert link["evidence"]["survey_match"] == "exact"
    assert link["next_hearing"] == "2026-09-12"


def test_parcel_a_is_green(client):
    r = client.get("/parcels/P-001/litigation")
    assert r.status_code == 200
    body = r.json()
    assert body["status"] == "GREEN"
    assert body["links"] == []


def test_amber_decoy(client):
    r = client.get("/parcels/P-003/litigation")
    assert r.json()["status"] == "AMBER"


def test_mixed_status_links_worst_case_wins(client):
    # Seed an extra AMBER link onto P-002 (which already has a RED link):
    # the parcel-level status must still be RED, and links must be ordered
    # worst-first deterministically.
    conn = sqlite3.connect(os.environ["VIVAAD_DB"])
    conn.execute(
        "INSERT INTO parcel_case_link VALUES (?,?,?,?,?,?,?,?)",
        ("L-EXTRA", "P-002", "C-002", 0.50, "MEDIUM",
         json.dumps({"survey_match": "fuzzy"}), "AMBER", "2026-08-20"),
    )
    conn.commit()
    conn.close()
    r = client.get("/parcels/P-002/litigation")
    assert r.status_code == 200
    body = r.json()
    assert body["status"] == "RED"
    assert body["confidence"] == 0.94
    assert [l["case_no"] for l in body["links"]] == ["WRIB/784/2025", "WRIB/312/2024"]
