-- ==============================================================================
-- 4ขาหาบ้าน (4KhaHaBan) — Setup Storage Bucket & Policy for Animal Images
-- ==============================================================================
-- คัดลอกคำสั่งด้านล่างนี้ไปวางใน Supabase Dashboard -> SQL Editor แล้วกด Run
-- เพื่อเปิด Bucket 'animal-images' ให้สามารถอัปโหลดและแสดงผลรูปสัตว์เลี้ยงได้ 100%
-- ==============================================================================

-- 1. สร้าง Bucket animal-images (Public)
INSERT INTO storage.buckets (id, name, public) 
VALUES ('animal-images', 'animal-images', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- 2. เปิดสิทธิ์ให้ทุกคนสามารถดูรูปภาพใน animal-images ได้ (Public Read)
DROP POLICY IF EXISTS "Public access to animal images" ON storage.objects;
CREATE POLICY "Public access to animal images" ON storage.objects 
FOR SELECT USING (bucket_id = 'animal-images');

-- 3. เปิดสิทธิ์ให้อัปโหลดรูปภาพเข้า animal-images ได้
DROP POLICY IF EXISTS "Allow upload to animal images" ON storage.objects;
CREATE POLICY "Allow upload to animal images" ON storage.objects 
FOR INSERT WITH CHECK (bucket_id = 'animal-images');

-- 4. เปิดสิทธิ์ให้อัปเดตรูปภาพได้ (กรณีเขียนทับรูปเดิม)
DROP POLICY IF EXISTS "Allow update to animal images" ON storage.objects;
CREATE POLICY "Allow update to animal images" ON storage.objects 
FOR UPDATE USING (bucket_id = 'animal-images');

NOTIFY pgrst, 'reload schema';
