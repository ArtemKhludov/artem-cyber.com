"""ops_ai_diag_queue payload limits."""

from __future__ import annotations

from ghost_engine.ops.ops_ai_diag_queue import trim_job_for_redis


def test_trim_job_drops_oversized_image() -> None:
    huge = "x" * 500_000
    job = {
        "incident": "test.incident",
        "context": {"k": "v"},
        "site_id": "upwork",
        "image_base64": huge,
    }
    out = trim_job_for_redis(job, max_bytes=50_000)
    assert "image_base64" not in out
    assert out.get("image_omitted_reason") == "payload_size_cap"
    assert out["incident"] == "test.incident"
