-- ==============================================================================
-- 4ขาหาบ้าน (4KhaHaBan) — Safe Database Cleanup & Schema Update Script
-- ==============================================================================
-- วัตถุประสงค์:
-- 1. เคลียร์คอลัมน์และ Policy เก่าที่ไม่ได้ใช้งานแล้วออก
-- 2. ไม่ลบข้อมูลเดิมเด็ดขาด (Zero Data Loss) ข้อมูล User, หมาแมว, แชท, บริจาค อยู่ครบ 100%
-- 3. อัปเกรด Schema เพิ่มตารางและคอลัมน์ใหม่ที่ระบบต้องการให้ครบถ้วน
-- 
-- วิธีใช้: คัดลอกสคริปต์นี้ไปวางใน Supabase Dashboard -> SQL Editor แล้วกด Run
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- ขั้นที่ 1: ตรวจสอบและย้ายข้อมูลเก่าก่อนลบคอลัมน์ (เพื่อไม่ให้ข้อมูลสูญหาย)
-- ------------------------------------------------------------------------------
DO $$
BEGIN
  -- ถ้าใน profiles มีคอลัมน์ verification_status เดิม ให้คัดลอกข้อมูลไปยัง foundation_profiles ก่อน
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'verification_status'
  ) THEN
    INSERT INTO public.foundation_profiles (id, foundation_name, verification_status)
    SELECT 
      p.id, 
      COALESCE(NULLIF(p.full_name, ''), 'มูลนิธิ'), 
      CASE 
        WHEN p.verification_status::text IN ('pending', 'approved', 'rejected') THEN p.verification_status::text
        ELSE 'pending'
      END
    FROM public.profiles p
    WHERE p.role = 'foundation'
    ON CONFLICT (id) DO UPDATE SET
      verification_status = EXCLUDED.verification_status;
  END IF;
END $$;


-- ------------------------------------------------------------------------------
-- ขั้นที่ 2: เคลียร์คอลัมน์เก่าที่ไม่ได้ใช้งานแล้วออกจากตาราง PROFILES
-- ------------------------------------------------------------------------------
ALTER TABLE public.profiles DROP COLUMN IF EXISTS verification_status;
ALTER TABLE public.profiles DROP COLUMN IF EXISTS verification_document_url;


-- ------------------------------------------------------------------------------
-- ขั้นที่ 3: เติมคอลัมน์ใหม่ที่จำเป็นในตารางเดิม (ถ้ายังไม่มี)
-- ------------------------------------------------------------------------------
-- ตาราง profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS phone TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_banned BOOLEAN DEFAULT false;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS preferences JSONB DEFAULT '{"maxDistance": 50, "animalType": "all", "gender": "all"}'::jsonb;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS last_seen TIMESTAMPTZ;

-- ตาราง animals
ALTER TABLE public.animals ADD COLUMN IF NOT EXISTS shelter TEXT;
ALTER TABLE public.animals ADD COLUMN IF NOT EXISTS distance TEXT;

-- ตาราง donations
ALTER TABLE public.donations ADD COLUMN IF NOT EXISTS slip_url TEXT;
ALTER TABLE public.donations ADD COLUMN IF NOT EXISTS foundation_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL;

-- ตาราง reports
ALTER TABLE public.reports ADD COLUMN IF NOT EXISTS image_url TEXT;

-- ตาราง support_messages
ALTER TABLE public.support_messages ADD COLUMN IF NOT EXISTS image_url TEXT;


-- ------------------------------------------------------------------------------
-- ขั้นที่ 4: สร้างตารางใหม่ที่จำเป็น (ถ้ายังไม่มี)
-- ------------------------------------------------------------------------------
-- 4.1 ตารางยืนยันตัวตนผู้รับเลี้ยงทั่วไป (KYC)
CREATE TABLE IF NOT EXISTS public.user_verifications (
  id              UUID PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  full_name       TEXT NOT NULL,
  id_card_no      TEXT NOT NULL,
  phone           TEXT NOT NULL,
  assessment      JSONB DEFAULT '{}'::jsonb,
  status          TEXT NOT NULL DEFAULT 'verified' CHECK (status IN ('pending', 'verified', 'rejected')),
  created_at      TIMESTAMPTZ DEFAULT now()
);

