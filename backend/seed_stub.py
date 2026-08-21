"""Stub vivaad.db seeder in the REAL pipeline dialect (design doc §5b).
Mirrors the real flagship IDs so stub tests and the real-DB gate agree."""
import json
from backend.db import get_conn, init_schema, db_path

FLAGSHIP_CNR = "UPHC020611812025"
DISPOSED_CNR = "UPHC020412342024"
NOW = "2026-08-20"


def seed(conn) -> None:
    conn.executemany(
        "INSERT INTO Person (id,name,name_normalized,father_name,address,source_label)"
        " VALUES (?,?,?,?,?,?)",
        [
            ("PR-001", "Ramesh Verma", "ramesh verma", "Sohan Lal", "Baraunsa, Sultanpur", "synthetic"),
            ("PR-002", "Shyam Dhar Dubey", "shyam dhar dubey", "Santu", "Madanpur Panyar, Sultanpur", "synthetic"),
            ("PR-003", "Rakesh Kumar", "rakesh kumar", "Mahesh", "Kurwar, Sultanpur", "synthetic"),
        ],
    )
    conn.executemany(
        "INSERT INTO Parcel VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)",
        [
            ("P-A01", "88", None, "KH-88", "Baraunsa", "baraunsa", "Sadar", "Sultanpur",
             "0.5 bigha", None,
             json.dumps([{"event_type": "mutation", "date": "2023-06-10", "note": "Routine mutation"}]),
             "PR-001", "GREEN", 0.0, None, 0, "synthetic"),
            ("P-B01", "1365-1", "1365-1", "KH-153", "Madanpur Panyar", "madanpur paniyar",
             "Sadar", "Sultanpur", "1 bigha",
             json.dumps({"type": "Polygon", "coordinates": [[
                 [82.07, 26.26], [82.08, 26.26], [82.08, 26.27], [82.07, 26.27], [82.07, 26.26]
             ]]}),
             json.dumps([{"event_type": "sale", "date": "2025-11-05", "note": "Sale registered during pendency"}]),
             "PR-002", "RED", 0.9105, "Sale registered during pendency", 0, "synthetic"),
            ("P-C01", "142/3", None, "KH-142", "Kurwar", "kurwar", "Sadar", "Sultanpur",
             "0.8 bigha", None, json.dumps([]),
             "PR-003", "AMBER", 0.68, None, 0, "synthetic"),
        ],
    )
    conn.executemany(
        "INSERT INTO CourtCase VALUES (?,?,?,?,?,?,?,?,?,?,?)",
        [
            (FLAGSHIP_CNR, "WRIB/784/2025", "Allahabad High Court", "consolidation/title",
             "2025-08-11", "2025-08-22", "active", "2026-09-12", None, "real", "derived"),
            (DISPOSED_CNR, "WRIB/312/2024", "Allahabad High Court", "partition",
             "2024-03-02", "2025-01-15", "disposed", None, None, "real", None),
        ],
    )
    conn.executemany(
        "INSERT INTO CaseParty (case_id,person_id,role,name_as_written) VALUES (?,?,?,?)",
        [
            (FLAGSHIP_CNR, "PR-002", "petitioner", "SHYAMDHAR DUBEY AND 9 OTHERS"),
            (FLAGSHIP_CNR, None, "respondent", "DEPUTY DIRECTOR OF CONSOLIDATION, SULTANPUR"),
            (DISPOSED_CNR, "PR-003", "petitioner", "RAKESH KUMAR"),
            (DISPOSED_CNR, None, "respondent", "STATE OF UP"),
        ],
    )
    conn.executemany(
        "INSERT INTO CourtEvent (case_id,event_type,date,note) VALUES (?,?,?,?)",
        [
            (FLAGSHIP_CNR, "filed", "2025-08-11", "Case filed"),
            (FLAGSHIP_CNR, "interim_order", "2025-08-22", "Latest order on record"),
            (FLAGSHIP_CNR, "next_hearing", "2026-09-12", "Next hearing"),
            (DISPOSED_CNR, "filed", "2024-03-02", "Case filed"),
            (DISPOSED_CNR, "judgment", "2025-01-15", "Latest order on record"),
        ],
    )
    conn.executemany(
        "INSERT INTO ParcelCaseLink (parcel_id,case_id,confidence_score,confidence_band,"
        "identifier_match,evidence,status,reason,created_at) VALUES (?,?,?,?,?,?,?,?,?)",
        [
            ("P-B01", FLAGSHIP_CNR, 0.9105, "HIGH", "exact",
             json.dumps({"survey_match": "exact", "name_similarity": 0.88,
                         "village_match": True, "father_name_similarity": 0.90,
                         "case_type_relevance": "high"}),
             "RED", "high-band link to active case with exact identifier match", NOW),
            ("P-C01", DISPOSED_CNR, 0.68, "MEDIUM", "none",
             json.dumps({"survey_match": "normalized", "name_similarity": 0.55,
                         "village_match": True, "father_name_similarity": 0.20,
                         "case_type_relevance": "medium"}),
             "AMBER", "medium-band link to disposed case", NOW),
        ],
    )
    conn.executemany(
        "INSERT INTO SourceRecord (source_type,origin,ingested_at,raw_ref) VALUES (?,?,?,?)",
        [
            ("real", "Allahabad HC parquet corpus", NOW, None),
            ("synthetic", "stub seed script", NOW, None),
            ("derived", "hand-set stub links (pipeline replaces)", NOW, None),
        ],
    )
    conn.commit()


if __name__ == "__main__":
    path = db_path()
    path.parent.mkdir(parents=True, exist_ok=True)
    path.unlink(missing_ok=True)
    conn = get_conn(path)
    init_schema(conn)
    seed(conn)
    print(f"Seeded stub DB at {path}")
