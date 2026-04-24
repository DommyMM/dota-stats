from __future__ import annotations

from datetime import datetime
from typing import Annotated, Any

from fastapi import APIRouter, HTTPException, Query

from dota_local.api.filters import (
    AnalysisOutcome,
    MatchFilter,
    OrderBy,
    OrderDir,
    ResultFilter,
    compile_matches,
    compile_summary,
)
from dota_local.db import connection

router = APIRouter(prefix="/api", tags=["matches"])


def _filter_from_query(
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
    analysis_outcome: list[AnalysisOutcome],
    parsed_only: bool,
    leaver_only: bool,
    limit: int,
    offset: int,
    order_by: OrderBy,
    order_dir: OrderDir,
) -> MatchFilter:
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
        analysis_outcomes=analysis_outcome,
        parsed_only=parsed_only,
        leaver_only=leaver_only,
        limit=limit,
        offset=offset,
        order_by=order_by,
        order_dir=order_dir,
    )


_CommonQuery = dict(
    hero_id=Query(default=[]),
    with_account=Query(default=[]),
    against_account=Query(default=[]),
    with_hero_id=Query(default=[]),
    against_hero_id=Query(default=[]),
    game_mode=Query(default=[]),
    lobby_type=Query(default=[]),
    patch=Query(default=[]),
    party_size=Query(default=[]),
    position=Query(default=[]),
    facet_id=Query(default=[]),
)


@router.get("/matches")
def list_matches(
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
    analysis_outcome: Annotated[list[AnalysisOutcome], Query()] = [],
    parsed_only: bool = False,
    leaver_only: bool = False,
    limit: int = 100,
    offset: int = 0,
    order_by: OrderBy = "start_time",
    order_dir: OrderDir = "desc",
) -> dict[str, Any]:
    f = _filter_from_query(**{k: v for k, v in locals().items()})
    sql, params = compile_matches(f)
    with connection(read_only=True) as conn:
        cursor = conn.execute(sql, params)
        cols = [d[0] for d in cursor.description]
        rows = cursor.fetchall()
    return {"matches": [dict(zip(cols, r)) for r in rows]}


@router.get("/matches/summary")
def match_summary(
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
    analysis_outcome: Annotated[list[AnalysisOutcome], Query()] = [],
    parsed_only: bool = False,
    leaver_only: bool = False,
) -> dict[str, Any]:
    # Summary ignores paging + ordering.
    f = _filter_from_query(
        account_id=account_id,
        hero_id=hero_id, with_account=with_account, against_account=against_account,
        with_hero_id=with_hero_id, against_hero_id=against_hero_id,
        game_mode=game_mode, lobby_type=lobby_type, patch=patch,
        party_size=party_size, position=position, facet_id=facet_id,
        date_from=date_from, date_to=date_to,
        duration_min_s=duration_min_s, duration_max_s=duration_max_s,
        rank_tier_min=rank_tier_min, rank_tier_max=rank_tier_max,
        result=result, analysis_outcome=analysis_outcome,
        parsed_only=parsed_only, leaver_only=leaver_only,
        limit=1, offset=0, order_by="start_time", order_dir="desc",
    )
    sql, params = compile_summary(f)
    with connection(read_only=True) as conn:
        cursor = conn.execute(sql, params)
        cols = [d[0] for d in cursor.description]
        row = cursor.fetchone()
    return dict(zip(cols, row)) if row else {}


@router.get("/matches/{match_id}")
def match_detail(match_id: int) -> dict[str, Any]:
    """Full parsed detail for a single match: the 10 players with
    per-slot stats + facet + items, draft order, ability-upgrade log,
    objective log, chat, and teamfight spans.

    Kill-by-hero breakdowns are not stored — OpenDota's parsed match
    surfaces `kills_log` and `targets` per player, but we don't persist
    it yet. The UI should fall back to per-player kill totals from
    `players[*].kills`.
    """
    with connection(read_only=True) as conn:
        match_row = conn.execute(
            "SELECT match_id, start_time, duration, game_mode, lobby_type, patch, "
            "region, radiant_win, avg_rank_tier, parse_status, source, replay_url, "
            "analysis_outcome, top_lane_outcome, mid_lane_outcome, bot_lane_outcome "
            "FROM matches WHERE match_id = ?",
            [match_id],
        ).fetchone()
        if match_row is None:
            raise HTTPException(status_code=404, detail="match not found")
        match_cols = [
            "match_id", "start_time", "duration", "game_mode", "lobby_type", "patch",
            "region", "radiant_win", "avg_rank_tier", "parse_status", "source", "replay_url",
            "analysis_outcome", "top_lane_outcome", "mid_lane_outcome", "bot_lane_outcome",
        ]
        match = dict(zip(match_cols, match_row))

        players = _rows(
            conn,
            "SELECT player_slot, account_id, hero_id, is_radiant, kills, deaths, assists, "
            "gpm, xpm, last_hits, denies, hero_damage, tower_damage, hero_healing, "
            "net_worth, level, lane, lane_role, position, facet_id, party_id, "
            "party_size, leaver_status, rank_tier, imp "
            "FROM match_players WHERE match_id = ? ORDER BY player_slot",
            [match_id],
        )
        # Attach the final inventory to each player so the UI doesn't
        # need a follow-up round-trip per player_slot.
        item_rows = _rows(
            conn,
            "SELECT player_slot, slot_idx, item_id, ts_purchased "
            "FROM match_player_items WHERE match_id = ? ORDER BY player_slot, slot_idx",
            [match_id],
        )
        items_by_slot: dict[int, list[dict[str, Any]]] = {}
        for r in item_rows:
            items_by_slot.setdefault(r["player_slot"], []).append(
                {"slot_idx": r["slot_idx"], "item_id": r["item_id"], "ts_purchased": r["ts_purchased"]}
            )
        for p in players:
            p["items"] = items_by_slot.get(p["player_slot"], [])

        ability_rows = _rows(
            conn,
            "SELECT player_slot, ability_id, level, time "
            "FROM match_player_abilities WHERE match_id = ? ORDER BY player_slot, level",
            [match_id],
        )
        abilities_by_slot: dict[int, list[dict[str, Any]]] = {}
        for r in ability_rows:
            abilities_by_slot.setdefault(r["player_slot"], []).append(
                {"ability_id": r["ability_id"], "level": r["level"], "time": r["time"]}
            )
        for p in players:
            p["ability_upgrades"] = abilities_by_slot.get(p["player_slot"], [])

        draft = _rows(
            conn,
            "SELECT order_idx, is_pick, is_radiant, hero_id, player_slot "
            "FROM match_draft WHERE match_id = ? ORDER BY order_idx",
            [match_id],
        )
        objectives = _rows(
            conn,
            "SELECT time, type, value, slot FROM match_objectives "
            "WHERE match_id = ? ORDER BY time",
            [match_id],
        )
        chat = _rows(
            conn,
            "SELECT time, slot, type, text FROM match_chat "
            "WHERE match_id = ? ORDER BY time",
            [match_id],
        )
        teamfights = _rows(
            conn,
            "SELECT start_ts, end_ts, deaths FROM match_teamfights "
            "WHERE match_id = ? ORDER BY start_ts",
            [match_id],
        )

    return {
        "match": match,
        "players": players,
        "draft": draft,
        "objectives": objectives,
        "chat": chat,
        "teamfights": teamfights,
    }


def _rows(conn, sql: str, params: list[Any]) -> list[dict[str, Any]]:
    cursor = conn.execute(sql, params)
    cols = [d[0] for d in cursor.description]
    return [dict(zip(cols, r)) for r in cursor.fetchall()]
