-- ------------------------------------------------------------------------------
-- 021_fix_profiles_and_user_verifications.sql
-- แก้ไขปัญหาตาราง Profiles และ User Verifications สำหรับผู้ใช้ทุกคนรวมถึง OAuth
-- ------------------------------------------------------------------------------

-- 1. เพิ่มฟิลด์ is_verified ในตาราง profiles เพื่อการตรวจสอบสถานะที่รวดเร็ว
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_verified BOOLEAN DEFAULT false;

-- 2. เพิ่ม Policy สำหรับ INSERT ใน profiles เพื่อให้ผู้ใช้ที่ล็อกอินแล้วสามารถสร้าง profile ตัวเองได้
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
CREATE POLICY "Users can insert own profile" ON public.profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

-- 3. ปรับปรุง RLS Policy ของ user_verifications ให้รองรับ INSERT และ UPDATE ได้อย่างสมบูรณ์
DROP POLICY IF EXISTS "user_verifications_policy" ON public.user_verifications;
DROP POLICY IF EXISTS "user_verifications_select" ON public.user_verifications;
DROP POLICY IF EXISTS "user_verifications_insert" ON public.user_verifications;
DROP POLICY IF EXISTS "user_verifications_update" ON public.user_verifications;

CREATE POLICY "user_verifications_select" ON public.user_verifications
  FOR SELECT USING (
    auth.uid() = id OR
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('super_admin', 'foundation'))
  );

CREATE POLICY "user_verifications_insert" ON public.user_verifications
  FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "user_verifications_update" ON public.user_verifications
  FOR UPDATE USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

-- 4. ปรับปรุงฟังก์ชัน handle_new_user ให้รองรับทั้ง Email และ Google OAuth
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, avatar_url, role, is_verified, created_at)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', ''),
    COALESCE(NEW.raw_user_meta_data->>'avatar_url', NEW.raw_user_meta_data->>'picture', ''),
    COALESCE(NEW.raw_user_meta_data->>'role', 'user'),
    COALESCE((NEW.raw_user_meta_data->>'is_verified')::boolean, false),
    now()
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    full_name = COALESCE(NULLIF(EXCLUDED.full_name, ''), public.profiles.full_name),
    avatar_url = COALESCE(NULLIF(EXCLUDED.avatar_url, ''), public.profiles.avatar_url);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 5. Backfill: สร้าง profile ให้กับผู้ใช้งานใน auth.users ทุกคนที่ยังไม่มี record ใน public.profiles
INSERT INTO public.profiles (id, email, full_name, avatar_url, role, created_at)
SELECT
  id,
  email,
  COALESCE(raw_user_meta_data->>'full_name', raw_user_meta_data->>'name', ''),
  COALESCE(raw_user_meta_data->>'avatar_url', raw_user_meta_data->>'picture', ''),
  COALESCE(raw_user_meta_data->>'role', 'user'),
  now()
FROM auth.users
ON CONFLICT (id) DO NOTHING;
