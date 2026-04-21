"""Async OpenDota REST client.

Scope: the endpoints M1–M4 need. Stratz GraphQL is a separate module (M5).
"""
from __future__ import annotations

import asyncio
import logging
import time
from collections.abc import AsyncIterator
from typing import Any

import httpx
from tenacity import (
    retry,
    retry_if_exception_type,
    stop_after_attempt,
    wait_exponential,
)

log = logging.getLogger(__name__)


class OpenDotaClient:
    BASE_URL = "https://api.opendota.com/api"
    USER_AGENT = "dota-local/0.1 (+https://github.com/DommyMM/dota-stats)"

    def __init__(
        self,
        api_key: str | None = None,
        requests_per_minute: int = 50,
        timeout_s: float = 60.0,
    ) -> None:
        self._api_key = api_key or None
        self._min_interval_s = 60.0 / max(requests_per_minute, 1)
        self._last_at = 0.0
        self._lock = asyncio.Lock()
        self._client = httpx.AsyncClient(
            base_url=self.BASE_URL,
            timeout=timeout_s,
            headers={"User-Agent": self.USER_AGENT},
        )

    async def aclose(self) -> None:
        await self._client.aclose()

    async def __aenter__(self) -> OpenDotaClient:
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
        stop=stop_after_attempt(6),
        retry=retry_if_exception_type((httpx.TransportError, httpx.HTTPStatusError)),
        reraise=True,
    )
    async def get(self, path: str, params: dict[str, Any] | None = None) -> Any:
        await self._throttle()
        q = dict(params or {})
        if self._api_key:
            q["api_key"] = self._api_key
        r = await self._client.get(path, params=q)
        # 404 = private/purged match or missing player. Don't retry.
        if r.status_code == 404:
            return None
        # OpenDota's rate window is ~1 minute; honor Retry-After when set
        # and sleep in-place before raising, so the throttle's next slot
        # lines up with the server's reset rather than piling onto it.
        if r.status_code == 429:
            try:
                delay = float(r.headers.get("Retry-After", "60"))
            except ValueError:
                delay = 60.0
            await asyncio.sleep(min(max(delay, 5.0), 120.0))
        r.raise_for_status()
        return r.json()

    async def get_player(self, account_id: int) -> dict[str, Any] | None:
        return await self.get(f"/players/{account_id}")

    async def get_match(self, match_id: int) -> dict[str, Any] | None:
        """Full match detail. Returns None if OpenDota 404s the match
        (private lobby, or dropped from their parsed index)."""
        return await self.get(f"/matches/{match_id}")

    @retry(
        wait=wait_exponential(multiplier=1, min=2, max=30),
        stop=stop_after_attempt(3),
        retry=retry_if_exception_type((httpx.TransportError, httpx.HTTPStatusError)),
        reraise=True,
    )
    async def request_parse(self, match_id: int) -> dict[str, Any] | None:
        """POST /request/{id} — ask OpenDota to parse a replay.

        Only works while Valve still hosts the replay (~8 days). Returns
        the job dict on success; None on 4xx from the API side (eg. the
        match is private or Valve already purged the replay).
        """
        await self._throttle()
        try:
            r = await self._client.post(f"/request/{match_id}")
        except httpx.HTTPError:
            raise
        if r.status_code in (400, 404):
            return None
        r.raise_for_status()
        return r.json()

    async def iter_player_matches(
        self,
        account_id: int,
        less_than_match_id: int | None = None,
    ) -> AsyncIterator[list[dict[str, Any]]]:
        """Yield batches of match summaries going backward in time.

        OpenDota returns all matches in a single call by default; the
        `less_than_match_id` pagination is used as a safety net and for
        resuming after a crash via the saved cursor.
        """
        cursor = less_than_match_id
        while True:
            params: dict[str, Any] = {"significant": 0}
            if cursor is not None:
                params["less_than_match_id"] = cursor
            batch = await self.get(f"/players/{account_id}/matches", params=params)
            if not batch:
                return
            batch_min = min(m["match_id"] for m in batch)
            # Terminate before re-yielding: OpenDota sometimes returns the
            # same full window when less_than_match_id lands on the account's
            # oldest match_id, so guard against duplicate work.
            if cursor is not None and batch_min >= cursor:
                return
            yield batch
            cursor = batch_min
