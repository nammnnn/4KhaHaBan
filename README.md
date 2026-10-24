# 4 ขาหาบ้าน (4KhaHaBan)

แอปหาบ้านให้หมาแมวจรจัดในประเทศไทย — ปัดการ์ดดูน้อง ส่งคำขอรับเลี้ยง คุยกับมูลนิธิ บริจาค และแจ้งเหตุ
พร้อมเครื่องมือสำหรับมูลนิธิและแอดมิน

**เว็บจริง:** https://4khahaban.vercel.app

| เอกสาร | เนื้อหา |
|---|---|
| [`PRODUCT.md`](PRODUCT.md) | ผู้ใช้ ฟีเจอร์ หลักการของผลิตภัณฑ์ |
| [`DESIGN.md`](DESIGN.md) | ระบบการออกแบบ: สี ตัวอักษร component และกฎของแต่ละหน้า |
| [`supabase/templates/README.md`](supabase/templates/README.md) | เทมเพลตอีเมลของ Supabase Auth |

## Tech stack

- **React 18 + Vite 5**, react-router-dom 6, framer-motion, lucide-react
- **CSS:** token และ component กลางใน `src/index.css` + CSS ของแต่ละหน้า (Tailwind v4 ใช้เป็นฐาน/reset)
- **Supabase:** Auth (อีเมล + Google), Postgres พร้อม RLS, Storage (รูปน้อง เอกสารมูลนิธิ สลิป), Realtime (แชท)
- **แผนที่:** Leaflet + OpenStreetMap · **QR:** promptpay-qr + qrcode.react
- **Deploy:** Vercel จาก branch `main` (มี preview ให้ทุก branch)

## เริ่มต้นใช้งาน

ต้องมี Node.js 18 ขึ้นไป

```bash
npm install
cp .env.example .env   # แล้วใส่ค่าของโปรเจกต์ Supabase
npm run dev            # http://localhost:5173
```

### Environment variables

| ตัวแปร | จำเป็น | ความหมาย |
|---|---|---|
| `VITE_SUPABASE_URL` | ✓ | URL ของโปรเจกต์ Supabase |
| `VITE_SUPABASE_ANON_KEY` | ✓ | anon / publishable key (ใช้ฝั่งเบราว์เซอร์ได้ ความปลอดภัยอยู่ที่ RLS) |
| `VITE_EMAIL_CONFIRMATION` | | ใส่ `true` เมื่อตั้ง SMTP แล้ว — เปิดการยืนยันอีเมลและ "ลืมรหัสผ่าน" |

> **ห้ามใส่ service-role key ในแอปหรือ commit ลง git** — key นี้ข้าม RLS ทั้งหมด ใช้เฉพาะสคริปต์ที่รันจากเครื่องผู้ดูแล

บน Vercel ให้ตั้งตัวแปรเดียวกันใน Project → Settings → Environment Variables

## คำสั่ง

| คำสั่ง | ทำอะไร |
|---|---|
| `npm run dev` | dev server |
| `npm run build` | build ไปที่ `dist/` |
| `npm run preview` | เปิดดู build |
| `npm run check:i18n` | ตรวจว่าคีย์ไทย/อังกฤษครบ ตรงกัน และทุกคีย์ที่ใช้มีอยู่จริง |

## โครงสร้าง

```
src/
  App.jsx               เส้นทาง (route) ทั้งหมด + ตัวกันสิทธิ์ (RoleEnforcer)
  pages/                หน้าผู้ใช้, foundation/*, admin/
  components/
    ui/                 Button, Dialog, EmptyState, LoadError, Toast ฯลฯ
    motion/             PawMotion (อุ้งเท้า), PetScene (หมากับแมว)
    foundation/ chat/ profile/
    Skeletons.jsx       โครงหน้าโหลด + AppSplash
    ErrorScreens.jsx    ErrorBoundary, NotFound, SuspendedScreen
  context/              AuthContext (ผู้ใช้/บทบาท), AppContext (แมตช์ แชท)
  services/api.js       การเรียก Supabase ส่วนใหญ่
  i18n/                 th.js, en.js, foundation.js (แถว [key, ไทย, English])
  lib/                  tags, geo, phone, image, motion ฯลฯ
supabase/
  migrations/           schema + RLS + trigger ทั้งหมด เรียงตามเลข
  templates/            เทมเพลตอีเมล
scripts/
  check-i18n.mjs        ใช้โดย npm run check:i18n
  migrate-tags.mjs      แปลงแท็กเก่าเป็นแท็กมาตรฐาน (ใช้ service-role key, รันจากเครื่องตัวเอง)
```

## ฐานข้อมูล

- ทุกการเปลี่ยน schema เป็นไฟล์ใหม่ใน `supabase/migrations/` (เลขถัดไป เช่น `032_...sql`) — ห้ามแก้ไฟล์ที่รันไปแล้ว
- รันใน Supabase Dashboard → SQL Editor ตามลำดับเลข
- กฎสำคัญอยู่ในฐานข้อมูล ไม่ใช่แค่ UI:
  - RLS ทุกตาราง
  - ผู้ใช้เปลี่ยนบทบาท (`role`) หรือสถานะระงับ (`is_banned`) ของตัวเองไม่ได้ และมูลนิธิอนุมัติตัวเองไม่ได้
  - ผู้ใช้ที่ถูกระงับเขียนตารางหลักไม่ได้ (migration 029)
  - การเปลี่ยนเลขพร้อมเพย์ถูกบันทึกให้แอดมินตรวจ (migration 030)
- ตั้งแอดมินคนแรก: ใน SQL Editor รัน `update public.profiles set role = 'super_admin' where email = '<อีเมล>';`

## สองภาษา

ข้อความบนจอทุกข้อความผ่าน `t('key')` จาก `useI18n()` — เพิ่มคีย์ทั้งไทยและอังกฤษ แล้วรัน `npm run check:i18n` ก่อน commit (รายละเอียด `DESIGN.md` §8.1)
