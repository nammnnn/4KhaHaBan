-- ==============================================================================
-- 4ขาหาบ้าน (4KhaHaBan) — Migration 020: Resolve Supabase Security Advisor Warnings
-- ==============================================================================
-- 1. แก้ไข RLS ตาราง messages ให้ตรวจสอบสิทธิ์ผ่าน match_id (ผู้รับเลี้ยง หรือ มูลนิธิ)
-- 2. แก้ไข RLS ตาราง matches ให้เข้าถึงได้เฉพาะเจ้าของคำขอ, มูลนิธิเจ้าของสัตว์ หรือ แอดมิน
-- 3. แก้ไข RLS ตาราง swipes ให้เข้าถึงได้เฉพาะผู้ใช้ที่เป็นเจ้าของ
-- 4. ปิดการเรียกฟังก์ชัน Trigger ภายในผ่าน API RPC (handle_new_user, protect_profile_roles_and_status)
-- 5. ตั้งค่า search_path = public, pg_temp ป้องกัน Search Path Mutation
-- ==============================================================================

-- 1. ล็อคความปลอดภัยตารางแชท (messages)
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "messages_policy" ON public.messages;
DROP POLICY IF EXISTS "chat_users_select_messages" ON public.messages;
DROP POLICY IF EXISTS "chat_users_insert_messages" ON public.messages;

CREATE POLICY "chat_users_select_messages" ON public.messages
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.matches m
      JOIN public.animals a ON a.id = m.animal_id
      WHERE m.id = messages.match_id
      AND (m.user_id = auth.uid() OR a.foundation_id = auth.uid())
    ) OR
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'super_admin')
  );

CREATE POLICY "chat_users_insert_messages" ON public.messages
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.matches m
      JOIN public.animals a ON a.id = m.animal_id
      WHERE m.id = match_id
      AND (m.user_id = auth.uid() OR a.foundation_id = auth.uid())
    ) OR
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'super_admin')
  );

-- 2. ล็อคความปลอดภัยตาราง matches
ALTER TABLE public.matches ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "matches_policy" ON public.matches;
DROP POLICY IF EXISTS "users_and_foundations_manage_matches" ON public.matches;

CREATE POLICY "users_and_foundations_manage_matches" ON public.matches
  FOR ALL USING (
    auth.uid() = user_id OR
    EXISTS (
      SELECT 1 FROM public.animals a
      WHERE a.id = matches.animal_id
      AND a.foundation_id = auth.uid()
    ) OR
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'super_admin')
  );

-- 3. ล็อคความปลอดภัยตาราง swipes
ALTER TABLE public.swipes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "swipes_policy" ON public.swipes;
DROP POLICY IF EXISTS "users_manage_own_swipes" ON public.swipes;

CREATE POLICY "users_manage_own_swipes" ON public.swipes
  FOR ALL USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- 4. ปิดการเรียกฟังก์ชัน Trigger ภายในผ่าน API ภายนอก (ป้องกัน RPC Abuse)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'handle_new_user') THEN
    EXECUTE 'REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM public, anon, authenticated';
  END IF;
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'protect_profile_roles_and_status') THEN
    EXECUTE 'REVOKE EXECUTE ON FUNCTION public.protect_profile_roles_and_status() FROM public, anon, authenticated';
  END IF;
END $$;

-- 5. แก้ไข Search Path Mutable ในฟังก์ชันต่างๆ
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'update_modified_column') THEN
    EXECUTE 'ALTER FUNCTION public.update_modified_column() SET search_path = public, pg_temp';
  END IF;
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'is_super_admin') THEN
    EXECUTE 'ALTER FUNCTION public.is_super_admin() SET search_path = public, pg_temp';
  END IF;
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'get_incident_stats') THEN
    EXECUTE 'ALTER FUNCTION public.get_incident_stats() SET search_path = public, pg_temp';
  END IF;
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'get_my_role') THEN
    EXECUTE 'ALTER FUNCTION public.get_my_role() SET search_path = public, pg_temp';
  END IF;
END $$;
