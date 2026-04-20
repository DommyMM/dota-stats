from collections.abc import Iterator
from contextlib import contextmanager
from pathlib import Path

import duckdb

from dota_local.config import PROJECT_ROOT, get_settings

SCHEMA_DIR = PROJECT_ROOT / "schema"


def connect(read_only: bool = False) -> duckdb.DuckDBPyConnection:
    path = get_settings().duckdb_path
    path.parent.mkdir(parents=True, exist_ok=True)
    return duckdb.connect(str(path), read_only=read_only)


@contextmanager
def connection(read_only: bool = False) -> Iterator[duckdb.DuckDBPyConnection]:
    conn = connect(read_only=read_only)
    try:
        yield conn
    finally:
        conn.close()


def apply_schema(conn: duckdb.DuckDBPyConnection | None = None) -> list[Path]:
    files = sorted(SCHEMA_DIR.glob("*.sql"))
    owned = conn is None
    conn = conn or connect()
    try:
        for f in files:
            conn.execute(f.read_text(encoding="utf-8"))
    finally:
        if owned:
            conn.close()
    return files
