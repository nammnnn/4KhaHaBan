-- ------------------------------------------------------------------------------
-- 022_add_updated_at_to_profiles.sql
-- เพิ่มคอลัมน์ updated_at ในตาราง profiles เพื่อความสมบูรณ์ของ schema
-- ------------------------------------------------------------------------------

ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();
UPDATE public.profiles SET is_verified = true WHERE email = 'songkaen2547@gmail.com';
