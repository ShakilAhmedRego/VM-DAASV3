BEGIN;

-- Extensions (safe)
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- ------------------------------------------------------------
-- Enums
-- ------------------------------------------------------------
DO $$
BEGIN
  CREATE TYPE public.workflow_status AS ENUM
    ('new','triaged','qualified','in_sequence','engaged','won','lost','do_not_contact');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ------------------------------------------------------------
-- Core table: leads (preview pool)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.leads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company text NOT NULL,
  website text,
  domain text,
  logo_url text,
  contact_name text,
  title text,
  email text,
  phone text,
  industry text,
  location_state text,
  stage text,
  employees integer,
  arr_estimate numeric,
  tech_stack text[],
  intelligence_score integer NOT NULL DEFAULT 0,
  workflow public.workflow_status NOT NULL DEFAULT 'new',
  is_premium boolean NOT NULL DEFAULT false,
  is_archived boolean NOT NULL DEFAULT false,
  meta jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS leads_created_idx      ON public.leads(created_at DESC);
CREATE INDEX IF NOT EXISTS leads_intel_idx        ON public.leads(intelligence_score DESC);
CREATE INDEX IF NOT EXISTS leads_workflow_idx     ON public.leads(workflow);
CREATE INDEX IF NOT EXISTS leads_stage_idx        ON public.leads(stage);
CREATE INDEX IF NOT EXISTS leads_state_idx        ON public.leads(location_state);
CREATE INDEX IF NOT EXISTS leads_industry_idx     ON public.leads(industry);
CREATE INDEX IF NOT EXISTS leads_company_trgm_idx ON public.leads USING gin (company gin_trgm_ops);
CREATE INDEX IF NOT EXISTS leads_domain_trgm_idx  ON public.leads USING gin (domain gin_trgm_ops);
CREATE INDEX IF NOT EXISTS leads_meta_gin         ON public.leads USING gin (meta);
CREATE INDEX IF NOT EXISTS leads_tech_gin         ON public.leads USING gin (tech_stack);

-- ------------------------------------------------------------
-- Entitlement: lead_access
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.lead_access (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  lead_id uuid NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  granted_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, lead_id)
);

CREATE INDEX IF NOT EXISTS lead_access_user_idx ON public.lead_access(user_id, granted_at DESC);
CREATE INDEX IF NOT EXISTS lead_access_lead_idx ON public.lead_access(lead_id);

