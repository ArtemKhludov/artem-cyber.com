"""
Structured Ollama diagnostics when GraphQL shape may diverge from the deterministic parser.

Human-in-the-loop only: logs + optional Telegram; never mutates scoring state.
"""

from __future__ import annotations

import asyncio
import json
import os
import re
import time
from collections import deque
from collections.abc import Mapping, Sequence
from typing import Any

import httpx
from pydantic import BaseModel, ConfigDict, Field

from ghost_engine.config.settings import get_settings
from ghost_engine.scoring.ollama_lanes import ollama_wait_background_turn
from ghost_engine.telegram.operator_alert import send_operator_text_alert
from ghost_engine.utils.logger import get_logger

log = get_logger(__name__)

_shape_diag_ts: deque[float] = deque(maxlen=512)


class GraphQLShapeDiagResult(BaseModel):
    """Strict-ish shape for model JSON (unknown keys ignored)."""

    model_config = ConfigDict(extra="ignore")

    field: str | None = None
    expected_from_parser: str | None = None
    found_in_json: str | None = None
    confidence: str = Field(default="low", description="low|medium|high")
    action: str = Field(
        default="needs_new_graphql_root",
        description="extend_parser|false_positive|needs_new_graphql_root",
    )
    suspected_root: str | None = None
    json_path: str | None = None
    observed_keys: list[str] = Field(default_factory=list)
    parser_reads: str | None = None
    hypothesis: str | None = None
    suggested_code_paths: list[str] = Field(default_factory=list)


def _truthy_env(name: str) -> bool:
    v = (os.getenv(name) or "").strip().lower()
    return v in ("1", "true", "yes", "on")


def _yaml_diag_cfg() -> dict[str, Any]:
    s = get_settings().base_config.get("graphql_shape_diag")
    return s if isinstance(s, dict) else {}


def _rate_allow(max_per_minute: int) -> bool:
    if max_per_minute <= 0:
        return False
    now = time.monotonic()
    while _shape_diag_ts and now - _shape_diag_ts[0] > 60.0:
        _shape_diag_ts.popleft()
    if len(_shape_diag_ts) >= max_per_minute:
        return False
    _shape_diag_ts.append(now)
    return True


def _parse_json_loose(blob: str) -> dict[str, Any] | None:
    blob = blob.strip()
    try:
        o = json.loads(blob)
        return o if isinstance(o, dict) else None
    except json.JSONDecodeError:
        pass
    m = re.search(r"\{[\s\S]*\}\s*$", blob)
    if m:
        try:
            o = json.loads(m.group(0))
            return o if isinstance(o, dict) else None
        except json.JSONDecodeError:
            return None
    return None


def _truncate_payload(obj: Any, max_chars: int) -> str:
    try:
        s = json.dumps(obj, ensure_ascii=False, default=str)
    except (TypeError, ValueError):
        s = repr(obj)
    if len(s) <= max_chars:
        return s
    return s[: max_chars - 24] + "\n...<truncated>..."


def _redact_description_blobs(obj: Any, max_desc: int = 400) -> Any:
    """Shorten long description-like strings for LLM prompt (PII / token limit)."""
    if isinstance(obj, Mapping):
        out: dict[str, Any] = {}
        for k, v in obj.items():
            ks = str(k).lower()
            if ks in ("description", "body", "summary", "details") and isinstance(v, str) and len(v) > max_desc:
                out[k] = v[:max_desc] + "…"
            else:
                out[k] = _redact_description_blobs(v, max_desc)
        return out
    if isinstance(obj, list):
        return [_redact_description_blobs(x, max_desc) for x in obj[:80]]
    return obj


