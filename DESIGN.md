---
name: "4 ขาหาบ้าน (4KhaHaBan)"
description: "แอปพลิเคชันช่วยเหลือสุนัขและแมวจรจัดเพื่อหาบ้านใหม่และสนับสนุนการกุศล (Human-Crafted Production Design System)"
colors:
  primary: "#D97706"
  primary-hover: "#B45309"
  primary-light: "#FDE68A"
  primary-lightest: "#FEF3C7"
  primary-ring: "rgba(217, 119, 6, 0.15)"
  secondary: "#059669"
  secondary-hover: "#047857"
  secondary-light: "#A7F3D0"
  secondary-lightest: "#ECFDF5"
  background: "#FAF8F5"
  surface: "#FFFFFF"
  surface-hover: "#F9FAFB"
  surface-subtle: "#F9FAFB"
  border: "#E5E7EB"
  border-input: "#D1D5DB"
  text-dark: "#111827"
  text-medium: "#374151"
  text-light: "#6B7280"
  text-muted: "#9CA3AF"
  danger: "#DC2626"
  danger-hover: "#B91C1C"
  danger-light: "#FEF2F2"
  success: "#059669"
  success-light: "#ECFDF5"
  info: "#2563EB"
  info-light: "#EFF6FF"
  gray-50: "#FAF8F5"
  gray-100: "#F3F4F6"
  gray-200: "#E5E7EB"
  gray-300: "#D1D5DB"
  gray-400: "#9CA3AF"
  gray-500: "#6B7280"
  gray-700: "#374151"
  gray-900: "#111827"
typography:
  display:
    fontFamily: "Prompt, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif"
    fontSize: "1.65rem"
    fontWeight: 700
    lineHeight: 1.3
    letterSpacing: "-0.02em"
  headline:
    fontFamily: "Prompt, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif"
    fontSize: "1.15rem"
    fontWeight: 600
    lineHeight: 1.4
  body:
    fontFamily: "Prompt, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif"
    fontSize: "0.95rem"
    fontWeight: 400
    lineHeight: 1.6
  label:
    fontFamily: "Prompt, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif"
    fontSize: "0.875rem"
    fontWeight: 500
    lineHeight: 1.3
  caption:
    fontFamily: "Prompt, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif"
    fontSize: "0.75rem"
    fontWeight: 400
    lineHeight: 1.3
rounded:
  sm: "6px"
  md: "8px"
  lg: "12px"
  xl: "16px"
  full: "9999px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "16px"
  lg: "24px"
  xl: "32px"
components:
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "#FFFFFF"
    rounded: "{rounded.md}"
    height: "42px"
    padding: "0 20px"
    fontWeight: 600
    fontSize: "0.875rem"
    boxShadow: "0 1px 2px rgba(0,0,0,0.05)"
  button-primary-hover:
    backgroundColor: "{colors.primary-hover}"
  button-secondary:
    backgroundColor: "{colors.surface}"
    borderColor: "{colors.border-input}"
    textColor: "{colors.text-medium}"
    rounded: "{rounded.md}"
    height: "42px"
    padding: "0 18px"
    fontWeight: 500
    fontSize: "0.875rem"
  input-field:
    backgroundColor: "{colors.surface}"
    borderColor: "{colors.border-input}"
    focusBorderColor: "{colors.primary}"
    focusRing: "{colors.primary-ring}"
    textColor: "{colors.text-dark}"
    rounded: "{rounded.md}"
    height: "44px"
    padding: "0 14px"
    fontSize: "0.95rem"
  card-container:
    backgroundColor: "{colors.surface}"
    borderColor: "{colors.border}"
    rounded: "{rounded.xl}"
    padding: "24px"
    boxShadow: "0 1px 3px rgba(0,0,0,0.03)"
---

# Design System: 4 ขาหาบ้าน (4KhaHaBan) — Production Standard

## 1. Overview

**Creative North Star: "Human-Crafted Animal Haven"**

