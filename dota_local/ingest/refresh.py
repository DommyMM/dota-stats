"""Refresh: fetch NEW matches for each tracked account.

Seed pages backward through history. Refresh pages forward: for each
account, read the highest known match_id from the local DB, then stream
/players/{id}/matches newest-first until we hit a batch that's entirely
already-known. Cheap to run repeatedly — OpenDota returns ~500 rows per
call and we short-circuit once we see familiar territory.
"""
from __future__ import annotations

import logging
from typing import Any

import duckdb

from dota_local.config import get_settings
from dota_local.db import connection
from dota_local.ingest.seed import _upsert_match_players, _upsert_matches
from dota_local.opendota import OpenDotaClient

log = logging.getLogger(__name__)


async def refresh(
    account_ids: list[int] | None = None,
) -> dict[str, Any]:
    """Pull new matches for each tracked account since last refresh.

    Returns a summary dict the API + CLI can surface to the user:
        {
          "accounts": [
              {"account_id": 231869198, "new_matches": 4, "max_existing": 8780118469},
              ...
          ],
          "total_new": 4,
        }
    """
    settings = get_settings()
    accounts = account_ids or settings.tracked_account_ids
    if not accounts:
        return {"accounts": [], "total_new": 0}

    results: list[dict[str, Any]] = []
    async with OpenDotaClient(api_key=settings.opendota_api_key or None) as client:
        for acct in accounts:
            results.append(await _refresh_account(client, acct))

    return {
        "accounts": results,
        "total_new": sum(r["new_matches"] for r in results),
    }


async def _refresh_account(
    client: OpenDotaClient,
    account_id: int,
) -> dict[str, Any]:
    with connection() as conn:
        max_existing = _max_match_id(conn, account_id)
        known_ids = _known_match_ids(conn, account_id)

    new_count = 0
    async for batch in client.iter_player_matches(account_id):
        # OpenDota returns newest-first; once a batch is fully-contained
        # in what we already have, we can stop paging.
        fresh = [m for m in batch if m["match_id"] not in known_ids]
        if not fresh:
            break
        with connection() as conn:
            _upsert_matches(conn, fresh)
            _upsert_match_players(conn, fresh, account_id)
        new_count += len(fresh)
        known_ids.update(m["match_id"] for m in fresh)
        # If the batch straddled the known/unknown boundary we've hit the
        # backfill frontier — no newer data beyond this batch.
        if len(fresh) < len(batch):
            break

    return {
        "account_id": account_id,
        "new_matches": new_count,
        "max_existing": max_existing,
    }


def _max_match_id(conn: duckdb.DuckDBPyConnection, account_id: int) -> int | None:
    row = conn.execute(
        "SELECT max(match_id) FROM match_players WHERE account_id = ?",
        [account_id],
    ).fetchone()
    return row[0] if row and row[0] is not None else None


def _known_match_ids(conn: duckdb.DuckDBPyConnection, account_id: int) -> set[int]:
    rows = conn.execute(
        "SELECT match_id FROM match_players WHERE account_id = ?",
        [account_id],
    ).fetchall()
    return {r[0] for r in rows}
