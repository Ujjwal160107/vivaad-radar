def test_search_bridges_survey_and_village_divergence(client):
    # user types the court's citation; the land record stores 1365-1 / Panyar
    r = client.get("/parcels/search",
                   params={"survey_no": "1365/1", "village": "Madanpur Paniyar"})
    assert r.status_code == 200
    parcels = r.json()["parcels"]
    assert any(p["id"] == "P-B01" for p in parcels)


def test_search_no_match_returns_empty_list(client):
    r = client.get("/parcels/search", params={"survey_no": "999", "village": "Nowhere"})
    assert r.status_code == 200
    assert r.json()["parcels"] == []


def test_parcel_detail_matches_parcel_payload_shape(client):
    r = client.get("/parcels/P-B01")
    assert r.status_code == 200
    body = r.json()
    assert body["survey_no"] == "1365-1"
    assert body["status"] == "RED"
    assert body["owner"]["name"] == "Shyam Dhar Dubey"
    assert body["source_label"] == "synthetic"
    assert isinstance(body["land_events"], list)
    assert body["land_events"][0]["event_type"] == "sale"


def test_parcel_not_found_shape(client):
    r = client.get("/parcels/P-999")
    assert r.status_code == 404
    assert r.json() == {"error": "not_found", "hint": "check spelling/format"}
