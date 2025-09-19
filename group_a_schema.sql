-- Ensure required extension for UUID generation
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ----------------------------------------------------------------------------
-- Helper function to automatically bump updated_at columns
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = timezone('utc', now());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ----------------------------------------------------------------------------
-- Standardise purchases table
-- ----------------------------------------------------------------------------
ALTER TABLE public.purchases
  ADD COLUMN IF NOT EXISTS user_id uuid,
  ADD COLUMN IF NOT EXISTS user_email text,
  ADD COLUMN IF NOT EXISTS user_country text,
  ADD COLUMN IF NOT EXISTS user_ip text,
  ADD COLUMN IF NOT EXISTS payment_method text DEFAULT 'stripe',
  ADD COLUMN IF NOT EXISTS payment_status text DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS stripe_payment_intent_id text,
  ADD COLUMN IF NOT EXISTS cryptomus_order_id text,
  ADD COLUMN IF NOT EXISTS metadata jsonb DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS currency text DEFAULT 'RUB',
  ADD COLUMN IF NOT EXISTS amount_paid integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS created_at timestamptz DEFAULT timezone('utc', now()),
  ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT timezone('utc', now());

-- Backfill defaults where new columns were introduced
DO $$
DECLARE
  purchases_amount_column boolean;
BEGIN
  SELECT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'purchases'
      AND column_name = 'amount'
  ) INTO purchases_amount_column;

  IF purchases_amount_column THEN
    EXECUTE '
      UPDATE public.purchases
      SET payment_status = COALESCE(payment_status, ''pending''),
          payment_method = COALESCE(payment_method, ''stripe''),
          currency = COALESCE(currency, ''RUB''),
          metadata = COALESCE(metadata, ''{}''::jsonb),
          amount_paid = COALESCE(amount_paid, amount, 0),
          created_at = COALESCE(created_at, timezone(''utc'', now())),
          updated_at = COALESCE(updated_at, timezone(''utc'', now()))
      WHERE TRUE;
    ';
  ELSE
    EXECUTE '
      UPDATE public.purchases
      SET payment_status = COALESCE(payment_status, ''pending''),
          payment_method = COALESCE(payment_method, ''stripe''),
          currency = COALESCE(currency, ''RUB''),
          metadata = COALESCE(metadata, ''{}''::jsonb),
          amount_paid = COALESCE(amount_paid, 0),
          created_at = COALESCE(created_at, timezone(''utc'', now())),
          updated_at = COALESCE(updated_at, timezone(''utc'', now()))
      WHERE TRUE;
    ';
  END IF;
END
$$;

-- Unique constraints for external identifiers
CREATE UNIQUE INDEX IF NOT EXISTS purchases_stripe_payment_intent_id_key
  ON public.purchases (stripe_payment_intent_id)
  WHERE stripe_payment_intent_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS purchases_cryptomus_order_id_key
  ON public.purchases (cryptomus_order_id)
  WHERE cryptomus_order_id IS NOT NULL;

-- Очистить дубликаты перед добавлением уникального индекса
DO $$
DECLARE
  duplicate_ids uuid[];
  affected_rows integer := 0;
BEGIN
  SELECT array_agg(id)
    INTO duplicate_ids
  FROM (
    SELECT id
    FROM (
      SELECT id,
             row_number() OVER (
               PARTITION BY COALESCE(user_id, '00000000-0000-0000-0000-000000000000'::uuid), document_id
               ORDER BY updated_at DESC NULLS LAST,
                        created_at DESC NULLS LAST,
                        id DESC
             ) AS rn
      FROM public.purchases
      WHERE payment_status = 'completed'
    ) t
    WHERE rn > 1
  ) duplicates;

  IF duplicate_ids IS NOT NULL THEN
    UPDATE public.purchases
       SET payment_status = 'pending'
     WHERE id = ANY(duplicate_ids);
    GET DIAGNOSTICS affected_rows = ROW_COUNT;
  END IF;

  RAISE NOTICE 'Reset % purchase rows with duplicate completed status to pending', affected_rows;