ระบบการออกแบบของ **4 ขาหาบ้าน** มุ่งเน้นการสร้างเว็บแอปพลิเคชันที่ให้ความรู้สึก **อบอุ่น น่าเชื่อถือ เป็นมืออาชีพ และเรียบหรูแบบระบบงานจริง (Production-Grade)** โดยหลีกเลี่ยงงานดีไซน์แบบ AI Cliché หรือ AI Slop (เช่น การใช้แสงฟุ้งนีออน แบ็คกราวด์เกรเดียนท์จุดสีลอยฟุ้ง เงาสีส้มจัดจ้าน หรือการใส่ไอคอนอีโมจิฟุ่มเฟือยในหัวข้อและฟอร์ม)

การออกแบบยึดหลัก **Clean Neutral Contrast**: ใช้พื้นหลังสีขาวนวลอบอุ่น (`#FAF8F5`) ตัดกับพื้นผิวการ์ดสีขาวบริสุทธิ์ (`#FFFFFF`) ที่มีเส้นขอบบางคมชัด (`1px #E5E7EB` / `#D1D5DB`) เพื่อสร้างระเบียบสายตาและทำให้อ่านง่าย สบายตา เหมาะสำหรับผู้ใช้งานทุกวัย ทั้งผู้รับเลี้ยง สัตวแพทย์ เจ้าหน้าที่มูลนิธิ และผู้บริจาค

---

## 2. Color Palette & Semantics

### 2.1 Canvas & Surfaces (พื้นหลังและโครงสร้าง)
- **Canvas Background** (`#FAF8F5`): สีขาวนวลโทนอบอุ่น (Warm Alabaster) เป็นพื้นหลังหลักของทุกหน้า ปราศจากการใช้แบ็คกราวด์เกรเดียนท์ฉูดฉาด ช่วยให้การ์ดสีขาวโดดเด่นขึ้นอย่างนุ่มนวล
- **Surface Card** (`#FFFFFF`): สีขาวบริสุทธิ์สำหรับพื้นหลังของการ์ด แบบฟอร์ม เมนู และโมดอล
- **Surface Subtle / Hover** (`#F9FAFB`): สีเทาอ่อนมากสำหรับแถบหัวตาราง พื้นที่พรีวิว หรือสถานะ Hover ของปุ่มรอง
- **Border Neutral** (`#E5E7EB`): เส้นขอบ 1px มาตรฐานสำหรับกรอบการ์ด เส้นแบ่งเซกชัน และตาราง
- **Border Input** (`#D1D5DB`): เส้นขอบ 1px สำหรับช่องกรอกข้อมูล ฟอร์ม และปุ่มควบคุม

### 2.2 Brand & Accents (สีประจำแบรนด์)
- **Primary — Warm Honey Amber** (`#D97706`): สีอำพันน้ำผึ้งอบอุ่น เป็นสีเอกลักษณ์ของแบรนด์ ใช้กับปุ่ม Call to Action หลัก, สถานะ Active และจุดนำสายตาสำคัญ
- **Primary Hover** (`#B45309`): สีอำพันเข้มเมื่อเลื่อนเมาส์ชี้
- **Primary Light / Badge** (`#FEF3C7`): สีส้มอำพันอ่อนมากสำหรับแท็กไฮไลต์และพื้นหลังป้าย
- **Primary Focus Halo** (`rgba(217, 119, 6, 0.12)` - `0.15`): วงแหวนนุ่มนวลรอบช่องกรอกข้อมูลเมื่อโฟกัส (`box-shadow: 0 0 0 3px rgba(217, 119, 6, 0.12)`)

