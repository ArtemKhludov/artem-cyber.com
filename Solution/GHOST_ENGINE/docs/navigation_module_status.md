# Navigation and Interception Module Status (living matrix)

This file tracks what is real in code, what is deferred, and where plan/docs diverge.  
If you skip this, context rot starts immediately.

Rule:

- `docs/main_plan.md` is strategic.
- This file is operational and should be updated as implementation evolves.

---

## 1) Mapping to plan nodes (current scope)

| Node | Area | Repository status |
|---|---|---|
| **0** | Config and adapters | **Done:** `config/sites/*.yaml`, `config/browser.yaml`, `config/base.yaml`, `BaseSiteAdapter`, `registry`, unified `graphql_sniff.attach_graphql_sniffers`, selector scaffolding, credentials via `.env` / `secrets/`. |
| **1** | Browser stack (Camoufox + Playwright) | **Done:** `launch_config.py`, `launcher.py`, persistent profiles, `dev_session`, `storage_state` export, `profile_manager.backup_profile`. Per-site activation uses `prepare_active_dev_sites` + `_DEV_SESSION_READY_SITE_IDS` + `resolve_site_credentials`. |
| **1** | Network interception | **Done:** HTTP GraphQL interception (`json.loads`, previews, `deque`) and WebSocket frame path (`framereceived` + optional `top_keys`). |
| **0-1** | L0/L1 scoring without LLM | **Done:** `config/scoring.yaml`, `scoring/engine.py`, `normalizer.py`, `BaseSiteAdapter._scoring_sieve_maybe_save` with pre-save L0 gate and structured scoring logs. |
| **1** | Human behavior layer | **Done:** `human_behavior` entropy layer on top of Camoufox `humanize` (cursor noise, scrolling pattern, typed input pacing). |
| **1** | Profile rotation / multi-account | **Deferred:** single-account operational mode now; rotation/pool strategy is a separate milestone. |
| **2+** | L2, Telegram, PG, Redis graph path | **Partial:** Redis notify queue + Telegram worker + scoring node OPSEC pieces are in place; full graph build path remains staged by design. |

---

## 2) Hard architectural decisions (locked)

1. YAML is not a junkyard for selector chaos.  
   Config carries hints; robust locator logic stays in Python fallback chains.

2. Interception happens before navigation action loops.  
   Early payloads are too expensive to lose.

3. Secrets stay outside static config.  
   Credentials are runtime-resolved from `.env` / `secrets/`.

4. Site activation is explicit, not implicit.  
   A site must be wired in session readiness and credential flow to become active.

5. Self-healing is human-supervised.  
   No automatic YAML rewrites from LLM output in baseline mode.

6. External wording stays neutral and review-safe.  
   Internal behavior can be aggressive; public framing remains technical.

7. UI entropy is layered.  
   Camoufox movement plus Playwright timing behavior are complementary, not competing systems.

---

## 3) Doc-to-code deltas

| Topic | Legacy docs assumption | Current implementation |
|---|---|---|
| Config model | Single abstract config file | Site-specific YAML + browser/base split + adapter loader |
| Interception pattern | Generic async callback examples | Adapter-native interception with centralized URL match utilities |
| Dedup strategy | SQLite/JSON sketches | Not finalized in this module; target remains PG/Redis path |
| Locator strategy | Single hardcoded selectors | Fallback matrix with semantic locators and regex assistance |

---

## 4) Module backlog (post Node 0-1)

1. [x] Probe plus fallback chain in `dev_session`.
2. [x] Click flow with timeout and structured logs.
3. [x] HTTP GraphQL parsing with snippet buffering.
4. [x] WebSocket frame capture for filtered GraphQL channels.
5. [x] L0/L1 pre-save filtering with trash output and gated persistence.
6. [ ] Saved-search navigation linkage with YAML naming hints.
7. [ ] Profile rotation and multi-account controls.
8. [ ] Full dedup pipeline and queue behavior under Node 2+ roadmap.

---

## 5) References

- Browser and network behavior: `docs/scrap_navigation.md`
- Camoufox/Playwright settings: `config/browser.yaml`, `config/base.yaml`
- Strategic plan: `docs/main_plan.md`
- Scoring cascade and tiers: `docs/scoring_cascade.md`
- OPSEC and hard guard model: `docs/opsec_pipeline.md`
- Plan gap synthesis: `docs/architecture_supplement.md`
