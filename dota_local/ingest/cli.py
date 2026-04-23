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
    limit: Annotated[
        int | None, typer.Option(help="Max matches to enrich this run.")
    ] = None,
    recent_only: Annotated[
        bool,
        typer.Option(
            "--recent-only",
            help="Skip matches older than Valve's replay retention window.",
        ),
    ] = False,
    include_parsed: Annotated[
        bool,
        typer.Option(
            "--include-parsed",
            help="Re-enrich matches already marked 'parsed' (for schema backfills).",
        ),
    ] = False,
) -> None:
    """Fetch parsed detail + fan out into match_* child tables."""
    from dota_local.ingest.enrich import enrich as _enrich

    asyncio.run(
        _enrich(limit=limit, recent_only=recent_only, include_parsed=include_parsed)
    )


@app.command("metadata")
def metadata() -> None:
    """Refresh heroes / items / abilities from OpenDota /constants/*."""
    from dota_local.ingest.metadata import load_metadata

    asyncio.run(load_metadata())


@app.command("refresh")
def refresh(
    account_id: Annotated[
        list[int] | None,
        typer.Option("--account-id", help="Tracked account_id; repeat flag. Defaults to .env."),
    ] = None,
) -> None:
    """Pull new matches since last run for each tracked account."""
    from dota_local.ingest.refresh import refresh as _refresh

    summary = asyncio.run(_refresh(account_ids=account_id))
    for row in summary["accounts"]:
        console.print(
            f"[cyan]{row['account_id']}[/cyan] +{row['new_matches']} new "
            f"(max existing was {row['max_existing']})"
        )
    console.print(f"[green]total new matches: {summary['total_new']}[/green]")
