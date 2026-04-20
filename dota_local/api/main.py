from fastapi import FastAPI

from dota_local import __version__
from dota_local.db import connection

app = FastAPI(title="dota-local", version=__version__)


@app.get("/health")
def health() -> dict[str, object]:
    with connection(read_only=True) as conn:
        tables = conn.execute(
            "SELECT table_name FROM information_schema.tables "
            "WHERE table_schema = 'main' ORDER BY table_name"
        ).fetchall()
    return {"status": "ok", "version": __version__, "tables": [t[0] for t in tables]}
