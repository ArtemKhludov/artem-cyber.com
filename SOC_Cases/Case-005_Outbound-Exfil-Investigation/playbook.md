# Playbook: Large egress from a desktop you trust too much

**ID:** IR-PB-005  
**Version:** 1.0  
**Case anchor:** 2025-08-21  
**Owner:** Artem Khludov

## Minute zero

Confirm the alert is bytes out, not mis-tuned backup agent. Pull five minutes of flow around the spike.

## Five minutes

Identify user session, parent job role, and whether MFA was satisfied for that session window. Snapshot firewall allowlist hits for the same IP last ninety days.

## Fifteen minutes

Host isolation if finance data touched and destination is non-corporate. Preserve EDR story before kill-net.

## One hour

Parallel: mail trace for phishing, AD reset path, legal/comms if customer data touched.

## Further reading

- Internal runbook for finance VLAN incidents if your org has one
