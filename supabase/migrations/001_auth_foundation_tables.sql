-- ============================================================
-- 4ขาหาบ้าน (4KhaHaBan) — Auth System Redesign Migration
-- ============================================================
-- วิธีใช้: copy ทั้ง file นี้ไปรันใน Supabase Dashboard → SQL Editor
-- ============================================================

-- 1. ปรับตาราง profiles (ถ้าจำเป็น)
-- เพิ่ม role check constraint ถ้ายังไม่มี
DO $$
BEGIN
  -- ลบ constraint เดิมถ้ามี
  ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
  -- เพิ่ม constraint ใหม่
  ALTER TABLE public.profiles ADD CONSTRAINT profiles_role_check
    CHECK (role IN ('user', 'foundation', 'super_admin'));
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Could not update profiles role constraint: %', SQLERRM;
END $$;

-- ลบคอลัมน์เก่าที่ไม่ใช้แล้ว (verification_status, verification_document_url จาก profiles)
-- ย้ายไปอยู่ใน foundation_profiles แทน
-- หมายเหตุ: ไม่ลบตอนนี้เพื่อความปลอดภัย ถ้ามีข้อมูลเดิม ให้ migrate ไปก่อนแล้วค่อยลบ


-- 2. สร้างตาราง foundation_profiles
CREATE TABLE IF NOT EXISTS public.foundation_profiles (
  id                  uuid PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  foundation_name     text NOT NULL,
  registration_no     text,
  address             text,
  contact_phone       text,
  contact_person      text,
  description         text,
  verification_status text CHECK (verification_status IN ('pending', 'approved', 'rejected')) DEFAULT 'pending',
  rejection_reason    text,
  submitted_at        timestamptz DEFAULT now(),
  reviewed_at         timestamptz,
  reviewed_by         uuid REFERENCES public.profiles(id)
);

-- 3. สร้างตาราง foundation_documents
CREATE TABLE IF NOT EXISTS public.foundation_documents (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  foundation_id  uuid REFERENCES public.foundation_profiles(id) ON DELETE CASCADE,
  doc_type       text CHECK (doc_type IN ('registration_cert', 'id_card', 'address_proof', 'other')),
  file_path      text NOT NULL,
  uploaded_at    timestamptz DEFAULT now()
);

-- 4. สร้างตาราง admin_audit_log
CREATE TABLE IF NOT EXISTS public.admin_audit_log (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id     uuid REFERENCES public.profiles(id),
  action       text NOT NULL,
  target_id    uuid,
  detail       jsonb,
  created_at   timestamptz DEFAULT now()
);


-- 5. Postgres trigger: สร้าง profile อัตโนมัติเมื่อ user สมัคร
-- แทนที่การ insert จาก frontend ที่ถูก RLS บล็อก
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, avatar_url, role, created_at)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', ''),
    COALESCE(NEW.raw_user_meta_data->>'avatar_url', ''),
    COALESCE(NEW.raw_user_meta_data->>'role', 'user'),
    now()
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    full_name = COALESCE(NULLIF(EXCLUDED.full_name, ''), public.profiles.full_name),
    avatar_url = COALESCE(NULLIF(EXCLUDED.avatar_url, ''), public.profiles.avatar_url);
  RETURN NEW;
END;
$$;

-- ลบ trigger เดิมถ้ามี แล้วสร้างใหม่
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();


-- 6. RLS Policies

-- foundation_profiles: มูลนิธิอ่าน/แก้ได้เฉพาะแถวตัวเอง, admin อ่าน/แก้ได้ทุกแถว
ALTER TABLE public.foundation_profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "foundation_profiles_select_own" ON public.foundation_profiles;
CREATE POLICY "foundation_profiles_select_own" ON public.foundation_profiles
  FOR SELECT USING (
    auth.uid() = id
    OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'super_admin')
  );

DROP POLICY IF EXISTS "foundation_profiles_insert_own" ON public.foundation_profiles;
CREATE POLICY "foundation_profiles_insert_own" ON public.foundation_profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "foundation_profiles_update_own" ON public.foundation_profiles;
CREATE POLICY "foundation_profiles_update_own" ON public.foundation_profiles
  FOR UPDATE USING (
    auth.uid() = id
    OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'super_admin')
  );

-- foundation_documents: เจ้าของอัปโหลด/อ่านเฉพาะของตัวเอง, admin อ่านได้ทุกแถว
ALTER TABLE public.foundation_documents ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "foundation_documents_select" ON public.foundation_documents;
CREATE POLICY "foundation_documents_select" ON public.foundation_documents
  FOR SELECT USING (
    auth.uid() = foundation_id
    OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'super_admin')
  );

DROP POLICY IF EXISTS "foundation_documents_insert" ON public.foundation_documents;
CREATE POLICY "foundation_documents_insert" ON public.foundation_documents
  FOR INSERT WITH CHECK (auth.uid() = foundation_id);

-- admin_audit_log: admin อ่านได้ทุกแถว, insert ได้เฉพาะ admin
ALTER TABLE public.admin_audit_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "admin_audit_log_select" ON public.admin_audit_log;
CREATE POLICY "admin_audit_log_select" ON public.admin_audit_log
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'super_admin')
  );

DROP POLICY IF EXISTS "admin_audit_log_insert" ON public.admin_audit_log;
CREATE POLICY "admin_audit_log_insert" ON public.admin_audit_log
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'super_admin')
  );


-- 7. สร้าง Storage Bucket สำหรับเอกสารมูลนิธิ (private)
-- หมายเหตุ: ต้องไปสร้าง bucket 'foundation-docs' ใน Supabase Dashboard → Storage
-- ตั้งเป็น private bucket (ไม่ public)
-- แล้วเพิ่ม policy:
--   - authenticated users can upload to their own folder: foundation-docs/{user_id}/*
--   - super_admin can read all files

-- ============================================================
-- เสร็จสิ้น — กรุณาตรวจสอบว่า run สำเร็จทุก statement
-- ============================================================
