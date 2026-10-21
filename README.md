# artem-cyber.com
Public lab shell: architectural milestones, security tooling, and blunt docs.

### [2025-08-29] Current State: Agentic Security
Orchestrating LLMs for high-stakes automation and supply chain resilience.

---

### Architectural Milestones (Cases)
*   **[2025-2026] [Agentic AI Security (GHOST_ENGINE)](Cases/2025_AgenticAI/README.md)**
*   **[2024] [Zero Trust Architecture](Cases/2024_ZeroTrust/README.md)**
*   **[2024] [Supply Chain Resilience](Cases/2024_SupplyChain/README.md)**
*   **[2022] [Infrastructure Hardening](Cases/2022_Hardening/README.md)**

---

### Active Tooling
*   **[npm_check](Solution/npm_check/README.md)**
*   **[GHOST_ENGINE](Solution/GHOST_ENGINE/README.md)**

---

### Timeline
Work before 2025-08 predates this repository; its notes and configs were migrated here when the repository was created ([Archive](Archive/)).

| When | Milestone |
|---|---|
| 2022 | Infrastructure hardening (AntHouse): Nginx and SSH baseline, configs moved under version control |
| 2023 | ModSecurity + OWASP CRS tuned on real traffic; Python log/traffic parser |
| 2024 | Zero Trust perimeter: Cloudflare Zero Trust + OCI compartments; npm supply-chain research and OSV prototype (npm_check) |
| 2024-12 | Shift to agentic security and LLM orchestration |
| 2025-08 | Repository created: case studies, docs, project index |
| 2026-03 – 2026-04 | GHOST_ENGINE: LangGraph scoring cascade (L0/L1/L2), Camoufox/Playwright layer, Redis notify queue, Telegram operator bot, PostgreSQL + Alembic |
| 2026-10 | Repository history consolidated; codebase translated to English; test suite green (321 passed) |

---

### Navigation
*   **Experience:** [Engineering & Security Operations](Docs/experience_summary.md)
*   **Archive:** [Historical Notes (2022-2024)](Archive/)

---
"Systems should be resilient, automated, and silent."
