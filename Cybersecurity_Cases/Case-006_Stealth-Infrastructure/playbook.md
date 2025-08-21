# Playbook: Stealth / disposable infrastructure review

**ID:** SA-PB-006  
**Version:** 1.0  
**Aligned to case date:** 2025-08-20  
**Owner:** Artem Khludov

## Phase 0: Inventory signals

1. Confirm feeds: DNS resolver logs, proxy or firewall TLS SNI, NetFlow where available, cloud audit (Route53, Azure DNS, Cloud DNS), certificate transparency subscriptions.  
2. List “trusted” third-party domains that often mask callbacks (CDNs, update mirrors); segment them so alerts still fire on anomalous paths.

## Phase 1: Domain age and reputation

1. Join egress FQDN with age and registrar reputation (commercial intel or OSINT APIs).  
2. Shortlist FQDN first seen <30 days with sustained internal hits.  
3. Manual review: landing page, MX, NS delegation changes in the last week.

## Phase 2: Hosting and ASN

1. Map external IPs to ASN and geolocation; flag ASNs with high abuse noise only when paired with rare internal source or service account.  
2. Check passive DNS history for the IP: rapid rotation of names is a signal.

## Phase 3: Proxy and tunnel patterns

1. Hunt rare combinations of destination port + process + user (e.g. browser to non-443 high ports).  
2. For approved proxies, ensure logging policy matches investigation needs without breaking legal boundary.

## Phase 4: Cloud control plane

1. Alert on domain registration APIs, DNS zone creation, global forwarding rules, and anonymous public endpoints.  
2. Require human approval or break-glass role for production-adjacent DNS changes.

## Phase 5: Response

1. Block at proxy/DNS after confirmation; preserve PCAP or flow samples if retention allows.  
2. Rotate secrets for any host that resolved or connected to confirmed malicious infra.  
3. Add IOCs to blocklist and to SIEM correlation for lateral follow-up.

## Further reading

- MITRE ATT&CK: Resource Development, Command and Control (see `mitre_mapping.md`)  
- NCSC / CISA guidance on DNS and logging for enterprise (pick editions that match your jurisdiction)
