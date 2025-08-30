"""
Emergency Repair Agent: watches ghost:emergency:request and uses LLM (local Ollama + Gemini) to fix UI failures.
Sends alerts to Telegram with advice for the developer.
"""

from __future__ import annotations

import asyncio
import json
from typing import Any

import httpx
import redis.asyncio as aioredis
from ghost_engine.config.settings import get_settings
from ghost_engine.negotiation.llm_cascade import _gemini_generate_async, ops_fallback_gemini_model
from ghost_engine.utils.logger import get_logger
from ghost_engine.core.redis_queue import get_redis
from ghost_engine.telegram.operator_alert import send_operator_text_alert, send_ops_errors_line

log = get_logger(__name__)

SOS_REQUEST_KEY = "ghost:emergency:request"
SOS_RESPONSE_KEY_PREFIX = "ghost:emergency:response"

class EmergencyRepairAgent:
    def __init__(self, redis_client: aioredis.Redis):
        self.redis = redis_client
        self.settings = get_settings()
        self.running = False

    async def start(self):
        log.info("emergency_agent.start")
        self.running = True
        while self.running:
            try:
                # BRPOP returns (key, value)
                res = await self.redis.brpop(SOS_REQUEST_KEY, timeout=5)
                if res:
                    _, payload_str = res
                    payload = json.loads(payload_str)
                    await self.process_request(payload)
            except Exception as e:
                log.error("emergency_agent.loop_error", error=str(e))
                await asyncio.sleep(2)

    async def process_request(self, payload: dict[str, Any]):
        request_id = payload.get("id")
        site_id = payload.get("site_id")
        selector_key = payload.get("selector_key")
        url = payload.get("url")
        dom = payload.get("dom_snippet", "")

        log.info("emergency_agent.processing", request_id=request_id, key=selector_key)

        # Notify Telegram that we are repairing
        await send_operator_text_alert(
            text=f"AI REPAIR START\nSite: {site_id}\nKey: {selector_key}\nURL: {url}\nReason: Selector not found. Initializing local Ollama / Gemini analysis...",
            ops_topic="system"
        )

        # Call LLM for fix AND advice
        result = await self.ask_llm_for_repair_package(selector_key, url, dom)
        fix = result.get("fixed_selector")
        advice = result.get("advice", "No specific advice.")

        if fix:
            response_key = f"{SOS_RESPONSE_KEY_PREFIX}:{request_id}"
            await self.redis.set(response_key, json.dumps({"fixed_selector": fix}), ex=300)
            log.info("emergency_agent.fix_sent", request_id=request_id, fix=fix)

            # Send successful fix to Telegram with advice
            msg = (
                f"AI REPAIR SUCCESS\n"
                f"Site: {site_id}\n"
                f"Key: {selector_key}\n"
                f"New Selector: `{fix}`\n\n"
                f"💡 ADVICE FOR DEVELOPER:\n{advice}\n\n"
                f"Action: Update `config/sites/{site_id}.yaml` to avoid LLM costs next time."
            )
            await send_operator_text_alert(text=msg, ops_topic="system")
        else:
            msg = f"AI REPAIR FAILED\nSite: {site_id}\nKey: {selector_key}\nCould not determine a new selector. Manual intervention required."
            await send_ops_errors_line(text=msg)

    async def ask_llm_for_repair_package(self, selector_key: str, url: str, dom: str) -> dict[str, str]:
        """
        Uses local Ollama (llama3.2-vision by default) or Gemini to find the correct selector AND provide advice.
        """
        prompt = f"""
You are a Senior UI Automation Engineer (local Ollama / Gemini).
A browser script failed to find an element.

CONTEXT:
- Selector Key (Internal): '{selector_key}'
- Page URL: {url}

DOM SNIPPET (First 50k chars):
---
{dom}
---

TASK:
1. Find the new CSS or XPath selector for this element.
2. Provide a short piece of advice for the developer on why it might have changed or how to make the selector more robust.

RESPONSE FORMAT (JSON ONLY):
{{
  "fixed_selector": ".new-class or //xpath",
  "advice": "Short technical advice here."
}}
"""

        # 1. Try local Ollama first
        try:
            model_tag = self.settings.ghost_ollama_model
            ollama_res = await self._call_ollama(model_tag, prompt)
            if ollama_res:
                data = self._parse_json(ollama_res)
                if data.get("fixed_selector"):
                    log.info("emergency_agent.ollama_success", model=model_tag)
                    return data
        except Exception as e:
            log.debug("emergency_agent.ollama_failed", error=str(e))

        # 2. Fallback to Gemini (cascade flash from llm.yaml)
        try:
            text, err = await _gemini_generate_async(
                ops_fallback_gemini_model(),
                prompt,
                timeout_sec=60.0,
                temperature=0.0,
                max_output_tokens=512,
            )

            if text:
                return self._parse_json(text)
            else:
                log.error("emergency_agent.gemini_failed", error=err)
        except Exception as e:
            log.error("emergency_agent.gemini_exception", error=str(e))

        return {}

    def _parse_json(self, text: str) -> dict[str, Any]:
        """Cleans and parses JSON from LLM response."""
        try:
            # Remove markdown code blocks if present
            clean = text.strip()
            if clean.startswith("```json"):
                clean = clean[7:]
            if clean.startswith("```"):
                clean = clean[3:]
            if clean.endswith("```"):
                clean = clean[:-3]
            # If it still looks like it has a prefix (e.g. model explaining)
            if "{" in clean:
                clean = clean[clean.find("{"):]
            if "}" in clean:
                clean = clean[:clean.rfind("}")+1]

            return json.loads(clean.strip())
        except Exception:
            # Fallback: try to find anything that looks like a selector if JSON fails
            return {"fixed_selector": text.strip()[:100], "advice": "Failed to parse JSON response."}

    async def _call_ollama(self, model: str, prompt: str) -> str | None:
        """Helper to call local Ollama instance with increased timeout and context limit."""
        host = self.settings.ollama_host.rstrip("/")
        url = f"{host}/api/generate"
        payload = {
            "model": model,
            "prompt": prompt,
            "stream": False,
            "format": "json",
            "options": {
                "temperature": 0.0,
                "num_ctx": 4096 # Limit context to speed up heavy models like 26B
            }
        }
        # Increased timeout to 120s for heavy models
        async with httpx.AsyncClient(timeout=120.0) as client:
            resp = await client.post(url, json=payload)
            if resp.status_code == 200:
                data = resp.json()
                return data.get("response", "").strip()
        return None

async def run_agent():
    redis = await get_redis()
    agent = EmergencyRepairAgent(redis)
    await agent.start()

if __name__ == "__main__":
    asyncio.run(run_agent())
