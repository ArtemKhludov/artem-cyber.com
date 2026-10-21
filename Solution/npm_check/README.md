# npm_check: Supply Chain Security Automation

Dependency-risk service that goes beyond `npm audit`: proactive detection of risky packages and policy-driven update triage.

**Status:** running in production as the `dependency-security` service behind [artem-cyber.com](https://artem-cyber.com/). Source code is not published in this repository.

What runs today:
- dependency scanning enriched from OSV, GitHub Advisory and deps.dev;
- a `risk_score` and a decision per finding: `URGENT`, `BLOCK`, `REVIEW`, `HOLD`, `SAFE-UPDATE`;
- a public dashboard that shows only sanitized aggregates (decision and severity distributions, average risk); package names and versions are redacted unless policy allows them, raw evidence never leaves the service.

The sections below describe the full target design; not every part of it is implemented yet. The 2024 OSV prototype is in [Archive/2024/npm_check_logic.py](../../Archive/2024/npm_check_logic.py).

### Core Philosophy: "The Triage Pipeline"
The system follows a strict lifecycle for every dependency:
**Discovery → Normalization → Enrichment → Risk Scoring → Decision → Validated Update → Post-Release Monitoring.**

### Target Design

#### 1. Inventory & Baseline
*   **Deep Analysis:** Processes `package-lock.json` to build complete direct and transitive dependency trees.
*   **Snapshotting:** Maintains a historical baseline of the dependency graph to detect "silent" tree growth or unexpected hash changes.

#### 2. Policy-Driven Updates (Waiting Periods)
Strictly enforces a "no-rush" policy to mitigate zero-day supply chain attacks:
*   **Quarantine:** New versions are held for a specific period (X days for patches, Y for minors) unless they resolve critical, known vulnerabilities.
*   **Channels:** Routes updates through specialized channels: `security-critical`, `regular-hygiene`, and `manual-review-only`.

#### 3. Multi-Source Enrichment
Aggregates security signals from diverse providers:
*   **Vulnerability Feeds:** OSV, GitHub Advisory Database, and `npm audit` APIs.
*   **Metadata:** npm/GitHub activity (maintainer churn, release cadence, repo age).
*   **Reputation:** Typosquatting detection and analysis of "utility" packages with excessive permissions.

#### 4. Static & Behavioral Analysis
*   **Lifecycle Scripts:** Scans for suspicious `postinstall` behavior, obfuscated code, or unauthorized network calls (curl/wget/node -e).
*   **Lockfile Diffing:** Highlights jumped versions, changed resolved URLs, or integrity hash shifts.

#### 5. Agentic Triage (LangGraph)
Uses **LangGraph** to orchestrate the complex decision-making process:
*   **Deterministic Core:** Logic for semver comparison and advisory matching.
*   **Agentic Layer:** Small local LLMs summarize changelogs and classify suspicious script patterns without leaking data to the cloud.

### Decision Classes
*   **BLOCK:** Blacklisted packages/versions.
*   **HOLD:** Observation period active.
*   **REVIEW:** Manual audit required due to high behavioral risk.
*   **SAFE-UPDATE:** Validated for deployment.
*   **OVERRIDE-TEMP:** Temporary resolution for vulnerable transitive dependencies.
