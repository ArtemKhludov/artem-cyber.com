# npm_check: Supply Chain Security Automation

A centralized management hub for software dependency risks. This service operates as a continuous security conveyor, moving beyond basic `npm audit` to proactive threat detection and automated update triage.

**Live Dashboard:** Integrated into the telemetry stack at [artem-cyber.com](https://artem-cyber.com/).

### Core Philosophy: "The Triage Pipeline"
The system follows a strict lifecycle for every dependency:
**Discovery → Normalization → Enrichment → Risk Scoring → Decision → Validated Update → Post-Release Monitoring.**

### Technical Implementation

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
