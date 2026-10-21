# GHOST_ENGINE feed strategy and latent-demand capture

Most pipelines fail because they optimize for volume, not signal.  
This document defines how to expand feed coverage without turning the funnel into garbage.

---

## 1) What the system actually optimizes

The goal is not "all available jobs."  
The goal is **high-quality jobs under explicit risk and cost constraints**.

Core pipeline:

1. Saved-search feed is the raw upstream source.
2. Browser/network capture converts raw payload into normalized `job_signal`.
3. L0 + GRI/L1/L2 performs hard and soft filtering.
4. Notify policy decides what reaches operator channels.
5. Human operator keeps the final decision boundary.

Invariant:

- Upstream breadth controls ingest cost.
- Downstream gates control quality.
- If upstream becomes too broad, downstream cost explodes.

---

## 2) Why latent demand matters

Clients usually describe pain, not stack:

- "Need tamper-proof records" instead of "document integrity pipeline"
- "Need 100 filtered listings" instead of "scraping + dedupe"
- "Need stable server deployment" instead of "Docker + reverse proxy"

If you only search with strict technical terms, you miss real demand.  
If you only search with broad buzzwords, you import marketplace noise.

So the strategy is binary:

- Catch business-language intent.
- Kill non-relevant traffic aggressively.

---

## 3) Demand families (operational view)

| Family | Typical business phrasing | Technical meaning | Main risk |
|---|---|---|---|
| Security / audit / incident | "suspicious activity", "audit", "hardening" | detection, controls, policy, forensics | fake "AI security" noise |
| Data extraction / catalog building | "compile list", "monitor listings", "aggregate records" | scraping, API pulls, dedupe, scheduling | sales-lead spam |
| Small DevOps / stabilization | "move to server", "keeps crashing", "need uptime" | dockerization, proxy, deployment hardening | generic CMS work |
| Document integrity workflows | "proof", "tamper-proof", "immutable records" | hashing, signing, metadata, chain of custody | low-skill data entry overlap |
| Reporting automation | "weekly report", "automate dashboard" | lightweight ETL, scripts, API sync | noisy spreadsheet gigs |

This is how you reason about feed architecture: by families, not by random keyword piles.

---

## 4) Expansion rules (no chaos mode)

### Rule 1: one hypothesis per new search

Each new saved search must represent one specific lexical hypothesis.  
If you cannot name the hypothesis, do not add the search.

### Rule 2: control blast radius

Run a small number of parallel experiments.  
A practical cap is one new latent-demand search per week with measurable outcomes.

### Rule 3: enforce two-layer filtering

- Upstream (saved searches): capture lexical intent.
- Downstream (`scoring.yaml` + policy): remove noise by context, vetoes, and thresholds.

### Rule 4: reject wide-bucket anti-patterns

Queries like `python OR automation OR AI OR data` are not strategy.  
They are noise import.

Use narrow intent-specific searches with explicit negative terms instead.

---

## 5) Optional third layer: gray-zone classifier

For borderline `GRI` cases, you may run a narrow classifier pass (local LLM or deterministic heuristics) to assign intent tags such as:

- `latent_document_integrity`
- `latent_catalog_extraction`
- `latent_small_devops`

Constraints:

- Not a replacement for L0.
- Not a replacement for saved-search logic.
- Must stay cheap and explainable.

If classification cost exceeds quality gain, disable it.

---

## 6) Practical operating checklist

- Keep feed changes versioned and reviewable.
- Track per-hypothesis outcomes: ingest volume, drop rate, notify rate, paid conversion.
- Prefer repository-side policy tuning before large UI-level feed surgery.
- Merge duplicate families when they add complexity without precision.
- Preserve explainability: every drop/escalation should have a reason code.

---

## 7) Bottom line

You are not building a "bigger feed."  
You are building a **precision funnel**:

- broad enough to catch hidden demand,
- strict enough to avoid operational collapse,
- measurable enough to defend decisions in technical review.
