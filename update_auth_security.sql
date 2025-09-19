-- Add additional metadata for device management and CSRF safeguards
ALTER TABLE public.user_sessions
    ADD COLUMN IF NOT EXISTS remember_me boolean DEFAULT false,
    ADD COLUMN IF NOT EXISTS ip_address text,
    ADD COLUMN IF NOT EXISTS user_agent text,
    ADD COLUMN IF NOT EXISTS csrf_secret text;

-- Ensure helpful indexes for lookups
CREATE INDEX IF NOT EXISTS user_sessions_user_id_idx
    ON public.user_sessions(user_id);

CREATE UNIQUE INDEX IF NOT EXISTS user_sessions_session_token_key
    ON public.user_sessions(session_token);

CREATE INDEX IF NOT EXISTS user_sessions_revoked_at_idx
    ON public.user_sessions(revoked_at);

-- Backfill NULL values where appropriate
UPDATE public.user_sessions
SET remember_me = COALESCE(remember_me, false)
WHERE remember_me IS NULL;