### 2.3 Functional & Semantics (สีบอกสถานะ)
- **Success / Verified — Forest Emerald** (`#059669`): สีเขียวมรกตสุขุม สำหรับป้ายยืนยันตัวตนแล้ว, สถานะกำลังหาบ้าน, ปุ่มส่งคำขอสำเร็จ และการ์ดผ่านการอนุมัติ (Hover: `#047857`, Light: `#ECFDF5`)
- **Danger / Alert — Crisp Crimson** (`#DC2626`): สีแดงคมชัด สำหรับข้อความแจ้งเตือนข้อผิดพลาด, เครื่องหมายดอกจันจำเป็น (`*`), การปฏิเสธคำขอ และปุ่มข้าม (Nope)
- **Action Nope — Coral Red** (`#EF4444` / `#DC2626`): สีปุ่ม Nope ในหน้าปัดการ์ดหาบ้าน
- **Action Like — Emerald Green** (`#059669` / `#10B981`): สีปุ่ม Like ในหน้าปัดการ์ดหาบ้าน
- **Action Super Like — Amber Gold** (`#D97706`): สีปุ่ม Super Like ในหน้าปัดการ์ดหาบ้าน

### 2.4 Neutral Typography (ลำดับสีตัวอักษร)
- **Text Highest / Titles** (`#111827` - Gray 900): หัวเรื่องหลัก ชื่อสัตว์เลี้ยง และชื่อเพจ
- **Text Medium / Labels & Body** (`#374151` - Gray 700): ข้อความเนื้อหา ป้ายระบุช่องฟอร์ม และข้อความปกติ
- **Text Secondary / Descriptions** (`#6B7280` - Gray 500): คำอธิบายเสริม ตัวเลขอ้างอิง และวันที่
- **Text Muted / Placeholders** (`#9CA3AF` - Gray 400): ตัวหนังสือตัวอย่างในช่องพิมพ์ และไอคอนที่ไม่เน้น

---

## 3. Typography & Text Hierarchy

**Font Family:** `Prompt, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`  
ฟอนต์ Prompt มีความโค้งมนและเรขาคณิตที่ลงตัวกับภาษาไทย รองรับสระบน-ล่างได้อย่างสมบูรณ์ ไม่เบียดทับซ้อน

| สไตล์ | ขนาด | น้ำหนัก (Weight) | ความสูงบรรทัด (Line Height) | การใช้งาน |
|---|---|---|---|---|
| **Display / Page Title** | `1.65rem` (26px) | 700 (Bold) | 1.3 | ชื่อหน้าหลัก เช่น "ลงทะเบียนมูลนิธิ", "แดชบอร์ดมูลนิธิ" |
| **Section Title** | `1.15rem`–`1.25rem` | 600 (SemiBold) | 1.4 | หัวข้อกลุ่มข้อมูล หัวข้อการ์ด หรือชื่อสัตว์เลี้ยง |
| **Body Large** | `1.00rem` (16px) | 400 (Regular) | 1.6 | เนื้อหาบทความ เรื่องราวชีวประวัติสัตว์เลี้ยง |
| **Body Regular** | `0.95rem` (15px) | 400 (Regular) | 1.55 | ข้อความทั่วไปในระบบ คำอธิบายสเต็ป |
| **Form Label** | `0.875rem` (14px) | 500 (Medium) | 1.3 | ป้ายกำกับช่องกรอกข้อมูล (`#374151`) |
| **Caption / Helper** | `0.75rem`–`0.82rem` | 400 (Regular) | 1.4 | คำแนะนำการกรอก (Helper text), สถิติย่อย |

---

## 4. Elevation, Borders & Layout Tokens

### 4.1 Border Strategy (เน้นโครงสร้างเส้นขอบ 1px แทนเงาฟุ้ง)
- องค์ประกอบเกือบทั้งหมดใช้เส้นขอบคมชัดขนาด **1px** (`#E5E7EB` สำหรับการ์ด, `#D1D5DB` สำหรับฟอร์ม)
- หลีกเลี่ยงการใช้เส้นขอบหนาเกิน 1px ยกเว้นสถานะ Active ของแท็บที่ใช้ขอบล่าง 2px

### 4.2 Shadows (เงาระดับไมโครที่แนบเนียน)
- **Subtle Elevation (`shadow-sm`):** `box-shadow: 0 1px 3px rgba(0,0,0,0.03);` สำหรับการ์ดคอนเทนเนอร์หลัก
- **Button Ambient:** `box-shadow: 0 1px 2px rgba(0,0,0,0.05);` สำหรับปุ่มกด
- **Floating Modal / Dropdown:** `box-shadow: 0 10px 25px -5px rgba(0,0,0,0.08), 0 8px 10px -6px rgba(0,0,0,0.04);`
- **ห้ามเด็ดขาด:** ห้ามใช้เงาสีส้มฟุ้งเรืองแสงสไตล์นีออน (`box-shadow: 0 8px 24px rgba(249,168,38,0.35)`)

