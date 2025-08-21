# Playbook: Post-phishing hardening

**ID:** SA-PB-005  
**Version:** 1.0  
**Aligned to case date:** 2025-08-20  
**Owner:** Artem Khludov

Commands and SPL below are **working examples**; validate syntax, indexes, and field names in your tenant before production use.

## Phase 1: Email gateway

1. Tighten Proofpoint-class rules (example policy shape): block suspicious TLDs; quarantine external links; external banner; URL reputation; sandbox risky attachment types.  
2. Test with **consented** internal phish samples; target outcome is full block or quarantine on the test set.

## Phase 2: MFA

1. Pilot IT + Finance (~20 users), training, then bulk (~180) over 3 days.  
2. Helpdesk runbook before scale.  
3. Example PowerShell (verify against your AD / Entra reality before paste):

```powershell
Set-ADGroup -Identity "VPN_Users" -Add @{msDS-MFARequired="TRUE"}
Get-MsolUser -All | Where {$_.StrongAuthenticationMethods -ne $null} | Select UserPrincipalName
```

## Phase 3: DLP / egress alerting (Splunk)

```spl
index=firewall action=allowed 
| stats sum(bytes_out) as total_bytes by src_ip, dest_ip, user
| where total_bytes > 52428800  
| eval total_mb=round(total_bytes/1048576,2)
| where total_mb > 50
| table _time, src_ip, user, dest_ip, total_mb
| sendalert priority=high
```

Tune whitelist for OneDrive/Dropbox and other approved bulk egress.

## Phase 4: Web / DNS filtering (Umbrella via GPO)

Use your real Umbrella org values; do not paste OrgID examples from write-ups.

```bash
reg add "HKLM\SOFTWARE\OpenDNS\Umbrella" /v OrgID /t REG_SZ /d "<YOUR_ORG_ID>" /f
reg add "HKLM\SOFTWARE\OpenDNS\Umbrella" /v UserID /t REG_SZ /d "<USER_IDENTIFIER>" /f
```

## Phase 5: SIEM content (Splunk)

**Outbound volume to non-US:**

```spl
index=firewall dest_ip!="10.*" dest_ip!="192.168.*" 
| stats sum(bytes_out) as total by src_ip, dest_country
| where total > 104857600 AND dest_country!="US"
| eval total_mb=round(total/1048576,2)
```

**Failed logins then success:**

```spl
index=windows EventCode=4625 OR EventCode=4624
| transaction user maxspan=10m
| where eventcount > 3
| search EventCode=4624
```

**VPN geo anomaly:**

```spl
index=vpn action=connected
| iplocation src_ip
| where Country!="United States"
```

Historical replay on these rules surfaced the same incident class roughly **22 minutes** earlier than prior visibility in this engagement.

## Phase 6: Training

KnowBe4 org-wide; finance deep-dive on BEC, invoice fraud, wire verification. Track click rate before/after.

## Phase 7: VPN geo policy (ASA example)

```bash
access-list VPN_GEO extended permit ip object-group ALLOWED_COUNTRIES any
access-list VPN_GEO extended deny ip any any log

object-group network ALLOWED_COUNTRIES
 network-object geoip US
 network-object geoip CA
```

Travel: ticket + temporary country allow.

## Phase 8: Validate

External pen test; fix findings (guest WiFi in this cycle).

## Next steps

**Short-term:** EDR pilot (CrowdStrike target December); DMARC/DKIM/SPF; quarterly simulations.  
**Long-term:** Zero Trust design; SOAR eval; threat hunting program.
