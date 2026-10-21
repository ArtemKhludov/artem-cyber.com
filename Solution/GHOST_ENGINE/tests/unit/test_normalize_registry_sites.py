"""Smoke: normalize_job_signal for every site_id in SITE_LOADERS."""

from __future__ import annotations

import pytest

from ghost_engine.adapters.registry import SITE_LOADERS
from ghost_engine.scoring.normalizer import normalize_job_signal


@pytest.mark.parametrize("site_id", sorted(SITE_LOADERS.keys()))
def test_normalize_empty_payload_smoke(site_id: str) -> None:
    sniff = "2026-01-01T00:00:00+00:00"
    cu = site_id != "upwork"
    sig = normalize_job_signal(
        site_id,
        {"data": {}},
        sniffed_at=sniff,
        competition_unknown=cu,
    )
    assert isinstance(sig, dict)
    assert sig.get("source_site") == site_id
    assert sig.get("sniffed_at") == sniff
    assert sig.get("competition_unknown") is cu
