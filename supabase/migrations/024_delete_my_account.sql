-- ==============================================================================
-- 024_delete_my_account.sql
-- Lets a signed-in adopter or foundation delete their own account (PDPA right to erasure,
-- and required by the App Store / Google Play for apps with sign-up).
--
-- Deleting the auth.users row cascades to profiles and from there to everything the person
-- owns: user_verifications (ID card data), matches + messages, swipes, donations, support
-- chats, reports, blocks, foundation_profiles/animals/needs. Incident reports they filed are
-- kept for the rescue record with user_id set to NULL (existing ON DELETE SET NULL).
--
-- Admins can't delete themselves here (audit log and foundation reviews point at them);
-- another admin or the Supabase dashboard handles that.
-- ==============================================================================

CREATE OR REPLACE FUNCTION public.delete_my_account()
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid UUID := auth.uid();
BEGIN
  IF uid IS NULL THEN
    RAISE EXCEPTION 'not_signed_in' USING ERRCODE = '42501';
  END IF;

  IF public.is_super_admin() THEN
    RAISE EXCEPTION 'admin_cannot_self_delete' USING ERRCODE = '42501';
  END IF;

  DELETE FROM auth.users WHERE id = uid;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.delete_my_account() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.delete_my_account() TO authenticated;
