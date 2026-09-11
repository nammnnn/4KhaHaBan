-- ============================================================
-- 010_incident_foundation_update_policy.sql
-- อนุญาตให้บัญชีมูลนิธิ (foundation) และ แอดมิน (super_admin) สามารถอัปเดตสถานะเคสแจ้งเหตุกู้ภัยได้
-- ============================================================

-- 1. ลบ Policy เดิมที่อนุญาตเฉพาะ super_admin
DROP POLICY IF EXISTS "Admins can update incident reports" ON public.incident_reports;
DROP POLICY IF EXISTS "incident_update" ON public.incident_reports;
DROP POLICY IF EXISTS "Admins and foundations can update incident reports" ON public.incident_reports;

-- 2. สร้าง Policy ใหม่ให้อัปเดตได้ทั้ง super_admin และ foundation
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

-- 3. ตรวจสอบให้แน่ใจว่าทุกคนสามารถ SELECT ได้เพื่อแสดงผลและการแจ้งเตือน
DROP POLICY IF EXISTS "incident_select" ON public.incident_reports;
DROP POLICY IF EXISTS "Public can view incident reports status" ON public.incident_reports;
CREATE POLICY "Public can view incident reports status"
  ON public.incident_reports FOR SELECT
  USING (true);
