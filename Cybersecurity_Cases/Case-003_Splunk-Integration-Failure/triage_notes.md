# Case 003: Splunk integration looked like auth pain, was role confusion

**Case opened:** 2025-08-20 16:11 America/Los_Angeles (business hours)  
**Analyst:** Artem Khludov  
**Org (fictional example):** EnergyLogic AI  
**Class:** Platform / detection engineering  
**Severity:** Medium  
**Status:** Closed, stable ingestion

## Why this matters

When **Universal Forwarder (UF)** looks healthy but **search is empty**, the failure is usually **topology**, not passwords.

## Fact → consequence → action

| Fact | Consequence | Action taken |
|------|-------------|--------------|
| UF and Enterprise both on **8089** | Management API clash | Split mgmt ports (Enterprise **8089**, UF **8090** in the lab narrative) |
| Enterprise **local `outputs.conf`** with tcpout | Indexer acted as forwarder | Remove forward outputs from indexer tier; restart in window |
| Invalid **`autoLB`** in `outputs.conf` | UF stalled config | Remove unsupported key for that UF build |
| UF could not read monitored file | Gap on that path | Fix POSIX perms for the Splunk runtime user |
| Eighteen legacy inputs | Noise and cost | Disable nonessential stanzas; keep two core sources for phase one |
| Archive under `monitor://` | Re-ingest of `.gz` | Exclude archive paths |

## Problems from investigation (status unchanged)

1. Password auth noise: **false alarm** (CLI blocked, not credential truth).  
2. Port **8089** conflict: **resolved** with split.  
3. TCP **9997** cooked path broken: **resolved** by removing mistaken forwarder role on Enterprise.  
4. **`autoLB`**: **resolved** by deletion.  
5. File permissions on test log: **resolved** with `chmod 644` on the test path.  
6. macOS quarantine: **not** an issue.  
7. Many inputs: **resolved** by disabling extras.  
8. Archive misread: **not** a production issue after exclude.

## Root cause

Splunk Enterprise behaved as a **forwarder** because **`outputs.conf`** and defaults plus app overlays conflicted with the intended **indexer-only** role.

## Validation

```spl
index=* | head 10
index=main | stats count by sourcetype
```

_Last edit: 2025-08-20_
