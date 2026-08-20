def test_subscribe_and_list(client):
    r = client.post("/watchlist", json={"parcel_id": "P-B01"})
    assert r.status_code == 201
    assert r.json()["parcel_id"] == "P-B01"
    items = client.get("/watchlist").json()["items"]
    assert len(items) == 1
    assert items[0]["survey_no"] == "1365-1"
    assert items[0]["has_update"] is False


def test_subscribe_unknown_parcel_rejected(client):
    r = client.post("/watchlist", json={"parcel_id": "P-999"})
    assert r.status_code == 400
    assert r.json() == {"error": "unknown_parcel"}
