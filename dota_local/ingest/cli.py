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
    """Full historical backfill for each tracked account. (M1)"""
    raise NotImplementedError("seed lands in M1")


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
