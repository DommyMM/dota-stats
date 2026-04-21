"""Fetch hero/item/ability reference data from OpenDota's /constants/*
into the local `heroes`, `items`, `abilities` tables.

The UI resolves `hero_id` → localized name/icon against these tables,
so running this once (and weekly-ish thereafter) is required before
the frontend renders anything.
"""
from __future__ import annotations

import json
import logging
from typing import Any

import duckdb
from rich.console import Console

from dota_local.db import connection
from dota_local.opendota import OpenDotaClient

log = logging.getLogger(__name__)
console = Console()


async def load_metadata() -> None:
    async with OpenDotaClient() as c:
        heroes = await c.get("/constants/heroes")
        items = await c.get("/constants/items")
        # /constants/abilities is keyed by ability name and omits numeric
        # ids; /constants/ability_ids is the id→name map we need.
        abilities = await c.get("/constants/abilities")
        ability_ids = await c.get("/constants/ability_ids")

    with connection() as conn:
        n_h = _load_heroes(conn, heroes or {})
        n_i = _load_items(conn, items or {})
        n_a = _load_abilities(conn, abilities or {}, ability_ids or {})
    console.print(f"[green]metadata loaded[/green] heroes={n_h} items={n_i} abilities={n_a}")


def _load_heroes(conn: duckdb.DuckDBPyConnection, data: dict[str, Any]) -> int:
    rows = []
    for entry in data.values():
        rows.append([
            int(entry["id"]),
            entry.get("name"),
            entry.get("localized_name"),
            entry.get("primary_attr"),
            json.dumps(entry.get("roles") or []),
            json.dumps(entry.get("facets") or []),
        ])
    conn.execute("DELETE FROM heroes")
    conn.executemany(
        "INSERT INTO heroes (hero_id, name, localized_name, primary_attr, roles, facets) "
        "VALUES (?, ?, ?, ?, ?, ?)",
        rows,
    )
    return len(rows)


def _load_items(conn: duckdb.DuckDBPyConnection, data: dict[str, Any]) -> int:
    rows = []
    for key, entry in data.items():
        iid = entry.get("id")
        if iid is None:
            continue
        rows.append([int(iid), key, entry.get("cost")])
    conn.execute("DELETE FROM items")
    conn.executemany(
        "INSERT INTO items (item_id, name, cost) VALUES (?, ?, ?)",
        rows,
    )
    return len(rows)


def _load_abilities(
    conn: duckdb.DuckDBPyConnection,
    abilities: dict[str, Any],
    ability_ids: dict[str, str],
) -> int:
    # /constants/ability_ids is the authoritative id→name map; /constants/abilities
    # is keyed by name and carries the is_ultimate flag but no numeric ids.
    rows = []
    seen: set[int] = set()
    for aid_str, name in ability_ids.items():
        meta = abilities.get(name) or {}
        is_ult = bool(meta.get("is_ultimate", False))
        # Some keys are "id1,id2" when multiple numeric ids share a name.
        for part in str(aid_str).split(","):
            part = part.strip()
            if not part:
                continue
            aid = int(part)
            if aid in seen:
                continue
            seen.add(aid)
            rows.append([aid, name, is_ult])
    conn.execute("DELETE FROM abilities")
    if rows:
        conn.executemany(
            "INSERT INTO abilities (ability_id, name, is_ultimate) VALUES (?, ?, ?)",
            rows,
        )
    return len(rows)
