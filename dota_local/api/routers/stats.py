"""Aggregate endpoints powering the right-side panels on the matches
page: per-hero record, teammate winrate, and daily activity histogram.

Every endpoint accepts the same query-parameter surface as /api/matches
so the panels stay locked to the active table filter. Uses the shared
compile_where helper in dota_local.api.filters to avoid WHERE-clause
drift.
"""
from __future__ import annotations

from datetime import datetime
from typing import Annotated, Any

from fastapi import APIRouter, Query

from dota_local.api.filters import (
    MatchFilter,
    ResultFilter,
    compile_where,
)
from dota_local.db import connection

router = APIRouter(prefix="/api/stats", tags=["stats"])


def _filter(
    account_id: int,
    hero_id: list[int],
    with_account: list[int],
    against_account: list[int],
    with_hero_id: list[int],
    against_hero_id: list[int],
    game_mode: list[int],
    lobby_type: list[int],
    patch: list[int],
    party_size: list[int],
    position: list[int],
    facet_id: list[int],
    date_from: datetime | None,
    date_to: datetime | None,
    duration_min_s: int | None,
    duration_max_s: int | None,
    rank_tier_min: int | None,
    rank_tier_max: int | None,
    result: ResultFilter | None,
    parsed_only: bool,
    leaver_only: bool,
) -> MatchFilter:
    # limit/offset/order_* are irrelevant for aggregates; pass the
    # defaults since compile_where ignores them.
    return MatchFilter(
        account_id=account_id,
        hero_ids=hero_id,
        with_accounts=with_account,
        against_accounts=against_account,
        with_hero_ids=with_hero_id,
        against_hero_ids=against_hero_id,
        game_modes=game_mode,
        lobby_types=lobby_type,
        patches=patch,
        party_sizes=party_size,
        positions=position,
        facet_ids=facet_id,
        date_from=date_from,
        date_to=date_to,
        duration_min_s=duration_min_s,
        duration_max_s=duration_max_s,
        rank_tier_min=rank_tier_min,
        rank_tier_max=rank_tier_max,
        result=result,
        parsed_only=parsed_only,
        leaver_only=leaver_only,
    )


@router.get("/heroes")
def hero_stats(
    account_id: int,
    hero_id: Annotated[list[int], Query()] = [],
    with_account: Annotated[list[int], Query()] = [],
    against_account: Annotated[list[int], Query()] = [],
    with_hero_id: Annotated[list[int], Query()] = [],
    against_hero_id: Annotated[list[int], Query()] = [],
    game_mode: Annotated[list[int], Query()] = [],
    lobby_type: Annotated[list[int], Query()] = [],
    patch: Annotated[list[int], Query()] = [],
    party_size: Annotated[list[int], Query()] = [],
    position: Annotated[list[int], Query()] = [],
    facet_id: Annotated[list[int], Query()] = [],
    date_from: datetime | None = None,
    date_to: datetime | None = None,
    duration_min_s: int | None = None,
    duration_max_s: int | None = None,
    rank_tier_min: int | None = None,
    rank_tier_max: int | None = None,
    result: ResultFilter | None = None,
    parsed_only: bool = False,
    leaver_only: bool = False,
    limit: int = 50,
) -> dict[str, Any]:
    """Per-hero aggregates for the owner's matches under the active
    filter. Drives the "Most Played Heroes" panel + the trends donut."""
    f_obj = _filter(
        account_id=account_id,
        hero_id=hero_id, with_account=with_account, against_account=against_account,
        with_hero_id=with_hero_id, against_hero_id=against_hero_id,
        game_mode=game_mode, lobby_type=lobby_type, patch=patch,
        party_size=party_size, position=position, facet_id=facet_id,
        date_from=date_from, date_to=date_to,
        duration_min_s=duration_min_s, duration_max_s=duration_max_s,
        rank_tier_min=rank_tier_min, rank_tier_max=rank_tier_max,
        result=result, parsed_only=parsed_only, leaver_only=leaver_only,
    )
    where, params = compile_where(f_obj)
    sql = (
        "SELECT mp.hero_id, "
        "  count(*) AS games, "
        "  sum(CASE WHEN mp.is_radiant = m.radiant_win THEN 1 ELSE 0 END) AS wins, "
        "  avg(mp.kills) AS avg_kills, "
        "  avg(mp.deaths) AS avg_deaths, "
        "  avg(mp.assists) AS avg_assists, "
        "  avg(mp.gpm) AS avg_gpm, "
        "  avg(mp.xpm) AS avg_xpm, "
        "  avg(mp.imp) AS avg_imp "
        "FROM match_players mp JOIN matches m USING (match_id) "
        f"WHERE {where} "
        "GROUP BY mp.hero_id "
        "ORDER BY games DESC "
        "LIMIT ?"
    )
    params = [*params, limit]
    with connection(read_only=True) as conn:
        rows = _rows(conn, sql, params)
    for r in rows:
        r["winrate"] = (r["wins"] / r["games"]) if r["games"] else 0.0
    return {"heroes": rows}


