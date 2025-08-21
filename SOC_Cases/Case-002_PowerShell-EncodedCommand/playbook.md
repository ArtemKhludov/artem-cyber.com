# Playbook: Encoded PowerShell with Office parent

**ID:** IR-PB-002  
**Version:** 1.1  
**Case anchor:** 2025-08-20  
**Owner:** Artem Khludov

## Trigger

4688 (or EDR equivalent): `powershell.exe` where command line matches `(?i)-enc|-encodedcommand` and parent image ends with `WINWORD.EXE`, `EXCEL.EXE`, `POWERPNT.EXE`, or `OUTLOOK.EXE`.

## First five minutes

1. Confirm process tree and user session on the host.  
2. Isolate from corp network if any unknown egress still shows `ESTABLISHED`.  
3. Block staging IP at firewall while you read mail logs for blast radius.

## Decode on a safe machine

Take the base64 payload out of the alert JSON, decode as Unicode (`-enc` style), never on the patient host if policy forbids it.

## Eradication

- Kill the child PowerShell tree after evidence snapshot.  
- Quarantine the doc on share + mailbox if still present.  
- Full disk threat scan, then re-check Run keys and scheduled tasks for that user profile.

## Recovery

Password reset for the impacted account, rejoin VLAN only after sign-off from endpoint owner, 24h heightened monitoring on that asset.

## Detection artifact

Splunk-oriented rule body: `detection_rule.yaml` in this folder.

## Further reading

- Microsoft guidance on PowerShell logging and constrained language  
- Vendor docs for your EDR’s Office → PowerShell correlation