END
$$;

-- Ensure a single completed purchase per user/document combination
CREATE UNIQUE INDEX IF NOT EXISTS purchases_user_document_completed_key
  ON public.purchases (COALESCE(user_id, '00000000-0000-0000-0000-000000000000'::uuid), document_id)
  WHERE payment_status = 'completed';

-- ----------------------------------------------------------------------------
-- Standardise orders table
-- ----------------------------------------------------------------------------
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS user_email text,
  ADD COLUMN IF NOT EXISTS user_country text,
  ADD COLUMN IF NOT EXISTS user_ip text,
  ADD COLUMN IF NOT EXISTS payment_method text DEFAULT 'stripe',
  ADD COLUMN IF NOT EXISTS payment_status text DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS currency text DEFAULT 'RUB',
  ADD COLUMN IF NOT EXISTS metadata jsonb DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS stripe_payment_intent_id text,
  ADD COLUMN IF NOT EXISTS cryptomus_order_id text,
  ADD COLUMN IF NOT EXISTS amount_paid integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS created_at timestamptz DEFAULT timezone('utc', now()),
  ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT timezone('utc', now());

-- Align statuses
DO $$
DECLARE
  orders_amount_column boolean;
BEGIN
  SELECT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'orders'
      AND column_name = 'amount'
  ) INTO orders_amount_column;

  IF orders_amount_column THEN
    EXECUTE '
      UPDATE public.orders
      SET payment_status = COALESCE(payment_status, (status)::text, ''pending''),
          payment_method = COALESCE(payment_method, ''stripe''),
          currency = COALESCE(currency, ''RUB''),
          metadata = COALESCE(metadata, ''{}''::jsonb),
          amount_paid = COALESCE(amount_paid, amount, 0),
          created_at = COALESCE(created_at, timezone(''utc'', now())),
          updated_at = COALESCE(updated_at, timezone(''utc'', now()))
      WHERE TRUE;
    ';
  ELSE
    EXECUTE '
      UPDATE public.orders
      SET payment_status = COALESCE(payment_status, (status)::text, ''pending''),
          payment_method = COALESCE(payment_method, ''stripe''),
          currency = COALESCE(currency, ''RUB''),
          metadata = COALESCE(metadata, ''{}''::jsonb),
          amount_paid = COALESCE(amount_paid, 0),
          created_at = COALESCE(created_at, timezone(''utc'', now())),
          updated_at = COALESCE(updated_at, timezone(''utc'', now()))
      WHERE TRUE;
    ';
  END IF;
END
$$;

CREATE UNIQUE INDEX IF NOT EXISTS orders_stripe_payment_intent_id_key
  ON public.orders (stripe_payment_intent_id)
  WHERE stripe_payment_intent_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS orders_cryptomus_order_id_key
  ON public.orders (cryptomus_order_id)
  WHERE cryptomus_order_id IS NOT NULL;

-- ----------------------------------------------------------------------------
-- Attach updated_at triggers
-- ----------------------------------------------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE tgname = 'purchases_touch_updated_at'
  ) THEN
    CREATE TRIGGER purchases_touch_updated_at
      BEFORE UPDATE ON public.purchases
      FOR EACH ROW
      EXECUTE FUNCTION public.touch_updated_at();
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE tgname = 'orders_touch_updated_at'
  ) THEN
    CREATE TRIGGER orders_touch_updated_at
      BEFORE UPDATE ON public.orders
      FOR EACH ROW
      EXECUTE FUNCTION public.touch_updated_at();
  END IF;
END
$$;

-- ----------------------------------------------------------------------------
-- user_course_access table
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.user_course_access (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  document_id uuid NOT NULL REFERENCES public.documents(id) ON DELETE CASCADE,
  granted_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  expires_at timestamptz,
  granted_by uuid,
  source text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  revoked_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  updated_at timestamptz NOT NULL DEFAULT timezone('utc', now())
);

