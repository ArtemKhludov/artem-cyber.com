"""Scoring pipeline (L0–L2) and job normalization."""

from ghost_engine.scoring.devsec_upsell import devsec_upsell_paragraph
from ghost_engine.scoring.engine import TAG_SECURITY_VALUED, ScoringEngine
from ghost_engine.scoring.normalizer import (
    JobNormalizer,
    JOB_SIGNAL_KEYS,
    normalize_job_signal,
    normalize_upwork_job,
    normalized_job_keys,
    scoring_signal_nonempty,
)

__all__ = [
    "JOB_SIGNAL_KEYS",
    "JobNormalizer",
    "TAG_SECURITY_VALUED",
    "ScoringEngine",
    "devsec_upsell_paragraph",
    "normalize_job_signal",
    "normalize_upwork_job",
    "normalized_job_keys",
    "scoring_signal_nonempty",
]