def raw_payload_has_nested_listing_client(payload: Mapping[str, Any] | None, *, max_nodes: int = 2500) -> bool:
    """True if any object has a ``client`` child with spend or payment verification (feed card shape)."""
    if not isinstance(payload, Mapping):
        return False
    stack: list[Any] = [payload]
    seen = 0
    while stack and seen < max_nodes:
        cur = stack.pop()
        seen += 1
        if isinstance(cur, Mapping):
            cl = cur.get("client")
            if isinstance(cl, Mapping):
                if cl.get("totalSpent") is not None:
                    return True
                pvs = cl.get("paymentVerificationStatus")
                if pvs is True or (isinstance(pvs, (int, float)) and int(pvs) == 1):
                    return True
            for v in cur.values():
                stack.append(v)
        elif isinstance(cur, list):
            for v in cur[:120]:
                stack.append(v)
    return False


def _diag_enabled(cfg: Mapping[str, Any]) -> bool:
    if _truthy_env("GHOST_GRAPHQL_SHAPE_DIAG"):
        return True
    e = cfg.get("enabled")
    return e is True or (isinstance(e, str) and e.strip().lower() in ("true", "1", "yes", "on"))


async def run_graphql_shape_diag_ollama(
    *,
    trigger: str,
    site_id: str,
    job_id: str | None,
    blocking_reasons: Sequence[str] | None,
    payload_slice: Mapping[str, Any],
) -> GraphQLShapeDiagResult | None:
    cfg = _yaml_diag_cfg()
    if not _diag_enabled(cfg):
        return None
    rpm = int(cfg.get("rate_limit_per_minute") or 6)
    if not _rate_allow(rpm):
        log.info("graphql_shape_diag.rate_limited", trigger=trigger, site_id=site_id)
        return None

    settings = get_settings()
    host = settings.ollama_host.rstrip("/")
    model = settings.ghost_ollama_model
    to = float(cfg.get("timeout_sec") or 25.0)
    max_chars = int(cfg.get("max_prompt_chars") or 12000)

    reasons = ",".join(blocking_reasons) if blocking_reasons else ""
    blob = _truncate_payload(_redact_description_blobs(dict(payload_slice)), max_chars)

    prompt = (
        "You diagnose Upwork GraphQL JSON vs our Python parser (normalize_listing_card, "
        "parse_upwork_graphql_payload, normalizer._row_to_job_signal). "
        "Reply with JSON ONLY, no markdown, matching this schema:\n"
        '{"field": string|null, "expected_from_parser": string|null, "found_in_json": string|null, '
        '"confidence": "low"|"medium"|"high", '
        '"action": "extend_parser"|"false_positive"|"needs_new_graphql_root", '
        '"suspected_root": string|null, "json_path": string|null, '
        '"observed_keys": string[], "parser_reads": string|null, "hypothesis": string|null, '
        '"suggested_code_paths": string[]}\n\n'
        f"TRIGGER={trigger}\nSITE={site_id}\nJOB_ID={job_id or ''}\nBLOCKING={reasons}\n\nJSON:\n{blob}\n"
    )

    await ollama_wait_background_turn()
    url = f"{host}/api/generate"
    body_payload = {
        "model": model,
        "prompt": prompt,
        "stream": False,
        "options": {"temperature": 0.15},
    }
    try:
        async with httpx.AsyncClient(timeout=to) as client:
            resp = await client.post(url, json=body_payload)
            resp.raise_for_status()
            body = resp.json()
    except (httpx.HTTPError, OSError, ValueError) as exc:
        log.warning("graphql_shape_diag.ollama_failed", error=str(exc), trigger=trigger)
        return None

    raw = body.get("response") if isinstance(body, dict) else None
    if not isinstance(raw, str) or not raw.strip():
        log.warning("graphql_shape_diag.empty_response", trigger=trigger)
        return None
    parsed = _parse_json_loose(raw)
    if not parsed:
        log.warning("graphql_shape_diag.bad_json", trigger=trigger, sample=raw[:400])
        return None
    try:
        return GraphQLShapeDiagResult.model_validate(parsed)
    except Exception as exc:
        log.warning("graphql_shape_diag.validate_failed", error=str(exc), trigger=trigger)
        return None


