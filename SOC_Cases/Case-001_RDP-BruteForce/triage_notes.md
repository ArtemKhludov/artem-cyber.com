# Case 001: RDP brute force into finance workstation

**Case opened:** 2025-08-20 10:15 America/Los_Angeles (business hours)  
**Analyst:** Artem Khludov  
**Org (example):** EnergyLogic AI  
**Severity:** High  
**Status:** Closed — contained same shift, no exfiltration observed

## Why I cared

RDP from the internet plus a guessable service account is a short path to interactive access. Once `svc_backup` landed, I saw recon (`net user /domain`) and an SMB hop toward the DC. EDR killed the lateral leg; I still treated it as a full breach until proven otherwise.

## Fact → consequence → action

| Fact | Consequence | What I did |
|------|-------------|------------|
| Burst of 4625 on 3389 then 4624 for `svc_backup` | Confirmed interactive compromise | Disabled account, blocked source IP, isolated `WS-FINANCE-01` |
| `cmd.exe` under RDP session, then `net.exe /domain` | Enumeration and prep for movement | Session review, hunt for persistence, forced reset on service accounts in scope |
| SMB from workstation toward `192.168.10.100:445` | DC touch risk | Confirmed EDR block; verified no second host |

## Timeline (America/Los_Angeles, 2025-08-20)

| Time | Event |
|------|--------|
| 14:22:15 | Failed RDP logons ramp up (multiple usernames) |
| 14:22:27 | Successful RDP as `svc_backup` |
| 14:23:05 | `cmd.exe` from RDP context |
| 14:24:12 | SMB toward DC; lateral blocked by EDR |
| 14:35 | Account disabled, IP dropped at perimeter |
| 14:45 | Host network-isolated |

## IOC (high signal)

- Source IP: `185.220.101.45` (blocked at firewall and in EDR deny list)  
- Account: `svc_backup` (disabled, password rotated under change window)  
- Host: `WS-FINANCE-01`  
- Parent/child: `rdpclip.exe` → `cmd.exe`; `net.exe` with `net user /domain`

## Detection (concept I run in SIEM)

Failed RDP cluster keyed on source IP + target + user, then success within a short window. Splunk-style sketch lives in the playbook.

## Root cause (plain)

Weak credential on a service account exposed to RDP, no MFA on that path, no aggressive lockout or geo policy on the listener I inherited in that build.

## What I changed after

MFA on privileged RDP, rate limits on the listener, tighter group for who can RDP at all, and a quarterly pass on service account password quality.

_Last edit: 2025-08-20_
