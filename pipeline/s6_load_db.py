"""s6 - load the eight PRD 19 tables into data/output/vivaad.db.

Relational + an explicit link table, not a graph DB (PRD 38). Geometry and
land_events are JSON text columns; no PostGIS.

Parcel carries derived `status`/`confidence` columns so the API is a plain
SELECT with no scoring at query time (PRD 36, 48). land_events lives as JSON on
Parcel rather than as a ninth table, keeping the schema at the contracted eight.
"""
import json
import os
import sqlite3
from datetime import datetime, timezone

from common import DATA_MID, DATA_OUT, DB, report

SCHEMA = """
DROP TABLE IF EXISTS Parcel; DROP TABLE IF EXISTS Person;
DROP TABLE IF EXISTS CourtCase; DROP TABLE IF EXISTS CaseParty;
DROP TABLE IF EXISTS CourtEvent; DROP TABLE IF EXISTS ParcelCaseLink;
DROP TABLE IF EXISTS Watchlist; DROP TABLE IF EXISTS SourceRecord;

CREATE TABLE Parcel (
  id TEXT PRIMARY KEY, survey_no TEXT, khasra_no TEXT, khata_no TEXT,
  village TEXT, village_canon TEXT, taluk TEXT, district TEXT, area TEXT,
  geometry TEXT, land_events TEXT, owner_ref TEXT,
  status TEXT, confidence REAL, note TEXT, closed_history INTEGER,
  source_label TEXT);
CREATE TABLE Person (
  id TEXT PRIMARY KEY, name TEXT, name_normalized TEXT, father_name TEXT,
  address TEXT, source_label TEXT);
CREATE TABLE CourtCase (
  id TEXT PRIMARY KEY, case_no TEXT, court TEXT, case_type TEXT,
  filing_date TEXT, order_date TEXT, status TEXT, next_hearing_date TEXT,
  raw_text_ref TEXT, source_label TEXT, next_hearing_source TEXT);
CREATE TABLE CaseParty (
  case_id TEXT, person_id TEXT, role TEXT, name_as_written TEXT);
CREATE TABLE CourtEvent (
  id INTEGER PRIMARY KEY AUTOINCREMENT, case_id TEXT, event_type TEXT,
  date TEXT, note TEXT);
CREATE TABLE ParcelCaseLink (
  id INTEGER PRIMARY KEY AUTOINCREMENT, parcel_id TEXT, case_id TEXT,
  confidence_score REAL, confidence_band TEXT, identifier_match TEXT,
  evidence TEXT, status TEXT, reason TEXT, created_at TEXT);
CREATE TABLE Watchlist (
  id INTEGER PRIMARY KEY AUTOINCREMENT, user_ref TEXT, parcel_id TEXT,
  subscribed_at TEXT, last_notified_at TEXT, has_update INTEGER DEFAULT 0);
CREATE TABLE SourceRecord (
  id INTEGER PRIMARY KEY AUTOINCREMENT, source_type TEXT, origin TEXT,
  ingested_at TEXT, raw_ref TEXT);

CREATE INDEX ix_parcel_lookup ON Parcel(survey_no, village_canon);
CREATE INDEX ix_parcel_village ON Parcel(village_canon);
CREATE INDEX ix_link_parcel ON ParcelCaseLink(parcel_id);
CREATE INDEX ix_link_case ON ParcelCaseLink(case_id);
CREATE INDEX ix_event_case ON CourtEvent(case_id);
"""


