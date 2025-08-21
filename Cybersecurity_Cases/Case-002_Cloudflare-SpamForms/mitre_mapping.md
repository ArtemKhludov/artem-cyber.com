# MITRE ATT&CK: Case 002 (Cloudflare spam forms)

**Case date:** 2025-08-20

## Chain

```
T1190        T1059.009      T1499.004
public POST  scripted use   slot / resource abuse
```

## Techniques

| ID | Role in this narrative |
|----|-------------------------|
| T1190 | Abuse of public-facing booking POST surface |
| T1059.009 | Automated client against HTTP API |
| T1499.004 | Application-layer exhaustion / calendar filling |

**Note:** T1190.001 is **not** a valid ATT&CK sub-technique id; use **T1190** only if you tag Navigator.

## Navigator stub

```json
{
  "name": "Case-002_Cloudflare_SpamForms_2025-08-20",
  "techniques": [
    {"techniqueID": "T1190", "comment": "Public booking POST abuse"},
    {"techniqueID": "T1059.009", "comment": "Automated HTTP client"},
    {"techniqueID": "T1499.004", "comment": "Resource / slot impact"}
  ]
}
```

Official ATT&CK matrix: https://attack.mitre.org/
