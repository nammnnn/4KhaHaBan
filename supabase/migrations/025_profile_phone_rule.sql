-- ==============================================================================
-- 025_profile_phone_rule.sql
-- A person's phone can be changed but not wiped or set to something that isn't a phone:
-- foundations call adopters on it. Applies only when the phone actually changes, so
-- existing accounts without a phone are untouched until they edit it.
-- Admins and trusted contexts (auth.uid() IS NULL) are not limited.
-- Extends guard_profile_privileges() from 023.
-- ==============================================================================

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

    IF NEW.phone IS DISTINCT FROM OLD.phone
       AND length(regexp_replace(COALESCE(NEW.phone, ''), '\D', '', 'g')) NOT BETWEEN 9 AND 10 THEN
      RAISE EXCEPTION 'phone_required'
        USING ERRCODE = 'check_violation',
              HINT = 'A 9-10 digit phone number is required.';
    END IF;
  END IF;

  NEW.is_verified := public.adopter_verified_internal(NEW.id);
  RETURN NEW;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.guard_profile_privileges() FROM PUBLIC, anon, authenticated;