def run():
    os.makedirs(DATA_OUT, exist_ok=True)
    norm = json.load(open(os.path.join(DATA_MID, "normalized.json"), encoding="utf-8"))
    status = json.load(open(os.path.join(DATA_MID, "parcel_status.json"), encoding="utf-8"))
    st = {s["parcel_id"]: s for s in status}
    now = datetime.now(timezone.utc).isoformat(timespec="seconds")

    con = sqlite3.connect(DB)
    con.executescript(SCHEMA)

    persons, parties = {}, []

    def person_id(name, norm_name, father=None):
        key = norm_name or name
        if key not in persons:
            persons[key] = {"id": "PR-%04d" % (len(persons) + 1), "name": name,
                            "name_normalized": norm_name, "father_name": father}
        elif father and not persons[key]["father_name"]:
            persons[key]["father_name"] = father
        return persons[key]["id"]

    # Parcel + owner Person
    for p in norm["parcels"]:
        s = st.get(p["parcel_id"], {})
        oid = person_id(p.get("owner_name"), p.get("owner_norm"),
                        p.get("owner_father_name"))
        con.execute(
            "INSERT INTO Parcel VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)",
            (p["parcel_id"], p.get("survey_no"), p.get("khasra_no"),
             p.get("khata_no"), p.get("village"), p.get("village_canon"),
             p.get("taluk"), p.get("district"), p.get("area"),
             p.get("geometry"), json.dumps(p.get("land_events") or []), oid,
             s.get("status", "GREEN"), s.get("confidence", 0.0), s.get("note"),
             1 if s.get("closed_history") else 0, p.get("source_label")))

    # CourtCase + CaseParty + CourtEvent
    for c in norm["cases"]:
        case_status = "unknown" if c.get("is_final") is None else (
            "disposed" if c["is_final"] else "active")
        con.execute("INSERT INTO CourtCase VALUES (?,?,?,?,?,?,?,?,?,?,?)",
                    (c["cnr"], c.get("case_no"), c.get("court"), c.get("case_type"),
                     c.get("filing_date"), c.get("order_date"), case_status,
                     c.get("next_hearing_date"), c.get("raw_text_ref"),
                     c.get("source_label"), c.get("next_hearing_source")))
        for role, raw, nm in (("petitioner", c.get("petitioner_raw"), c.get("petitioner_norm")),
                              ("respondent", c.get("respondent_raw"), c.get("respondent_norm"))):
            if raw:
                parties.append((c["cnr"], person_id(raw, nm, c.get("father_norm")
                                                   if role == "petitioner" else None),
                                role, raw))
        if c.get("filing_date"):
            con.execute("INSERT INTO CourtEvent (case_id,event_type,date,note) VALUES (?,?,?,?)",
                        (c["cnr"], "filed", c["filing_date"], "Case filed"))
        if c.get("order_date"):
            con.execute("INSERT INTO CourtEvent (case_id,event_type,date,note) VALUES (?,?,?,?)",
                        (c["cnr"], "interim_order" if not c.get("is_final") else "judgment",
                         c["order_date"], "Latest order on record"))
        if c.get("next_hearing_date"):
            con.execute("INSERT INTO CourtEvent (case_id,event_type,date,note) VALUES (?,?,?,?)",
                        (c["cnr"], "next_hearing", c["next_hearing_date"], "Next hearing"))

    for p in persons.values():
        con.execute("INSERT INTO Person VALUES (?,?,?,?,?,?)",
                    (p["id"], p["name"], p["name_normalized"], p["father_name"],
                     None, "synthetic"))
    con.executemany("INSERT INTO CaseParty VALUES (?,?,?,?)", parties)

    for s in status:
        for l in s["links"]:
            con.execute(
                "INSERT INTO ParcelCaseLink (parcel_id,case_id,confidence_score,"
                "confidence_band,identifier_match,evidence,status,reason,created_at)"
                " VALUES (?,?,?,?,?,?,?,?,?)",
                (s["parcel_id"], l["cnr"], l["confidence_score"], l["confidence_band"],
                 l["identifier_match"], json.dumps(l["evidence"]), l["status"],
                 l["reason"], now))

    con.executemany("INSERT INTO SourceRecord (source_type,origin,ingested_at,raw_ref)"
                    " VALUES (?,?,?,?)",
                    [("real", "Indian High Court judgments (Allahabad HC, Sultanpur)",
                      now, "data/input/cases.parquet"),
                     ("synthetic", "generated land records seeded from extracted ids",
                      now, "data/input/parcels.parquet"),
                     ("derived", "pipeline s4/s5 scored links and status", now,
                      "data/intermediate/parcel_status.json"),
                     ("mocked", "watchlist notifications", now, "n/a")])
    con.commit()

    counts = {t: con.execute("SELECT COUNT(*) FROM " + t).fetchone()[0]
              for t in ("Parcel", "Person", "CourtCase", "CaseParty", "CourtEvent",
                        "ParcelCaseLink", "Watchlist", "SourceRecord")}
    con.close()
    report("s6", {"db": DB, "tables": counts})


if __name__ == "__main__":
    run()
