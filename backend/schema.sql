CREATE TABLE IF NOT EXISTS person (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  name_normalized TEXT NOT NULL,
  father_name TEXT,
  address TEXT,
  source_id TEXT
);

CREATE TABLE IF NOT EXISTS parcel (
  id TEXT PRIMARY KEY,
  survey_no TEXT NOT NULL,
  survey_no_norm TEXT NOT NULL,
  khasra_no TEXT,
  khata_no TEXT,
  village TEXT NOT NULL,
  taluk TEXT,
  district TEXT NOT NULL,
  area TEXT,
  geometry TEXT,
  owner_ref TEXT REFERENCES person(id),
  source_id TEXT
);

CREATE TABLE IF NOT EXISTS court_case (
  id TEXT PRIMARY KEY,
  case_no TEXT NOT NULL,
  cnr TEXT,
  court TEXT,
  case_type TEXT,
  filing_date TEXT,
  status TEXT NOT NULL CHECK (status IN ('active','closed','disposed','unknown')),
  next_hearing_date TEXT,
  raw_text_ref TEXT,
  source_id TEXT
);

CREATE TABLE IF NOT EXISTS case_party (
  case_id TEXT NOT NULL REFERENCES court_case(id),
  person_id TEXT REFERENCES person(id),
  role TEXT NOT NULL,
  name_as_written TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS court_event (
  id TEXT PRIMARY KEY,
  case_id TEXT NOT NULL REFERENCES court_case(id),
  event_type TEXT NOT NULL CHECK (event_type IN ('filed','hearing','interim_order','judgment')),
  date TEXT NOT NULL,
  note TEXT
);

CREATE TABLE IF NOT EXISTS land_event (
  id TEXT PRIMARY KEY,
  parcel_id TEXT NOT NULL REFERENCES parcel(id),
  event_type TEXT NOT NULL CHECK (event_type IN ('sale','mutation','transfer')),
  date TEXT NOT NULL,
  note TEXT
);

CREATE TABLE IF NOT EXISTS parcel_case_link (
  id TEXT PRIMARY KEY,
  parcel_id TEXT NOT NULL REFERENCES parcel(id),
  case_id TEXT NOT NULL REFERENCES court_case(id),
  confidence_score REAL NOT NULL,
  confidence_band TEXT NOT NULL CHECK (confidence_band IN ('HIGH','MEDIUM','LOW')),
  evidence TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('RED','AMBER','GREEN')),
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS watchlist (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_ref TEXT NOT NULL DEFAULT 'demo-user',
  parcel_id TEXT NOT NULL REFERENCES parcel(id),
  subscribed_at TEXT NOT NULL,
  last_notified_at TEXT,
  has_update INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS source_record (
  id TEXT PRIMARY KEY,
  source_type TEXT NOT NULL CHECK (source_type IN ('real','synthetic','mocked','derived','model-generated','cached')),
  origin TEXT NOT NULL,
  ingested_at TEXT NOT NULL,
  raw_ref TEXT
);

CREATE INDEX IF NOT EXISTS idx_parcel_search ON parcel(survey_no_norm, village);
CREATE INDEX IF NOT EXISTS idx_link_parcel ON parcel_case_link(parcel_id);
