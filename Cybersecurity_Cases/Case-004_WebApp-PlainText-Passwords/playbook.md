# Playbook: Audit web auth for password-at-rest failures

**ID:** SA-PB-004  
**Version:** 1.1  
**Aligned to case date:** 2025-08-20  
**Owner:** Artem Khludov

## Phase 0: Triage

1. Grep for `INSERT`/`UPDATE` touching `password` without hash helpers.  
2. Confirm imports: expect `bcrypt`, `argon2`, or framework password APIs; absence is a red flag.  
3. Read a **sample row** from the user table in a safe copy of the DB (direct `SELECT` in a controlled environment).

## Phase 1: Reproduce

1. Register a **throwaway** user in non-prod.  
2. Inspect stored value. If it matches the typed password byte-for-byte, stop and treat as incident-class finding.

## Phase 2: Fix register path

1. Hash with **bcrypt** (example: `gensalt(rounds=12)`).  
2. Store only the agreed hash column name (e.g. `password_hash`).

## Phase 3: Fix login path

1. `SELECT` hash only.  
2. `bcrypt.checkpw(plaintext, stored_hash)`.

## Phase 4: Migration

1. Add new column; never “hash” existing cleartext in place without user reset (force reset).  
2. Communicate reset campaign; monitor support load.

## Phase 5: Verify

1. Unit tests: hash format, successful login, failed login.  
2. Static scan for Python: **Bandit** or equivalent in CI.

## Further reading

- OWASP password storage cheat sheet  
- NIST SP 800-63B (pick controls that match your jurisdiction)
