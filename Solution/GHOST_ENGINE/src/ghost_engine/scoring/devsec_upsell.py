"""DevSecOps upsell copy: single source for cover letter + prompts (Trivy / Semgrep / Gitleaks)."""

from __future__ import annotations

# Tag string lives in ``scoring.engine.TAG_SECURITY_VALUED`` (used by collect_upsell_tags).


def devsec_upsell_paragraph() -> str:
    """Insert into cover letter when ``SECURITY_VALUED`` tag is on the job (LLM or template)."""
    return (
        "My delivery standard includes a lightweight security pass you can show stakeholders:\n"
        "1. Static analysis (Semgrep) aligned with common OWASP-style issues in the stack we use.\n"
        "2. Container/image scanning (Trivy) when the work ships with Docker.\n"
        "3. Secret leak checks (Gitleaks-style) so keys do not end up in the repo.\n"
        "You receive short reports or logs alongside the code — no security theater, just industry-norm hygiene."
    )
