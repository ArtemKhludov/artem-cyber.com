# MITRE ATT&CK: Case 001 (RDP brute force)

**Case date:** 2025-08-20

## Techniques I actually tagged in the report

| ID | Note |
|----|------|
| T1110.001 | Password guessing against RDP |
| T1078 | Valid account use after guess |
| T1021.001 | RDP for remote interactive access |
| T1087.002 | Domain account discovery via `net user /domain` |
| T1021.002 | SMB admin share path attempted after foothold |

Official matrix: https://attack.mitre.org/

## Navigator stub

```json
{
  "name": "Case-001_RDP-BruteForce_2025-08-20",
  "techniques": [
    {"techniqueID": "T1110.001", "comment": "RDP guessing"},
    {"techniqueID": "T1078", "comment": "svc_backup session"},
    {"techniqueID": "T1021.001", "comment": "RDP access"},
    {"techniqueID": "T1087.002", "comment": "Domain enum"},
    {"techniqueID": "T1021.002", "comment": "SMB lateral attempt"}
  ]
}
```
