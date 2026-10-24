// Health-update answers (AdoptionFollowup.jsx). Values are saved in Thai on adoption_followups,
// so the Thai text stays the stored value; the screens show it through these labels.
export const FOLLOWUP_GROUPS = {
  health: [
    ['แข็งแรงดี', 'Healthy'],
    ['ป่วยเล็กน้อย/กำลังรักษา', 'A little unwell / being treated'],
    ['ต้องพบสัตวแพทย์', 'Needs a vet'],
  ],
  vaccine: [
    ['ครบแล้ว', 'Up to date'],
    ['รอตามนัดเข็มถัดไป', 'Next shot booked'],
    ['ยังไม่ได้รับ', 'Not yet'],
  ],
  neutered: [
    ['แล้ว', 'Done'],
    ['ยังไม่ถึงเกณฑ์วัย', 'Too young yet'],
    ['ยังไม่ได้ทำ', 'Not yet'],
  ],
  food: [
    ['กินอาหารเม็ด + อาหารเปียก', 'Dry + wet food'],
    ['กินอาหารเม็ดอย่างเดียว', 'Dry food only'],
    ['ปรุงเอง/บาร์ฟ', 'Home-cooked / raw'],
    ['กินได้ปกติ', 'Eating normally'],
  ],
  behavior: [
    ['ปรับตัวได้ดี ร่าเริง', 'Settled in, cheerful'],
    ['ขี้อ้อน คุ้นเคยแล้ว', 'Affectionate, at home now'],
    ['ยังตื่นกลัวเล็กน้อย', 'Still a little nervous'],
    ['ต้องปรับพฤติกรรม', 'Needs some training'],
  ],
};

/** Stored Thai value -> text in the current language (unknown values are shown as saved). */
export function followupLabel(group, value, lang) {
  if (!value) return null;
  if (lang !== 'en') return value;
  const hit = (FOLLOWUP_GROUPS[group] || []).find(([th]) => th === value);
  return hit ? hit[1] : value;
}

/** "ครั้งที่ 2 (ครบ 4 เดือน)" / "Update 2 (4 months)" */
export function milestoneText(index, t) {
  const n = index || 1;
  return t('fu.milestone', { n, m: n * 2 });
}

export function formatDate(dateStr, lang, month = 'short') {
  if (!dateStr) return '-';
  try {
    return new Date(dateStr).toLocaleDateString(lang === 'en' ? 'en-GB' : 'th-TH', { year: 'numeric', month, day: 'numeric' });
  } catch {
    return dateStr;
  }
}
