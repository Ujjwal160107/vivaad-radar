def test_search_finds_flagship(client):
    r = client.get("/parcels/search", params={"survey_no": "153", "village": "Madanpur Paniyar"})
    assert r.status_code == 200
    results = r.json()["results"]
    assert any(p["parcel_id"] == "P-002" for p in results)


def test_search_no_match_returns_empty_list(client):
    r = client.get("/parcels/search", params={"survey_no": "999", "village": "Nowhere"})
    assert r.status_code == 200
    assert r.json()["results"] == []


def test_parcel_detail(client):
    r = client.get("/parcels/P-002")
    assert r.status_code == 200
    body = r.json()
    assert body["survey_no"] == "153"
    assert body["owner_name"] == "Shyam Dhar Dubey"
    assert body["provenance"] == "synthetic"


def test_parcel_not_found_shape(client):
    r = client.get("/parcels/P-999")
    assert r.status_code == 404
    assert r.json()["detail"]["error"] == "not_found"
