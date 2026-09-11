-- ============================================================
-- 011_incident_dispatch_lock.sql
-- เพิ่มคอลัมน์ผู้รับผิดชอบเคส และเวลาการเข้าช่วยเหลือเพื่อป้องกันการรับเคสซ้ำซ้อน
-- ============================================================

DO $$
BEGIN
  -- 1. เพิ่ม rescuer_id (UUID ของมูลนิธิที่รับเคส)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'incident_reports' 
    AND column_name = 'rescuer_id'
  ) THEN
    ALTER TABLE public.incident_reports 
      ADD COLUMN rescuer_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL;
  END IF;

  -- 2. เพิ่ม rescuer_name (ชื่อมูลนิธิ/ผู้รับเคส)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'incident_reports' 
    AND column_name = 'rescuer_name'
  ) THEN
    ALTER TABLE public.incident_reports 
      ADD COLUMN rescuer_name TEXT;
  END IF;

  -- 3. เพิ่ม rescuer_phone (เบอร์โทรผู้รับเคสสำหรับประสานงาน)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'incident_reports' 
    AND column_name = 'rescuer_phone'
  ) THEN
    ALTER TABLE public.incident_reports 
      ADD COLUMN rescuer_phone TEXT;
  END IF;

  -- 4. เพิ่ม accepted_at (เวลาที่กดรับเคส)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'incident_reports' 
    AND column_name = 'accepted_at'
  ) THEN
    ALTER TABLE public.incident_reports 
      ADD COLUMN accepted_at TIMESTAMPTZ;
  END IF;

  -- 5. เพิ่ม resolved_at (เวลาที่ช่วยเหลือสำเร็จ)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'incident_reports' 
    AND column_name = 'resolved_at'
  ) THEN
    ALTER TABLE public.incident_reports 
      ADD COLUMN resolved_at TIMESTAMPTZ;
  END IF;
END $$;

-- 6. อัปเดต RLS Policy ให้อนุญาตทั้ง super_admin และ foundation ทำการ UPDATE ได้
DROP POLICY IF EXISTS "Admins and foundations can update incident reports" ON public.incident_reports;
DROP POLICY IF EXISTS "Foundations can update incident reports" ON public.incident_reports;

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
