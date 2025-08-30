"""
Operator-facing diagnosis: local Ollama (text, then optional vision), then Gemini text-only API.

Gemini never receives images (cost control). If every stage fails, a separate ops.system
message summarizes attempts for the manager.

Queued via ``ops_ai_diag_queue`` (Redis + fallback memory) unless GHOST_OPS_AI_DIAG_USE_QUEUE=0.
"""

from __future__ import annotations

import asyncio
import json
import os
import time
from typing import Any

import httpx

from ghost_engine.config.settings import get_settings
from ghost_engine.telegram.operator_alert import send_operator_text_alert, send_ops_system_line
from ghost_engine.utils.logger import get_logger

log = get_logger(__name__)

_LAST_DIAG_MONO: float = 0.0
_LAST_MANAGER_ESCALATION_MONO: float = 0.0

MIN_BRIEF_CHARS = 15


def _brief_acceptable(text: str | None) -> bool:
    return bool(text and len(text.strip()) >= MIN_BRIEF_CHARS)


def _stage_outcome(fragment: str | None) -> str:
    if fragment is None:
        return "нет ответа (ошибка сети, таймаут или HTTP≠200)"
    s = fragment.strip()
    if len(s) < MIN_BRIEF_CHARS:
        return f"ответ слишком короткий ({len(s)} симв., нужно ≥{MIN_BRIEF_CHARS})"
    return "ok"


def _ops_ai_diag_min_interval_sec() -> float:
    try:
        return max(30.0, float(os.environ.get("GHOST_OPS_AI_DIAG_MIN_SEC", "120")))
    except ValueError:
        return 120.0


def _manager_escalation_min_interval_sec() -> float:
    try:
        return max(60.0, float(os.environ.get("GHOST_OPS_AI_MANAGER_ALERT_MIN_SEC", "300")))
    except ValueError:
        return 300.0


def _manager_escalation_enabled() -> bool:
    v = os.environ.get("GHOST_OPS_AI_MANAGER_ALERT_ENABLED", "1").strip().lower()
    return v not in ("0", "false", "no", "off")


def _use_queue() -> bool:
    v = os.environ.get("GHOST_OPS_AI_DIAG_USE_QUEUE", "1").strip().lower()
    return v not in ("0", "false", "no", "off")


def _build_operator_prompt(
    incident: str,
    context: dict[str, Any],
    *,
    mode: str = "text",
) -> str:
    ctx = json.dumps(context, ensure_ascii=False, indent=2)[:8000]
    tail = (
        "\n\nUse ONLY the JSON context above (this request has no image)."
        if mode == "text"
        else "\n\nA viewport screenshot is attached as model image input; correlate it with the JSON."
    )
    return f"""You are a senior browser automation engineer. The GHOST_ENGINE bot hit an incident.

INCIDENT_CODE: {incident}

STRUCTURED_CONTEXT (JSON):
{ctx}

Reply in Russian, concise (max 1200 chars). Use this structure:
1) Что, вероятно, сломалось (1–3 предложения).
2) Что проверить в DevTools / на странице (bullets).
3) Какие файлы/настройки трогать (например config/sites/upwork.yaml, селекторы, env).
{tail}

No JSON wrapper — plain text only."""


async def _ollama_diagnose_text(incident: str, context: dict[str, Any]) -> str | None:
    settings = get_settings()
    host = settings.ollama_host.rstrip("/")
    url = f"{host}/api/generate"
    model = (settings.ghost_ollama_model or "llama3.2-vision").strip()
    prompt = _build_operator_prompt(incident, context, mode="text")

    try:
        async with httpx.AsyncClient(timeout=90.0) as client:
            resp = await client.post(
                url,
                json={
                    "model": model,
                    "prompt": prompt,
                    "stream": False,
                    "options": {"temperature": 0.2, "num_ctx": 8192},
                },
            )
        if resp.status_code != 200:
            log.warning(
                "ops_ai_diag.ollama_http",
                status=resp.status_code,
                preview=resp.text[:200],
            )
            return None
        body = resp.json()
        text = (body.get("response") or "").strip()
        return text if text else None
    except Exception as exc:
        log.warning("ops_ai_diag.ollama_failed", error=str(exc))
        return None


