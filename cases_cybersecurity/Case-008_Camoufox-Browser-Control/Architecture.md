# Architecture: Camoufox Browser Control

> High-level structure. No paths, no credentials, no thresholds.

## Design principles

**1. One identity, one profile, one proxy**  
One agent (persona) maps to one persistent browser profile and one proxy binding. No profile pooling. No mid-session proxy swap. Reduces linkage and fingerprint collision.

**2. Human behavior at the input layer**  
Mouse: curved trajectory (Bezier), stepwise movement, micro-pauses, jitter. Typing: variable delay per key, optional typos, optional thinking pause. Submit: delay then move-then-click. Session: scenario-based (scroll, like, open card, view profile) with interval variance. No straight lines, no constant timing.

**3. Device and market diversity**  
Device profiles define OS, DPR, media template, typing/scroll/idle ranges, battery pattern. Per-market profile sets (e.g. LA vs NYC) so the same "device" doesn’t appear in multiple regions. behavior_config on the agent overrides profile defaults where needed.

**4. Fingerprint and API spoofing in-page**  
WebGL vendor/renderer, Battery API (level, discharge, charge windows), DPR, media device labels — all set via init scripts. Route interception can block image/media/font where not required. No real hardware exposure.

**5. Verification before trust**  
Fingerprint stability runs, stealth checks (single/multi), browser traffic audit, Echelon 2 (OS/DPR/battery/media). Activity events (navigation, form submit, idle) logged and summarised. No “it should be fine” — run the checks and read the reports.

## Component roles

| Layer | Role |
|-------|------|
| Agent / Persona | Logical identity; holds behavior_config and optional device_profile_id |
| Device profiles | OS, DPR, media index, typing/scroll/like/idle ranges, battery type, charge pattern; per market |
| behavior_config | Overrides: browser_os, battery, device_profile_id, and any range overrides |
| Browser factory | Creates Camoufox context: profile dir, proxy, init scripts (WebGL, battery, media, interception) |
| Mouse | Bezier trajectory, steps, micro-pauses, jitter; move-then-click for every click |
| Typing | human_type: delay range, typo rate, thinking pause; config from profile or behavior_config |
| Submit | Pause → human_move to submit button → click |
| Session behavior | Scenario choice (scroll/like/open_card/view_profile/idle); interval variance; platform selectors |
| Verification | Fingerprint stability, stealth, traffic audit, Echelon 2, activity snapshot |

## Data flow (conceptual)

1. Agent + device profile + behavior_config → factory builds context (profile path, proxy, init scripts).
2. Page loads; init scripts set WebGL, battery, media, DPR.
3. Every user action: human_move (Bezier) → optional human_type (delays, typos) → move to submit → click.
4. Idle/session: pick scenario, run scroll/like/open_card/view_profile with randomised intervals.
5. Verification scripts and activity logs feed reports; alerts from report age and content.

## Security and isolation

- Profile directory and lock (e.g. Redis) ensure one writer per profile.
- No profile or proxy sharing between agents.
- No credentials or secrets in case docs; implementation stays in the repo and config.

---

*"Structure beats ad-hoc. Verify beats assume."*
