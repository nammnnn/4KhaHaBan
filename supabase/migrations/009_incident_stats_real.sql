-- ============================================================
-- 009_incident_stats_real.sql
-- ปรับปรุงการคำนวณสถิติแจ้งเบาะแสสัตว์จรจัดให้เป็นข้อมูลจริง 100% จากฐานข้อมูล
-- ============================================================

-- 1. สร้าง Function get_incident_stats แบบ SECURITY DEFINER 
-- เพื่อให้คำนวณยอดรวมของทั้งระบบได้แม่นยำ ปลอดภัย และรวดเร็ว
CREATE OR REPLACE FUNCTION public.get_incident_stats()
RETURNS json
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT json_build_object(
    'inProgress', COALESCE((SELECT count(*) FROM public.incident_reports WHERE status IN ('pending', 'in_progress')), 0),
    'resolved', COALESCE((SELECT count(*) FROM public.incident_reports WHERE status = 'resolved'), 0)
  );
$$;

-- ให้สิทธิ์ผู้ใช้ทั่วไปและผู้ใช้ที่ล็อกอินสามารถเรียกใช้งานฟังก์ชันได้
GRANT EXECUTE ON FUNCTION public.get_incident_stats() TO anon, authenticated;

-- 2. เพิ่ม Policy ให้อ่านข้อมูลแจ้งเหตุเพื่อดูสถิติได้แบบสาธารณะ
DROP POLICY IF EXISTS "Public can view incident reports status" ON public.incident_reports;
CREATE POLICY "Public can view incident reports status"
  ON public.incident_reports FOR SELECT
  USING (true);