### 4.3 Corner Radii (ความโค้งมนที่พอดี)
- **`8px` (`rounded-md`):** ช่องอินพุต ฟอร์ม ปุ่มกด แถบไฟล์อัปโหลด แท็กสถานะ
- **`12px` (`rounded-lg`):** กล่องรีวิวข้อมูล กรอบข้อความแชท
- **`16px` (`rounded-xl`):** การ์ดคอนเทนเนอร์หลัก กรอบสเต็ปเปอร์ โมดอล
- **`9999px` (`rounded-full`):** รูปโปรไฟล์กลม ป้าย Badge นับจำนวน ปุ่มวงกลมในหน้า Swipe Feed

---

## 5. Component Specifications (มาตรฐานชิ้นส่วน UI)

### 5.1 Form Inputs & Controls
- **ความสูงมาตรฐาน:** `42px`–`44px` (Ergonomic Touch Target)
- **พื้นหลัง:** `#FFFFFF` สีขาวเรียบ
- **เส้นขอบ:** `1px solid #D1D5DB`
- **โฟกัส (Focus):** เส้นขอบเปลี่ยนเป็น `#D97706` พร้อมเงารัศมี `0 0 0 3px rgba(217, 119, 6, 0.12)`
- **Auto-Formatting:**
  - ช่องเบอร์โทรศัพท์: จัดรูปแบบขีดอัตโนมัติ (`081-xxx-xxxx` หรือ `02-xxx-xxxx`) โดยผู้ใช้พิมพ์เพียงตัวเลข
  - ช่องบัตรประชาชน: จัดรูปแบบ `x-xxxx-xxxxx-xx-x` อัตโนมัติ

### 5.2 Buttons
- **Primary CTA:**
  - พื้นหลัง `#D97706` (Hover: `#B45309`), ตัวอักษรสีขาว `#FFFFFF`, ความสูง `42px`–`44px`, ความโค้งมน `8px`, Font Weight `600`
- **Secondary / Outline:**
  - พื้นหลัง `#FFFFFF` (Hover: `#F9FAFB`), ขอบ `1px solid #D1D5DB`, ตัวอักษร `#374151`, ความสูง `42px`, ความโค้งมน `8px`
- **Success / Submit:**
  - พื้นหลัง `#059669` (Hover: `#047857`), ตัวอักษรสีขาว `#FFFFFF`, ความสูง `42px`, ความโค้งมน `8px`
- **Ghost / Link:**
  - พื้นหลังโปร่งใส ตัวอักษร `#D97706` หรือ `#6B7280`

### 5.3 Stepper & Progress Indicators
- **Minimal Linear Stepper:** แสดงกล่องสเต็ปแนวนอนในการ์ดขาว
  - หมายเลขสเต็ป: กล่องขนาด `32px x 32px`, มุมโค้ง `8px`
  - สเต็ปที่ผ่านแล้ว: สีเขียว `#059669` พร้อมไอคอน `<CheckCircle2 size={18} />`
  - สเต็ปปัจจุบัน: สีส้มอำพัน `#D97706`
  - สเต็ปถัดไป: สีเทาอ่อน `#F3F4F6` ตัวเลข `#6B7280`
  - หัวข้อสเต็ป: `0.85rem`, Weight `600` สำหรับสเต็ปปัจจุบัน

### 5.4 File Upload & Media Preview
- **Clean File Card Layout:** ไม่ใช้กล่องเส้นประขนาดใหญ่เทอะทะ
- แสดงแถบแนบไฟล์กะทัดรัด พร้อมไอคอนประเภทไฟล์ (`<FileText />`), ชื่อไฟล์, ขนาดไฟล์ (MB) และปุ่มกากบาท `<X />` สีเทาเพื่อลบ
- สถานะยังไม่ได้เลือก: ปุ่มกดแบบเรียบหรู `<Upload /> เลือกไฟล์เอกสาร` พร้อมข้อความระบุฟอร์แมตชัดเจน (PDF, JPG, PNG ไม่เกิน 5MB)

