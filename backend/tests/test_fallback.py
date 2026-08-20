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


def test_fallback_serves_nested_layout(client, tmp_path, monkeypatch):
    # The pipeline may also write nested paths: parcels/P-002/litigation.json
    fb = tmp_path / "fallback"
    nested = fb / "parcels" / "P-002"
    nested.mkdir(parents=True)
    payload = {"parcel_id": "P-002", "status": "RED", "confidence": 0.94, "links": []}
    (nested / "litigation.json").write_text(json.dumps(payload))
    monkeypatch.setenv("VIVAAD_FALLBACK_DIR", str(fb))
    monkeypatch.setenv("VIVAAD_DB", str(tmp_path / "missing.db"))
    r = client.get("/parcels/P-002/litigation")
    assert r.status_code == 200
    assert r.json()["status"] == "RED"


def test_fallback_candidate_is_directory_returns_503(client, tmp_path, monkeypatch):
    fb = tmp_path / "fallback"
    fb.mkdir()
    (fb / "parcels_P-002_litigation.json").mkdir()  # directory, not a readable file
    monkeypatch.setenv("VIVAAD_FALLBACK_DIR", str(fb))
    monkeypatch.setenv("VIVAAD_DB", str(tmp_path / "missing.db"))
    r = client.get("/parcels/P-002/litigation")
    assert r.status_code == 503
    assert r.json() == {"error": "unavailable"}


def test_fallback_rejects_path_traversal(client, tmp_path, monkeypatch):
    fb = tmp_path / "fallback"
    (fb / "parcels").mkdir(parents=True)
    # A file OUTSIDE the fallback dir that a traversal would reach: the nested
    # candidate for "/parcels/..\\..\\secret" resolves to tmp_path/secret.json.
    # If the containment guard were removed, this test would fail with a 200
    # leaking the payload below.
    (tmp_path / "secret.json").write_text('{"status": "LEAKED"}')
    monkeypatch.setenv("VIVAAD_FALLBACK_DIR", str(fb))
    monkeypatch.setenv("VIVAAD_DB", str(tmp_path / "missing.db"))
    r = client.get("/parcels/..\\..\\secret")
    assert r.status_code == 503
    assert r.json() == {"error": "unavailable"}
    assert "LEAKED" not in r.text


def test_all_endpoints_smoke(client):
    checks = [
        ("/parcels/search?survey_no=1365/1&village=Madanpur Paniyar", 200),
        ("/parcels/P-B01", 200),
        ("/parcels/P-B01/litigation", 200),
        ("/cases/UPHC020611812025", 200),
        ("/dashboard/overview", 200),
        ("/dashboard/heatmap", 200),
        ("/watchlist", 200),
    ]
    for path, expected in checks:
        assert client.get(path).status_code == expected, path
    r = client.post("/watchlist", json={"parcel_id": "P-A01"})
    assert r.status_code == 201, "POST /watchlist"
