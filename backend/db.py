import os
import sqlite3
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[1]
DEFAULT_DB = REPO_ROOT / "data" / "output" / "vivaad.db"


def db_path() -> Path:
    return Path(os.environ.get("VIVAAD_DB", str(DEFAULT_DB)))


def get_conn(path: Path | None = None) -> sqlite3.Connection:
    conn = sqlite3.connect(path or db_path())
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON")
    return conn


def init_schema(conn: sqlite3.Connection) -> None:
    sql = (Path(__file__).parent / "schema.sql").read_text(encoding="utf-8")
    conn.executescript(sql)
