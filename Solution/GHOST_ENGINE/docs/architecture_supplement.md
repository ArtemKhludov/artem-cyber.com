# Architecture Supplement (`main_plan.md` gaps made explicit)

`main_plan.md` is the strategic skeleton.  
This file documents the operational details that matter in production but are usually omitted in high-level plans.

No fluff. Just the missing pieces.

---

## Why this file exists

Without these details, "architecture" becomes slideware:

- You cannot explain where quality gates live.
- You cannot prove why LLM cost stays under control.
- You cannot defend safety boundaries during incidents.

This supplement closes that gap.

---

## Gap map: plan vs reality

| Area | In `main_plan.md` | Detailed source |
|---|---|---|
| L0/L1/L2 cascade, fail-fast, threshold config | Mentioned, not operationalized | `docs/scoring_cascade.md` |
| `job_tier`, `tags`, `chat_state`, Manual vs Zero-Touch routing | Not explicit enough | `docs/scoring_cascade.md` |
| Prompt-injection defense, sanitizer before heavy LLM | Missing | `docs/opsec_pipeline.md` |
| Hard financial caps enforced in Python (not by model promises) | Missing | `docs/opsec_pipeline.md` |
| Tier-driven conditional graph routing | Implicit only | `docs/scoring_cascade.md`, `docs/opsec_pipeline.md`, `docs/agent_graphs.md` |

---

## End-to-end operating model

```text
Capture (browser/network) 
  -> Normalize 
  -> L0/L1/L2 + GRI 
  -> Tier routing (MANUAL_REVIEW / ZERO_TOUCH / TRASH)
  -> Sanitizer + safety guards
  -> Execution path (operator or automated lane)
```

This is the contract:

- **Input is untrusted**.
- **Cheap checks run first**.
- **Expensive reasoning is gated**.
- **Actions are policy-bound and auditable**.

---

## Architecture decisions that actually matter

### 1) Single decision engine

One scoring core, reused across adapter and agent pathways.  
No duplicated business logic, no "same idea but different branch behavior."

### 2) Config over hardcode

Thresholds, vetoes, and routing policy live in YAML.  
Operational tuning should not require refactoring unrelated modules.

### 3) Tier is a route, not a cosmetic label

`job_tier` is a control signal for execution mode:

- `MANUAL_REVIEW`: human in the loop.
- `ZERO_TOUCH`: automation allowed inside strict guardrails.
- `TRASH`: dropped early to protect time and compute budget.

### 4) LLM is bounded, not trusted

Model output is never treated as final authority for risky actions.  
Hard guards and caps are enforced in deterministic Python.

### 5) Observability is first-class

Every gate has a reason code and traversal footprint.  
If an item was dropped or escalated, you can explain why without guesswork.

---

## Practical reading order

If you are reviewing this system for technical interviews or architecture audit:

1. `docs/scoring_cascade.md`
2. `docs/opsec_pipeline.md`
3. `docs/agent_graphs.md`
4. `docs/architecture_supplement.md` (this file)

That order gives you strategy -> controls -> execution graph -> synthesis.
