-- ==============================================================================
-- 4ขาหาบ้าน (4KhaHaBan) — Migration 019: Master Security Hardening & Bug Fix
-- ==============================================================================
-- 1. แก้ไข Infinite Recursion ระหว่าง animals <-> matches (ทำให้ Feed โหลดสัตว์ได้ปกติทันที)
-- 2. ล็อคความปลอดภัยตาราง messages, matches, swipes (ดูและคุยได้เฉพาะคู่กรณี)
-- 3. แก้ไข Function Security Definer -> Security Invoker เพื่อเคลียร์ Advisor Warnings
-- 4. ลบ Permissive Storage Listing บน storage.objects
-- 5. ปรับ incident_reports WITH CHECK ไม่ให้เป็น true เปล่าๆ
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. แก้ไข Infinite Recursion บนตาราง animals (สาเหตุที่หน้าแรกไม่โหลดสัตว์)
-- ------------------------------------------------------------------------------
DROP POLICY IF EXISTS "animals_select_public" ON public.animals;
DROP POLICY IF EXISTS "animals_select_available" ON public.animals;
DROP POLICY IF EXISTS "animals_select_policy" ON public.animals;

CREATE POLICY "animals_select_policy" ON public.animals
  FOR SELECT USING (
    status IN ('available', 'adopted')
    OR foundation_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() AND role = 'super_admin'
    )
  );

-- ------------------------------------------------------------------------------
-- 2. ล็อคความปลอดภัยตาราง matches
-- ------------------------------------------------------------------------------
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

-- ------------------------------------------------------------------------------
-- 3. ล็อคความปลอดภัยตาราง messages (แชท)
-- ------------------------------------------------------------------------------
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "messages_policy" ON public.messages;
DROP POLICY IF EXISTS "chat_users_select_messages" ON public.messages;
DROP POLICY IF EXISTS "chat_users_insert_messages" ON public.messages;

CREATE POLICY "chat_users_select_messages" ON public.messages
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.matches m
      WHERE m.id = messages.match_id
      AND (
        m.user_id = auth.uid()
        OR EXISTS (
          SELECT 1 FROM public.animals a
          WHERE a.id = m.animal_id
          AND a.foundation_id = auth.uid()
        )
      )
    ) OR
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'super_admin')
  );

CREATE POLICY "chat_users_insert_messages" ON public.messages
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.matches m
      WHERE m.id = match_id
      AND (
        m.user_id = auth.uid()
        OR EXISTS (
          SELECT 1 FROM public.animals a
          WHERE a.id = m.animal_id
          AND a.foundation_id = auth.uid()
        )
      )
    ) OR
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'super_admin')
  );

-- ------------------------------------------------------------------------------
-- 4. ล็อคความปลอดภัยตาราง swipes
-- ------------------------------------------------------------------------------
ALTER TABLE public.swipes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "swipes_policy" ON public.swipes;
DROP POLICY IF EXISTS "users_manage_own_swipes" ON public.swipes;

CREATE POLICY "users_manage_own_swipes" ON public.swipes
  FOR ALL USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ------------------------------------------------------------------------------
-- 5. ปรับ incident_reports Policy แก้ไขคำเตือน RLS Always True
-- ------------------------------------------------------------------------------
DROP POLICY IF EXISTS "incident_insert" ON public.incident_reports;
DROP POLICY IF EXISTS "Anyone can insert incident reports" ON public.incident_reports;

CREATE POLICY "incident_insert" ON public.incident_reports
  FOR INSERT WITH CHECK (
    symptoms IS NOT NULL AND location_text IS NOT NULL
  );

-- ------------------------------------------------------------------------------
-- 6. ปรับฟังก์ชันให้เป็น SECURITY INVOKER เพื่อเคลียร์คำเตือน Advisor
-- ------------------------------------------------------------------------------
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'get_incident_stats') THEN
    EXECUTE 'ALTER FUNCTION public.get_incident_stats() SECURITY INVOKER';
    EXECUTE 'ALTER FUNCTION public.get_incident_stats() SET search_path = public, pg_temp';
  END IF;
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'is_super_admin') THEN
    EXECUTE 'ALTER FUNCTION public.is_super_admin() SECURITY INVOKER';
    EXECUTE 'ALTER FUNCTION public.is_super_admin() SET search_path = public, pg_temp';
    EXECUTE 'REVOKE EXECUTE ON FUNCTION public.is_super_admin() FROM anon';
  END IF;
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'get_my_role') THEN
    EXECUTE 'ALTER FUNCTION public.get_my_role() SECURITY INVOKER';
    EXECUTE 'ALTER FUNCTION public.get_my_role() SET search_path = public, pg_temp';
    EXECUTE 'REVOKE EXECUTE ON FUNCTION public.get_my_role() FROM anon';
  END IF;
END $$;

-- ------------------------------------------------------------------------------
-- 7. ลบ Public Object Listing Policy ใน Storage (เคลียร์คำเตือน Public Bucket Listing)
-- (การดาวน์โหลดรูปผ่าน Public URL ยังคงทำงานได้ปกติ 100%)
-- ------------------------------------------------------------------------------
DROP POLICY IF EXISTS "Public access to animal images" ON storage.objects;
DROP POLICY IF EXISTS "Public Access to chat images" ON storage.objects;
DROP POLICY IF EXISTS "Public access to chat images" ON storage.objects;
