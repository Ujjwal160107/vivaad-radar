def test_overview_counts(client):
    body = client.get("/dashboard/overview").json()
    assert body["district"] == "Sultanpur"
    assert body["parcels"] == 3
    assert body["cases"] == 2
    assert body["status_counts"] == {"RED": 1, "AMBER": 1, "GREEN": 1}
    assert body["active_cases"] == 1
    assert body["high_confidence_links"] == 1
    assert body["possible_matches"] == 1


def test_heatmap_villages_sorted_by_density(client):
    body = client.get("/dashboard/heatmap").json()
    villages = body["villages"]
    densities = [v["density"] for v in villages]
    assert densities == sorted(densities, reverse=True)
    by_canon = {v["village_canon"]: v for v in villages}
    assert by_canon["madanpur paniyar"]["RED"] == 1
    assert by_canon["madanpur paniyar"]["density"] == 1.0
    assert by_canon["baraunsa"]["GREEN"] == 1
