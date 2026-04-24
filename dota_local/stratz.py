"""Async Stratz GraphQL client.

Scope: just the match analysis fields we need for outcome tagging.
Everything else (IMP, smurf flag, etc.) still rides via OpenDota's enrich
path — Stratz is narrow-purpose here to avoid rate-limit pressure.

Stratz requires:
  - Bearer JWT from https://stratz.com/api
  - User-Agent header literally set to "STRATZ_API" (not a browser string)

Default tier is ~20 req/s; we throttle well below that.
"""
from __future__ import annotations

import asyncio
import logging
import time
from typing import Any

import httpx
from tenacity import (
    retry,
    retry_if_exception_type,
    stop_after_attempt,
    wait_exponential,
)

log = logging.getLogger(__name__)


class StratzAuthError(RuntimeError):
    pass


class StratzClient:
    ENDPOINT = "https://api.stratz.com/graphql"
    # Stratz rejects non-"STRATZ_API" user agents with 403.
    USER_AGENT = "STRATZ_API"

    def __init__(
        self,
        token: str,
        requests_per_minute: int = 240,
        timeout_s: float = 60.0,
    ) -> None:
        if not token:
            raise StratzAuthError(
                "STRATZ_TOKEN is required for Stratz queries. "
                "Get one at https://stratz.com/api and put it in .env."
            )
        self._token = token
        self._min_interval_s = 60.0 / max(requests_per_minute, 1)
        self._last_at = 0.0
        self._lock = asyncio.Lock()
        self._client = httpx.AsyncClient(
            timeout=timeout_s,
            headers={
                "User-Agent": self.USER_AGENT,
                "Authorization": f"Bearer {token}",
                "Content-Type": "application/json",
                "Accept": "application/json",
            },
        )

    async def aclose(self) -> None:
        await self._client.aclose()

    async def __aenter__(self) -> StratzClient:
        return self

    async def __aexit__(self, *_exc: object) -> None:
        await self.aclose()

    async def _throttle(self) -> None:
        async with self._lock:
            wait = self._min_interval_s - (time.monotonic() - self._last_at)
            if wait > 0:
                await asyncio.sleep(wait)
            self._last_at = time.monotonic()

    @retry(
        wait=wait_exponential(multiplier=1, min=5, max=120),
        stop=stop_after_attempt(5),
        retry=retry_if_exception_type((httpx.TransportError, httpx.HTTPStatusError)),
        reraise=True,
    )
    async def query(self, document: str, variables: dict[str, Any] | None = None) -> Any:
        await self._throttle()
        r = await self._client.post(
            self.ENDPOINT,
            json={"query": document, "variables": variables or {}},
        )
        if r.status_code == 429:
            try:
                delay = float(r.headers.get("Retry-After", "30"))
            except ValueError:
                delay = 30.0
            await asyncio.sleep(min(max(delay, 5.0), 120.0))
        if r.status_code == 401 or r.status_code == 403:
            raise StratzAuthError(
                f"Stratz auth failed ({r.status_code}): check STRATZ_TOKEN + User-Agent"
            )
        r.raise_for_status()
        body = r.json()
        # GraphQL endpoints return 200 even on field-level errors; surface them.
        if isinstance(body, dict) and body.get("errors"):
            raise RuntimeError(f"Stratz GraphQL errors: {body['errors']}")
        return body.get("data") if isinstance(body, dict) else body

    async def fetch_match_analysis(self, match_ids: list[int]) -> dict[int, dict[str, Any]]:
        """Return {match_id: {analysis_outcome, top/mid/bot lane outcome}} for
        the given match_ids. Unknown/private matches drop out silently.

        Stratz's plural `matches(ids:…)` field is admin-only; we batch via
        GraphQL aliases on the singular `match(id:…)` field so one POST
        still covers the whole chunk.
        """
        if not match_ids:
            return {}
        parts: list[str] = []
        variables: dict[str, Any] = {}
        var_defs: list[str] = []
        for i, mid in enumerate(match_ids):
            var_defs.append(f"$id{i}: Long!")
            variables[f"id{i}"] = int(mid)
            parts.append(
                f"m{i}: match(id: $id{i}) {{ "
                f"id analysisOutcome topLaneOutcome midLaneOutcome bottomLaneOutcome "
                f"}}"
            )
        document = f"query MatchAnalysis({', '.join(var_defs)}) {{ {' '.join(parts)} }}"
        data = await self.query(document, variables)
        out: dict[int, dict[str, Any]] = {}
        for alias, row in (data or {}).items():
            if row is None:
                continue
            out[int(row["id"])] = {
                "analysis_outcome": _norm(row.get("analysisOutcome")),
                "top_lane_outcome": _norm(row.get("topLaneOutcome")),
                "mid_lane_outcome": _norm(row.get("midLaneOutcome")),
                "bot_lane_outcome": _norm(row.get("bottomLaneOutcome")),
            }
            _ = alias  # suppress lint
        return out


def _norm(v: Any) -> str | None:
    """GraphQL enum → lowercase string so SQL filters are ergonomic."""
    if v is None:
        return None
    return str(v).lower()