-- ------------------------------------------------------------
-- Ledger: credit_ledger (APPEND-ONLY) [LOCKED COLUMNS]
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.credit_ledger (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  delta integer NOT NULL,
  reason text NOT NULL DEFAULT 'unknown',
  meta jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS credit_ledger_user_idx ON public.credit_ledger(user_id, created_at DESC);

-- ------------------------------------------------------------
-- Audit log
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_user_id uuid NOT NULL,
  action text NOT NULL,
  entity_type text NOT NULL,
  entity_id uuid,
  meta jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS audit_log_actor_idx  ON public.audit_log(actor_user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS audit_log_action_idx ON public.audit_log(action, created_at DESC);

-- ------------------------------------------------------------
-- Profiles
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.user_profiles (
  id uuid PRIMARY KEY,
  role text NOT NULL DEFAULT 'user',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS user_profiles_role_idx ON public.user_profiles(role);

-- ------------------------------------------------------------
-- Feature flags
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.feature_flags (
  key text PRIMARY KEY,
  enabled boolean NOT NULL DEFAULT false,
  description text,
  updated_at timestamptz NOT NULL DEFAULT now()
);

INSERT INTO public.feature_flags (key, enabled, description) VALUES
  ('ENABLE_ANALYTICS_DASHBOARD', true,  'Enable KPI cards + analytics'),
  ('ENABLE_DETAIL_PANEL',        true,  'Enable detail drawer'),
  ('ENABLE_COMMAND_PALETTE',     false, 'Enable Cmd+K palette'),
  ('ENABLE_SPARKLINES',          false, 'Enable sparkline visuals')
ON CONFLICT (key) DO NOTHING;

-- ------------------------------------------------------------
-- updated_at trigger
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'leads_set_updated_at') THEN
    CREATE TRIGGER leads_set_updated_at
    BEFORE UPDATE ON public.leads
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
  END IF;
END $$;

-- ------------------------------------------------------------
-- Analytics views
-- ------------------------------------------------------------
CREATE OR REPLACE VIEW public.dashboard_metrics AS
SELECT
  COUNT(*)::int                                        AS total_leads,
  COUNT(*) FILTER (WHERE is_archived = false)::int      AS visible_leads,
  COUNT(*) FILTER (WHERE is_premium = true)::int        AS premium_leads,
  COALESCE(AVG(intelligence_score),0)::numeric          AS avg_score
FROM public.leads;

CREATE OR REPLACE VIEW public.stage_breakdown AS
SELECT
  COALESCE(stage,'Unknown') AS stage,
  COUNT(*)::int             AS company_count
FROM public.leads
WHERE is_archived = false
GROUP BY COALESCE(stage,'Unknown');

CREATE OR REPLACE VIEW public.credit_balance AS
SELECT
  user_id,
  COALESCE(SUM(delta),0)::int AS balance
FROM public.credit_ledger
GROUP BY user_id;

-- ------------------------------------------------------------
-- RLS enablement
-- ------------------------------------------------------------
ALTER TABLE public.leads         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lead_access   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.credit_ledger ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_log     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.feature_flags ENABLE ROW LEVEL SECURITY;

-- ------------------------------------------------------------
-- RLS policies
-- ------------------------------------------------------------

-- leads: all authenticated can preview
DROP POLICY IF EXISTS "leads_preview"   ON public.leads;
CREATE POLICY "leads_preview" ON public.leads FOR SELECT USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "leads_no_insert" ON public.leads;
CREATE POLICY "leads_no_insert" ON public.leads FOR INSERT WITH CHECK (false);

DROP POLICY IF EXISTS "leads_no_update" ON public.leads;
CREATE POLICY "leads_no_update" ON public.leads FOR UPDATE USING (false);

DROP POLICY IF EXISTS "leads_no_delete" ON public.leads;
CREATE POLICY "leads_no_delete" ON public.leads FOR DELETE USING (false);

-- lead_access
DROP POLICY IF EXISTS "lead_access_read_own" ON public.lead_access;
CREATE POLICY "lead_access_read_own" ON public.lead_access FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "lead_access_no_insert" ON public.lead_access;
CREATE POLICY "lead_access_no_insert" ON public.lead_access FOR INSERT WITH CHECK (false);

DROP POLICY IF EXISTS "lead_access_no_update" ON public.lead_access;
CREATE POLICY "lead_access_no_update" ON public.lead_access FOR UPDATE USING (false);

DROP POLICY IF EXISTS "lead_access_no_delete" ON public.lead_access;
CREATE POLICY "lead_access_no_delete" ON public.lead_access FOR DELETE USING (false);

-- credit_ledger
DROP POLICY IF EXISTS "ledger_read_own" ON public.credit_ledger;
CREATE POLICY "ledger_read_own" ON public.credit_ledger FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "ledger_no_insert" ON public.credit_ledger;
CREATE POLICY "ledger_no_insert" ON public.credit_ledger FOR INSERT WITH CHECK (false);

DROP POLICY IF EXISTS "ledger_no_update" ON public.credit_ledger;
CREATE POLICY "ledger_no_update" ON public.credit_ledger FOR UPDATE USING (false);

DROP POLICY IF EXISTS "ledger_no_delete" ON public.credit_ledger;
CREATE POLICY "ledger_no_delete" ON public.credit_ledger FOR DELETE USING (false);

-- audit_log
DROP POLICY IF EXISTS "audit_read_own" ON public.audit_log;
CREATE POLICY "audit_read_own" ON public.audit_log FOR SELECT USING (auth.uid() = actor_user_id);

DROP POLICY IF EXISTS "audit_no_insert" ON public.audit_log;
CREATE POLICY "audit_no_insert" ON public.audit_log FOR INSERT WITH CHECK (false);

DROP POLICY IF EXISTS "audit_no_update" ON public.audit_log;
CREATE POLICY "audit_no_update" ON public.audit_log FOR UPDATE USING (false);

DROP POLICY IF EXISTS "audit_no_delete" ON public.audit_log;
CREATE POLICY "audit_no_delete" ON public.audit_log FOR DELETE USING (false);

-- user_profiles
DROP POLICY IF EXISTS "profiles_read_own" ON public.user_profiles;
CREATE POLICY "profiles_read_own" ON public.user_profiles FOR SELECT USING (auth.uid() = id);

DROP POLICY IF EXISTS "profiles_no_insert" ON public.user_profiles;
CREATE POLICY "profiles_no_insert" ON public.user_profiles FOR INSERT WITH CHECK (false);

DROP POLICY IF EXISTS "profiles_no_update" ON public.user_profiles;
CREATE POLICY "profiles_no_update" ON public.user_profiles FOR UPDATE USING (false);

DROP POLICY IF EXISTS "profiles_no_delete" ON public.user_profiles;
CREATE POLICY "profiles_no_delete" ON public.user_profiles FOR DELETE USING (false);

-- feature_flags
DROP POLICY IF EXISTS "flags_read" ON public.feature_flags;
CREATE POLICY "flags_read" ON public.feature_flags FOR SELECT USING (auth.role() = 'authenticated');

-- ------------------------------------------------------------
-- ADMIN HELPER: public.is_admin()
-- SECURITY DEFINER + SET row_security=off (MANDATORY)
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
SET row_security = off
AS $$
DECLARE
  uid uuid;
BEGIN
  uid := auth.uid();
  IF uid IS NULL THEN RETURN false; END IF;
  RETURN EXISTS (
    SELECT 1 FROM public.user_profiles up
    WHERE up.id = uid AND up.role = 'admin'
  );
END;
$$;

REVOKE ALL ON FUNCTION public.is_admin() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;

-- Admin can read all audit logs
DROP POLICY IF EXISTS "audit_admin_read_all" ON public.audit_log;
CREATE POLICY "audit_admin_read_all" ON public.audit_log FOR SELECT USING (public.is_admin());

-- ------------------------------------------------------------
-- AUTO-PROVISION user_profiles on signup
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, pg_temp
SET row_security = off
AS $$
BEGIN
  INSERT INTO public.user_profiles (id, role)
  VALUES (NEW.id, 'user')
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'on_auth_user_created') THEN
    CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
  END IF;
END $$;

-- ------------------------------------------------------------
-- RPC: unlock_leads_secure
-- Charges ONLY for NEW entitlements (re-claims are free)
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.unlock_leads_secure(p_lead_ids uuid[])
RETURNS TABLE(newly_unlocked int, token_cost int, balance_after int)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
SET row_security = off
AS $$
DECLARE
  uid uuid;
  bal int;
  new_count int;
  cost int;
BEGIN
  uid := auth.uid();
  IF uid IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;

  IF p_lead_ids IS NULL OR array_length(p_lead_ids, 1) IS NULL THEN
    RETURN QUERY SELECT 0, 0, COALESCE((SELECT SUM(delta)::int FROM public.credit_ledger WHERE user_id = uid), 0);
    RETURN;
  END IF;

  SELECT COALESCE(SUM(delta),0)::int INTO bal
  FROM public.credit_ledger WHERE user_id = uid;

  SELECT COUNT(*)::int INTO new_count
  FROM (SELECT DISTINCT unnest(p_lead_ids) AS lead_id) x
  WHERE NOT EXISTS (
    SELECT 1 FROM public.lead_access la
    WHERE la.user_id = uid AND la.lead_id = x.lead_id
  );

  cost := COALESCE(new_count, 0);

  IF cost <= 0 THEN
    RETURN QUERY SELECT 0, 0, bal;
    RETURN;
  END IF;

  IF bal < cost THEN RAISE EXCEPTION 'Insufficient credits'; END IF;

  INSERT INTO public.lead_access (user_id, lead_id)
  SELECT uid, x.lead_id
  FROM (SELECT DISTINCT unnest(p_lead_ids) AS lead_id) x
  WHERE NOT EXISTS (
    SELECT 1 FROM public.lead_access la
    WHERE la.user_id = uid AND la.lead_id = x.lead_id
  );

  INSERT INTO public.credit_ledger (user_id, delta, reason, meta)
  VALUES (uid, -cost, 'unlock', jsonb_build_object('lead_count', cost));

  INSERT INTO public.audit_log (actor_user_id, action, entity_type, entity_id, meta)
  VALUES (uid, 'unlock', 'lead_access', NULL, jsonb_build_object('lead_count', cost));

  SELECT COALESCE(SUM(delta),0)::int INTO bal
  FROM public.credit_ledger WHERE user_id = uid;

  RETURN QUERY SELECT cost, cost, bal;
END;
$$;

REVOKE ALL ON FUNCTION public.unlock_leads_secure(uuid[]) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.unlock_leads_secure(uuid[]) TO authenticated;

-- ------------------------------------------------------------
-- RPC: admin_grant_credits
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.admin_grant_credits(
  p_user_id uuid,
  p_delta int,
  p_reason text DEFAULT 'admin_grant',
  p_meta jsonb DEFAULT '{}'::jsonb
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
SET row_security = off
AS $$
DECLARE
  caller uuid;
BEGIN
  caller := auth.uid();
  IF caller IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  IF NOT public.is_admin() THEN RAISE EXCEPTION 'Not authorized'; END IF;
  IF p_user_id IS NULL THEN RAISE EXCEPTION 'Missing user_id'; END IF;
  IF p_delta IS NULL OR p_delta = 0 THEN RAISE EXCEPTION 'Invalid delta'; END IF;

  INSERT INTO public.credit_ledger (user_id, delta, reason, meta)
  VALUES (p_user_id, p_delta, COALESCE(p_reason,'admin_grant'), COALESCE(p_meta,'{}'::jsonb));

  INSERT INTO public.audit_log (actor_user_id, action, entity_type, entity_id, meta)
  VALUES (
    caller,
    'admin_grant_credits',
    'credit_ledger',
    NULL,
    jsonb_build_object('target_user_id', p_user_id, 'delta', p_delta, 'reason', p_reason)
    || COALESCE(p_meta,'{}'::jsonb)
  );
END;
$$;

REVOKE ALL ON FUNCTION public.admin_grant_credits(uuid,int,text,jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_grant_credits(uuid,int,text,jsonb) TO authenticated;

COMMIT;
