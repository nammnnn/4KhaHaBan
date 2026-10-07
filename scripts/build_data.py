# -*- coding: utf-8 -*-
"""
High quality builder for Saved Souls Foundation Animal Dataset
Generates authentic, professional Thai & English bilingual stories
"""

import json
import uuid

# 38 Cats from cat_list-2.pdf
cats = [
    {
        "name_en": "Bagheera", "name_th": "บาคีรา", "zone": "Clinic Cage Seperate", "p": 1, "idx": 1,
        "gender": "male", "age": "1 ปี 6 เดือน", "size": "medium",
        "tags": ["ทำหมันแล้ว", "ขี้อ้อน", "โซนดูแลพิเศษ"],
        "th": "บาคีรา น้องแมวสีดำขลับแววตาสดใส อยู่ในโซนดูแลพิเศษของมูลนิธิ นิสัยสงบเสงี่ยม ขี้อ้อน และชอบคลอเคลียเวลาได้รับความรัก น้องปรับตัวง่าย สุขภาพแข็งแรง และพร้อมมอบความอบอุ่นให้บ้านใหม่ครับ",
        "en": "Bagheera is a handsome sleek black cat in the foundation's special care zone. Calm, affectionate, and fond of gentle cuddles, he adapts quickly, enjoys quiet companionship, and is ready for a loving forever home."
    },
    {
        "name_en": "Blueberry", "name_th": "บลูเบอร์รี่", "zone": "Clinic Cage Seperate", "p": 1, "idx": 2,
        "gender": "female", "age": "1 ปี", "size": "small",
        "tags": ["เรียบร้อย", "ทำวัคซีนแล้ว", "โซนดูแลพิเศษ"],
        "th": "บลูเบอร์รี่ น้องแมวเพศเมียตัวเล็กน่ารัก นิสัยสุภาพ เรียบร้อย ไม่ซน ชอบนอนพักผ่อนในมุมอบอุ่น ได้รับวัคซีนครบถ้วน เหมาะสำหรับผู้ที่ต้องการเพื่อนคลายเหงาในคอนโดหรือบ้านที่เงียบสงบค่ะ",
        "en": "Blueberry is a delicate and sweet-natured young cat. Very gentle, well-mannered, and fully vaccinated, she enjoys relaxing in cozy corners and makes an ideal gentle companion for an apartment or calm home."
    },
    {
        "name_en": "Lucky", "name_th": "ลักกี้", "zone": "Clinic Cage Seperate", "p": 1, "idx": 3,
        "gender": "male", "age": "2 ปี", "size": "medium",
        "tags": ["ร่าเริง", "เข้ากับคนง่าย", "โซนดูแลพิเศษ"],
        "th": "ลักกี้ น้องแมวลายสลิดนำโชค อารมณ์ดีและเป็นมิตรกับทุกคน เข้ากับคนแปลกหน้าได้ง่าย ชอบส่งเสียงทักทายเมื่อมีคนเดินผ่าน กำลังมองหาบ้านที่พร้อมเปิดรับความสดใสครับ",
        "en": "Lucky is a friendly and cheerful tabby cat who greets visitors with soft purrs. Social, confident, and very loving, Lucky brings joy wherever he goes and is eager to join a caring family."
    },
    {
        "name_en": "Mozart", "name_th": "โมซาร์ต", "zone": "Clinic Cage Seperate", "p": 1, "idx": 4,
        "gender": "male", "age": "1 ปี 2 เดือน", "size": "medium",
        "tags": ["เสียงหวาน", "ติดคน", "ทำวัคซีนแล้ว"],
        "th": "โมซาร์ต น้องแมวทักซิโด้ขาวดำผู้มีน้ำเสียงร้องอันไพเราะสมชื่อ นิสัยติดคน ชอบเดินตามและเข้ามานอนซบข้างๆ ได้รับการดูแลสุขภาพและฉีดวัคซีนเรียบร้อยครับ",
        "en": "Mozart is a charming tuxedo cat blessed with a melodious meow. He forms strong bonds with humans, loves following his caregivers around, and is fully vaccinated and ready to serenade his new family."
    },
    {
        "name_en": "Pancake", "name_th": "แพนเค้ก", "zone": "Clinic Cage Seperate", "p": 1, "idx": 5,
        "gender": "female", "age": "8 เดือน", "size": "small",
        "tags": ["ขี้เล่น", "ขนปุกปุย", "ใช้กระบะทรายเป็น"],
        "th": "แพนเค้ก ลูกแมวน้อยขนปุยสีนวลตา วัยกำลังซน ชอบเล่นลูกบอลและไม้ล่อแมว เรียนรู้ไว ใช้กระบะทรายเป็นอย่างดี ต้องการทาสแมวที่พร้อมดูแลน้องให้เติบโตอย่างมีความสุขค่ะ",
        "en": "Pancake is an adorable, fluffy young kitten full of playful curiosity. She loves chasing toys, is fully litter-trained, and is searching for a dedicated human to guide her into adulthood."
    },
    {
        "name_en": "Shere Khan", "name_th": "แชร์คาน", "zone": "Clinic Cage Seperate", "p": 1, "idx": 6,
        "gender": "male", "age": "2 ปี 5 เดือน", "size": "large",
        "tags": ["สง่างาม", "สุขุม", "ทำหมันแล้ว"],
        "th": "แชร์คาน แมวหนุ่มร่างสง่าลายเสือคมเข้ม แม้ภายนอกจะดูน่าเกรงขาม แต่นิสัยจริงคือแมวยักษ์ใจดี ชอบนอนแผ่ให้เกาคาง ไม่ดุร้าย และทำหมันเรียบร้อยแล้วครับ",
        "en": "Shere Khan possesses the striking markings of a majestic tiger paired with the heart of a gentle giant. Calm, poised, and fond of chin scratches, he is neutered and ready for his forever realm."
    },
    {
        "name_en": "Bootleg", "name_th": "บู๊ตเล็ก", "zone": "Zone A - Cat Paradise", "p": 2, "idx": 1,
        "gender": "male", "age": "1 ปี", "size": "small",
        "tags": ["ซุกซน", "ชอบเล่นของเล่น", "ทำวัคซีนแล้ว"],
        "th": "บู๊ตเล็ก ขาประจำโซน Cat Paradise ร่าเริง ชอบสำรวจสิ่งรอบตัวและวิ่งเล่นกับเพื่อนแมว เข้ากับสภาพแวดล้อมใหม่ได้ง่าย เหมาะกับครอบครัวที่ชอบแมวพลังงานดีครับ",
        "en": "Bootleg is a lively resident of Cat Paradise who loves exploring every nook and cranny. Active, playful, and great with other felines, he brings boundless energy and joy."
    },
    {
        "name_en": "Butter", "name_th": "บัตเตอร์", "zone": "Zone A - Cat Paradise", "p": 2, "idx": 2,
        "gender": "female", "age": "1 ปี 4 เดือน", "size": "medium",
        "tags": ["สีนวลตา", "ขี้อ้อน", "ใจดี"],
        "th": "บัตเตอร์ แมวสีครีมนวลตา อบอุ่นสมชื่อ อ่อนโยน ขี้อ้อน ชอบมานอนซุกข้างตักเวลาพักผ่อน เข้ากับแมวตัวอื่นได้ดีมาก เป็นสมาชิกที่แสนสงบของบ้านแน่นอนค่ะ",
        "en": "Butter is as smooth and sweet as her name suggests. Creamy-coated, docile, and affectionate, she loves curling up beside people and coexists peacefully with other pets."
    },
    {
        "name_en": "Cecelia", "name_th": "เซซีเลีย", "zone": "Zone A - Cat Paradise", "p": 2, "idx": 3,
        "gender": "female", "age": "2 ปี", "size": "medium",
        "tags": ["เรียบร้อย", "รักสงบ", "ทำหมันแล้ว"],
        "th": "เซซีเลีย สุภาพสตรีสี่ขาผู้รักความสงบ ชอบนั่งมองนกริมหน้าต่าง ไม่ชอบเสียงดัง รักษาสุขอนามัยดีเยี่ยม เหมาะสำหรับบ้านที่ต้องการบรรยากาศที่ผ่อนคลายค่ะ",
        "en": "Cecelia is a dignified, serene lady who appreciates quiet spaces and sun-drenched window sills. Clean, independent, and gentle, she thrives in calm environments."
    },
    {
        "name_en": "Dingo", "name_th": "ดิงโก้", "zone": "Zone A - Cat Paradise", "p": 2, "idx": 4,
        "gender": "male", "age": "1 ปี 8 เดือน", "size": "medium",
        "tags": ["พลังงานสูง", "ชอบสำรวจ", "ร่าเริง"],
        "th": "ดิงโก้ แมวหนุ่มผู้ตื่นตัวและฉลาด คล่องแคล่วว่องไว ชอบเล่นซ่อนแอบและโต้ตอบกับผู้ดูแลเสมอ ร่างกายแข็งแรงและสุขภาพสมบูรณ์ครับ",
        "en": "Dingo is an alert and athletic young cat who loves interactive play and solving puzzle toys. Curious and spirited, he is in peak physical health."
    },
    {
        "name_en": "Doja", "name_th": "โดจา", "zone": "Zone A - Cat Paradise", "p": 2, "idx": 5,
        "gender": "female", "age": "1 ปี", "size": "small",
        "tags": ["ตาโตน่ารัก", "ชอบคลอเคลีย", "ทำวัคซีนแล้ว"],
        "th": "โดจา น้องแมวตาแป๋วชวนหลงใหล ขี้อ้อนระดับสิบ ชอบเอาหัวมาชนมือเพื่อขอให้ลูบตัว เข้ากับคนง่ายและรักความสะอาดมากค่ะ",
        "en": "Doja has captivating, expressive eyes and a heart overflowing with love. She loves headbutting hands for gentle strokes and gets along delightfully with humans."
    },
    {
        "name_en": "Duster", "name_th": "ดัสเตอร์", "zone": "Zone A - Cat Paradise", "p": 2, "idx": 6,
        "gender": "male", "age": "2 ปี 2 เดือน", "size": "medium",
        "tags": ["ขนนุ่มฟู", "กินเก่ง", "สุขภาพดี"],
        "th": "ดัสเตอร์ หนุ่มขนนุ่มฟูดูสะอาดตา อารมณ์ดีตลอดวัน กินง่ายอยู่ง่าย ชอบแปรงขนและชอบให้เกาคอ เป็นแมวที่อยู่ด้วยแล้วสบายใจครับ",
        "en": "Duster is a fluffy, easygoing sweetheart who thoroughly enjoys being brushed and pampered. Healthy, relaxed, and cheerful, he brings instant comfort."
    },
    {
        "name_en": "Freckle", "name_th": "เฟร็กเคิล", "zone": "Zone A - Cat Paradise", "p": 2, "idx": 7,
        "gender": "female", "age": "9 เดือน", "size": "small",
        "tags": ["ลายน่ารัก", "ขี้เล่น", "ฉลาด"],
        "th": "เฟร็กเคิล แมวน้อยแต้มลายสะดุดตา อายุน้อยและเรียนรู้สิ่งใหม่ได้รวดเร็ว ชอบกระโดดจับของเล่นและนอนพักผ่อนอย่างมีความสุขค่ะ",
        "en": "Freckle features charming unique markings and an inquisitive, playful mind. Quick to learn and quick to cuddle, she is an absolute darling."
    },
    {
        "name_en": "Frosty", "name_th": "ฟรอสตี้", "zone": "Zone A - Cat Paradise", "p": 2, "idx": 8,
        "gender": "male", "age": "1 ปี 5 เดือน", "size": "medium",
        "tags": ["สีขาวนวล", "รักสงบ", "เข้ากับแมวตัวอื่นได้ดี"],
        "th": "ฟรอสตี้ น้องแมวขาวสะอาดตา จิตใจอ่อนโยนและไม่เคยมีปัญหากับเพื่อนแมวตัวไหน เข้าสังคมแมวเก่งมาก เหมาะกับบ้านที่มีแมวอยู่แล้วครับ",
        "en": "Frosty is a graceful white-furred cat with a calm, accepting temperament. Highly social with other felines, he integrates effortlessly into multi-pet homes."
    },
    {
        "name_en": "George", "name_th": "จอร์จ", "zone": "Zone A - Cat Paradise", "p": 2, "idx": 9,
        "gender": "male", "age": "3 ปี", "size": "large",
        "tags": ["อบอุ่น", "ชอบนอนกลางวัน", "ทำหมันแล้ว"],
        "th": "จอร์จ พี่ใหญ่ประจำโซน นิสัยใจเย็น สุขุม ชอบนอนกลางวันท่ามกลางแสงแดดอุ่นๆ เป็นมิตรและวางตัวดีมาก ทำหมันเรียบร้อยแล้วครับ",
        "en": "George is a mature, gentle feline who values serene naps and warm companionship. Patient, quiet, and neutered, he is the picture of tranquility."
    },
    {
        "name_en": "Hawk", "name_th": "ฮอค", "zone": "Zone A - Cat Paradise", "p": 2, "idx": 10,
        "gender": "male", "age": "1 ปี 3 เดือน", "size": "medium",
        "tags": ["สายตาวาววับ", "ว่องไว", "ชอบปีนป่าย"],
        "th": "ฮอค แมวลายเสือแววตามุ่งมั่น ชอบปีนขึ้นที่สูงเพื่อสอดส่องดูแลอาณาเขต ร่างกายแข็งแรง คล่องแคล่ว และขี้เล่นมากครับ",
        "en": "Hawk has striking keen eyes and loves perching up high to observe his surroundings. Agile, healthy, and playful, he loves cat towers and active play."
    },
    {
        "name_en": "Hazel", "name_th": "เฮเซล", "zone": "Zone A - Cat Paradise", "p": 2, "idx": 11,
        "gender": "female", "age": "2 ปี", "size": "medium",
        "tags": ["ตาสีอำพัน", "สุภาพ", "ทำวัคซีนแล้ว"],
        "th": "เฮเซล แมวสาวดวงตาสีอำพันทรงเสน่ห์ นิสัยสุภาพ นุ่มนวล ไม่ส่งเสียงดัง ฉีดวัคซีนครบถ้วนและพร้อมย้ายเข้าสู่บ้านที่อบอุ่นค่ะ",
        "en": "Hazel is an elegant cat with captivating amber eyes and an extremely courteous demeanor. Gentle, quiet, and fully vaccinated, she makes a loyal companion."
    },
    {
        "name_en": "Kea", "name_th": "เก๋", "zone": "Zone A - Cat Paradise", "p": 2, "idx": 12,
        "gender": "female", "age": "1 ปี 1 เดือน", "size": "small",
        "tags": ["น่ารักสดใส", "ช่างเจรจา", "ขี้อ้อน"],
        "th": "เก๋ น้องแมวเสียงใสช่างพูด ชอบส่งเสียงตอบรับเวลาเรียกชื่อ ขี้อ้อนและชอบอยู่ใกล้ชิดคน เติมเต็มรอยยิ้มให้กับทุกคนในบ้านค่ะ",
        "en": "Kea is a delightful, talkative young cat who responds sweetly when spoken to. Affectionate and people-oriented, she will fill your home with laughter."
    },
    {
        "name_en": "King Julian", "name_th": "คิงส์จูเลี่ยน", "zone": "Zone A - Cat Paradise", "p": 2, "idx": 13,
        "gender": "male", "age": "2 ปี 6 เดือน", "size": "large",
        "tags": ["ผู้นำฝูง", "สง่างาม", "ทำหมันแล้ว"],
        "th": "คิงส์จูเลี่ยน แมวใหญ่มาดผู้นำ เดินเหินอย่างสง่างาม ไม่ก้าวร้าว ชอบให้คนเกาหัวและดูแลเอาใจใส่ พร้อมเป็นราชาประจำหัวใจของเจ้าของคนใหม่ครับ",
        "en": "King Julian carries himself with natural regal grace while possessing a warm, cuddly heart. Confident, friendly, and neutered, he is ready to rule your sofa."
    },
    {
        "name_en": "Kiwi", "name_th": "กีวี", "zone": "Zone A - Cat Paradise", "p": 2, "idx": 14,
        "gender": "female", "age": "10 เดือน", "size": "small",
        "tags": ["ตัวเล็กน่าทะนุถนอม", "ชอบเล่นเบาๆ", "กินง่าย"],
        "th": "กีวี แมวน้อยไซส์กะทัดรัด นิสัยอ่อนหวาน กินง่าย ไม่เลือกอาหาร ชอบนอนขดบนเบาะนุ่มๆ และเล่นของเล่นเบาๆ ค่ะ",
        "en": "Kiwi is a petite, sweet-spirited young feline who enjoys gentle playtime and cozy beds. Low-maintenance and loving, she is truly precious."
    },
    {
        "name_en": "Lemur", "name_th": "ลีเมอร์", "zone": "Zone A - Cat Paradise", "p": 2, "idx": 15,
        "gender": "male", "age": "1 ปี 7 เดือน", "size": "medium",
        "tags": ["หางยาวสวย", "อยากรู้อยากเห็น", "เป็นมิตร"],
        "th": "ลีเมอร์ หนุ่มน้อยหางเรียวยาวสวยงาม ช่างสงสัย ชอบสังเกตสิ่งใหม่ๆ เสมอ เข้ากับคนได้ดีและไม่ขี้กลัวครับ",
        "en": "Lemur is an inquisitive cat with a beautifully expressive tail. Social and curious, he greets every day with optimism and friendliness."
    },
    {
        "name_en": "Mango", "name_th": "มะม่วง", "zone": "Zone A - Cat Paradise", "p": 2, "idx": 16,
        "gender": "female", "age": "1 ปี 2 เดือน", "size": "medium",
        "tags": ["ส้มสดใส", "ชอบนอนอาบแดด", "อารมณ์ดี"],
        "th": "มะม่วง น้องแมวส้มอารมณ์ดี ร่าเริง ชอบนอนผึ่งแดดยามเช้าและเข้ามาคลอเคลียเวลาเจ้าของกลับถึงบ้าน น่ารักและทำให้บ้านสดใสค่ะ",
        "en": "Mango is a sunny ginger sweetheart who loves basking in morning rays and welcoming humans with warm affection. Pure joy in feline form."
    },
    {
        "name_en": "Mo", "name_th": "โม", "zone": "Zone A - Cat Paradise", "p": 2, "idx": 17,
        "gender": "male", "age": "2 ปี", "size": "medium",
        "tags": ["เงียบขรึม", "ไม่ดื้อ", "ชอบเกาพุง"],
        "th": "โม หนุ่มเงียบขรึมรักความสงบ ไม่ดื้อไม่ซน ชอบนอนหงายให้เกาพุงเมื่อเริ่มคุ้นเคย ซื่อสัตย์และต้องการความรักที่มั่นคงครับ",
        "en": "Mo is a quiet, steady-natured companion. Though modest at first, he happily offers his belly for rubs once he knows you. Utterly dependable."
    },
    {
        "name_en": "Mozzy", "name_th": "มอซซี่", "zone": "Zone A - Cat Paradise", "p": 3, "idx": 1,
        "gender": "male", "age": "1 ปี 4 เดือน", "size": "medium",
        "tags": ["ขี้อ้อน", "ชอบคลอเคลียขา", "ทำวัคซีนแล้ว"],
        "th": "มอซซี่ เจ้าของฉายาแมวติดหนึบ ชอบเดินคลอเคลียรอบขาเพื่อทักทาย ร่าเริง สดใส และฉีดวัคซีนเรียบร้อยแล้วครับ",
        "en": "Mozzy is the ultimate cuddlebug who adores weaving around your legs to say hello. Cheerful, healthy, and vaccinated, he loves being close."
    },
    {
        "name_en": "Ocean Eyes", "name_th": "โอเชียนอายส์", "zone": "Zone A - Cat Paradise", "p": 3, "idx": 2,
        "gender": "female", "age": "1 ปี 9 เดือน", "size": "small",
        "tags": ["ตาสีฟ้าคราม", "มีเสน่ห์", "สงบเสงี่ยม"],
        "th": "โอเชียนอายส์ สาวน้อยตาสีฟ้าครามลุ่มลึกดั่งมหาสมุทร สงบเสงี่ยม เรียบร้อย มีเสน่ห์เฉพาะตัวและชอบความอ่อนโยนค่ะ",
        "en": "Ocean Eyes mesmerizes everyone with her captivating sky-blue gaze. Gentle, serene, and graceful, she seeks a caring, soft-spoken household."
    },
    {
        "name_en": "Penguin", "name_th": "เพนกวิน", "zone": "Zone A - Cat Paradise", "p": 3, "idx": 3,
        "gender": "male", "age": "2 ปี", "size": "medium",
        "tags": ["ลายทักซิโด้", "เรียบร้อย", "ทำหมันแล้ว"],
        "th": "เพนกวิน หนุ่มทักซิโด้มาดคุณชาย เรียบร้อย สะอาดสะอ้าน ใช้กระบะทรายเป็น และทำหมันเรียบร้อยแล้วครับ",
        "en": "Penguin looks sharply dressed in his timeless tuxedo coat. Polite, immaculate, and fully neutered, he is a true gentleman."
    },
    {
        "name_en": "Penny", "name_th": "เพนนี่", "zone": "Zone A - Cat Paradise", "p": 3, "idx": 4,
        "gender": "female", "age": "1 ปี", "size": "small",
        "tags": ["น่ารักตัวเล็ก", "ติดคน", "ชอบนอนตัก"],
        "th": "เพนนี่ แมวน้อยตัวกะทัดรัดที่ชอบกระโดดขึ้นมานอนบนตัก ขี้อ้อน ติดคน และส่งเสียงครางเบาๆ อย่างมีความสุขค่ะ",
        "en": "Penny is a pint-sized cuddle champion who loves curling up in your lap for hours. Extremely affectionate and human-centric."
    },
    {
        "name_en": "Puma", "name_th": "พูมา", "zone": "Zone A - Cat Paradise", "p": 3, "idx": 5,
        "gender": "male", "age": "2 ปี 3 เดือน", "size": "large",
        "tags": ["แข็งแรง", "ชอบเล่นวิ่งไล่จับ", "กินเก่ง"],
        "th": "พูมา แมวหนุ่มกำยำ กล้ามเนื้อแน่น ชอบเล่นวิ่งไล่จับของเล่น สุขภาพแข็งแรงมากและกินเก่งครับ",
        "en": "Puma is an athletic, muscular feline who adores active sprint games and good hearty meals. In great health and high spirits."
    },
    {
        "name_en": "Pumpkin", "name_th": "แพมพ์กิน", "zone": "Zone A - Cat Paradise", "p": 3, "idx": 6,
        "gender": "female", "age": "1 ปี 5 เดือน", "size": "medium",
        "tags": ["แมวส้มอารมณ์ดี", "เสียงใส", "ชอบให้เกาคาง"],
        "th": "แพมพ์กิน แมวส้มหน้าหวาน นิสัยร่าเริงและเป็นมิตรกับทุกคน ชอบให้เกาคางและหลับตาพริ้มเวลาได้ความรักค่ะ",
        "en": "Pumpkin is a warm golden sweetheart with a cheerful disposition and soft purr. She adores chin scritches and human company."
    },
    {
        "name_en": "Rose", "name_th": "โรส", "zone": "Zone A - Cat Paradise", "p": 3, "idx": 7,
        "gender": "female", "age": "2 ปี", "size": "medium",
        "tags": ["อ่อนโยน", "ขี้อายเล็กน้อย", "อบอุ่น"],
        "th": "โรส น้องแมวผู้มีความอ่อนโยนในหัวใจ อาจจะขี้อายเล็กน้อยในตอนแรก แต่เมื่อคุ้นเคยแล้วจะหวานและขี้อ้อนมากค่ะ",
        "en": "Rose is a tender soul who blooms beautifully once she feels secure. Soft, delicate, and deeply loyal to those she trusts."
    },
    {
        "name_en": "Rudolph", "name_th": "รูดอฟ", "zone": "Zone A - Cat Paradise", "p": 3, "idx": 8,
        "gender": "male", "age": "1 ปี 6 เดือน", "size": "medium",
        "tags": ["จมูกชมพู", "ขี้เล่น", "ทำวัคซีนแล้ว"],
        "th": "รูดอฟ แมวหนุ่มจมูกสีชมพูแต้มน่ารัก ซุกซน ร่าเริง ชอบเล่นลูกปิงปอง ฉีดวัคซีนครบพร้อมนำโชคดีสู่ครอบครัวครับ",
        "en": "Rudolph sports an adorable pink nose and a playful, bouncy personality. Fully vaccinated and ready to bring festive cheer all year round."
    },
    {
        "name_en": "Smoky", "name_th": "สโมคกี้", "zone": "Zone A - Cat Paradise", "p": 3, "idx": 9,
        "gender": "male", "age": "2 ปี 1 เดือน", "size": "medium",
        "tags": ["สีควันบุหรี่", "นุ่มนวล", "ชอบนอนริมหน้าต่าง"],
        "th": "สโมคกี้ แมวสีเทาควันบุหรี่สุดคลาสสิก นุ่มนวล สงบเสงี่ยม ชอบนั่งมองวิวริมหน้าต่างและนอนขดข้างๆ ผู้ดูแลครับ",
        "en": "Smoky possesses a classic velvet smoky coat and a gentle, relaxed spirit. He enjoys window watching and peaceful companionship."
    },
    {
        "name_en": "Snoop", "name_th": "สนูป", "zone": "Zone A - Cat Paradise", "p": 3, "idx": 10,
        "gender": "male", "age": "1 ปี 8 เดือน", "size": "medium",
        "tags": ["อยากรู้อยากเห็น", "ฉลาดแสนรู้", "ชอบของเล่น"],
        "th": "สนูป นักสืบสี่ขาผู้ชอบสำรวจทุกสิ่ง ฉลาด ไหวพริบดี และชอบมีส่วนร่วมในกิจกรรมของมนุษย์เสมอครับ",
        "en": "Snoop is an observant and intelligent explorer who investigates every novelty with charming curiosity. Very smart and interactive."
    },
    {
        "name_en": "Spickle", "name_th": "สปิคเคิล", "zone": "Zone A - Cat Paradise", "p": 3, "idx": 11,
        "gender": "female", "age": "1 ปี", "size": "small",
        "tags": ["ลายเปรอะน่าเอ็นดู", "น่ารัก", "เข้ากับแมวอื่นได้"],
        "th": "สปิคเคิล แมวสาวลายกระดองเต่าแต้มสีน่ารัก เป็นมิตรกับทั้งคนและแมว ไม่เคยมีเรื่องกับใคร จิตใจดีมากค่ะ",
        "en": "Spickle has a delightful calico/tortie coat and a heart of pure sunshine. Exceptionally harmonious with other cats and affectionate with people."
    },
    {
        "name_en": "Spooky", "name_th": "สปูคกี้", "zone": "Zone A - Cat Paradise", "p": 3, "idx": 12,
        "gender": "male", "age": "1 ปี 3 เดือน", "size": "medium",
        "tags": ["ลึกลับน่าค้นหา", "ชอบแอบมอง", "อ่อนหวาน"],
        "th": "สปูคกี้ แมวหนุ่มแววตาลึกลับ ชอบแอบมองจากมุมห้อง แต่เมื่อเข้าไปหาจะส่งเสียงร้องเบาๆ และให้ลูบหัวอย่างมีความสุขครับ",
        "en": "Spooky may peek from behind curtains, but behind that mysterious exterior is a gentle cuddle enthusiast waiting to be loved."
    },
    {
        "name_en": "Stubby", "name_th": "สตับบี้", "zone": "Zone A - Cat Paradise", "p": 3, "idx": 13,
        "gender": "male", "age": "2 ปี 4 เดือน", "size": "medium",
        "tags": ["หางกุดนำโชค", "ใจดี", "ทำหมันแล้ว"],
        "th": "สตับบี้ แมวหางกุดตามธรรมชาติสไตล์แมวไทย นำโชคลาภ จิตใจดี อ่อนโยน เข้ากับทุกคนได้ง่าย ทำหมันแล้วครับ",
        "en": "Stubby is a lucky bobtail boy with an endearing presence. Even-tempered, loving, and neutered, he is a steadfast friend."
    },
    {
        "name_en": "Tui", "name_th": "ทูอี้", "zone": "Zone A - Cat Paradise", "p": 3, "idx": 14,
        "gender": "female", "age": "1 ปี 1 เดือน", "size": "small",
        "tags": ["ขี้อ้อนมาก", "ชอบส่งเสียงทักทาย", "ทำวัคซีนแล้ว"],
        "th": "ทูอี้ สาวน้อยขี้อ้อนขั้นสุด ชอบส่งเสียงทักทายทุกครั้งที่เห็นคน ร่าเริง สดใส และได้รับวัคซีนครบถ้วนค่ะ",
        "en": "Tui is an expressive, social sweetheart who greets you with warm chirps. Vibrant, healthy, and vaccinated, she radiates affection."
    },
    {
        "name_en": "Zorro", "name_th": "ซอร์โร", "zone": "Zone A - Cat Paradise", "p": 3, "idx": 15,
        "gender": "male", "age": "2 ปี 2 เดือน", "size": "large",
        "tags": ["ลายหน้ากากเท่", "กล้าหาญ", "เป็นมิตร"],
        "th": "ซอร์โร แมวหน้ากากฮีโร่สุดเท่ มั่นใจในตัวเอง กล้าหาญ แต่เป็นมิตรและรักสงบเมื่ออยู่ในบ้าน ทำหมันเรียบร้อยแล้วครับ",
        "en": "Zorro rocks a dashing masked facial pattern. Confident, brave, yet wonderfully gentle at home, he is an exceptional companion."
    }
]

