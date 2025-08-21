# Case 005: Post-incident hardening

**Case opened:** 2025-08-20 11:42 America/Los_Angeles (business hours)  
**Analyst:** Artem Khludov  
**Project ID:** REMEDIATION-2025-11  
**Related pattern:** Phishing-led workstation compromise; ~400MB financial data exfiltrated from an accounting host.  
**Severity:** High (controls gap after confirmed compromise)  
**Status:** Controls implemented; validation via external pen test (RedTeam Security)

## Why this matters

Phishing plus weak egress and identity controls turns one click into bulk exfiltration.

## Fact → consequence → action

| Fact | Consequence | Action |
|------|-------------|--------|
| No URL filtering | Users hit arbitrary sites | Cisco Umbrella DNS filtering; categories blocked (new domains, suspicious TLDs, phishing/malware, uncategorized) |
| VPN password-only | Stolen creds = VPN access | MFA on VPN (AnyConnect), O365, finance apps, admins; Authenticator + SMS backup |
| DLP mis-tuned | Large transfers invisible | Splunk rule on firewall bytes_out >50MB/hour to external; whitelist known sync vendor IPs |
| Email gateway loose | Malicious mail in inbox | Proofpoint: suspicious TLD block, external banner, URL rep scan, sandbox attachments |
| Training stale (8 months) | High click rate | KnowBe4 campaign + finance extra session |
| VPN no geo guard | brute-force from abroad | ASA geo allowlist US/CA; travel exception process |

## Timeline (incident context)

- **November 14:** accounting workstation compromise; financial data exfiltration (~400MB).  
- **November 15–22:** hardening rollout, tuning, external pen test, CISO sign-off.

## Measurable deltas

| Metric | Before | After | Change |
|--------|--------|-------|--------|
| Phishing delivered | ~15/day | 0–1/day | ~−93% |
| VPN compromise attempts | 2/month | 0 | −100% |
| DLP response | N/A | <5 min | new |
| Phish click rate | 18% | 4% | −78% |
| MFA coverage | 0% | 99% | +99% |
| Suspicious URL blocks | 0 | 156/week (first week) | new |

## Pen test

Vendor: RedTeam Security. Phish 0/10 inbox; VPN brute-force blocked by MFA; exfil detected ~4 min; malicious URL blocked by Umbrella. Grade A- (guest WiFi finding remediated).

## Cost snapshot

KnowBe4 ~$3,200/yr; Umbrella ~$8,500/yr; Authenticator free; internal time ~60 hours total (planning, implementation, testing, training).

_Last edit: 2025-08-20_
