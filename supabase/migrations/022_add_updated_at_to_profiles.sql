-- ------------------------------------------------------------------------------
-- 022_add_updated_at_to_profiles.sql
-- เพิ่มคอลัมน์ updated_at ในตาราง profiles เพื่อความสมบูรณ์ของ schema
-- ------------------------------------------------------------------------------

ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();
-- (Removed: a one-off UPDATE that marked a specific personal account as verified.
--  Verification is granted through the verification flow / admin approval, not by email in a migration.)
