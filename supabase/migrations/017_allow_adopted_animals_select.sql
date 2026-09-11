-- ============================================================
-- 4ขาหาบ้าน (4KhaHaBan) — Allow Adopters to View Adopted Animals
-- Migration 017: แก้ไข RLS บนตาราง animals
-- ============================================================
-- วิธีใช้: copy โค้ดนี้ไปรันใน Supabase Dashboard → SQL Editor แล้วกด Run
-- ============================================================

-- ปัญหาเดิม:
-- นโยบายเดิม (animals_select_available) อนุญาตให้บุคคลทั่วไปและผู้รับเลี้ยงดูได้เฉพาะสัตว์ที่ status = 'available'
-- เมื่อมูลนิธิยืนยันการรับเลี้ยงแล้ว สถานะของสัตว์จะเปลี่ยนเป็น 'adopted' (ได้บ้านแล้ว)
-- ส่งผลให้ RLS บล็อกไม่ให้ผู้รับเลี้ยงดึงข้อมูลสัตว์ตัวนั้นได้ จนชื่อแสดงเป็น "สัตว์เลี้ยง (ไม่มีข้อมูล)" และแชทไม่โหลด

-- นโยบายใหม่:
-- 1. อนุญาตให้ทุกคนสามารถดูข้อมูลสัตว์ที่ status เป็น 'available' หรือ 'adopted' ได้
-- 2. อนุญาตให้ผู้รับเลี้ยงที่มีประวัติคำขอ (Match) กับสัตว์ตัวนั้น สามารถเข้าถึงข้อมูลสัตว์ตัวนั้นได้เสมอ
-- 3. มูลนิธิเจ้าของสัตว์และแอดมินยังคงเข้าถึงได้ทุกสถานะตามเดิม

DROP POLICY IF EXISTS "animals_select_available" ON public.animals;
DROP POLICY IF EXISTS "animals_select_public" ON public.animals;

CREATE POLICY "animals_select_public" ON public.animals
  FOR SELECT USING (
    status IN ('available', 'adopted')
    OR foundation_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.matches 
      WHERE matches.animal_id = animals.id 
      AND matches.user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() AND role = 'super_admin'
    )
  );
