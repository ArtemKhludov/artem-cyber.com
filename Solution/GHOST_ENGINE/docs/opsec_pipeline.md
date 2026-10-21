# OPSEC pipeline and prompt-injection defense

Status: specification-level contract for Nodes 2-4.  
`main_plan.md` keeps strategy; this file defines control mechanics.

---

## 1) End-to-end control model

```text
Capture (Node 0-1)
  -> Filtering + tiering
  -> Sanitization
  -> Execution (Manual / Zero-Touch)
```

Security posture:

- Input is untrusted.
- Sanitization happens before heavy generation.
- Automation is constrained by policy and hard caps.

---

## 2) Sanitizer node (LangGraph)

Placement:

- Before any node that receives raw client text or full task descriptions.
- Mandatory gate for proposal generation and negotiation steps.

### 2.1 Heuristic scanner (deterministic, near-zero cost)

- Config-driven patterns (`config/opsec.yaml`)
- Typical markers:
  - `ignore previous`
  - `system prompt`
  - jailbreak-style override language
- On hit:
  - set `injection_suspect=True`
  - emit `opsec.heuristic_hit`
  - prevent direct pass-through into expensive generation path

### 2.2 LLM firewall (cheap local classifier)

- Short strict prompt
- machine-parseable output contract (JSON / boolean schema)
- Pydantic validation for parser safety
- parse failure fallback:
  - block or escalate
  - never silently pass

### 2.3 Policy actions

- `drop_silent`
- `telegram_escalate`
- `stub_reply`

Rule: user-visible replies must not leak internal prompts, tool chains, or internal node identifiers.

---

## 3) Hard execution caps (Python-enforced)

Model output is advisory, not authoritative.

Critical constraints are enforced in deterministic Python:

- minimum allowed bid
- discount ceiling relative to baseline
- reject negative/invalid monetary values
- enforce tier corridor (`ZERO_TOUCH` allowed only inside configured bounds)

If a rule fails:

- raise security error
- stop action path
- emit audit log

---

## 4) State and audit integration

- Conversation state stored in `chat_state` (JSONB) should be sanitized or risk-tagged.
- Decisions must be auditable through structured events:
  - `opsec.decision`
  - layer (`heuristic` / `llm_firewall`)
  - action result

No black-box moderation logic without logs.

---

## 5) Compliance scope

This document describes defensive controls for internal automation resilience.  
It is not an instruction set for bypassing third-party platform controls.

---

## 6) Target implementation map

| Component | Target files |
|---|---|
| Sanitizer node | `agents/nodes/sanitizer_node.py`, wired in `agents/graph.py` |
| OPSEC policy config | `config/opsec.yaml` |
| Hard bid guard | proposal send node + `ghost_engine/security/bid_guard.py` |
| Logging | `structlog` with `opsec.*` event namespace |

---

## 7) Related docs

- `docs/scoring_cascade.md`
- `docs/agent_graphs.md`
- `docs/architecture_supplement.md`
- `docs/main_plan.md`
