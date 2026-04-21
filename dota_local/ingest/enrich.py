"""Enrich: per-match detail via OpenDota `/matches/{id}`.

Drains the set of non-parsed matches, newest first, and either:
- unpacks the parsed JSON across matches + match_players + match_draft
  + match_player_abilities + match_player_items + match_objectives +
  match_chat + match_teamfights, or
- fires `/request/{id}` to queue a parse if Valve still has the replay
  (~8-day retention; we use 14 as a conservative window), or
- marks the match `unparseable` when it's too old to request.

Stratz-only fields (IMP, smurf flag, facet weighting) land in M5.
"""
from __future__ import annotations

import logging
from datetime import UTC, datetime, timedelta
from typing import Any

import duckdb
from rich.console import Console

from dota_local.config import get_settings
from dota_local.db import connection
from dota_local.opendota import OpenDotaClient

log = logging.getLogger(__name__)
console = Console()

# Valve replay retention ≈ 8 days; pad for safety / timezone sloppiness.
REPLAY_WINDOW_DAYS = 14

_MP_COLS = (
    "match_id", "player_slot", "account_id", "hero_id", "is_radiant",
    "kills", "deaths", "assists", "gpm", "xpm", "last_hits", "denies",
    "hero_damage", "tower_damage", "hero_healing", "net_worth", "level",
    "lane", "lane_role", "position", "facet_id",
    "party_id", "party_size", "leaver_status", "rank_tier",
)


async def enrich(
    limit: int | None = None,
    recent_only: bool = False,
    include_parsed: bool = False,
) -> None:
    """Walk non-parsed matches and fetch detail.

    - limit: cap per run. None = all.
    - recent_only: restrict to matches within REPLAY_WINDOW_DAYS. Useful
      to trigger parse requests without wasting calls on old matches.
    - include_parsed: also re-fetch matches already marked parsed; for
      backfills when the extractor gains a new table/column.
    """
    settings = get_settings()
    targets = _pick_targets(limit=limit, recent_only=recent_only, include_parsed=include_parsed)
    if not targets:
        console.print("[green]nothing to enrich[/green]")
        return

    console.print(f"[cyan]enriching[/cyan] {len(targets)} match(es)")
    counts = {"parsed": 0, "requested": 0, "unparseable": 0, "unavailable": 0, "errors": 0}
    async with OpenDotaClient(api_key=settings.opendota_api_key or None) as client:
        for i, (match_id, start_ts) in enumerate(targets, 1):
            try:
                outcome = await _enrich_one(client, match_id, start_ts)
            except Exception as exc:  # noqa: BLE001
                log.exception("enrich failed for match %s", match_id)
                counts["errors"] += 1
                console.print(f"  [{i}/{len(targets)}] {match_id} [red]error[/red] {exc}")
                continue
            counts[outcome] += 1
            console.print(f"  [{i}/{len(targets)}] {match_id} [dim]→[/dim] {outcome}")
    console.print(f"[green]done[/green] {counts}")


def _pick_targets(
    limit: int | None, recent_only: bool, include_parsed: bool
) -> list[tuple[int, datetime | None]]:
    where: list[str] = []
    if not include_parsed:
        where.append("(parse_status IS NULL OR parse_status NOT IN ('parsed', 'unparseable'))")
    if recent_only:
        where.append(f"start_time >= now() - INTERVAL {REPLAY_WINDOW_DAYS} DAY")
    where_sql = f"WHERE {' AND '.join(where)}" if where else ""
    limit_sql = f"LIMIT {int(limit)}" if limit else ""
    sql = (
        f"SELECT match_id, start_time FROM matches {where_sql} "
        f"ORDER BY start_time DESC NULLS LAST {limit_sql}"
    )
    with connection(read_only=True) as conn:
        return [(r[0], r[1]) for r in conn.execute(sql).fetchall()]


async def _enrich_one(
    client: OpenDotaClient, match_id: int, start_time: datetime | None
) -> str:
    detail = await client.get_match(match_id)
    if detail is None:
        _set_status(match_id, "unavailable")
        return "unavailable"

    if detail.get("version") is not None:
        _extract_parsed(detail)
        return "parsed"

    # Not parsed. Decide: request, or give up.
    if _within_replay_window(start_time, detail.get("start_time")):
        job = await client.request_parse(match_id)
        if job is None:
            _set_status(match_id, "unparseable")
            return "unparseable"
        _set_status(match_id, "pending")
        return "requested"

    _set_status(match_id, "unparseable")
    return "unparseable"


def _within_replay_window(
    cached_start: datetime | None, detail_start_unix: int | None
) -> bool:
    if cached_start is not None:
        dt = cached_start if cached_start.tzinfo else cached_start.replace(tzinfo=UTC)
    elif detail_start_unix is not None:
        dt = datetime.fromtimestamp(detail_start_unix, tz=UTC)
    else:
        return False
    return dt > datetime.now(UTC) - timedelta(days=REPLAY_WINDOW_DAYS)


