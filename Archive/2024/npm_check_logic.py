# Prototype: OSV Ingestion for npm_check
import requests

def fetch_advisory(package_name):
    url = f"https://api.osv.dev/v1/query"
    # Simplified query logic
    return requests.post(url, json={"package": {"name": package_name, "ecosystem": "npm"}}).json()

if __name__ == "__main__":
    print(fetch_advisory("lodash"))
