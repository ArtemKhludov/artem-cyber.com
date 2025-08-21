# Case 004: Log triage basics on a four-line sample

**Case opened:** 2025-08-21 09:40 America/Los_Angeles (business hours)  
**Analyst:** Artem Khludov  
**Class:** Lab / training slice  
**Severity:** High (synthetic chain, treated as live until ruled out)  
**Status:** Escalated to IR for host sweep same day

## What I saw

I walked a tiny JSON stream in order. Admin login from RFC1918 first: normal. Then `guest` fails from a public IP, touches `/etc/shadow`, and launches PowerShell. That sequence is not a drill pattern I ignore.

## Event table (same order as the file)

| # | Time (LA) | Signal | User | Read |
|---|-----------|--------|------|------|
| 1 | 10:05 | Successful login | admin | Internal, low drama |
| 2 | 10:10 | Failed login | guest | External IP, start paying attention |
| 3 | 10:12 | File read `/etc/shadow` | guest | Credential store access, red |
| 4 | 10:15 | Process `powershell.exe` | guest | Scripting stage, red |

## Read in one sentence

I treated `guest` as burned, assumed lateral prep, and opened a ticket for containment plus identity review on any shared creds that could pivot.

## MITRE tags I used in the handoff

T1078 valid-account abuse on `guest`, T1059 for the shell stage. I kept the mapping shallow because the sample was short; the IR ticket carried the host list.

_Last edit: 2025-08-21_