@router.get("/teammates")
def teammate_stats(
    account_id: int,
    hero_id: Annotated[list[int], Query()] = [],
    with_account: Annotated[list[int], Query()] = [],
    against_account: Annotated[list[int], Query()] = [],
    with_hero_id: Annotated[list[int], Query()] = [],
    against_hero_id: Annotated[list[int], Query()] = [],
    game_mode: Annotated[list[int], Query()] = [],
    lobby_type: Annotated[list[int], Query()] = [],
    patch: Annotated[list[int], Query()] = [],
    party_size: Annotated[list[int], Query()] = [],
    position: Annotated[list[int], Query()] = [],
    facet_id: Annotated[list[int], Query()] = [],
    date_from: datetime | None = None,
    date_to: datetime | None = None,
    duration_min_s: int | None = None,
    duration_max_s: int | None = None,
    rank_tier_min: int | None = None,
    rank_tier_max: int | None = None,
    result: ResultFilter | None = None,
    parsed_only: bool = False,
    leaver_only: bool = False,
    limit: int = 30,
    min_games: int = 3,
) -> dict[str, Any]:
    """For every other account that shows up on the owner's team across
    the filtered match set, return games-together + wins + winrate.
    Powers the "Teammates" right-rail panel."""
    f_obj = _filter(
        account_id=account_id,
        hero_id=hero_id, with_account=with_account, against_account=against_account,
        with_hero_id=with_hero_id, against_hero_id=against_hero_id,
        game_mode=game_mode, lobby_type=lobby_type, patch=patch,
        party_size=party_size, position=position, facet_id=facet_id,
        date_from=date_from, date_to=date_to,
        duration_min_s=duration_min_s, duration_max_s=duration_max_s,
        rank_tier_min=rank_tier_min, rank_tier_max=rank_tier_max,
        result=result, parsed_only=parsed_only, leaver_only=leaver_only,
    )
    where, params = compile_where(f_obj)
    # Join matches where `me` (mp) is present, then pick up every other
    # tracked row on the same team. `won` is shared per-team so just
    # evaluate it once against `mp`.
    sql = (
        "SELECT other.account_id, "
        "  count(*) AS games, "
        "  sum(CASE WHEN mp.is_radiant = m.radiant_win THEN 1 ELSE 0 END) AS wins "
        "FROM match_players mp "
        "JOIN matches m USING (match_id) "
        "JOIN match_players other ON other.match_id = mp.match_id "
        "  AND other.is_radiant = mp.is_radiant "
        "  AND other.account_id IS NOT NULL "
        "  AND other.account_id != 0 "
        "  AND other.account_id != mp.account_id "
        f"WHERE {where} "
        "GROUP BY other.account_id "
        "HAVING count(*) >= ? "
        "ORDER BY games DESC "
        "LIMIT ?"
    )
    params = [*params, min_games, limit]
    with connection(read_only=True) as conn:
        rows = _rows(conn, sql, params)
        tracked_ids = {
            r[0] for r in conn.execute(
                "SELECT account_id FROM players WHERE is_tracked"
            ).fetchall()
        }
    for r in rows:
        r["winrate"] = (r["wins"] / r["games"]) if r["games"] else 0.0
        r["tracked"] = r["account_id"] in tracked_ids
    return {"teammates": rows}


@router.get("/activity")
def activity(
    account_id: int,
    hero_id: Annotated[list[int], Query()] = [],
    with_account: Annotated[list[int], Query()] = [],
    against_account: Annotated[list[int], Query()] = [],
    with_hero_id: Annotated[list[int], Query()] = [],
    against_hero_id: Annotated[list[int], Query()] = [],
    game_mode: Annotated[list[int], Query()] = [],
    lobby_type: Annotated[list[int], Query()] = [],
    patch: Annotated[list[int], Query()] = [],
    party_size: Annotated[list[int], Query()] = [],
    position: Annotated[list[int], Query()] = [],
    facet_id: Annotated[list[int], Query()] = [],
    date_from: datetime | None = None,
    date_to: datetime | None = None,
    duration_min_s: int | None = None,
    duration_max_s: int | None = None,
    rank_tier_min: int | None = None,
    rank_tier_max: int | None = None,
    result: ResultFilter | None = None,
    parsed_only: bool = False,
    leaver_only: bool = False,
    days: int = 180,
) -> dict[str, Any]:
    """Daily (games, wins) histogram for the activity heatmap. `days`
    caps how far back we go so the payload stays tiny."""
    f_obj = _filter(
        account_id=account_id,
        hero_id=hero_id, with_account=with_account, against_account=against_account,
        with_hero_id=with_hero_id, against_hero_id=against_hero_id,
        game_mode=game_mode, lobby_type=lobby_type, patch=patch,
        party_size=party_size, position=position, facet_id=facet_id,
        date_from=date_from, date_to=date_to,
        duration_min_s=duration_min_s, duration_max_s=duration_max_s,
        rank_tier_min=rank_tier_min, rank_tier_max=rank_tier_max,
        result=result, parsed_only=parsed_only, leaver_only=leaver_only,
    )
    where, params = compile_where(f_obj)
    sql = (
        "SELECT date_trunc('day', m.start_time)::DATE AS day, "
        "  count(*) AS games, "
        "  sum(CASE WHEN mp.is_radiant = m.radiant_win THEN 1 ELSE 0 END) AS wins "
        "FROM match_players mp JOIN matches m USING (match_id) "
        f"WHERE {where} "
        f"  AND m.start_time >= now() - INTERVAL {int(days)} DAY "
        "GROUP BY 1 "
        "ORDER BY 1"
    )
    with connection(read_only=True) as conn:
        rows = _rows(conn, sql, params)
    return {"days": rows}


def _rows(conn, sql: str, params: list[Any]) -> list[dict[str, Any]]:
    cursor = conn.execute(sql, params)
    cols = [d[0] for d in cursor.description]
    return [dict(zip(cols, r)) for r in cursor.fetchall()]
