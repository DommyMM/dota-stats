from functools import lru_cache
from pathlib import Path
from typing import Annotated

from pydantic import Field, field_validator
from pydantic_settings import BaseSettings, NoDecode, SettingsConfigDict

PROJECT_ROOT = Path(__file__).resolve().parent.parent


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=PROJECT_ROOT / ".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    opendota_api_key: str = ""
    stratz_token: str = ""
    steam_web_api_key: str = ""

    tracked_account_ids: Annotated[list[int], NoDecode] = Field(default_factory=list)

    duckdb_path: Path = Path("data/dota.duckdb")
    http_cache_path: Path = Path("data/cache/http")
    http_cache_enabled: bool = True

    @field_validator("tracked_account_ids", mode="before")
    @classmethod
    def _split_csv(cls, v: object) -> object:
        if v is None or v == "":
            return []
        if isinstance(v, str):
            return [int(x) for x in v.split(",") if x.strip()]
        return v

    @field_validator("duckdb_path", "http_cache_path", mode="after")
    @classmethod
    def _resolve(cls, v: Path) -> Path:
        return v if v.is_absolute() else (PROJECT_ROOT / v).resolve()


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    return Settings()
