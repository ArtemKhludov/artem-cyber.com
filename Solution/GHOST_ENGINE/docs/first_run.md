# First Run (short and strict)

## 1) Prerequisites

- **Docker Desktop** is installed and running.
- **Python 3.12** and **`uv`** are available.

From repository root:

```bash
uv sync
```

---

## 2) Environment setup

1. Copy `.env.example` to `.env`.
2. Fill at least:
   - `POSTGRES_PASSWORD`, `REDIS_PASSWORD`
   - `DATABASE_URL`, `REDIS_URL` (must match compose credentials)
   - `TELEGRAM_BOT_TOKEN`, `TELEGRAM_OPERATOR_CHAT_IDS` (if Telegram flow is enabled)
3. Upwork auth mode:
   - Email/password mode: `UPWORK_EMAIL`, `UPWORK_PASSWORD`
   - Google session mode: `UPWORK_EMAIL`, `GHOST_DEV_OAUTH_SESSION_UPWORK=1` (no Upwork password)

---

## 3) Bring up infra

```bash
make infra-up
uv run python -m ghost_engine.main health
```

Expected health baseline:

- `redis=true`
- `ollama=true`

---

## 4) Launch modes

### Full local stack

```bash
make dev-full
```

### Browser-only session

```bash
uv run python -m ghost_engine.browser.dev_session --site upwork --profile default
```

### Manual login handoff (`--manual-ready`)

Use when you want to authenticate manually first, then continue automation.

```bash
uv run python -m ghost_engine.browser.dev_session --site upwork --profile default --manual-ready
```

Flow:

1. Camoufox opens target start page (not `about:blank`).
2. You complete login/OAuth manually.
3. Terminal prompts: `>>> Log in on the opened site page...`
4. Press **Enter**.
5. Script attaches interception and continues normal loop.

Do not close all tabs before pressing Enter.

---

## 5) Troubleshooting matrix

| Symptom | What to check |
|---|---|
| `Cannot connect to the Docker daemon` | Docker Desktop is down. Start it, run `docker info`. |
| `redis=false` in health | Redis container, `REDIS_URL`, and compose credentials mismatch. |
| Immediate exit before browser work | No active site context (missing creds or auth flags). Check `dev.site_skipped_*`, `dev.abort_no_active_sites`. |
| Chrome logged in, Camoufox asks login again | Expected. Camoufox uses isolated profile storage in `profiles/<profile>`. |
| OAuth loop repeats | Ensure same `--profile` every run, profile directory is not reset, and OAuth redirect completes fully. |
| Script retries login while already inside account | Check logged-in selector logic and `dev.login_skipped_already_inside`. Force login only if needed: `GHOST_DEV_FORCE_LOGIN=1`. |
| Session unstable between runs | Fingerprint pinning and profile consistency. Check `ghost_engine_camoufox_fingerprint.json` behavior and browser config updates. |

---

## 6) Profile location

- `--profile default` -> `profiles/default`
- `--profile <name>` -> `profiles/<name>`

Keep profile names stable if you expect session persistence.
