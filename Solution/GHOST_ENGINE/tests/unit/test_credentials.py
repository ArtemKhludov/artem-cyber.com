from types import SimpleNamespace

from ghost_engine.config.credentials import dev_login_env_hint, resolve_site_credentials
from ghost_engine.config.settings import get_settings


def test_resolve_upwork_when_env_set(monkeypatch) -> None:
    monkeypatch.setenv("UPWORK_EMAIL", "user@example.test")
    monkeypatch.setenv("UPWORK_PASSWORD", "not-for-production")
    get_settings.cache_clear()
    try:
        creds = resolve_site_credentials("upwork")
        assert creds is not None
        assert creds.site_id == "upwork"
        assert creds.username == "user@example.test"
        assert creds.password.get_secret_value() == "not-for-production"
        assert creds.oauth_profile_session is False
    finally:
        get_settings.cache_clear()


def test_resolve_upwork_oauth_profile_trust_without_password(monkeypatch) -> None:
    # Avoid real Settings() — pydantic-settings merges .env and overrides kwargs.
    fake_settings = SimpleNamespace(
        upwork_email="oauth.user@example.test",
        upwork_password=None,
        ghost_dev_oauth_session_upwork=True,
    )

    def _fake_get_settings() -> SimpleNamespace:
        return fake_settings

    monkeypatch.setattr(
        "ghost_engine.config.credentials.get_settings",
        _fake_get_settings,
        raising=True,
    )
    creds = resolve_site_credentials("upwork")
    assert creds is not None
    assert creds.username == "oauth.user@example.test"
    assert creds.oauth_profile_session is True
    assert creds.password.get_secret_value() == ""


def test_resolve_contra_when_env_set(monkeypatch) -> None:
    monkeypatch.setenv("CONTRA_EMAIL", "u@example.test")
    monkeypatch.setenv("CONTRA_PASSWORD", "secret")
    get_settings.cache_clear()
    try:
        creds = resolve_site_credentials("contra")
        assert creds is not None
        assert creds.site_id == "contra"
        assert creds.username == "u@example.test"
    finally:
        get_settings.cache_clear()


def test_dev_login_env_hint_lists_vars() -> None:
    assert "GUN_IO" in dev_login_env_hint("gun_io")


def test_resolve_unknown_site_returns_none(monkeypatch) -> None:
    monkeypatch.delenv("UPWORK_EMAIL", raising=False)
    monkeypatch.delenv("UPWORK_PASSWORD", raising=False)
    get_settings.cache_clear()
    try:
        assert resolve_site_credentials("no_such_site") is None
    finally:
        get_settings.cache_clear()
