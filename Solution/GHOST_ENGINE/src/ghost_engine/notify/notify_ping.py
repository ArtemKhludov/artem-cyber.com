"""
Enqueue one synthetic ApprovedJobNotifyPayload to Redis (full path to Telegram worker).

Run (Redis must be up, DISABLE_JOB_NOTIFY unset):
  uv run python -m ghost_engine.main notify-ping
"""

from __future__ import annotations

import uuid

from ghost_engine.config.settings import get_settings
from ghost_engine.notify.contract import ApprovedJobNotifyPayload
from ghost_engine.notify.redis_queue import enqueue_notify_job_sync
from ghost_engine.utils.logger import configure_logging, get_logger

log = get_logger(__name__)


def run_notify_queue_ping() -> int:
    settings = get_settings()
    configure_logging(settings.log_level)

    if not settings.redis_url.strip():
        log.error("notify_ping.no_redis_url")
        return 2

    token = str(uuid.uuid4())[:8]
    payload = ApprovedJobNotifyPayload(
        job_id=f"ghost-notify-ping-{token}",
        site_id="upwork",
        l1_score=88,
        gri=0.91,
        persona_tag="sniper",
        job_tier="ZERO_TOUCH",
        job_signal={
            "title": "GHOST notify queue test",
            "description": "Synthetic job from `notify-ping`. If routing is OK, this appears in Upwork «Вакансии» topic.",
            "source_site": "upwork",
            "budget_type": "fixed",
            "budget_value": 1500.0,
            "client_stats": {"country": "USA", "avg_rating": 4.9, "is_payment_verified": True},
        },
        notify_source="scoring_node",
        job_tags=["notify_ping"],
        needs_manual_review=False,
    )

    ok = enqueue_notify_job_sync(settings.redis_url, payload)
    if not ok:
        log.error(
            "notify_ping.enqueue_failed",
            hint="Start Redis (docker compose up -d redis), check REDIS_URL, or dedupe: change job_id / wait TTL",
        )
        return 1

    log.info("notify_ping.enqueued", idempotency_key=payload.idempotency_key)
    return 0
