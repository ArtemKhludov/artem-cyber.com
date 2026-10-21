"""Unit tests for Ghost ROI Index (GRI) calculator."""

from __future__ import annotations

from pathlib import Path

import yaml

from ghost_engine.scoring.roi_calculator import calculate_gri_with_breakdown


def _scoring_root() -> dict:
    path = Path(__file__).resolve().parents[2] / "config" / "scoring.yaml"
    raw = yaml.safe_load(path.read_text(encoding="utf-8"))
    assert isinstance(raw, dict)
    return raw


def _base_signal() -> dict:
    return {
        "title": "API",
        "description": "python api kubernetes docker automation " * 40,
        "budget_value": 2000.0,
        "budget_type": "fixed",
        "posted_at": "2026-03-30T12:00:00+00:00",
        "total_applicants": 3,
        "invitations_sent": 0,
        "source_site": "upwork",
        "client_stats": {
            "avg_rating": 4.9,
            "hire_rate": 0.6,
            "is_payment_verified": True,
            "total_spent": 10000.0,
        },
    }


def test_calculate_gri_with_breakdown_bounds_and_tier() -> None:
    root = _scoring_root()
    gri, br, tier, persona = calculate_gri_with_breakdown(
        _base_signal(), root, site_id="upwork"
    )
    assert 0.0 <= gri <= 1.0
    assert "GRI" in br
    assert tier in ("ZERO_TOUCH", "MANUAL_REVIEW", "TRASH")
    assert persona in ("sniper", "consultant", "specialist")


def test_proposals_tier_used_when_no_applicants_or_invites() -> None:
    root = _scoring_root()
    sig = _base_signal()
    sig["total_applicants"] = 0
    sig["invitations_sent"] = None
    sig["proposals_tier"] = "20-50"
    _, br, _, _ = calculate_gri_with_breakdown(sig, root, site_id="upwork")
    assert br.get("K_proposals_tier_mid") == 35.0
    assert float(br.get("K_competition", 1.0)) > 1.0


def test_scope_strong_hits_cap_gri_and_block_zero_touch() -> None:
    root = _scoring_root()
    sig = _base_signal()
    sig["description"] = (
        "python automation. team of 10 developers. long-term collaboration. staff aug."
    )
    sig["total_applicants"] = 2
    _, br, tier, _ = calculate_gri_with_breakdown(sig, root, site_id="upwork")
    assert int(br.get("M_scope_term_hits") or 0) >= 2
    assert br.get("scope_strong_team_signal") is True
    assert float(br.get("GRI", 1.0)) <= float(root["gri"]["scope_gri_cap"]) + 1e-6
    assert tier != "ZERO_TOUCH"


def test_scope_mismatch_reduces_gri_vs_plain_text() -> None:
    root = _scoring_root()
    plain = _base_signal()
    team = {
        **plain,
        "description": plain["description"]
        + " we need a team of 10 developers for long-term staff augmentation",
    }
    g_plain, br_plain, _, _ = calculate_gri_with_breakdown(plain, root, site_id="upwork")
    g_team, br_team, _, _ = calculate_gri_with_breakdown(team, root, site_id="upwork")
    assert br_team.get("M_scope", 1.0) > br_plain.get("M_scope", 1.0)
    assert g_team < g_plain