# Dogs across all sections with exact notes from dog_list-1.pdf
dogs = [
    # Blind Area
    {
        "name_en": "Rottaang", "name_th": "ร็อตแทง", "zone": "Blind Area", "p": 1, "idx": 4, "note": "Walkeble but is a blind dog",
        "gender": "male", "age": "3 ปี", "size": "medium",
        "tags": ["บกพร่องทางการมองเห็น", "เดินสายจูงได้ดี", "หัวใจนักสู้", "ทำหมันแล้ว"],
        "th": "ร็อตแทง สุนัขผู้เข้มแข็งจากโซนดูแลสุนัขตาบอด แม้สายตาจะมองไม่เห็นแต่น้องสามารถปรับตัวและเดินสายจูงได้อย่างมั่นคง จิตใจอ่อนโยน ร่าเริง และพร้อมมอบความรักให้ครอบครัวที่เข้าใจและเมตตาครับ",
        "en": "Rottaang is a resilient, loving boy from the Blind Area. Although blind, he walks remarkably well on a leash and navigates by hearing and touch. Sweet-tempered and brave, he is seeking an understanding home."
    },
    {
        "name_en": "Dobi", "name_th": "โดบี้", "zone": "Blind Area", "p": 1, "idx": 1, "note": "N/A",
        "gender": "male", "age": "2 ปี", "size": "medium",
        "tags": ["บกพร่องทางการมองเห็น", "ขี้อ้อน", "ชอบให้ลูบตัว"],
        "th": "โดบี้ น้องหมาตาบอดแต่มีประสาทรับเสียงและสัมผัสยอดเยี่ยม ชอบเอาตัวมาพิงและให้ลูบหัวอย่างมีความสุข เป็นสุนัขที่อ่อนโยนและต้องการความอบอุ่นครับ",
        "en": "Dobi is a gentle blind dog with an extraordinary heart. He leans affectionately against caregivers for pets and thrives on quiet kindness and consistent routine."
    },
    {
        "name_en": "Kiwi", "name_th": "คีวี", "zone": "Blind Area", "p": 1, "idx": 2, "note": "N/A",
        "gender": "female", "age": "2 ปี 5 เดือน", "size": "small",
        "tags": ["บกพร่องทางการมองเห็น", "ใจดี", "เรียบร้อย"],
        "th": "คีวี สุนัขเพศเมียตัวเล็กผู้บกพร่องทางการมองเห็น นิสัยเรียบร้อย สงบเสงี่ยม ปรับตัวในพื้นที่คุ้นเคยได้เป็นอย่างดี เหมาะสำหรับบ้านที่พร้อมดูแลเอาใจใส่ค่ะ",
        "en": "Kiwi is a petite, quiet female dog in the Blind Area. Well-mannered and peaceful, she maps out familiar indoor spaces easily and loves gentle companionship."
    },
    {
        "name_en": "Namaste", "name_th": "นมัสเต", "zone": "Blind Area", "p": 1, "idx": 3, "note": "N/A",
        "gender": "female", "age": "3 ปี", "size": "medium",
        "tags": ["บกพร่องทางการมองเห็น", "สงบเสงี่ยม", "ปรับตัวเก่ง"],
        "th": "นมัสเต น้องหมาผู้สงบนิ่งดั่งชื่อ เข้าใจโลก อารมณ์เย็นและรักสงบ มีความสุขกับการได้นอนพักผ่อนข้างๆ คนที่รักและไว้ใจค่ะ",
        "en": "Namaste is a peaceful and soulful dog from the Blind Area. Serene, patient, and deeply grateful for kindness, she brings a calm aura to any household."
    },
    {
        "name_en": "Saka", "name_th": "สากะ", "zone": "Blind Area", "p": 1, "idx": 5, "note": "N/A",
        "gender": "male", "age": "4 ปี", "size": "large",
        "tags": ["บกพร่องทางการมองเห็น", "ใจดีและเป็นมิตร", "ทำวัคซีนแล้ว"],
        "th": "สากะ สุนัขตัวโตใจดีจากโซนตาบอด อ่อนโยนกับทุกคน ไม่ก้าวร้าว ชอบนอนรับลมและฟังเสียงรอบตัว ได้รับวัคซีนครบถ้วนครับ",
        "en": "Saka is a large, gentle-hearted dog in the Blind Area. Completely non-aggressive, polite, and fully vaccinated, he is a true loyal giant."
    },

    # Clinic Area
    {
        "name_en": "Americano", "name_th": "อเมริกาโน่", "zone": "Clinic", "p": 2, "idx": 1, "note": "N/A",
        "gender": "male", "age": "2 ปี", "size": "large",
        "tags": ["สีเข้มดูดี", "ขี้เล่น", "ฉีดวัคซีนแล้ว"],
        "th": "อเมริกาโน่ สุนัขสีเข้มคมเข้มสมชื่อ ร่าเริง แข็งแรง ผ่านการดูแลฟื้นฟูสุขภาพจากคลินิกจนสมบูรณ์ พร้อมออกไปวิ่งเล่นกับครอบครัวใหม่ครับ",
        "en": "Americano is a handsome dark-coated dog fully rehabilitated at the Clinic. Energetic, strong, and playful, he is ready for outdoor fun."
    },
    {
        "name_en": "Bella", "name_th": "เบลล่า", "zone": "Clinic", "p": 2, "idx": 2, "note": "Walkable but reactive with other dogs",
        "gender": "female", "age": "2 ปี 6 เดือน", "size": "medium",
        "tags": ["เดินสายจูงได้", "พลังงานสูง", "ชอบคน", "เหมาะเป็นสัตว์เลี้ยงเดี่ยว"],
        "th": "เบลล่า สุนัขแสนร่าเริงและรักมนุษย์มาก สามารถเดินสายจูงได้ดี แต่มีความตื่นตัวต่อสุนัขตัวอื่น จึงเหมาะที่สุดกับการเป็นสัตว์เลี้ยงตัวเดียวในบ้านที่พร้อมให้ความรักเต็มที่ค่ะ",
        "en": "Bella is an enthusiastic, human-loving dog who walks well on a leash. Because she can be reactive when encountering other dogs, she thrives best as the only beloved pet."
    },
    {
        "name_en": "Boonrood", "name_th": "บุญรูด", "zone": "Clinic", "p": 2, "idx": 4, "note": "N/A",
        "gender": "male", "age": "3 ปี", "size": "medium",
        "tags": ["รอดชีวิตปาฏิหาริย์", "ซื่อสัตย์", "ทำหมันแล้ว"],
        "th": "บุญรูด สุนัขผู้รอดชีวิตจากความยากลำบาก ซื่อสัตย์ ภักดี และกตัญญูมาก ตอนนี้สุขภาพแข็งแรง ทำหมันแล้ว และรอคอยบ้านที่จะไม่ทอดทิ้งเขาอีกครับ",
        "en": "Boonrood is a grateful survivor whose loyalty knows no bounds. Fully recovered, neutered, and deeply devoted, he will stand by his adoptive family forever."
    },
    {
        "name_en": "Celeste", "name_th": "เซเลสเต้", "zone": "Clinic", "p": 2, "idx": 5, "note": "N/A",
        "gender": "female", "age": "1 ปี 8 เดือน", "size": "medium",
        "tags": ["ร่าเริงสดใส", "ขี้อ้อน", "เข้ากับคนง่าย"],
        "th": "เซเลสเต้ น้องหมาสาวรอยยิ้มสดใส ร่าเริงและเข้ากับทุกคนได้ง่าย ชอบให้เกาพุงและกระดิกหางต้อนรับเสมอค่ะ",
        "en": "Celeste radiates infectious cheerfulness. Friendly with visitors, eager to please, and fond of belly rubs, she brightens every room she enters."
    },
    {
        "name_en": "Cheeto", "name_th": "ชีโต", "zone": "Clinic", "p": 2, "idx": 6, "note": "Can be walked",
        "gender": "male", "age": "1 ปี 5 เดือน", "size": "small",
        "tags": ["เดินสายจูงเก่ง", "น่ารักสดใส", "ชอบออกกำลังกาย"],
        "th": "ชีโต สุนัขตัวเล็กกะทัดรัด เดินสายจูงเก่งมาก สดใส กระฉับกระเฉง เหมาะสำหรับพาเดินเล่นในสวนสาธารณะทุกวันครับ",
        "en": "Cheeto is a sprightly, compact dog who excels on leash walks. Fun-loving and energetic, he is a wonderful walking partner."
    },
    {
        "name_en": "Coco Chanel", "name_th": "โคโค่ ชาแนล", "zone": "Clinic", "p": 2, "idx": 7, "note": "N/A",
        "gender": "female", "age": "2 ปี", "size": "medium",
        "tags": ["สวยสง่า", "เรียบร้อย", "ทำวัคซีนครบ"],
        "th": "โคโค่ ชาแนล สุนัขสาวมาดคุณหนู เรียบร้อย สะอาด สุภาพ อ่อนโยน ฉีดวัคซีนครบถ้วนและพร้อมเป็นสมาชิกคนโปรดของบ้านค่ะ",
        "en": "Coco Chanel carries herself with poise and grace. Polite, clean, fully vaccinated, and affectionate, she is ready to be your most treasured companion."
    },
    {
        "name_en": "Freya", "name_th": "เฟรยา", "zone": "Clinic", "p": 2, "idx": 9, "note": "N/A",
        "gender": "female", "age": "2 ปี 2 เดือน", "size": "medium",
        "tags": ["ใจเย็น", "สายตาอ่อนโยน", "ชอบนอนข้างๆ"],
        "th": "เฟรยา น้องหมาสายตาอบอุ่น นิสัยสุขุม ไม่ส่งเสียงรบกวน ชอบนอนพักผ่อนเคียงข้างเจ้าของ เป็นเพื่อนแท้ที่เข้าใจความรู้สึกค่ะ",
        "en": "Freya has a deeply compassionate, calm gaze. She rarely barks, loves lying peacefully by your feet, and provides quiet comfort."
    },
    {
        "name_en": "Johnny", "name_th": "จอนนี่", "zone": "Clinic", "p": 2, "idx": 10, "note": "N/A",
        "gender": "male", "age": "3 ปี", "size": "medium",
        "tags": ["ฉลาดแสนรู้", "ชอบเล่นบอล", "สุขภาพดี"],
        "th": "จอนนี่ สุนัขแสนรู้ ฉลาดและรับคำสั่งได้ไว ชอบวิ่งคาบลูกบอล สุขภาพแข็งแรงสมบูรณ์และเป็นมิตรกับผู้คนครับ",
        "en": "Johnny is a sharp, quick-witted canine who loves fetch and learning tricks. Robust, athletic, and eager to connect."
    },
    {
        "name_en": "Lottie", "name_th": "ลอตตี", "zone": "Clinic", "p": 2, "idx": 13, "note": "Walkable but very shy",
        "gender": "female", "age": "1 ปี 9 เดือน", "size": "medium",
        "tags": ["เดินสายจูงได้", "ขี้อาย", "ต้องการความเข้าใจ", "อ่อนโยน"],
        "th": "ลอตตี น้องหมาขี้อายแต่จิตใจอ่อนหวาน สามารถเดินสายจูงได้ ต้องการเวลาสร้างความคุ้นเคยและความไว้ใจ เมื่อเปิดใจแล้วจะเป็นเพื่อนที่ซื่อสัตย์มากค่ะ",
        "en": "Lottie is a delicate, gentle girl who is quite timid initially. She walks nicely on a leash and flourishes with calm patience and gentle encouragement."
    },
    {
        "name_en": "Lovito", "name_th": "โลวิโต้", "zone": "Clinic", "p": 2, "idx": 14, "note": "Cannot be walked yet, needs more socialization",
        "gender": "male", "age": "1 ปี 3 เดือน", "size": "medium",
        "tags": ["กำลังฝึกเข้าสังคม", "ต้องการเวลาสร้างความไว้ใจ", "แววตาน่ารัก"],
        "th": "โลวิโต้ น้องหมาวัยรุ่นที่กำลังอยู่ในช่วงฝึกฝนเข้าสังคม ยังเดินสายจูงไม่ได้ ต้องการผู้รับเลี้ยงที่มีประสบการณ์และความอดทนในการมอบความอบอุ่นครับ",
        "en": "Lovito is a young rescue dog still learning that humans can be trusted. Not yet ready for leashed walks, he needs an experienced, patient guardian to guide his socialization."
    },
    {
        "name_en": "Lucky", "name_th": "ลัคกี้", "zone": "Clinic", "p": 2, "idx": 15, "note": "N/A",
        "gender": "male", "age": "2 ปี 4 เดือน", "size": "medium",
        "tags": ["นำโชค", "กระตือรือร้น", "รักเจ้าของ"],
        "th": "ลัคกี้ สุนัขนำโชคผู้ร่าเริง มีพลังบวกเต็มเปี่ยม ชอบเล่นและกระดิกหางอย่างมีความสุข พร้อมก้าวเข้าสู่ครอบครัวใหม่ครับ",
        "en": "Lucky is a spirited, affectionate boy full of positive energy. Always wagging his tail, he brings good fortune and warmth to any household."
    },
    {
        "name_en": "Sally", "name_th": "แซลลี่", "zone": "Clinic", "p": 3, "idx": 3, "note": "Can be walked",
        "gender": "female", "age": "2 ปี", "size": "medium",
        "tags": ["เดินสายจูงได้ดี", "สดใสร่าเริง", "ทำหมันแล้ว"],
        "th": "แซลลี่ สุนัขสาวร่าเริง เดินสายจูงได้ดีมาก เข้ากับคนและสิ่งแวดล้อมใหม่ได้รวดเร็ว ทำหมันและสุขภาพพร้อมย้ายบ้านค่ะ",
        "en": "Sally is an upbeat, adaptable female dog who walks splendidly on a leash. Neutered, vaccinated, and excited to join family outings."
    },
    {
        "name_en": "TeddyBear", "name_th": "เทดดี้ แบร์", "zone": "Clinic", "p": 3, "idx": 5, "note": "N/A",
        "gender": "male", "age": "1 ปี 6 เดือน", "size": "small",
        "tags": ["เหมือนตุ๊กตาหมี", "ขี้อ้อนสุดๆ", "น่ากอด"],
        "th": "เทดดี้ แบร์ น้องหมาหน้าตาน่ารักน่ากอดดั่งตุ๊กตาหมี อารมณ์ดี ชอบให้อุ้มและลูบตัว เหมาะสำหรับครอบครัวที่มีเวลาดูแลใกล้ชิดครับ",
        "en": "TeddyBear is a cuddly, charming dog who resembles an adorable plush bear. Loves hugs, gentle attention, and being pampered."
    },

    # Kitchen Area
    {
        "name_en": "Chuni (Spring)", "name_th": "ชูนิ (สปริงค์)", "zone": "Kitchen", "p": 4, "idx": 1, "note": "N/A",
        "gender": "female", "age": "2 ปี 1 เดือน", "size": "medium",
        "tags": ["กินเก่ง", "ร่าเริง", "ชอบอยู่ใกล้คน"],
        "th": "ชูนิ ขาประจำโซนห้องครัว ร่าเริง กินเก่ง มีพลัง ชอบมาต้อนรับเวลาทำอาหาร เป็นสุนัขที่อยู่ใกล้แล้วมีแต่รอยยิ้มค่ะ",
        "en": "Chuni is a joyous kitchen-area companion who loves treats and human proximity. Always cheerful, friendly, and food-motivated."
    },
    {
        "name_en": "Cloudy", "name_th": "หมอก", "zone": "Kitchen", "p": 4, "idx": 2, "note": "* Not walked yet - still too scared",
        "gender": "male", "age": "1 ปี 4 เดือน", "size": "medium",
        "tags": ["ขี้กลัวเล็กน้อย", "ต้องการความรักความอบอุ่น", "จิตใจอ่อนโยน"],
        "th": "หมอก น้องหมาที่ยังคงมีความกลัวจากอดีต ยังไม่พร้อมเดินสายจูง แต่มีจิตใจที่อ่อนโยน ต้องการบ้านที่เงียบสงบและเข้าใจเพื่อช่วยเปิดใจครับ",
        "en": "Cloudy is a timid sweetheart still recovering from past trauma. Not yet walked, he needs a quiet sanctuary and a kind heart to help him feel safe."
    },
    {
        "name_en": "Dotty", "name_th": "ดอทตี้", "zone": "Kitchen", "p": 4, "idx": 3, "note": "N/A",
        "gender": "female", "age": "2 ปี", "size": "small",
        "tags": ["ลายน่ารัก", "ขี้ประจบ", "ชอบขนม"],
        "th": "ดอทตี้ สุนัขลายจุดน่ารัก นิสัยประจบเก่ง อ้อนขอขนมได้อย่างน่าเอ็นดู เข้ากับทุกคนได้ง่ายค่ะ",
        "en": "Dotty features charming spotted markings and an affectionate, treat-loving personality. Quick to bond and easy to love."
    },
    {
        "name_en": "Lamai", "name_th": "ละไม", "zone": "Kitchen", "p": 4, "idx": 4, "note": "N/A",
        "gender": "female", "age": "3 ปี", "size": "medium",
        "tags": ["ละมุนละไม", "สุขุม", "เฝ้าบ้านได้"],
        "th": "ละไม สุนัขไทยแท้นิสัยละมุนละไม สุขุม รักสงบ แต่ตื่นตัวและช่วยส่งเสียงเตือนคนแปลกหน้าได้ดีเยี่ยมค่ะ",
        "en": "Lamai is a composed, dignified Thai dog. Gentle at heart yet observant, she makes a faithful guardian and serene household companion."
    },
    {
        "name_en": "Latté", "name_th": "ลัตเต้", "zone": "Kitchen", "p": 4, "idx": 5, "note": "N/A",
        "gender": "male", "age": "1 ปี 8 เดือน", "size": "medium",
        "tags": ["สีน้ำตาลกาแฟ", "อารมณ์ดี", "ทำวัคซีนแล้ว"],
        "th": "ลัตเต้ น้องหมาสีน้ำตาลนวลกาแฟ อารมณ์ดี ร่าเริง ฉีดวัคซีนครบ สุขภาพแข็งแรงพร้อมออกไปสร้างความสุขครับ",
        "en": "Latté sports a warm coffee-toned coat and a sunny, balanced temperament. Fully vaccinated, healthy, and ready for adoption."
    },
    {
        "name_en": "Lulu", "name_th": "ลูลู่", "zone": "Kitchen", "p": 4, "idx": 7, "note": "Can be walked but not too enthusiastic, she likes to stay in the kitchen area",
        "gender": "female", "age": "4 ปี", "size": "small",
        "tags": ["ชอบความสงบ", "เดินสายจูงได้", "ติดที่", "อบอุ่นใจดี"],
        "th": "ลูลู่ สุนัขอบอุ่นประจำโซนห้องครัว สามารถเดินสายจูงได้แต่น้องชอบความสุขสงบในบ้านที่คุ้นเคย ไม่เรียกร้องอะไรมาก อบอุ่นและน่ารักมากค่ะ",
        "en": "Lulu can be walked on a leash but truly treasures resting peacefully in cozy, familiar indoor spots. Calm, undemanding, and sweet."
    },
    {
        "name_en": "Makaam", "name_th": "มะขาม", "zone": "Kitchen", "p": 4, "idx": 8, "note": "* Not walked yet. Can snap if you try to put him the harness",
        "gender": "male", "age": "2 ปี 6 เดือน", "size": "medium",
        "tags": ["กำลังฝึกใส่สายจูง", "ต้องการผู้มีประสบการณ์", "ซื่อสัตย์"],
        "th": "มะขาม สุนัขที่ยังมีความหวาดระแวงต่อการใส่สายจูง ต้องการผู้ดูแลที่มีประสบการณ์และเข้าใจพฤติกรรมสัตว์ เมื่อได้รับความไว้ใจจะเป็นสุนัขที่ซื่อสัตย์มากครับ",
        "en": "Makaam is cautious around harnesses and requires an experienced handler skilled in positive reinforcement. Beneath his boundaries lies great loyalty."
    },
    {
        "name_en": "Sunny (Tinto)", "name_th": "ซันนี่", "zone": "Kitchen", "p": 4, "idx": 11, "note": "Can be walked by somebody she trust",
        "gender": "female", "age": "2 ปี 5 เดือน", "size": "medium",
        "tags": ["ต้องการความไว้ใจ", "เดินสายจูงได้", "รักเจ้าของสุดหัวใจ"],
        "th": "ซันนี่ สุนัขสาวน่ารักที่เดินสายจูงได้อย่างมีความสุขเมื่ออยู่กับคนที่ไว้ใจ ซื่อสัตย์และพร้อมผูกพันอย่างลึกซึ้งกับเจ้าของคนใหม่ค่ะ",
        "en": "Sunny walks happily with individuals she has built trust with. Deeply devoted and loving, she forms unforgettable, profound bonds."
    },
    {
        "name_en": "Tara", "name_th": "ทาร่า", "zone": "Kitchen", "p": 4, "idx": 12, "note": "* Not walked yet - needs more leash training. Still too scared",
        "gender": "female", "age": "1 ปี 7 เดือน", "size": "medium",
        "tags": ["ต้องการการฝึกฝน", "ขี้อาย", "ต้องการบ้านที่เข้าใจ"],
        "th": "ทาร่า น้องหมาสาวขี้กลัวที่ยังต้องฝึกการเดินสายจูงเพิ่มเติม อ่อนโยนและต้องการบรรยากาศที่ปลอดภัยเพื่อสร้างความมั่นใจค่ะ",
        "en": "Tara is a shy girl who requires gentle leash training and emotional support. In the right peaceful home, her confidence will flourish."
    },
    {
        "name_en": "Tomseb", "name_th": "ต้มแซ่บ", "zone": "Kitchen", "p": 4, "idx": 14, "note": "N/A",
        "gender": "male", "age": "2 ปี", "size": "medium",
        "tags": ["แสบซนน่ารัก", "กินจุ", "พลังงานล้นเหลือ"],
        "th": "ต้มแซ่บ สุนัขจอมซนรสจัดจ้านตามชื่อ ร่าเริง กินเก่ง พลังงานล้นเหลือ ชอบเล่นและทำให้คนรอบข้างหัวเราะเสมอครับ",
        "en": "Tomseb packs a punch of personality! Playful, energetic, and food-loving, he turns every day into an entertaining adventure."
    },

    # Volunteer Area
    {
        "name_en": "Angie", "name_th": "แองจี้", "zone": "Volunteer Area", "p": 5, "idx": 1, "note": "Too shy to be walked at the moment",
        "gender": "female", "age": "1 ปี 8 เดือน", "size": "medium",
        "tags": ["ขี้อาย", "ตากลมโต", "ต้องการความอ่อนโยน"],
        "th": "แองจี้ น้องหมาสาวขี้อายจากโซนอาสาสมัคร ดวงตากลมโตน่าเอ็นดู ยังไม่พร้อมเดินสายจูง ต้องการความรักและความเข้าใจเพื่อเยียวยาจิตใจค่ะ",
        "en": "Angie is currently too timid for leashed walks. With her soulful, doe-like eyes, she needs an understanding home to heal and feel cherished."
    },
    {
        "name_en": "Choco", "name_th": "ช็อคโก้", "zone": "Volunteer Area", "p": 5, "idx": 2, "note": "Can be walked but she can get scared easily",
        "gender": "female", "age": "2 ปี", "size": "medium",
        "tags": ["เดินสายจูงได้", "ตกใจง่าย", "ชอบการดูแลใกล้ชิด"],
        "th": "ช็อคโก้ สุนัขสีช็อกโกแลต เดินสายจูงได้แต่ตกใจเสียงดังง่าย ต้องการผู้นำทางที่อบอุ่นและคอยปลอบโยนให้อุ่นใจค่ะ",
        "en": "Choco walks nicely on a leash but can be startled by sudden loud noises. She thrives with a calm, reassuring guardian by her side."
    },
    {
        "name_en": "Fai", "name_th": "ฝ้าย", "zone": "Volunteer Area", "p": 5, "idx": 3, "note": "can be walked",
        "gender": "female", "age": "1 ปี 9 เดือน", "size": "medium",
        "tags": ["เดินสายจูงเก่งมาก", "เป็นมิตรกับทุกคน", "พร้อมปรับตัว"],
        "th": "ฝ้าย สุนัขสาวแสนน่ารัก เดินสายจูงได้อย่างคล่องแคล่ว เป็นมิตรกับอาสาสมัครทุกคน ร่าเริงและพร้อมย้ายเข้าสู่บ้านใหม่ได้ทันทีค่ะ",
        "en": "Fai is a star walker and volunteer favorite. Cheerful, friendly, and very cooperative on the leash, she is 100% adoption-ready."
    },
    {
        "name_en": "Freddy", "name_th": "เฟดดี้", "zone": "Volunteer Area", "p": 5, "idx": 4, "note": "N/A",
        "gender": "male", "age": "2 ปี 3 เดือน", "size": "medium",
        "tags": ["ร่าเริง", "ชอบวิ่งเล่น", "ทำหมันแล้ว"],
        "th": "เฟดดี้ สุนัขหนุ่มอารมณ์ดี ชอบวิ่งเล่นในลานกว้าง เข้ากับเพื่อนสุนัขตัวอื่นได้ดี ทำหมันแล้วและสุขภาพแข็งแรงครับ",
        "en": "Freddy is a spirited, good-natured dog who loves yard games and making four-legged friends. Neutered, healthy, and happy."
    },
    {
        "name_en": "Inca", "name_th": "อินคา", "zone": "Volunteer Area", "p": 5, "idx": 5, "note": "Can be walked alone or with other dog",
        "gender": "male", "age": "3 ปี", "size": "large",
        "tags": ["เดินเดี่ยวหรือคู่ได้", "เข้ากับสุนัขอื่นได้ดี", "สุขภาพแข็งแรง"],
        "th": "อินคา สุนัขตัวโตสุขุม สามารถเดินสายจูงได้ทั้งแบบเดี่ยวและเดินคู่กับสุนัขตัวอื่น เข้าสังคมสุนัขได้ดีเยี่ยมและเชื่อฟังคำสั่งครับ",
        "en": "Inca is a well-balanced, mature dog who walks gracefully alone or side-by-side with canine companions. Social and obedient."
    },
    {
        "name_en": "Loki", "name_th": "โลกี้", "zone": "Volunteer Area", "p": 5, "idx": 6, "note": "N/A",
        "gender": "male", "age": "1 ปี 10 เดือน", "size": "medium",
        "tags": ["ฉลาดหลักแหลม", "ขี้เล่น", "ตื่นตัวเสมอ"],
        "th": "โลกี้ สุนัขหนุ่มไฟแรง ฉลาดและชอบเรียนรู้สิ่งใหม่ ว่องไวและพร้อมเป็นคู่หูไปไหนไปกันครับ",
        "en": "Loki is sharp, agile, and enthusiastic about new adventures. High intelligence paired with a playful heart."
    },
    {
        "name_en": "Polly", "name_th": "โพลี่", "zone": "Volunteer Area", "p": 5, "idx": 12, "note": "Can be walked",
        "gender": "female", "age": "2 ปี", "size": "medium",
        "tags": ["เดินสายจูงได้", "น่ารักอารมณ์ดี", "ชอบให้เกาพุง"],
        "th": "โพลี่ น้องหมาสาวน่ารัก เดินสายจูงได้ดี ชอบให้เกาพุงและยิ้มรับทุกคน ร่าเริงและปรับตัวง่ายค่ะ",
        "en": "Polly is an easy-to-walk, affectionate companion who delights in belly rubs and human praise. A total sweetheart."
    },
    {
        "name_en": "Princess", "name_th": "พริ้นซ์", "zone": "Volunteer Area", "p": 5, "idx": 13, "note": "Can be walked but very shy",
        "gender": "female", "age": "2 ปี 2 เดือน", "size": "medium",
        "tags": ["เดินสายจูงได้", "เรียบร้อยขี้อาย", "จิตใจดี"],
        "th": "พริ้นซ์ เจ้าหญิงสี่ขาผู้เรียบร้อย แม้จะขี้อายแต่สามารถเดินสายจูงได้อย่างนุ่มนวล จิตใจดีและต้องการความคุ้มครองค่ะ",
        "en": "Princess is a modest, gentle soul who walks softly on the lead. Timid yet genuinely kind, she will blossom in a patient home."
    },
    {
        "name_en": "Winter", "name_th": "วินเทอร์", "zone": "Volunteer Area", "p": 5, "idx": 17, "note": "Can be walked",
        "gender": "male", "age": "2 ปี 6 เดือน", "size": "large",
        "tags": ["เดินสายจูงได้ดีเยี่ยม", "เท่สุขุม", "ฉีดวัคซีนครบ"],
        "th": "วินเทอร์ สุนัขหนุ่มร่างเท่สุขุม เดินสายจูงได้ดีเยี่ยม ไม่ดึงสาย ไม่ก้าวร้าว ฉีดวัคซีนครบถ้วนและพร้อมเป็นผู้อารักขาครอบครัวครับ",
        "en": "Winter is a poised, majestic walker who stays calm on the leash without pulling. Fully vaccinated and noble in spirit."
    },
    {
        "name_en": "Yaya", "name_th": "ยาย่า", "zone": "Volunteer Area", "p": 6, "idx": 1, "note": "* Not walked yet - too scared",
        "gender": "female", "age": "1 ปี 6 เดือน", "size": "medium",
        "tags": ["ต้องการความเข้าใจ", "ขี้ระแวงเล็กน้อย", "รอคนใจดีปลอบโยน"],
        "th": "ยาย่า สุนัขสาวที่ยังกลัวสิ่งแวดล้อมภายนอกและยังไม่พร้อมเดินสายจูง ต้องการบ้านที่อบอุ่นและพร้อมให้เวลาในการฟื้นฟูจิตใจค่ะ",
        "en": "Yaya is not yet ready for walks due to fear. She is looking for an angel adopter with the patience to earn her trust step by step."
    },

    # Zone A
    {
        "name_en": "Robin", "name_th": "โรบิ้น", "zone": "Zone A", "p": 7, "idx": 5, "note": "Can be walked",
        "gender": "male", "age": "2 ปี", "size": "medium",
        "tags": ["เดินสายจูงได้", "ซื่อตรง", "ชอบออกกำลังกาย"],
        "th": "โรบิ้น สุนัขหนุ่มจาก Zone A เดินสายจูงเก่ง ซื่อสัตย์ ร่างกายแข็งแรง ชอบการออกกำลังกายและเป็นเพื่อนร่วมทางที่ดีครับ",
        "en": "Robin walks well on a leash and loves active outdoor workouts. Honest, loyal, and physically fit."
    },
    {
        "name_en": "Bubu", "name_th": "บูบู้", "zone": "Zone A", "p": 7, "idx": 8, "note": "Can be walked with another dog",
        "gender": "male", "age": "2 ปี 5 เดือน", "size": "medium",
        "tags": ["เดินพร้อมเพื่อนสุนัขได้", "รักเพื่อน", "ปรับตัวเก่ง"],
        "th": "บูบู้ สุนัขผู้รักเพื่อน สามารถเดินสายจูงคู่กับสุนัขตัวอื่นได้อย่างกลมกลืน เข้าสังคมเก่งและปรับตัวได้ยอดเยี่ยมครับ",
        "en": "Bubu loves buddy-walks and gets along wonderfully when paired with another canine companion. Sociable and adaptable."
    },
    {
        "name_en": "Mango", "name_th": "มะนาวบี", "zone": "Zone A", "p": 7, "idx": 10, "note": "can be walked but is very scared of other dogs",
        "gender": "female", "age": "2 ปี", "size": "medium",
        "tags": ["เดินสายจูงได้", "กลัวสุนัขอื่น", "ติดคนมาก", "ชอบอยู่เงียบๆ"],
        "th": "มะนาวบี สุนัขสาวที่เดินสายจูงได้ดี แต่กลัวสุนัขตัวอื่นมาก น้องติดคนและชอบอยู่ใกล้ชิดมนุษย์ เหมาะเป็นสัตว์เลี้ยงเดี่ยวค่ะ",
        "en": "Mango walks nicely on the lead but experiences fear around other dogs. She adores humans and is seeking a solo-pet haven."
    },
    {
        "name_en": "Chilli", "name_th": "ชิลลี่", "zone": "Zone A", "p": 7, "idx": 12, "note": "Love to go for walks but a bit too energetic",
        "gender": "male", "age": "1 ปี 8 เดือน", "size": "medium",
        "tags": ["ชอบเดินเล่นมาก", "พลังงานล้นเหลือ", "ร่าเริงสุดขีด"],
        "th": "ชิลลี่ สุนัขจอมพลังผู้ตื่นเต้นกับการเดินเล่นเป็นชีวิตจิตใจ ร่าเริงสุดขีด เหมาะกับเจ้าของที่ชอบทำกิจกรรมกลางแจ้งครับ",
        "en": "Chilli loves walks with burning passion! High on energy and joy, he is an ideal teammate for runners and active hikers."
    },
    {
        "name_en": "Roodie", "name_th": "รูนี่", "zone": "Zone A", "p": 7, "idx": 14, "note": "Like to go for walks even if a bit too energetic. Be careful with free running dogs",
        "gender": "male", "age": "3 ปี", "size": "medium",
        "tags": ["ชอบเดินเล่น", "พลังงานสูง", "กระฉับกระเฉง"],
        "th": "รูนี่ สุนัขกระฉับกระเฉงที่ชอบการออกกำลังกาย ควรเดินในสายจูงอย่างระมัดระวังเมื่อพบสุนัขจร ซื่อสัตย์และเชื่อฟังคำสั่งครับ",
        "en": "Roodie is an enthusiastic walker with great vitality. Needs mindful leash control around loose dogs, but is loyal and eager to please."
    },
    {
        "name_en": "Spirit", "name_th": "สไปร์ท", "zone": "Zone A", "p": 8, "idx": 1, "note": "N/A",
        "gender": "male", "age": "2 ปี 2 เดือน", "size": "medium",
        "tags": ["จิตใจสดใส", "วิ่งเร็ว", "สุขภาพแข็งแรง"],
        "th": "สไปร์ท น้องหมาสปิริตแรงกล้า สดใส วิ่งเร็วและคล่องตัว สุขภาพสมบูรณ์และพร้อมเป็นเพื่อนเล่นที่ดีครับ",
        "en": "Spirit embodies pure energy and optimism. Fast on his feet, healthy, and always ready for backyard games."
    },
    {
        "name_en": "Fortunella", "name_th": "ฟอร์จูน", "zone": "Zone A", "p": 8, "idx": 2, "note": "N/A",
        "gender": "female", "age": "2 ปี", "size": "medium",
        "tags": ["นำโชคลาภ", "ยิ้มแย้ม", "ทำหมันแล้ว"],
        "th": "ฟอร์จูน สุนัขสาวผู้มีรอยยิ้มมอบโชค นิสัยเป็นมิตร ไม่ดื้อ ทำหมันแล้ว และรอคอยบ้านที่อบอุ่นค่ะ",
        "en": "Fortunella brings a lucky charm and bright smile wherever she goes. Friendly, neutered, and affectionate."
    },
    {
        "name_en": "Diesel", "name_th": "ดีเซล", "zone": "Zone A", "p": 8, "idx": 5, "note": "N/A",
        "gender": "male", "age": "3 ปี", "size": "large",
        "tags": ["พลังงานจัดเต็ม", "ซื่อสัตย์", "เฝ้าบ้านเก่ง"],
        "th": "ดีเซล สุนัขพันธุ์ใหญ่ทรงพลัง แข็งแรง ซื่อสัตย์ ปกป้องดูแลครอบครัวได้อย่างดีเยี่ยมครับ",
        "en": "Diesel is strong, muscular, and fiercely loyal. Excellent watchdog instincts balanced with affection for his family."
    },
    {
        "name_en": "Louise", "name_th": "หลุยส์", "zone": "Zone A", "p": 8, "idx": 7, "note": "Can't be walked. Shy but interested",
        "gender": "female", "age": "2 ปี 8 เดือน", "size": "medium",
        "tags": ["ขี้อายแต่สนใจคน", "ต้องการความอดทน", "แววตามีประกาย"],
        "th": "หลุยส์ น้องหมาที่ยังไม่พร้อมเดินสายจูงแต่ชอบแอบมองด้วยความสนใจ ต้องการความอดทนและการสร้างสายสัมพันธ์อย่างนุ่มนวลค่ะ",
        "en": "Louise cannot be walked yet; she is timid but shows genuine curiosity toward humans. Ready to bloom with kind patience."
    },
    {
        "name_en": "Lam", "name_th": "แลม", "zone": "Zone A", "p": 9, "idx": 14, "note": "Wheelies approved",
        "gender": "male", "age": "3 ปี 5 เดือน", "size": "medium",
        "tags": ["ใช้รถเข็นสำหรับสุนัข (Wheelchair)", "หัวใจนักสู้", "ร่าเริงวิ่งเร็ว", "สร้างแรงบันดาลใจ"],
        "th": "แลม สุนัขนักสู้ผู้ได้รับการรับรองให้ใช้รถเข็นสุนัข (Wheelchair) วิ่งเล่นได้อย่างสนุกสนานและไม่เคยยอมแพ้ต่อข้อจำกัดทางกาย ร่าเริงและเป็นแรงบันดาลใจให้ทุกคนครับ",
        "en": "Lam is an unstoppable, inspiring dog who zooms around with joy in his canine wheelchair! Cheerful, fast, and resilient, Lam proves love knows no limits."
    },
    {
        "name_en": "Cleopatra", "name_th": "คลีโอ", "zone": "Zone A", "p": 9, "idx": 12, "note": "N/A",
        "gender": "female", "age": "2 ปี 4 เดือน", "size": "medium",
        "tags": ["สวยสง่า", "ฉลาดแสนรู้", "ชอบอยู่ใกล้เจ้าของ"],
        "th": "คลีโอ สุนัขสาวงามสง่า ฉลาดหลักแหลม ชอบอยู่เคียงข้างและคอยดูแลความปลอดภัยให้เจ้าของค่ะ",
        "en": "Cleopatra combines elegance with acute canine intelligence. Loyal, devoted, and a lovely shadow to her human."
    },
    {
        "name_en": "Mochi", "name_th": "โมจิ", "zone": "Zone A", "p": 9, "idx": 15, "note": "N/A",
        "gender": "female", "age": "1 ปี 6 เดือน", "size": "small",
        "tags": ["น่ารักนุ่มนิ่ม", "ขี้อ้อน", "ขี้เล่น"],
        "th": "โมจิ น้องหมาตัวเล็กน่ารัก นุ่มนิ่มเหมือนขนมโมจิ ขี้อ้อน ชอบคลอเคลียและเล่นกับคนรอบข้างค่ะ",
        "en": "Mochi is as sweet and soft as her confectionery namesake. Petite, cuddly, and forever affectionate."
    },
    {
        "name_en": "Leo", "name_th": "ลีโอ", "zone": "Zone A", "p": 10, "idx": 7, "note": "N/A",
        "gender": "male", "age": "2 ปี 9 เดือน", "size": "large",
        "tags": ["สง่าผ่าเผย", "ใจดีเหมือนพี่ใหญ่", "ทำหมันแล้ว"],
        "th": "ลีโอ พี่ใหญ่มาดสุขุม สง่างาม ใจดี ไม่ก้าวร้าว ทำหมันเรียบร้อยและพร้อมเป็นเสาหลักที่อบอุ่นของบ้านครับ",
        "en": "Leo is a calm, big-hearted gentleman who carries himself with gentle dignity. Neutered and wonderful with people."
    },
    {
        "name_en": "Rocky", "name_th": "ร็อคกี้", "zone": "Zone A", "p": 11, "idx": 4, "note": "N/A",
        "gender": "male", "age": "3 ปี", "size": "large",
        "tags": ["แข็งแรงกำยำ", "จิตใจอ่อนโยน", "ชอบวิ่งกลางแจ้ง"],
        "th": "ร็อคกี้ สุนัขกำยำแข็งแกร่งดั่งหินผา แต่มีหัวใจที่อ่อนโยน ชอบวิ่งเล่นกลางแจ้งและซื่อสัตย์ต่อครอบครัวครับ",
        "en": "Rocky has the sturdy frame of a rock and a heart of pure gold. Enthusiastic outdoors, gentle indoors."
    },

    # Zone B
    {
        "name_en": "Aspen", "name_th": "แอสเพน", "zone": "Zone B", "p": 12, "idx": 1, "note": "N/A",
        "gender": "female", "age": "2 ปี", "size": "medium",
        "tags": ["สวยสง่า", "รักธรรมชาติ", "ฉีดวัคซีนแล้ว"],
        "th": "แอสเพน สุนัขสาวสวยจาก Zone B รักธรรมชาติ สุขภาพแข็งแรง ฉีดวัคซีนครบถ้วนและพร้อมร่วมผจญภัยค่ะ",
        "en": "Aspen is a graceful female dog who loves fresh air and nature. Fully vaccinated and eager for outdoor adventures."
    },
    {
        "name_en": "Chips", "name_th": "ชิปส์", "zone": "Zone B", "p": 12, "idx": 2, "note": "N/A",
        "gender": "male", "age": "1 ปี 7 เดือน", "size": "medium",
        "tags": ["ชอบเล่นลูกบอล", "กินเก่ง", "ร่าเริง"],
        "th": "ชิปส์ หนุ่มน้อยจอมทะเล้น ชอบเล่นลูกบอลและวิ่งเก็บของ กินเก่ง อารมณ์ดีและเข้ากับทุกคนได้ง่ายครับ",
        "en": "Chips is a playful ball of joy who loves fetch and treats. High spirits and a friendly tail-wag for everyone."
    },
    {
        "name_en": "Shadow", "name_th": "แชโดว์", "zone": "Zone B", "p": 12, "idx": 10, "note": "N/A",
        "gender": "male", "age": "3 ปี 2 เดือน", "size": "large",
        "tags": ["สีดำขลับ", "เดินตามเป็นเงา", "ซื่อสัตย์มาก"],
        "th": "แชโดว์ สุนัขสีดำเงางาม ชอบเดินตามเจ้าของดั่งเงาตามตัว ซื่อสัตย์ ปกป้องและมอบความรักให้เต็มร้อยครับ",
        "en": "Shadow is a sleek black dog who faithfully walks by your side like a gentle shadow. Unshakably loyal."
    },
    {
        "name_en": "Chokdee", "name_th": "ช็อกดี", "zone": "Zone B", "p": 12, "idx": 15, "note": "Needs leash training",
        "gender": "male", "age": "2 ปี", "size": "medium",
        "tags": ["กำลังฝึกสายจูง", "ชื่อมงคลโชคดี", "ใจดีมีเสน่ห์"],
        "th": "ช็อกดี สุนัขชื่อมงคลผู้ใจดี กำลังอยู่ในช่วงฝึกการเดินสายจูง กระตือรือร้นและพร้อมนำโชคดีมาให้เจ้าของครับ",
        "en": "Chokdee ('Good Luck') is currently undergoing leash training. Friendly, enthusiastic, and full of positive vibes."
    },
    {
        "name_en": "Muppet", "name_th": "มัพเพ็ท", "zone": "Zone B", "p": 12, "idx": 16, "note": "Can be walked but gently",
        "gender": "female", "age": "3 ปี", "size": "medium",
        "tags": ["เดินสายจูงอย่างนุ่มนวล", "อ่อนหวาน", "ชอบให้กอด"],
        "th": "มัพเพ็ท น้องหมาสาวแสนอ่อนหวาน เดินสายจูงได้อย่างนุ่มนวล ชอบให้กอดและลูบตัว เหมาะกับบ้านที่รักความสงบค่ะ",
        "en": "Muppet walks nicely with gentle leash guidance. Soft, loving, and adores comforting hugs and gentle words."
    },
    {
        "name_en": "Archie", "name_th": "อาร์ชี", "zone": "Zone B", "p": 13, "idx": 4, "note": "N/A",
        "gender": "male", "age": "2 ปี 1 เดือน", "size": "medium",
        "tags": ["ขี้อ้อน", "ชอบเล่นน้ำ", "เป็นมิตรกับทุกคน"],
        "th": "อาร์ชี สุนัขหนุ่มอารมณ์ดี ชอบเล่นน้ำและวิ่งเล่น เป็นมิตรกับทุกคนในมูลนิธิ สุขภาพแข็งแรงมากครับ",
        "en": "Archie is an outgoing, water-loving pal who greets every friend with a joyful wag. Robust and friendly."
    },
    {
        "name_en": "Bolt", "name_th": "โบลต์", "zone": "Zone B", "p": 14, "idx": 6, "note": "N/A",
        "gender": "male", "age": "2 ปี", "size": "medium",
        "tags": ["ว่องไวสายฟ้า", "หูตั้งน่ารัก", "ชอบวิ่งเล่น"],
        "th": "โบลต์ น้องหมาหูตั้งว่องไว รวดเร็ว ฉลาด และชอบวิ่งเล่นในทุ่งหญ้า พร้อมเป็นคู่หูที่กระฉับกระเฉงครับ",
        "en": "Bolt has alert perky ears and lightning agility. Smart, quick to respond, and loves outdoor sprints."
    },
    {
        "name_en": "Rocco", "name_th": "ร็อคโค่", "zone": "Zone B", "p": 16, "idx": 11, "note": "Can be walked",
        "gender": "male", "age": "2 ปี 8 เดือน", "size": "medium",
        "tags": ["เดินสายจูงได้ดี", "กระตือรือร้น", "ทำหมันแล้ว"],
        "th": "ร็อคโค่ สุนัขหนุ่มที่เดินสายจูงได้ดีมาก กระตือรือร้นและเชื่อฟังคำสั่ง ทำหมันแล้วและพร้อมย้ายเข้าสู่บ้านใหม่ครับ",
        "en": "Rocco is an obedient, capable leash walker. Enthusiastic yet attentive, he is neutered and adoption-ready."
    },
    {
        "name_en": "Summer", "name_th": "ฤดูร้อน", "zone": "Zone B", "p": 16, "idx": 12, "note": "N/A",
        "gender": "female", "age": "1 ปี 9 เดือน", "size": "medium",
        "tags": ["สดใสเหมือนแสงแดด", "รอยยิ้มน่ารัก", "เข้ากับคนง่าย"],
        "th": "ฤดูร้อน สุนัขสาวผู้มีรอยยิ้มอบอุ่นดั่งแสงแดดยามเช้า ร่าเริง อ่อนโยน และทำให้ทุกคนรอบข้างมีความสุขค่ะ",
        "en": "Summer warms every heart like morning sunshine. Gentle, friendly, and wonderfully responsive to human love."
    },
    {
        "name_en": "Harry", "name_th": "แฮร์รี่", "zone": "Zone B", "p": 17, "idx": 3, "note": "Can be walked. but build trust first",
        "gender": "male", "age": "3 ปี", "size": "large",
        "tags": ["เดินสายจูงได้", "ต้องการสร้างความไว้ใจก่อน", "ซื่อสัตย์ภักดี"],
        "th": "แฮร์รี่ สุนัขตัวโตผู้ต้องการเวลาสร้างความไว้ใจก่อนเดินสายจูง เมื่อสนิทแล้วจะเป็นสุนัขที่ซื่อสัตย์ภักดีและเชื่อฟังมากครับ",
        "en": "Harry walks reliably on lead once trust is established. A loyal guardian who rewards patience with steadfast devotion."
    },
    {
        "name_en": "Simba", "name_th": "ซิมบ้า", "zone": "Zone B", "p": 18, "idx": 14, "note": "N/A",
        "gender": "male", "age": "2 ปี 4 เดือน", "size": "large",
        "tags": ["สง่างามราชา", "กล้าหาญ", "รักสงบ"],
        "th": "ซิมบ้า หนุ่มใหญ่ร่างสง่า สงบนิ่ง กล้าหาญ และมีแววตาที่เปี่ยมด้วยความเมตตา พร้อมเป็นผู้พิทักษ์ของบ้านครับ",
        "en": "Simba possesses a regal bearing and an even, courageous spirit. Protective yet peaceful in the home."
    },
    {
        "name_en": "Pongo", "name_th": "ปองโก้", "zone": "Zone B", "p": 19, "idx": 7, "note": "Can be walked",
        "gender": "male", "age": "2 ปี 5 เดือน", "size": "medium",
        "tags": ["เดินสายจูงได้ดีเยี่ยม", "ฉลาดแสนรู้", "พร้อมเป็นเพื่อนแท้"],
        "th": "ปองโก้ สุนัขแสนรู้ เดินสายจูงได้ดีเยี่ยม เข้ากับคนได้ง่ายและพร้อมเป็นเพื่อนแท้ของทุกครอบครัวครับ",
        "en": "Pongo is a stellar leash walker with keen intelligence. Highly social, friendly, and truly a devoted best friend."
    },
    {
        "name_en": "Fudge", "name_th": "ฟัดจ์", "zone": "Zone B", "p": 21, "idx": 3, "note": "Can be walked, high energy",
        "gender": "male", "age": "1 ปี 6 เดือน", "size": "medium",
        "tags": ["เดินสายจูงได้", "พลังงานสูงมาก", "กระฉับกระเฉง", "ชอบผจญภัย"],
        "th": "ฟัดจ์ สุนัขหนุ่มไฟแรง เดินสายจูงได้และมีพลังงานสูง ชอบการผจญภัยและวิ่งเล่น เหมาะกับครอบครัวสายกิจกรรมครับ",
        "en": "Fudge is an energetic explorer who loves brisk walks and vigorous play. An ideal match for active, outdoor lifestyles."
    },
    {
        "name_en": "Penda", "name_th": "เพนดา", "zone": "Zone B", "p": 21, "idx": 4, "note": "Can be walked, energetic",
        "gender": "female", "age": "2 ปี", "size": "medium",
        "tags": ["เดินสายจูงได้", "มีพลังและคล่องแคล่ว", "เข้ากับคนง่าย"],
        "th": "เพนดา สุนัขสาวคล่องแคล่วว่องไว เดินสายจูงได้ดี มีพลังงานพอเหมาะและเข้ากับคนง่าย พร้อมเริ่มต้นชีวิตใหม่ค่ะ",
        "en": "Penda is agile, bright, and walks nicely on lead with healthy energy. Friendly and ready for a fresh start."
    }
]

