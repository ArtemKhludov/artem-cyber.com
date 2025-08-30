"""
Self-healing/Emergency Logic: handle UI failures by asking AI for help.
Enqueues SOS signal to Redis, runs entropy wait, and applies fixed selectors.
"""

from __future__ import annotations

import asyncio
import json
import time
from typing import Any

import redis.asyncio as aioredis
from playwright.async_api import Page

from ghost_engine.browser import human_behavior
from ghost_engine.utils.logger import get_logger

log = get_logger(__name__)

SOS_REQUEST_KEY = "ghost:emergency:request"
SOS_RESPONSE_KEY_PREFIX = "ghost:emergency:response"

async def ask_ai_for_ui_fix(
    page: Page,
    site_id: str,
    selector_key: str,
    redis_client: aioredis.Redis,
) -> str | None:
    """
    The Emergency Loop:
    1. Capture screenshot and DOM.
    2. Send SOS to Redis.
    3. Run entropy wait while polling Redis for a response.
    4. Return the new selector.
    """
    log.error("emergency.ui_failure", site_id=site_id, key=selector_key)
    
    # 1. Gather context
    url = page.url
    try:
        dom = await page.content()
        # Potentially take a screenshot if needed: await page.screenshot(type="jpeg", quality=50)
    except Exception:
        dom = "unavailable"

    request_id = f"{site_id}:{selector_key}:{int(time.time())}"
    payload = {
        "id": request_id,
        "site_id": site_id,
        "selector_key": selector_key,
        "url": url,
        "dom_snippet": dom[:50000], # Send first 50k chars of DOM
    }

    try:
        # 2. Send SOS
        await redis_client.lpush(SOS_REQUEST_KEY, json.dumps(payload))
        log.info("emergency.sos_sent", request_id=request_id)

        # 3. Entropy Wait + Response Polling
        response_key = f"{SOS_RESPONSE_KEY_PREFIX}:{request_id}"
        wait_duration = 60.0 # Wait up to 60 seconds
        deadline = time.monotonic() + wait_duration
        
        # Run entropy wait in background, poll Redis in foreground
        # We pass the site_id to entropy_wait so it can perform site-specific harmless actions
        entropy_task = asyncio.create_task(
            human_behavior.entropy_wait(page, wait_duration, site_id=site_id)
        )
        
        new_selector = None
        while time.monotonic() < deadline:
            resp = await redis_client.get(response_key)
            if resp:
                data = json.loads(resp)
                new_selector = data.get("fixed_selector")
                log.info("emergency.fix_received", request_id=request_id, fix=new_selector)
                break
            await asyncio.sleep(2.0)

        entropy_task.cancel()
        return new_selector

    except Exception as exc:
        log.warning("emergency.sos_failed", error=str(exc))
        return None
