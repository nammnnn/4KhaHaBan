-- ==============================================================================
-- 4ขาหาบ้าน (4KhaHaBan) — Seed Animals for Foundation
-- ==============================================================================
-- วัตถุประสงค์: 
-- เพิ่มชุดข้อมูลสัตว์เลี้ยง (หมาและแมว 15 ตัว) ให้กับ "มูลนิธิของคุณ" โดยตรง
-- เพื่อให้เมื่อล็อกอินด้วยบัญชีมูลนิธิแล้ว จะเห็นสัตว์ใน Dashboard / จัดการสัตว์ได้ทันที
--
-- วิธีใช้:
-- 1. ถ้าต้องการผูกกับบัญชีมูลนิธิที่คุณสมัครไว้ ให้ใส่อีเมลของคุณที่บรรทัด target_email ด้านล่าง
-- 2. ถ้าปล่อยว่างไว้ ('') ระบบจะค้นหาและผูกกับมูลนิธิแรกที่พบในระบบให้อัตโนมัติ
-- 3. คัดลอกไปวางใน Supabase Dashboard -> SQL Editor แล้วกด Run
-- ==============================================================================

-- 1. เพิ่มคอลัมน์ที่จำเป็นหากยังไม่มี
ALTER TABLE public.animals ADD COLUMN IF NOT EXISTS shelter TEXT;
ALTER TABLE public.animals ADD COLUMN IF NOT EXISTS distance TEXT;

DO $$
DECLARE
  -- ใส่อีเมลบัญชีมูลนิธิของคุณ (พบใน profiles: pakapol.akala@gmail.com)
  target_email TEXT := 'pakapol.akala@gmail.com'; 

  selected_foundation_id UUID;
  foundation_display_name TEXT;
