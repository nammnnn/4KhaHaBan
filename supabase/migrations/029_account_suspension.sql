-- 029: make "suspend account" real.
-- Before this, admins could set profiles.is_banned but nothing checked it.
-- Everything here is additive: new columns, a helper function, a guard trigger and
-- RESTRICTIVE policies (they only narrow what existing policies allow; nothing is dropped).
-- The app also shows suspended people a "your account is suspended" screen.

-- 1. Why and when (shown to the person, and to admins)
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS banned_reason text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS banned_at timestamptz;

-- 2. Only super admins may change the reason / time (is_banned itself is already guarded
--    by protect_profile_roles_and_status)
CREATE OR REPLACE FUNCTION public.guard_ban_details()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF auth.uid() IS NOT NULL AND NOT public.is_super_admin() THEN
    NEW.banned_reason := OLD.banned_reason;
    NEW.banned_at := OLD.banned_at;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_guard_ban_details ON public.profiles;
CREATE TRIGGER trg_guard_ban_details
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.guard_ban_details();

-- 3. Is the signed-in person suspended?
CREATE OR REPLACE FUNCTION public.current_user_is_banned()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT COALESCE((SELECT is_banned FROM public.profiles WHERE id = auth.uid()), false);
$$;
REVOKE EXECUTE ON FUNCTION public.current_user_is_banned() FROM anon;
GRANT EXECUTE ON FUNCTION public.current_user_is_banned() TO authenticated;

-- 4. Suspended accounts can't create or change things. Support chats stay open so they can appeal.
DO $$
DECLARE
  t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['matches', 'messages', 'incident_reports', 'reports', 'donations', 'animals', 'foundation_needs', 'swipes']
  LOOP
    IF to_regclass('public.' || t) IS NULL THEN CONTINUE; END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = t AND policyname = t || '_not_banned_insert') THEN
      EXECUTE format('CREATE POLICY %I ON public.%I AS RESTRICTIVE FOR INSERT TO authenticated WITH CHECK (NOT public.current_user_is_banned())', t || '_not_banned_insert', t);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = t AND policyname = t || '_not_banned_update') THEN
      EXECUTE format('CREATE POLICY %I ON public.%I AS RESTRICTIVE FOR UPDATE TO authenticated USING (NOT public.current_user_is_banned())', t || '_not_banned_update', t);
    END IF;
  END LOOP;
END;
$$;