def _ollama_chat_message_content(message: dict[str, Any]) -> str:
    content = message.get("content")
    if isinstance(content, str):
        return content.strip()
    if isinstance(content, list):
        parts: list[str] = []
        for block in content:
            if isinstance(block, dict) and block.get("type") == "text":
                t = block.get("text")
                if isinstance(t, str):
                    parts.append(t)
        return "\n".join(parts).strip()
    return ""


async def _ollama_diagnose_vision(incident: str, context: dict[str, Any], image_base64: str) -> str | None:
    """Native Ollama /api/chat with ``images`` array (llama3.2-vision)."""
    settings = get_settings()
    host = settings.ollama_host.rstrip("/")
    url = f"{host}/api/chat"
    model = (settings.ghost_ollama_model or "llama3.2-vision").strip()
    prompt = _build_operator_prompt(incident, context, mode="vision")
    body = {
        "model": model,
        "messages": [
            {
                "role": "user",
                "content": prompt,
                "images": [image_base64],
            }
        ],
        "stream": False,
        "options": {"temperature": 0.2, "num_ctx": 8192},
    }
    try:
        async with httpx.AsyncClient(timeout=120.0) as client:
            resp = await client.post(url, json=body)
        if resp.status_code != 200:
            log.warning(
                "ops_ai_diag.ollama_vision_http",
                status=resp.status_code,
                preview=resp.text[:240],
            )
            return None
        data = resp.json()
        msg = data.get("message")
        if isinstance(msg, dict):
            text = _ollama_chat_message_content(msg)
            return text if text else None
        return None
    except Exception as exc:
        log.warning("ops_ai_diag.ollama_vision_failed", error=str(exc))
        return None


async def _gemini_diagnose_text(incident: str, context: dict[str, Any]) -> str | None:
    from ghost_engine.negotiation.llm_cascade import _gemini_generate_async, ops_fallback_gemini_model

    model = ops_fallback_gemini_model()
    ctx = json.dumps(context, ensure_ascii=False, indent=2)[:8000]
    user = f"""Инцидент: {incident}

Контекст (JSON), без изображения — ориентируйся только на поля и значения:
{ctx}

Краткий разбор для оператора на русском: что сломалось, что проверить, какие селекторы/config править. До 1000 символов."""

    text, err = await _gemini_generate_async(
        model,
        user,
        timeout_sec=55.0,
        temperature=0.2,
        max_output_tokens=512,
    )
    if err:
        log.warning("ops_ai_diag.gemini_failed", error=err)
    return (text or "").strip() or None


async def _send_manager_escalation(
    *,
    incident: str,
    site_id: str,
    context: dict[str, Any],
    stages_failed: list[tuple[str, str]],
    had_screenshot: bool,
) -> None:
    global _LAST_MANAGER_ESCALATION_MONO
    if not _manager_escalation_enabled():
        return
    now = time.monotonic()
    if now - _LAST_MANAGER_ESCALATION_MONO < _manager_escalation_min_interval_sec():
        log.debug("ops_ai_diag.manager_escalation_rate_limited")
        return
    _LAST_MANAGER_ESCALATION_MONO = now

    from ghost_engine.ops.diag_gate_ledger import format_ops_diag_stages_for_manager

    lines = [
        "GHOST / менеджер: диагностика LLM — все шаги не дали пригодного ответа.",
        f"Инцидент: {incident}",
        f"Сайт: {site_id}",
        f"Скрин в пайплайне (только локальный Ollama vision): {'да' if had_screenshot else 'нет'}",
        "API Gemini: только текст, изображения не отправлялись (экономия).",
        "",
        "Что сделали по порядку:",
    ]
    lines.extend(format_ops_diag_stages_for_manager(stages_failed))
    lines.extend(
        [
            "",
            "Вероятные причины: Ollama не запущена; неверный GHOST_OLLAMA_MODEL; нехватка VRAM;",
            "таймаут; нет GEMINI_API_KEY или квота/блок API; пустой/битый JSON контекста.",
            "",
            "Что делать: structlog ops_ai_diag.*; вручную открыть URL из context; проверить Ollama curl;",
            "временно GHOST_OPS_AI_DIAG_ENABLED=0 или GHOST_OPS_AI_DIAG_IMAGE=0.",
        ]
    )
    tail = json.dumps(context, ensure_ascii=False)
    if len(tail) > 2200:
        tail = tail[:2200] + "…"
    lines.extend(["", "--- context (trim) ---", tail])

    try:
        await send_ops_system_line("\n".join(lines))
    except Exception as exc:
        log.warning("ops_ai_diag.manager_telegram_failed", error=str(exc))


