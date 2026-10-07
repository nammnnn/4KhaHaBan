-- ==============================================================================
-- 4ขาหาบ้าน (4KhaHaBan) — Seed Real Animals from Saved Souls Foundation
-- ==============================================================================
-- วัตถุประสงค์:
-- นำเข้าชุดข้อมูลสัตว์เลี้ยงจริง 104 ตัว (แมว 38 ตัว, หมา 66 ตัว) จากมูลนิธิ Saved Souls Foundation
-- แทนที่ข้อมูลจำลองเดิม พร้อมคำอธิบาย 2 ภาษา (ไทยและอังกฤษ) และรูปภาพจริง
--
-- วิธีใช้:
-- คัดลอกสคริปต์นี้ไปวางใน Supabase Dashboard -> SQL Editor แล้วกด Run
-- ==============================================================================

DO $$
DECLARE
  foundation_uuid UUID := 'e5755b6f-2fbd-4b0a-8e73-1186251d269a';
  foundation_title TEXT := 'มูลนิธิ Saved Souls Foundation';
BEGIN
  -- 1. ตรวจสอบหรือค้นหา ID มูลนิธิในระบบ
  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = foundation_uuid) THEN
    SELECT id INTO foundation_uuid FROM public.profiles WHERE role = 'foundation' LIMIT 1;
  END IF;

  IF foundation_uuid IS NULL THEN
    foundation_uuid := '11111111-1111-1111-1111-111111111111';
  END IF;

  -- 2. เคลียร์ข้อมูลสัตว์เลี้ยงจำลองเก่า
  DELETE FROM public.animals WHERE shelter = '4 ขาหาบ้าน' OR name IN ('น้องทองแดง', 'ส้มจี๊ด', 'พี่เบิ้ม', 'ไข่ตุ๋น', 'หมูปิ้ง', 'มูมู่', 'บราวนี่', 'กะทิ', 'โคล่า', 'ปีโป้');

  -- 3. อัปเดตข้อมูลมูลนิธิใน foundation_profiles
  INSERT INTO public.foundation_profiles (id, foundation_name, verification_status, contact_phone, address, promptpay_number)
  VALUES (foundation_uuid, foundation_title, 'approved', '0812345678', 'บางละมุง ชลบุรี ประเทศไทย (Saved Souls Foundation)', '0812345678')
  ON CONFLICT (id) DO UPDATE SET
    foundation_name = EXCLUDED.foundation_name,
    verification_status = EXCLUDED.verification_status,
    address = EXCLUDED.address;

  -- 4. นำเข้าข้อมูลสัตว์เลี้ยงจริงทั้งหมด
  INSERT INTO public.animals (
    foundation_id, name, type, age, gender, size, shelter, distance, latitude, longitude, images, tags, story, status
  ) VALUES 
  (foundation_uuid, 'บาคีรา (Bagheera)', 'cat', '1 ปี 6 เดือน', 'male', 'medium', foundation_title, '5.0 กม.', 12.9276, 100.9238, ARRAY['https://bahayuvgxwlciaqtcpkt.supabase.co/storage/v1/object/public/animal-images/cat_p1_1.jpeg'], ARRAY['ทำหมันแล้ว', 'ขี้อ้อน', 'โซนดูแลพิเศษ'], 'ไทย:
บาคีรา น้องแมวสีดำขลับแววตาสดใส อยู่ในโซนดูแลพิเศษของมูลนิธิ นิสัยสงบเสงี่ยม ขี้อ้อน และชอบคลอเคลียเวลาได้รับความรัก น้องปรับตัวง่าย สุขภาพแข็งแรง และพร้อมมอบความอบอุ่นให้บ้านใหม่ครับ

English:
Bagheera is a handsome sleek black cat in the foundation''s special care zone. Calm, affectionate, and fond of gentle cuddles, he adapts quickly, enjoys quiet companionship, and is ready for a loving forever home.', 'available'),
  (foundation_uuid, 'บลูเบอร์รี่ (Blueberry)', 'cat', '1 ปี', 'female', 'small', foundation_title, '5.0 กม.', 12.9276, 100.9238, ARRAY['https://bahayuvgxwlciaqtcpkt.supabase.co/storage/v1/object/public/animal-images/cat_p1_2.jpeg'], ARRAY['เรียบร้อย', 'ทำวัคซีนแล้ว', 'โซนดูแลพิเศษ'], 'ไทย:
บลูเบอร์รี่ น้องแมวเพศเมียตัวเล็กน่ารัก นิสัยสุภาพ เรียบร้อย ไม่ซน ชอบนอนพักผ่อนในมุมอบอุ่น ได้รับวัคซีนครบถ้วน เหมาะสำหรับผู้ที่ต้องการเพื่อนคลายเหงาในคอนโดหรือบ้านที่เงียบสงบค่ะ

English:
Blueberry is a delicate and sweet-natured young cat. Very gentle, well-mannered, and fully vaccinated, she enjoys relaxing in cozy corners and makes an ideal gentle companion for an apartment or calm home.', 'available'),
  (foundation_uuid, 'ลักกี้ (Lucky)', 'cat', '2 ปี', 'male', 'medium', foundation_title, '5.0 กม.', 12.9276, 100.9238, ARRAY['https://bahayuvgxwlciaqtcpkt.supabase.co/storage/v1/object/public/animal-images/cat_p1_3.jpeg'], ARRAY['ร่าเริง', 'เข้ากับคนง่าย', 'โซนดูแลพิเศษ'], 'ไทย:
ลักกี้ น้องแมวลายสลิดนำโชค อารมณ์ดีและเป็นมิตรกับทุกคน เข้ากับคนแปลกหน้าได้ง่าย ชอบส่งเสียงทักทายเมื่อมีคนเดินผ่าน กำลังมองหาบ้านที่พร้อมเปิดรับความสดใสครับ

English:
Lucky is a friendly and cheerful tabby cat who greets visitors with soft purrs. Social, confident, and very loving, Lucky brings joy wherever he goes and is eager to join a caring family.', 'available'),
  (foundation_uuid, 'โมซาร์ต (Mozart)', 'cat', '1 ปี 2 เดือน', 'male', 'medium', foundation_title, '5.0 กม.', 12.9276, 100.9238, ARRAY['https://bahayuvgxwlciaqtcpkt.supabase.co/storage/v1/object/public/animal-images/cat_p1_4.jpeg'], ARRAY['เสียงหวาน', 'ติดคน', 'ทำวัคซีนแล้ว'], 'ไทย:
โมซาร์ต น้องแมวทักซิโด้ขาวดำผู้มีน้ำเสียงร้องอันไพเราะสมชื่อ นิสัยติดคน ชอบเดินตามและเข้ามานอนซบข้างๆ ได้รับการดูแลสุขภาพและฉีดวัคซีนเรียบร้อยครับ

English:
Mozart is a charming tuxedo cat blessed with a melodious meow. He forms strong bonds with humans, loves following his caregivers around, and is fully vaccinated and ready to serenade his new family.', 'available'),
  (foundation_uuid, 'แพนเค้ก (Pancake)', 'cat', '8 เดือน', 'female', 'small', foundation_title, '5.0 กม.', 12.9276, 100.9238, ARRAY['https://bahayuvgxwlciaqtcpkt.supabase.co/storage/v1/object/public/animal-images/cat_p1_5.jpeg'], ARRAY['ขี้เล่น', 'ขนปุกปุย', 'ใช้กระบะทรายเป็น'], 'ไทย:
แพนเค้ก ลูกแมวน้อยขนปุยสีนวลตา วัยกำลังซน ชอบเล่นลูกบอลและไม้ล่อแมว เรียนรู้ไว ใช้กระบะทรายเป็นอย่างดี ต้องการทาสแมวที่พร้อมดูแลน้องให้เติบโตอย่างมีความสุขค่ะ

English:
Pancake is an adorable, fluffy young kitten full of playful curiosity. She loves chasing toys, is fully litter-trained, and is searching for a dedicated human to guide her into adulthood.', 'available'),
  (foundation_uuid, 'แชร์คาน (Shere Khan)', 'cat', '2 ปี 5 เดือน', 'male', 'large', foundation_title, '5.0 กม.', 12.9276, 100.9238, ARRAY['https://bahayuvgxwlciaqtcpkt.supabase.co/storage/v1/object/public/animal-images/cat_p1_6.jpeg'], ARRAY['สง่างาม', 'สุขุม', 'ทำหมันแล้ว'], 'ไทย:
แชร์คาน แมวหนุ่มร่างสง่าลายเสือคมเข้ม แม้ภายนอกจะดูน่าเกรงขาม แต่นิสัยจริงคือแมวยักษ์ใจดี ชอบนอนแผ่ให้เกาคาง ไม่ดุร้าย และทำหมันเรียบร้อยแล้วครับ

English:
Shere Khan possesses the striking markings of a majestic tiger paired with the heart of a gentle giant. Calm, poised, and fond of chin scratches, he is neutered and ready for his forever realm.', 'available'),
  (foundation_uuid, 'บู๊ตเล็ก (Bootleg)', 'cat', '1 ปี', 'male', 'small', foundation_title, '5.0 กม.', 12.9276, 100.9238, ARRAY['https://bahayuvgxwlciaqtcpkt.supabase.co/storage/v1/object/public/animal-images/cat_p2_1.jpeg'], ARRAY['ซุกซน', 'ชอบเล่นของเล่น', 'ทำวัคซีนแล้ว'], 'ไทย:
บู๊ตเล็ก ขาประจำโซน Cat Paradise ร่าเริง ชอบสำรวจสิ่งรอบตัวและวิ่งเล่นกับเพื่อนแมว เข้ากับสภาพแวดล้อมใหม่ได้ง่าย เหมาะกับครอบครัวที่ชอบแมวพลังงานดีครับ

English:
Bootleg is a lively resident of Cat Paradise who loves exploring every nook and cranny. Active, playful, and great with other felines, he brings boundless energy and joy.', 'available'),
  (foundation_uuid, 'บัตเตอร์ (Butter)', 'cat', '1 ปี 4 เดือน', 'female', 'medium', foundation_title, '5.0 กม.', 12.9276, 100.9238, ARRAY['https://bahayuvgxwlciaqtcpkt.supabase.co/storage/v1/object/public/animal-images/cat_p2_2.jpeg'], ARRAY['สีนวลตา', 'ขี้อ้อน', 'ใจดี'], 'ไทย:
บัตเตอร์ แมวสีครีมนวลตา อบอุ่นสมชื่อ อ่อนโยน ขี้อ้อน ชอบมานอนซุกข้างตักเวลาพักผ่อน เข้ากับแมวตัวอื่นได้ดีมาก เป็นสมาชิกที่แสนสงบของบ้านแน่นอนค่ะ

English:
Butter is as smooth and sweet as her name suggests. Creamy-coated, docile, and affectionate, she loves curling up beside people and coexists peacefully with other pets.', 'available'),
  (foundation_uuid, 'เซซีเลีย (Cecelia)', 'cat', '2 ปี', 'female', 'medium', foundation_title, '5.0 กม.', 12.9276, 100.9238, ARRAY['https://bahayuvgxwlciaqtcpkt.supabase.co/storage/v1/object/public/animal-images/cat_p2_3.jpeg'], ARRAY['เรียบร้อย', 'รักสงบ', 'ทำหมันแล้ว'], 'ไทย:
เซซีเลีย สุภาพสตรีสี่ขาผู้รักความสงบ ชอบนั่งมองนกริมหน้าต่าง ไม่ชอบเสียงดัง รักษาสุขอนามัยดีเยี่ยม เหมาะสำหรับบ้านที่ต้องการบรรยากาศที่ผ่อนคลายค่ะ

English:
Cecelia is a dignified, serene lady who appreciates quiet spaces and sun-drenched window sills. Clean, independent, and gentle, she thrives in calm environments.', 'available'),
  (foundation_uuid, 'ดิงโก้ (Dingo)', 'cat', '1 ปี 8 เดือน', 'male', 'medium', foundation_title, '5.0 กม.', 12.9276, 100.9238, ARRAY['https://bahayuvgxwlciaqtcpkt.supabase.co/storage/v1/object/public/animal-images/cat_p2_4.jpeg'], ARRAY['พลังงานสูง', 'ชอบสำรวจ', 'ร่าเริง'], 'ไทย:
ดิงโก้ แมวหนุ่มผู้ตื่นตัวและฉลาด คล่องแคล่วว่องไว ชอบเล่นซ่อนแอบและโต้ตอบกับผู้ดูแลเสมอ ร่างกายแข็งแรงและสุขภาพสมบูรณ์ครับ

English:
Dingo is an alert and athletic young cat who loves interactive play and solving puzzle toys. Curious and spirited, he is in peak physical health.', 'available'),
  (foundation_uuid, 'โดจา (Doja)', 'cat', '1 ปี', 'female', 'small', foundation_title, '5.0 กม.', 12.9276, 100.9238, ARRAY['https://bahayuvgxwlciaqtcpkt.supabase.co/storage/v1/object/public/animal-images/cat_p2_5.jpeg'], ARRAY['ตาโตน่ารัก', 'ชอบคลอเคลีย', 'ทำวัคซีนแล้ว'], 'ไทย:
โดจา น้องแมวตาแป๋วชวนหลงใหล ขี้อ้อนระดับสิบ ชอบเอาหัวมาชนมือเพื่อขอให้ลูบตัว เข้ากับคนง่ายและรักความสะอาดมากค่ะ

English:
Doja has captivating, expressive eyes and a heart overflowing with love. She loves headbutting hands for gentle strokes and gets along delightfully with humans.', 'available'),
  (foundation_uuid, 'ดัสเตอร์ (Duster)', 'cat', '2 ปี 2 เดือน', 'male', 'medium', foundation_title, '5.0 กม.', 12.9276, 100.9238, ARRAY['https://bahayuvgxwlciaqtcpkt.supabase.co/storage/v1/object/public/animal-images/cat_p2_6.jpeg'], ARRAY['ขนนุ่มฟู', 'กินเก่ง', 'สุขภาพดี'], 'ไทย:
ดัสเตอร์ หนุ่มขนนุ่มฟูดูสะอาดตา อารมณ์ดีตลอดวัน กินง่ายอยู่ง่าย ชอบแปรงขนและชอบให้เกาคอ เป็นแมวที่อยู่ด้วยแล้วสบายใจครับ

English:
Duster is a fluffy, easygoing sweetheart who thoroughly enjoys being brushed and pampered. Healthy, relaxed, and cheerful, he brings instant comfort.', 'available'),
  (foundation_uuid, 'เฟร็กเคิล (Freckle)', 'cat', '9 เดือน', 'female', 'small', foundation_title, '5.0 กม.', 12.9276, 100.9238, ARRAY['https://bahayuvgxwlciaqtcpkt.supabase.co/storage/v1/object/public/animal-images/cat_p2_7.jpeg'], ARRAY['ลายน่ารัก', 'ขี้เล่น', 'ฉลาด'], 'ไทย:
เฟร็กเคิล แมวน้อยแต้มลายสะดุดตา อายุน้อยและเรียนรู้สิ่งใหม่ได้รวดเร็ว ชอบกระโดดจับของเล่นและนอนพักผ่อนอย่างมีความสุขค่ะ

English:
Freckle features charming unique markings and an inquisitive, playful mind. Quick to learn and quick to cuddle, she is an absolute darling.', 'available'),
  (foundation_uuid, 'ฟรอสตี้ (Frosty)', 'cat', '1 ปี 5 เดือน', 'male', 'medium', foundation_title, '5.0 กม.', 12.9276, 100.9238, ARRAY['https://bahayuvgxwlciaqtcpkt.supabase.co/storage/v1/object/public/animal-images/cat_p2_8.jpeg'], ARRAY['สีขาวนวล', 'รักสงบ', 'เข้ากับแมวตัวอื่นได้ดี'], 'ไทย:
ฟรอสตี้ น้องแมวขาวสะอาดตา จิตใจอ่อนโยนและไม่เคยมีปัญหากับเพื่อนแมวตัวไหน เข้าสังคมแมวเก่งมาก เหมาะกับบ้านที่มีแมวอยู่แล้วครับ

English:
Frosty is a graceful white-furred cat with a calm, accepting temperament. Highly social with other felines, he integrates effortlessly into multi-pet homes.', 'available'),
  (foundation_uuid, 'จอร์จ (George)', 'cat', '3 ปี', 'male', 'large', foundation_title, '5.0 กม.', 12.9276, 100.9238, ARRAY['https://bahayuvgxwlciaqtcpkt.supabase.co/storage/v1/object/public/animal-images/cat_p2_9.jpeg'], ARRAY['อบอุ่น', 'ชอบนอนกลางวัน', 'ทำหมันแล้ว'], 'ไทย:
จอร์จ พี่ใหญ่ประจำโซน นิสัยใจเย็น สุขุม ชอบนอนกลางวันท่ามกลางแสงแดดอุ่นๆ เป็นมิตรและวางตัวดีมาก ทำหมันเรียบร้อยแล้วครับ

English:
George is a mature, gentle feline who values serene naps and warm companionship. Patient, quiet, and neutered, he is the picture of tranquility.', 'available'),
  (foundation_uuid, 'ฮอค (Hawk)', 'cat', '1 ปี 3 เดือน', 'male', 'medium', foundation_title, '5.0 กม.', 12.9276, 100.9238, ARRAY['https://bahayuvgxwlciaqtcpkt.supabase.co/storage/v1/object/public/animal-images/cat_p2_10.jpeg'], ARRAY['สายตาวาววับ', 'ว่องไว', 'ชอบปีนป่าย'], 'ไทย:
ฮอค แมวลายเสือแววตามุ่งมั่น ชอบปีนขึ้นที่สูงเพื่อสอดส่องดูแลอาณาเขต ร่างกายแข็งแรง คล่องแคล่ว และขี้เล่นมากครับ

English:
Hawk has striking keen eyes and loves perching up high to observe his surroundings. Agile, healthy, and playful, he loves cat towers and active play.', 'available'),
  (foundation_uuid, 'เฮเซล (Hazel)', 'cat', '2 ปี', 'female', 'medium', foundation_title, '5.0 กม.', 12.9276, 100.9238, ARRAY['https://bahayuvgxwlciaqtcpkt.supabase.co/storage/v1/object/public/animal-images/cat_p2_11.jpeg'], ARRAY['ตาสีอำพัน', 'สุภาพ', 'ทำวัคซีนแล้ว'], 'ไทย:
เฮเซล แมวสาวดวงตาสีอำพันทรงเสน่ห์ นิสัยสุภาพ นุ่มนวล ไม่ส่งเสียงดัง ฉีดวัคซีนครบถ้วนและพร้อมย้ายเข้าสู่บ้านที่อบอุ่นค่ะ

English:
Hazel is an elegant cat with captivating amber eyes and an extremely courteous demeanor. Gentle, quiet, and fully vaccinated, she makes a loyal companion.', 'available'),
  (foundation_uuid, 'เก๋ (Kea)', 'cat', '1 ปี 1 เดือน', 'female', 'small', foundation_title, '5.0 กม.', 12.9276, 100.9238, ARRAY['https://bahayuvgxwlciaqtcpkt.supabase.co/storage/v1/object/public/animal-images/cat_p2_12.jpeg'], ARRAY['น่ารักสดใส', 'ช่างเจรจา', 'ขี้อ้อน'], 'ไทย:
เก๋ น้องแมวเสียงใสช่างพูด ชอบส่งเสียงตอบรับเวลาเรียกชื่อ ขี้อ้อนและชอบอยู่ใกล้ชิดคน เติมเต็มรอยยิ้มให้กับทุกคนในบ้านค่ะ

English:
Kea is a delightful, talkative young cat who responds sweetly when spoken to. Affectionate and people-oriented, she will fill your home with laughter.', 'available'),
  (foundation_uuid, 'คิงส์จูเลี่ยน (King Julian)', 'cat', '2 ปี 6 เดือน', 'male', 'large', foundation_title, '5.0 กม.', 12.9276, 100.9238, ARRAY['https://bahayuvgxwlciaqtcpkt.supabase.co/storage/v1/object/public/animal-images/cat_p2_13.jpeg'], ARRAY['ผู้นำฝูง', 'สง่างาม', 'ทำหมันแล้ว'], 'ไทย:
คิงส์จูเลี่ยน แมวใหญ่มาดผู้นำ เดินเหินอย่างสง่างาม ไม่ก้าวร้าว ชอบให้คนเกาหัวและดูแลเอาใจใส่ พร้อมเป็นราชาประจำหัวใจของเจ้าของคนใหม่ครับ

English:
King Julian carries himself with natural regal grace while possessing a warm, cuddly heart. Confident, friendly, and neutered, he is ready to rule your sofa.', 'available'),
  (foundation_uuid, 'กีวี (Kiwi)', 'cat', '10 เดือน', 'female', 'small', foundation_title, '5.0 กม.', 12.9276, 100.9238, ARRAY['https://bahayuvgxwlciaqtcpkt.supabase.co/storage/v1/object/public/animal-images/cat_p2_14.jpeg'], ARRAY['ตัวเล็กน่าทะนุถนอม', 'ชอบเล่นเบาๆ', 'กินง่าย'], 'ไทย:
กีวี แมวน้อยไซส์กะทัดรัด นิสัยอ่อนหวาน กินง่าย ไม่เลือกอาหาร ชอบนอนขดบนเบาะนุ่มๆ และเล่นของเล่นเบาๆ ค่ะ

English:
Kiwi is a petite, sweet-spirited young feline who enjoys gentle playtime and cozy beds. Low-maintenance and loving, she is truly precious.', 'available'),
  (foundation_uuid, 'ลีเมอร์ (Lemur)', 'cat', '1 ปี 7 เดือน', 'male', 'medium', foundation_title, '5.0 กม.', 12.9276, 100.9238, ARRAY['https://bahayuvgxwlciaqtcpkt.supabase.co/storage/v1/object/public/animal-images/cat_p2_15.jpeg'], ARRAY['หางยาวสวย', 'อยากรู้อยากเห็น', 'เป็นมิตร'], 'ไทย:
ลีเมอร์ หนุ่มน้อยหางเรียวยาวสวยงาม ช่างสงสัย ชอบสังเกตสิ่งใหม่ๆ เสมอ เข้ากับคนได้ดีและไม่ขี้กลัวครับ

English:
Lemur is an inquisitive cat with a beautifully expressive tail. Social and curious, he greets every day with optimism and friendliness.', 'available'),
  (foundation_uuid, 'มะม่วง (Mango)', 'cat', '1 ปี 2 เดือน', 'female', 'medium', foundation_title, '5.0 กม.', 12.9276, 100.9238, ARRAY['https://bahayuvgxwlciaqtcpkt.supabase.co/storage/v1/object/public/animal-images/cat_p2_16.jpeg'], ARRAY['ส้มสดใส', 'ชอบนอนอาบแดด', 'อารมณ์ดี'], 'ไทย:
มะม่วง น้องแมวส้มอารมณ์ดี ร่าเริง ชอบนอนผึ่งแดดยามเช้าและเข้ามาคลอเคลียเวลาเจ้าของกลับถึงบ้าน น่ารักและทำให้บ้านสดใสค่ะ

English:
Mango is a sunny ginger sweetheart who loves basking in morning rays and welcoming humans with warm affection. Pure joy in feline form.', 'available'),
  (foundation_uuid, 'โม (Mo)', 'cat', '2 ปี', 'male', 'medium', foundation_title, '5.0 กม.', 12.9276, 100.9238, ARRAY['https://bahayuvgxwlciaqtcpkt.supabase.co/storage/v1/object/public/animal-images/cat_p2_17.jpeg'], ARRAY['เงียบขรึม', 'ไม่ดื้อ', 'ชอบเกาพุง'], 'ไทย:
โม หนุ่มเงียบขรึมรักความสงบ ไม่ดื้อไม่ซน ชอบนอนหงายให้เกาพุงเมื่อเริ่มคุ้นเคย ซื่อสัตย์และต้องการความรักที่มั่นคงครับ

English:
Mo is a quiet, steady-natured companion. Though modest at first, he happily offers his belly for rubs once he knows you. Utterly dependable.', 'available'),
  (foundation_uuid, 'มอซซี่ (Mozzy)', 'cat', '1 ปี 4 เดือน', 'male', 'medium', foundation_title, '5.0 กม.', 12.9276, 100.9238, ARRAY['https://bahayuvgxwlciaqtcpkt.supabase.co/storage/v1/object/public/animal-images/cat_p3_1.jpeg'], ARRAY['ขี้อ้อน', 'ชอบคลอเคลียขา', 'ทำวัคซีนแล้ว'], 'ไทย:
มอซซี่ เจ้าของฉายาแมวติดหนึบ ชอบเดินคลอเคลียรอบขาเพื่อทักทาย ร่าเริง สดใส และฉีดวัคซีนเรียบร้อยแล้วครับ

English:
Mozzy is the ultimate cuddlebug who adores weaving around your legs to say hello. Cheerful, healthy, and vaccinated, he loves being close.', 'available'),
  (foundation_uuid, 'โอเชียนอายส์ (Ocean Eyes)', 'cat', '1 ปี 9 เดือน', 'female', 'small', foundation_title, '5.0 กม.', 12.9276, 100.9238, ARRAY['https://bahayuvgxwlciaqtcpkt.supabase.co/storage/v1/object/public/animal-images/cat_p3_2.jpeg'], ARRAY['ตาสีฟ้าคราม', 'มีเสน่ห์', 'สงบเสงี่ยม'], 'ไทย:
โอเชียนอายส์ สาวน้อยตาสีฟ้าครามลุ่มลึกดั่งมหาสมุทร สงบเสงี่ยม เรียบร้อย มีเสน่ห์เฉพาะตัวและชอบความอ่อนโยนค่ะ

English:
Ocean Eyes mesmerizes everyone with her captivating sky-blue gaze. Gentle, serene, and graceful, she seeks a caring, soft-spoken household.', 'available'),
  (foundation_uuid, 'เพนกวิน (Penguin)', 'cat', '2 ปี', 'male', 'medium', foundation_title, '5.0 กม.', 12.9276, 100.9238, ARRAY['https://bahayuvgxwlciaqtcpkt.supabase.co/storage/v1/object/public/animal-images/cat_p3_3.jpeg'], ARRAY['ลายทักซิโด้', 'เรียบร้อย', 'ทำหมันแล้ว'], 'ไทย:
เพนกวิน หนุ่มทักซิโด้มาดคุณชาย เรียบร้อย สะอาดสะอ้าน ใช้กระบะทรายเป็น และทำหมันเรียบร้อยแล้วครับ

English:
Penguin looks sharply dressed in his timeless tuxedo coat. Polite, immaculate, and fully neutered, he is a true gentleman.', 'available'),
  (foundation_uuid, 'เพนนี่ (Penny)', 'cat', '1 ปี', 'female', 'small', foundation_title, '5.0 กม.', 12.9276, 100.9238, ARRAY['https://bahayuvgxwlciaqtcpkt.supabase.co/storage/v1/object/public/animal-images/cat_p3_4.jpeg'], ARRAY['น่ารักตัวเล็ก', 'ติดคน', 'ชอบนอนตัก'], 'ไทย:
เพนนี่ แมวน้อยตัวกะทัดรัดที่ชอบกระโดดขึ้นมานอนบนตัก ขี้อ้อน ติดคน และส่งเสียงครางเบาๆ อย่างมีความสุขค่ะ

English:
Penny is a pint-sized cuddle champion who loves curling up in your lap for hours. Extremely affectionate and human-centric.', 'available'),
  (foundation_uuid, 'พูมา (Puma)', 'cat', '2 ปี 3 เดือน', 'male', 'large', foundation_title, '5.0 กม.', 12.9276, 100.9238, ARRAY['https://bahayuvgxwlciaqtcpkt.supabase.co/storage/v1/object/public/animal-images/cat_p3_5.jpeg'], ARRAY['แข็งแรง', 'ชอบเล่นวิ่งไล่จับ', 'กินเก่ง'], 'ไทย:
พูมา แมวหนุ่มกำยำ กล้ามเนื้อแน่น ชอบเล่นวิ่งไล่จับของเล่น สุขภาพแข็งแรงมากและกินเก่งครับ

English:
Puma is an athletic, muscular feline who adores active sprint games and good hearty meals. In great health and high spirits.', 'available'),
  (foundation_uuid, 'แพมพ์กิน (Pumpkin)', 'cat', '1 ปี 5 เดือน', 'female', 'medium', foundation_title, '5.0 กม.', 12.9276, 100.9238, ARRAY['https://bahayuvgxwlciaqtcpkt.supabase.co/storage/v1/object/public/animal-images/cat_p3_6.jpeg'], ARRAY['แมวส้มอารมณ์ดี', 'เสียงใส', 'ชอบให้เกาคาง'], 'ไทย:
แพมพ์กิน แมวส้มหน้าหวาน นิสัยร่าเริงและเป็นมิตรกับทุกคน ชอบให้เกาคางและหลับตาพริ้มเวลาได้ความรักค่ะ

English:
Pumpkin is a warm golden sweetheart with a cheerful disposition and soft purr. She adores chin scritches and human company.', 'available'),
  (foundation_uuid, 'โรส (Rose)', 'cat', '2 ปี', 'female', 'medium', foundation_title, '5.0 กม.', 12.9276, 100.9238, ARRAY['https://bahayuvgxwlciaqtcpkt.supabase.co/storage/v1/object/public/animal-images/cat_p3_7.jpeg'], ARRAY['อ่อนโยน', 'ขี้อายเล็กน้อย', 'อบอุ่น'], 'ไทย:
โรส น้องแมวผู้มีความอ่อนโยนในหัวใจ อาจจะขี้อายเล็กน้อยในตอนแรก แต่เมื่อคุ้นเคยแล้วจะหวานและขี้อ้อนมากค่ะ

English:
Rose is a tender soul who blooms beautifully once she feels secure. Soft, delicate, and deeply loyal to those she trusts.', 'available'),
  (foundation_uuid, 'รูดอฟ (Rudolph)', 'cat', '1 ปี 6 เดือน', 'male', 'medium', foundation_title, '5.0 กม.', 12.9276, 100.9238, ARRAY['https://bahayuvgxwlciaqtcpkt.supabase.co/storage/v1/object/public/animal-images/cat_p3_8.jpeg'], ARRAY['จมูกชมพู', 'ขี้เล่น', 'ทำวัคซีนแล้ว'], 'ไทย:
รูดอฟ แมวหนุ่มจมูกสีชมพูแต้มน่ารัก ซุกซน ร่าเริง ชอบเล่นลูกปิงปอง ฉีดวัคซีนครบพร้อมนำโชคดีสู่ครอบครัวครับ

English:
Rudolph sports an adorable pink nose and a playful, bouncy personality. Fully vaccinated and ready to bring festive cheer all year round.', 'available'),
  (foundation_uuid, 'สโมคกี้ (Smoky)', 'cat', '2 ปี 1 เดือน', 'male', 'medium', foundation_title, '5.0 กม.', 12.9276, 100.9238, ARRAY['https://bahayuvgxwlciaqtcpkt.supabase.co/storage/v1/object/public/animal-images/cat_p3_9.jpeg'], ARRAY['สีควันบุหรี่', 'นุ่มนวล', 'ชอบนอนริมหน้าต่าง'], 'ไทย:
สโมคกี้ แมวสีเทาควันบุหรี่สุดคลาสสิก นุ่มนวล สงบเสงี่ยม ชอบนั่งมองวิวริมหน้าต่างและนอนขดข้างๆ ผู้ดูแลครับ

English:
Smoky possesses a classic velvet smoky coat and a gentle, relaxed spirit. He enjoys window watching and peaceful companionship.', 'available'),
  (foundation_uuid, 'สนูป (Snoop)', 'cat', '1 ปี 8 เดือน', 'male', 'medium', foundation_title, '5.0 กม.', 12.9276, 100.9238, ARRAY['https://bahayuvgxwlciaqtcpkt.supabase.co/storage/v1/object/public/animal-images/cat_p3_10.jpeg'], ARRAY['อยากรู้อยากเห็น', 'ฉลาดแสนรู้', 'ชอบของเล่น'], 'ไทย:
สนูป นักสืบสี่ขาผู้ชอบสำรวจทุกสิ่ง ฉลาด ไหวพริบดี และชอบมีส่วนร่วมในกิจกรรมของมนุษย์เสมอครับ

English:
Snoop is an observant and intelligent explorer who investigates every novelty with charming curiosity. Very smart and interactive.', 'available'),
  (foundation_uuid, 'สปิคเคิล (Spickle)', 'cat', '1 ปี', 'female', 'small', foundation_title, '5.0 กม.', 12.9276, 100.9238, ARRAY['https://bahayuvgxwlciaqtcpkt.supabase.co/storage/v1/object/public/animal-images/cat_p3_11.jpeg'], ARRAY['ลายเปรอะน่าเอ็นดู', 'น่ารัก', 'เข้ากับแมวอื่นได้'], 'ไทย:
สปิคเคิล แมวสาวลายกระดองเต่าแต้มสีน่ารัก เป็นมิตรกับทั้งคนและแมว ไม่เคยมีเรื่องกับใคร จิตใจดีมากค่ะ

English:
Spickle has a delightful calico/tortie coat and a heart of pure sunshine. Exceptionally harmonious with other cats and affectionate with people.', 'available'),
  (foundation_uuid, 'สปูคกี้ (Spooky)', 'cat', '1 ปี 3 เดือน', 'male', 'medium', foundation_title, '5.0 กม.', 12.9276, 100.9238, ARRAY['https://bahayuvgxwlciaqtcpkt.supabase.co/storage/v1/object/public/animal-images/cat_p3_12.jpeg'], ARRAY['ลึกลับน่าค้นหา', 'ชอบแอบมอง', 'อ่อนหวาน'], 'ไทย:
สปูคกี้ แมวหนุ่มแววตาลึกลับ ชอบแอบมองจากมุมห้อง แต่เมื่อเข้าไปหาจะส่งเสียงร้องเบาๆ และให้ลูบหัวอย่างมีความสุขครับ

English:
Spooky may peek from behind curtains, but behind that mysterious exterior is a gentle cuddle enthusiast waiting to be loved.', 'available'),
  (foundation_uuid, 'สตับบี้ (Stubby)', 'cat', '2 ปี 4 เดือน', 'male', 'medium', foundation_title, '5.0 กม.', 12.9276, 100.9238, ARRAY['https://bahayuvgxwlciaqtcpkt.supabase.co/storage/v1/object/public/animal-images/cat_p3_13.jpeg'], ARRAY['หางกุดนำโชค', 'ใจดี', 'ทำหมันแล้ว'], 'ไทย:
สตับบี้ แมวหางกุดตามธรรมชาติสไตล์แมวไทย นำโชคลาภ จิตใจดี อ่อนโยน เข้ากับทุกคนได้ง่าย ทำหมันแล้วครับ

English:
Stubby is a lucky bobtail boy with an endearing presence. Even-tempered, loving, and neutered, he is a steadfast friend.', 'available'),
  (foundation_uuid, 'ทูอี้ (Tui)', 'cat', '1 ปี 1 เดือน', 'female', 'small', foundation_title, '5.0 กม.', 12.9276, 100.9238, ARRAY['https://bahayuvgxwlciaqtcpkt.supabase.co/storage/v1/object/public/animal-images/cat_p3_14.jpeg'], ARRAY['ขี้อ้อนมาก', 'ชอบส่งเสียงทักทาย', 'ทำวัคซีนแล้ว'], 'ไทย:
ทูอี้ สาวน้อยขี้อ้อนขั้นสุด ชอบส่งเสียงทักทายทุกครั้งที่เห็นคน ร่าเริง สดใส และได้รับวัคซีนครบถ้วนค่ะ

English:
Tui is an expressive, social sweetheart who greets you with warm chirps. Vibrant, healthy, and vaccinated, she radiates affection.', 'available'),
  (foundation_uuid, 'ซอร์โร (Zorro)', 'cat', '2 ปี 2 เดือน', 'male', 'large', foundation_title, '5.0 กม.', 12.9276, 100.9238, ARRAY['https://bahayuvgxwlciaqtcpkt.supabase.co/storage/v1/object/public/animal-images/cat_p3_15.jpeg'], ARRAY['ลายหน้ากากเท่', 'กล้าหาญ', 'เป็นมิตร'], 'ไทย:
ซอร์โร แมวหน้ากากฮีโร่สุดเท่ มั่นใจในตัวเอง กล้าหาญ แต่เป็นมิตรและรักสงบเมื่ออยู่ในบ้าน ทำหมันเรียบร้อยแล้วครับ

English:
Zorro rocks a dashing masked facial pattern. Confident, brave, yet wonderfully gentle at home, he is an exceptional companion.', 'available'),
  (foundation_uuid, 'ร็อตแทง (Rottaang)', 'dog', '3 ปี', 'male', 'medium', foundation_title, '5.0 กม.', 12.9276, 100.9238, ARRAY['https://bahayuvgxwlciaqtcpkt.supabase.co/storage/v1/object/public/animal-images/dog_p1_4.jpeg'], ARRAY['บกพร่องทางการมองเห็น', 'เดินสายจูงได้ดี', 'หัวใจนักสู้', 'ทำหมันแล้ว'], 'ไทย:
ร็อตแทง สุนัขผู้เข้มแข็งจากโซนดูแลสุนัขตาบอด แม้สายตาจะมองไม่เห็นแต่น้องสามารถปรับตัวและเดินสายจูงได้อย่างมั่นคง จิตใจอ่อนโยน ร่าเริง และพร้อมมอบความรักให้ครอบครัวที่เข้าใจและเมตตาครับ

English:
Rottaang is a resilient, loving boy from the Blind Area. Although blind, he walks remarkably well on a leash and navigates by hearing and touch. Sweet-tempered and brave, he is seeking an understanding home.', 'available'),
  (foundation_uuid, 'โดบี้ (Dobi)', 'dog', '2 ปี', 'male', 'medium', foundation_title, '5.0 กม.', 12.9276, 100.9238, ARRAY['https://bahayuvgxwlciaqtcpkt.supabase.co/storage/v1/object/public/animal-images/dog_p1_1.jpeg'], ARRAY['บกพร่องทางการมองเห็น', 'ขี้อ้อน', 'ชอบให้ลูบตัว'], 'ไทย:
โดบี้ น้องหมาตาบอดแต่มีประสาทรับเสียงและสัมผัสยอดเยี่ยม ชอบเอาตัวมาพิงและให้ลูบหัวอย่างมีความสุข เป็นสุนัขที่อ่อนโยนและต้องการความอบอุ่นครับ

English:
Dobi is a gentle blind dog with an extraordinary heart. He leans affectionately against caregivers for pets and thrives on quiet kindness and consistent routine.', 'available'),
  (foundation_uuid, 'คีวี (Kiwi)', 'dog', '2 ปี 5 เดือน', 'female', 'small', foundation_title, '5.0 กม.', 12.9276, 100.9238, ARRAY['https://bahayuvgxwlciaqtcpkt.supabase.co/storage/v1/object/public/animal-images/dog_p1_2.jpeg'], ARRAY['บกพร่องทางการมองเห็น', 'ใจดี', 'เรียบร้อย'], 'ไทย:
คีวี สุนัขเพศเมียตัวเล็กผู้บกพร่องทางการมองเห็น นิสัยเรียบร้อย สงบเสงี่ยม ปรับตัวในพื้นที่คุ้นเคยได้เป็นอย่างดี เหมาะสำหรับบ้านที่พร้อมดูแลเอาใจใส่ค่ะ

English:
Kiwi is a petite, quiet female dog in the Blind Area. Well-mannered and peaceful, she maps out familiar indoor spaces easily and loves gentle companionship.', 'available'),
  (foundation_uuid, 'นมัสเต (Namaste)', 'dog', '3 ปี', 'female', 'medium', foundation_title, '5.0 กม.', 12.9276, 100.9238, ARRAY['https://bahayuvgxwlciaqtcpkt.supabase.co/storage/v1/object/public/animal-images/dog_p1_3.jpeg'], ARRAY['บกพร่องทางการมองเห็น', 'สงบเสงี่ยม', 'ปรับตัวเก่ง'], 'ไทย:
นมัสเต น้องหมาผู้สงบนิ่งดั่งชื่อ เข้าใจโลก อารมณ์เย็นและรักสงบ มีความสุขกับการได้นอนพักผ่อนข้างๆ คนที่รักและไว้ใจค่ะ

English:
Namaste is a peaceful and soulful dog from the Blind Area. Serene, patient, and deeply grateful for kindness, she brings a calm aura to any household.', 'available'),
  (foundation_uuid, 'สากะ (Saka)', 'dog', '4 ปี', 'male', 'large', foundation_title, '5.0 กม.', 12.9276, 100.9238, ARRAY['https://bahayuvgxwlciaqtcpkt.supabase.co/storage/v1/object/public/animal-images/dog_p1_5.jpeg'], ARRAY['บกพร่องทางการมองเห็น', 'ใจดีและเป็นมิตร', 'ทำวัคซีนแล้ว'], 'ไทย:
สากะ สุนัขตัวโตใจดีจากโซนตาบอด อ่อนโยนกับทุกคน ไม่ก้าวร้าว ชอบนอนรับลมและฟังเสียงรอบตัว ได้รับวัคซีนครบถ้วนครับ

English:
Saka is a large, gentle-hearted dog in the Blind Area. Completely non-aggressive, polite, and fully vaccinated, he is a true loyal giant.', 'available'),
  (foundation_uuid, 'อเมริกาโน่ (Americano)', 'dog', '2 ปี', 'male', 'large', foundation_title, '5.0 กม.', 12.9276, 100.9238, ARRAY['https://bahayuvgxwlciaqtcpkt.supabase.co/storage/v1/object/public/animal-images/dog_p2_1.jpeg'], ARRAY['สีเข้มดูดี', 'ขี้เล่น', 'ฉีดวัคซีนแล้ว'], 'ไทย:
อเมริกาโน่ สุนัขสีเข้มคมเข้มสมชื่อ ร่าเริง แข็งแรง ผ่านการดูแลฟื้นฟูสุขภาพจากคลินิกจนสมบูรณ์ พร้อมออกไปวิ่งเล่นกับครอบครัวใหม่ครับ

English:
Americano is a handsome dark-coated dog fully rehabilitated at the Clinic. Energetic, strong, and playful, he is ready for outdoor fun.', 'available'),
  (foundation_uuid, 'เบลล่า (Bella)', 'dog', '2 ปี 6 เดือน', 'female', 'medium', foundation_title, '5.0 กม.', 12.9276, 100.9238, ARRAY['https://bahayuvgxwlciaqtcpkt.supabase.co/storage/v1/object/public/animal-images/dog_p2_2.jpeg'], ARRAY['เดินสายจูงได้', 'พลังงานสูง', 'ชอบคน', 'เหมาะเป็นสัตว์เลี้ยงเดี่ยว'], 'ไทย:
เบลล่า สุนัขแสนร่าเริงและรักมนุษย์มาก สามารถเดินสายจูงได้ดี แต่มีความตื่นตัวต่อสุนัขตัวอื่น จึงเหมาะที่สุดกับการเป็นสัตว์เลี้ยงตัวเดียวในบ้านที่พร้อมให้ความรักเต็มที่ค่ะ

English:
Bella is an enthusiastic, human-loving dog who walks well on a leash. Because she can be reactive when encountering other dogs, she thrives best as the only beloved pet.', 'available'),
  (foundation_uuid, 'บุญรูด (Boonrood)', 'dog', '3 ปี', 'male', 'medium', foundation_title, '5.0 กม.', 12.9276, 100.9238, ARRAY['https://bahayuvgxwlciaqtcpkt.supabase.co/storage/v1/object/public/animal-images/dog_p2_4.jpeg'], ARRAY['รอดชีวิตปาฏิหาริย์', 'ซื่อสัตย์', 'ทำหมันแล้ว'], 'ไทย:
บุญรูด สุนัขผู้รอดชีวิตจากความยากลำบาก ซื่อสัตย์ ภักดี และกตัญญูมาก ตอนนี้สุขภาพแข็งแรง ทำหมันแล้ว และรอคอยบ้านที่จะไม่ทอดทิ้งเขาอีกครับ

English:
Boonrood is a grateful survivor whose loyalty knows no bounds. Fully recovered, neutered, and deeply devoted, he will stand by his adoptive family forever.', 'available'),
  (foundation_uuid, 'เซเลสเต้ (Celeste)', 'dog', '1 ปี 8 เดือน', 'female', 'medium', foundation_title, '5.0 กม.', 12.9276, 100.9238, ARRAY['https://bahayuvgxwlciaqtcpkt.supabase.co/storage/v1/object/public/animal-images/dog_p2_5.jpeg'], ARRAY['ร่าเริงสดใส', 'ขี้อ้อน', 'เข้ากับคนง่าย'], 'ไทย:
เซเลสเต้ น้องหมาสาวรอยยิ้มสดใส ร่าเริงและเข้ากับทุกคนได้ง่าย ชอบให้เกาพุงและกระดิกหางต้อนรับเสมอค่ะ

English:
Celeste radiates infectious cheerfulness. Friendly with visitors, eager to please, and fond of belly rubs, she brightens every room she enters.', 'available'),
  (foundation_uuid, 'ชีโต (Cheeto)', 'dog', '1 ปี 5 เดือน', 'male', 'small', foundation_title, '5.0 กม.', 12.9276, 100.9238, ARRAY['https://bahayuvgxwlciaqtcpkt.supabase.co/storage/v1/object/public/animal-images/dog_p2_6.jpeg'], ARRAY['เดินสายจูงเก่ง', 'น่ารักสดใส', 'ชอบออกกำลังกาย'], 'ไทย:
ชีโต สุนัขตัวเล็กกะทัดรัด เดินสายจูงเก่งมาก สดใส กระฉับกระเฉง เหมาะสำหรับพาเดินเล่นในสวนสาธารณะทุกวันครับ

English:
Cheeto is a sprightly, compact dog who excels on leash walks. Fun-loving and energetic, he is a wonderful walking partner.', 'available'),
  (foundation_uuid, 'โคโค่ ชาแนล (Coco Chanel)', 'dog', '2 ปี', 'female', 'medium', foundation_title, '5.0 กม.', 12.9276, 100.9238, ARRAY['https://bahayuvgxwlciaqtcpkt.supabase.co/storage/v1/object/public/animal-images/dog_p2_7.jpeg'], ARRAY['สวยสง่า', 'เรียบร้อย', 'ทำวัคซีนครบ'], 'ไทย:
โคโค่ ชาแนล สุนัขสาวมาดคุณหนู เรียบร้อย สะอาด สุภาพ อ่อนโยน ฉีดวัคซีนครบถ้วนและพร้อมเป็นสมาชิกคนโปรดของบ้านค่ะ

English:
Coco Chanel carries herself with poise and grace. Polite, clean, fully vaccinated, and affectionate, she is ready to be your most treasured companion.', 'available'),
  (foundation_uuid, 'เฟรยา (Freya)', 'dog', '2 ปี 2 เดือน', 'female', 'medium', foundation_title, '5.0 กม.', 12.9276, 100.9238, ARRAY['https://bahayuvgxwlciaqtcpkt.supabase.co/storage/v1/object/public/animal-images/dog_p2_9.jpeg'], ARRAY['ใจเย็น', 'สายตาอ่อนโยน', 'ชอบนอนข้างๆ'], 'ไทย:
เฟรยา น้องหมาสายตาอบอุ่น นิสัยสุขุม ไม่ส่งเสียงรบกวน ชอบนอนพักผ่อนเคียงข้างเจ้าของ เป็นเพื่อนแท้ที่เข้าใจความรู้สึกค่ะ

English:
Freya has a deeply compassionate, calm gaze. She rarely barks, loves lying peacefully by your feet, and provides quiet comfort.', 'available'),
  (foundation_uuid, 'จอนนี่ (Johnny)', 'dog', '3 ปี', 'male', 'medium', foundation_title, '5.0 กม.', 12.9276, 100.9238, ARRAY['https://bahayuvgxwlciaqtcpkt.supabase.co/storage/v1/object/public/animal-images/dog_p2_10.jpeg'], ARRAY['ฉลาดแสนรู้', 'ชอบเล่นบอล', 'สุขภาพดี'], 'ไทย:
จอนนี่ สุนัขแสนรู้ ฉลาดและรับคำสั่งได้ไว ชอบวิ่งคาบลูกบอล สุขภาพแข็งแรงสมบูรณ์และเป็นมิตรกับผู้คนครับ

English:
Johnny is a sharp, quick-witted canine who loves fetch and learning tricks. Robust, athletic, and eager to connect.', 'available'),
  (foundation_uuid, 'ลอตตี (Lottie)', 'dog', '1 ปี 9 เดือน', 'female', 'medium', foundation_title, '5.0 กม.', 12.9276, 100.9238, ARRAY['https://bahayuvgxwlciaqtcpkt.supabase.co/storage/v1/object/public/animal-images/dog_p2_13.jpeg'], ARRAY['เดินสายจูงได้', 'ขี้อาย', 'ต้องการความเข้าใจ', 'อ่อนโยน'], 'ไทย:
ลอตตี น้องหมาขี้อายแต่จิตใจอ่อนหวาน สามารถเดินสายจูงได้ ต้องการเวลาสร้างความคุ้นเคยและความไว้ใจ เมื่อเปิดใจแล้วจะเป็นเพื่อนที่ซื่อสัตย์มากค่ะ

English:
Lottie is a delicate, gentle girl who is quite timid initially. She walks nicely on a leash and flourishes with calm patience and gentle encouragement.', 'available'),
  (foundation_uuid, 'โลวิโต้ (Lovito)', 'dog', '1 ปี 3 เดือน', 'male', 'medium', foundation_title, '5.0 กม.', 12.9276, 100.9238, ARRAY['https://bahayuvgxwlciaqtcpkt.supabase.co/storage/v1/object/public/animal-images/dog_p2_14.jpeg'], ARRAY['กำลังฝึกเข้าสังคม', 'ต้องการเวลาสร้างความไว้ใจ', 'แววตาน่ารัก'], 'ไทย:
โลวิโต้ น้องหมาวัยรุ่นที่กำลังอยู่ในช่วงฝึกฝนเข้าสังคม ยังเดินสายจูงไม่ได้ ต้องการผู้รับเลี้ยงที่มีประสบการณ์และความอดทนในการมอบความอบอุ่นครับ

English:
Lovito is a young rescue dog still learning that humans can be trusted. Not yet ready for leashed walks, he needs an experienced, patient guardian to guide his socialization.', 'available'),
  (foundation_uuid, 'ลัคกี้ (Lucky)', 'dog', '2 ปี 4 เดือน', 'male', 'medium', foundation_title, '5.0 กม.', 12.9276, 100.9238, ARRAY['https://bahayuvgxwlciaqtcpkt.supabase.co/storage/v1/object/public/animal-images/dog_p2_15.jpeg'], ARRAY['นำโชค', 'กระตือรือร้น', 'รักเจ้าของ'], 'ไทย:
ลัคกี้ สุนัขนำโชคผู้ร่าเริง มีพลังบวกเต็มเปี่ยม ชอบเล่นและกระดิกหางอย่างมีความสุข พร้อมก้าวเข้าสู่ครอบครัวใหม่ครับ

English:
Lucky is a spirited, affectionate boy full of positive energy. Always wagging his tail, he brings good fortune and warmth to any household.', 'available'),
  (foundation_uuid, 'แซลลี่ (Sally)', 'dog', '2 ปี', 'female', 'medium', foundation_title, '5.0 กม.', 12.9276, 100.9238, ARRAY['https://bahayuvgxwlciaqtcpkt.supabase.co/storage/v1/object/public/animal-images/dog_p3_3.jpeg'], ARRAY['เดินสายจูงได้ดี', 'สดใสร่าเริง', 'ทำหมันแล้ว'], 'ไทย:
แซลลี่ สุนัขสาวร่าเริง เดินสายจูงได้ดีมาก เข้ากับคนและสิ่งแวดล้อมใหม่ได้รวดเร็ว ทำหมันและสุขภาพพร้อมย้ายบ้านค่ะ

English:
Sally is an upbeat, adaptable female dog who walks splendidly on a leash. Neutered, vaccinated, and excited to join family outings.', 'available'),
  (foundation_uuid, 'เทดดี้ แบร์ (TeddyBear)', 'dog', '1 ปี 6 เดือน', 'male', 'small', foundation_title, '5.0 กม.', 12.9276, 100.9238, ARRAY['https://bahayuvgxwlciaqtcpkt.supabase.co/storage/v1/object/public/animal-images/dog_p3_5.jpeg'], ARRAY['เหมือนตุ๊กตาหมี', 'ขี้อ้อนสุดๆ', 'น่ากอด'], 'ไทย:
เทดดี้ แบร์ น้องหมาหน้าตาน่ารักน่ากอดดั่งตุ๊กตาหมี อารมณ์ดี ชอบให้อุ้มและลูบตัว เหมาะสำหรับครอบครัวที่มีเวลาดูแลใกล้ชิดครับ

English:
TeddyBear is a cuddly, charming dog who resembles an adorable plush bear. Loves hugs, gentle attention, and being pampered.', 'available'),
  (foundation_uuid, 'ชูนิ (สปริงค์) (Chuni (Spring))', 'dog', '2 ปี 1 เดือน', 'female', 'medium', foundation_title, '5.0 กม.', 12.9276, 100.9238, ARRAY['https://bahayuvgxwlciaqtcpkt.supabase.co/storage/v1/object/public/animal-images/dog_p4_1.jpeg'], ARRAY['กินเก่ง', 'ร่าเริง', 'ชอบอยู่ใกล้คน'], 'ไทย:
ชูนิ ขาประจำโซนห้องครัว ร่าเริง กินเก่ง มีพลัง ชอบมาต้อนรับเวลาทำอาหาร เป็นสุนัขที่อยู่ใกล้แล้วมีแต่รอยยิ้มค่ะ

English:
Chuni is a joyous kitchen-area companion who loves treats and human proximity. Always cheerful, friendly, and food-motivated.', 'available'),
  (foundation_uuid, 'หมอก (Cloudy)', 'dog', '1 ปี 4 เดือน', 'male', 'medium', foundation_title, '5.0 กม.', 12.9276, 100.9238, ARRAY['https://bahayuvgxwlciaqtcpkt.supabase.co/storage/v1/object/public/animal-images/dog_p4_2.jpeg'], ARRAY['ขี้กลัวเล็กน้อย', 'ต้องการความรักความอบอุ่น', 'จิตใจอ่อนโยน'], 'ไทย:
หมอก น้องหมาที่ยังคงมีความกลัวจากอดีต ยังไม่พร้อมเดินสายจูง แต่มีจิตใจที่อ่อนโยน ต้องการบ้านที่เงียบสงบและเข้าใจเพื่อช่วยเปิดใจครับ

English:
Cloudy is a timid sweetheart still recovering from past trauma. Not yet walked, he needs a quiet sanctuary and a kind heart to help him feel safe.', 'available'),
  (foundation_uuid, 'ดอทตี้ (Dotty)', 'dog', '2 ปี', 'female', 'small', foundation_title, '5.0 กม.', 12.9276, 100.9238, ARRAY['https://bahayuvgxwlciaqtcpkt.supabase.co/storage/v1/object/public/animal-images/dog_p4_3.jpeg'], ARRAY['ลายน่ารัก', 'ขี้ประจบ', 'ชอบขนม'], 'ไทย:
ดอทตี้ สุนัขลายจุดน่ารัก นิสัยประจบเก่ง อ้อนขอขนมได้อย่างน่าเอ็นดู เข้ากับทุกคนได้ง่ายค่ะ

English:
Dotty features charming spotted markings and an affectionate, treat-loving personality. Quick to bond and easy to love.', 'available'),
  (foundation_uuid, 'ละไม (Lamai)', 'dog', '3 ปี', 'female', 'medium', foundation_title, '5.0 กม.', 12.9276, 100.9238, ARRAY['https://bahayuvgxwlciaqtcpkt.supabase.co/storage/v1/object/public/animal-images/dog_p4_4.jpeg'], ARRAY['ละมุนละไม', 'สุขุม', 'เฝ้าบ้านได้'], 'ไทย:
ละไม สุนัขไทยแท้นิสัยละมุนละไม สุขุม รักสงบ แต่ตื่นตัวและช่วยส่งเสียงเตือนคนแปลกหน้าได้ดีเยี่ยมค่ะ

English:
Lamai is a composed, dignified Thai dog. Gentle at heart yet observant, she makes a faithful guardian and serene household companion.', 'available'),
  (foundation_uuid, 'ลัตเต้ (Latté)', 'dog', '1 ปี 8 เดือน', 'male', 'medium', foundation_title, '5.0 กม.', 12.9276, 100.9238, ARRAY['https://bahayuvgxwlciaqtcpkt.supabase.co/storage/v1/object/public/animal-images/dog_p4_5.jpeg'], ARRAY['สีน้ำตาลกาแฟ', 'อารมณ์ดี', 'ทำวัคซีนแล้ว'], 'ไทย:
ลัตเต้ น้องหมาสีน้ำตาลนวลกาแฟ อารมณ์ดี ร่าเริง ฉีดวัคซีนครบ สุขภาพแข็งแรงพร้อมออกไปสร้างความสุขครับ

English:
Latté sports a warm coffee-toned coat and a sunny, balanced temperament. Fully vaccinated, healthy, and ready for adoption.', 'available'),
  (foundation_uuid, 'ลูลู่ (Lulu)', 'dog', '4 ปี', 'female', 'small', foundation_title, '5.0 กม.', 12.9276, 100.9238, ARRAY['https://bahayuvgxwlciaqtcpkt.supabase.co/storage/v1/object/public/animal-images/dog_p4_7.jpeg'], ARRAY['ชอบความสงบ', 'เดินสายจูงได้', 'ติดที่', 'อบอุ่นใจดี'], 'ไทย:
ลูลู่ สุนัขอบอุ่นประจำโซนห้องครัว สามารถเดินสายจูงได้แต่น้องชอบความสุขสงบในบ้านที่คุ้นเคย ไม่เรียกร้องอะไรมาก อบอุ่นและน่ารักมากค่ะ

English:
Lulu can be walked on a leash but truly treasures resting peacefully in cozy, familiar indoor spots. Calm, undemanding, and sweet.', 'available'),
  (foundation_uuid, 'มะขาม (Makaam)', 'dog', '2 ปี 6 เดือน', 'male', 'medium', foundation_title, '5.0 กม.', 12.9276, 100.9238, ARRAY['https://bahayuvgxwlciaqtcpkt.supabase.co/storage/v1/object/public/animal-images/dog_p4_8.jpeg'], ARRAY['กำลังฝึกใส่สายจูง', 'ต้องการผู้มีประสบการณ์', 'ซื่อสัตย์'], 'ไทย:
มะขาม สุนัขที่ยังมีความหวาดระแวงต่อการใส่สายจูง ต้องการผู้ดูแลที่มีประสบการณ์และเข้าใจพฤติกรรมสัตว์ เมื่อได้รับความไว้ใจจะเป็นสุนัขที่ซื่อสัตย์มากครับ

English:
Makaam is cautious around harnesses and requires an experienced handler skilled in positive reinforcement. Beneath his boundaries lies great loyalty.', 'available'),
  (foundation_uuid, 'ซันนี่ (Sunny (Tinto))', 'dog', '2 ปี 5 เดือน', 'female', 'medium', foundation_title, '5.0 กม.', 12.9276, 100.9238, ARRAY['https://bahayuvgxwlciaqtcpkt.supabase.co/storage/v1/object/public/animal-images/dog_p4_11.jpeg'], ARRAY['ต้องการความไว้ใจ', 'เดินสายจูงได้', 'รักเจ้าของสุดหัวใจ'], 'ไทย:
ซันนี่ สุนัขสาวน่ารักที่เดินสายจูงได้อย่างมีความสุขเมื่ออยู่กับคนที่ไว้ใจ ซื่อสัตย์และพร้อมผูกพันอย่างลึกซึ้งกับเจ้าของคนใหม่ค่ะ

English:
Sunny walks happily with individuals she has built trust with. Deeply devoted and loving, she forms unforgettable, profound bonds.', 'available'),
  (foundation_uuid, 'ทาร่า (Tara)', 'dog', '1 ปี 7 เดือน', 'female', 'medium', foundation_title, '5.0 กม.', 12.9276, 100.9238, ARRAY['https://bahayuvgxwlciaqtcpkt.supabase.co/storage/v1/object/public/animal-images/dog_p4_12.jpeg'], ARRAY['ต้องการการฝึกฝน', 'ขี้อาย', 'ต้องการบ้านที่เข้าใจ'], 'ไทย:
ทาร่า น้องหมาสาวขี้กลัวที่ยังต้องฝึกการเดินสายจูงเพิ่มเติม อ่อนโยนและต้องการบรรยากาศที่ปลอดภัยเพื่อสร้างความมั่นใจค่ะ

English:
Tara is a shy girl who requires gentle leash training and emotional support. In the right peaceful home, her confidence will flourish.', 'available'),
  (foundation_uuid, 'ต้มแซ่บ (Tomseb)', 'dog', '2 ปี', 'male', 'medium', foundation_title, '5.0 กม.', 12.9276, 100.9238, ARRAY['https://bahayuvgxwlciaqtcpkt.supabase.co/storage/v1/object/public/animal-images/dog_p4_14.jpeg'], ARRAY['แสบซนน่ารัก', 'กินจุ', 'พลังงานล้นเหลือ'], 'ไทย:
ต้มแซ่บ สุนัขจอมซนรสจัดจ้านตามชื่อ ร่าเริง กินเก่ง พลังงานล้นเหลือ ชอบเล่นและทำให้คนรอบข้างหัวเราะเสมอครับ

English:
Tomseb packs a punch of personality! Playful, energetic, and food-loving, he turns every day into an entertaining adventure.', 'available'),
  (foundation_uuid, 'แองจี้ (Angie)', 'dog', '1 ปี 8 เดือน', 'female', 'medium', foundation_title, '5.0 กม.', 12.9276, 100.9238, ARRAY['https://bahayuvgxwlciaqtcpkt.supabase.co/storage/v1/object/public/animal-images/dog_p5_1.jpeg'], ARRAY['ขี้อาย', 'ตากลมโต', 'ต้องการความอ่อนโยน'], 'ไทย:
แองจี้ น้องหมาสาวขี้อายจากโซนอาสาสมัคร ดวงตากลมโตน่าเอ็นดู ยังไม่พร้อมเดินสายจูง ต้องการความรักและความเข้าใจเพื่อเยียวยาจิตใจค่ะ

English:
Angie is currently too timid for leashed walks. With her soulful, doe-like eyes, she needs an understanding home to heal and feel cherished.', 'available'),
  (foundation_uuid, 'ช็อคโก้ (Choco)', 'dog', '2 ปี', 'female', 'medium', foundation_title, '5.0 กม.', 12.9276, 100.9238, ARRAY['https://bahayuvgxwlciaqtcpkt.supabase.co/storage/v1/object/public/animal-images/dog_p5_2.jpeg'], ARRAY['เดินสายจูงได้', 'ตกใจง่าย', 'ชอบการดูแลใกล้ชิด'], 'ไทย:
ช็อคโก้ สุนัขสีช็อกโกแลต เดินสายจูงได้แต่ตกใจเสียงดังง่าย ต้องการผู้นำทางที่อบอุ่นและคอยปลอบโยนให้อุ่นใจค่ะ

English:
Choco walks nicely on a leash but can be startled by sudden loud noises. She thrives with a calm, reassuring guardian by her side.', 'available'),
  (foundation_uuid, 'ฝ้าย (Fai)', 'dog', '1 ปี 9 เดือน', 'female', 'medium', foundation_title, '5.0 กม.', 12.9276, 100.9238, ARRAY['https://bahayuvgxwlciaqtcpkt.supabase.co/storage/v1/object/public/animal-images/dog_p5_3.jpeg'], ARRAY['เดินสายจูงเก่งมาก', 'เป็นมิตรกับทุกคน', 'พร้อมปรับตัว'], 'ไทย:
ฝ้าย สุนัขสาวแสนน่ารัก เดินสายจูงได้อย่างคล่องแคล่ว เป็นมิตรกับอาสาสมัครทุกคน ร่าเริงและพร้อมย้ายเข้าสู่บ้านใหม่ได้ทันทีค่ะ

English:
Fai is a star walker and volunteer favorite. Cheerful, friendly, and very cooperative on the leash, she is 100% adoption-ready.', 'available'),
  (foundation_uuid, 'เฟดดี้ (Freddy)', 'dog', '2 ปี 3 เดือน', 'male', 'medium', foundation_title, '5.0 กม.', 12.9276, 100.9238, ARRAY['https://bahayuvgxwlciaqtcpkt.supabase.co/storage/v1/object/public/animal-images/dog_p5_4.jpeg'], ARRAY['ร่าเริง', 'ชอบวิ่งเล่น', 'ทำหมันแล้ว'], 'ไทย:
เฟดดี้ สุนัขหนุ่มอารมณ์ดี ชอบวิ่งเล่นในลานกว้าง เข้ากับเพื่อนสุนัขตัวอื่นได้ดี ทำหมันแล้วและสุขภาพแข็งแรงครับ

English:
Freddy is a spirited, good-natured dog who loves yard games and making four-legged friends. Neutered, healthy, and happy.', 'available'),
  (foundation_uuid, 'อินคา (Inca)', 'dog', '3 ปี', 'male', 'large', foundation_title, '5.0 กม.', 12.9276, 100.9238, ARRAY['https://bahayuvgxwlciaqtcpkt.supabase.co/storage/v1/object/public/animal-images/dog_p5_5.jpeg'], ARRAY['เดินเดี่ยวหรือคู่ได้', 'เข้ากับสุนัขอื่นได้ดี', 'สุขภาพแข็งแรง'], 'ไทย:
อินคา สุนัขตัวโตสุขุม สามารถเดินสายจูงได้ทั้งแบบเดี่ยวและเดินคู่กับสุนัขตัวอื่น เข้าสังคมสุนัขได้ดีเยี่ยมและเชื่อฟังคำสั่งครับ

English:
Inca is a well-balanced, mature dog who walks gracefully alone or side-by-side with canine companions. Social and obedient.', 'available'),
  (foundation_uuid, 'โลกี้ (Loki)', 'dog', '1 ปี 10 เดือน', 'male', 'medium', foundation_title, '5.0 กม.', 12.9276, 100.9238, ARRAY['https://bahayuvgxwlciaqtcpkt.supabase.co/storage/v1/object/public/animal-images/dog_p5_6.jpeg'], ARRAY['ฉลาดหลักแหลม', 'ขี้เล่น', 'ตื่นตัวเสมอ'], 'ไทย:
โลกี้ สุนัขหนุ่มไฟแรง ฉลาดและชอบเรียนรู้สิ่งใหม่ ว่องไวและพร้อมเป็นคู่หูไปไหนไปกันครับ

English:
Loki is sharp, agile, and enthusiastic about new adventures. High intelligence paired with a playful heart.', 'available'),
  (foundation_uuid, 'โพลี่ (Polly)', 'dog', '2 ปี', 'female', 'medium', foundation_title, '5.0 กม.', 12.9276, 100.9238, ARRAY['https://bahayuvgxwlciaqtcpkt.supabase.co/storage/v1/object/public/animal-images/dog_p5_12.jpeg'], ARRAY['เดินสายจูงได้', 'น่ารักอารมณ์ดี', 'ชอบให้เกาพุง'], 'ไทย:
โพลี่ น้องหมาสาวน่ารัก เดินสายจูงได้ดี ชอบให้เกาพุงและยิ้มรับทุกคน ร่าเริงและปรับตัวง่ายค่ะ

English:
Polly is an easy-to-walk, affectionate companion who delights in belly rubs and human praise. A total sweetheart.', 'available'),
  (foundation_uuid, 'พริ้นซ์ (Princess)', 'dog', '2 ปี 2 เดือน', 'female', 'medium', foundation_title, '5.0 กม.', 12.9276, 100.9238, ARRAY['https://bahayuvgxwlciaqtcpkt.supabase.co/storage/v1/object/public/animal-images/dog_p5_13.jpeg'], ARRAY['เดินสายจูงได้', 'เรียบร้อยขี้อาย', 'จิตใจดี'], 'ไทย:
พริ้นซ์ เจ้าหญิงสี่ขาผู้เรียบร้อย แม้จะขี้อายแต่สามารถเดินสายจูงได้อย่างนุ่มนวล จิตใจดีและต้องการความคุ้มครองค่ะ

English:
Princess is a modest, gentle soul who walks softly on the lead. Timid yet genuinely kind, she will blossom in a patient home.', 'available'),
  (foundation_uuid, 'วินเทอร์ (Winter)', 'dog', '2 ปี 6 เดือน', 'male', 'large', foundation_title, '5.0 กม.', 12.9276, 100.9238, ARRAY['https://bahayuvgxwlciaqtcpkt.supabase.co/storage/v1/object/public/animal-images/dog_p5_17.jpeg'], ARRAY['เดินสายจูงได้ดีเยี่ยม', 'เท่สุขุม', 'ฉีดวัคซีนครบ'], 'ไทย:
วินเทอร์ สุนัขหนุ่มร่างเท่สุขุม เดินสายจูงได้ดีเยี่ยม ไม่ดึงสาย ไม่ก้าวร้าว ฉีดวัคซีนครบถ้วนและพร้อมเป็นผู้อารักขาครอบครัวครับ

English:
Winter is a poised, majestic walker who stays calm on the leash without pulling. Fully vaccinated and noble in spirit.', 'available'),
  (foundation_uuid, 'ยาย่า (Yaya)', 'dog', '1 ปี 6 เดือน', 'female', 'medium', foundation_title, '5.0 กม.', 12.9276, 100.9238, ARRAY['https://bahayuvgxwlciaqtcpkt.supabase.co/storage/v1/object/public/animal-images/dog_p6_1.jpeg'], ARRAY['ต้องการความเข้าใจ', 'ขี้ระแวงเล็กน้อย', 'รอคนใจดีปลอบโยน'], 'ไทย:
ยาย่า สุนัขสาวที่ยังกลัวสิ่งแวดล้อมภายนอกและยังไม่พร้อมเดินสายจูง ต้องการบ้านที่อบอุ่นและพร้อมให้เวลาในการฟื้นฟูจิตใจค่ะ

English:
Yaya is not yet ready for walks due to fear. She is looking for an angel adopter with the patience to earn her trust step by step.', 'available'),
  (foundation_uuid, 'โรบิ้น (Robin)', 'dog', '2 ปี', 'male', 'medium', foundation_title, '5.0 กม.', 12.9276, 100.9238, ARRAY['https://bahayuvgxwlciaqtcpkt.supabase.co/storage/v1/object/public/animal-images/dog_p7_5.jpeg'], ARRAY['เดินสายจูงได้', 'ซื่อตรง', 'ชอบออกกำลังกาย'], 'ไทย:
โรบิ้น สุนัขหนุ่มจาก Zone A เดินสายจูงเก่ง ซื่อสัตย์ ร่างกายแข็งแรง ชอบการออกกำลังกายและเป็นเพื่อนร่วมทางที่ดีครับ

English:
Robin walks well on a leash and loves active outdoor workouts. Honest, loyal, and physically fit.', 'available'),
  (foundation_uuid, 'บูบู้ (Bubu)', 'dog', '2 ปี 5 เดือน', 'male', 'medium', foundation_title, '5.0 กม.', 12.9276, 100.9238, ARRAY['https://bahayuvgxwlciaqtcpkt.supabase.co/storage/v1/object/public/animal-images/dog_p7_8.jpeg'], ARRAY['เดินพร้อมเพื่อนสุนัขได้', 'รักเพื่อน', 'ปรับตัวเก่ง'], 'ไทย:
บูบู้ สุนัขผู้รักเพื่อน สามารถเดินสายจูงคู่กับสุนัขตัวอื่นได้อย่างกลมกลืน เข้าสังคมเก่งและปรับตัวได้ยอดเยี่ยมครับ

English:
Bubu loves buddy-walks and gets along wonderfully when paired with another canine companion. Sociable and adaptable.', 'available'),
  (foundation_uuid, 'มะนาวบี (Mango)', 'dog', '2 ปี', 'female', 'medium', foundation_title, '5.0 กม.', 12.9276, 100.9238, ARRAY['https://bahayuvgxwlciaqtcpkt.supabase.co/storage/v1/object/public/animal-images/dog_p7_10.jpeg'], ARRAY['เดินสายจูงได้', 'กลัวสุนัขอื่น', 'ติดคนมาก', 'ชอบอยู่เงียบๆ'], 'ไทย:
มะนาวบี สุนัขสาวที่เดินสายจูงได้ดี แต่กลัวสุนัขตัวอื่นมาก น้องติดคนและชอบอยู่ใกล้ชิดมนุษย์ เหมาะเป็นสัตว์เลี้ยงเดี่ยวค่ะ

English:
Mango walks nicely on the lead but experiences fear around other dogs. She adores humans and is seeking a solo-pet haven.', 'available'),
  (foundation_uuid, 'ชิลลี่ (Chilli)', 'dog', '1 ปี 8 เดือน', 'male', 'medium', foundation_title, '5.0 กม.', 12.9276, 100.9238, ARRAY['https://bahayuvgxwlciaqtcpkt.supabase.co/storage/v1/object/public/animal-images/dog_p7_12.jpeg'], ARRAY['ชอบเดินเล่นมาก', 'พลังงานล้นเหลือ', 'ร่าเริงสุดขีด'], 'ไทย:
ชิลลี่ สุนัขจอมพลังผู้ตื่นเต้นกับการเดินเล่นเป็นชีวิตจิตใจ ร่าเริงสุดขีด เหมาะกับเจ้าของที่ชอบทำกิจกรรมกลางแจ้งครับ

English:
Chilli loves walks with burning passion! High on energy and joy, he is an ideal teammate for runners and active hikers.', 'available'),
  (foundation_uuid, 'รูนี่ (Roodie)', 'dog', '3 ปี', 'male', 'medium', foundation_title, '5.0 กม.', 12.9276, 100.9238, ARRAY['https://bahayuvgxwlciaqtcpkt.supabase.co/storage/v1/object/public/animal-images/dog_p7_14.jpeg'], ARRAY['ชอบเดินเล่น', 'พลังงานสูง', 'กระฉับกระเฉง'], 'ไทย:
รูนี่ สุนัขกระฉับกระเฉงที่ชอบการออกกำลังกาย ควรเดินในสายจูงอย่างระมัดระวังเมื่อพบสุนัขจร ซื่อสัตย์และเชื่อฟังคำสั่งครับ

English:
Roodie is an enthusiastic walker with great vitality. Needs mindful leash control around loose dogs, but is loyal and eager to please.', 'available'),
  (foundation_uuid, 'สไปร์ท (Spirit)', 'dog', '2 ปี 2 เดือน', 'male', 'medium', foundation_title, '5.0 กม.', 12.9276, 100.9238, ARRAY['https://bahayuvgxwlciaqtcpkt.supabase.co/storage/v1/object/public/animal-images/dog_p8_1.jpeg'], ARRAY['จิตใจสดใส', 'วิ่งเร็ว', 'สุขภาพแข็งแรง'], 'ไทย:
สไปร์ท น้องหมาสปิริตแรงกล้า สดใส วิ่งเร็วและคล่องตัว สุขภาพสมบูรณ์และพร้อมเป็นเพื่อนเล่นที่ดีครับ

English:
Spirit embodies pure energy and optimism. Fast on his feet, healthy, and always ready for backyard games.', 'available'),
  (foundation_uuid, 'ฟอร์จูน (Fortunella)', 'dog', '2 ปี', 'female', 'medium', foundation_title, '5.0 กม.', 12.9276, 100.9238, ARRAY['https://bahayuvgxwlciaqtcpkt.supabase.co/storage/v1/object/public/animal-images/dog_p8_2.jpeg'], ARRAY['นำโชคลาภ', 'ยิ้มแย้ม', 'ทำหมันแล้ว'], 'ไทย:
ฟอร์จูน สุนัขสาวผู้มีรอยยิ้มมอบโชค นิสัยเป็นมิตร ไม่ดื้อ ทำหมันแล้ว และรอคอยบ้านที่อบอุ่นค่ะ

English:
Fortunella brings a lucky charm and bright smile wherever she goes. Friendly, neutered, and affectionate.', 'available'),
  (foundation_uuid, 'ดีเซล (Diesel)', 'dog', '3 ปี', 'male', 'large', foundation_title, '5.0 กม.', 12.9276, 100.9238, ARRAY['https://bahayuvgxwlciaqtcpkt.supabase.co/storage/v1/object/public/animal-images/dog_p8_5.jpeg'], ARRAY['พลังงานจัดเต็ม', 'ซื่อสัตย์', 'เฝ้าบ้านเก่ง'], 'ไทย:
ดีเซล สุนัขพันธุ์ใหญ่ทรงพลัง แข็งแรง ซื่อสัตย์ ปกป้องดูแลครอบครัวได้อย่างดีเยี่ยมครับ

English:
Diesel is strong, muscular, and fiercely loyal. Excellent watchdog instincts balanced with affection for his family.', 'available'),
  (foundation_uuid, 'หลุยส์ (Louise)', 'dog', '2 ปี 8 เดือน', 'female', 'medium', foundation_title, '5.0 กม.', 12.9276, 100.9238, ARRAY['https://bahayuvgxwlciaqtcpkt.supabase.co/storage/v1/object/public/animal-images/dog_p8_7.jpeg'], ARRAY['ขี้อายแต่สนใจคน', 'ต้องการความอดทน', 'แววตามีประกาย'], 'ไทย:
หลุยส์ น้องหมาที่ยังไม่พร้อมเดินสายจูงแต่ชอบแอบมองด้วยความสนใจ ต้องการความอดทนและการสร้างสายสัมพันธ์อย่างนุ่มนวลค่ะ

English:
Louise cannot be walked yet; she is timid but shows genuine curiosity toward humans. Ready to bloom with kind patience.', 'available'),
  (foundation_uuid, 'แลม (Lam)', 'dog', '3 ปี 5 เดือน', 'male', 'medium', foundation_title, '5.0 กม.', 12.9276, 100.9238, ARRAY['https://bahayuvgxwlciaqtcpkt.supabase.co/storage/v1/object/public/animal-images/dog_p9_14.jpeg'], ARRAY['ใช้รถเข็นสำหรับสุนัข (Wheelchair)', 'หัวใจนักสู้', 'ร่าเริงวิ่งเร็ว', 'สร้างแรงบันดาลใจ'], 'ไทย:
แลม สุนัขนักสู้ผู้ได้รับการรับรองให้ใช้รถเข็นสุนัข (Wheelchair) วิ่งเล่นได้อย่างสนุกสนานและไม่เคยยอมแพ้ต่อข้อจำกัดทางกาย ร่าเริงและเป็นแรงบันดาลใจให้ทุกคนครับ

English:
Lam is an unstoppable, inspiring dog who zooms around with joy in his canine wheelchair! Cheerful, fast, and resilient, Lam proves love knows no limits.', 'available'),
  (foundation_uuid, 'คลีโอ (Cleopatra)', 'dog', '2 ปี 4 เดือน', 'female', 'medium', foundation_title, '5.0 กม.', 12.9276, 100.9238, ARRAY['https://bahayuvgxwlciaqtcpkt.supabase.co/storage/v1/object/public/animal-images/dog_p9_12.jpeg'], ARRAY['สวยสง่า', 'ฉลาดแสนรู้', 'ชอบอยู่ใกล้เจ้าของ'], 'ไทย:
คลีโอ สุนัขสาวงามสง่า ฉลาดหลักแหลม ชอบอยู่เคียงข้างและคอยดูแลความปลอดภัยให้เจ้าของค่ะ

English:
Cleopatra combines elegance with acute canine intelligence. Loyal, devoted, and a lovely shadow to her human.', 'available'),
  (foundation_uuid, 'โมจิ (Mochi)', 'dog', '1 ปี 6 เดือน', 'female', 'small', foundation_title, '5.0 กม.', 12.9276, 100.9238, ARRAY['https://bahayuvgxwlciaqtcpkt.supabase.co/storage/v1/object/public/animal-images/dog_p9_15.jpeg'], ARRAY['น่ารักนุ่มนิ่ม', 'ขี้อ้อน', 'ขี้เล่น'], 'ไทย:
โมจิ น้องหมาตัวเล็กน่ารัก นุ่มนิ่มเหมือนขนมโมจิ ขี้อ้อน ชอบคลอเคลียและเล่นกับคนรอบข้างค่ะ

English:
Mochi is as sweet and soft as her confectionery namesake. Petite, cuddly, and forever affectionate.', 'available'),
  (foundation_uuid, 'ลีโอ (Leo)', 'dog', '2 ปี 9 เดือน', 'male', 'large', foundation_title, '5.0 กม.', 12.9276, 100.9238, ARRAY['https://bahayuvgxwlciaqtcpkt.supabase.co/storage/v1/object/public/animal-images/dog_p10_7.jpeg'], ARRAY['สง่าผ่าเผย', 'ใจดีเหมือนพี่ใหญ่', 'ทำหมันแล้ว'], 'ไทย:
ลีโอ พี่ใหญ่มาดสุขุม สง่างาม ใจดี ไม่ก้าวร้าว ทำหมันเรียบร้อยและพร้อมเป็นเสาหลักที่อบอุ่นของบ้านครับ

English:
Leo is a calm, big-hearted gentleman who carries himself with gentle dignity. Neutered and wonderful with people.', 'available'),
  (foundation_uuid, 'ร็อคกี้ (Rocky)', 'dog', '3 ปี', 'male', 'large', foundation_title, '5.0 กม.', 12.9276, 100.9238, ARRAY['https://bahayuvgxwlciaqtcpkt.supabase.co/storage/v1/object/public/animal-images/dog_p11_4.jpeg'], ARRAY['แข็งแรงกำยำ', 'จิตใจอ่อนโยน', 'ชอบวิ่งกลางแจ้ง'], 'ไทย:
ร็อคกี้ สุนัขกำยำแข็งแกร่งดั่งหินผา แต่มีหัวใจที่อ่อนโยน ชอบวิ่งเล่นกลางแจ้งและซื่อสัตย์ต่อครอบครัวครับ

English:
Rocky has the sturdy frame of a rock and a heart of pure gold. Enthusiastic outdoors, gentle indoors.', 'available'),
  (foundation_uuid, 'แอสเพน (Aspen)', 'dog', '2 ปี', 'female', 'medium', foundation_title, '5.0 กม.', 12.9276, 100.9238, ARRAY['https://bahayuvgxwlciaqtcpkt.supabase.co/storage/v1/object/public/animal-images/dog_p12_1.jpeg'], ARRAY['สวยสง่า', 'รักธรรมชาติ', 'ฉีดวัคซีนแล้ว'], 'ไทย:
แอสเพน สุนัขสาวสวยจาก Zone B รักธรรมชาติ สุขภาพแข็งแรง ฉีดวัคซีนครบถ้วนและพร้อมร่วมผจญภัยค่ะ

English:
Aspen is a graceful female dog who loves fresh air and nature. Fully vaccinated and eager for outdoor adventures.', 'available'),
  (foundation_uuid, 'ชิปส์ (Chips)', 'dog', '1 ปี 7 เดือน', 'male', 'medium', foundation_title, '5.0 กม.', 12.9276, 100.9238, ARRAY['https://bahayuvgxwlciaqtcpkt.supabase.co/storage/v1/object/public/animal-images/dog_p12_2.jpeg'], ARRAY['ชอบเล่นลูกบอล', 'กินเก่ง', 'ร่าเริง'], 'ไทย:
ชิปส์ หนุ่มน้อยจอมทะเล้น ชอบเล่นลูกบอลและวิ่งเก็บของ กินเก่ง อารมณ์ดีและเข้ากับทุกคนได้ง่ายครับ

English:
Chips is a playful ball of joy who loves fetch and treats. High spirits and a friendly tail-wag for everyone.', 'available'),
  (foundation_uuid, 'แชโดว์ (Shadow)', 'dog', '3 ปี 2 เดือน', 'male', 'large', foundation_title, '5.0 กม.', 12.9276, 100.9238, ARRAY['https://bahayuvgxwlciaqtcpkt.supabase.co/storage/v1/object/public/animal-images/dog_p12_10.jpeg'], ARRAY['สีดำขลับ', 'เดินตามเป็นเงา', 'ซื่อสัตย์มาก'], 'ไทย:
แชโดว์ สุนัขสีดำเงางาม ชอบเดินตามเจ้าของดั่งเงาตามตัว ซื่อสัตย์ ปกป้องและมอบความรักให้เต็มร้อยครับ

English:
Shadow is a sleek black dog who faithfully walks by your side like a gentle shadow. Unshakably loyal.', 'available'),
  (foundation_uuid, 'ช็อกดี (Chokdee)', 'dog', '2 ปี', 'male', 'medium', foundation_title, '5.0 กม.', 12.9276, 100.9238, ARRAY['https://bahayuvgxwlciaqtcpkt.supabase.co/storage/v1/object/public/animal-images/dog_p12_15.jpeg'], ARRAY['กำลังฝึกสายจูง', 'ชื่อมงคลโชคดี', 'ใจดีมีเสน่ห์'], 'ไทย:
ช็อกดี สุนัขชื่อมงคลผู้ใจดี กำลังอยู่ในช่วงฝึกการเดินสายจูง กระตือรือร้นและพร้อมนำโชคดีมาให้เจ้าของครับ

English:
Chokdee (''Good Luck'') is currently undergoing leash training. Friendly, enthusiastic, and full of positive vibes.', 'available'),
  (foundation_uuid, 'มัพเพ็ท (Muppet)', 'dog', '3 ปี', 'female', 'medium', foundation_title, '5.0 กม.', 12.9276, 100.9238, ARRAY['https://bahayuvgxwlciaqtcpkt.supabase.co/storage/v1/object/public/animal-images/dog_p12_16.jpeg'], ARRAY['เดินสายจูงอย่างนุ่มนวล', 'อ่อนหวาน', 'ชอบให้กอด'], 'ไทย:
มัพเพ็ท น้องหมาสาวแสนอ่อนหวาน เดินสายจูงได้อย่างนุ่มนวล ชอบให้กอดและลูบตัว เหมาะกับบ้านที่รักความสงบค่ะ

English:
Muppet walks nicely with gentle leash guidance. Soft, loving, and adores comforting hugs and gentle words.', 'available'),
  (foundation_uuid, 'อาร์ชี (Archie)', 'dog', '2 ปี 1 เดือน', 'male', 'medium', foundation_title, '5.0 กม.', 12.9276, 100.9238, ARRAY['https://bahayuvgxwlciaqtcpkt.supabase.co/storage/v1/object/public/animal-images/dog_p13_4.jpeg'], ARRAY['ขี้อ้อน', 'ชอบเล่นน้ำ', 'เป็นมิตรกับทุกคน'], 'ไทย:
อาร์ชี สุนัขหนุ่มอารมณ์ดี ชอบเล่นน้ำและวิ่งเล่น เป็นมิตรกับทุกคนในมูลนิธิ สุขภาพแข็งแรงมากครับ

English:
Archie is an outgoing, water-loving pal who greets every friend with a joyful wag. Robust and friendly.', 'available'),
  (foundation_uuid, 'โบลต์ (Bolt)', 'dog', '2 ปี', 'male', 'medium', foundation_title, '5.0 กม.', 12.9276, 100.9238, ARRAY['https://bahayuvgxwlciaqtcpkt.supabase.co/storage/v1/object/public/animal-images/dog_p14_6.jpeg'], ARRAY['ว่องไวสายฟ้า', 'หูตั้งน่ารัก', 'ชอบวิ่งเล่น'], 'ไทย:
โบลต์ น้องหมาหูตั้งว่องไว รวดเร็ว ฉลาด และชอบวิ่งเล่นในทุ่งหญ้า พร้อมเป็นคู่หูที่กระฉับกระเฉงครับ

English:
Bolt has alert perky ears and lightning agility. Smart, quick to respond, and loves outdoor sprints.', 'available'),
  (foundation_uuid, 'ร็อคโค่ (Rocco)', 'dog', '2 ปี 8 เดือน', 'male', 'medium', foundation_title, '5.0 กม.', 12.9276, 100.9238, ARRAY['https://bahayuvgxwlciaqtcpkt.supabase.co/storage/v1/object/public/animal-images/dog_p16_11.jpeg'], ARRAY['เดินสายจูงได้ดี', 'กระตือรือร้น', 'ทำหมันแล้ว'], 'ไทย:
ร็อคโค่ สุนัขหนุ่มที่เดินสายจูงได้ดีมาก กระตือรือร้นและเชื่อฟังคำสั่ง ทำหมันแล้วและพร้อมย้ายเข้าสู่บ้านใหม่ครับ

English:
Rocco is an obedient, capable leash walker. Enthusiastic yet attentive, he is neutered and adoption-ready.', 'available'),
  (foundation_uuid, 'ฤดูร้อน (Summer)', 'dog', '1 ปี 9 เดือน', 'female', 'medium', foundation_title, '5.0 กม.', 12.9276, 100.9238, ARRAY['https://bahayuvgxwlciaqtcpkt.supabase.co/storage/v1/object/public/animal-images/dog_p16_12.jpeg'], ARRAY['สดใสเหมือนแสงแดด', 'รอยยิ้มน่ารัก', 'เข้ากับคนง่าย'], 'ไทย:
ฤดูร้อน สุนัขสาวผู้มีรอยยิ้มอบอุ่นดั่งแสงแดดยามเช้า ร่าเริง อ่อนโยน และทำให้ทุกคนรอบข้างมีความสุขค่ะ

English:
Summer warms every heart like morning sunshine. Gentle, friendly, and wonderfully responsive to human love.', 'available'),
  (foundation_uuid, 'แฮร์รี่ (Harry)', 'dog', '3 ปี', 'male', 'large', foundation_title, '5.0 กม.', 12.9276, 100.9238, ARRAY['https://bahayuvgxwlciaqtcpkt.supabase.co/storage/v1/object/public/animal-images/dog_p17_3.jpeg'], ARRAY['เดินสายจูงได้', 'ต้องการสร้างความไว้ใจก่อน', 'ซื่อสัตย์ภักดี'], 'ไทย:
แฮร์รี่ สุนัขตัวโตผู้ต้องการเวลาสร้างความไว้ใจก่อนเดินสายจูง เมื่อสนิทแล้วจะเป็นสุนัขที่ซื่อสัตย์ภักดีและเชื่อฟังมากครับ

English:
Harry walks reliably on lead once trust is established. A loyal guardian who rewards patience with steadfast devotion.', 'available'),
  (foundation_uuid, 'ซิมบ้า (Simba)', 'dog', '2 ปี 4 เดือน', 'male', 'large', foundation_title, '5.0 กม.', 12.9276, 100.9238, ARRAY['https://bahayuvgxwlciaqtcpkt.supabase.co/storage/v1/object/public/animal-images/dog_p18_14.jpeg'], ARRAY['สง่างามราชา', 'กล้าหาญ', 'รักสงบ'], 'ไทย:
ซิมบ้า หนุ่มใหญ่ร่างสง่า สงบนิ่ง กล้าหาญ และมีแววตาที่เปี่ยมด้วยความเมตตา พร้อมเป็นผู้พิทักษ์ของบ้านครับ

English:
Simba possesses a regal bearing and an even, courageous spirit. Protective yet peaceful in the home.', 'available'),
  (foundation_uuid, 'ปองโก้ (Pongo)', 'dog', '2 ปี 5 เดือน', 'male', 'medium', foundation_title, '5.0 กม.', 12.9276, 100.9238, ARRAY['https://bahayuvgxwlciaqtcpkt.supabase.co/storage/v1/object/public/animal-images/dog_p19_7.jpeg'], ARRAY['เดินสายจูงได้ดีเยี่ยม', 'ฉลาดแสนรู้', 'พร้อมเป็นเพื่อนแท้'], 'ไทย:
ปองโก้ สุนัขแสนรู้ เดินสายจูงได้ดีเยี่ยม เข้ากับคนได้ง่ายและพร้อมเป็นเพื่อนแท้ของทุกครอบครัวครับ

English:
Pongo is a stellar leash walker with keen intelligence. Highly social, friendly, and truly a devoted best friend.', 'available'),
  (foundation_uuid, 'ฟัดจ์ (Fudge)', 'dog', '1 ปี 6 เดือน', 'male', 'medium', foundation_title, '5.0 กม.', 12.9276, 100.9238, ARRAY['https://bahayuvgxwlciaqtcpkt.supabase.co/storage/v1/object/public/animal-images/dog_p21_3.jpeg'], ARRAY['เดินสายจูงได้', 'พลังงานสูงมาก', 'กระฉับกระเฉง', 'ชอบผจญภัย'], 'ไทย:
ฟัดจ์ สุนัขหนุ่มไฟแรง เดินสายจูงได้และมีพลังงานสูง ชอบการผจญภัยและวิ่งเล่น เหมาะกับครอบครัวสายกิจกรรมครับ

English:
Fudge is an energetic explorer who loves brisk walks and vigorous play. An ideal match for active, outdoor lifestyles.', 'available'),
  (foundation_uuid, 'เพนดา (Penda)', 'dog', '2 ปี', 'female', 'medium', foundation_title, '5.0 กม.', 12.9276, 100.9238, ARRAY['https://bahayuvgxwlciaqtcpkt.supabase.co/storage/v1/object/public/animal-images/dog_p21_4.jpeg'], ARRAY['เดินสายจูงได้', 'มีพลังและคล่องแคล่ว', 'เข้ากับคนง่าย'], 'ไทย:
เพนดา สุนัขสาวคล่องแคล่วว่องไว เดินสายจูงได้ดี มีพลังงานพอเหมาะและเข้ากับคนง่าย พร้อมเริ่มต้นชีวิตใหม่ค่ะ

English:
Penda is agile, bright, and walks nicely on lead with healthy energy. Friendly and ready for a fresh start.', 'available');

  RAISE NOTICE 'นำเข้าข้อมูลสัตว์เลี้ยงจริงจาก Saved Souls Foundation เรียบร้อยแล้ว';
END $$;