-- ============================================================
-- 4ขาหาบ้าน (4KhaHaBan) — Phase 2: Foundation Animals
-- ============================================================

-- 1. สร้างตาราง animals
CREATE TABLE IF NOT EXISTS public.animals (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  foundation_id  uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  name           text NOT NULL,
  type           text CHECK (type IN ('dog', 'cat', 'other')) NOT NULL,
  age            text,
  gender         text CHECK (gender IN ('male', 'female', 'unknown')),
  size           text CHECK (size IN ('small', 'medium', 'large')),
  images         text[] DEFAULT '{}',
  tags           text[] DEFAULT '{}',
  story          text,
  status         text CHECK (status IN ('available', 'adopted', 'hidden')) DEFAULT 'available',
  created_at     timestamptz DEFAULT now(),
  updated_at     timestamptz DEFAULT now()
);

-- Trigger อัปเดต updated_at
CREATE OR REPLACE FUNCTION update_modified_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_animals_modtime ON public.animals;
CREATE TRIGGER update_animals_modtime
  BEFORE UPDATE ON public.animals
  FOR EACH ROW EXECUTE FUNCTION update_modified_column();

-- 2. RLS Policies สำหรับ animals
ALTER TABLE public.animals ENABLE ROW LEVEL SECURITY;

-- 2.1 ใครๆ ก็ดูสัตว์ที่ available ได้
DROP POLICY IF EXISTS "animals_select_available" ON public.animals;
CREATE POLICY "animals_select_available" ON public.animals
  FOR SELECT USING (
    status = 'available' 
    OR foundation_id = auth.uid() 
    OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'super_admin')
  );

-- 2.2 มูลนิธิ insert/update ได้เฉพาะของตัวเอง และต้องเป็น foundation ที่ approved
DROP POLICY IF EXISTS "animals_insert_own" ON public.animals;
CREATE POLICY "animals_insert_own" ON public.animals
  FOR INSERT WITH CHECK (
    foundation_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.foundation_profiles 
      WHERE id = auth.uid() AND verification_status = 'approved'
    )
  );

DROP POLICY IF EXISTS "animals_update_own" ON public.animals;
CREATE POLICY "animals_update_own" ON public.animals
  FOR UPDATE USING (
    foundation_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.foundation_profiles 
      WHERE id = auth.uid() AND verification_status = 'approved'
    )
  );

DROP POLICY IF EXISTS "animals_delete_own" ON public.animals;
CREATE POLICY "animals_delete_own" ON public.animals
  FOR DELETE USING (
    foundation_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.foundation_profiles 
      WHERE id = auth.uid() AND verification_status = 'approved'
    )
  );


-- 3. Storage Bucket สำหรับรูปสัตว์ (public)
-- หมายเหตุ: ต้องไปสร้าง bucket 'animal-images' ใน Supabase Dashboard → Storage
-- ตั้งเป็น Public bucket
-- Policy: 
--   - authenticated users (ที่ role=foundation) can upload
--   - public can read all files
