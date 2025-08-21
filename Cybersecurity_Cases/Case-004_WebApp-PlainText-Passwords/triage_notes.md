# Case 004: Web app audit — passwords stored in plain text

**Case opened:** 2025-08-20 09:15 America/Los_Angeles (business hours)  
**Analyst:** Artem Khludov  
**Org (fictional example):** EnergyLogic AI (client audit context)  
**Severity:** Critical  
**Status:** Remediated in code path; migration per client plan

## Why this matters

If the DB leaks, **every credential is readable**. No offline cracking step.

## Fact → consequence → action

| Fact | Consequence | Action taken |
|------|-------------|--------------|
| `INSERT` used raw `password` column | DB stores cleartext | Registration path switched to **bcrypt** hash before write |
| Login used string equality on stored value | Confirms cleartext read path | Login compares `bcrypt.checkpw` against `password_hash` |
| Existing rows already cleartext | Cannot “hash backward” | Add `password_hash` column, force **reset** for all users, retire old column after window |

## Timeline (local wall clock)

| Time / day (America/Los_Angeles) | Event |
|----------------------------------|--------|
| 2025-08-20 09:15 | Audit kickoff; repo access |
| Same week | Code + DB review; issue reproduced with test user |
| Same week | bcrypt in register/login; migration SQL prepared |
| Same week | Tests for hash-at-rest and negative login |

## Evidence (paths illustrative)

- `src/auth/user_service.py` — registration inserted `password` directly.  
- `src/auth/auth_service.py` — login compared plaintext.  
- SQL check: `SELECT id, username, password FROM users LIMIT 5;` showed readable values.

## MITRE

T1552.001, T1078, T1110.003. See `mitre_mapping.md`.

## Migration

1. Add `password_hash` and optional `password_reset_required` flag.  
2. Reset all passwords via user flow.  
3. Drop legacy cleartext column after the agreed cutover.

_Last edit: 2025-08-20_