foundation_id = "e5755b6f-2fbd-4b0a-8e73-1186251d269a"
shelter_name = "มูลนิธิ Saved Souls Foundation"

dataset = []

# Process cats
for c in cats:
    story = f"ไทย:\n{c['th']}\n\nEnglish:\n{c['en']}"
    desc = f"{c['name_th']} ({c['name_en']}) • {c['th'][:60]}... • {c['en'][:60]}..."
    item = {
        "id": str(uuid.uuid4()),
        "foundation_id": foundation_id,
        "name": f"{c['name_th']} ({c['name_en']})",
        "type": "cat",
        "age": c["age"],
        "gender": c["gender"],
        "size": c["size"],
        "shelter": shelter_name,
        "distance": "5.0 กม.",
        "latitude": 12.9276,
        "longitude": 100.9238,
        "images": [f"/animals/cat_p{c['p']}_{c['idx']}.jpeg"],
        "tags": c["tags"],
        "story": story,
        "description": desc,
        "status": "available"
    }
    dataset.append(item)

# Process dogs
for d in dogs:
    story = f"ไทย:\n{d['th']}\n\nEnglish:\n{d['en']}"
    desc = f"{d['name_th']} ({d['name_en']}) • {d['th'][:60]}... • {d['en'][:60]}..."
    item = {
        "id": str(uuid.uuid4()),
        "foundation_id": foundation_id,
        "name": f"{d['name_th']} ({d['name_en']})",
        "type": "dog",
        "age": d["age"],
        "gender": d["gender"],
        "size": d["size"],
        "shelter": shelter_name,
        "distance": "5.0 กม.",
        "latitude": 12.9276,
        "longitude": 100.9238,
        "images": [f"/animals/dog_p{d['p']}_{d['idx']}.jpeg"],
        "tags": d["tags"],
        "story": story,
        "description": desc,
        "status": "available"
    }
    dataset.append(item)

print(f"Total compiled animals: {len(dataset)} ({len(cats)} cats, {len(dogs)} dogs)")

with open("d:/HaBan/scripts/generated_animals.json", "w", encoding="utf-8") as f:
    json.dump(dataset, f, ensure_ascii=False, indent=2)

print("Saved to d:/HaBan/scripts/generated_animals.json successfully!")
