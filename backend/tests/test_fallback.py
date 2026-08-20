import json


def test_fallback_serves_cached_json(client, tmp_path, monkeypatch):
    fb = tmp_path / "fallback"
    fb.mkdir()
    payload = {"parcel_id": "P-002", "status": "RED", "confidence": 0.94, "links": []}
    (fb / "parcels_P-002_litigation.json").write_text(json.dumps(payload))
    monkeypatch.setenv("VIVAAD_FALLBACK_DIR", str(fb))
    monkeypatch.setenv("VIVAAD_DB", str(tmp_path / "missing.db"))  # break the DB
    r = client.get("/parcels/P-002/litigation")
    assert r.status_code == 200
    assert r.json()["status"] == "RED"


def test_all_endpoints_smoke(client):
    checks = [
        ("/parcels/search?survey_no=153&village=Madanpur Paniyar", 200),
        ("/parcels/P-002", 200),
        ("/parcels/P-002/litigation", 200),
        ("/cases/C-001", 200),
        ("/dashboard/overview", 200),
        ("/dashboard/heatmap", 200),
        ("/watchlist", 200),
    ]
    for path, expected in checks:
        assert client.get(path).status_code == expected, path
