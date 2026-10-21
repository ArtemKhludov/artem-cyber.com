# 2024 — Zero Trust Architecture (Los Angeles)

**Context.** Relocating to Los Angeles meant rebuilding my own infrastructure without a traditional VPN.

- **Stack:** Cloudflare Zero Trust + Oracle Cloud Infrastructure (OCI).
- **Design:** identity-based access through Cloudflare tunnels; workloads isolated with NSGs in separate OCI compartments; no services exposed directly to the internet.
- **Result:** a perimeter that needs little manual maintenance. Notes: [Archive/2024/architecture](../../Archive/2024/architecture/).
