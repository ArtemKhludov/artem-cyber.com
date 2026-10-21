# 2024 — Supply Chain Security (npm_check)

**Problem.** `npm audit` reports known CVEs after the fact; it says nothing about risky but not-yet-flagged dependencies.

- **Pipeline:** lockfile analysis → OSV / GitHub Advisory enrichment → risk scoring.
- **Risk heuristics:** stale packages (no release in ~2 years) and low-reputation packages (e.g. 0.0.x versions with very few downloads) are treated as risk signals, not just known CVEs.
- **Status:** started as an OSV ingestion prototype in 2024 ([Archive/2024](../../Archive/2024/)); now runs in production as the `dependency-security` service with OSV, GitHub Advisory and deps.dev enrichment. Details: [Solution/npm_check](../../Solution/npm_check/README.md).
