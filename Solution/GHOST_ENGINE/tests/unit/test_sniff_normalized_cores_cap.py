"""BaseSiteAdapter.record_sniff_normalized_job_cores bounds memory."""

from __future__ import annotations

import pytest

from ghost_engine.adapters.base_adapter import BaseSiteAdapter
from ghost_engine.adapters.contra_adapter import ContraAdapter


def _minimal_site_yaml(tmp_path):
    p = tmp_path / "site.yaml"
    p.write_text(
        "site_id: contra\nurl: https://example.com\ngraphql:\n"
        "  jobs_endpoint: https://example.com/gql\n",
        encoding="utf-8",
    )
    return p


def test_record_sniff_normalized_job_cores_collects_cores(tmp_path) -> None:
    a = ContraAdapter(_minimal_site_yaml(tmp_path))
    a.record_sniff_normalized_job_cores(
        [
            {"job_id": "~abc123", "title": "A"},
            {"job_id": "def456", "title": "B"},
            {"job_id": "", "title": "skip"},
        ]
    )
    assert a._sniff_normalized_job_cores == {"abc123", "def456"}


def test_record_sniff_normalized_job_cores_respects_cap(monkeypatch, tmp_path) -> None:
    monkeypatch.setattr(BaseSiteAdapter, "_SNIFF_NORMALIZED_CORES_CAP", 4)
    a = ContraAdapter(_minimal_site_yaml(tmp_path))
    for i in range(10):
        a.record_sniff_normalized_job_cores([{"job_id": f"id{i}", "title": "x"}])
    assert len(a._sniff_normalized_job_cores) <= 4
