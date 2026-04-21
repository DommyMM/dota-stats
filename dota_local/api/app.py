from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from dota_local import __version__
from dota_local.api.routers import matches, meta, stats
from dota_local.db import connection

app = FastAPI(title="dota-local", version=__version__)

# Permissive CORS — local-only app, the dev Vite server talks to us from
# a different port in development.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://127.0.0.1:5173", "http://localhost:5173"],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(matches.router)
app.include_router(meta.router)
app.include_router(stats.router)


@app.get("/health")
def health() -> dict[str, object]:
    with connection(read_only=True) as conn:
        n_matches = conn.execute("SELECT count(*) FROM matches").fetchone()[0]
        n_parsed = conn.execute(
            "SELECT count(*) FROM matches WHERE parse_status = 'parsed'"
        ).fetchone()[0]
        n_players = conn.execute(
            "SELECT count(*) FROM players WHERE is_tracked"
        ).fetchone()[0]
    return {
        "status": "ok",
        "version": __version__,
        "matches": n_matches,
        "parsed": n_parsed,
        "tracked_players": n_players,
    }
