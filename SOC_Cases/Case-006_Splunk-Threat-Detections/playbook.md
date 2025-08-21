# Playbook: Land a small Splunk detection bundle

**ID:** ENG-PB-006  
**Version:** 1.0  
**Case anchor:** 2025-08-21  
**Owner:** Artem Khludov

## Step 1 — Freeze the data model

Pick index and sourcetype names, map ten fields you will actually use, stop there. CIM can wait.

## Step 2 — Write searches from loudest to quietest

Brute stacks first, spray second, success-after-fail third, then privilege noise, then WAF login ratio, then generic 4xx/5xx noise, then correlation last because it is expensive.

## Step 3 — Generate data

Run `python3 log_generator.py --out sample_events.jsonl` from this directory, import to a dev index, run the SPL, adjust thresholds until false positives match what the team accepts.

## Step 4 — Wire automation

Wire throttles and alert actions exactly as in `automation.md` so on-call sees the same JSON shape every time.

## Further reading

- Splunk docs for `stats` vs `join` cost on your cluster size