def _set_status(match_id: int, status: str) -> None:
    with connection() as conn:
        conn.execute(
            "UPDATE matches SET parse_status = ? WHERE match_id = ?",
            [status, match_id],
        )


# --- parsed-match extraction ------------------------------------------------


def _extract_parsed(m: dict[str, Any]) -> None:
    match_id = m["match_id"]
    with connection() as conn:
        conn.execute("BEGIN TRANSACTION")
        try:
            _update_match(conn, m)
            _upsert_match_players(conn, m)
            _replace_child(conn, "match_draft", match_id, _draft_rows(m))
            _replace_child(conn, "match_player_abilities", match_id, _ability_rows(m))
            _replace_child(conn, "match_player_items", match_id, _item_rows(m))
            _replace_child(conn, "match_objectives", match_id, _objective_rows(m))
            _replace_child(conn, "match_chat", match_id, _chat_rows(m))
            _replace_child(conn, "match_teamfights", match_id, _teamfight_rows(m))
            conn.execute("COMMIT")
        except Exception:
            conn.execute("ROLLBACK")
            raise


def _update_match(conn: duckdb.DuckDBPyConnection, m: dict[str, Any]) -> None:
    conn.execute(
        """
        UPDATE matches SET
            parse_status  = 'parsed',
            replay_url    = COALESCE(?, replay_url),
            patch         = COALESCE(?, patch),
            region        = COALESCE(?, region),
            radiant_win   = COALESCE(?, radiant_win),
            start_time    = COALESCE(?, start_time),
            duration      = COALESCE(?, duration),
            game_mode     = COALESCE(?, game_mode),
            lobby_type    = COALESCE(?, lobby_type),
            avg_rank_tier = COALESCE(?, avg_rank_tier)
        WHERE match_id = ?
        """,
        [
            m.get("replay_url"),
            m.get("patch"),
            m.get("region") or m.get("cluster"),
            _as_bool(m.get("radiant_win")),
            _as_ts(m.get("start_time")),
            m.get("duration"),
            m.get("game_mode"),
            m.get("lobby_type"),
            m.get("average_rank"),
            m["match_id"],
        ],
    )
    # If the row didn't exist at all (enriching a match we never seeded),
    # INSERT a stub so the FK-like child rows are attached to something.
    if conn.execute(
        "SELECT count(*) FROM matches WHERE match_id = ?", [m["match_id"]]
    ).fetchone()[0] == 0:
        conn.execute(
            """
            INSERT INTO matches (
                match_id, start_time, duration, game_mode, lobby_type,
                radiant_win, avg_rank_tier, region, parse_status, source,
                replay_url, patch
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'parsed', 'opendota', ?, ?)
            """,
            [
                m["match_id"],
                _as_ts(m.get("start_time")),
                m.get("duration"),
                m.get("game_mode"),
                m.get("lobby_type"),
                _as_bool(m.get("radiant_win")),
                m.get("average_rank"),
                m.get("region") or m.get("cluster"),
                m.get("replay_url"),
                m.get("patch"),
            ],
        )


def _upsert_match_players(conn: duckdb.DuckDBPyConnection, m: dict[str, Any]) -> None:
    match_id = m["match_id"]
    rows = [_mp_row(match_id, p) for p in m.get("players", [])]
    if not rows:
        return
    placeholders = ", ".join(["?"] * len(_MP_COLS))
    assignments = ", ".join(f"{c} = excluded.{c}" for c in _MP_COLS if c not in ("match_id", "player_slot"))
    conn.executemany(
        f"INSERT INTO match_players ({', '.join(_MP_COLS)}) VALUES ({placeholders}) "
        f"ON CONFLICT (match_id, player_slot) DO UPDATE SET {assignments}",
        rows,
    )


def _mp_row(match_id: int, p: dict[str, Any]) -> list[Any]:
    slot = p.get("player_slot")
    is_radiant = None if slot is None else slot < 128
    return [
        match_id,
        slot,
        p.get("account_id"),
        p.get("hero_id"),
        is_radiant,
        p.get("kills"),
        p.get("deaths"),
        p.get("assists"),
        p.get("gold_per_min"),
        p.get("xp_per_min"),
        p.get("last_hits"),
        p.get("denies"),
        p.get("hero_damage"),
        p.get("tower_damage"),
        p.get("hero_healing"),
        p.get("net_worth") or p.get("total_gold"),
        p.get("level"),
        p.get("lane"),
        p.get("lane_role"),
        _position_from_lane_role(p),
        _facet_id(p),
        p.get("party_id"),
        p.get("party_size"),
        p.get("leaver_status"),
        p.get("rank_tier"),
    ]


def _position_from_lane_role(p: dict[str, Any]) -> int | None:
    # OpenDota has no explicit "position" field; derive from lane_role when
    # available (1=safe, 2=mid, 3=off, 4=support-offlane-side, 5=soft-support).
    # Left as the lane_role for now; Stratz (M5) provides a proper position.
    return p.get("lane_role")


