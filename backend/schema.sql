CREATE TABLE IF NOT EXISTS Parcel (
  id TEXT PRIMARY KEY, survey_no TEXT, khasra_no TEXT, khata_no TEXT,
  village TEXT, village_canon TEXT, taluk TEXT, district TEXT, area TEXT,
  geometry TEXT, land_events TEXT, owner_ref TEXT,
  status TEXT, confidence REAL, note TEXT, closed_history INTEGER,
  source_label TEXT);
CREATE TABLE IF NOT EXISTS Person (
  id TEXT PRIMARY KEY, name TEXT, name_normalized TEXT, father_name TEXT,
  address TEXT, source_label TEXT);
CREATE TABLE IF NOT EXISTS CourtCase (
  id TEXT PRIMARY KEY, case_no TEXT, court TEXT, case_type TEXT,
  filing_date TEXT, order_date TEXT, status TEXT, next_hearing_date TEXT,
  raw_text_ref TEXT, source_label TEXT);
CREATE TABLE IF NOT EXISTS CaseParty (
  case_id TEXT, person_id TEXT, role TEXT, name_as_written TEXT);
CREATE TABLE IF NOT EXISTS CourtEvent (
  id INTEGER PRIMARY KEY AUTOINCREMENT, case_id TEXT, event_type TEXT,
  date TEXT, note TEXT);
CREATE TABLE IF NOT EXISTS ParcelCaseLink (
  id INTEGER PRIMARY KEY AUTOINCREMENT, parcel_id TEXT, case_id TEXT,
  confidence_score REAL, confidence_band TEXT, identifier_match TEXT,
  evidence TEXT, status TEXT, reason TEXT, created_at TEXT);
CREATE TABLE IF NOT EXISTS Watchlist (
  id INTEGER PRIMARY KEY AUTOINCREMENT, user_ref TEXT, parcel_id TEXT,
  subscribed_at TEXT, last_notified_at TEXT, has_update INTEGER DEFAULT 0);
CREATE TABLE IF NOT EXISTS SourceRecord (
  id INTEGER PRIMARY KEY AUTOINCREMENT, source_type TEXT, origin TEXT,
  ingested_at TEXT, raw_ref TEXT);

CREATE INDEX IF NOT EXISTS ix_parcel_lookup ON Parcel(survey_no, village_canon);
CREATE INDEX IF NOT EXISTS ix_parcel_village ON Parcel(village_canon);
CREATE INDEX IF NOT EXISTS ix_link_parcel ON ParcelCaseLink(parcel_id);
CREATE INDEX IF NOT EXISTS ix_link_case ON ParcelCaseLink(case_id);
CREATE INDEX IF NOT EXISTS ix_event_case ON CourtEvent(case_id);
