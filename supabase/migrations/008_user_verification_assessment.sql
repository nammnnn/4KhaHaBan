-- ------------------------------------------------------------------------------
-- 008_user_verification_assessment.sql
-- เพิ่มตาราง/ฟิลด์ assessment สำหรับเก็บแบบประเมินความพร้อมก่อนรับเลี้ยงในตาราง user_verifications
-- ------------------------------------------------------------------------------

-- 1. สร้างตาราง user_verifications หากยังไม่มี
CREATE TABLE IF NOT EXISTS public.user_verifications (
  id              UUID PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  full_name       TEXT NOT NULL,
  id_card_no      TEXT NOT NULL,
  phone           TEXT NOT NULL,
  assessment      JSONB DEFAULT '{}'::jsonb,
  status          TEXT NOT NULL DEFAULT 'verified' CHECK (status IN ('pending', 'verified', 'rejected')),
  created_at      TIMESTAMPTZ DEFAULT now()
);

-- 2. เพิ่มฟิลด์ assessment หากมีตารางเดิมอยู่แล้ว
ALTER TABLE public.user_verifications
  ADD COLUMN IF NOT EXISTS assessment JSONB DEFAULT '{}'::jsonb;

-- 3. เปิดใช้งาน Row Level Security
ALTER TABLE public.user_verifications ENABLE ROW LEVEL SECURITY;

-- 4. อนุญาตให้ผู้ใช้ที่เป็นเจ้าของ หรือ มูลนิธิ/แอดมิน สามารถอ่านข้อมูลการยืนยันตัวตนได้
DROP POLICY IF EXISTS "user_verifications_policy" ON public.user_verifications;
CREATE POLICY "user_verifications_policy" ON public.user_verifications
  FOR ALL USING (
    auth.uid() = id OR
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('super_admin', 'foundation'))
  );
