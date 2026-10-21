from pathlib import Path

from ghost_engine.config.settings import Settings


def test_settings_paths_resolve(monkeypatch, tmp_path: Path) -> None:
    monkeypatch.chdir(tmp_path)
    (tmp_path / "config").mkdir()
    (tmp_path / "config" / "base.yaml").write_text("app:\n  name: x\n", encoding="utf-8")
    s = Settings(_env_file=None, config_dir=tmp_path / "config", profiles_dir=tmp_path / "profiles")
    assert s.base_config.get("app", {}).get("name") == "x"
