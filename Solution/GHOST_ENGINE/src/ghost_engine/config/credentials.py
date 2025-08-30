"""
Resolve per-site login material from Settings (.env / secrets files).

Call password.get_secret_value() only at the boundary where Playwright fills a field.
Never log SecretStr or raw password. If oauth_profile_session is True, do not fill password fields.
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import TYPE_CHECKING, Optional

from pydantic import SecretStr

from ghost_engine.config.settings import get_settings

if TYPE_CHECKING:
    from ghost_engine.config.settings import Settings


@dataclass(frozen=True, slots=True)
class SiteCredentials:
    """Login bundle for one marketplace site."""

    site_id: str
    username: str
    password: SecretStr
    #: Google OAuth etc.: no password; rely on cookies in ``profiles/<name>``.
    oauth_profile_session: bool = False


def _creds_from_pair(
    site_id: str, email: Optional[str], secret: Optional[SecretStr]
) -> Optional[SiteCredentials]:
    if email and secret:
        return SiteCredentials(
            site_id=site_id,
            username=email,
            password=secret,
            oauth_profile_session=False,
        )
    return None


def _upwork_oauth_profile_trust(settings: "Settings") -> bool:
    """Must use Settings — keys in .env are not copied to os.environ unless declared on the model."""
    return bool(settings.ghost_dev_oauth_session_upwork)


def resolve_site_credentials(site_id: str) -> Optional[SiteCredentials]:
    """
    Return credentials if configured for site_id; otherwise None.

    Env pattern: <SITE>_EMAIL / <SITE>_PASSWORD (see Settings validation_alias).
    """
    settings = get_settings()
    if site_id == "upwork":
        email_raw = settings.upwork_email
        email_st = (email_raw or "").strip()
        pw = settings.upwork_password
        has_password = (
            pw is not None and bool((pw.get_secret_value() or "").strip())
        )
        if email_st and has_password:
            return _creds_from_pair(site_id, email_raw, pw)
        if email_st and _upwork_oauth_profile_trust(settings):
            return SiteCredentials(
                site_id=site_id,
                username=email_st,
                password=SecretStr(""),
                oauth_profile_session=True,
            )
        return _creds_from_pair(site_id, settings.upwork_email, settings.upwork_password)
    if site_id == "toptal":
        return _creds_from_pair(
            site_id, settings.toptal_email, settings.toptal_password
        )
    if site_id == "gun_io":
        return _creds_from_pair(
            site_id, settings.gun_io_email, settings.gun_io_password
        )
    if site_id == "arc_dev":
        return _creds_from_pair(
            site_id, settings.arc_dev_email, settings.arc_dev_password
        )
    if site_id == "contra":
        return _creds_from_pair(
            site_id, settings.contra_email, settings.contra_password
        )
    return None


def dev_login_env_hint(site_id: str) -> str:
    """Human-readable env var names for dev_session logs (no secrets)."""
    aliases: dict[str, str] = {
        "upwork": "UPWORK_EMAIL + UPWORK_PASSWORD, or UPWORK_EMAIL + GHOST_DEV_OAUTH_SESSION_UPWORK=1 (Google OAuth; persistent profile)",
        "toptal": "TOPTAL_EMAIL / TOPTAL_PASSWORD",
        "gun_io": "GUN_IO_EMAIL / GUN_IO_PASSWORD",
        "arc_dev": "ARC_DEV_EMAIL / ARC_DEV_PASSWORD",
        "contra": "CONTRA_EMAIL / CONTRA_PASSWORD",
    }
    return aliases.get(
        site_id,
        f"{site_id.upper()}_EMAIL / {site_id.upper()}_PASSWORD (add branch in credentials.py if needed)",
    )
