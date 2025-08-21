# Case 001: Intune and Autopilot as the policy control plane

**Case opened:** 2025-08-20 10:08 America/Los_Angeles (business hours)  
**Analyst:** Artem Khludov  
**Org (fictional example):** EnergyLogic AI  
**Severity:** Medium  
**Status:** Phase-one rollout closed

## Why this matters

Centralizing **Intune** profiles and **Autopilot** enrollment cuts ad-hoc laptop drift before it becomes SOC tickets. This note is **delivery**, not a malware timeline.

## Fact → consequence → action

| Fact | Consequence | Action taken |
|------|-------------|--------------|
| Profiles scoped only by static lists | Wrong cohort gets baseline | Entra ID **dynamic** groups keyed on attributes you trust |
| No pilot ring | Whole org hits ESP failures at once | Bench OOBE on one SKU, then widen |
| Compliance only in portal | Late detection | Scheduled export or automation runbook to mail or ticket on drift |
| Admin edits only in UI | Weak audit story | Graph or IaC changes with ticket ID in description |

## Timeline (local wall clock, same week compressed)

| Time / day (America/Los_Angeles) | Event |
|----------------------------------|--------|
| 2025-08-20 10:08 | Kickoff: map GPO overlap vs Intune baselines |
| 2025-08-20 14:00 | Pilot devices enrolled; Autopilot ESP validated |
| 2025-08-21 | Dynamic groups live; one attribute typo fixed same day |
| 2025-08-22 | Compliance policy + Defender onboarding path checked on pilot |
| 2025-08-25 | Read-only compliance view for IT lead |

## Scope (tightened)

- **Intune:** configuration profiles, compliance policies, security baseline per cohort.  
- **Autopilot:** deployment profile, ESP, zero-touch path for new hardware.  
- **Automation:** scheduled compliance checks (Azure Automation or equivalent), notify user and IT on noncompliance.  
- **Graph:** policy assignment and audit pull with least-privilege app registration.

## What we did not claim

- No promise of **zero** manual work.  
- No marketing line about **real-time everything** without naming your SKU and schedule limits.

## Evidence bundle

- Intune profile exports, Entra audit entries, compliance CSVs (private store, not in this public folder).

_Last edit: 2025-08-20_
