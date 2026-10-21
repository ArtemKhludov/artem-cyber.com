# Two-phase notify: feed -> detail -> Telegram

## Purpose

In high-noise feeds, sending alerts directly from feed-level payloads is risky.  
Two-phase notify delays `cover + Redis/Telegram enqueue` until the browser opens the job detail page and a second, richer GraphQL payload is observed.

Result: fewer low-context alerts, better downstream quality.

---

## Configuration

`config/scoring.yaml` -> `feed_reading`:

- `defer_notify_until_job_detail` (default: `false`)  
  Enables two-phase notify mode.
- `detail_notify_wait_timeout_sec` (default: `28`, range: `5..120`)  
  Max wait for second-pass detail capture after detail-page `goto`.

The defer path is gated by normal quality policy:

- `gri >= save_min_gri`
- `should_adapter_enqueue_notify(...)` allows notify

---

## Interaction with `defer_dom`

`defer_dom` is evaluated first in `base_adapter`.  
If a job enters `defer_dom`, `defer_detail` is skipped for the same sniff cycle.

Do not enable both modes blindly on the same page flow.  
`pending_dom_resolve_loop` can race with pending flush logic.

---

## Runtime behavior

1. First feed sniff:
   - registry event: `defer_detail_notify`
   - `job_id` is added to:
     - `pending_jobs_to_read`
     - `_jobs_awaiting_detail_notify`
   - no cover and no notify yet

2. Repeated feed sniffs for the same `job_id`:
   - do not clear defer state
   - until detail-page `goto` is confirmed (`_jobs_detail_goto_done`)

3. After detail `goto`:
   - second sniff enters normal path
   - cover + notify proceed
   - state is cleared after `notify_enqueued`

4. Timeout or missing URL:
   - events: `detail_notify_timeout` / `detail_notify_no_url`
   - defer state is dropped
   - no stale feed-level auto-notify is sent

---

## Implementation map

- `src/ghost_engine/scoring/feed_reading.py`  
  Feed-reading config fields.
- `src/ghost_engine/adapters/upwork_adapter.py`  
  Defer state and `defer_notify_until_job_detail_if_needed`.
- `src/ghost_engine/adapters/base_adapter.py`  
  Pre-cover defer invocation, queue checks, defer-abandon logic.
- `src/ghost_engine/browser/dev_session.py`  
  `_flush_pending_jobs_for_adapter`: optional scroll, detail `goto`, second-pass wait.

---

## Anchor URL and dedupe

Detail-page `goto` URL is resolved by anchor layer (`resolve_anchor_job_public_url`), typically from summary storage/template logic.  
Telegram dedupe remains `site_id:job_id`.
