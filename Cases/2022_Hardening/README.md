# 2022 — Infrastructure Hardening (AntHouse)

**Context.** After moving from construction into IT, I took over AntHouse infrastructure: hand-edited Nginx configs, SSH exposed on default ports, no change history.

- **Change control:** all server configs moved into version control; no more ad-hoc edits on production.
- **WAF:** ModSecurity + OWASP CRS, tuned against real traffic instead of default templates to keep false positives manageable.
- **Automation:** a Bash library for log rotation and automatic bans of aggressive scrapers.

**Result:** a predictable, reviewable setup where every production change is traceable.
