# GHOST_ENGINE

Multi-platform AI automation engine designed for high-stakes lead qualification and browser-based decisioning. Not a "scraper" — it's an orchestration layer for resilient, stealthy, and cost-effective operations.

### Technical Core

#### 1. Stealth Browser Layer (Camoufox + Playwright)
*   **Engine:** Custom-profiled Camoufox for advanced fingerprint spoofing.
*   **Behavior:** Human-like navigation patterns (dwell time, entropy-based movement, anti-bot-aware session handling).
*   **Data Extraction:** Resilient GraphQL/XHR sniffing to bypass brittle DOM-based selectors where possible.

#### 2. Cascade Scoring Pipeline (L0 → L1 → L2)
Designed to minimize token consumption and runtime latency while maintaining high precision.
*   **L0 (Deterministic):** Fast, rule-based YAML filters. Drops 80% of irrelevant signals instantly.
*   **L1 (Heuristic LLM):** Broad semantic vetting using lightweight models.
*   **L2 (Deep Reasoning):** Full context analysis for "grey area" high-value targets.
*   **GRI (Ghost ROI Index):** Scoring based on expected value, competition signal, and complexity to drive tier routing (`ZERO_TOUCH` vs `MANUAL`).

#### 3. Orchestration & State (LangGraph)
Pipes and logic orchestrated through **LangGraph**.
*   **Workflows:** Conditional branching, parallel evaluation lanes, and budget inference gates.
*   **State Control:** Unified state contract across all processing nodes (browser capture → scoring → dispatch).

#### 4. Local AI & Self-Healing (Ollama)
*   **`llama3.2-vision`:** Local vision-analysis for **self-healing UI recovery**. Automatically identifies broken selectors and DOM drift via screen diagnostics.
*   **Privacy:** Local inference for L2 eligibility and budget logic, ensuring zero data leakage for internal strategies.

#### 5. OPSEC & Guardrails
Security-first design implemented in the runtime.
*   **Defenses:** Prompt-injection sanitization nodes and custom heuristic LLM firewalls.
*   **Hard Guardrails:** Financial caps and bid limits enforced in pure Python, making them unreachable by LLM logic.
*   **Observability:** Structured logging (`structlog`), Redis-backed queuing, and a Telegram-integrated operator control plane.
