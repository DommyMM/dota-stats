import asyncio
from typing import Annotated

import typer
from rich.console import Console

app = typer.Typer(no_args_is_help=True, add_completion=False)
console = Console()


@app.command("seed")
def seed(
    account_id: Annotated[
        list[int] | None,
        typer.Option("--account-id", help="Tracked account_id; repeat flag. Defaults to .env."),
    ] = None,
) -> None:
    """Full historical backfill for each tracked account."""
    from dota_local.config import get_settings
    from dota_local.ingest.seed import seed as _seed

    accounts = account_id or get_settings().tracked_account_ids
    if not accounts:
        console.print(
            "[red]no accounts provided.[/red] "
            "Pass --account-id ... or set TRACKED_ACCOUNT_IDS in .env."
        )
        raise typer.Exit(code=1)
    asyncio.run(_seed(accounts))


@app.command("enrich")
def enrich(
    since: Annotated[str | None, typer.Option(help="ISO date lower bound.")] = None,
    limit: Annotated[int | None, typer.Option(help="Max matches to enrich this run.")] = None,
) -> None:
    """Fetch parsed detail + Stratz fields for matches that need it. (M2/M5)"""
    raise NotImplementedError("enrich lands in M2")


@app.command("refresh")
def refresh() -> None:
    """Pull new matches since last run for each tracked account. (M6)"""
    raise NotImplementedError("refresh lands in M6")