def _facet_id(p: dict[str, Any]) -> int | None:
    raw = p.get("hero_variant") or p.get("facet")
    try:
        return int(raw) if raw is not None else None
    except (TypeError, ValueError):
        return None


def _replace_child(
    conn: duckdb.DuckDBPyConnection,
    table: str,
    match_id: int,
    rows: list[list[Any]],
) -> None:
    """Delete-then-insert semantics for child tables. Cheap at our scale
    and avoids ON CONFLICT gymnastics for composite-key tables where the
    key columns (eg. abilities.time) change between fetches."""
    conn.execute(f"DELETE FROM {table} WHERE match_id = ?", [match_id])
    if not rows:
        return
    placeholders = ", ".join(["?"] * len(rows[0]))
    cols = _TABLE_COLS[table]
    conn.executemany(
        f"INSERT INTO {table} ({', '.join(cols)}) VALUES ({placeholders})",
        rows,
    )


_TABLE_COLS: dict[str, tuple[str, ...]] = {
    "match_draft": ("match_id", "order_idx", "is_pick", "is_radiant", "hero_id", "player_slot"),
    "match_player_abilities": ("match_id", "player_slot", "ability_id", "level", "time"),
    "match_player_items": ("match_id", "player_slot", "slot_idx", "item_id", "ts_purchased"),
    "match_objectives": ("match_id", "time", "type", "value", "slot"),
    "match_chat": ("match_id", "time", "slot", "type", "text"),
    "match_teamfights": ("match_id", "start_ts", "end_ts", "deaths"),
}


def _draft_rows(m: dict[str, Any]) -> list[list[Any]]:
    picks = m.get("picks_bans") or []
    out: list[list[Any]] = []
    match_id = m["match_id"]
    for pb in picks:
        team = pb.get("team")  # 0 radiant, 1 dire
        out.append([
            match_id,
            pb.get("order"),
            bool(pb.get("is_pick")) if pb.get("is_pick") is not None else None,
            None if team is None else team == 0,
            pb.get("hero_id"),
            pb.get("player_slot"),
        ])
    return out


def _ability_rows(m: dict[str, Any]) -> list[list[Any]]:
    out: list[list[Any]] = []
    match_id = m["match_id"]
    for p in m.get("players") or []:
        slot = p.get("player_slot")
        detailed = p.get("ability_upgrades") or []
        if detailed:
            for up in detailed:
                out.append([
                    match_id, slot,
                    up.get("ability"),
                    up.get("level"),
                    up.get("time"),
                ])
            continue
        arr = p.get("ability_upgrades_arr") or []
        for lvl, ability_id in enumerate(arr, start=1):
            out.append([match_id, slot, ability_id, lvl, None])
    return out


# Final inventory (integer item_ids). Purchase_log uses string keys which
# we'll resolve once dotaconstants is loaded.
_FINAL_SLOTS = (
    ("item_0", 0), ("item_1", 1), ("item_2", 2),
    ("item_3", 3), ("item_4", 4), ("item_5", 5),
    ("backpack_0", 6), ("backpack_1", 7), ("backpack_2", 8),
    ("item_neutral", 9),
)


def _item_rows(m: dict[str, Any]) -> list[list[Any]]:
    out: list[list[Any]] = []
    match_id = m["match_id"]
    for p in m.get("players") or []:
        slot = p.get("player_slot")
        for field, idx in _FINAL_SLOTS:
            iid = p.get(field)
            if iid:  # 0 = empty slot; skip
                out.append([match_id, slot, idx, iid, None])
    return out


def _objective_rows(m: dict[str, Any]) -> list[list[Any]]:
    out: list[list[Any]] = []
    match_id = m["match_id"]
    for obj in m.get("objectives") or []:
        value = obj.get("value")
        if not isinstance(value, int):
            value = None
        out.append([
            match_id,
            obj.get("time"),
            obj.get("type"),
            value,
            obj.get("slot"),
        ])
    return out


def _chat_rows(m: dict[str, Any]) -> list[list[Any]]:
    out: list[list[Any]] = []
    match_id = m["match_id"]
    for c in m.get("chat") or []:
        out.append([
            match_id,
            c.get("time"),
            c.get("slot"),
            c.get("type"),
            c.get("key"),
        ])
    return out


def _teamfight_rows(m: dict[str, Any]) -> list[list[Any]]:
    out: list[list[Any]] = []
    match_id = m["match_id"]
    for tf in m.get("teamfights") or []:
        out.append([
            match_id,
            tf.get("start"),
            tf.get("end"),
            tf.get("deaths"),
        ])
    return out


def _as_bool(v: Any) -> bool | None:
    return None if v is None else bool(v)


def _as_ts(unix: int | None) -> datetime | None:
    return None if unix is None else datetime.fromtimestamp(unix, tz=UTC)
