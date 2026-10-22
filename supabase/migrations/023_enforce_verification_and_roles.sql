-- ==============================================================================
-- 023_enforce_verification_and_roles.sql
-- Server-side rules for identity verification, adoption requests and privileges.
--
-- Until now these were only checked in the app, and the database let any signed-in
-- user write the fields that decide them:
--   * profiles.role        — a user could make themselves super_admin
--                            (UPDATE own row, or sign up with role in user metadata)
--   * profiles.is_verified — self-settable; also copied from sign-up metadata
--   * user_verifications   — status could be set to 'verified' with any data
--   * foundation_profiles  — a foundation could set its own verification_status to 'approved'
--   * matches              — anyone signed in could create a request (verified or not),
--                            in any status, and an adopter could approve their own request
--
-- Trusted contexts are unchanged: when auth.uid() IS NULL (SQL editor, service role,
-- auth triggers) or the caller is a super_admin, the guards below step aside.
--
-- Applied to the HaBan project on 2026-10-22.
-- Safe to run more than once. Read the "BEFORE YOU RUN" query at the bottom first.
-- ==============================================================================


-- ------------------------------------------------------------------------------
-- 1. Helpers
-- ------------------------------------------------------------------------------

-- Thai national ID: 13 digits with a valid check digit (rejects placeholders like 1xxxxxxxxxxxx)
CREATE OR REPLACE FUNCTION public.is_valid_thai_id(id_card TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
IMMUTABLE
SET search_path = public
AS $$
DECLARE
  d TEXT := regexp_replace(COALESCE(id_card, ''), '\D', '', 'g');
  s INT := 0;
  i INT;
BEGIN
  IF length(d) <> 13 THEN
    RETURN FALSE;
  END IF;
  FOR i IN 1..12 LOOP
    s := s + substr(d, i, 1)::INT * (14 - i);
  END LOOP;
  RETURN ((11 - (s % 11)) % 10) = substr(d, 13, 1)::INT;
END;
$$;

CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'super_admin');
$$;

-- The single source of truth for "this adopter is verified"
CREATE OR REPLACE FUNCTION public.adopter_verified_internal(uid UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_verifications v
    WHERE v.id = uid
      AND v.status = 'verified'
      AND public.is_valid_thai_id(v.id_card_no)
      AND length(trim(COALESCE(v.full_name, ''))) > 0
      AND length(regexp_replace(COALESCE(v.phone, ''), '\D', '', 'g')) BETWEEN 9 AND 10
  );
$$;
-- Not callable by users directly (it would reveal whether *other* accounts are verified)
REVOKE ALL ON FUNCTION public.adopter_verified_internal(UUID) FROM PUBLIC, anon, authenticated;

-- What policies (and the app, via RPC) use: only ever about the caller
CREATE OR REPLACE FUNCTION public.current_user_is_verified()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.adopter_verified_internal(auth.uid());
$$;
GRANT EXECUTE ON FUNCTION public.current_user_is_verified() TO authenticated;


-- ------------------------------------------------------------------------------
-- 2. Sign-up: never trust role / is_verified from user-supplied metadata
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  requested_role TEXT := NEW.raw_user_meta_data->>'role';
BEGIN
  INSERT INTO public.profiles (id, email, full_name, avatar_url, role, is_verified, created_at)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', ''),
    COALESCE(NEW.raw_user_meta_data->>'avatar_url', NEW.raw_user_meta_data->>'picture', ''),
    -- People may sign up as an adopter or a foundation (foundations still need admin approval);
    -- anything else, e.g. 'super_admin', becomes 'user'
    CASE WHEN requested_role IN ('user', 'foundation') THEN requested_role ELSE 'user' END,
    FALSE,
    now()
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    full_name = COALESCE(NULLIF(EXCLUDED.full_name, ''), public.profiles.full_name),
    avatar_url = COALESCE(NULLIF(EXCLUDED.avatar_url, ''), public.profiles.avatar_url);
  RETURN NEW;
END;
$$;


