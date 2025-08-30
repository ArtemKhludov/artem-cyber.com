"""Single contract for approved-job notifications (adapter + LangGraph scoring_node)."""

from __future__ import annotations

import json
from typing import Any, Literal

from pydantic import BaseModel, ConfigDict, Field, computed_field


class ApprovedJobNotifyPayload(BaseModel):
    """
    Mirrors ``approved_jobs`` entries from ``scoring_node``; safe to JSON-serialize for Redis.

    ``notify_source`` distinguishes fast adapter path (no Ollama OPSEC) from graph node.
    """

    model_config = ConfigDict(extra="forbid")

    job_id: str | None = None
    site_id: str
    l1_score: int = Field(ge=0, le=100)
    job_signal: dict[str, Any] = Field(default_factory=dict)
    opsec: dict[str, Any] = Field(default_factory=dict)
    needs_manual_review: bool = False
    notify_source: Literal["adapter_sniff", "scoring_node"] = "adapter_sniff"
    job_tags: list[str] = Field(default_factory=list)
    cover_letter: str | None = None
    # Analytical subgraph (GRI pipeline); optional for legacy Redis payloads.
    gri: float | None = Field(default=None, ge=0.0, le=1.0)
    persona_tag: str | None = None
    job_tier: str | None = None
    #: Canonical browser URL for the job (feed flow copies from address bar).
    job_public_url: str | None = None
    #: ``dom_first`` tries a feed link before ``apply_url_template``; ``auto`` defers to Telegram handler.
    apply_strategy: Literal["dom_first", "url_only", "auto"] | None = None
    #: GRI-derived hints for operators and apply form (adapter graph path).
    estimated_price_usd: float | None = None
    estimated_time_hours: float | None = None
    estimate_confidence: float | None = Field(default=None, ge=0.0, le=1.0)

    @computed_field  # type: ignore[prop-decorator]
    @property
    def idempotency_key(self) -> str:
        jid = self.job_id if self.job_id not in (None, "") else "unknown"
        return f"{self.site_id.strip().lower()}:{jid}"

    def to_redis_json(self) -> str:
        # Exclude computed idempotency_key so JSON round-trips through model_validate.
        data = self.model_dump(mode="json", exclude_computed_fields=True)
        return json.dumps(data, ensure_ascii=False)

    @classmethod
    def from_json_bytes(cls, raw: bytes | str) -> ApprovedJobNotifyPayload:
        if isinstance(raw, bytes):
            raw = raw.decode("utf-8")
        data = json.loads(raw)
        if not isinstance(data, dict):
            raise ValueError("notify payload must be a JSON object")
        return cls.model_validate(data)

    @classmethod
    def from_scoring_entry(cls, entry: dict[str, Any]) -> ApprovedJobNotifyPayload:
        """Build from ``scoring_node`` ``approved_jobs`` item."""
        site = entry.get("site_id")
        if not isinstance(site, str) or not site.strip():
            site = "unknown"
        jid = entry.get("job_id")
        job_id_out: str | None
        if jid is None:
            job_id_out = None
        else:
            job_id_out = str(jid)
        score = entry.get("l1_score")
        try:
            score_i = int(score) if score is not None else 0
        except (TypeError, ValueError):
            score_i = 0
        score_i = max(0, min(100, score_i))
        js = entry.get("job_signal")
        if not isinstance(js, dict):
            js = {}
        op = entry.get("opsec")
        if not isinstance(op, dict):
            op = {}
        manual = bool(entry.get("needs_manual_review"))
        jt = entry.get("job_tags")
        tags: list[str] = []
        if isinstance(jt, list):
            tags = [str(x) for x in jt if isinstance(x, str) and x.strip()]
        cl_raw = entry.get("cover_letter")
        cover_out: str | None
        if cl_raw is None:
            cover_out = None
        elif isinstance(cl_raw, str):
            cover_out = cl_raw.strip() or None
        else:
            cover_out = str(cl_raw).strip() or None
        gri_v: float | None = None
        raw_gri = entry.get("gri")
        if isinstance(raw_gri, (int, float)):
            gri_v = max(0.0, min(1.0, float(raw_gri)))
        persona_v = entry.get("persona_tag")
        persona_out = str(persona_v).strip() if isinstance(persona_v, str) and persona_v.strip() else None
        tier_v = entry.get("job_tier")
        tier_out = str(tier_v).strip() if isinstance(tier_v, str) and tier_v.strip() else None
        jpu = entry.get("job_public_url")
        url_out: str | None
        if isinstance(jpu, str) and jpu.strip().lower().startswith("http"):
            url_out = jpu.strip()
        else:
            url_out = None
        raw_as = entry.get("apply_strategy")
        strat_out: Literal["dom_first", "url_only", "auto"] | None
        if raw_as in ("dom_first", "url_only", "auto"):
            strat_out = raw_as  # type: ignore[assignment]
        else:
            strat_out = None
        ep = entry.get("estimated_price_usd")
        price_v: float | None = None
        if isinstance(ep, (int, float)) and ep > 0:
            price_v = float(ep)
        eth = entry.get("estimated_time_hours")
        hours_v: float | None = None
        if isinstance(eth, (int, float)) and eth > 0:
            hours_v = float(eth)
        ec_raw = entry.get("estimate_confidence")
        ec_v: float | None = None
        if isinstance(ec_raw, (int, float)):
            ec_v = max(0.0, min(1.0, float(ec_raw)))

        return cls(
            job_id=job_id_out,
            site_id=site.strip(),
            l1_score=score_i,
            job_signal=dict(js),
            opsec=dict(op),
            needs_manual_review=manual,
            notify_source="scoring_node",
            job_tags=tags,
            cover_letter=cover_out,
            gri=gri_v,
            persona_tag=persona_out,
            job_tier=tier_out,
            job_public_url=url_out,
            apply_strategy=strat_out,
            estimated_price_usd=price_v,
            estimated_time_hours=hours_v,
            estimate_confidence=ec_v,
        )
