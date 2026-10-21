# Why a card does not reach Telegram

This is the real gate chain after Upwork GraphQL sniffing.

---

## 1) L0 gate

Source: `config/scoring.yaml` -> `l0_filters`

Typical checks:

- budget
- country
- `global_forbidden_phrases`
- `contextual_vetoes`
- policy-specific TOS filters

If L0 fails:

- item is dropped early
- no notify path is executed
- reason is visible in scoring logs (`job.scoring_gate`)

---

## 2) GRI + tier assignment

After L0 pass:

- GRI is computed
- `job_tier` is assigned:
  - `TRASH` if GRI is below tier threshold
  - otherwise `MANUAL_REVIEW` or `ZERO_TOUCH`

Optional stage:

- `budget_llm_infer` can refine budget assumptions and trigger GRI recomputation

---

## 3) Adapter notify policy

Source: `src/ghost_engine/scoring/adapter_notify_policy.py`

Core controls:

- `adapter_skip_notify_on_trash_tier: true`  
  No enqueue for `TRASH`.
- `adapter_enqueue_min_gri > 0`  
  Drops anything below queue floor.

Important threshold separation:

- `gri.adapter_enqueue_min_gri` -> Telegram/queue floor
- `feed_reading.save_min_gri` -> feed-level auto-save behavior
- `gri.auto_apply_min_gri` -> reserved for future operatorless apply path

If alerts disappear, most cases are:

- L0 drop (e.g. low budget)
- enqueue floor too high
- save threshold confusion

---

## 4) Defer DOM path

When defer mode is active for Upwork:

- card is queued into `pending_dom_resolve`
- browser process (`dev_session`) must open detail page
- only then can payload be finalized for Redis/Telegram worker

If worker runs without active browser session, deferred cards will not complete.

---

## 5) Logs that matter

- `job.scoring_gate` (`GRI_SCORED`, `DROP_L0`, etc.)
- `job.scoring_skip_notify` (`trash_tier`, `below_adapter_min_gri`, ...)
- `notify.deferred_for_dom_url`

Stop guessing. Read these first.

---

## Feed loop timing and auto-save notes

- Inter-round load-more delay:
  - normal: `GHOST_FEED_INTER_LOAD_MORE_SEC_MIN/MAX`
  - fast mode: `GHOST_FEED_INTER_FAST_SEC_*`
  - disable: `GHOST_FEED_INTER_LOAD_MORE_DISABLE=1`

- Feed linger/auto-like behavior:
  - controlled in `config/scoring.yaml` -> `feed_reading`
  - disable: `GHOST_FEED_LINGER_DISABLE=1`

- Auto-saved audit output:
  - `data/upwork/liked/YYYY-MM-DD.jsonl`

- Feed tile save selector:
  - `config/sites/upwork.yaml` -> `selectors.save_job_feed_tile_button`
