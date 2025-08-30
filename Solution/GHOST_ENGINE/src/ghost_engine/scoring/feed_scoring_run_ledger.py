"""
Per-feed-sortie scoring counters for dev_session: jobs scored in one stealth iteration
(or one non-stealth cycle), aggregated by gate, optional Telegram summary.

L0 evaluates filters sequentially — only the first failing gate is recorded per job (same as trash_audit).
"""

from __future__ import annotations

import os
import time
from collections import Counter, deque
from dataclasses import dataclass, field
from typing import Any

from ghost_engine.scoring.budget_infer_llm import reset_budget_infer_sortie_calls
from ghost_engine.utils.logger import get_logger

log = get_logger(__name__)

_MAX_SAMPLES = 48

_state: _SortieState | None = None


@dataclass
class _SortieState:
    site_id: str
    started_perf: float
    graph_invocations: int = 0
    sample: deque[dict[str, Any]] = field(default_factory=lambda: deque(maxlen=_MAX_SAMPLES))
    by_key: Counter[str] = field(default_factory=Counter)


def begin_feed_sortie(site_id: str) -> None:
    """Reset ledger at the start of one feed sortie (one inner stealth iteration or one periodic cycle)."""
    global _state
    sid = (site_id or "").strip() or "unknown"
    _state = _SortieState(site_id=sid, started_perf=time.perf_counter())
    reset_budget_infer_sortie_calls()
    log.debug("feed_sortie.begin", site_id=sid)


def record_feed_sortie_matrix_blocks(
    *,
    site_id: str,
    job_id: str,
    title_preview: str | None,
    blocking_reasons: list[str],
    gri: float | None = None,
) -> None:
    """
    One graph invocation, many counter keys: each blocking reason increments matrix_drop|<reason>.
    graph_invocations += 1 once (do not call record_feed_sortie_outcome for the same job).
    """
    global _state
    sid = (site_id or "").strip() or "unknown"
    if _state is None:
        begin_feed_sortie(sid)
    assert _state is not None
    if _state.site_id != sid:
        begin_feed_sortie(sid)
    st = _state
    st.graph_invocations += 1
    reasons = [r.strip() for r in blocking_reasons if isinstance(r, str) and r.strip()]
    if not reasons:
        reasons = ["MATRIX_UNKNOWN"]
    for r in reasons:
        st.by_key[f"matrix_drop|{r}"] += 1
    st.by_key["_kind|matrix_drop"] += 1
    tp = (title_preview or "").strip()
    if len(tp) > 140:
        tp = tp[:137] + "..."
    st.sample.append(
        {
            "job_id": (job_id or "").strip() or "?",
            "title": tp or None,
            "kind": "matrix_drop",
            "reason": ";".join(reasons),
            "gri": gri,
        }
    )


def record_feed_sortie_outcome(
    *,
    site_id: str,
    job_id: str,
    title_preview: str | None,
    outcome_kind: str,
    reason_code: str,
    gri: float | None = None,
) -> None:
    """
    Record one completed scoring graph invocation (after preflight passed).

    outcome_kind: insufficient | l0_drop | notify_gate | defer_dom | defer_detail |
                  success_notify | notify_failed
    reason_code: machine code (L0 code, NOTIFY_*, INSUFFICIENT_SIGNAL, etc.)
    """
    global _state
    sid = (site_id or "").strip() or "unknown"
    if _state is None:
        begin_feed_sortie(sid)
    assert _state is not None
    if _state.site_id != sid:
        begin_feed_sortie(sid)
    st = _state
    st.graph_invocations += 1
    key = f"{outcome_kind}|{reason_code}"
    st.by_key[key] += 1
    st.by_key[f"_kind|{outcome_kind}"] += 1
    tp = (title_preview or "").strip()
    if len(tp) > 140:
        tp = tp[:137] + "..."
    st.sample.append(
        {
            "job_id": (job_id or "").strip() or "?",
            "title": tp or None,
            "kind": outcome_kind,
            "reason": reason_code,
            "gri": gri,
        }
    )


def _env_truthy(name: str, *, default: bool = True) -> bool:
    v = (os.environ.get(name) or "").strip().lower()
    if not v:
        return default
    return v not in ("0", "false", "no", "off")


