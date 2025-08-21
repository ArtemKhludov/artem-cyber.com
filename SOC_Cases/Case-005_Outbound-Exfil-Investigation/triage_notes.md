# Case 005: SIEM fired on fat HTTPS egress from accounting

**Case opened:** 2025-08-21 13:55 America/Los_Angeles (business hours)  
**Analyst:** Artem Khludov  
**Severity:** High  
**Status:** Contained same afternoon; IR took disk and memory

## Alert snapshot

Accounting workstation `WS-ACCT-07` (`192.168.10.45`) pushed roughly **400MB** to `185.220.102.8:443` in about twenty minutes. User session was `jsmith`. That volume and destination class is not her normal pattern.

## What I checked first

Splunk slice on the host for outbound totals by destination:

```spl
index=firewall src_ip="192.168.10.45"
| stats sum(bytes_out) as total_bytes by dest_ip
| where total_bytes > 100000000
```

First time I saw this host over nine figures to a non-allowlisted IP.

## Intel on the IP

I ran the address through our standard intel feeds; enough vendors flagged it that I treated it as hostile infrastructure, not a stray CDN.

## Host-side story

EDR timeline around the spike: Excel pulls from the finance share, Outlook open, no PowerShell or cmd burst. That pointed to cred theft plus interactive abuse rather than noisy ransomware.

## User call

She remembered an email about an “expense tracker” update, clicked through, and typed creds into a page that looked like ours. That lined up with VPN or remote reuse of her account from the attacker side.

## What I did the same day

- VLAN isolation on `WS-ACCT-07`  
- Disabled `jsmith` in AD until reset + MFA enrollment  
- Blocked `185.220.102.8` at the edge  
- Evidence pass started for IR handoff

## Timeline (America/Los_Angeles, 2025-08-21)

| Time | Event |
|------|--------|
| 08:10 | Phishing message delivered |
| 08:18 | User submitted creds to fake portal |
| 13:40 | Large HTTPS egress begins |
| 13:52 | SIEM correlation assigned |
| 13:55 | I owned the ticket and started notes (case opened) |
| 14:06 | Queries + host review complete |
| 14:24 | Workstation isolated |
| 14:34 | Account disabled pending reset |

## IOC I shipped in the ticket

- `185.220.102.8`  
- `company-expense-update[.]tk` (sinkholed later by provider)  
- Host `WS-ACCT-07`, user `jsmith`

## MITRE (short list I used)

T1566.002, T1078, T1071.001, T1041

## Lesson I wrote down once

Bulk exfil in minutes is what saved us. Slow drip over days would have been harder to catch on volume alone, so I pushed for DLP-style volume rules on finance VLANs, not only domain-wide.

_Last edit: 2025-08-21_