CREATE UNIQUE INDEX IF NOT EXISTS user_course_access_active_key
  ON public.user_course_access (user_id, document_id)
  WHERE revoked_at IS NULL;

CREATE INDEX IF NOT EXISTS user_course_access_user_idx
  ON public.user_course_access (user_id);

CREATE INDEX IF NOT EXISTS user_course_access_document_idx
  ON public.user_course_access (document_id);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'user_course_access_touch_updated_at'
  ) THEN
    CREATE TRIGGER user_course_access_touch_updated_at
      BEFORE UPDATE ON public.user_course_access
      FOR EACH ROW
      EXECUTE FUNCTION public.touch_updated_at();
  END IF;
END
$$;

-- ----------------------------------------------------------------------------
-- audit_logs table
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id uuid,
  actor_email text,
  action text NOT NULL,
  target_table text,
  target_id uuid,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  ip_address text,
  user_agent text,
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now())
);

CREATE INDEX IF NOT EXISTS audit_logs_actor_idx
  ON public.audit_logs (actor_id);

CREATE INDEX IF NOT EXISTS audit_logs_target_idx
  ON public.audit_logs (target_id);

CREATE INDEX IF NOT EXISTS audit_logs_action_idx
  ON public.audit_logs (action);

-- ----------------------------------------------------------------------------
-- Row level security policies
-- ----------------------------------------------------------------------------
ALTER TABLE public.user_course_access ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'user_course_access' AND policyname = 'user_course_access_owner_select'
  ) THEN
    EXECUTE 'CREATE POLICY user_course_access_owner_select ON public.user_course_access
      FOR SELECT USING (auth.uid() = user_id)';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'user_course_access' AND policyname = 'user_course_access_owner_modify'
  ) THEN
    EXECUTE 'CREATE POLICY user_course_access_owner_modify ON public.user_course_access
      FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id)';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'user_course_access' AND policyname = 'user_course_access_service_role'
  ) THEN
    EXECUTE ''
      || 'CREATE POLICY user_course_access_service_role ON public.user_course_access '
      || 'USING (auth.role() = ''service_role'') WITH CHECK (auth.role() = ''service_role'')';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'audit_logs' AND policyname = 'audit_logs_service_role'
  ) THEN
    EXECUTE 'CREATE POLICY audit_logs_service_role ON public.audit_logs
      USING (auth.role() = ''service_role'') WITH CHECK (auth.role() = ''service_role'')';
  END IF;
END
$$;

