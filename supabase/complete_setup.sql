-- ==============================================================================
-- 4ขาหาบ้าน (4KhaHaBan) — Master Database Setup Script
-- ==============================================================================
-- รวมคำสั่ง SQL ทั้งหมดของระบบไว้ในไฟล์เดียวแบบ One-Click Setup
-- วิธีใช้:
-- 1. เข้าสู่ Supabase Dashboard -> ไปที่โปรเจกต์ของคุณ
-- 2. ไปที่เมนู "SQL Editor" ด้านซ้าย
-- 3. คัดลอกคำสั่งในไฟล์นี้ทั้งหมดไปวาง แล้วกด "Run"
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. ส่วนเสริม (EXTENSIONS)
-- ------------------------------------------------------------------------------
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ------------------------------------------------------------------------------
-- 2. ตาราง PROFILES (ข้อมูลผู้ใช้งาน, มูลนิธิ และผู้ดูแลระบบ)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.profiles (
  id              UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email           TEXT,
  full_name       TEXT,
  avatar_url      TEXT,
  phone           TEXT,
  role            TEXT CHECK (role IN ('user', 'foundation', 'super_admin')) DEFAULT 'user',
  is_banned       BOOLEAN DEFAULT false,
  preferences     JSONB DEFAULT '{"maxDistance": 50, "animalType": "all", "gender": "all"}'::jsonb,
  last_seen       TIMESTAMPTZ,
  created_at      TIMESTAMPTZ DEFAULT now()
);

-- เพิ่มคอลัมน์ใหม่อัตโนมัติ (กรณีตารางมีอยู่แล้ว)
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS phone TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_banned BOOLEAN DEFAULT false;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS preferences JSONB DEFAULT '{"maxDistance": 50, "animalType": "all", "gender": "all"}'::jsonb;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS last_seen TIMESTAMPTZ;

-- Enable RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Policies สำหรับ profiles
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON public.profiles;
CREATE POLICY "Public profiles are viewable by everyone"
  ON public.profiles FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

DROP POLICY IF EXISTS "Admins can update any profile" ON public.profiles;
CREATE POLICY "Admins can update any profile"
  ON public.profiles FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'super_admin'
    )
  );

-- Function & Trigger: สร้าง profile อัตโนมัติเมื่อ User สมัครสมาชิก
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, avatar_url, role, created_at)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', ''),
    COALESCE(NEW.raw_user_meta_data->>'avatar_url', ''),
    COALESCE(NEW.raw_user_meta_data->>'role', 'user'),
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


-- ------------------------------------------------------------------------------
-- 3. ตาราง FOUNDATION_PROFILES & DOCUMENTS (การยืนยันตัวตนมูลนิธิ)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.foundation_profiles (
  id                  UUID PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  foundation_name     TEXT NOT NULL,
  registration_no     TEXT,
  address             TEXT,
  contact_phone       TEXT,
  contact_person      TEXT,
  description         TEXT,
  verification_status TEXT CHECK (verification_status IN ('pending', 'approved', 'rejected')) DEFAULT 'pending',
  rejection_reason    TEXT,
  submitted_at        TIMESTAMPTZ DEFAULT now(),
  reviewed_at         TIMESTAMPTZ,
  reviewed_by         UUID REFERENCES public.profiles(id)
);

CREATE TABLE IF NOT EXISTS public.foundation_documents (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  foundation_id  UUID REFERENCES public.foundation_profiles(id) ON DELETE CASCADE,
  doc_type       TEXT CHECK (doc_type IN ('registration_cert', 'id_card', 'address_proof', 'other')),
  file_path      TEXT NOT NULL,
  uploaded_at    TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.foundation_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.foundation_documents ENABLE ROW LEVEL SECURITY;

-- Policies สำหรับ foundation_profiles
DROP POLICY IF EXISTS "foundation_profiles_select" ON public.foundation_profiles;
CREATE POLICY "foundation_profiles_select" ON public.foundation_profiles
  FOR SELECT USING (
    auth.uid() = id OR
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'super_admin')
  );

DROP POLICY IF EXISTS "foundation_profiles_insert" ON public.foundation_profiles;
CREATE POLICY "foundation_profiles_insert" ON public.foundation_profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "foundation_profiles_update" ON public.foundation_profiles;
CREATE POLICY "foundation_profiles_update" ON public.foundation_profiles
  FOR UPDATE USING (
    auth.uid() = id OR
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'super_admin')
  );

-- Policies สำหรับ foundation_documents
DROP POLICY IF EXISTS "foundation_docs_all" ON public.foundation_documents;
CREATE POLICY "foundation_docs_all" ON public.foundation_documents
  FOR ALL USING (
    foundation_id = auth.uid() OR
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'super_admin')
  );


