FLAGSHIP_CNR = "UPHC020611812025"


def test_case_detail_flagship(client):
    r = client.get(f"/cases/{FLAGSHIP_CNR}")
    assert r.status_code == 200
    body = r.json()
    assert body["id"] == FLAGSHIP_CNR          # the id IS the CNR
    assert body["case_no"] == "WRIB/784/2025"
    assert body["status"] == "active"
    assert body["order_date"] == "2025-08-22"
    roles = {p["role"] for p in body["parties"]}
    assert {"petitioner", "respondent"} <= roles
    dates = [e["date"] for e in body["events"]]
    assert dates == sorted(dates)
    assert body["linked_parcels"][0]["parcel_id"] == "P-B01"


def test_case_not_found(client):
    r = client.get("/cases/C-999")
    assert r.status_code == 404
    assert r.json() == {"error": "not_found", "hint": "check spelling/format"}
