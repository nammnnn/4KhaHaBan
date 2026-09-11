-- ============================================================
-- 4ขาหาบ้าน (4KhaHaBan) — Chat Unread Tracking & Badges Sync
-- ============================================================
-- วิธีใช้: copy ไฟล์นี้ไปรันใน Supabase Dashboard → SQL Editor
-- ============================================================

-- 1. เพิ่มคอลัมน์ในตาราง matches เพื่อแยกการนับข้อความที่ยังไม่ได้อ่านระหว่างผู้รับเลี้ยงและมูลนิธิ
DO $$
BEGIN
  -- คอลัมน์ระบุว่าใครเป็นผู้ส่งข้อความล่าสุด ('user' หรือ 'shelter')
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'matches' AND column_name = 'last_sender'
  ) THEN
    ALTER TABLE public.matches ADD COLUMN last_sender text DEFAULT 'user';
  END IF;

  -- จำนวนข้อความที่ยังไม่ได้อ่านสำหรับผู้รับเลี้ยง
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'matches' AND column_name = 'unread_user'
  ) THEN
    ALTER TABLE public.matches ADD COLUMN unread_user integer DEFAULT 0;
  END IF;

  -- จำนวนข้อความที่ยังไม่ได้อ่านสำหรับมูลนิธิ
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'matches' AND column_name = 'unread_shelter'
  ) THEN
    ALTER TABLE public.matches ADD COLUMN unread_shelter integer DEFAULT 0;
  END IF;

  -- เวลาที่ส่งข้อความล่าสุด
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'matches' AND column_name = 'last_message_at'
  ) THEN
    ALTER TABLE public.matches ADD COLUMN last_message_at timestamptz DEFAULT now();
  END IF;
END $$;

-- 2. เคลียร์ unread ค้างสำหรับ match ที่ข้อความล่าสุดส่งโดยมูลนิธิเอง
-- เพื่อให้ตัวเลขแจ้งเตือนในฝั่งมูลนิธิหายค้างทันที
UPDATE public.matches
SET unread = 0
WHERE id IN (
  SELECT m.id FROM public.matches m
  JOIN LATERAL (
    SELECT sender FROM public.messages msg 
    WHERE msg.match_id = m.id 
    ORDER BY msg.created_at DESC 
    LIMIT 1
  ) last_msg ON true
  WHERE last_msg.sender = 'shelter'
);
