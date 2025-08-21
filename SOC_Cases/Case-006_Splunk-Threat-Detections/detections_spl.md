# Splunk SPL detections (Windows auth + WAF login abuse)

**Assumptions**
- Windows events: `index=win sourcetype=WinEventLog:Security`
- WAF/Web events: `index=waf sourcetype=waf:access`
- Normalized fields used below:
  - Windows: `EventCode`, `user`, `src_ip`, `host`
  - WAF: `src_ip`, `uri_path`, `status`, `user_agent`

---

## 1) Windows: Failed logins burst (4625)
**Goal:** detect brute force against a single user or a host.

**SPL**
```spl
index=win sourcetype=WinEventLog:Security EventCode=4625
| stats count AS failed_logins dc(src_ip) AS unique_ips values(src_ip) AS src_ips by user, host
| where failed_logins >= 10
| sort - failed_logins
```

**Tuning ideas**
- Exclude known scanners / VPN egress via lookup allowlist.
- Raise threshold for noisy hosts.

---

## 2) Windows: Password spraying (many users from one IP)
**Goal:** one IP trying many usernames (spray).

**SPL**
```spl
index=win sourcetype=WinEventLog:Security EventCode=4625
| stats count AS failed_logins dc(user) AS users_tried values(user) AS users by src_ip
| where users_tried >= 6 AND failed_logins >= 12
| sort - users_tried
```

**Tuning ideas**
- Add `by src_ip, host` if you want per-host context.

---

## 3) Windows: Success after failures (4624 after 4625)
**Goal:** catch “eventually got in” patterns.

**SPL**
```spl
index=win sourcetype=WinEventLog:Security (EventCode=4624 OR EventCode=4625)
| eval outcome=if(EventCode=4624,"success","fail")
| stats count(eval(outcome="fail")) AS fails
        count(eval(outcome="success")) AS successes
        min(_time) AS first_seen
        max(_time) AS last_seen
        values(src_ip) AS src_ips
  by user
| where fails >= 5 AND successes >= 1
| convert ctime(first_seen) ctime(last_seen)
| sort -fails
```

**Tuning ideas**
- Add a time window with `earliest=-30m`.
- Exclude service accounts.

---

## 4) Windows: New admin group membership (4728 / 4732)
**Goal:** privilege escalation indicator.

**SPL**
```spl
index=win sourcetype=WinEventLog:Security (EventCode=4728 OR EventCode=4732)
| stats count values(host) AS hosts values(src_ip) AS src_ips by user
| sort -count
```

**Tuning ideas**
- Whitelist known IT admin change windows.

---

## 5) WAF: Credential stuffing / login abuse (high 401/403 on login)
**Goal:** spot login endpoint attacks.

**SPL**
```spl
index=waf sourcetype=waf:access uri_path="/login"
| stats count AS total
        count(eval(status=401 OR status=403)) AS auth_fails
        values(user_agent) AS user_agents
  by src_ip
| eval fail_ratio=round(auth_fails/total,2)
| where total >= 20 AND fail_ratio >= 0.7
| sort -auth_fails
```

**Tuning ideas**
- Filter health checks/bots by UA lookup.
- Add `uri_path IN ("/login","/auth","/signin")` if needed.

---

## 6) WAF: High error-rate by IP (4xx/5xx)
**Goal:** noisy attacker scanning endpoints.

**SPL**
```spl
index=waf sourcetype=waf:access
| stats count AS total
        count(eval(status>=400)) AS errors
        dc(uri_path) AS unique_paths
  by src_ip
| eval error_ratio=round(errors/total,2)
| where total >= 50 AND error_ratio >= 0.6
| sort -errors
```

**Tuning ideas**
- Separate 404 scanning vs auth endpoints.

---

## 7) Correlation: Same IP hits WAF login + Windows failures
**Goal:** tie web attack to Windows auth activity.

**SPL (join-like pattern using a time window)**
```spl
(
  search index=waf sourcetype=waf:access uri_path="/login" (status=401 OR status=403)
  | stats count AS waf_auth_fails by src_ip
  | where waf_auth_fails >= 15
)
| join type=inner src_ip [
    search index=win sourcetype=WinEventLog:Security EventCode=4625
    | stats count AS win_fails dc(user) AS users_tried by src_ip
    | where win_fails >= 10
  ]
| eval severity=case(waf_auth_fails>=50 AND win_fails>=30,"high", waf_auth_fails>=15 AND win_fails>=10,"medium", true(),"low")
| sort -waf_auth_fails
```

**Tuning ideas**
- Prefer `stats` + `lookup` correlation in production instead of heavy `join`.
- Add `earliest=-30m latest=now` around both searches.
