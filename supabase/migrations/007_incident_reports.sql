-- ============================================================
-- 007_incident_reports.sql
-- เพิ่มตารางแจ้งเบาะแสสัตว์จรจัด และคอลัมน์แนบสลิปในตารางบริจาค
-- ============================================================

-- 1. ตารางแจ้งเบาะแสสัตว์จรจัด (Incident Reports)
CREATE TABLE IF NOT EXISTS public.incident_reports (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  animal_type     TEXT NOT NULL DEFAULT 'dog',
  symptoms        TEXT NOT NULL,
  location_text   TEXT NOT NULL,
  latitude        NUMERIC(10, 7),
  longitude       NUMERIC(10, 7),
  reporter_name   TEXT,
  reporter_phone  TEXT,
  image_url       TEXT,
  status          TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'resolved', 'cancelled')),
  created_at      TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.incident_reports ENABLE ROW LEVEL SECURITY;

-- Policy: ทุกคน (ทั้งล็อกอินและไม่ล็อกอิน) สามารถส่งรายงานแจ้งเหตุได้
CREATE POLICY "Anyone can insert incident reports"
  ON public.incident_reports FOR INSERT
  WITH CHECK (true);

-- Policy: ผู้ใช้ดูรายงานที่ตัวเองแจ้งได้
CREATE POLICY "Users can view own incident reports"
  ON public.incident_reports FOR SELECT
  USING (auth.uid() = user_id);

-- Policy: Super Admin และ มูลนิธิสามารถดูรายงานทั้งหมดได้
CREATE POLICY "Admins and foundations can view all incident reports"
  ON public.incident_reports FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('super_admin', 'foundation')
    )
  );

-- Policy: Super Admin และ มูลนิธิ สามารถอัปเดตสถานะรายงานได้
CREATE POLICY "Admins and foundations can update incident reports"
  ON public.incident_reports FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('super_admin', 'foundation')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('super_admin', 'foundation')
    )
  );

-- 2. เพิ่มคอลัมน์ slip_url และ foundation_id ในตาราง donations (ถ้ายังไม่มี)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'donations' 
    AND column_name = 'slip_url'
  ) THEN
    ALTER TABLE public.donations ADD COLUMN slip_url TEXT;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'donations' 
    AND column_name = 'foundation_id'
  ) THEN
    ALTER TABLE public.donations ADD COLUMN foundation_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL;
  END IF;
END $$;
