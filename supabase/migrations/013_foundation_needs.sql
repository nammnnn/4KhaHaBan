-- ==============================================================================
-- 4ขาหาบ้าน (4KhaHaBan) — Migration 013: Foundation Needs & Wishlist Schema
-- ==============================================================================

-- 1. สร้างตาราง foundation_needs สำหรับจัดเก็บรายการสิ่งของที่เปิดรับบริจาค
CREATE TABLE IF NOT EXISTS public.foundation_needs (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  foundation_id  uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  item_name      text NOT NULL,
  category       text CHECK (category IN ('food', 'medical', 'hygiene', 'equipment', 'other')) DEFAULT 'food',
  urgency        text CHECK (urgency IN ('critical', 'high', 'normal', 'sufficient')) DEFAULT 'high',
  note           text,
  is_active      boolean DEFAULT true,
  created_at     timestamptz DEFAULT now(),
  updated_at     timestamptz DEFAULT now()
);

-- ฟังก์ชันและ Trigger อัปเดต updated_at อัตโนมัติ
CREATE OR REPLACE FUNCTION update_modified_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_foundation_needs_modtime ON public.foundation_needs;
CREATE TRIGGER update_foundation_needs_modtime
  BEFORE UPDATE ON public.foundation_needs
  FOR EACH ROW EXECUTE FUNCTION update_modified_column();

-- 2. เปิดใช้งาน Row Level Security (RLS)
ALTER TABLE public.foundation_needs ENABLE ROW LEVEL SECURITY;

-- 2.1 ใครก็สามารถดูรายการสิ่งของที่เปิดรับอยู่ได้ (Public Read)
DROP POLICY IF EXISTS "needs_select_public" ON public.foundation_needs;
CREATE POLICY "needs_select_public" ON public.foundation_needs
  FOR SELECT USING (
    is_active = true 
    OR foundation_id = auth.uid() 
    OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'super_admin')
  );

-- 2.2 มูลนิธิสามารถเพิ่มรายการของตัวเองได้
DROP POLICY IF EXISTS "needs_insert_own" ON public.foundation_needs;
CREATE POLICY "needs_insert_own" ON public.foundation_needs
  FOR INSERT WITH CHECK (
    foundation_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.foundation_profiles 
      WHERE id = auth.uid() AND verification_status = 'approved'
    )
  );

-- 2.3 มูลนิธิสามารถแก้ไขรายการของตัวเองได้
DROP POLICY IF EXISTS "needs_update_own" ON public.foundation_needs;
CREATE POLICY "needs_update_own" ON public.foundation_needs
  FOR UPDATE USING (
    foundation_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.foundation_profiles 
      WHERE id = auth.uid() AND verification_status = 'approved'
    )
  );

-- 2.4 มูลนิธิสามารถลบรายการของตัวเองได้
DROP POLICY IF EXISTS "needs_delete_own" ON public.foundation_needs;
CREATE POLICY "needs_delete_own" ON public.foundation_needs
  FOR DELETE USING (
    foundation_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.foundation_profiles 
      WHERE id = auth.uid() AND verification_status = 'approved'
    )
  );

-- 3. เพิ่มข้อมูลตัวอย่างเริ่มต้น (Seed Initial Sample Needs) ให้กับมูลนิธิในระบบ
DO $$
DECLARE
  f_rec RECORD;
BEGIN
  FOR f_rec IN SELECT id, foundation_name FROM public.foundation_profiles WHERE verification_status = 'approved' LIMIT 5 LOOP
    -- ตรวจสอบว่ามีข้อมูลเดิมหรือยัง ถ้ายังไม่มีให้เพิ่มรายการตัวอย่าง
    IF NOT EXISTS (SELECT 1 FROM public.foundation_needs WHERE foundation_id = f_rec.id) THEN
      INSERT INTO public.foundation_needs (foundation_id, item_name, category, urgency, note) VALUES
        (f_rec.id, 'อาหารเม็ดสำหรับสุนัขโต', 'food', 'critical', 'ต้องการสูตรโภชนาการสำหรับสุนัขโตทุกสายพันธุ์'),
        (f_rec.id, 'อาหารเปียกและนมลูกแมว', 'food', 'high', 'สำหรับลูกแมวแรกเกิดและแมวป่วยพักฟื้น'),
        (f_rec.id, 'แผ่นรองซับสิ่งขับถ่าย Size L', 'hygiene', 'high', 'แบบดูดซึมไวเพื่อความสะอาดในกรงพักฟื้น'),
        (f_rec.id, 'ยาป้องกันพยาธิหัวใจและเห็บหมัด', 'medical', 'normal', 'ชนิดหยดหลังคอหรือชนิดเม็ดเคี้ยว'),
        (f_rec.id, 'ทรายแมวเต้าหู้หรือเบนโทไนท์', 'hygiene', 'normal', 'แบบฝุ่นน้อย ปลอดภัยต่อระบบทางเดินหายใจ');
    END IF;
  END LOOP;
END $$;
