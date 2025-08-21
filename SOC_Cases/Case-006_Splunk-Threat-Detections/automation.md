# Automation and tuning (Splunk)

This is how I keep the searches usable after the first deploy.

## 1) Correlation searches (scheduled)

I structured detections as scheduled searches that produce a consistent output:

- key fields: `src_ip`, `user`, `host`, `uri_path`, `severity`
- a short `rule_name` field so routing stays predictable

### Why it matters

When every alert has the same shape, dedupe, dashboards, and ticket payloads stop being a custom art project for each rule.

## 2) Throttling and suppression

For noisy sources such as login failures I throttle by `src_ip` and sometimes `user` for thirty to sixty minutes, and only re-fire if counts climb again.

On Splunk ES that maps to notable suppression settings you already have.

## 3) Lookup-based allowlists and watchlists

### Allowlist

- office egress IPs
- known scanners
- synthetic monitoring

### Watchlist

- IPs that appear in multiple detections
- suspicious user agents

**Pattern:** enrich with `lookup allowlist.csv src_ip OUTPUT is_allowed` then `where isnull(is_allowed)` before alerting.

## 4) Alert actions (ticket payload)

Fields I always send: `rule_name`, `severity`, `src_ip`, `user`, `host`, counts, `first_seen`, `last_seen`, and three bullets for next steps.

## 5) Simple risk scoring (RBA-lite)

- WAF login abuse: +20
- Windows spray: +30
- Success-after-fail: +40
- admin group change: +80

Page me when `risk_score >= 60`.

## 6) Generator script

`log_generator.py` emits mixed Windows + WAF JSONL so I can prove each SPL fires before I ask anyone to tune thresholds in prod.
