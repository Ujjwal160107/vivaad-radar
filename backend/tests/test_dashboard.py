def test_overview_counts(client):
    body = client.get("/dashboard/overview").json()
    assert body["district"] == "Sultanpur"
    assert body["total_parcels"] == 3
    assert body["red"] == 1
    assert body["amber"] == 1
    assert body["green"] == 1
    assert body["active_cases"] == 1


def test_heatmap_villages(client):
    body = client.get("/dashboard/heatmap").json()
    by_village = {v["village"]: v for v in body["villages"]}
    assert by_village["Madanpur Paniyar"]["red"] == 1
    assert by_village["Baraunsa"]["green"] == 1