-- ------------------------------------------------------------------------------
-- 3. profiles: users can't change their role; is_verified is derived, not written
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.guard_profile_privileges()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL OR public.is_super_admin() THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'INSERT' THEN
    IF NEW.role IS NULL OR NEW.role NOT IN ('user', 'foundation') THEN
      NEW.role := 'user';
    END IF;
  ELSE
    NEW.role := OLD.role; -- only admins change roles (AdminDashboard)
  END IF;

  NEW.is_verified := public.adopter_verified_internal(NEW.id);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_guard_profile_privileges ON public.profiles;
CREATE TRIGGER trg_guard_profile_privileges
  BEFORE INSERT OR UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.guard_profile_privileges();


-- ------------------------------------------------------------------------------
-- 4. user_verifications: 'verified' needs real data; a rejection can't be undone by the user
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.guard_user_verification()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL OR public.is_super_admin() THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'UPDATE' AND OLD.status = 'rejected' THEN
    NEW.status := 'rejected';
  END IF;

  IF NEW.status = 'verified' AND NOT (
       public.is_valid_thai_id(NEW.id_card_no)
       AND length(trim(COALESCE(NEW.full_name, ''))) > 0
       AND length(regexp_replace(COALESCE(NEW.phone, ''), '\D', '', 'g')) BETWEEN 9 AND 10
     ) THEN
    RAISE EXCEPTION 'invalid_verification_data'
      USING ERRCODE = 'check_violation',
            HINT = 'A valid Thai ID number, a name and a 9-10 digit phone number are required.';
  END IF;

  RETURN NEW;
END;
$$;

-- Admins can review (reject / re-approve) a verification; until now only the owner could update it
DROP POLICY IF EXISTS "user_verifications_admin_update" ON public.user_verifications;
CREATE POLICY "user_verifications_admin_update" ON public.user_verifications
  FOR UPDATE USING (public.is_super_admin()) WITH CHECK (public.is_super_admin());

DROP TRIGGER IF EXISTS trg_guard_user_verification ON public.user_verifications;
CREATE TRIGGER trg_guard_user_verification
  BEFORE INSERT OR UPDATE ON public.user_verifications
  FOR EACH ROW EXECUTE FUNCTION public.guard_user_verification();

-- Keep profiles.is_verified in step with the verification row
CREATE OR REPLACE FUNCTION public.sync_profile_verified()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid UUID := COALESCE(NEW.id, OLD.id);
BEGIN
  UPDATE public.profiles SET is_verified = public.adopter_verified_internal(uid) WHERE id = uid;
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_profile_verified ON public.user_verifications;
CREATE TRIGGER trg_sync_profile_verified
  AFTER INSERT OR UPDATE OR DELETE ON public.user_verifications
  FOR EACH ROW EXECUTE FUNCTION public.sync_profile_verified();


-- ------------------------------------------------------------------------------
-- 5. foundation_profiles: only admins approve or reject
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.guard_foundation_status()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL OR public.is_super_admin() THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'INSERT' THEN
    NEW.verification_status := 'pending';
  ELSIF NEW.verification_status IS DISTINCT FROM OLD.verification_status
        AND NEW.verification_status <> 'pending' THEN
    -- Owners may (re)submit for review, nothing else
    NEW.verification_status := OLD.verification_status;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_guard_foundation_status ON public.foundation_profiles;
CREATE TRIGGER trg_guard_foundation_status
  BEFORE INSERT OR UPDATE ON public.foundation_profiles
  FOR EACH ROW EXECUTE FUNCTION public.guard_foundation_status();


-- ------------------------------------------------------------------------------
-- 6. matches: only verified adopters create requests (as 'pending'); adopters can withdraw
--    (status 'rejected') but not approve their own request
-- ------------------------------------------------------------------------------
DROP POLICY IF EXISTS "users_and_foundations_manage_matches" ON public.matches;
DROP POLICY IF EXISTS "matches_select" ON public.matches;
DROP POLICY IF EXISTS "matches_insert_verified_adopter" ON public.matches;
DROP POLICY IF EXISTS "matches_update" ON public.matches;
DROP POLICY IF EXISTS "matches_delete" ON public.matches;

CREATE POLICY "matches_select" ON public.matches
  FOR SELECT USING (
    auth.uid() = user_id
    OR EXISTS (SELECT 1 FROM public.animals a WHERE a.id = matches.animal_id AND a.foundation_id = auth.uid())
    OR public.is_super_admin()
  );

