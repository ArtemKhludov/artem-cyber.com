# Case 006: Stealth-Infrastructure

**Case opened:** 2025-08-20 15:08 America/Los_Angeles (business hours)  
**Analyst:** Artem Khludov  
**Severity:** Medium–High (depends on exposure of disposable or third-party infra to production trust)  
**Status:** Review methodology; tune to your org’s asset and DNS telemetry

## Why this matters

Attackers reuse **short-lived domains, compromised hosts, and forward proxies**. If you only watch corporate IPs, you miss the hop that carries the real payload or callback.

## Fact → consequence → action (pattern-level)

| Fact | Consequence | Action |
|------|-------------|--------|
| Newly registered or freshly transferred domains in egress logs | User or malware reaches infrastructure staged for a narrow window | Alert on young-domain categories; correlate with user agent and volume |
| TLS to low-reputation ASNs or bulletproof-ish hosting | Callbacks blend with commodity noise | Enrich dest IP/ASN; compare to passive DNS and certificate transparency |
| SOCKS/HTTP proxies in path | Source IP looks “clean” while origin is not | Inspect proxy headers only where policy allows; focus on rare JA3 / ALPN pairs |
| Automation identities with broad cloud API scope | Ephemeral VMs and DNS records appear without CAB | Scope SPs / roles to minimum; alert on `CreateHostedZone`, `RegisterDomain`, mass `RunInstances` |

_Last edit: 2025-08-20_
