# ATT&CK note: Case 001 (Intune / Autopilot)

**Case date:** 2025-08-20

## Scope

Rollout of **endpoint policy** is preventive work. ATT&CK tactics **TA0002** and **TA0005** describe outcomes at a high level; they are **not** substitute technique IDs in Navigator.

## Honest use

| Control outcome | ATT&CK idea (high level) | What you measured |
|-----------------|-------------------------|-------------------|
| Fewer unapproved changes on disk | Execution surface reduced by policy | Compliance %, config drift count |
| Faster detection of drift | Defense evasion harder for casual tampering | Noncompliant device age in portal |

Navigator JSON with **TA####** as `techniqueID` is invalid for ATT&CK Navigator (tactics are not techniques). If you need a slide, cite **tactics in prose** or map concrete **detection analytics** to real **T####** IDs.

Official ATT&CK matrix: https://attack.mitre.org/
