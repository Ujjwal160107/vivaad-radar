"""Guards against unexpected values in a foreign-built (pipeline-delivered) DB."""
import os
import sqlite3


def _insert_link(link_id, parcel_id, status, evidence):
    conn = sqlite3.connect(os.environ["VIVAAD_DB"])
    conn.execute(
        "INSERT INTO parcel_case_link VALUES (?,?,?,?,?,?,?,?)",
        (link_id, parcel_id, "C-002", 0.40, "LOW", evidence, status, "2026-08-20"),
    )
    conn.commit()
    conn.close()


def _drop_link_table_constraints():
    # Simulate a foreign-built DB whose link table lacks our CHECK constraints:
    # CREATE TABLE ... AS SELECT rebuilds the table without them.
    conn = sqlite3.connect(os.environ["VIVAAD_DB"])
    conn.executescript(
        """
        ALTER TABLE parcel_case_link RENAME TO _old_links;
        CREATE TABLE parcel_case_link AS SELECT * FROM _old_links;
        DROP TABLE _old_links;
        """
    )
    conn.close()


def test_unknown_link_status_never_becomes_red(client):
    _drop_link_table_constraints()
    _insert_link("L-WEIRD", "P-001", "PURPLE", "{}")
    r = client.get("/parcels/P-001/litigation")
    assert r.status_code == 200
    assert r.json()["status"] != "RED"
    # Dashboard endpoints must not 500 either.
    assert client.get("/dashboard/overview").status_code == 200
    assert client.get("/dashboard/heatmap").status_code == 200


def test_malformed_evidence_json_returns_raw_string(client):
    _insert_link("L-BADJSON", "P-001", "AMBER", "not-json{{{")
    r = client.get("/parcels/P-001/litigation")
    assert r.status_code == 200
    link = next(l for l in r.json()["links"] if l["case_id"] == "C-002")
    assert link["evidence"] == "not-json{{{"
