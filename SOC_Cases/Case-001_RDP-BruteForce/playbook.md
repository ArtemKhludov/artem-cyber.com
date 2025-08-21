# Playbook: RDP brute force with successful logon

**ID:** IR-PB-001  
**Version:** 1.1  
**Case anchor:** 2025-08-20  
**Owner:** Artem Khludov

## Trigger

- Multiple 4625 on logon type 10 / port 3389 from one external IP, then 4624 for the same target, or  
- SIEM correlation you already named for RDP spray + success.

## Phase 0 — Validate (minutes)

```spl
index=windows (EventCode=4625 OR EventCode=4624)
| where match(Logon_Type,"10") OR like(dest_port,"3389")
| stats values(user) as users earliest(_time) as first latest(_time) as last by src_ip, dest_host
| where mvcount(users) > 2 OR relative_time(last,first) < 120
```

I pull the session list on the target: source IP, usernames tried, exact success time.

## Phase 1 — Contain

1. Block source IP at the edge (whatever control plane you actually have; I use the vendor console, not a fake CLI).  
2. `Disable-ADAccount` for the confirmed user. Log off stale sessions on the host if still live.  
3. Network-isolate the workstation from production VLAN until disk and telemetry are clean.

## Phase 2 — Hunt same shift

- Persistence: scheduled tasks, Run keys, new local users, services.  
- Same source IP elsewhere.  
- Same password age pattern on other svc_* accounts.

## Phase 3 — Recover

- Re-image or trusted clean + EDR full scan before VLAN return.  
- Re-enable account only if the team accepts the new secret path (PAM or break-glass).

## Phase 4 — Handoff

Short written record: timeline, IOC, containment time, root cause line, follow-up tickets (MFA, listener policy).

## Further reading

- Microsoft hardening guidance for RDP  
- NIST incident handling overview (pick the revision your org cites)
