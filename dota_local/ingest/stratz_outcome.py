"""Stratz match-outcome backfill.

For each match we haven't tagged yet, pull analysisOutcome + lane outcomes
from Stratz and write them back onto the `matches` row. Safe to re-run;
only unfetched rows are queried unless --refetch is passed.
"""
from __future__ import annotations

import logging
from typing import Any

import duckdb
from rich.console import Console

from dota_local.config import get_settings
from dota_local.db import connection
from dota_local.stratz import StratzClient

log = logging.getLogger(__name__)
console = Console()

# Stratz accepts long queries but we keep chunks modest so one transient
# failure only wastes a small window's worth of progress.
CHUNK_SIZE = 25


async def backfill_outcomes(
    limit: int | None = None,
    refetch: bool = False,
) -> dict[str, Any]:
    settings = get_settings()
    with connection() as conn:
        match_ids = _pick_targets(conn, limit=limit, refetch=refetch)

    if not match_ids:
        console.print("[green]nothing to do[/green] — all matches already tagged")
        return {"requested": 0, "tagged": 0, "missing": 0}

    console.print(f"[cyan]stratz[/cyan] fetching analysis for {len(match_ids)} matches")

    tagged = 0
    missing = 0
    async with StratzClient(token=settings.stratz_token) as client:
        for i in range(0, len(match_ids), CHUNK_SIZE):
            chunk = match_ids[i : i + CHUNK_SIZE]
            result = await client.fetch_match_analysis(chunk)
            # Write whatever came back and zero out 'missing' rows so we
            # don't re-query them next sweep.
            with connection() as conn:
                _write_results(conn, chunk, result)
            tagged += len(result)
            missing += len(chunk) - len(result)
            console.print(
                f"  chunk {i // CHUNK_SIZE + 1}: +{len(result)} tagged, "
                f"{len(chunk) - len(result)} missing "
                f"(running total: {tagged} / {len(match_ids)})"
            )

    console.print(
        f"[green]done[/green] tagged={tagged} missing={missing} "
        f"(missing = private/purged on Stratz's side)"
    )
    return {"requested": len(match_ids), "tagged": tagged, "missing": missing}


def _pick_targets(
    conn: duckdb.DuckDBPyConnection,
    limit: int | None,
    refetch: bool,
) -> list[int]:
    where = "" if refetch else "WHERE stratz_fetched_at IS NULL"
    # Newest-first so the UI sees recent games tagged first if we cancel.
    sql = f"SELECT match_id FROM matches {where} ORDER BY start_time DESC NULLS LAST"
    if limit:
        sql += f" LIMIT {int(limit)}"
    return [r[0] for r in conn.execute(sql).fetchall()]


def _write_results(
    conn: duckdb.DuckDBPyConnection,
    chunk: list[int],
    result: dict[int, dict[str, Any]],
) -> None:
    for match_id in chunk:
        row = result.get(match_id)
        if row is None:
            # Stratz doesn't know about it — stamp fetched_at so we stop
            # retrying, but leave the outcome columns null.
            conn.execute(
                "UPDATE matches SET stratz_fetched_at = now() WHERE match_id = ?",
                [match_id],
            )
            continue
        conn.execute(
            """
            UPDATE matches
               SET analysis_outcome  = ?,
                   top_lane_outcome  = ?,
                   mid_lane_outcome  = ?,
                   bot_lane_outcome  = ?,
                   stratz_fetched_at = now()
             WHERE match_id = ?
            """,
            [
                row["analysis_outcome"],
                row["top_lane_outcome"],
                row["mid_lane_outcome"],
                row["bot_lane_outcome"],
                match_id,
            ],
        )
