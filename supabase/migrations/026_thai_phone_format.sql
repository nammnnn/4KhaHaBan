-- ==============================================================================
-- 026_thai_phone_format.sql
-- Thai phone numbers start with 0 and have 9-10 digits (02-123-4567, 081-234-5678).
-- Tightens the write checks from 023 (verification) and 025 (profile phone).
-- Only new writes are checked: existing rows are not touched or re-evaluated.
-- ==============================================================================

CREATE OR REPLACE FUNCTION public.is_valid_thai_phone(phone TEXT)
RETURNS BOOLEAN
LANGUAGE sql
IMMUTABLE
SET search_path = public
AS $$
  SELECT regexp_replace(COALESCE(phone, ''), '\D', '', 'g') ~ '^0[0-9]{8,9}$';
$$;

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

    IF NEW.phone IS DISTINCT FROM OLD.phone AND NOT public.is_valid_thai_phone(NEW.phone) THEN
      RAISE EXCEPTION 'phone_required'
        USING ERRCODE = 'check_violation',
              HINT = 'A Thai phone number (starts with 0, 9-10 digits) is required.';
    END IF;
  END IF;

  NEW.is_verified := public.adopter_verified_internal(NEW.id);
  RETURN NEW;
END;
$$;

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
       AND public.is_valid_thai_phone(NEW.phone)
     ) THEN
    RAISE EXCEPTION 'invalid_verification_data'
      USING ERRCODE = 'check_violation',
            HINT = 'A valid Thai ID number, a name and a Thai phone number are required.';
  END IF;

  RETURN NEW;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.guard_profile_privileges(), public.guard_user_verification()
  FROM PUBLIC, anon, authenticated;