async def _run_ops_llm_diagnosis_core(
    *,
    incident: str,
    context: dict[str, Any],
    site_id: str,
    ops_topic: str = "errors",
    image_base64: str | None = None,
    rate_limit: bool = False,
) -> None:
    """
    ``rate_limit=True`` only for inline/direct calls (anti-spam on errors topic).
    Queued jobs use ``rate_limit=False`` so each dequeued incident can notify.
    """
    global _LAST_DIAG_MONO
    if rate_limit:
        gap = _ops_ai_diag_min_interval_sec()
        now = time.monotonic()
        if now - _LAST_DIAG_MONO < gap:
            log.debug("ops_ai_diag.rate_limited", incident=incident, gap_sec=gap)
            return
        _LAST_DIAG_MONO = now

    settings = get_settings()
    ollama_model = (settings.ghost_ollama_model or "llama3.2-vision").strip()
    brief: str | None = None
    source = "none"
    stages_failed: list[tuple[str, str]] = []
    had_shot = bool(image_base64)

    if image_base64:
        brief = await _ollama_diagnose_text(incident, context)
        if _brief_acceptable(brief):
            source = "ollama"
        else:
            stages_failed.append(("ollama_text", _stage_outcome(brief)))
            brief = await _ollama_diagnose_vision(incident, context, image_base64)
            if _brief_acceptable(brief):
                source = "ollama_vision"
            else:
                stages_failed.append(("ollama_vision", _stage_outcome(brief)))
                brief = await _gemini_diagnose_text(incident, context)
                if _brief_acceptable(brief):
                    source = "gemini"
                else:
                    stages_failed.append(("gemini_text", _stage_outcome(brief)))
    else:
        brief = await _ollama_diagnose_text(incident, context)
        if _brief_acceptable(brief):
            source = "ollama"
        else:
            stages_failed.append(("ollama_text", _stage_outcome(brief)))
            brief = await _gemini_diagnose_text(incident, context)
            if _brief_acceptable(brief):
                source = "gemini"
            else:
                stages_failed.append(("gemini_text", _stage_outcome(brief)))

    all_failed = not _brief_acceptable(brief)
    if all_failed:
        await _send_manager_escalation(
            incident=incident,
            site_id=site_id,
            context=context,
            stages_failed=stages_failed,
            had_screenshot=had_shot,
        )
        brief = (
            "Ни один этап (Ollama текст →"
            + (" Ollama vision →" if had_shot else "")
            + " Gemini текст) не дал пригодного текста; см. ops.system для менеджера и JSON ниже."
        )
        source = "none"

    from ghost_engine.ops.diag_gate_ledger import build_ops_diag_traversal_report

    diag_ledger = build_ops_diag_traversal_report(
        had_image=had_shot,
        source=source,
        all_failed=all_failed,
        stages_failed=stages_failed,
    )
    log.info(
        "ops_ai_diag.traversal",
        incident=incident,
        site_id=site_id,
        pipeline=diag_ledger.get("pipeline"),
        all_failed=diag_ledger.get("all_failed"),
        terminal_source=diag_ledger.get("terminal_source"),
        summary_ru=diag_ledger.get("summary_ru", "")[:900],
        steps=diag_ledger.get("steps"),
    )

    tail = json.dumps(context, ensure_ascii=False)
    if len(tail) > 3200:
        tail = tail[:3200] + "…"

    text = (
        f"GHOST диагностика (источник: {source}, Ollama: {ollama_model}"
        f"{', скрин только локально (vision)' if had_shot else ''})\n\n"
        f"Инцидент: {incident}\n"
        f"Сайт: {site_id}\n\n"
        f"{brief}\n\n"
        f"--- context (JSON) ---\n{tail}"
    )
    try:
        await send_operator_text_alert(text=text, ops_topic=ops_topic)
    except Exception as exc:
        log.warning("ops_ai_diag.telegram_failed", error=str(exc))


