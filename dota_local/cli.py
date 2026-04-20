import typer
from rich.console import Console

from dota_local.api.cli import app as api_app
from dota_local.ingest.cli import app as ingest_app

app = typer.Typer(
    name="dota-local",
    help="Local-first Dota 2 analytics.",
    no_args_is_help=True,
    add_completion=False,
)
app.add_typer(ingest_app, name="ingest", help="Pull match data from upstreams.")
app.add_typer(api_app, name="api", help="Run the local query API.")

db_app = typer.Typer(help="Database administration.", no_args_is_help=True)
app.add_typer(db_app, name="db")

console = Console()


@db_app.command("init")
def db_init() -> None:
    """Create the DuckDB file and apply the schema."""
    from dota_local.db import apply_schema

    applied = apply_schema()
    console.print(f"[green]applied {len(applied)} schema file(s):[/green]")
    for f in applied:
        console.print(f"  - {f.name}")


@db_app.command("path")
def db_path() -> None:
    """Print the configured DuckDB path."""
    from dota_local.config import get_settings

    console.print(str(get_settings().duckdb_path))


@app.command("version")
def version() -> None:
    from dota_local import __version__

    console.print(__version__)


if __name__ == "__main__":
    app()
