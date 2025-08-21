# Case 006: Splunk pack for credential abuse and login-path noise

**Case opened:** 2025-08-21 16:28 America/Los_Angeles (business hours)  
**Analyst:** Artem Khludov  
**Class:** Detection engineering delivery  
**Severity:** n/a (build artifact, not a single live incident)  
**Status:** Closed for v1 after peer review on sample data

## What I shipped

- Two indexes in the model I used: `index=win` with `sourcetype=WinEventLog:Security`, and `index=waf` with `sourcetype=waf:access`.  
- Light field alignment (`EventCode`, `user`, `src_ip`, `host` on Windows; `src_ip`, `uri_path`, `status`, `user_agent` on WAF) so SPL stays readable.  
- Six Windows and WAF searches plus one correlation join for “same public IP hits `/login` hard then Windows 4625 spikes.”  
- Throttle, allowlist, and ticket-field conventions written in `automation.md`.  
- `log_generator.py` for reproducible JSONL so QA is not hand-editing `_raw`.

## Story the pack targets

Public `/login` gets hammered with 401/403, then Windows shows a burst of 4625 for overlapping usernames, then a 4624. That is the credential stuffing plus spray pattern I built for.

## How I validated

I ran each SPL against the generated JSONL, walked counts up and down around thresholds, and added allowlist hooks for office egress before I called it done.

_Last edit: 2025-08-21_
