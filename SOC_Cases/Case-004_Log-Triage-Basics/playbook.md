# Playbook: Triage a micro JSON log export

**ID:** LAB-PB-004  
**Version:** 1.0  
**Case anchor:** 2025-08-21  
**Owner:** Artem Khludov

## Step 0

Hash and store the raw file before you touch it. Open in a viewer that does not execute anything.

## Step 1 — Sort and read in time order

If timestamps are ISO, sort ascending. I read top to bottom once for story, second pass for IOC extraction.

## Step 2 — Tag each line

I mark: auth, file, process, network. Anything that hits password stores or script hosts from a low-trust account goes straight to escalate.

## Step 3 — Automate the boring pass

I keep a tiny Python helper in this folder (`triage_parser_v2.py`) that replays the same heuristics so I do not miss a failed login in a longer file.

## Step 4 — Handoff payload

I send: timeline slice, IPs, users, file paths, process names, and what I already blocked or asked netops to block.

## Further reading

- Your EDR vendor’s field dictionary for the same event types
