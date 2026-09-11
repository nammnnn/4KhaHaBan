-- ============================================================
-- 4ขาหาบ้าน (4KhaHaBan) — Post-Adoption Follow-up Migration
-- ============================================================
-- วิธีใช้: copy file นี้ไปรันใน Supabase Dashboard → SQL Editor
-- ============================================================

-- 1. เพิ่มคอลัมน์ในตาราง matches เพื่อรองรับการส่งมอบสัตว์เลี้ยง
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'matches' AND column_name = 'handover_date'
  ) THEN
    ALTER TABLE public.matches ADD COLUMN handover_date timestamptz;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'matches' AND column_name = 'adoption_notes'
  ) THEN
    ALTER TABLE public.matches ADD COLUMN adoption_notes text;
  END IF;
END $$;

-- 2. สร้างตาราง adoption_followups (ประวัติการส่งอัปเดตสถานะทุก 2 เดือน)
CREATE TABLE IF NOT EXISTS public.adoption_followups (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id          uuid NOT NULL REFERENCES public.matches(id) ON DELETE CASCADE,
  animal_id         text NOT NULL,
  user_id           uuid NOT NULL REFERENCES public.profiles(id),
  foundation_id     uuid REFERENCES public.profiles(id),
  milestone_index   integer NOT NULL DEFAULT 1,
  milestone_label   text NOT NULL DEFAULT 'ครั้งที่ 1 (ครบ 2 เดือน)',
  due_date          timestamptz NOT NULL,
  submitted_at      timestamptz DEFAULT now(),
  photos            text[] DEFAULT '{}',
  health_status     text DEFAULT 'แข็งแรงดี',
  vaccine_status    text DEFAULT 'ครบแล้ว',
  neutered_status   text DEFAULT 'แล้ว',
  food_status       text DEFAULT 'กินอาหารเม็ด + อาหารเปียก',
  behavior_status   text DEFAULT 'ปรับตัวได้ดี ร่าเริง',
  notes             text,
  is_reviewed       boolean DEFAULT false,
  reviewed_at       timestamptz,
  created_at        timestamptz DEFAULT now()
);

-- Index สำหรับค้นหาตาม match_id และ user_id
CREATE INDEX IF NOT EXISTS idx_adoption_followups_match ON public.adoption_followups(match_id);
CREATE INDEX IF NOT EXISTS idx_adoption_followups_user ON public.adoption_followups(user_id);
CREATE INDEX IF NOT EXISTS idx_adoption_followups_animal ON public.adoption_followups(animal_id);

-- 3. Row Level Security (RLS)
ALTER TABLE public.adoption_followups ENABLE ROW LEVEL SECURITY;

-- ผู้รับเลี้ยง และมูลนิธิเจ้าของสัตว์เลี้ยง หรือ super_admin สามารถอ่านได้
DROP POLICY IF EXISTS "followups_select_policy" ON public.adoption_followups;
CREATE POLICY "followups_select_policy" ON public.adoption_followups
  FOR SELECT USING (
    auth.uid() = user_id OR
    auth.uid() = foundation_id OR
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'super_admin')
  );

-- ผู้รับเลี้ยงสามารถบันทึกส่งรายงานได้
DROP POLICY IF EXISTS "followups_insert_policy" ON public.adoption_followups;
CREATE POLICY "followups_insert_policy" ON public.adoption_followups
  FOR INSERT WITH CHECK (
    auth.uid() = user_id OR
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('foundation', 'super_admin'))
  );

-- มูลนิธิสามารถอัปเดตการตรวจสอบ (is_reviewed) หรือผู้รับเลี้ยงแก้ไขข้อมูลตนเอง
DROP POLICY IF EXISTS "followups_update_policy" ON public.adoption_followups;
CREATE POLICY "followups_update_policy" ON public.adoption_followups
  FOR UPDATE USING (
    auth.uid() = user_id OR
    auth.uid() = foundation_id OR
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'super_admin')
  );