-- ------------------------------------------------------------------------------
-- 4. ตาราง USER_VERIFICATIONS (การยืนยันตัวตนของผู้รับเลี้ยง)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.user_verifications (
  id              UUID PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  full_name       TEXT NOT NULL,
  id_card_no      TEXT NOT NULL,
  phone           TEXT NOT NULL,
  assessment      JSONB DEFAULT '{}'::jsonb,
  status          TEXT NOT NULL DEFAULT 'verified' CHECK (status IN ('pending', 'verified', 'rejected')),
  created_at      TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.user_verifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "user_verifications_policy" ON public.user_verifications;
CREATE POLICY "user_verifications_policy" ON public.user_verifications
  FOR ALL USING (
    auth.uid() = id OR
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('super_admin', 'foundation'))
  );


-- ------------------------------------------------------------------------------
-- 5. ตาราง ANIMALS (ข้อมูลสัตว์รอหาบ้าน)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.animals (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  foundation_id  UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  name           TEXT NOT NULL,
  type           TEXT CHECK (type IN ('dog', 'cat', 'other')) NOT NULL,
  age            TEXT,
  gender         TEXT CHECK (gender IN ('male', 'female', 'unknown')),
  size           TEXT CHECK (size IN ('small', 'medium', 'large')),
  images         TEXT[] DEFAULT '{}',
  tags           TEXT[] DEFAULT '{}',
  story          TEXT,
  shelter        TEXT,
  distance       TEXT,
  status         TEXT CHECK (status IN ('available', 'adopted', 'hidden')) DEFAULT 'available',
  created_at     TIMESTAMPTZ DEFAULT now(),
  updated_at     TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.animals ADD COLUMN IF NOT EXISTS shelter TEXT;
ALTER TABLE public.animals ADD COLUMN IF NOT EXISTS distance TEXT;

ALTER TABLE public.animals ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "animals_select_policy" ON public.animals;
CREATE POLICY "animals_select_policy" ON public.animals
  FOR SELECT USING (
    status = 'available' OR 
    foundation_id = auth.uid() OR 
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'super_admin')
  );

DROP POLICY IF EXISTS "animals_insert_policy" ON public.animals;
CREATE POLICY "animals_insert_policy" ON public.animals
  FOR INSERT WITH CHECK (
    foundation_id = auth.uid() OR
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'super_admin')
  );

DROP POLICY IF EXISTS "animals_update_policy" ON public.animals;
CREATE POLICY "animals_update_policy" ON public.animals
  FOR UPDATE USING (
    foundation_id = auth.uid() OR
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'super_admin')
  );

DROP POLICY IF EXISTS "animals_delete_policy" ON public.animals;
CREATE POLICY "animals_delete_policy" ON public.animals
  FOR DELETE USING (
    foundation_id = auth.uid() OR
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'super_admin')
  );


-- ------------------------------------------------------------------------------
-- 6. ตาราง SWIPES & MATCHES & MESSAGES (ระบบ Tinder Swipe และ Chat)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.swipes (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  animal_id   UUID NOT NULL REFERENCES public.animals(id) ON DELETE CASCADE,
  action      TEXT NOT NULL CHECK (action IN ('like', 'nope', 'superlike')),
  created_at  TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, animal_id)
);

