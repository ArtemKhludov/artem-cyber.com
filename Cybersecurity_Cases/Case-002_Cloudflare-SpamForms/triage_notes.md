# Case 002: Cloudflare spam on booking POSTs

**Case opened:** 2025-08-20 14:26 America/Los_Angeles (business hours)  
**Analyst:** Artem Khludov  
**Org (fictional example):** EnergyLogic AI  
**Severity:** High  
**Status:** Closed

## Why this matters

Automated **POST** traffic to **Calendly-style** paths (`/booking`, `/calendly`) burned demo slots. Edge logs, not host EDR, carry the signal.

## Fact → consequence → action

| Fact | Consequence | Action taken |
|------|-------------|--------------|
| High POST rate, empty **Referer** / wrong **Origin** | Direct API style abuse | WAF: require trusted `Origin` for those paths |
| Tool UAs (`python-requests`, `curl`) + steady cadence | Script, not a browser user | Rate limit + managed challenge |
| Low **bot score** on POST | Automation | Bot Management + Turnstile on the real form page |
| Shared enterprise egress | VPN false positives | Tune limits; allowlist known ASNs after measurement |

## Timeline (local wall clock)

| Time (America/Los_Angeles) | Event |
|----------------------------|--------|
| 14:26 | Marketing reports spike in junk demo bookings |
| 14:40 | Cloudflare HTTP slice pulled; POST cluster confirmed |
| 14:52 | WAF: missing-header and rate-limit rules |
| 15:18 | Turnstile on embed; Bot Management enabled |
| 15:45 | Spam volume drop per dashboard (~98% reduction) |

## IOC

- ASNs: **14061**, **9009**, **208091** (VPS-heavy paths in the narrative).  
- UAs: `python-requests/2.28.1`, `curl/7.68.0`, generic bot UA strings.  
- Headers: empty **Referer** / **Origin** not matching `example.com` allowlist in rules (replace with your marketing hostname before paste).

## MITRE (short)

T1190, T1059.009, T1499.004. See `mitre_mapping.md`.

## Root cause

Public POST surface without binding to first-party origin, without bot attestation, without tight rate limits.

_Last edit: 2025-08-20_
