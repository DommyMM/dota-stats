from __future__ import annotations

from datetime import datetime
from typing import Annotated, Any

from fastapi import APIRouter, Query

from dota_local.api.filters import (
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
        result=result, parsed_only=parsed_only, leaver_only=leaver_only,
        limit=1, offset=0, order_by="start_time", order_dir="desc",
    )
    sql, params = compile_summary(f)
    with connection(read_only=True) as conn:
        cursor = conn.execute(sql, params)
        cols = [d[0] for d in cursor.description]
        row = cursor.fetchone()
    return dict(zip(cols, row)) if row else {}