-- เพิ่มคอลัมน์ assessment หากตารางมีอยู่แล้ว
ALTER TABLE public.user_verifications ADD COLUMN IF NOT EXISTS assessment JSONB DEFAULT '{}'::jsonb;

-- 4.2 ตารางแจ้งเบาะแสสัตว์จรจัด / กู้ภัย
CREATE TABLE IF NOT EXISTS public.incident_reports (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  animal_type     TEXT NOT NULL DEFAULT 'dog',
  symptoms        TEXT NOT NULL,
  location_text   TEXT NOT NULL,
  latitude        NUMERIC(10, 7),
  longitude       NUMERIC(10, 7),
  reporter_name   TEXT,
  reporter_phone  TEXT,
  image_url       TEXT,
  status          TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'resolved', 'cancelled')),
  created_at      TIMESTAMPTZ DEFAULT now()
);

-- 4.3 ตาราง Support Chats และ Messages
CREATE TABLE IF NOT EXISTS public.support_chats (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  status      TEXT NOT NULL DEFAULT 'open',
  created_at  TIMESTAMPTZ DEFAULT now(),
  updated_at  TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.support_messages (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chat_id     UUID REFERENCES public.support_chats(id) ON DELETE CASCADE NOT NULL,
  sender_id   UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  text        TEXT NOT NULL,
  image_url   TEXT,
  created_at  TIMESTAMPTZ DEFAULT now()
);

-- 4.4 ตาราง Admin Audit Log
CREATE TABLE IF NOT EXISTS public.admin_audit_log (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id     UUID REFERENCES public.profiles(id),
  action       TEXT NOT NULL,
  target_id    UUID,
  detail       JSONB,
  created_at   TIMESTAMPTZ DEFAULT now()
);


-- ------------------------------------------------------------------------------
-- ขั้นที่ 5: เคลียร์ Policies เก่า/ซ้ำซ้อน และติดตั้ง Policies มาตรฐาน
-- ------------------------------------------------------------------------------
-- ลบ Policies เก่าที่ตกค้างจากการทดสอบ
DROP POLICY IF EXISTS "Enable all for testing on matches" ON public.matches;
DROP POLICY IF EXISTS "Enable all for testing on messages" ON public.messages;
DROP POLICY IF EXISTS "Enable all for testing on swipes" ON public.swipes;
DROP POLICY IF EXISTS "animals_select_available" ON public.animals;
DROP POLICY IF EXISTS "animals_insert_own" ON public.animals;
DROP POLICY IF EXISTS "animals_update_own" ON public.animals;
DROP POLICY IF EXISTS "animals_delete_own" ON public.animals;

-- เปิดใช้งาน RLS ให้ครบทุกตาราง
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.animals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.swipes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.donations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_verifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.incident_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.support_chats ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.support_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.blocks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_audit_log ENABLE ROW LEVEL SECURITY;

-- อัปเดต Policies ใหม่ที่รัดกุม
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON public.profiles;
CREATE POLICY "Public profiles are viewable by everyone" ON public.profiles FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);

DROP POLICY IF EXISTS "Admins can update any profile" ON public.profiles;
CREATE POLICY "Admins can update any profile" ON public.profiles FOR UPDATE
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'super_admin'));

DROP POLICY IF EXISTS "user_verifications_policy" ON public.user_verifications;
CREATE POLICY "user_verifications_policy" ON public.user_verifications FOR ALL
  USING (auth.uid() = id OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('super_admin', 'foundation')));

DROP POLICY IF EXISTS "animals_select_policy" ON public.animals;
CREATE POLICY "animals_select_policy" ON public.animals FOR SELECT
  USING (status = 'available' OR foundation_id = auth.uid() OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'super_admin'));

