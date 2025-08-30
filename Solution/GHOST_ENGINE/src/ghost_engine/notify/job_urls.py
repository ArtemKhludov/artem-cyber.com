"""Derive public job URLs for operator Telegram cards (feed may set explicit URL later)."""

from __future__ import annotations

from typing import Any, Mapping


def infer_job_public_url(
    site_id: str,
    job_id: str | None,
    job_signal: Mapping[str, Any],
) -> str | None:
    """
    Best-effort public URL for the job posting.

    Prefer explicit ``public_url`` / ``job_public_url`` in ``job_signal`` when http(s).
    For Upwork ciphertext ids, use canonical ``/jobs/~...`` pattern.
    """
    for key in ("public_url", "job_public_url"):
        v = job_signal.get(key)
        if isinstance(v, str):
            s = v.strip()
            if s.lower().startswith("http"):
                return s

    if not job_id or not str(job_id).strip():
        return None

    sid = (site_id or "").strip().lower()
    jid = str(job_id).strip()
    if sid == "upwork":
        core = jid.lstrip("~")
        if not core:
            return None
        return f"https://www.upwork.com/jobs/~{core}/"

    return None