BEGIN
  -- 1. ค้นหา ID มูลนิธิตามอีเมลที่ระบุ หรือเลือกมูลนิธิแรกที่พบในระบบ
  IF target_email <> '' THEN
    SELECT p.id, COALESCE(fp.foundation_name, p.full_name) INTO selected_foundation_id, foundation_display_name 
    FROM public.profiles p
    LEFT JOIN public.foundation_profiles fp ON fp.id = p.id
    WHERE p.email = target_email AND p.role = 'foundation'
    LIMIT 1;
  ELSE
    SELECT p.id, COALESCE(fp.foundation_name, p.full_name) INTO selected_foundation_id, foundation_display_name 
    FROM public.profiles p
    LEFT JOIN public.foundation_profiles fp ON fp.id = p.id
    WHERE p.role = 'foundation' 
    ORDER BY p.created_at DESC 
    LIMIT 1;
  END IF;

  -- 2. กรณีที่ยังไม่มีมูลนิธิใดๆ สมัครไว้เลย ให้ใช้บัญชี Demo Foundation
  IF selected_foundation_id IS NULL THEN
    selected_foundation_id := '11111111-1111-1111-1111-111111111111';
    foundation_display_name := 'มูลนิธิเพื่อสุนัขและแมวจรจัด (Demo)';

    -- สร้าง Auth User จำลอง (รหัสผ่าน: demo123456)
    IF NOT EXISTS (SELECT 1 FROM auth.users WHERE id = selected_foundation_id) THEN
      INSERT INTO auth.users (
        instance_id, id, aud, role, email, encrypted_password, email_confirmed_at, 
        raw_app_meta_data, raw_user_meta_data, created_at, updated_at
      ) VALUES (
        '00000000-0000-0000-0000-000000000000',
        selected_foundation_id,
        'authenticated',
        'authenticated',
        'foundation_demo@4khahaban.org',
        crypt('demo123456', gen_salt('bf')),
        now(),
        '{"provider": "email", "providers": ["email"]}',
        '{"full_name": "มูลนิธิเพื่อสุนัขและแมวจรจัด (Demo)", "role": "foundation"}',
        now(),
        now()
      );
    END IF;

    -- สร้าง Profile และ Foundation Profile
    INSERT INTO public.profiles (id, email, full_name, phone, role)
    VALUES (selected_foundation_id, 'foundation_demo@4khahaban.org', foundation_display_name, '0812345678', 'foundation')
    ON CONFLICT (id) DO UPDATE SET role = 'foundation';
  END IF;

  -- 3. อัปเดตสถานะมูลนิธิให้เป็น 'approved' เพื่อให้สามารถจัดการสัตว์และแชทได้ทันที
  INSERT INTO public.foundation_profiles (id, foundation_name, verification_status, contact_phone)
  VALUES (selected_foundation_id, COALESCE(foundation_display_name, 'มูลนิธิช่วยเหลือสัตว์'), 'approved', '0812345678')
  ON CONFLICT (id) DO UPDATE SET verification_status = 'approved';

  RAISE NOTICE 'กำลังเพิ่มข้อมูลสัตว์เลี้ยงให้กับมูลนิธิ ID: % (ชื่อ: %)', selected_foundation_id, foundation_display_name;

  -- 4. แทรกข้อมูลสัตว์เลี้ยง 15 ตัว (หมาและแมว พร้อมรูปภาพและรายละเอียดครบถ้วน)
  INSERT INTO public.animals (
    foundation_id, name, age, gender, size, type, shelter, distance, images, tags, story, status
  ) VALUES 
  (
    selected_foundation_id, 'น้องทองแดง', '2 ปี', 'female', 'medium', 'dog', COALESCE(foundation_display_name, 'มูลนิธิเพื่อสุนัขและแมว'), '3.2 กม.',
    ARRAY['https://images.unsplash.com/photo-1543466835-00a7907e9de1?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80'],
    ARRAY['ทำวัคซีนแล้ว', 'ขี้อ้อน', 'เข้ากับคนง่าย', 'ทำหมันแล้ว'], 
    'น้องทองแดงถูกพบเดินหลงทางอยู่แถวตลาด น้องเป็นสุนัขที่ร่าเริงและเป็นมิตรมาก ชอบเล่นลูกบอลและชอบให้คนลูบหัว น้องพร้อมที่จะมีครอบครัวที่อบอุ่นแล้วค่ะ', 
    'available'
  ),
  (
    selected_foundation_id, 'ส้มจี๊ด', '6 เดือน', 'male', 'small', 'cat', COALESCE(foundation_display_name, 'มูลนิธิเพื่อสุนัขและแมว'), '5.5 กม.',
    ARRAY['https://images.unsplash.com/photo-1514888286974-6c03e2ca1dba?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80'],
    ARRAY['ทำวัคซีนแล้ว', 'ใช้กระบะทรายเป็น', 'ขี้เล่น'], 
    'ส้มจี๊ดเป็นลูกแมวที่ซุกซนและมีพลังงานล้นเหลือ ชอบวิ่งไล่จับของเล่นและชอบปีนป่าย น้องกำลังมองหาทาสแมวที่จะมาคอยดูแลและเล่นด้วยทุกวัน', 
    'available'
  ),
  (
    selected_foundation_id, 'พี่เบิ้ม', '4 ปี', 'male', 'large', 'dog', COALESCE(foundation_display_name, 'มูลนิธิเพื่อสุนัขและแมว'), '12 กม.',
    ARRAY['https://images.unsplash.com/photo-1583337130417-3346a1be7dee?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80'],
    ARRAY['เฝ้าบ้านเก่ง', 'ทำวัคซีนแล้ว', 'ใจดี', 'สุขภาพแข็งแรง'], 
    'พี่เบิ้มเป็นสุนัขพันธุ์ผสมตัวใหญ่ใจดี ถึงหน้าตาจะดูดุแต่น้องเป็นมิตรมาก น้องเคยมีเจ้าของแต่เจ้าของย้ายบ้านและไม่สามารถพาน้องไปด้วยได้ ตอนนี้น้องรอคนใจดีมารับไปอยู่ด้วยครับ', 
    'available'
  ),
  (
    selected_foundation_id, 'ไข่ตุ๋น', '1 ปี 2 เดือน', 'male', 'small', 'cat', COALESCE(foundation_display_name, 'มูลนิธิเพื่อสุนัขและแมว'), '3.2 กม.',
    ARRAY['https://images.unsplash.com/photo-1513360371669-4adf3dd7dff8?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80'],
    ARRAY['ขี้อ้อน', 'ติดคน', 'ทำวัคซีนแล้ว'], 
    'ไข่ตุ๋นเป็นแมวเปอร์เซียผสมที่โดนทิ้ง น้องมีขนสีขาวฟูฟ่อง ชอบมาซุกที่ตักและร้องเสียงเบาๆ เวลามีความสุข ตอนนี้น้องต้องการคนดูแลเอาใจใส่ครับ', 
    'available'
  ),
  (
    selected_foundation_id, 'หมูปิ้ง', '3 เดือน', 'female', 'small', 'dog', COALESCE(foundation_display_name, 'มูลนิธิเพื่อสุนัขและแมว'), '8.1 กม.',
    ARRAY['https://images.unsplash.com/photo-1583511655857-d19b40a7a54e?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80'],
    ARRAY['ร่าเริง', 'กินเก่ง', 'กำลังซน'], 
    'หมูปิ้งเป็นลูกหมาพันทางที่รอดชีวิตมาจากข้างถนน น้องกินเก่งมากและร่าเริงสุดๆ เหมาะกับครอบครัวที่มีพื้นที่ให้วิ่งเล่นครับ', 
    'available'
  ),
  (
    selected_foundation_id, 'ชาเย็น', '2 ปี', 'female', 'medium', 'cat', COALESCE(foundation_display_name, 'มูลนิธิเพื่อสุนัขและแมว'), '5.5 กม.',
    ARRAY['https://images.unsplash.com/photo-1573865526739-10659fec78a5?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80'],
    ARRAY['ทำหมันแล้ว', 'สงบเสงี่ยม', 'ไม่ชอบเสียงดัง'], 
    'ชาเย็นเป็นแมวส้มตัวเมียที่เรียบร้อยมาก ไม่ค่อยร้องเสียงดัง ชอบนอนอาบแดดที่ริมหน้าต่าง เหมาะสำหรับคนที่อยากได้แมวเลี้ยงในคอนโด', 
    'available'
  ),
  (
    selected_foundation_id, 'ดำดง', '5 ปี', 'male', 'large', 'dog', COALESCE(foundation_display_name, 'มูลนิธิเพื่อสุนัขและแมว'), '12 กม.',
    ARRAY['https://images.unsplash.com/photo-1537151608828-ea2b11777ee8?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80'],
    ARRAY['ฝึกมาแล้ว', 'แสนรู้', 'รักเด็ก'], 
    'ดำดง หมาไทยสีดำขลับที่แสนรู้และเชื่อฟังคำสั่ง น้องเคยถูกฝึกมาอย่างดีก่อนจะพลัดหลงกับเจ้าของเก่า รักเด็กและใจดีมาก', 
    'available'
  ),
  (
    selected_foundation_id, 'มูมู่', '8 เดือน', 'female', 'small', 'cat', COALESCE(foundation_display_name, 'มูลนิธิเพื่อสุนัขและแมว'), '4.0 กม.',
    ARRAY['https://images.unsplash.com/photo-1526336024174-e58f5cdd8e13?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80'],
    ARRAY['ขนสั้น', 'ขี้เล่น', 'ฉีดวัคซีนครบ'], 
    'มูมู่เป็นแมวลายสลิดที่ซุกซนและชอบสำรวจทุกซอกทุกมุมในบ้าน ถ้าคุณมีไม้ล่อแมว มูมู่จะเล่นด้วยทั้งวันไม่มีเบื่อเลย', 
    'available'
  ),
  (
    selected_foundation_id, 'บราวนี่', '1.5 ปี', 'male', 'medium', 'dog', COALESCE(foundation_display_name, 'มูลนิธิเพื่อสุนัขและแมว'), '8.1 กม.',
    ARRAY['https://images.unsplash.com/photo-1552053831-71594a27632d?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80'],
    ARRAY['พลังงานสูง', 'ชอบวิ่ง', 'ทำหมันแล้ว'], 
    'บราวนี่ น้องหมาสีน้ำตาลช็อกโกแลตที่มีพลังงานล้นเหลือ เหมาะสำหรับคนที่ชอบออกกำลังกายและอยากได้เพื่อนวิ่งจ๊อกกิ้งตอนเช้าๆ', 
    'available'
  ),
  (
    selected_foundation_id, 'กะทิ', '3 ปี', 'female', 'small', 'cat', COALESCE(foundation_display_name, 'มูลนิธิเพื่อสุนัขและแมว'), '3.2 กม.',
    ARRAY['https://images.unsplash.com/photo-1501820488136-72669149e0d4?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80'],
    ARRAY['ตาสองสี', 'เรียบร้อย', 'ขี้อาย'], 
    'กะทิเป็นแมวขาวมณีตาสองสีที่สวยงามมาก แต่น้องค่อนข้างขี้อายและต้องใช้เวลาในการปรับตัวให้เข้ากับคนแปลกหน้า หากคุ้นเคยแล้วจะอ้อนเก่งสุดๆ', 
    'available'
  ),
  (
    selected_foundation_id, 'โคล่า', '4 เดือน', 'male', 'small', 'dog', COALESCE(foundation_display_name, 'มูลนิธิเพื่อสุนัขและแมว'), '12 กม.',
    ARRAY['https://images.unsplash.com/photo-1591160690555-5debfba289f0?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80'],
    ARRAY['ลูกสุนัข', 'กำลังโต', 'กินเก่ง'], 
    'โคล่า ลูกสุนัขสีดำตัวอ้วนกลมที่เพิ่งหย่านม น้องน่ารักและกำลังอยู่ในวัยเรียนรู้ ต้องการเจ้าของที่มีเวลาสอนและดูแล', 
    'available'
  ),
  (
    selected_foundation_id, 'ปีโป้', '1 ปี', 'male', 'medium', 'cat', COALESCE(foundation_display_name, 'มูลนิธิเพื่อสุนัขและแมว'), '5.5 กม.',
    ARRAY['https://images.unsplash.com/photo-1513245543132-31f507417b26?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80'],
    ARRAY['ขี้ประจบ', 'เสียงหวาน', 'ทำหมันแล้ว'], 
    'ปีโป้เป็นแมววิเชียรมาศที่มีเสียงร้องเป็นเอกลักษณ์ น้องชอบเดินตามคนไปทุกที่และมักจะส่งเสียงเรียกเวลาหิวหรืออยากให้สนใจ', 
    'available'
  ),
  (
    selected_foundation_id, 'ข้าวต้ม', '6 ปี', 'female', 'medium', 'dog', COALESCE(foundation_display_name, 'มูลนิธิเพื่อสุนัขและแมว'), '8.1 กม.',
    ARRAY['https://images.unsplash.com/photo-1517849845537-4d257902454a?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80'],
    ARRAY['หมาแก่', 'ใจเย็น', 'ไม่ดื้อ'], 
    'ข้าวต้มเป็นสุนัขวัยกลางคนที่ผ่านโลกมาเยอะ น้องไม่ซน ไม่ดื้อ และชอบนอนเงียบๆ อยู่ใกล้ๆ เจ้าของ เหมาะสำหรับคนที่ต้องการความสงบ', 
    'available'
  ),
  (
    selected_foundation_id, 'ลาเต้', '5 เดือน', 'female', 'small', 'cat', COALESCE(foundation_display_name, 'มูลนิธิเพื่อสุนัขและแมว'), '4.0 กม.',
    ARRAY['https://images.unsplash.com/photo-1495360010541-f48722b34f7d?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80'],
    ARRAY['สีเปรอะ', 'กินยาก', 'ขี้เล่น'], 
    'ลาเต้ แมวสีเปรอะหน้าตาน่ารัก น้องยังเด็กและขี้เล่นมาก แต่ค่อนข้างเลือกกินนิดหน่อย ต้องการทาสแมวที่ตามใจเรื่องอาหารครับ', 
    'available'
  ),
  (
    selected_foundation_id, 'บิ๊กบอส', '2 ปี 5 เดือน', 'male', 'large', 'dog', COALESCE(foundation_display_name, 'มูลนิธิเพื่อสุนัขและแมว'), '12 กม.',
    ARRAY['https://images.unsplash.com/photo-1534361960057-19889db9621e?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80'],
    ARRAY['หน้าดุใจดี', 'เฝ้าสวนได้', 'ฉีดวัคซีนครบ'], 
    'บิ๊กบอส หมาพันธุ์ใหญ่ที่หน้าตาอาจจะดูดุ แต่นิสัยจริงคือลูกหมาในร่างยักษ์ ชอบให้เกาพุงและสามารถเฝ้าบ้านเฝ้าสวนได้ดีเยี่ยม', 
    'available'
  );

END $$;
