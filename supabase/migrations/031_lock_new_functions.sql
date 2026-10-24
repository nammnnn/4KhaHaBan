-- 031: tighten EXECUTE on the functions added in 029 / 030 (Supabase security advisor).
-- Trigger functions never need to be callable through the API; current_user_is_banned() is only
-- needed by signed-in users (it is used inside RLS policies that apply TO authenticated).
REVOKE EXECUTE ON FUNCTION public.guard_ban_details() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.log_promptpay_change() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.current_user_is_banned() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.current_user_is_banned() TO authenticated;