CREATE POLICY "matches_insert_verified_adopter" ON public.matches
  FOR INSERT WITH CHECK (
    (auth.uid() = user_id AND status = 'pending' AND public.current_user_is_verified())
    OR public.is_super_admin()
  );

CREATE POLICY "matches_update" ON public.matches
  FOR UPDATE USING (
    auth.uid() = user_id
    OR EXISTS (SELECT 1 FROM public.animals a WHERE a.id = matches.animal_id AND a.foundation_id = auth.uid())
    OR public.is_super_admin()
  );

CREATE POLICY "matches_delete" ON public.matches
  FOR DELETE USING (
    auth.uid() = user_id
    OR EXISTS (SELECT 1 FROM public.animals a WHERE a.id = matches.animal_id AND a.foundation_id = auth.uid())
    OR public.is_super_admin()
  );

CREATE OR REPLACE FUNCTION public.guard_match_update()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  is_shelter BOOLEAN;
BEGIN
  IF auth.uid() IS NULL OR public.is_super_admin() THEN
    RETURN NEW;
  END IF;

  SELECT EXISTS (SELECT 1 FROM public.animals a WHERE a.id = OLD.animal_id AND a.foundation_id = auth.uid())
    INTO is_shelter;

  -- Nobody but an admin moves a request to another person or animal
  NEW.user_id := OLD.user_id;
  NEW.animal_id := OLD.animal_id;

  -- The adopter can withdraw (rejected); approving / completing is the shelter's call
  IF NOT is_shelter
     AND NEW.status IS DISTINCT FROM OLD.status
     AND NEW.status <> 'rejected' THEN
    NEW.status := OLD.status;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_guard_match_update ON public.matches;
CREATE TRIGGER trg_guard_match_update
  BEFORE UPDATE ON public.matches
  FOR EACH ROW EXECUTE FUNCTION public.guard_match_update();


-- ------------------------------------------------------------------------------
-- 6b. user_verifications: only the owner, admins, and an approved foundation
--     for adopters who requested its animals can read ID card data.
--     The old policy let any account with role 'foundation' (self-chosen at sign-up)
--     read everyone's ID number, name and phone.
-- ------------------------------------------------------------------------------
DROP POLICY IF EXISTS "user_verifications_select" ON public.user_verifications;


-- ------------------------------------------------------------------------------
-- 6c. Trigger functions are only for triggers: not callable through the API (/rest/v1/rpc)
-- ------------------------------------------------------------------------------
REVOKE EXECUTE ON FUNCTION public.guard_profile_privileges(), public.guard_user_verification(),
  public.sync_profile_verified(), public.guard_foundation_status(), public.guard_match_update()
  FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.current_user_is_verified() FROM PUBLIC, anon;


-- ------------------------------------------------------------------------------
-- 7. Backfill profiles.is_verified from the verification rows
--    Accounts verified only by an app shortcut, sign-up metadata or placeholder data
--    (e.g. id_card_no '1xxxxxxxxxxxx') become unverified and must verify again in the app.
-- ------------------------------------------------------------------------------
UPDATE public.profiles p
SET is_verified = public.adopter_verified_internal(p.id)
WHERE p.is_verified IS DISTINCT FROM public.adopter_verified_internal(p.id);


-- ==============================================================================
-- BEFORE YOU RUN — see which accounts step 7 will change (run this on its own first):
--
--   SELECT p.id, p.email, p.full_name, p.is_verified AS now_verified,
--          v.status, v.id_card_no, public.is_valid_thai_id(v.id_card_no) AS id_ok
--   FROM public.profiles p
--   LEFT JOIN public.user_verifications v ON v.id = p.id
--   WHERE p.role = 'user'
--     AND p.is_verified IS DISTINCT FROM COALESCE(
--           v.status = 'verified' AND public.is_valid_thai_id(v.id_card_no)
--           AND length(trim(COALESCE(v.full_name, ''))) > 0
--           AND length(regexp_replace(COALESCE(v.phone, ''), '\D', '', 'g')) BETWEEN 9 AND 10, FALSE);
--
-- (The helper functions above must exist first; run sections 1 and then this query.)
--
-- Also check that no one already made themselves admin:
--   SELECT id, email, role, created_at FROM public.profiles WHERE role = 'super_admin';
-- ==============================================================================
