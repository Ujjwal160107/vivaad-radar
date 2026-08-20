"""Stub vivaad.db seeder. Mirrors the real Sultanpur flagship case so the
frontend and tests work before the ML pipeline delivers the real DB."""
import json
from backend.db import get_conn, init_schema, db_path


def seed(conn) -> None:
    now = "2026-08-20"
    conn.executemany(
        "INSERT INTO source_record VALUES (?,?,?,?,?)",
        [
            ("SRC-REAL", "real", "Allahabad HC parquet corpus", now, None),
            ("SRC-SYN", "synthetic", "stub seed script", now, None),
            ("SRC-DER", "derived", "hand-set stub links (pipeline replaces)", now, None),
        ],
    )
    conn.executemany(
        "INSERT INTO person VALUES (?,?,?,?,?,?)",
        [
            ("PER-001", "Ramesh Verma", "ramesh verma", "Sohan Lal", "Baraunsa, Sultanpur", "SRC-SYN"),
            ("PER-002", "Shyam Dhar Dubey", "shyamdhar dubey", "Santu", "Madanpur Paniyar, Sultanpur", "SRC-SYN"),
            ("PER-003", "Rakesh Kumar", "rakesh kumar", "Mahesh", "Kurwar, Sultanpur", "SRC-SYN"),
        ],
    )
    conn.executemany(
        "INSERT INTO parcel VALUES (?,?,?,?,?,?,?,?,?,?,?,?)",
        [
            ("P-001", "88", "88", None, "KH-88", "Baraunsa", "Sadar", "Sultanpur",
             "0.5 bigha", None, "PER-001", "SRC-SYN"),
            ("P-002", "153", "153", "1365/1", "KH-153", "Madanpur Paniyar", "Sadar",
             "Sultanpur", "1 bigha", None, "PER-002", "SRC-SYN"),
            ("P-003", "142/3", "142/3", None, "KH-142", "Kurwar", "Sadar", "Sultanpur",
             "0.8 bigha", None, "PER-003", "SRC-SYN"),
        ],
    )
    conn.executemany(
        "INSERT INTO court_case VALUES (?,?,?,?,?,?,?,?,?,?)",
        [
            ("C-001", "WRIB/784/2025", "UPHC020611812025", "Allahabad High Court",
             "consolidation/title", "2025-08-11", "active", "2026-09-12", None, "SRC-REAL"),
            ("C-002", "WRIB/312/2024", "UPHC020412342024", "Allahabad High Court",
             "partition", "2024-03-02", "disposed", None, None, "SRC-REAL"),
        ],
    )
    conn.executemany(
        "INSERT INTO case_party VALUES (?,?,?,?)",
        [
            ("C-001", None, "petitioner", "SHYAMDHAR DUBEY AND 9 OTHERS"),
            ("C-001", None, "respondent", "DEPUTY DIRECTOR OF CONSOLIDATION, SULTANPUR"),
            ("C-002", None, "petitioner", "RAKESH KUMAR"),
            ("C-002", None, "respondent", "STATE OF UP"),
        ],
    )
    conn.executemany(
        "INSERT INTO court_event VALUES (?,?,?,?,?)",
        [
            ("E-001", "C-001", "filed", "2025-08-11", "Writ petition filed"),
            ("E-002", "C-001", "interim_order", "2025-08-22", "Order on consolidation proceedings"),
            ("E-003", "C-001", "hearing", "2026-09-12", "Next hearing"),
            ("E-004", "C-002", "filed", "2024-03-02", None),
            ("E-005", "C-002", "judgment", "2025-01-15", "Disposed"),
        ],
    )
    conn.executemany(
        "INSERT INTO land_event VALUES (?,?,?,?,?)",
        [
            ("LE-001", "P-002", "sale", "2025-11-05", "Sale registered during pendency"),
            ("LE-002", "P-001", "mutation", "2023-06-10", "Routine mutation"),
        ],
    )
    conn.executemany(
        "INSERT INTO parcel_case_link VALUES (?,?,?,?,?,?,?,?)",
        [
            ("L-001", "P-002", "C-001", 0.94, "HIGH",
             json.dumps({"survey_match": "exact", "name_similarity": 0.88,
                         "village_match": True, "father_name_similarity": 0.90,
                         "case_type_relevance": "high"}),
             "RED", now),
            ("L-002", "P-003", "C-002", 0.68, "MEDIUM",
             json.dumps({"survey_match": "normalized", "name_similarity": 0.55,
                         "village_match": True, "father_name_similarity": 0.20,
                         "case_type_relevance": "medium"}),
             "AMBER", now),
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
