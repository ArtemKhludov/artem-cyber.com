# Playbook: Stand up a personal SOC analysis VM

**ID:** LAB-PB-003  
**Version:** 1.0  
**Case anchor:** 2025-08-20  
**Owner:** Artem Khludov

## Scope

One analyst-owned lab VM. No production credentials stored on disk. Snapshots before every messy exercise.

## Build order

1. Install hypervisor you already license (I used what the org allows).  
2. Fresh Kali or Ubuntu Server + desktop if you prefer less surprise tooling.  
3. `sudo apt update && sudo apt upgrade -y`  
4. `sudo apt install -y wireshark nmap tcpdump python3-pip`  
5. Add your user to `wireshark` group, log out and back in, confirm capture on a test interface.  
6. `python3 -m pip install --user` for `jq` helpers or small internal libs your team standardizes on.

## Quality checks I run before I trust the lab

- `tcpdump -i any -c 5` returns packets on a known-good span or tap.  
- `python3 -c "import json;print('ok')"` sanity.  
- Snapshot labeled with date.

## Next capability I stacked after this

SIEM query drills (Splunk SPL first, then whatever the employer ships) and threat intel subscriptions once I had a stable shell.

## Further reading

- Your hypervisor vendor hardening guide  
- Wireshark user guide for capture permissions on Linux
