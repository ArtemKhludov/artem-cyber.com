# Playbook: Intune + Autopilot phase-one rollout

**ID:** ENG-PB-001  
**Version:** 1.1  
**Aligned to case date:** 2025-08-20  
**Owner:** Artem Khludov

## Preconditions

- Entra ID SKU supports **dynamic groups** if you use them.  
- Autopilot device registration or partner hash for new hardware.  
- Break-glass cloud admins exist and are monitored.

## Phase 0: Inventory

1. List policies still owned by **GPO** vs **Intune**; pick one owner for conflicts.  
2. Choose pilot ring size and exit criteria (enrollment %, Defender onboard %).

## Phase 1: Profiles

1. Enrollment Status Page matches your VPN and identity reality.  
2. One **security baseline** tier for pilot.  
3. **Compliance policy** with actions you will actually enforce.

## Phase 2: Autopilot

1. Assign deployment profile to pilot device group.  
2. Full OOBE on bench hardware; fix Wi-Fi or cert before fleet.

## Phase 3: Dynamic groups

1. Validate attribute source (HR vs manual).  
2. Add **exclusion** groups for lab and loaner hardware.

## Phase 4: Automation

1. Schedule compliance query (Graph or export).  
2. Route failures to ticket queue with device id and last sync time.

## Phase 5: Handoff

1. Service desk: Company Portal sync, re-enroll, wipe decision tree.  
2. Security: review Graph app roles used by automation.

## Further reading

- Microsoft Learn: Intune enrollment, Windows Autopilot, Microsoft Graph device management (your tenant generation).
