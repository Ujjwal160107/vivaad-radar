def test_parcel_b_is_red_high_confidence(client):
    r = client.get("/parcels/P-002/litigation")
    assert r.status_code == 200
    body = r.json()
    assert body["status"] == "RED"
    assert body["confidence"] >= 0.85
    link = body["links"][0]
    assert link["case_no"] == "WRIB/784/2025"
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
