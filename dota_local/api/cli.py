from typing import Annotated

import typer

app = typer.Typer(no_args_is_help=True, add_completion=False)


@app.command("serve")
def serve(
    host: Annotated[str, typer.Option()] = "127.0.0.1",
    port: Annotated[int, typer.Option()] = 8000,
    reload: Annotated[bool, typer.Option()] = False,
) -> None:
    """Run the FastAPI query server on localhost."""
    import uvicorn

    uvicorn.run("dota_local.api.main:app", host=host, port=port, reload=reload)
