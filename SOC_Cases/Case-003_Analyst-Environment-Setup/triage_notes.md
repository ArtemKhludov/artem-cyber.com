# Case 003: Building my first SOC analysis workstation

**Case opened:** 2025-08-20 16:05 America/Los_Angeles (business hours)  
**Analyst:** Artem Khludov  
**Class:** Lab / capability build (not a malware incident)  
**Severity:** Informational  
**Status:** Done for the phase I needed before real alert work

## Why I wrote it down

I cannot triage well on the same disk I browse random email from. I needed an isolated Linux VM, packet tools, and a sane Python install so I could parse exports without fighting the OS.

## What I actually built

| Piece | Outcome |
|-------|---------|
| Python 3.9 + pip current | Scripting for quick log transforms |
| Kali VM, 4GB / 2 vCPU / 40GB | Safe place for PCAP lab and noisy tools |
| Wireshark, Nmap, tcpdump | Installed via apt; added my user to `wireshark` so daily capture did not require root shell |
| Small `edr_triage.py` helper | Reads JSON exports, flags obvious keywords and high-risk process names so I spend time on the tail, not on pretty-printing |

## Pain I hit

| Problem | Fix |
|---------|-----|
| pip weirdness on Ubuntu | `python3 -m pip install --user` pattern |
| Wireshark could not see interfaces | group membership + relogin |
| UTF-8 errors on odd exports | `encoding='utf-8'` with explicit errors policy |

## What it unlocked

Same-week alert work got faster because I stopped borrowing random laptops and I had one reproducible shell for one-off parsers.

_Last edit: 2025-08-20_
