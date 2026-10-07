# -*- coding: utf-8 -*-
import json

with open('d:/HaBan/scripts/generated_animals.json', encoding='utf-8') as f:
    animals = json.load(f)

sql_lines = [
    '-- ==============================================================================',
    '-- 4ขาหาบ้าน (4KhaHaBan) — Seed Real Animals from Saved Souls Foundation',
    '-- ==============================================================================',
    '-- วัตถุประสงค์:',
    f'-- นำเข้าชุดข้อมูลสัตว์เลี้ยงจริง {len(animals)} ตัว (แมว 38 ตัว, หมา 66 ตัว) จากมูลนิธิ Saved Souls Foundation',
    '-- แทนที่ข้อมูลจำลองเดิม พร้อมคำอธิบาย 2 ภาษา (ไทยและอังกฤษ) และรูปภาพจริง',
    '--',
    '-- วิธีใช้:',
    '-- คัดลอกสคริปต์นี้ไปวางใน Supabase Dashboard -> SQL Editor แล้วกด Run',
    '-- ==============================================================================',
    '',
    'DO $$',
    'DECLARE',
    "  foundation_uuid UUID := 'e5755b6f-2fbd-4b0a-8e73-1186251d269a';",
    "  foundation_title TEXT := 'มูลนิธิ Saved Souls Foundation';",
    'BEGIN',
    '  -- 1. ตรวจสอบหรือค้นหา ID มูลนิธิในระบบ',
    '  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = foundation_uuid) THEN',
    "    SELECT id INTO foundation_uuid FROM public.profiles WHERE role = 'foundation' LIMIT 1;",
    '  END IF;',
    '',
    '  IF foundation_uuid IS NULL THEN',
    "    foundation_uuid := '11111111-1111-1111-1111-111111111111';",
    '  END IF;',
    '',
    '  -- 2. เคลียร์ข้อมูลสัตว์เลี้ยงจำลองเก่า',
    "  DELETE FROM public.animals WHERE shelter = '4 ขาหาบ้าน' OR name IN ('น้องทองแดง', 'ส้มจี๊ด', 'พี่เบิ้ม', 'ไข่ตุ๋น', 'หมูปิ้ง', 'มูมู่', 'บราวนี่', 'กะทิ', 'โคล่า', 'ปีโป้');",
    '',
    '  -- 3. อัปเดตข้อมูลมูลนิธิใน foundation_profiles',
    '  INSERT INTO public.foundation_profiles (id, foundation_name, verification_status, contact_phone, address, promptpay_number)',
    "  VALUES (foundation_uuid, foundation_title, 'approved', '0812345678', 'บางละมุง ชลบุรี ประเทศไทย (Saved Souls Foundation)', '0812345678')",
    '  ON CONFLICT (id) DO UPDATE SET',
    '    foundation_name = EXCLUDED.foundation_name,',
    '    verification_status = EXCLUDED.verification_status,',
    '    address = EXCLUDED.address;',
    '',
    '  -- 4. นำเข้าข้อมูลสัตว์เลี้ยงจริงทั้งหมด',
    '  INSERT INTO public.animals (',
    '    foundation_id, name, type, age, gender, size, shelter, distance, latitude, longitude, images, tags, story, status',
    '  ) VALUES '
]

value_clauses = []
for a in animals:
    name_esc = a['name'].replace("'", "''")
    story_esc = a['story'].replace("'", "''")
    images_pg = "ARRAY[" + ", ".join(f"'{img}'" for img in a['images']) + "]"
    tags_pg = "ARRAY[" + ", ".join(f"'{t}'" for t in a['tags']) + "]"
    
    val = (
        f"  (foundation_uuid, '{name_esc}', '{a['type']}', '{a['age']}', '{a['gender']}', "
        f"'{a['size']}', foundation_title, '{a['distance']}', {a['latitude']}, {a['longitude']}, "
        f"{images_pg}, {tags_pg}, '{story_esc}', 'available')"
    )
    value_clauses.append(val)

sql_lines.append(',\n'.join(value_clauses) + ';')
sql_lines.append('')
sql_lines.append("  RAISE NOTICE 'นำเข้าข้อมูลสัตว์เลี้ยงจริงจาก Saved Souls Foundation เรียบร้อยแล้ว';")
sql_lines.append('END $$;')

with open('d:/HaBan/supabase/seed_saved_souls_animals.sql', 'w', encoding='utf-8') as f:
    f.write('\n'.join(sql_lines))

print('Successfully created d:/HaBan/supabase/seed_saved_souls_animals.sql')
