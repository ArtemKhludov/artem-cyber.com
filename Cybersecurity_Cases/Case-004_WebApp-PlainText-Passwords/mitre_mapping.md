# MITRE ATT&CK: Case 004 (plain text passwords at rest)

**Case date:** 2025-08-20

## Techniques

| ID | Role |
|----|------|
| T1552.001 | Unsecured credentials: cleartext in datastore |
| T1078 | Valid accounts risk after DB dump |
| T1110.003 | Spray / stuffing easier if dumps are plaintext |

**Note:** Confirm sub-technique IDs against the current ATT&CK matrix; parent **T1552** and subs change by release. https://attack.mitre.org/

## Navigator stub

```json
{
  "name": "Case-004_WebApp_PlainText_Passwords_2025-08-20",
  "techniques": [
    {"techniqueID": "T1552.001", "comment": "Cleartext password column"},
    {"techniqueID": "T1078", "comment": "Account takeover if DB leaked"},
    {"techniqueID": "T1110.003", "comment": "Spray enabled post-dump"}
  ]
}
```
