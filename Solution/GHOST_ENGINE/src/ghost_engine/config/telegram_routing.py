"""
Telegram forum routing: three configurable zones in ``telegram_routing.yaml``:

- ``ops`` — captcha / errors / system (operator alerts).
- ``sites`` — job cards per ``site_id`` (``chat_id`` + ``topic_jobs``), e.g. GHOST Main.
- ``chat_client`` — optional per-site forum topics for client-thread mirroring
  (``chat_client_targets_for_site``); producers are wired separately.

If the file is missing, job notifies use ``TELEGRAM_CHAT_ID`` /
``TELEGRAM_OPERATOR_CHAT_IDS`` without topics.

Top-level ``telegram_groups`` is documentation only — not parsed.
"""

from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path
from typing import Any

import yaml

from ghost_engine.utils.logger import get_logger

log = get_logger(__name__)


@dataclass(frozen=True)
class DeliveryTarget:
    """chat_id + optional forum topic (message_thread_id)."""

    chat_id: int
    message_thread_id: int | None = None


def _as_int(v: Any) -> int | None:
    if v is None:
        return None
    try:
        return int(v)
    except (TypeError, ValueError):
        return None


def _load_yaml(path: Path) -> dict[str, Any]:
    if not path.is_file():
        return {}
    with path.open("r", encoding="utf-8") as f:
        data = yaml.safe_load(f) or {}
    return data if isinstance(data, dict) else {}


class TelegramRouting:
    """Parsed ``telegram_routing.yaml``."""

    def __init__(self, raw: dict[str, Any]) -> None:
        self._raw = raw

    @classmethod
    def load(cls, config_dir: Path) -> TelegramRouting:
        path = config_dir / "telegram_routing.yaml"
        data = _load_yaml(path)
        if data:
            log.info("telegram_routing.loaded", path=str(path))
        return cls(data)

    def jobs_targets_for_site(
        self,
        site_id: str,
        fallback_chat_ids: list[int],
    ) -> list[DeliveryTarget]:
        """
        Targets for approved-job batches for ``site_id``.

        If ``sites.<site_id>.chat_id`` is set, return that chat (+ optional topic).
        Otherwise duplicate ``fallback_chat_ids`` without topics (legacy DMs).
        """
        sid = site_id.strip().lower()
        sites = self._raw.get("sites")
        if not isinstance(sites, dict):
            return [DeliveryTarget(cid) for cid in fallback_chat_ids]

        entry = sites.get(sid)
        if not isinstance(entry, dict):
            return [DeliveryTarget(cid) for cid in fallback_chat_ids]

        chat = _as_int(entry.get("chat_id"))
        if chat is None:
            return [DeliveryTarget(cid) for cid in fallback_chat_ids]

        topic = _as_int(entry.get("topic_jobs"))
        return [DeliveryTarget(chat, topic)]

    def ops_targets(self, topic_key: str, fallback_chat_ids: list[int]) -> list[DeliveryTarget]:
        """
        Targets for ops alerts (captcha, errors, …).

        Uses ``ops.chat_id`` + ``ops.topics.<topic_key>`` when configured.
        Otherwise ``fallback_chat_ids`` without topics.
        """
        ops = self._raw.get("ops")
        if not isinstance(ops, dict):
            return [DeliveryTarget(cid) for cid in fallback_chat_ids]

        chat = _as_int(ops.get("chat_id"))
        topics = ops.get("topics")
        thread: int | None = None
        if isinstance(topics, dict):
            thread = _as_int(topics.get(topic_key))

        if chat is None:
            return [DeliveryTarget(cid) for cid in fallback_chat_ids]

        return [DeliveryTarget(chat, thread)]

    def chat_client_targets_for_site(self, site_id: str) -> list[DeliveryTarget]:
        """
        Targets for client-conversation posts (separate supergroup from job cards).

        Uses ``chat_client.chat_id`` + ``chat_client.topics.<site_id>`` when both are set.
        No fallback to operator DMs — returns ``[]`` if unconfigured or unknown site.
        """
        sid = site_id.strip().lower()
        block = self._raw.get("chat_client")
        if not isinstance(block, dict):
            return []

        chat = _as_int(block.get("chat_id"))
        if chat is None:
            return []

        topics = block.get("topics")
        if not isinstance(topics, dict):
            return []

        thread = _as_int(topics.get(sid))
        if thread is None:
            return []

        return [DeliveryTarget(chat, thread)]


def load_telegram_routing(config_dir: Path) -> TelegramRouting:
    return TelegramRouting.load(config_dir)
