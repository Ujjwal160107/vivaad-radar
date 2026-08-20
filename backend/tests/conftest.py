import pytest
from fastapi.testclient import TestClient
from backend.db import get_conn, init_schema
from backend.seed_stub import seed


@pytest.fixture()
def client(tmp_path, monkeypatch):
    dbfile = tmp_path / "t.db"
    conn = get_conn(dbfile)
    init_schema(conn)
    seed(conn)
    conn.close()
    monkeypatch.setenv("VIVAAD_DB", str(dbfile))
    from backend.main import app
    return TestClient(app)
