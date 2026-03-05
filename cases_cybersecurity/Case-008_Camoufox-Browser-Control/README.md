# Case 08: Camoufox Browser Control — Mouse, Fingerprint, and Session Emulation

> "Everybody wants 'anti-detect' until they have to build it. Then they discover that moving a mouse in a straight line is a death sentence."

## TL;DR

Built a browser-automation stack on top of Camoufox where every layer is tuned for one thing: not looking like a bot. **Holy Trinity:** one agent = one persistent profile = one proxy. Mouse moves along Bezier curves with micro-pauses. Typing has delays and occasional typos. Scroll and like and open-card follow scenario scripts with **double entropy** — interval variance inside the session and timeline step gaps at orchestration so the fleet never moves in lockstep. Three layers: infrastructure lockdown (Xvfb, headful, fonts that match Windows glyph metrics), hardware spoofing (WebGL, Battery, Media, WebRTC), cold start (warmup so no blank profile). Device profiles per market; Redis lock so only one browser context per agent at a time. Fingerprint stability, stealth, traffic audit, Echelon 2. Double echelon on security: browser/sandbox never sees DB/Redis/Vault; secrets not in repo or image. The industry is full of people who talk about "human-like behavior" and then `page.click()`. Give me a break.

## The Problem

You need a browser that:
- Doesn't get flagged after three clicks
- Doesn't leak the same fingerprint across 50 "users"
- Doesn't move the cursor in a perfect line from A to B
- Doesn't type 120 WPM with zero errors
- Actually survives real platforms that look for exactly this shit

Most teams bolt Playwright onto a random browser, run a few scripts, and call it a day. Then they wonder why everything gets banned. That's not engineering. That's hoping nobody's watching.

## The Approach

**Copy human behavior. Not "human-like". Human.**

### 1. Engine and profile model (Holy Trinity)

- **Camoufox** as the only engine. No Chrome spoofing, no mixed signals. One stack, one fingerprint surface.
- **One agent = one persistent profile.** Profile directory per persona under a single mount hierarchy (profiles, sessions, downloads, data — all keyed by persona). **Redis lock:** only one browser context per persona at any time; key TTL 300 s. No profile sharing, no cross-contamination.
- **One agent = one proxy.** Proxy bound to the profile. No rotation mid-session, no "pool" that links 100 sessions to the same exit.

### 2. Mouse: no straight lines

- Movement is **Bezier curves** with random control points. Start point can be synthetic (50–120 px away, random angle) so the path is never a line.
- **Micro-pauses** between steps (e.g. 8 steps, 0.01–0.04 s per step). Jitter on final coordinates.
- Before any click: move to element center with small random offset (not pixel-perfect center). Then move along the curve, then click. No `element.click()` from nowhere.

### 3. Typing and submit

- **human_type:** per-keystroke delay from config (typing_delay_range_ms), optional typo rate, optional "thinking" pause before/after. Device profile supplies default ranges; behavior_config overrides.
- **Submit:** short random pause (0.2–0.8 s), then move mouse to submit button via the same Bezier human_move, then click. No instant submit.

### 4. Session behavior and Double Entropy

- **Scenario sequences:** e.g. scroll–scroll–idle–scroll, scroll–open_card–like–idle, scroll–view_profile–back. One sequence chosen per session; not the same every time.
- **Archetypes** (e.g. news_reader, lurker, commenter) map to preferred scenario sets so the fleet isn't one pattern.
- **Double Entropy (two levels).** (1) **Inside the session:** base delay plus 5–15 s jitter between actions so "every action every 37 seconds" never happens. (2) **At orchestration:** tasks are pushed only in allowed schedule windows (work/content/sleep); step gaps use a base delay (e.g. minutes) plus variance percent; schedule window boundaries get jitter so the whole fleet doesn't flip work/sleep at the same moment. One task per persona per cycle; next step only after the entropy delay. Result: no synchronized wave of bots.
- **Platform selectors:** like/card/profile per platform (e.g. Facebook, Nextdoor); fallback generic. Scroll via mouse.wheel with random step count and direction weight.

### 5. Device profiles and behavior_config

- **Device profiles** (e.g. A1–A10 for LA, B1–B10 for NYC): os (windows/macos/linux), dpr (1 or 2), media template index (audio/video device labels), typing_delay_range_ms, scroll_probability_range, like_probability_range, idle_duration_range_sec, battery_type (slow/normal/fast), charge_pattern.
- **Markets:** different media templates per city so anti-fraud doesn't see the same "device" in two regions.
- **behavior_config** on the agent: device_profile_id, browser_os, battery (start_level, discharge_rate, charge_windows), plus overrides for any of the ranges. Factory reads profile + behavior_config and builds battery spec and init scripts for the page.

### 6. Three layers: infrastructure, hardware spoofing, cold start

**Layer 1 (Infrastructure lockdown)**  
- Headless only when no display; when DISPLAY is set (e.g. Xvfb :99), browser runs headful. Fonts in the image: MS Core Fonts (Arial, Times New Roman, etc.) so glyph metrics match Windows; Liberation looks close but canvas width differs by a fraction of a percent — anti-fraud flags Linux. No shortcuts here.

**Layer 2 (Hardware spoofing, in-page)**  
- **WebGL:** UNMASKED_VENDOR_WEBGL / RENDERER set per OS (e.g. macos → Apple M1, windows/linux → Intel UHD 630). Injected via add_init_script so the page never sees the real GPU.
- **Battery API:** start level, discharge per 15 min, optional charge windows (e.g. "charging" during schedule sleep). Timezone-aware so "charging at 3 AM" matches the profile.
- **DPR, media devices:** from device profile and media templates. No real camera/mic exposure.
- **WebRTC:** local IP per persona in 192.168.1.x range so leaks don't link sessions.
- **Route interception:** block image/media/font by default where not needed so traffic and load don't scream automation.