-- ----------------------------------------------------------------------------
-- Helper functions for course access management
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.grant_course_access(
  p_user_id uuid,
  p_document_id uuid,
  p_source text DEFAULT 'manual',
  p_actor_id uuid DEFAULT NULL,
  p_actor_email text DEFAULT NULL,
  p_metadata jsonb DEFAULT '{}'::jsonb
)
RETURNS TABLE (
  access_id uuid,
  user_id uuid,
  document_id uuid,
  action text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_now timestamptz := timezone('utc', now());
  v_access public.user_course_access%ROWTYPE;
  v_action text := 'noop';
  v_metadata jsonb := coalesce(p_metadata, '{}'::jsonb);
BEGIN
  IF p_user_id IS NULL OR p_document_id IS NULL THEN
    RAISE EXCEPTION 'user_id and document_id are required';
  END IF;

  SELECT *
    INTO v_access
    FROM public.user_course_access
    WHERE user_id = p_user_id
      AND document_id = p_document_id
    ORDER BY granted_at DESC
    LIMIT 1
    FOR UPDATE;

  IF v_access.id IS NULL THEN
    INSERT INTO public.user_course_access (
      user_id,
      document_id,
      granted_at,
      source,
      metadata,
      created_at,
      updated_at
    ) VALUES (
      p_user_id,
      p_document_id,
      v_now,
      p_source,
      v_metadata,
      v_now,
      v_now
    )
    RETURNING * INTO v_access;

    v_action := 'granted';

  ELSIF v_access.revoked_at IS NOT NULL THEN
    UPDATE public.user_course_access
      SET revoked_at = NULL,
          granted_at = COALESCE(v_access.granted_at, v_now),
          updated_at = v_now,
          source = COALESCE(p_source, v_access.source),
          metadata = coalesce(v_access.metadata, '{}'::jsonb) || jsonb_build_object('reactivated_at', v_now) || v_metadata
      WHERE id = v_access.id
      RETURNING * INTO v_access;

    v_action := 'reactivated';
  END IF;

  IF v_action <> 'noop' THEN
    INSERT INTO public.audit_logs (
      actor_id,
      actor_email,
      action,
      target_table,
      target_id,
      metadata,
      created_at
    ) VALUES (
      p_actor_id,
      p_actor_email,
      'course_access_' || v_action,
      'user_course_access',
      v_access.id,
      jsonb_build_object(
        'user_id', p_user_id,
        'document_id', p_document_id,
        'source', p_source
      ) || v_metadata,
      v_now
    );
  END IF;

  RETURN QUERY SELECT v_access.id, v_access.user_id, v_access.document_id, v_action;
END;
$$;

CREATE OR REPLACE FUNCTION public.revoke_course_access(
  p_user_id uuid,
  p_document_id uuid,
  p_source text DEFAULT 'payment',
  p_actor_id uuid DEFAULT NULL,
  p_actor_email text DEFAULT NULL,
  p_reason text DEFAULT NULL,
  p_metadata jsonb DEFAULT '{}'::jsonb
)
RETURNS TABLE (
  access_id uuid,
  user_id uuid,
  document_id uuid,
  action text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_now timestamptz := timezone('utc', now());
  v_access public.user_course_access%ROWTYPE;
  v_action text := 'noop';
  v_metadata jsonb := coalesce(p_metadata, '{}'::jsonb);
BEGIN
  SELECT *
    INTO v_access
    FROM public.user_course_access
    WHERE user_id = p_user_id
      AND document_id = p_document_id
      AND revoked_at IS NULL
    ORDER BY granted_at DESC
    LIMIT 1
    FOR UPDATE;

  IF FOUND THEN
    UPDATE public.user_course_access
      SET revoked_at = v_now,
          updated_at = v_now,
          metadata = coalesce(v_access.metadata, '{}'::jsonb)
            || jsonb_build_object(
              'revoked_at', v_now,
              'revoked_source', p_source,
              'revoked_reason', p_reason
            )
            || v_metadata
      WHERE id = v_access.id
      RETURNING * INTO v_access;

    v_action := 'revoked';

    INSERT INTO public.audit_logs (
      actor_id,
      actor_email,
      action,
      target_table,
      target_id,
      metadata,
      created_at
    ) VALUES (
      p_actor_id,
      p_actor_email,
      'course_access_revoked',
      'user_course_access',
      v_access.id,
      jsonb_build_object(
        'user_id', p_user_id,
        'document_id', p_document_id,
        'source', p_source,
        'reason', p_reason
      ) || v_metadata,
      v_now
    );

    RETURN QUERY SELECT v_access.id, v_access.user_id, v_access.document_id, v_action;
  ELSE
    RETURN QUERY SELECT NULL::uuid, p_user_id, p_document_id, v_action;
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.grant_course_access_from_purchase(
  p_purchase_id uuid,
  p_actor_id uuid DEFAULT NULL,
  p_actor_email text DEFAULT NULL,
  p_source text DEFAULT NULL,
  p_metadata jsonb DEFAULT '{}'::jsonb
)
RETURNS TABLE (
  access_id uuid,
  user_id uuid,
  document_id uuid,
  action text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_purchase public.purchases%ROWTYPE;
  v_user_id uuid;
  v_metadata jsonb := coalesce(p_metadata, '{}'::jsonb);
  v_now timestamptz := timezone('utc', now());
  v_source text;
BEGIN
  SELECT *
    INTO v_purchase
    FROM public.purchases
    WHERE id = p_purchase_id
    FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Purchase % not found', p_purchase_id;
  END IF;

  IF v_purchase.document_id IS NULL THEN
    RAISE EXCEPTION 'Purchase % missing document_id', p_purchase_id;
  END IF;

  v_user_id := v_purchase.user_id;

  IF v_user_id IS NULL THEN
    IF v_purchase.user_email IS NULL THEN
      RAISE EXCEPTION 'Purchase % missing user reference', p_purchase_id;
    END IF;

    SELECT id INTO v_user_id
      FROM public.users
      WHERE lower(email) = lower(v_purchase.user_email)
      LIMIT 1;

    IF v_user_id IS NULL THEN
      RAISE EXCEPTION 'Unable to resolve user for purchase %', p_purchase_id;
    END IF;

    UPDATE public.purchases
      SET user_id = v_user_id,
          updated_at = v_now
      WHERE id = p_purchase_id;
  END IF;

  v_source := COALESCE(p_source, v_purchase.payment_method, 'payment');

  RETURN QUERY
    SELECT * FROM public.grant_course_access(
      v_user_id,
      v_purchase.document_id,
      v_source,
      p_actor_id,
      p_actor_email,
      jsonb_build_object('purchase_id', p_purchase_id, 'payment_status', v_purchase.payment_status) || v_metadata
    );
END;
$$;

CREATE OR REPLACE FUNCTION public.revoke_course_access_from_purchase(
  p_purchase_id uuid,
  p_actor_id uuid DEFAULT NULL,
  p_actor_email text DEFAULT NULL,
  p_source text DEFAULT NULL,
  p_reason text DEFAULT NULL,
  p_metadata jsonb DEFAULT '{}'::jsonb
)
RETURNS TABLE (
  access_id uuid,
  user_id uuid,
  document_id uuid,
  action text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_purchase public.purchases%ROWTYPE;
  v_user_id uuid;
  v_source text;
  v_metadata jsonb := coalesce(p_metadata, '{}'::jsonb);
BEGIN
  SELECT * INTO v_purchase
    FROM public.purchases
    WHERE id = p_purchase_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Purchase % not found', p_purchase_id;
  END IF;

  IF v_purchase.document_id IS NULL THEN
    RAISE EXCEPTION 'Purchase % missing document_id', p_purchase_id;
  END IF;

  v_user_id := v_purchase.user_id;

  IF v_user_id IS NULL THEN
    IF v_purchase.user_email IS NULL THEN
      RAISE EXCEPTION 'Purchase % missing user reference', p_purchase_id;
    END IF;

    SELECT id INTO v_user_id
      FROM public.users
      WHERE lower(email) = lower(v_purchase.user_email)
      LIMIT 1;

    IF v_user_id IS NULL THEN
      RAISE EXCEPTION 'Unable to resolve user for purchase %', p_purchase_id;
    END IF;

    UPDATE public.purchases
      SET user_id = v_user_id,
          updated_at = timezone('utc', now())
      WHERE id = p_purchase_id;
  END IF;

  v_source := COALESCE(p_source, v_purchase.payment_method, 'payment');

  RETURN QUERY
    SELECT * FROM public.revoke_course_access(
      v_user_id,
      v_purchase.document_id,
      v_source,
      p_actor_id,
      p_actor_email,
      p_reason,
      jsonb_build_object('purchase_id', p_purchase_id, 'payment_status', v_purchase.payment_status) || v_metadata
    );
END;
$$;

GRANT EXECUTE ON FUNCTION public.grant_course_access(uuid, uuid, text, uuid, text, jsonb) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.revoke_course_access(uuid, uuid, text, uuid, text, text, jsonb) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.grant_course_access_from_purchase(uuid, uuid, text, text, jsonb) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.revoke_course_access_from_purchase(uuid, uuid, text, text, text, jsonb) TO authenticated, service_role;