async def _shape_diag_task(
    *,
    trigger: str,
    site_id: str,
    job_id: str | None,
    blocking_reasons: Sequence[str] | None,
    payload: Mapping[str, Any],
) -> None:
    data = payload.get("data")
    if not isinstance(data, Mapping):
        data = payload
    slice_d: dict[str, Any] = {"data": data} if isinstance(data, Mapping) else {}

    result = await run_graphql_shape_diag_ollama(
        trigger=trigger,
        site_id=site_id,
        job_id=job_id,
        blocking_reasons=blocking_reasons,
        payload_slice=slice_d,
    )
    if result is None:
        return

    log.info(
        "graphql_shape_diag.result",
        trigger=trigger,
        site_id=site_id,
        job_id=job_id,
        field=result.field,
        action=result.action,
        confidence=result.confidence,
        json_path=result.json_path,
        hypothesis=(result.hypothesis or "")[:500] or None,
    )

    cfg = _yaml_diag_cfg()
    if cfg.get("telegram_summary") is True:
        line = (
            f"graphql_shape_diag [{trigger}] site={site_id} job={job_id or '?'}\n"
            f"action={result.action} conf={result.confidence}\n"
            f"{(result.hypothesis or '')[:900]}"
        )
        topic = str(cfg.get("telegram_ops_topic") or "errors").strip() or "errors"
        try:
            await send_operator_text_alert(text=line[:4090], ops_topic=topic)
        except Exception as exc:
            log.warning("graphql_shape_diag.telegram_failed", error=str(exc))


def _schedule_coro(coro: Any) -> None:
    try:
        loop = asyncio.get_running_loop()
    except RuntimeError:
        log.debug("graphql_shape_diag.no_running_loop", skip=True)
        return
    t = asyncio.create_task(coro)

    def _done(tk: asyncio.Task[Any]) -> None:
        try:
            tk.result()
        except asyncio.CancelledError:
            pass
        except Exception as exc:
            log.warning("graphql_shape_diag.task_failed", error=str(exc))

    t.add_done_callback(_done)


def maybe_schedule_shape_diag_empty_parse(*, site_id: str, payload: Mapping[str, Any]) -> None:
    """Zero parsed jobs while ``data`` is non-empty — possible new GraphQL alias."""
    cfg = _yaml_diag_cfg()
    if not _diag_enabled(cfg):
        return
    data = payload.get("data")
    if not isinstance(data, Mapping) or not data:
        return
    _schedule_coro(
        _shape_diag_task(
            trigger="parse_empty_nonempty_data",
            site_id=site_id,
            job_id=None,
            blocking_reasons=(),
            payload=payload,
        )
    )


def maybe_schedule_shape_diag_matrix_mismatch(
    *,
    site_id: str,
    job_id: str,
    blocking_reasons: Sequence[str],
    payload: Mapping[str, Any],
) -> None:
    """
    MATRIX_HARD_ZERO_TRUST while raw JSON still shows a rich listing ``client`` blob suggests
    client_stats / parser path mismatch. Optional: GHOST_GRAPHQL_SHAPE_DIAG=1 logs any matrix block.
    """
    cfg = _yaml_diag_cfg()
    if not _diag_enabled(cfg):
        return
    reasons = [str(r) for r in blocking_reasons]
    force = _truthy_env("GHOST_GRAPHQL_SHAPE_DIAG")
    suspicious = "MATRIX_HARD_ZERO_TRUST" in reasons and raw_payload_has_nested_listing_client(payload)
    if not force and not suspicious:
        return
    _schedule_coro(
        _shape_diag_task(
            trigger="matrix_mismatch_suspect",
            site_id=site_id,
            job_id=job_id,
            blocking_reasons=reasons,
            payload=payload,
        )
    )
