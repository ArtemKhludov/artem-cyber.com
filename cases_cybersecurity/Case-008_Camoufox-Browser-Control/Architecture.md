# Architecture: Camoufox Browser Control

> High-level structure. No paths, no credentials, no thresholds.

## Design principles

**1. Holy Trinity: one identity, one profile, one proxy**  
One agent (persona) maps to one persistent browser profile and one proxy binding. Profile and data under a single mount hierarchy (profiles, sessions, downloads, data) keyed by persona. Redis lock: only one browser context per persona at a time (TTL 300 s). No profile pooling. No mid-session proxy swap. Reduces linkage and fingerprint collision.

**2. Human behavior at the input layer**  
Mouse: curved trajectory (Bezier), stepwise movement, micro-pauses, jitter. Typing: variable delay per key, optional typos, optional thinking pause. Submit: delay then move-then-click. Session: scenario-based (scroll, like, open card, view profile) with interval variance. No straight lines, no constant timing.

**3. Double Entropy (two levels)**  
(1) Session: base delay plus 5–15 s jitter between actions. (2) Orchestration: tasks only in allowed schedule windows; step gaps use base delay + variance; schedule boundaries jitter so the fleet does not act in lockstep. One task per persona per cycle. Prevents synchronized bot waves.

**4. Device and market diversity**  
Device profiles define OS, DPR, media template, typing/scroll/idle ranges, battery pattern. Per-market profile sets (e.g. LA vs NYC) so the same "device" doesn’t appear in multiple regions. behavior_config on the agent overrides profile defaults where needed.

**5. Three layers (browser stack)**  
Layer 1 — Infrastructure: headful when DISPLAY set; fonts match Windows glyph metrics. Layer 2 — Hardware spoofing: WebGL, Battery, DPR, media, WebRTC (192.168.1.x per persona); route interception. Layer 3 — Cold start: warmup on neutral sites before active; no blank-profile runs.

**6. Fingerprint and API spoofing in-page**  
WebGL vendor/renderer, Battery API, DPR, media labels, WebRTC — all via init scripts. No real hardware exposure.

**7. Verification before trust**  
Fingerprint stability runs, stealth checks (single/multi), browser traffic audit, Echelon 2 (OS/DPR/battery/media). Activity events (navigation, form submit, idle) logged and summarised. No “it should be fine” — run the checks and read the reports.

**8. Double echelon (security)**  
(1) AI/content safety: dedicated layer for external/AI content; browser is not that layer. (2) Infra: secrets not in repo or image; browser and sandbox get no DB/Redis/Vault. Optional Phase 4: secrets from files. Sandbox env whitelist.

## Component roles

| Layer | Role |
|-------|------|
| Orchestrator | Schedule windows (work/content/sleep); Double Entropy step gaps; one task per persona per cycle |
| Agent / Persona | Logical identity; schedule_config, behavior_config, optional device_profile_id |
| Mount + Lock | Profile dir per persona; Redis lock (one browser context per persona, TTL 300 s) |
| Device profiles | OS, DPR, media index, typing/scroll/like/idle ranges, battery type, charge pattern; per market |
| behavior_config | Overrides: browser_os, battery, device_profile_id, timeline/entropy params, range overrides |
| Browser factory | Creates Camoufox context: profile dir, proxy, init scripts (Layer 1–2) |
| Mouse | Bezier trajectory, steps, micro-pauses, jitter; move-then-click for every click |
| Typing | human_type: delay range, typo rate, thinking pause; config from profile or behavior_config |
| Submit | Pause → human_move to submit button → click |
| Session behavior | Scenario choice (scroll/like/open_card/view_profile/idle); Double Entropy interval variance |
| Warmup (Layer 3) | Before active: neutral sites, human scroll/pauses, cookies in profile |
| Verification | Fingerprint stability, stealth, traffic audit, Echelon 2, activity snapshot |

## Data flow (conceptual)

1. Orchestrator: schedule windows + Double Entropy → push one task per persona per cycle.
2. Agent + device profile + behavior_config → factory builds context (profile path, proxy, init scripts). Acquire Redis lock for persona.
3. Page loads; init scripts set WebGL, battery, media, DPR, WebRTC (Layer 2).
4. Every user action: human_move (Bezier) → optional human_type (delays, typos) → move to submit → click.
5. Idle/session: pick scenario, run scroll/like/open_card/view_profile with Double Entropy interval variance.
6. New agents: warmup (Layer 3) before status → active.
7. Verification scripts and activity logs feed reports; alerts from report age and content.

## Security and isolation

- **Mount + lock:** profile directory per persona; Redis lock ensures one browser context per persona at a time.
- No profile or proxy sharing between agents.
- **Double echelon:** browser and sandbox get no DB/Redis/Vault; secrets not in repo or image. Optional Phase 4: secrets from files.
- No credentials or secrets in case docs; implementation stays in the repo and config.

---

*"Structure beats ad-hoc. Verify beats assume."*
