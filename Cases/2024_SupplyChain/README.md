# 2024 Milestone: Supply Chain Security (npm_check)
`npm audit` is a joke. It tells you about problems when it's already too late. I wanted a proactive triage system.
- **Logic:** Lockfile analysis → OSV/GitHub Advisory enrichment → automated risk scoring.
- **Philosophy:** If a dependency hasn't been updated in 2 years, it's a risk. If it's a 0.0.1 version with 50 downloads, it's a risk.
- **Status:** Core engine handles dependency tree normalization and policy enforcement.
