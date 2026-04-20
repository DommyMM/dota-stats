"""Seed: one-time historical backfill per tracked account.

Pages /players/{id}/matches backward via less_than_match_id and upserts
basic fields. Full match detail (items, draft, chat, …) is the job of
enrich, not seed. Crash-resumable via ingest_cursors.
"""
from __future__ import annotations

import logging
from datetime import UTC, datetime
from typing import Any

import duckdb
from rich.console import Console

from dota_local.config import get_settings
from dota_local.db import connection
from dota_local.opendota import OpenDotaClient

log = logging.getLogger(__name__)
console = Console()

_MATCH_COLS = (
    "match_id", "start_time", "duration", "game_mode", "lobby_type",
    "radiant_win", "avg_rank_tier", "region", "parse_status", "source",
)
_MP_COLS = (
    "match_id", "player_slot", "account_id", "hero_id", "is_radiant",
    "kills", "deaths", "assists", "gpm", "xpm", "last_hits", "denies",
    "hero_damage", "tower_damage", "hero_healing", "level",
    "lane", "lane_role", "leaver_status", "party_size", "rank_tier",
)


async def seed(account_ids: list[int]) -> None:
    settings = get_settings()
    async with OpenDotaClient(api_key=settings.opendota_api_key or None) as client:
        for acct in account_ids:
            await _seed_account(client, acct)


async def _seed_account(client: OpenDotaClient, account_id: int) -> None:
    with connection() as conn:
        _mark_tracked(conn, account_id)
        cursor = _get_cursor(conn, account_id)

    console.print(f"[cyan]seed[/cyan] account_id={account_id} resume_cursor={cursor}")
    total = 0
    async for batch in client.iter_player_matches(account_id, less_than_match_id=cursor):
        with connection() as conn:
            _upsert_matches(conn, batch)
            _upsert_match_players(conn, batch, account_id)
            batch_min = min(m["match_id"] for m in batch)
            cursor = batch_min if cursor is None else min(cursor, batch_min)
            _save_cursor(conn, account_id, cursor)
        total += len(batch)
        console.print(f"  +{len(batch)}  total={total}  cursor={cursor}")
    console.print(f"[green]done[/green] account_id={account_id} total={total}")


def _mark_tracked(conn: duckdb.DuckDBPyConnection, account_id: int) -> None:
    conn.execute(
        """
        INSERT INTO players (account_id, is_tracked, last_updated)
        VALUES (?, TRUE, now())
        ON CONFLICT (account_id) DO UPDATE SET
            is_tracked = TRUE,
            last_updated = now()
        """,
        [account_id],
    )


def _get_cursor(conn: duckdb.DuckDBPyConnection, account_id: int) -> int | None:
    row = conn.execute(
        "SELECT last_seen_match_id FROM ingest_cursors "
        "WHERE account_id = ? AND source = 'opendota'",
        [account_id],
    ).fetchone()
    return row[0] if row else None


def _save_cursor(conn: duckdb.DuckDBPyConnection, account_id: int, match_id: int) -> None:
    conn.execute(
        """
        INSERT INTO ingest_cursors (account_id, source, last_seen_match_id, last_run_at)
        VALUES (?, 'opendota', ?, now())
        ON CONFLICT (account_id, source) DO UPDATE SET
            last_seen_match_id = excluded.last_seen_match_id,
            last_run_at = excluded.last_run_at
        """,
        [account_id, match_id],
    )


def _upsert_matches(conn: duckdb.DuckDBPyConnection, batch: list[dict[str, Any]]) -> None:
    rows = [_match_row(m) for m in batch]
    placeholders = ", ".join(["?"] * len(_MATCH_COLS))
    conn.executemany(
        f"INSERT INTO matches ({', '.join(_MATCH_COLS)}) VALUES ({placeholders}) "
        "ON CONFLICT (match_id) DO NOTHING",
        rows,
    )


def _upsert_match_players(
    conn: duckdb.DuckDBPyConnection,
    batch: list[dict[str, Any]],
    account_id: int,
) -> None:
    rows = [_mp_row(m, account_id) for m in batch]
    placeholders = ", ".join(["?"] * len(_MP_COLS))
    conn.executemany(
        f"INSERT INTO match_players ({', '.join(_MP_COLS)}) VALUES ({placeholders}) "
        "ON CONFLICT (match_id, player_slot) DO NOTHING",
        rows,
    )


def _match_row(m: dict[str, Any]) -> list[Any]:
    return [
        m["match_id"],
        _to_ts(m.get("start_time")),
        m.get("duration"),
        m.get("game_mode"),
        m.get("lobby_type"),
        bool(m["radiant_win"]) if m.get("radiant_win") is not None else None,
        m.get("average_rank"),
        m.get("cluster"),
        "parsed" if m.get("version") else "unparsed",
        "opendota",
    ]


def _mp_row(m: dict[str, Any], account_id: int) -> list[Any]:
    slot = m.get("player_slot")
    is_radiant = None if slot is None else slot < 128
    return [
        m["match_id"],
        slot,
        account_id,
        m.get("hero_id"),
        is_radiant,
        m.get("kills"),
        m.get("deaths"),
        m.get("assists"),
        m.get("gold_per_min"),
        m.get("xp_per_min"),
        m.get("last_hits"),
        m.get("denies"),
        m.get("hero_damage"),
        m.get("tower_damage"),
        m.get("hero_healing"),
        m.get("level"),
        m.get("lane"),
        m.get("lane_role"),
        m.get("leaver_status"),
        m.get("party_size"),
        m.get("average_rank"),
    ]


def _to_ts(unix: int | None) -> datetime | None:
    if unix is None:
        return None
    return datetime.fromtimestamp(unix, tz=UTC)
