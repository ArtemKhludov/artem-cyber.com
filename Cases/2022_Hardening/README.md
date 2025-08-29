# 2022 Milestone: Infrastructure Hardening (AntHouse)
Transitioning from construction to IT meant dealing with a different kind of mess. AntHouse was a "black box" of manual Nginx configs and open SSH ports.
- **Action:** Enforced version control. No more "cowboy" changes on production.
- **Security:** ModSecurity + OWASP CRS tuned for actual traffic, not just default templates.
- **Automation:** Bash library to handle log rotation and automated bans for aggressive scrapers.
It wasn't fancy, but it made the system resilient.
