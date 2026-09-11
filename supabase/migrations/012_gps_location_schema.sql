-- ==============================================================================
-- 4ขาหาบ้าน (4KhaHaBan) — Migration 012: GPS Location Schema & Sample Coordinates
-- ==============================================================================

-- 1. เพิ่มคอลัมน์พิกัด Latitude, Longitude ให้กับ foundation_profiles
ALTER TABLE public.foundation_profiles 
  ADD COLUMN IF NOT EXISTS latitude DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS longitude DOUBLE PRECISION;

-- 2. เพิ่มคอลัมน์พิกัด Latitude, Longitude ให้กับ animals
ALTER TABLE public.animals 
  ADD COLUMN IF NOT EXISTS latitude DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS longitude DOUBLE PRECISION;

-- 3. กำหนดค่าเริ่มต้นพิกัดให้มูลนิธิเดิม (ถ้ายังว่างอยู่) เป็นกรุงเทพฯ โซนกลาง
UPDATE public.foundation_profiles
SET 
  latitude = COALESCE(latitude, 13.7563),
  longitude = COALESCE(longitude, 100.5018)
WHERE latitude IS NULL OR longitude IS NULL;

-- 4. อัปเดตพิกัดจริงกระจายตามเขตกรุงเทพฯ และปริมณฑล ให้กับสัตว์ที่มีอยู่เดิม
-- เพื่อให้ระบบคำนวณระยะทางได้แตกต่างกันตามระยะจริง
DO $$
BEGIN
  -- สุขุมวิท 39 (~5-6 กม. จากใจกลางเมือง)
  UPDATE public.animals SET latitude = 13.7382, longitude = 100.5701 WHERE name ILIKE '%ทองแดง%' AND latitude IS NULL;
  -- จตุจักร (~7 กม.)
  UPDATE public.animals SET latitude = 13.8025, longitude = 100.5538 WHERE name ILIKE '%มารวย%' AND latitude IS NULL;
  -- ทองหล่อ (~6 กม.)
  UPDATE public.animals SET latitude = 13.7345, longitude = 100.5830 WHERE name ILIKE '%ลัคกี้%' AND latitude IS NULL;
  -- พหลโยธิน (~5 กม.)
  UPDATE public.animals SET latitude = 13.7845, longitude = 100.5478 WHERE name ILIKE '%ข้าวจี่%' AND latitude IS NULL;
  -- สยาม / ปทุมวัน (~3 กม.)
  UPDATE public.animals SET latitude = 13.7462, longitude = 100.5348 WHERE name ILIKE '%ส้มแป้น%' AND latitude IS NULL;
  -- บางนา (~15 กม.)
  UPDATE public.animals SET latitude = 13.6682, longitude = 100.6040 WHERE name ILIKE '%มังคุด%' AND latitude IS NULL;
  -- นนทบุรี (~12 กม.)
  UPDATE public.animals SET latitude = 13.8621, longitude = 100.5134 WHERE name ILIKE '%โคโค่%' AND latitude IS NULL;
  -- สีลม / สาทร (~4 กม.)
  UPDATE public.animals SET latitude = 13.7225, longitude = 100.5284 WHERE name ILIKE '%กะทิ%' AND latitude IS NULL;
  -- ลาดพร้าว (~10 กม.)
  UPDATE public.animals SET latitude = 13.8150, longitude = 100.5980 WHERE name ILIKE '%ม็อคค่า%' AND latitude IS NULL;
  -- รังสิต / ปทุมธานี (~28 กม.)
  UPDATE public.animals SET latitude = 13.9870, longitude = 100.6150 WHERE name ILIKE '%ชาโคล%' AND latitude IS NULL;
  -- บางพลัด (~4 กม.)
  UPDATE public.animals SET latitude = 13.7850, longitude = 100.4950 WHERE name ILIKE '%เฉาก๊วย%' AND latitude IS NULL;
  -- พระราม 2 (~18 กม.)
  UPDATE public.animals SET latitude = 13.6450, longitude = 100.4350 WHERE name ILIKE '%แพนด้า%' AND latitude IS NULL;
  -- สมุทรปราการ (~22 กม.)
  UPDATE public.animals SET latitude = 13.5990, longitude = 100.5980 WHERE name ILIKE '%เต้าหู้%' AND latitude IS NULL;
  -- ศาลายา / นครปฐม (~35 กม.)
  UPDATE public.animals SET latitude = 13.7990, longitude = 100.3250 WHERE name ILIKE '%บีน%' AND latitude IS NULL;
  -- สุพรรณบุรี / อยุธยา (~55 กม.)
  UPDATE public.animals SET latitude = 14.2050, longitude = 100.5750 WHERE name ILIKE '%มะนาว%' AND latitude IS NULL;

  -- ตัวอื่นๆ ที่ยังไม่มีพิกัด ให้กำหนดพิกัดแบบกระจายตัวใน กทม.
  UPDATE public.animals 
  SET 
    latitude = 13.7500 + ((id::text::bytea[1]::int % 20) - 10) * 0.015,
    longitude = 100.5200 + ((id::text::bytea[2]::int % 20) - 10) * 0.015
  WHERE latitude IS NULL OR longitude IS NULL;
END $$;
