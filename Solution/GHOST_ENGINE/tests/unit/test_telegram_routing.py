"""telegram_routing.yaml resolution."""

from __future__ import annotations

from pathlib import Path

import yaml

from ghost_engine.config.telegram_routing import DeliveryTarget, TelegramRouting


def test_jobs_fallback_when_no_file(tmp_path: Path) -> None:
    r = TelegramRouting.load(tmp_path)
    assert r.jobs_targets_for_site("upwork", [111, 222]) == [
        DeliveryTarget(111),
        DeliveryTarget(222),
    ]


def test_jobs_site_override(tmp_path: Path) -> None:
    cfg = tmp_path / "telegram_routing.yaml"
    cfg.write_text(
        yaml.safe_dump(
            {
                "sites": {
                    "upwork": {"chat_id": -1001, "topic_jobs": 7},
                }
            }
        ),
        encoding="utf-8",
    )
    r = TelegramRouting.load(tmp_path)
    assert r.jobs_targets_for_site("upwork", [111]) == [DeliveryTarget(-1001, 7)]
    assert r.jobs_targets_for_site("toptal", [111]) == [DeliveryTarget(111)]


def test_ops_with_topic(tmp_path: Path) -> None:
    cfg = tmp_path / "telegram_routing.yaml"
    cfg.write_text(
        yaml.safe_dump(
            {
                "ops": {
                    "chat_id": -1002,
                    "topics": {"captcha": 99},
                }
            }
        ),
        encoding="utf-8",
    )
    r = TelegramRouting.load(tmp_path)
    assert r.ops_targets("captcha", [111]) == [DeliveryTarget(-1002, 99)]


def test_ops_fallback(tmp_path: Path) -> None:
    r = TelegramRouting.load(tmp_path)
    assert r.ops_targets("captcha", [111]) == [DeliveryTarget(111)]


def test_jobs_ghost_main_sample(tmp_path: Path) -> None:
    """Fixture matching GHOST Main: one supergroup, per-site topic_jobs."""
    cfg = tmp_path / "telegram_routing.yaml"
    cfg.write_text(
        yaml.safe_dump(
            {
                "sites": {
                    "upwork": {"chat_id": -1003647494591, "topic_jobs": 2},
                    "arc_dev": {"chat_id": -1003647494591, "topic_jobs": 8},
                    "gun_io": {"chat_id": -1003647494591, "topic_jobs": 9},
                    "toptal": {"chat_id": -1003647494591, "topic_jobs": 10},
                    "contra": {"chat_id": -1003647494591, "topic_jobs": 12},
                }
            }
        ),
        encoding="utf-8",
    )
    r = TelegramRouting.load(tmp_path)
    assert r.jobs_targets_for_site("upwork", [111]) == [
        DeliveryTarget(-1003647494591, 2),
    ]
    assert r.jobs_targets_for_site("contra", [111]) == [
        DeliveryTarget(-1003647494591, 12),
    ]


def test_chat_client_targets(tmp_path: Path) -> None:
    cfg = tmp_path / "telegram_routing.yaml"
    cfg.write_text(
        yaml.safe_dump(
            {
                "chat_client": {
                    "chat_id": -1003745996585,
                    "topics": {
                        "upwork": 2,
                        "arc_dev": 4,
                        "gun_io": 6,
                        "toptal": 8,
                        "contra": 10,
                    },
                }
            }
        ),
        encoding="utf-8",
    )
    r = TelegramRouting.load(tmp_path)
    assert r.chat_client_targets_for_site("arc_dev") == [DeliveryTarget(-1003745996585, 4)]
    assert r.chat_client_targets_for_site("ARC_DEV") == [DeliveryTarget(-1003745996585, 4)]


def test_chat_client_empty_when_missing(tmp_path: Path) -> None:
    r = TelegramRouting.load(tmp_path)
    assert r.chat_client_targets_for_site("upwork") == []

    cfg = tmp_path / "telegram_routing.yaml"
    cfg.write_text(
        yaml.safe_dump({"chat_client": {"chat_id": -1, "topics": {}}}),
        encoding="utf-8",
    )
    r2 = TelegramRouting.load(tmp_path)
    assert r2.chat_client_targets_for_site("upwork") == []

    cfg.write_text(
        yaml.safe_dump({"chat_client": {"topics": {"upwork": 2}}}),
        encoding="utf-8",
    )
    r3 = TelegramRouting.load(tmp_path)
    assert r3.chat_client_targets_for_site("upwork") == []
