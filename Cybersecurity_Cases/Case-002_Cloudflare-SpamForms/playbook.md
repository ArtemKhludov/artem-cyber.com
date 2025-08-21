# Playbook: Cloudflare response for spam form POSTs

**ID:** IR-PB-002  
**Version:** 1.1  
**Aligned to case date:** 2025-08-20  
**Owner:** Artem Khludov

## Trigger

- Spike in **POST** to `/booking` or `/calendly` paths.  
- Missing **Referer** / **Origin** vs your public site.  
- Low **cf.bot_management.score** on those POSTs.

## Phase 0: Triage (0–15 min)

1. Pull last 24–48h HTTP logs (Logpull, Logpush, or instant logs per your Cloudflare contract).  
2. Group by IP, ASN, UA, bot score.

## Phase 1: Mitigation (15–30 min)

1. **Rate limit** POST per IP (start conservative).  
2. **Custom rule:** trusted `Origin` for booking paths (replace `example.com` with your host).  
3. Enable or raise **Bot Management** on the zone or route.

## Phase 2: Human attestation

1. **Turnstile** on the page that owns the submit button.  
2. Validate token server-side if your origin terminates TLS.

## Phase 3: Tune

1. Allowlist noisy enterprise egress after FP review.  
2. Avoid geo-only blocks for revenue forms unless legal requires it.

## Further reading

- https://developers.cloudflare.com/waf/  
- https://developers.cloudflare.com/bots/  
- https://developers.cloudflare.com/turnstile/
