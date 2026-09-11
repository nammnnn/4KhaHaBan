-- ==============================================================================
-- 4ขาหาบ้าน (4KhaHaBan) — Database Reset Script (ล้างตารางทั้งหมดเพื่อเริ่มใหม่)
-- ==============================================================================
-- คำเตือน: สคริปต์นี้จะลบตารางและข้อมูลทั้งหมดใน public schema
-- ใช้เมื่อต้องการล้างระบบให้สะอาดหมดจด 100% ก่อนรัน complete_setup.sql ใหม่อีกครั้ง
-- ==============================================================================

-- 1. ลบตารางทั้งหมดแบบ CASCADE
DROP TABLE IF EXISTS public.admin_audit_log CASCADE;
DROP TABLE IF EXISTS public.incident_reports CASCADE;
DROP TABLE IF EXISTS public.blocks CASCADE;
DROP TABLE IF EXISTS public.reports CASCADE;
DROP TABLE IF EXISTS public.support_messages CASCADE;
DROP TABLE IF EXISTS public.support_chats CASCADE;
DROP TABLE IF EXISTS public.donations CASCADE;
DROP TABLE IF EXISTS public.messages CASCADE;
DROP TABLE IF EXISTS public.matches CASCADE;
DROP TABLE IF EXISTS public.swipes CASCADE;
DROP TABLE IF EXISTS public.animals CASCADE;
DROP TABLE IF EXISTS public.user_verifications CASCADE;
DROP TABLE IF EXISTS public.foundation_documents CASCADE;
DROP TABLE IF EXISTS public.foundation_profiles CASCADE;
DROP TABLE IF EXISTS public.profiles CASCADE;

-- 2. ลบ Trigger และ Function ที่เกี่ยวข้อง
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;
DROP FUNCTION IF EXISTS public.update_modified_column() CASCADE;

-- 3. ล้างสิทธิ์ใน Publication (ถ้ามี)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    BEGIN
      ALTER PUBLICATION supabase_realtime DROP TABLE public.messages;
    EXCEPTION WHEN OTHERS THEN NULL;
    END;
    BEGIN
      ALTER PUBLICATION supabase_realtime DROP TABLE public.matches;
    EXCEPTION WHEN OTHERS THEN NULL;
    END;
    BEGIN
      ALTER PUBLICATION supabase_realtime DROP TABLE public.support_messages;
    EXCEPTION WHEN OTHERS THEN NULL;
    END;
    BEGIN
      ALTER PUBLICATION supabase_realtime DROP TABLE public.incident_reports;
    EXCEPTION WHEN OTHERS THEN NULL;
    END;
  END IF;
END $$;
