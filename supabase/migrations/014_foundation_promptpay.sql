-- ============================================================
-- Migration 014: Add promptpay_number to foundation_profiles
-- ============================================================
-- 1. เพิ่มคอลัมน์ promptpay_number เพื่อให้มูลนิธิสามารถระบุเบอร์พร้อมเพย์
-- หรือเลขประจำตัวประชาชน/เลขนิติบุคคล สำหรับรับเงินบริจาคโดยตรง
-- 2. อนุญาตให้ทุกคน (รวมถึงผู้บริจาคทั่วไปที่ยังไม่ได้ล็อกอิน) 
-- สามารถดูข้อมูลมูลนิธิที่ได้รับการรับรอง (approved) เพื่อโอนบริจาคและส่งของได้
-- ============================================================

ALTER TABLE public.foundation_profiles 
ADD COLUMN IF NOT EXISTS promptpay_number text;

COMMENT ON COLUMN public.foundation_profiles.promptpay_number IS 'เบอร์พร้อมเพย์ (เบอร์โทรศัพท์มือถือ หรือ เลขประจำตัวผู้เสียภาษี/นิติบุคคล 13 หลัก) สำหรับรับเงินบริจาค';

-- RLS Policy: อนุญาตให้อ่านข้อมูลมูลนิธิที่ผ่านการอนุมัติแล้วได้ทั่วไป
DROP POLICY IF EXISTS "foundation_profiles_select_approved" ON public.foundation_profiles;
CREATE POLICY "foundation_profiles_select_approved" ON public.foundation_profiles
  FOR SELECT USING (verification_status = 'approved');
