"""Ingest endpoints — single-user tooling, no auth. The UI exposes these
as 'Pull new' so the owner doesn't have to drop into the terminal.
"""
from __future__ import annotations

import logging
from typing import Any

from fastapi import APIRouter

from dota_local.config import get_settings
from dota_local.ingest.refresh import refresh as refresh_ingest
from dota_local.ingest.stratz_outcome import backfill_outcomes

log = logging.getLogger(__name__)

router = APIRouter(prefix="/api/ingest", tags=["ingest"])


@router.post("/refresh")
async def refresh() -> dict[str, Any]:
    """Fetch any matches newer than what we have for every tracked account,
    then tag them with Stratz analysis outcomes if a token is configured.

    Synchronous — OpenDota's /players/{id}/matches returns ~500 rows in
    one shot, and once we see a batch that's fully-known we stop paging.
    With a small tracked roster this usually finishes in a few seconds.
    The caller should invalidate its table + summary + stats queries once
    this returns.
    """
    result = await refresh_ingest()

    # Best-effort Stratz tag on newly-added matches. If the token is
    # missing or Stratz hiccups, don't fail the whole pull.
    stratz_summary: dict[str, Any] | None = None
    if result.get("total_new", 0) and get_settings().stratz_token:
        try:
            stratz_summary = await backfill_outcomes(limit=result["total_new"])
        except Exception as exc:
            log.warning("stratz tag failed after refresh: %s", exc)
            stratz_summary = {"error": str(exc)}

    return {**result, "stratz": stratz_summary}