def _rejected_kinds() -> frozenset[str]:
    return frozenset({"insufficient", "l0_drop", "notify_gate", "notify_failed", "matrix_drop"})


def format_feed_sortie_summary_text(*, site_id: str, end_reason: str) -> str | None:
    """Build summary for Telegram; returns None if nothing to report."""
    global _state
    st = _state
    if st is None or st.graph_invocations <= 0:
        return None
    elapsed = max(0.0, time.perf_counter() - st.started_perf)
    rej_kinds = _rejected_kinds()
    rejected = sum(
        v for k, v in st.by_key.items() if k.startswith("_kind|") and k.split("|", 1)[1] in rej_kinds
    )
    funnel = sum(
        v for k, v in st.by_key.items() if k.startswith("_kind|") and k.split("|", 1)[1] == "success_notify"
    )
    defer_d = sum(
        v for k, v in st.by_key.items() if k.startswith("_kind|") and k.split("|", 1)[1] == "defer_dom"
    )
    defer_t = sum(
        v for k, v in st.by_key.items() if k.startswith("_kind|") and k.split("|", 1)[1] == "defer_detail"
    )
    matrix_jobs = sum(
        v for k, v in st.by_key.items() if k.startswith("_kind|") and k.split("|", 1)[1] == "matrix_drop"
    )
    matrix_reason_hits = sum(v for k, v in st.by_key.items() if k.startswith("matrix_drop|"))
    lines: list[str] = [
        f"📊 Feed sortie · {st.site_id}",
        f"End: {end_reason} · duration {elapsed:.0f}s",
        f"Scored (GraphQL→graph): {st.graph_invocations}",
        f"Cut / skipped: {rejected} · notify enqueued: {funnel}",
    ]
    if defer_d or defer_t:
        lines.append(f"Deferred: dom={defer_d} · detail={defer_t}")
    if matrix_jobs or matrix_reason_hits:
        lines.append(f"Quality matrix: jobs={matrix_jobs} · reason-hits={matrix_reason_hits}")
    lines.append("")
    lines.append("By gate (first hit per job):")
    pairs = [(k, v) for k, v in st.by_key.items() if not k.startswith("_kind|")]
    pairs.sort(key=lambda x: (-x[1], x[0]))
    for k, v in pairs[:28]:
        lines.append(f"  • {k} → {v}")
    if len(pairs) > 28:
        lines.append(f"  … +{len(pairs) - 28} keys")
    if st.sample:
        lines.append("")
        lines.append("Samples (latest):")
        for row in list(st.sample)[-12:]:
            t = row.get("title") or "—"
            gid = row.get("job_id")
            rk = row.get("reason")
            g = row.get("gri")
            g_s = f" GRI={g:.2f}" if isinstance(g, (int, float)) else ""
            lines.append(f"  · {gid} | {t[:70]}{g_s}")
            lines.append(f"    → {row.get('kind')}|{rk}")
    rid = (os.environ.get("GHOST_RUN_ID") or "").strip()
    if rid:
        lines.append("")
        lines.append(f"run_id={rid[:36]}")
    return "\n".join(lines)


async def finalize_feed_sortie_telegram(*, site_id: str, end_reason: str) -> None:
    """Emit Telegram summary if sortie had ≥1 scored job; then clear ledger."""
    global _state
    if not _env_truthy("GHOST_TELEGRAM_FEED_SORTIE_SUMMARY", default=True):
        _state = None
        log.debug("feed_sortie.summary_disabled", env="GHOST_TELEGRAM_FEED_SORTIE_SUMMARY")
        return
    text = format_feed_sortie_summary_text(site_id=site_id, end_reason=end_reason)
    _state = None
    if not text:
        log.debug("feed_sortie.finalize_empty", site_id=site_id, end_reason=end_reason)
        return
    topic = (os.environ.get("GHOST_TELEGRAM_FEED_SORTIE_TOPIC") or "system").strip() or "system"
    try:
        from ghost_engine.telegram.operator_alert import send_operator_text_alert

        await send_operator_text_alert(text=text, ops_topic=topic)
    except Exception as exc:
        log.warning("feed_sortie.telegram_failed", error=str(exc))
    log.info(
        "feed_sortie.finalized",
        site_id=site_id,
        end_reason=end_reason,
        topic=topic,
    )