### 5.5 Swiper Feed Cards (Tinder Layout)
- การ์ดรูปถ่ายสัตว์เลี้ยงแสดงเต็มพื้นที่แบบมีสัดส่วนที่พอเหมาะ ขอบมน `16px`
- ข้อมูลชื่อและอายุสัตว์เลี้ยงแสดงด้วยตัวอักษรสีเข้มบนการ์ดขาว หรือแบบ Overlay ที่มีเกรเดียนท์มืดรองรับอย่างชัดเจน
- ปุ่มควบคุมด้านล่าง (Nope, Super Like, Like, Undo) เป็นปุ่มวงกลมขนาดพอดีมือ พร้อมไอคอนคมชัด ไม่ใช้เงาสีฟุ้งหลอกตา

---

## 6. Do's and Don'ts (กฎเหล็กห้ามละเมิด)

### Do (สิ่งที่ต้องทำ):
1. **Do** ใช้พื้นหลังสีขาวนวลอุ่น `#FAF8F5` สำหรับหน้าเว็บทั้งหมดเพื่อสร้างบรรยากาศสบายตาและสะท้อนความสะอาด
2. **Do** ใช้เส้นขอบคมชัด 1px (`#E5E7EB` / `#D1D5DB`) บนการ์ดสีขาวบริสุทธิ์เพื่อจัดระเบียบเนื้อหา
3. **Do** ออกแบบฟอร์มให้เป็น 2 คอลัมน์บนหน้าจอเดสก์ท็อปและ 1 คอลัมน์บนมือถือ พร้อมระบบ Auto-format ขีดเบอร์โทรศัพท์และเลขประจำตัว
4. **Do** ควบคุมความสูงของปุ่มและช่องกรอกข้อมูลให้อยู่ระหว่าง `42px`–`44px` ซึ่งเป็นขนาดมาตรฐานของระบบเว็บแอปพลิเคชันระดับโลก
5. **Do** เขียนข้อความบน UI และคำแนะนำภาษาไทยอย่างสุภาพ กระชับ ถูกต้องตามหลักไวยากรณ์ และเป็นมืออาชีพ

### Don't (ข้อห้ามเด็ดขาด — Anti-AI Clichés):
1. **Don't** ใช้แบ็คกราวด์เกรเดียนท์จุดสีลอยฟุ้ง (`radial-gradient(...)`) หรือลูกบอลสีเบลอฉูดฉาดด้านหลัง
2. **Don't** ใช้เงาเรืองแสงสีส้มจัดจ้าน (`box-shadow: 0 8px 24px rgba(249,168,38,0.35)`) ให้เปลี่ยนเป็นเงาบางเบา `0 1px 3px rgba(0,0,0,0.03)`
3. **Don't** ใส่อีโมจิพร่ำเพรื่อใน Label ของแบบฟอร์ม, ปุ่มกด, หรือคำแนะนำ (เช่น ห้ามใส่ `🐾`, `🐶`, `💡`, `🔒`, `🐱` ในป้ายชื่อช่องกรอก)
4. **Don't** แปะป้ายพาสเทลแคปซูลไร้ประโยชน์ไว้เหนือหัวข้อ (เช่น ป้าย "พอร์ทัลองค์กรและมูลนิธิ")
5. **Don't** ทำช่องกรอกข้อมูลหรือปุ่มที่ใหญ่เทอะทะแบบลูกกวาด (เช่น ขนาด 56px–64px ที่ดูไม่เป็นมืออาชีพ)
6. **Don't** ใช้สีนีออนสังเคราะห์ เช่น เขียวนีออนสะท้อนแสง หรือม่วงแปร๊ด ให้ใช้สีจากธรรมชาติ เช่น Warm Amber และ Forest Emerald
