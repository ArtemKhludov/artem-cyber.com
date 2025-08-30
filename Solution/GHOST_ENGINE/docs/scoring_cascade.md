# Scoring cascade: L0 -> L1 -> L2

Status:

- L0 and L1 are implemented in code.
- This document defines the production contract for L2, routing, and persistence behavior.

Goal:

- cheap filters first
- expensive reasoning later
- deterministic routing for execution safety

---

## 1) Why cascade scoring exists

Running LLM on every captured card is operationally stupid.  
Cascade scoring keeps cost, latency, and noise under control.

Execution order:

1. `L0` hard rules
2. `L1` keyword/tag relevance
3. `L2` local LLM fit judge (gray-zone only)

---

## 2) Stage definitions

### L0 (rule-based, YAML-driven)

- Input: normalized `job_signal`
- Output: pass/drop + reason code
- Runtime cost: minimal
- Typical controls: budget, geography, phrase vetoes, policy constraints

If L0 fails:

- no expensive path
- structured reason logging

### L1 (relevance and tagging)

- Skill/tag matrix intersection
- Converts raw text into practical routing signals
- Produces tags used by downstream tier assignment

### L2 (local LLM fit judge)

- Applied only to items that justify semantic review
- Strict parse contract (schema-validated output)
- Threshold-based accept/reject
- Fail-open/fail-safe behavior must be explicit in config

---

## 3) Routing model (`job_tier`)

`job_tier` is an execution route, not a cosmetic label.

- `TRASH` -> no operator load
- `MANUAL_REVIEW` -> human approval path
- `ZERO_TOUCH` -> automation allowed only under hard policy guards

Routing must remain deterministic and explainable.

---

## 4) Persistence model (JobOrder contract)

Recommended shape:

- internal `id` (UUID)
- external uniqueness key (`site_id + external_id`)
- raw payload (`JSONB`)
- scoring status enum
- `job_tier` enum
- `tags` collection
- `chat_state` (JSONB, bounded and intentional)

Suggested indexes:

- `(status, created_at)`
- `(job_tier, created_at)`
- `(status, budget)`

---

## 5) GRI integration (Ghost ROI Index)

GRI is a multiplicative ranking signal balancing:

- budget strength
- client trust
- market freshness
- complexity
- competition
- scope mismatch

Use GRI to support tier decisions, not to replace hard L0 rules.

Typical policy:

- below mid threshold -> `TRASH`
- above high threshold -> candidate for `ZERO_TOUCH`
- middle range -> `MANUAL_REVIEW` / L2 arbitration

---

## 6) Missing-budget and edge policies

Missing budget cannot be treated as silent drop by accident.  
Behavior must be explicit:

- pass
- drop
- soft-hold

Edge cases (e.g., closed openings, strong team-scope mismatch) should be enforced as post-rules with explicit audit flags.

---

## 7) Graph integration

Scoring graph path:

`normalize -> l0 -> market -> client -> effort -> roi -> budget_infer(optional) -> l2_eligibility -> l2_ollama -> merge_notify`

Requirements:

- traversal reporting per gate
- reasoned skip/drop markers
- structured logs for every branch

See:

- `docs/agent_graphs.md`
- `docs/opsec_pipeline.md`

---

## 8) Notify thresholds are not the same thing

Do not conflate:

- `gri.adapter_enqueue_min_gri` (queue/Telegram floor)
- `feed_reading.save_min_gri` (feed auto-save behavior)
- `gri.auto_apply_min_gri` (future operatorless apply threshold)

Mixing these leads to false diagnostics and broken operator expectations.

---

## 9) Calibration loop

No calibration, no credibility.

Track:

- gate-by-gate drop reasons
- `gri_breakdown` snapshots
- downstream outcomes (`replied`, `won`, rejection class)

Then adjust YAML weights and thresholds with evidence, not intuition.

---

## 10) Related documents

- `docs/opsec_pipeline.md`
- `docs/agent_graphs.md`
- `docs/ops_telegram_notify_gates.md`
- `docs/architecture_supplement.md`
