"""
Load .env + optional YAML paths. Never embed secrets in YAML committed to git.

Secrets resolution order (pydantic-settings):
1) Environment variables
2) .env in project root
3) Files under ./secrets/ named exactly like the variable (e.g. secrets/UPWORK_PASSWORD)
   — typical for Docker secrets mounts; files are gitignored except .gitkeep
"""

from __future__ import annotations

import os
from functools import lru_cache
from pathlib import Path
from typing import Any, Optional

import yaml
from pydantic import Field, SecretStr, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


def _project_root() -> Path:
    return Path(__file__).resolve().parents[3]


def _secrets_dir() -> Path:
    return _project_root() / "secrets"


def _load_yaml(path: Path) -> dict[str, Any]:
    if not path.is_file():
        return {}
    with path.open("r", encoding="utf-8") as f:
        data = yaml.safe_load(f) or {}
    return data if isinstance(data, dict) else {}


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
        secrets_dir=_secrets_dir(),
    )

    app_env: str = Field(default="development", validation_alias="APP_ENV")

    telegram_bot_token: Optional[SecretStr] = Field(default=None, validation_alias="TELEGRAM_BOT_TOKEN")
    # Comma-separated Telegram user/chat IDs allowed for /start and job alerts.
    telegram_operator_chat_ids_csv: str = Field(default="", validation_alias="TELEGRAM_OPERATOR_CHAT_IDS")
    # Single operator chat id (optional; merged into telegram_operator_chat_ids).
    telegram_chat_id: Optional[int] = Field(default=None, validation_alias="TELEGRAM_CHAT_ID")
    openai_api_key: Optional[SecretStr] = Field(default=None, validation_alias="OPENAI_API_KEY")
    gemini_api_key: Optional[SecretStr] = Field(default=None, validation_alias="GEMINI_API_KEY")
    claude_api_key: Optional[SecretStr] = Field(default=None, validation_alias="CLAUDE_API_KEY")

    database_url: str = Field(
        default="postgresql+asyncpg://ghost:change_me@localhost:5432/ghost_engine",
        validation_alias="DATABASE_URL",
    )
    redis_url: str = Field(default="redis://localhost:6379/0", validation_alias="REDIS_URL")
    ollama_host: str = Field(default="http://localhost:11434", validation_alias="OLLAMA_HOST")
    # Default Ollama model tag for local judges / emergency paths; override per env or llm.yaml safety.ollama_model.
    ghost_ollama_model: str = Field(default="llama3.2-vision", validation_alias="GHOST_OLLAMA_MODEL")

    brightdata_proxy_url: Optional[SecretStr] = Field(
        default=None, validation_alias="BRIGHTDATA_PROXY_URL"
    )
    oxylabs_username: Optional[str] = Field(default=None, validation_alias="OXYLABS_USERNAME")
    oxylabs_password: Optional[SecretStr] = Field(default=None, validation_alias="OXYLABS_PASSWORD")

    captcha_key: Optional[SecretStr] = Field(default=None, validation_alias="2CAPTCHA_KEY")
    camoufox_license: Optional[SecretStr] = Field(default=None, validation_alias="CAMOUFOX_LICENSE")

    # Site logins: read from .env or secrets/<VAR> files. Never commit real values.
    upwork_email: Optional[str] = Field(default=None, validation_alias="UPWORK_EMAIL")
    upwork_password: Optional[SecretStr] = Field(default=None, validation_alias="UPWORK_PASSWORD")
    toptal_email: Optional[str] = Field(default=None, validation_alias="TOPTAL_EMAIL")
    toptal_password: Optional[SecretStr] = Field(default=None, validation_alias="TOPTAL_PASSWORD")
    gun_io_email: Optional[str] = Field(default=None, validation_alias="GUN_IO_EMAIL")
    gun_io_password: Optional[SecretStr] = Field(default=None, validation_alias="GUN_IO_PASSWORD")
    arc_dev_email: Optional[str] = Field(default=None, validation_alias="ARC_DEV_EMAIL")
    arc_dev_password: Optional[SecretStr] = Field(default=None, validation_alias="ARC_DEV_PASSWORD")
    contra_email: Optional[str] = Field(default=None, validation_alias="CONTRA_EMAIL")
    contra_password: Optional[SecretStr] = Field(default=None, validation_alias="CONTRA_PASSWORD")

    # Upwork Google OAuth: loaded from .env (not os.environ unless exported); see credentials.resolve_site_credentials
    ghost_dev_oauth_session_upwork: bool = Field(
        default=False,
        validation_alias="GHOST_DEV_OAUTH_SESSION_UPWORK",
    )

    config_dir: Path = Field(default_factory=lambda: _project_root() / "config")
    profiles_dir: Path = Field(default_factory=lambda: _project_root() / "profiles")
    log_level: str = Field(default="INFO", validation_alias="LOG_LEVEL")

    @field_validator("ghost_dev_oauth_session_upwork", mode="before")
    @classmethod
    def _truthy_env_bool(cls, v: object) -> bool:
        if v is None or v is False:
            return False
        if v is True:
            return True
        s = str(v).strip().lower()
        if s in ("", "0", "false", "no", "off"):
            return False
        return s in ("1", "true", "yes", "on")

    @property
    def base_config(self) -> dict[str, Any]:
        return _load_yaml(self.config_dir / "base.yaml")

    @property
    def llm_config(self) -> dict[str, Any]:
        return _load_yaml(self.config_dir / "llm.yaml")

    @property
    def telegram_operator_chat_ids(self) -> list[int]:
        raw = (self.telegram_operator_chat_ids_csv or "").strip()
        out: list[int] = []
        seen: set[int] = set()
        if self.telegram_chat_id is not None:
            cid = int(self.telegram_chat_id)
            seen.add(cid)
            out.append(cid)
        for part in raw.split(","):
            s = part.strip()
            if not s:
                continue
            try:
                v = int(s)
            except ValueError:
                continue
            if v not in seen:
                seen.add(v)
                out.append(v)
        return out


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    # Allow running from repo root or src parent
    os.chdir(_project_root())
    return Settings()