CREATE TABLE IF NOT EXISTS public.matches (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  animal_id     UUID NOT NULL REFERENCES public.animals(id) ON DELETE CASCADE,
  user_id       UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  status        TEXT NOT NULL DEFAULT 'pending',
  last_message  TEXT,
  unread        INTEGER DEFAULT 0,
  created_at    TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.messages (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id    UUID NOT NULL REFERENCES public.matches(id) ON DELETE CASCADE,
  sender      TEXT NOT NULL, -- 'user' or 'shelter'
  text        TEXT NOT NULL,
  image_url   TEXT,
  created_at  TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.swipes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "swipes_policy" ON public.swipes;
CREATE POLICY "swipes_policy" ON public.swipes FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "matches_policy" ON public.matches;
CREATE POLICY "matches_policy" ON public.matches FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "messages_policy" ON public.messages;
CREATE POLICY "messages_policy" ON public.messages FOR ALL USING (true) WITH CHECK (true);


-- ------------------------------------------------------------------------------
-- 7. ตาราง DONATIONS (การบริจาคและอุปถัมภ์)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.donations (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  foundation_id   UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  amount          NUMERIC(10, 2) NOT NULL CHECK (amount > 0),
  billing_cycle   TEXT NOT NULL CHECK (billing_cycle IN ('once', 'monthly')),
  status          TEXT NOT NULL DEFAULT 'completed',
  slip_url        TEXT,
  created_at      TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.donations ADD COLUMN IF NOT EXISTS foundation_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL;
ALTER TABLE public.donations ADD COLUMN IF NOT EXISTS slip_url TEXT;

ALTER TABLE public.donations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "donations_insert_policy" ON public.donations;
CREATE POLICY "donations_insert_policy" ON public.donations
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "donations_select_policy" ON public.donations;
CREATE POLICY "donations_select_policy" ON public.donations
  FOR SELECT USING (
    auth.uid() = user_id OR
    foundation_id = auth.uid() OR
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'super_admin')
  );


-- ------------------------------------------------------------------------------
-- 8. ตาราง SUPPORT_CHATS & SUPPORT_MESSAGES (ติดต่อช่วยเหลือกับ Super Admin)
-- ------------------------------------------------------------------------------
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

ALTER TABLE public.support_messages ADD COLUMN IF NOT EXISTS image_url TEXT;

ALTER TABLE public.support_chats ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.support_messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "support_chats_policy" ON public.support_chats;
CREATE POLICY "support_chats_policy" ON public.support_chats FOR ALL
  USING (
    user_id = auth.uid() OR
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'super_admin')
  );

DROP POLICY IF EXISTS "support_messages_policy" ON public.support_messages;
CREATE POLICY "support_messages_policy" ON public.support_messages FOR ALL
  USING (
    sender_id = auth.uid() OR
    EXISTS (SELECT 1 FROM public.support_chats WHERE id = chat_id AND user_id = auth.uid()) OR
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'super_admin')
  );


-- ------------------------------------------------------------------------------
-- 9. ตาราง REPORTS & BLOCKS (การรายงานและบล็อกผู้ใช้)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.reports (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_id  UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  reported_id  UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  reason       TEXT NOT NULL,
  image_url    TEXT,
  status       TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'investigating', 'resolved', 'dismissed')),
  created_at   TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.blocks (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  blocked_id   UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  created_at   TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, blocked_id)
);

ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.blocks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "reports_policy" ON public.reports;
CREATE POLICY "reports_policy" ON public.reports FOR ALL
  USING (
    reporter_id = auth.uid() OR
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'super_admin')
  );

DROP POLICY IF EXISTS "blocks_policy" ON public.blocks;
CREATE POLICY "blocks_policy" ON public.blocks FOR ALL
  USING (user_id = auth.uid());


-- ------------------------------------------------------------------------------
-- 10. ตาราง INCIDENT_REPORTS (แจ้งเบาะแสสัตว์จรจัด / กู้ภัย)
-- ------------------------------------------------------------------------------
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

ALTER TABLE public.incident_reports ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "incident_insert" ON public.incident_reports;
CREATE POLICY "incident_insert" ON public.incident_reports FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "incident_select" ON public.incident_reports;
CREATE POLICY "incident_select" ON public.incident_reports FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "incident_update" ON public.incident_reports;
CREATE POLICY "incident_update" ON public.incident_reports FOR UPDATE
  USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('super_admin', 'foundation'))
  );

-- ฟังก์ชันคำนวณสถิติแจ้งเบาะแสสัตว์จรจัดแบบเรียลไทม์จากฐานข้อมูลจริง 100%
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

GRANT EXECUTE ON FUNCTION public.get_incident_stats() TO anon, authenticated;


-- ------------------------------------------------------------------------------
-- 11. ตาราง ADMIN_AUDIT_LOG (บันทึกกิจกรรมของผู้ดูแลระบบ)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.admin_audit_log (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id     UUID REFERENCES public.profiles(id),
  action       TEXT NOT NULL,
  target_id    UUID,
  detail       JSONB,
  created_at   TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.admin_audit_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "admin_audit_log_policy" ON public.admin_audit_log;
CREATE POLICY "admin_audit_log_policy" ON public.admin_audit_log FOR ALL
  USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'super_admin')
  );


