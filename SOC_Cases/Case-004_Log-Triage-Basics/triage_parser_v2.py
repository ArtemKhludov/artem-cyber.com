#!/usr/bin/env python3
"""
SOC triage parser v2.0 — automated pass over JSON log exports.
"""

import json
from datetime import datetime
from pathlib import Path


def load_logs(filepath: Path):
    """Load logs from JSON file with error checking."""
    try:
        with filepath.open("r", encoding="utf-8") as f:
            logs = json.load(f)
        print(f"Loaded {len(logs)} events from {filepath}\n")
        return logs
    except FileNotFoundError:
        print(f"[ERROR] File {filepath} not found!")
        return []
    except json.JSONDecodeError:
        print(f"[ERROR] File {filepath} contains invalid JSON!")
        return []


def analyze_failed_logins(log):
    if log.get("status") == "FAILED":
        return {
            "severity": "HIGH",
            "type": "Failed Login",
            "details": f"User '{log.get('user')}' from {log.get('source_ip')}",
            "timestamp": log.get("timestamp"),
        }
    return None


def analyze_powershell(log):
    process = log.get("process", "").lower()
    if "powershell" in process or "pwsh" in process:
        return {
            "severity": "CRITICAL",
            "type": "PowerShell Execution",
            "details": f"User '{log.get('user')}' executed {log.get('process')}",
            "timestamp": log.get("timestamp"),
        }
    return None


def analyze_sensitive_files(log):
    sensitive_files = ["/etc/shadow", "/etc/passwd", "SAM", "SYSTEM", ".ssh/id_rsa"]
    file_path = log.get("file", "")

    for sensitive in sensitive_files:
        if sensitive in file_path:
            return {
                "severity": "CRITICAL",
                "type": "Sensitive File Access",
                "details": f"User '{log.get('user')}' accessed {file_path}",
                "timestamp": log.get("timestamp"),
            }
    return None


def analyze_external_connections(log):
    source_ip = log.get("source_ip", "")
    if source_ip and not source_ip.startswith(("10.", "192.168.", "172.16.")):
        return {
            "severity": "MEDIUM",
            "type": "External Connection",
            "details": f"Connection from external IP: {source_ip}",
            "timestamp": log.get("timestamp"),
        }
    return None


def main() -> None:
    print("=" * 80)
    print("SOC TRIAGE PARSER v2.0")
    print("=" * 80)
    print()

    log_file = Path(__file__).resolve().parent / "logs_sample.json"
    logs = load_logs(log_file)
    if not logs:
        return

    findings = []
    for log in logs:
        checks = [
            analyze_failed_logins(log),
            analyze_powershell(log),
            analyze_sensitive_files(log),
            analyze_external_connections(log),
        ]
        for finding in checks:
            if finding:
                findings.append(finding)

    if findings:
        print(f"Found {len(findings)} suspicious events:\n")

        critical = [f for f in findings if f["severity"] == "CRITICAL"]
        high = [f for f in findings if f["severity"] == "HIGH"]
        medium = [f for f in findings if f["severity"] == "MEDIUM"]

        if critical:
            print("CRITICAL:")
            for f in critical:
                print(f"   [{f['timestamp']}] {f['type']}: {f['details']}")
            print()

        if high:
            print("HIGH:")
            for f in high:
                print(f"   [{f['timestamp']}] {f['type']}: {f['details']}")
            print()

        if medium:
            print("MEDIUM:")
            for f in medium:
                print(f"   [{f['timestamp']}] {f['type']}: {f['details']}")
            print()

        print("=" * 80)
        print("RECOMMENDATIONS:")
        print()
        if critical:
            print("1. IMMEDIATE: Isolate compromised hosts")
            print("2. Block suspicious IPs on firewall")
            print("3. Conduct forensic analysis of affected systems")
        if high:
            print("4. Within 1 hour: Reset user passwords")
            print("5. Check logs on other hosts")
        print()

    else:
        print("No suspicious events found")

    print("=" * 80)
    print(f"Analysis completed ({datetime.now().strftime('%Y-%m-%d %H:%M:%S')})")
    print("=" * 80)


if __name__ == "__main__":
    main()