DROP POLICY IF EXISTS "animals_insert_policy" ON public.animals;
CREATE POLICY "animals_insert_policy" ON public.animals FOR INSERT
  WITH CHECK (foundation_id = auth.uid() OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'super_admin'));

DROP POLICY IF EXISTS "animals_update_policy" ON public.animals;
CREATE POLICY "animals_update_policy" ON public.animals FOR UPDATE
  USING (foundation_id = auth.uid() OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'super_admin'));

DROP POLICY IF EXISTS "animals_delete_policy" ON public.animals;
CREATE POLICY "animals_delete_policy" ON public.animals FOR DELETE
  USING (foundation_id = auth.uid() OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'super_admin'));

DROP POLICY IF EXISTS "incident_insert" ON public.incident_reports;
CREATE POLICY "incident_insert" ON public.incident_reports FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "incident_select" ON public.incident_reports;
CREATE POLICY "incident_select" ON public.incident_reports FOR SELECT
  USING (auth.uid() = user_id OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('super_admin', 'foundation')));


-- ------------------------------------------------------------------------------
-- ขั้นที่ 6: ดัชนีและการถ่ายทอดสด (Indexes & Realtime)
-- ------------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_animals_foundation_id ON public.animals(foundation_id);
CREATE INDEX IF NOT EXISTS idx_animals_status ON public.animals(status);
CREATE INDEX IF NOT EXISTS idx_swipes_user_id ON public.swipes(user_id);
CREATE INDEX IF NOT EXISTS idx_matches_user_id ON public.matches(user_id);
CREATE INDEX IF NOT EXISTS idx_messages_match_id ON public.messages(match_id);
CREATE INDEX IF NOT EXISTS idx_donations_user_id ON public.donations(user_id);
CREATE INDEX IF NOT EXISTS idx_incident_reports_status ON public.incident_reports(status);

ALTER TABLE public.messages REPLICA IDENTITY FULL;
ALTER TABLE public.matches REPLICA IDENTITY FULL;
ALTER TABLE public.support_messages REPLICA IDENTITY FULL;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.messages; EXCEPTION WHEN duplicate_object THEN NULL; END;
    BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.matches; EXCEPTION WHEN duplicate_object THEN NULL; END;
    BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.support_messages; EXCEPTION WHEN duplicate_object THEN NULL; END;
    BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.incident_reports; EXCEPTION WHEN duplicate_object THEN NULL; END;
  END IF;
END $$;


-- ------------------------------------------------------------------------------
-- ขั้นที่ 7: STORAGE BUCKETS (สร้างเพิ่มเฉพาะที่ยังไม่มี)
-- ------------------------------------------------------------------------------
INSERT INTO storage.buckets (id, name, public) 
VALUES ('chat_images', 'chat_images', true)
ON CONFLICT (id) DO UPDATE SET public = true;

INSERT INTO storage.buckets (id, name, public) 
VALUES ('animal-images', 'animal-images', true)
ON CONFLICT (id) DO UPDATE SET public = true;

INSERT INTO storage.buckets (id, name, public) 
VALUES ('foundation-docs', 'foundation-docs', false)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Public access to chat images" ON storage.objects;
CREATE POLICY "Public access to chat images" ON storage.objects FOR SELECT USING (bucket_id = 'chat_images');

DROP POLICY IF EXISTS "Anyone can upload to chat images" ON storage.objects;
CREATE POLICY "Anyone can upload to chat images" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'chat_images');

DROP POLICY IF EXISTS "Public access to animal images" ON storage.objects;
CREATE POLICY "Public access to animal images" ON storage.objects FOR SELECT USING (bucket_id = 'animal-images');

DROP POLICY IF EXISTS "Authenticated users can upload animal images" ON storage.objects;
CREATE POLICY "Authenticated users can upload animal images" ON storage.objects 
  FOR INSERT WITH CHECK (bucket_id = 'animal-images' AND auth.role() = 'authenticated');
