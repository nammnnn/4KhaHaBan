-- ==============================================================================
-- 4ขาหาบ้าน (4KhaHaBan) — Create or Promote Super Admin Script
-- ==============================================================================
-- วิธีใช้: เลือกวิธีใดวิธีหนึ่งด้านล่างนี้
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- แบบที่ 1: ตั้งค่าให้บัญชีที่มีอยู่แล้วเป็น Admin (แนะนำที่สุด)
-- ------------------------------------------------------------------------------
-- ถ้าคุณสมัครสมาชิกผ่านหน้าเว็บแล้ว (ด้วย Email หรือ Google)
-- เพียงแค่เปลี่ยน 'your_email@gmail.com' เป็นอีเมลของคุณ แล้วกด Run:

UPDATE public.profiles 
SET role = 'super_admin' 
WHERE email = 'your_email@gmail.com';


-- ------------------------------------------------------------------------------
-- แบบที่ 2: สร้างบัญชี Super Admin ใหม่เอี่ยมขึ้นมาทันที
-- ------------------------------------------------------------------------------
-- รันโค้ดด้านล่างนี้เพื่อสร้างบัญชี Admin พร้อมล็อกอินได้เลย:
-- Email:    admin@4khahaban.org
-- Password: AdminPassword123!
/*
DO $$
DECLARE
  new_admin_id UUID := gen_random_uuid();
  admin_email TEXT := 'admin@4khahaban.org';
  admin_password TEXT := 'AdminPassword123!';
BEGIN
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE email = admin_email) THEN
    INSERT INTO auth.users (
      instance_id, id, aud, role, email, encrypted_password, email_confirmed_at, 
      raw_app_meta_data, raw_user_meta_data, created_at, updated_at
    ) VALUES (
      '00000000-0000-0000-0000-000000000000',
      new_admin_id,
      'authenticated',
      'authenticated',
      admin_email,
      crypt(admin_password, gen_salt('bf')),
      now(),
      '{"provider": "email", "providers": ["email"]}',
      '{"full_name": "ผู้ดูแลระบบ (Super Admin)", "role": "super_admin"}',
      now(),
      now()
    );

    INSERT INTO public.profiles (id, email, full_name, role)
    VALUES (new_admin_id, admin_email, 'ผู้ดูแลระบบ (Super Admin)', 'super_admin')
    ON CONFLICT (id) DO UPDATE SET role = 'super_admin';

    RAISE NOTICE 'สร้าง Super Admin สำเร็จ! ล็อกอินด้วย Email: %, Password: %', admin_email, admin_password;
  ELSE
    UPDATE public.profiles SET role = 'super_admin' WHERE email = admin_email;
    RAISE NOTICE 'บัญชี % มีอยู่แล้ว — อัปเดตสิทธิ์เป็น super_admin เรียบร้อย', admin_email;
  END IF;
END $$;
*/
