"""MatchFilter + SQL compiler. Everything Stratz exposes as URL params
on /players/{id}/matches maps to a MatchFilter field, which compiles to
a single WHERE clause against match_players joined to matches.

The headline filter is co-presence: "matches where these account_ids
were on my team" (with_accounts) or "on the enemy team"
(against_accounts), implemented via a grouped IN-subquery pinned to
`mp.is_radiant` so the semantics honor radiant/dire-relative teams.
"""
from __future__ import annotations

from datetime import datetime
from typing import Any, Literal

from pydantic import BaseModel, Field

ResultFilter = Literal["win", "loss"]
AnalysisOutcome = Literal["none", "stomped", "comeback", "close_game"]
OrderBy = Literal[
    "start_time", "duration", "kills", "deaths", "assists",
    "gpm", "xpm", "net_worth", "imp",
]
OrderDir = Literal["asc", "desc"]


class MatchFilter(BaseModel):
    """All optional except account_id. Lists are OR within themselves,
    AND across fields (standard Stratz semantics)."""

    account_id: int = Field(description="The 'me' pin — every returned row is this account's row.")

    # Who else was in the match.
    with_accounts: list[int] = Field(default_factory=list)
    against_accounts: list[int] = Field(default_factory=list)

    # Heroes.
    hero_ids: list[int] = Field(default_factory=list)  # MY hero
    with_hero_ids: list[int] = Field(default_factory=list)  # an ally's hero
    against_hero_ids: list[int] = Field(default_factory=list)  # an enemy's hero

    # Match-level.
    game_modes: list[int] = Field(default_factory=list)
    lobby_types: list[int] = Field(default_factory=list)
    patches: list[int] = Field(default_factory=list)
    party_sizes: list[int] = Field(default_factory=list)

    # Player-level derived.
    positions: list[int] = Field(default_factory=list)  # 1-5 (lane_role for now)
    facet_ids: list[int] = Field(default_factory=list)
    leaver_only: bool = False
    parsed_only: bool = False

    # Ranges.
    date_from: datetime | None = None
    date_to: datetime | None = None
    duration_min_s: int | None = None
    duration_max_s: int | None = None
    rank_tier_min: int | None = None
    rank_tier_max: int | None = None

    # Outcome.
    result: ResultFilter | None = None
    # Stratz's match-level tag: stomped / comeback / close_game / none. A
    # list lets us filter e.g. both "comeback" and "close_game" at once.
    analysis_outcomes: list[AnalysisOutcome] = Field(default_factory=list)

    # Paging / ordering.
    limit: int = Field(default=100, ge=1, le=1000)
    offset: int = Field(default=0, ge=0)
    order_by: OrderBy = "start_time"
    order_dir: OrderDir = "desc"


_ORDER_MAP: dict[str, str] = {
    "start_time": "m.start_time",
    "duration": "m.duration",
    "kills": "mp.kills",
    "deaths": "mp.deaths",
    "assists": "mp.assists",
    "gpm": "mp.gpm",
    "xpm": "mp.xpm",
    "net_worth": "mp.net_worth",
    "imp": "mp.imp",
}

_SELECT = """
    m.match_id, m.start_time, m.duration, m.game_mode, m.lobby_type,
    m.patch, m.radiant_win, m.avg_rank_tier, m.parse_status, m.region,
    m.analysis_outcome, m.top_lane_outcome, m.mid_lane_outcome, m.bot_lane_outcome,
    mp.player_slot, mp.account_id, mp.hero_id, mp.is_radiant,
    mp.kills, mp.deaths, mp.assists,
    mp.gpm, mp.xpm, mp.last_hits, mp.denies,
    mp.hero_damage, mp.tower_damage, mp.hero_healing, mp.net_worth, mp.level,
    mp.lane, mp.lane_role, mp.position, mp.facet_id,
    mp.party_id, mp.party_size, mp.leaver_status, mp.rank_tier, mp.imp,
    (mp.is_radiant = m.radiant_win) AS won
"""


def compile_matches(f: MatchFilter) -> tuple[str, list[Any]]:
    where, params = _compile_where(f)
    order_col = _ORDER_MAP[f.order_by]
    order_dir = "DESC" if f.order_dir == "desc" else "ASC"
    sql = (
        f"SELECT {_SELECT} FROM match_players mp "
        f"JOIN matches m USING (match_id) "
        f"WHERE {where} "
        f"ORDER BY {order_col} {order_dir} NULLS LAST "
        f"LIMIT ? OFFSET ?"
    )
    params.extend([f.limit, f.offset])
    return sql, params


def compile_where(f: MatchFilter) -> tuple[str, list[Any]]:
    """Public entry for the WHERE clause + bound params against
    `match_players mp JOIN matches m USING (match_id)`. Used by the
    /api/stats/* aggregates so the panels stay in lockstep with the
    table filter state."""
    return _compile_where(f)


