# MITRE ATT&CK: Case 006 (disposable / stealth infrastructure)

**Case date:** 2025-08-20

## Techniques commonly tied to this theme

| ID | Use in this pack |
|----|------------------|
| T1583.001 | Acquire infrastructure: domains |
| T1584.001 | Compromise infrastructure: domains |
| T1584.004 | Compromise infrastructure: server |
| T1584.005 | Compromise infrastructure: botnet |
| T1568 | Dynamic resolution |
| T1090 | Proxy |
| T1071.001 | Web protocols for C2 (context for TLS/SNI reviews) |

Official matrix: https://attack.mitre.org/

## Navigator stub

```json
{
  "name": "Case-006_Stealth-Infrastructure_2025-08-20",
  "techniques": [
    {"techniqueID": "T1583.001", "comment": "Disposable domains"},
    {"techniqueID": "T1584.004", "comment": "Compromised server as relay"},
    {"techniqueID": "T1568", "comment": "Fast flux / dynamic DNS"},
    {"techniqueID": "T1090", "comment": "Proxy chains"}
  ]
}
```