**Layer 3 (Cold start / cookie farming)**  
- A profile that hits Craigslist or Meta with empty cookies is a dead profile. New agents start as reserve or warming; before they get real tasks they get **warmup:** 5–8 neutral US sites (e.g. Wikipedia, Amazon, CNN, Yahoo), human-like scroll and pauses; cookies land in the profile dir. Only after warmup do we flip status to active and let the orchestrator push work. No blank-profile runs.

### 7. Verification and audit

- **Fingerprint stability:** runs per persona, compare key fields across runs; report drift.
- **Stealth:** single and multi-tab stealth checks; screenshots and status in reports.
- **Browser traffic audit:** script that validates traffic and TLS against a checklist.
- **Echelon 2:** BROWSER_OS, DPR, Battery, Media — one checklist before work. Fleet Browser OS: per-persona OS so the fleet isn't "100% Windows".
- **Activity events:** navigation, form_submit, idle_session; logged and summarised so you see who did what and when.

### 8. Security: double echelon and browser isolation

- **Double echelon.** (1) **AI/content safety:** external and AI-bound content goes through a dedicated layer (sanitize, prompt-injection detect); browser is not that layer. (2) **Infra:** secrets live in env or optional secret files; they are not in the repo and not baked into the image. Browser and any sandbox process get no DATABASE_URL, REDIS_URL, or Vault; if the browser is compromised, it cannot reach backend or secrets. Optional Phase 4: secrets from mounted read-only files instead of env.
- **Browser isolation:** when we use a sandbox (subprocess or HTTP service) for "dirty" URLs, the sandbox env is whitelisted — no DB, Redis, or Vault. Same principle: the automation layer and the data layer stay separate.

## Architecture (high level)

```
[Orchestrator]  →  schedule windows (work/content/sleep) + Double Entropy step gaps; one task per persona per cycle
    ↓
[Agent/Persona]  →  schedule_config, behavior_config, device_profile_id
    ↓
[Mount + Lock]  →  profile dir per persona; Redis lock (one browser context per persona, TTL 300s)
    ↓
[StealthBrowserFactory]  →  Camoufox context, profile dir, proxy, init scripts (Layer 1–2)
    ↓
[Page]  →  WebGL/Battery/Media/WebRTC injected; route interception on
    ↓
[BrowserInteraction]  →  human_move_to → click; human_type; send_submit
    ↓
[Session behavior]  →  scenario (scroll/like/open_card/view_profile); Double Entropy interval variance
    ↓
[Warmup (Layer 3)]  →  before active: neutral sites, human scroll/pauses, cookies in profile
```

Each persona gets its own profile directory, its own proxy binding, its own device profile (or override). Mount hierarchy: profiles, sessions, downloads, data — all by persona_id. No sharing. No "pool of 1000 profiles". That's how you get burned.

## What makes this different

**It's not "we use an anti-detect browser".** The browser is one layer. The rest is: how you move the mouse, how you type, how you schedule actions, how you spread device and OS and battery across a fleet so it doesn't cluster. One straight line, one perfect typing burst, one identical fingerprint across 50 agents — and you're done. We don't leave that to chance.

## Lessons learned

1. **Straight-line mouse = bot.** Every time. Bezier + jitter + micro-pauses or don't bother.
2. **One profile per agent, forever.** Sharing or rotating profiles links sessions. Period.
3. **Double Entropy is non-negotiable.** Session-level jitter is not enough. If the orchestrator pushes all agents at the same moment or steps in lockstep, you're a wave. Base delay + variance at the timeline level and jitter on schedule boundaries.
4. **Device profiles beat ad-hoc numbers.** Typing 50–180 ms, scroll prob 0.4–0.8, idle 25–120 s — from a profile, per market. Then override only where needed.
5. **Battery and charge windows matter.** Sites that check "is this device charging at 3 AM?" get a consistent story from the profile and schedule.
6. **Three layers stack.** Infrastructure (display, fonts), then in-page spoofing (WebGL, Battery, Media, WebRTC), then cold start (warmup so no blank profile). Skip one and you leak.
7. **Verify or shut up.** Fingerprint stability, stealth, traffic audit, Echelon 2 — if you're not running these and checking the reports, you're not building a system; you're hoping.
8. **Browser never sees secrets.** Double echelon: content safety for LLM, infra so repo/image stay clean and browser/sandbox get no DB/Redis/Vault. When the browser is pwned, the rest of the system isn't.

## What we're not sharing

- Profile storage paths or naming
- Proxy binding implementation
- Exact init-script payloads
- Verification script logic or thresholds
- Any credentials, API keys, or endpoints

Enough is here to replicate the ideas. The rest stays in the build.

## For those who want to build something similar

Think about:
- How does your mouse move? Really. Record it. Then compare to your automation.
- How does your typing look? Same delay every time? Zero typos?
- How many "users" share the same device fingerprint or the same OS/DPR/battery story?
- Do you have one profile per logical user, or a pool?
- Do you verify fingerprint and stealth and traffic, or do you just assume?

Then fix it. Or don't, and keep wondering why everything gets banned.

---

**Status:** In production  
**Engine:** Camoufox  
**Control plane:** Playwright-compatible API; mouse/typing/session in separate modules  
**Verification:** Fingerprint stability, stealth, traffic audit, Echelon 2, activity audit  

*"If your automation looks like automation, you're not building systems; you're feeding the detection pipeline."*
