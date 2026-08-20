"""Guards against unexpected values in a foreign-built (pipeline-delivered) DB."""
import json
from backend.db import get_conn


def test_malformed_evidence_json_returns_raw_string(client):
    conn = get_conn()
    conn.execute(
        "INSERT INTO ParcelCaseLink (parcel_id,case_id,confidence_score,"
        "confidence_band,identifier_match,evidence,status,reason,created_at)"
        " VALUES ('P-C01','UPHC020412342024',0.5,'LOW','none','not json','AMBER','x','2026-08-20')")
    conn.commit()
    r = client.get("/parcels/P-C01/litigation")
    assert r.status_code == 200
    assert any(l["evidence"] == "not json" for l in r.json()["links"])


def test_null_parcel_status_serves_as_green(client):
    conn = get_conn()
    conn.execute(
        "INSERT INTO Parcel (id,survey_no,village,village_canon,district,"
        "land_events,status,confidence,closed_history,source_label)"
        " VALUES ('P-X01','7','Testpur','testpur','Sultanpur','[]',NULL,NULL,0,'synthetic')")
    conn.commit()
    body = client.get("/parcels/P-X01/litigation").json()
    assert body["status"] == "GREEN"
    assert body["links"] == []
