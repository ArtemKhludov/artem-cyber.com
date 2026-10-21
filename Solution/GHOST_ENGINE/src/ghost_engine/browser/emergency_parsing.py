"""
AI-driven diagnostics for parsing failures. 
Uses local LLM (Ollama) to find discrepancies between raw JSON and parser logic.
"""

from __future__ import annotations

import json
from typing import Any, Mapping
from ghost_engine.utils.logger import get_logger

log = get_logger(__name__)

async def ask_ai_for_parsing_fix(
    raw_json: Mapping[str, Any],
    site_id: str,
    failed_reason: str,
    parser_snippet: str = ""
) -> str | None:
    """
    Sends a sample of 'trash' JSON to local LLM to find structural changes.
    Returns suggested fix or new selector/path.
    """
    from ghost_engine.config.settings import get_settings
    import httpx

    settings = get_settings()
    host = settings.ollama_host.rstrip("/")
    ollama_url = f"{host}/api/generate"
    model_name = settings.ghost_ollama_model

    # We provide the raw JSON and the reason for failure.
    # Local Ollama model acts as a Senior DevSecOps-style analyst.
    prompt = f"""
    SYSTEM: You are a Senior Web Scraping & Reverse Engineering Expert.
    TASK: Analyze why the parser failed to extract data from this Upwork GraphQL JSON.
    
    SITE: {site_id}
    FAILED_REASON: {failed_reason}
    
    RAW_JSON_SAMPLE (Truncated):
    {json.dumps(raw_json, indent=2)[:3000]}
    
    CURRENT_PARSER_LOGIC_HINT:
    {parser_snippet}
    
    QUESTION: What changed in the JSON structure? Provide the correct path to 'title', 'description', and 'id/ciphertext'. 
    Answer concisely in technical terms.
    """

    try:
        async with httpx.AsyncClient(timeout=15.0) as client:
            resp = await client.post(ollama_url, json={
                "model": model_name,
                "prompt": prompt,
                "stream": False
            })
            if resp.status_code == 200:
                result = resp.json().get("response")
                log.info("ai_diag.response", site_id=site_id, fix_suggestion=result[:200])
                return result
    except Exception as e:
        log.warning("ai_diag.failed", error=str(e))
    
    return None
