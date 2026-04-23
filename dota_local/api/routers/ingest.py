"""Ingest endpoints — single-user tooling, no auth. The UI exposes these
as 'Pull new' so the owner doesn't have to drop into the terminal.
"""
from __future__ import annotations

from typing import Any

from fastapi import APIRouter

from dota_local.ingest.refresh import refresh as refresh_ingest

router = APIRouter(prefix="/api/ingest", tags=["ingest"])


@router.post("/refresh")
async def refresh() -> dict[str, Any]:
    """Fetch any matches newer than what we have for every tracked account.

    Synchronous — OpenDota's /players/{id}/matches returns ~500 rows in
    one shot, and once we see a batch that's fully-known we stop paging.
    With a small tracked roster this usually finishes in a few seconds.
    The caller should invalidate its table + summary + stats queries once
    this returns.
    """
    return await refresh_ingest()