def compile_summary(f: MatchFilter) -> tuple[str, list[Any]]:
    """Counts + rate aggregates against the filter set. Shares the WHERE
    clause with compile_matches so the two stay in lockstep."""
    where, params = _compile_where(f)
    sql = (
        "SELECT "
        "  count(*) AS matches, "
        "  sum(CASE WHEN mp.is_radiant = m.radiant_win THEN 1 ELSE 0 END) AS wins, "
        "  sum(CASE WHEN mp.is_radiant = m.radiant_win THEN 0 ELSE 1 END) AS losses, "
        "  avg(CASE WHEN mp.is_radiant = m.radiant_win THEN 1.0 ELSE 0.0 END) AS winrate, "
        "  avg(mp.kills) AS avg_kills, "
        "  avg(mp.deaths) AS avg_deaths, "
        "  avg(mp.assists) AS avg_assists, "
        "  avg(mp.gpm) AS avg_gpm, "
        "  avg(mp.xpm) AS avg_xpm, "
        "  avg(mp.imp) AS avg_imp, "
        "  min(m.start_time) AS first_match, "
        "  max(m.start_time) AS last_match "
        f"FROM match_players mp JOIN matches m USING (match_id) WHERE {where}"
    )
    return sql, params


def _compile_where(f: MatchFilter) -> tuple[str, list[Any]]:
    clauses: list[str] = ["mp.account_id = ?"]
    params: list[Any] = [f.account_id]

    _in(clauses, params, "mp.hero_id", f.hero_ids)
    _in(clauses, params, "m.game_mode", f.game_modes)
    _in(clauses, params, "m.lobby_type", f.lobby_types)
    _in(clauses, params, "m.patch", f.patches)
    _in(clauses, params, "mp.party_size", f.party_sizes)
    _in(clauses, params, "mp.lane_role", f.positions)
    _in(clauses, params, "mp.facet_id", f.facet_ids)

    if f.date_from is not None:
        clauses.append("m.start_time >= ?")
        params.append(f.date_from)
    if f.date_to is not None:
        clauses.append("m.start_time <= ?")
        params.append(f.date_to)

    if f.duration_min_s is not None:
        clauses.append("m.duration >= ?")
        params.append(f.duration_min_s)
    if f.duration_max_s is not None:
        clauses.append("m.duration <= ?")
        params.append(f.duration_max_s)

    if f.rank_tier_min is not None:
        clauses.append("m.avg_rank_tier >= ?")
        params.append(f.rank_tier_min)
    if f.rank_tier_max is not None:
        clauses.append("m.avg_rank_tier <= ?")
        params.append(f.rank_tier_max)

    if f.result == "win":
        clauses.append("(mp.is_radiant = m.radiant_win)")
    elif f.result == "loss":
        clauses.append("(mp.is_radiant != m.radiant_win)")

    if f.leaver_only:
        clauses.append("mp.leaver_status > 0")
    if f.parsed_only:
        clauses.append("m.parse_status = 'parsed'")

    if f.analysis_outcomes:
        placeholders = ",".join(["?"] * len(f.analysis_outcomes))
        clauses.append(f"m.analysis_outcome IN ({placeholders})")
        params.extend(f.analysis_outcomes)

    if f.with_accounts:
        placeholders = ",".join(["?"] * len(f.with_accounts))
        clauses.append(
            f"m.match_id IN ("
            f"  SELECT mp2.match_id FROM match_players mp2"
            f"  WHERE mp2.account_id IN ({placeholders})"
            f"    AND mp2.is_radiant = mp.is_radiant"
            f"    AND mp2.account_id != mp.account_id"
            f"  GROUP BY mp2.match_id"
            f"  HAVING COUNT(DISTINCT mp2.account_id) = ?"
            f")"
        )
        params.extend(f.with_accounts)
        params.append(len(f.with_accounts))

    if f.against_accounts:
        placeholders = ",".join(["?"] * len(f.against_accounts))
        clauses.append(
            f"m.match_id IN ("
            f"  SELECT mp2.match_id FROM match_players mp2"
            f"  WHERE mp2.account_id IN ({placeholders})"
            f"    AND mp2.is_radiant != mp.is_radiant"
            f"  GROUP BY mp2.match_id"
            f"  HAVING COUNT(DISTINCT mp2.account_id) = ?"
            f")"
        )
        params.extend(f.against_accounts)
        params.append(len(f.against_accounts))

    if f.with_hero_ids:
        placeholders = ",".join(["?"] * len(f.with_hero_ids))
        clauses.append(
            f"m.match_id IN ("
            f"  SELECT mp3.match_id FROM match_players mp3"
            f"  WHERE mp3.hero_id IN ({placeholders})"
            f"    AND mp3.is_radiant = mp.is_radiant"
            f"    AND mp3.player_slot != mp.player_slot"
            f")"
        )
        params.extend(f.with_hero_ids)

    if f.against_hero_ids:
        placeholders = ",".join(["?"] * len(f.against_hero_ids))
        clauses.append(
            f"m.match_id IN ("
            f"  SELECT mp4.match_id FROM match_players mp4"
            f"  WHERE mp4.hero_id IN ({placeholders})"
            f"    AND mp4.is_radiant != mp.is_radiant"
            f")"
        )
        params.extend(f.against_hero_ids)

    return " AND ".join(clauses), params


def _in(clauses: list[str], params: list[Any], col: str, vals: list[Any]) -> None:
    if not vals:
        return
    placeholders = ",".join(["?"] * len(vals))
    clauses.append(f"{col} IN ({placeholders})")
    params.extend(vals)
