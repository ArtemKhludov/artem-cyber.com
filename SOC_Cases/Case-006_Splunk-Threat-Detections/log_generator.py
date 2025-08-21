#!/usr/bin/env python3
"""log_generator.py

Small helper to generate a repeatable mixed dataset for Splunk testing.

- Output format: JSON Lines (one JSON object per line)
- Synthetic sources modeled after:
  - Windows Security (4625/4624 + optional 4728/4732)
  - WAF/Web access logs (login abuse + scanning noise)

This is intentionally dependency-free (stdlib only).
"""

from __future__ import annotations

import argparse
import json
import random
from collections import Counter, defaultdict
from dataclasses import dataclass
from datetime import datetime, timedelta, timezone
from typing import Dict, Iterable, List, Tuple


@dataclass(frozen=True)
class GenConfig:
    out: str
    seed: int
    windows_events: int
    waf_events: int
    start: datetime


def _iso(ts: datetime) -> str:
    return ts.astimezone(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")


def _rand_ip(rng: random.Random, public: bool = True) -> str:
    if not public:
        return f"10.{rng.randint(0, 255)}.{rng.randint(0, 255)}.{rng.randint(1, 254)}"

    # simple pool of public-looking IPs
    pools = [
        (45, 0, 255),
        (62, 0, 255),
        (80, 0, 255),
        (103, 0, 255),
        (146, 0, 255),
        (185, 0, 255),
    ]
    a, bmin, bmax = rng.choice(pools)
    return f"{a}.{rng.randint(bmin, bmax)}.{rng.randint(0, 255)}.{rng.randint(1, 254)}"


def generate_windows_events(cfg: GenConfig, rng: random.Random) -> List[Dict]:
    """Generate Windows Security-like events.

    Fields chosen to match the SPL in detections_spl.md:
    - index, sourcetype, EventCode, user, src_ip, host, _time
    """

    host = "WIN-DC01"

    target_users = ["j.doe", "a.smith", "finance", "support", "admin"]
    attacker_ips = [
        _rand_ip(rng, public=True),
        _rand_ip(rng, public=True),
    ]
    benign_ips = [
        _rand_ip(rng, public=False),
        _rand_ip(rng, public=False),
    ]

    events: List[Dict] = []
    t = cfg.start

    # Build a story:
    # - spray failures from attacker_ip[0] against many users
    # - brute force on one user from attacker_ip[1]
    # - eventual success after failures (4624)

    fail_reason = "Unknown user name or bad password"

    # Spray burst
    spray_attempts = max(10, cfg.windows_events // 3)
    for i in range(spray_attempts):
        user = rng.choice(target_users)
        ip = attacker_ips[0]
        events.append(
            {
                "_time": _iso(t + timedelta(seconds=30 * i)),
                "index": "win",
                "sourcetype": "WinEventLog:Security",
                "EventCode": 4625,
                "user": user,
                "src_ip": ip,
                "host": host,
                "FailureReason": fail_reason,
            }
        )

    # Brute force a single user
    brute_user = "j.doe"
    brute_attempts = max(12, cfg.windows_events // 3)
    base = t + timedelta(minutes=10)
    for i in range(brute_attempts):
        events.append(
            {
                "_time": _iso(base + timedelta(seconds=20 * i)),
                "index": "win",
                "sourcetype": "WinEventLog:Security",
                "EventCode": 4625,
                "user": brute_user,
                "src_ip": attacker_ips[1],
                "host": host,
                "FailureReason": fail_reason,
            }
        )

    # Success after failures
    events.append(
        {
            "_time": _iso(base + timedelta(minutes=6)),
            "index": "win",
            "sourcetype": "WinEventLog:Security",
            "EventCode": 4624,
            "user": brute_user,
            "src_ip": attacker_ips[1],
            "host": host,
            "LogonType": 3,
        }
    )

    # Optional admin group change (one event)
    events.append(
        {
            "_time": _iso(base + timedelta(minutes=12)),
            "index": "win",
            "sourcetype": "WinEventLog:Security",
            "EventCode": 4728,
            "user": brute_user,
            "src_ip": attacker_ips[1],
            "host": host,
            "Group": "Domain Admins",
            "Action": "AddedMember",
        }
    )

    # Add some benign successes/fails to reduce “toy” feel
    remaining = max(0, cfg.windows_events - len(events))
    benign_base = t + timedelta(minutes=30)
    for i in range(remaining):
        code = rng.choices([4624, 4625], weights=[0.75, 0.25], k=1)[0]
        user = rng.choice(["svc_backup", "it.admin", "helpdesk", "a.smith"])
        ip = rng.choice(benign_ips)
        ev = {
            "_time": _iso(benign_base + timedelta(seconds=45 * i)),
            "index": "win",
            "sourcetype": "WinEventLog:Security",
            "EventCode": code,
            "user": user,
            "src_ip": ip,
            "host": host,
        }
        if code == 4625:
            ev["FailureReason"] = "Account locked out" if rng.random() < 0.1 else fail_reason
        events.append(ev)

    return events


def generate_waf_events(cfg: GenConfig, rng: random.Random, attacker_ips: List[str]) -> List[Dict]:
    """Generate WAF/Web access-like events.

    Fields chosen to match the SPL in detections_spl.md:
    - index, sourcetype, src_ip, uri_path, status, user_agent, _time
    """

    user_agents_attack = [
        "python-requests/2.31",
        "curl/8.4.0",
        "Go-http-client/1.1",
        "Mozilla/5.0 (compatible; credential-stuffer/1.0)",
    ]

    user_agents_benign = [
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 14_6) AppleWebKit/537.36 Chrome/120.0",
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/121.0",
        "Mozilla/5.0 (iPhone; CPU iPhone OS 17_2 like Mac OS X) AppleWebKit/605.1.15 Mobile",
    ]

    endpoints = ["/", "/login", "/signin", "/auth", "/api/v1/login", "/admin", "/robots.txt", "/.env"]

    events: List[Dict] = []
    t = cfg.start

    # Attack: a lot of /login failures from attacker_ips[0]
    attacker = attacker_ips[0]
    attack_count = max(30, cfg.waf_events // 2)
    for i in range(attack_count):
        status = rng.choices([401, 403, 429], weights=[0.6, 0.35, 0.05], k=1)[0]
        events.append(
            {
                "_time": _iso(t + timedelta(seconds=10 * i)),
                "index": "waf",
                "sourcetype": "waf:access",
                "src_ip": attacker,
                "http_method": "POST",
                "uri_path": "/login",
                "status": status,
                "user_agent": rng.choice(user_agents_attack),
            }
        )

    # Attack: scanning noise from attacker_ips[1]
    attacker2 = attacker_ips[1]
    scan_count = max(25, cfg.waf_events // 3)
    base = t + timedelta(minutes=8)
    for i in range(scan_count):
        uri = rng.choice(endpoints)
        status = rng.choices([404, 403, 401, 500], weights=[0.55, 0.25, 0.15, 0.05], k=1)[0]
        events.append(
            {
                "_time": _iso(base + timedelta(seconds=12 * i)),
                "index": "waf",
                "sourcetype": "waf:access",
                "src_ip": attacker2,
                "http_method": rng.choice(["GET", "POST"]),
                "uri_path": uri,
                "status": status,
                "user_agent": rng.choice(user_agents_attack),
            }
        )

    # Benign traffic
    remaining = max(0, cfg.waf_events - len(events))
    benign_base = t + timedelta(minutes=25)
    for i in range(remaining):
        ip = _rand_ip(rng, public=False)
        uri = rng.choice(["/", "/login", "/pricing", "/docs", "/account"])
        status = rng.choices([200, 302, 401], weights=[0.88, 0.08, 0.04], k=1)[0]
        events.append(
            {
                "_time": _iso(benign_base + timedelta(seconds=18 * i)),
                "index": "waf",
                "sourcetype": "waf:access",
                "src_ip": ip,
                "http_method": rng.choice(["GET", "POST"]),
                "uri_path": uri,
                "status": status,
                "user_agent": rng.choice(user_agents_benign),
            }
        )

    return events


def write_jsonl(path: str, events: Iterable[Dict]) -> None:
    with open(path, "w", encoding="utf-8") as f:
        for ev in events:
            f.write(json.dumps(ev, ensure_ascii=False) + "\n")


def load_jsonl(path: str) -> List[Dict]:
    out: List[Dict] = []
    with open(path, "r", encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if not line:
                continue
            out.append(json.loads(line))
    return out


def print_summary(events: List[Dict]) -> None:
    by_sourcetype = Counter(ev.get("sourcetype", "unknown") for ev in events)
    by_index = Counter(ev.get("index", "unknown") for ev in events)

    print("=" * 72)
    print("SAMPLE DATASET SUMMARY")
    print("=" * 72)
    print(f"Total events: {len(events)}")
    print(f"By index: {dict(by_index)}")
    print(f"By sourcetype: {dict(by_sourcetype)}")

    win_codes = Counter(ev.get("EventCode") for ev in events if ev.get("index") == "win")
    waf_status = Counter(ev.get("status") for ev in events if ev.get("index") == "waf")

    if win_codes:
        print(f"Windows EventCodes: {dict(win_codes)}")
    if waf_status:
        print(f"WAF status codes: {dict(waf_status)}")

    top_ips = Counter(ev.get("src_ip") for ev in events if ev.get("src_ip"))
    print("Top src_ip:")
    for ip, c in top_ips.most_common(5):
        print(f"  - {ip}: {c}")

    # Quick check: are there IPs that appear in both sources?
    win_ips = {ev.get("src_ip") for ev in events if ev.get("index") == "win" and ev.get("src_ip")}
    waf_ips = {ev.get("src_ip") for ev in events if ev.get("index") == "waf" and ev.get("src_ip")}
    overlap = sorted(win_ips.intersection(waf_ips))
    print(f"IPs seen in BOTH win and waf: {len(overlap)}")
    if overlap:
        print("  (expected for correlation test)")
        for ip in overlap[:5]:
            print(f"  - {ip}")

    print("=" * 72)


def parse_args() -> GenConfig:
    p = argparse.ArgumentParser(description="Generate sample Windows + WAF JSONL events for Splunk testing")
    p.add_argument("--out", default="sample_events.jsonl", help="Output JSONL path")
    p.add_argument("--seed", type=int, default=1337, help="Random seed")
    p.add_argument("--windows-events", type=int, default=80, help="Number of Windows events")
    p.add_argument("--waf-events", type=int, default=120, help="Number of WAF events")
    p.add_argument(
        "--start",
        default="2025-08-21T16:00:00Z",
        help="Start timestamp (UTC) in ISO format, e.g. 2025-08-21T16:00:00Z",
    )

    args = p.parse_args()

    start = datetime.strptime(args.start, "%Y-%m-%dT%H:%M:%SZ").replace(tzinfo=timezone.utc)
    return GenConfig(
        out=args.out,
        seed=args.seed,
        windows_events=max(10, args.windows_events),
        waf_events=max(10, args.waf_events),
        start=start,
    )


def main() -> None:
    cfg = parse_args()
    rng = random.Random(cfg.seed)

    # Ensure correlation works: reuse the same attacker IPs across win and waf
    attacker_ips = [_rand_ip(rng, public=True), _rand_ip(rng, public=True)]

    windows = generate_windows_events(cfg, rng)

    # overwrite windows attacker IPs with our chosen ones to guarantee overlap
    # (this keeps the dataset deterministic and correlation-friendly)
    for ev in windows:
        if ev.get("index") == "win" and ev.get("src_ip") and ev.get("src_ip").startswith(("45.", "62.", "80.", "103.", "146.", "185.")):
            # map any public-looking IP to one of our two attackers
            ev["src_ip"] = rng.choice(attacker_ips)

    waf = generate_waf_events(cfg, rng, attacker_ips=attacker_ips)

    events = windows + waf
    # Shuffle so it looks like a real mixed stream
    rng.shuffle(events)

    write_jsonl(cfg.out, events)
    loaded = load_jsonl(cfg.out)
    print(f"Wrote {len(loaded)} events to {cfg.out}")
    print_summary(loaded)


if __name__ == "__main__":
    main()
