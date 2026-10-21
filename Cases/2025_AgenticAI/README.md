# 2025–2026 — Agentic AI Automation (GHOST_ENGINE)

GHOST_ENGINE moves automation from fixed scripts to decisions: a LangGraph cascade of LLM agents qualifies job leads, and a browser layer navigates sites with human-like timing.

- **Stack:** Camoufox/Playwright, LangGraph, Ollama (`llama3.2-vision`) for local analysis, Gemini for text tiers, Redis, PostgreSQL, Telegram operator bot.
- **Scoring:** deterministic L0 filters first, LLM tiers only where they add value — every decision is logged in a gate ledger for audit.
- **Self-healing UI:** when a selector breaks, the emergency repair agent sends the page context to a local Ollama vision model (Gemini as fallback) to propose a replacement selector, and reports to the operator in Telegram instead of failing silently.

Code and tests: [Solution/GHOST_ENGINE](../../Solution/GHOST_ENGINE/README.md).