-- ------------------------------------------------------------------------------
-- 12. STORAGE BUCKETS (สร้างที่เก็บไฟล์รูปภาพและเอกสาร)
-- ------------------------------------------------------------------------------
-- 12.1 Bucket: chat_images (Public สำหรับรูปในแชท, รูปโปรไฟล์, สลิปบริจาค, ภาพแจ้งเหตุ)
INSERT INTO storage.buckets (id, name, public) 
VALUES ('chat_images', 'chat_images', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- 12.2 Bucket: animal-images (Public สำหรับรูปสัตว์หาบ้าน)
INSERT INTO storage.buckets (id, name, public) 
VALUES ('animal-images', 'animal-images', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- 12.3 Bucket: foundation-docs (Private สำหรับเอกสารจดทะเบียนมูลนิธิ)
INSERT INTO storage.buckets (id, name, public) 
VALUES ('foundation-docs', 'foundation-docs', false)
ON CONFLICT (id) DO NOTHING;

-- Storage Policies: chat_images
DROP POLICY IF EXISTS "Public access to chat images" ON storage.objects;
CREATE POLICY "Public access to chat images" ON storage.objects
  FOR SELECT USING (bucket_id = 'chat_images');

DROP POLICY IF EXISTS "Anyone can upload to chat images" ON storage.objects;
CREATE POLICY "Anyone can upload to chat images" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'chat_images');

-- Storage Policies: animal-images
DROP POLICY IF EXISTS "Public access to animal images" ON storage.objects;
CREATE POLICY "Public access to animal images" ON storage.objects
  FOR SELECT USING (bucket_id = 'animal-images');

DROP POLICY IF EXISTS "Authenticated users can upload animal images" ON storage.objects;
CREATE POLICY "Authenticated users can upload animal images" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'animal-images' AND auth.role() = 'authenticated');

-- Storage Policies: foundation-docs
DROP POLICY IF EXISTS "Foundation users can upload own docs" ON storage.objects;
CREATE POLICY "Foundation users can upload own docs" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'foundation-docs' AND auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Foundation users and admins can view docs" ON storage.objects;
CREATE POLICY "Foundation users and admins can view docs" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'foundation-docs' AND 
    (auth.uid()::text = (storage.foldername(name))[1] OR
     EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'super_admin'))
  );


-- ------------------------------------------------------------------------------
-- 13. INDEXES & REALTIME CONFIGURATION (ดัชนีและการถ่ายทอดสดข้อความแชท)
-- ------------------------------------------------------------------------------
-- Indexes เพื่อเพิ่มความเร็วในการสืบค้นข้อมูล
CREATE INDEX IF NOT EXISTS idx_animals_foundation_id ON public.animals(foundation_id);
CREATE INDEX IF NOT EXISTS idx_animals_status ON public.animals(status);
CREATE INDEX IF NOT EXISTS idx_swipes_user_id ON public.swipes(user_id);
CREATE INDEX IF NOT EXISTS idx_swipes_animal_id ON public.swipes(animal_id);
CREATE INDEX IF NOT EXISTS idx_matches_user_id ON public.matches(user_id);
CREATE INDEX IF NOT EXISTS idx_matches_animal_id ON public.matches(animal_id);
CREATE INDEX IF NOT EXISTS idx_messages_match_id ON public.messages(match_id);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON public.messages(created_at);
CREATE INDEX IF NOT EXISTS idx_donations_user_id ON public.donations(user_id);
CREATE INDEX IF NOT EXISTS idx_donations_foundation_id ON public.donations(foundation_id);
CREATE INDEX IF NOT EXISTS idx_support_chats_user_id ON public.support_chats(user_id);
CREATE INDEX IF NOT EXISTS idx_support_messages_chat_id ON public.support_messages(chat_id);
CREATE INDEX IF NOT EXISTS idx_incident_reports_status ON public.incident_reports(status);
CREATE INDEX IF NOT EXISTS idx_reports_reported_id ON public.reports(reported_id);
CREATE INDEX IF NOT EXISTS idx_blocks_user_id ON public.blocks(user_id);

-- ตั้งค่า REPLICA IDENTITY FULL เพื่อให้ Realtime สามารถถ่ายทอดข้อมูลได้ครบทุกคอลัมน์
ALTER TABLE public.messages REPLICA IDENTITY FULL;
ALTER TABLE public.matches REPLICA IDENTITY FULL;
ALTER TABLE public.support_messages REPLICA IDENTITY FULL;
ALTER TABLE public.incident_reports REPLICA IDENTITY FULL;

-- เปิดใช้งาน Supabase Realtime สำหรับตารางแชทและการแจ้งเตือน
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    BEGIN
      ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
    EXCEPTION WHEN duplicate_object THEN NULL;
    END;
    BEGIN
      ALTER PUBLICATION supabase_realtime ADD TABLE public.matches;
    EXCEPTION WHEN duplicate_object THEN NULL;
    END;
    BEGIN
      ALTER PUBLICATION supabase_realtime ADD TABLE public.support_messages;
    EXCEPTION WHEN duplicate_object THEN NULL;
    END;
    BEGIN
      ALTER PUBLICATION supabase_realtime ADD TABLE public.incident_reports;
    EXCEPTION WHEN duplicate_object THEN NULL;
    END;
  END IF;
END $$;



