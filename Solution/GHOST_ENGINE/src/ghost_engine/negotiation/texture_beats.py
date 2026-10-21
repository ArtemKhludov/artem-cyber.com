"""Deterministic selection of optional cover-letter texture beats (spoken voice seasoning)."""

from __future__ import annotations

import hashlib
from functools import lru_cache

from ghost_engine.negotiation.prompt_render import negotiation_prompts_dir

_BEATS_FILENAME = "cover_letter_texture_beats.txt"


def _texture_identity_key(job_id: str, title: str, description: str) -> str:
    """
    Stable key for hashing: real job_id when present; otherwise digest of title+description.

    Avoids every empty-id job on a site mapping to the same beat.
    """
    jid = (job_id or "").strip()
    if jid:
        return jid
    blob = f"{title}\n{description}".strip()
    if not blob:
        return ""
    return "anon:" + hashlib.sha256(blob.encode("utf-8")).hexdigest()[:16]


@lru_cache(maxsize=1)
def _load_beats_raw() -> tuple[str, ...]:
    path = negotiation_prompts_dir() / _BEATS_FILENAME
    if not path.is_file():
        return ()
    lines: list[str] = []
    for line in path.read_text(encoding="utf-8").splitlines():
        s = line.strip()
        if not s or s.startswith("#"):
            continue
        lines.append(s)
    return tuple(lines)


def load_texture_beats() -> tuple[str, ...]:
    """Non-empty beat lines from ``cover_letter_texture_beats.txt``."""
    return _load_beats_raw()


def select_texture_beat(
    job_id: str,
    site_id: str,
    *,
    title: str = "",
    description: str = "",
) -> str:
    """
    Pick one beat from the pool using a stable hash of identity + ``site_id``.

    Identity is ``job_id`` when non-empty; otherwise a short digest of
    ``title`` + ``description`` so different jobs still get different beats.
    """
    beats = _load_beats_raw()
    if not beats:
        return ""
    jid = _texture_identity_key(job_id, title, description)
    sid = (site_id or "").strip().lower()
    raw = hashlib.sha256(f"{jid}|{sid}".encode("utf-8")).digest()
    idx = int.from_bytes(raw[:8], "big") % len(beats)
    return beats[idx]


def clear_texture_beats_cache() -> None:
    """Test hook: reload beats file from disk."""
    _load_beats_raw.cache_clear()
