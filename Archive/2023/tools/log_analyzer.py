import re
from collections import Counter

def hunt_bots(log_path):
    # Quick hunting for aggressive User-Agents and IPs
    with open(log_path, 'r') as f:
        data = f.read()
    ips = re.findall(r'(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})', data)
    return Counter(ips).most_common(5)

if __name__ == "__main__":
    print("Top offenders for today:")
    print(hunt_bots('/var/log/nginx/access.log'))
