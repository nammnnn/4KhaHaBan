-- 018_donation_verification_policies.sql
-- เพิ่มสิทธิ์การอัปเดตและอ่านข้อมูลตาราง donations สำหรับระบบตรวจสอบสลิปมาตรฐาน

-- 1. อนุญาตให้ทุกคน (รวมทั้งผู้ใช้ทั่วไปและผู้ที่ยังไม่ล็อกอิน) สามารถดูยอดบริจาคที่สถานะ completed ได้ เพื่อแสดงผลแถบระดมทุนรวม
DROP POLICY IF EXISTS "Anyone can view completed donations" ON public.donations;
CREATE POLICY "Anyone can view completed donations"
  ON public.donations FOR SELECT
  USING (status = 'completed');

-- 2. อนุญาตให้ Super Admin สามารถแก้ไขสถานะการบริจาค (อนุมัติ/ปฏิเสธสลิป) ได้
DROP POLICY IF EXISTS "Super admins can update donations" ON public.donations;
CREATE POLICY "Super admins can update donations"
  ON public.donations FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'super_admin'
    )
  );

-- 3. อนุญาตให้มูลนิธิที่เป็นเจ้าของปลายทางสามารถแก้ไขสถานะการบริจาคที่ระบุถึงตนเองได้
DROP POLICY IF EXISTS "Foundations can update donations directed to them" ON public.donations;
CREATE POLICY "Foundations can update donations directed to them"
  ON public.donations FOR UPDATE
  USING (
    auth.uid() = foundation_id
  );
