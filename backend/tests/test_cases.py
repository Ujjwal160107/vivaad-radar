def test_case_detail_flagship(client):
    r = client.get("/cases/C-001")
    assert r.status_code == 200
    body = r.json()
    assert body["cnr"] == "UPHC020611812025"
    assert body["status"] == "active"
    roles = {p["role"] for p in body["parties"]}
    assert {"petitioner", "respondent"} <= roles
    dates = [e["date"] for e in body["events"]]
    assert dates == sorted(dates)


def test_case_not_found(client):
    r = client.get("/cases/C-999")
    assert r.status_code == 404
    assert r.json() == {"error": "not_found", "hint": "check spelling/format"}
