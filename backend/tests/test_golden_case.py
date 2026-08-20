def test_parcel_b_is_red_high_confidence(client):
    r = client.get("/parcels/P-B01/litigation")
    assert r.status_code == 200
    body = r.json()
    assert body["status"] == "RED"
    assert body["confidence"] >= 0.85
    assert body["closed_history"] is False
    link = next(l for l in body["links"] if l["case_no"] == "WRIB/784/2025")
    assert link["case_status"] == "active"
    assert link["band"] == "HIGH"
    assert link["evidence"]["survey_match"] == "exact"
    assert link["next_hearing"] == "2026-09-12"


def test_parcel_a_is_green(client):
    r = client.get("/parcels/P-A01/litigation")
    assert r.status_code == 200
    body = r.json()
    assert body["status"] == "GREEN"
    assert body["links"] == []


def test_amber_decoy(client):
    assert client.get("/parcels/P-C01/litigation").json()["status"] == "AMBER"


def test_link_fields_match_s7_contract(client):
    link = client.get("/parcels/P-B01/litigation").json()["links"][0]
    assert set(link) == {
        "case_id", "case_no", "court", "case_type", "case_status",
        "confidence", "band", "link_status", "reason", "evidence",
        "filing_date", "order_date", "next_hearing", "raw_text_ref",
    }