async def process_ops_ai_diag_from_job(job: dict[str, Any]) -> None:
    """Worker entry: validate payload and run diagnosis + Telegram (errors topic)."""
    incident = job.get("incident")
    if not isinstance(incident, str) or not incident.strip():
        log.warning("ops_ai_diag.bad_job", reason="missing_incident")
        return
    ctx = job.get("context")
    if not isinstance(ctx, dict):
        ctx = {}
    site_id = str(job.get("site_id", "unknown"))
    ops_topic = str(job.get("ops_topic", "errors"))
    img = job.get("image_base64")
    image_base64 = img.strip() if isinstance(img, str) and img.strip() else None

    await _run_ops_llm_diagnosis_core(
        incident=incident.strip(),
        context=ctx,
        site_id=site_id,
        ops_topic=ops_topic,
        image_base64=image_base64,
        rate_limit=False,
    )


async def notify_ops_with_llm_diagnosis(
    *,
    incident: str,
    context: dict[str, Any],
    site_id: str,
    ops_topic: str = "errors",
    image_base64: str | None = None,
) -> None:
    """Direct path (same as one dequeued job) without queue."""
    await _run_ops_llm_diagnosis_core(
        incident=incident,
        context=context,
        site_id=site_id,
        ops_topic=ops_topic,
        image_base64=image_base64,
        rate_limit=True,
    )


def schedule_ops_llm_diagnosis(
    *,
    incident: str,
    context: dict[str, Any],
    site_id: str,
    ops_topic: str = "errors",
    image_base64: str | None = None,
) -> None:
    """Enqueue to Redis (or memory fallback) or inline task when queue disabled."""
    job: dict[str, Any] = {
        "incident": incident,
        "context": context,
        "site_id": site_id,
        "ops_topic": ops_topic,
    }
    if image_base64:
        job["image_base64"] = image_base64

    if not _use_queue():

        async def _inline() -> None:
            try:
                await _run_ops_llm_diagnosis_core(
                    incident=incident,
                    context=context,
                    site_id=site_id,
                    ops_topic=ops_topic,
                    image_base64=image_base64,
                    rate_limit=True,
                )
            except Exception as exc:
                log.warning("ops_ai_diag.inline_failed", error=str(exc))

        asyncio.create_task(_inline(), name=f"ops_ai_diag_inline:{incident[:20]}")
        return

    from ghost_engine.ops.ops_ai_diag_queue import ensure_ops_ai_diag_worker, enqueue_ops_ai_diag_job

    ensure_ops_ai_diag_worker()

    async def _enqueue() -> None:
        try:
            await enqueue_ops_ai_diag_job(job)
        except Exception as exc:
            log.warning("ops_ai_diag.enqueue_failed", error=str(exc))

    try:
        loop = asyncio.get_running_loop()
    except RuntimeError:
        log.warning("ops_ai_diag.no_event_loop")
        return
    loop.create_task(_enqueue(), name=f"ops_ai_diag_enqueue:{incident[:20]}")
