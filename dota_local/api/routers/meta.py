"""Metadata endpoints: hero/item lookups plus the list of account_ids
the UI should offer in the co-presence pickers (drawn from the local
match history rather than a global Steam list)."""
from __future__ import annotations

import json
from typing import Any

from fastapi import APIRouter

from dota_local.db import connection

router = APIRouter(prefix="/api/meta", tags=["meta"])


@router.get("/heroes")
def heroes() -> list[dict[str, Any]]:
    with connection(read_only=True) as conn:
        rows = conn.execute(
            "SELECT hero_id, name, localized_name, primary_attr, roles, facets "
            "FROM heroes ORDER BY localized_name"
        ).fetchall()
    return [
        {
            "hero_id": r[0],
            "name": r[1],
            "localized_name": r[2],
            "primary_attr": r[3],
            "roles": json.loads(r[4]) if r[4] else [],
            "facets": json.loads(r[5]) if r[5] else [],
        }
        for r in rows
    ]


@router.get("/items")
def items() -> list[dict[str, Any]]:
    with connection(read_only=True) as conn:
        rows = conn.execute(
            "SELECT item_id, name, cost FROM items ORDER BY name"
        ).fetchall()
    return [{"item_id": r[0], "name": r[1], "cost": r[2]} for r in rows]


@router.get("/abilities")
def abilities() -> list[dict[str, Any]]:
    with connection(read_only=True) as conn:
        rows = conn.execute(
            "SELECT ability_id, name, is_ultimate FROM abilities ORDER BY name"
        ).fetchall()
    return [
        {"ability_id": r[0], "name": r[1], "is_ultimate": bool(r[2])}
        for r in rows
    ]


@router.get("/accounts")
def accounts(min_matches: int = 1, tracked: int | None = None) -> list[dict[str, Any]]:
    """Accounts seen in match_players, ordered by how often they show up
    alongside tracked players. Powers the co-presence filter picker.

    - min_matches: drop long-tail noise.
    - tracked: if set, count only co-occurrences with this account_id.
    """
    where = ["account_id IS NOT NULL", "account_id != 0"]
    params: list[Any] = []
    if tracked is not None:
        where.append(
            "match_id IN (SELECT match_id FROM match_players WHERE account_id = ?)"
        )
        params.append(tracked)
    sql = (
        "SELECT account_id, count(*) AS match_count "
        f"FROM match_players WHERE {' AND '.join(where)} "
        "GROUP BY account_id HAVING count(*) >= ? "
        "ORDER BY match_count DESC"
    )
    params.append(min_matches)
    with connection(read_only=True) as conn:
        rows = conn.execute(sql, params).fetchall()
        tracked_ids = {
            r[0] for r in conn.execute(
                "SELECT account_id FROM players WHERE is_tracked"
            ).fetchall()
        }
    return [
        {"account_id": r[0], "match_count": r[1], "tracked": r[0] in tracked_ids}
        for r in rows
    ]
