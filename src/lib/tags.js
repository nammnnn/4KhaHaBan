// Standard bilingual animal tags — DESIGN.md §7.19
// Foundations pick these in the animal form; the database stores the `id` (e.g. "vaccinated").
// Older records hold free-text Thai tags: `synonyms` map the common ones onto a standard tag,
// anything else is shown as written. Custom tags may carry an English version as "ไทย||English".
// Review the list and English wording with the foundation before relying on it.

export const TAG_GROUPS = [
  { id: 'health', th: 'สุขภาพ', en: 'Health' },
  { id: 'living', th: 'การใช้ชีวิต', en: 'Living' },
  { id: 'personality', th: 'นิสัย', en: 'Personality', max: 3 },
];

export const TAGS = [
  // Health
  { id: 'neutered', group: 'health', th: 'ทำหมันแล้ว', en: 'Neutered', synonyms: ['ทำหมัน'] },
  { id: 'vaccinated', group: 'health', th: 'ฉีดวัคซีนแล้ว', en: 'Vaccinated', synonyms: ['ทำวัคซีนแล้ว', 'ฉีดวัคซีนครบ', 'วัคซีนครบ', 'ฉีดวัคซีนครบถ้วน'] },
  { id: 'healthy', group: 'health', th: 'สุขภาพดี', en: 'Healthy', synonyms: ['สุขภาพแข็งแรง', 'แข็งแรง'] },
  { id: 'visually-impaired', group: 'health', th: 'มองเห็นไม่ชัด', en: 'Visually impaired', synonyms: ['บกพร่องทางการมองเห็น', 'ตาบอด', 'มองไม่เห็น'] },
  { id: 'special-needs', group: 'health', th: 'ต้องดูแลพิเศษ', en: 'Special needs', synonyms: ['โซนดูแลพิเศษ'] },

  // Living
  { id: 'leash-trained', group: 'living', th: 'เดินสายจูงได้', en: 'Leash-trained', synonyms: ['เดินสายจูงได้ดี', 'เดินสายจูงได้ดีเยี่ยม', 'เดินสายจูงเก่ง'] },
  { id: 'litter-trained', group: 'living', th: 'ใช้กระบะทรายเป็น', en: 'Litter-trained', synonyms: ['ใช้กระบะทราย'] },
  { id: 'good-with-kids', group: 'living', th: 'เข้ากับเด็กได้', en: 'Good with kids', synonyms: ['เข้ากับเด็กได้ดี', 'รักเด็ก'] },
  { id: 'good-with-dogs', group: 'living', th: 'เข้ากับสุนัขอื่นได้', en: 'Good with dogs', synonyms: ['เข้ากับหมาตัวอื่นได้ดี', 'เข้ากับสุนัขตัวอื่นได้ดี'] },
  { id: 'good-with-cats', group: 'living', th: 'เข้ากับแมวได้', en: 'Good with cats', synonyms: ['เข้ากับแมวตัวอื่นได้ดี', 'เข้ากับแมวตัวอื่นได้'] },
  { id: 'apartment-ok', group: 'living', th: 'อยู่คอนโดได้', en: 'Apartment-friendly', synonyms: ['เลี้ยงในคอนโดได้'] },
  { id: 'needs-space', group: 'living', th: 'ต้องการพื้นที่วิ่งเล่น', en: 'Needs space to run', synonyms: ['ชอบวิ่งเล่น'] },
  { id: 'needs-patience', group: 'living', th: 'ต้องการความเข้าใจ', en: 'Needs a patient owner', synonyms: ['ต้องการความอดทน'] },

  // Personality
  { id: 'affectionate', group: 'personality', th: 'ขี้อ้อน', en: 'Affectionate', synonyms: ['ติดคน', 'ชอบคลอเคลีย', 'ชอบให้กอด'] },
  { id: 'playful', group: 'personality', th: 'ขี้เล่น', en: 'Playful', synonyms: ['ชอบเล่น', 'ซุกซน', 'ชอบเล่นของเล่น'] },
  { id: 'cheerful', group: 'personality', th: 'ร่าเริง', en: 'Cheerful', synonyms: ['อารมณ์ดี', 'น่ารักสดใส', 'ร่าเริงสดใส'] },
  { id: 'calm', group: 'personality', th: 'สงบ', en: 'Calm', synonyms: ['เรียบร้อย', 'รักสงบ', 'สุขุม', 'สงบเสงี่ยม', 'สงบนิ่ง', 'สุภาพ'] },
  { id: 'shy', group: 'personality', th: 'ขี้อาย', en: 'Shy', synonyms: ['ขี้กลัว'] },
  { id: 'friendly', group: 'personality', th: 'เป็นมิตร', en: 'Friendly', synonyms: ['เข้ากับคนง่าย', 'ใจดี', 'อบอุ่น', 'เป็นมิตรกับทุกคน'] },
  { id: 'smart', group: 'personality', th: 'ฉลาด', en: 'Smart', synonyms: ['ฉลาดแสนรู้'] },
  { id: 'energetic', group: 'personality', th: 'พลังงานสูง', en: 'Energetic', synonyms: ['ชอบออกกำลังกาย', 'กระตือรือร้น', 'มีพลัง', 'พลังงานล้นเหลือ', 'กระฉับกระเฉง', 'ว่องไว'] },
  { id: 'gentle', group: 'personality', th: 'อ่อนโยน', en: 'Gentle', synonyms: ['อ่อนหวาน', 'จิตใจอ่อนโยน'] },
  { id: 'loyal', group: 'personality', th: 'ซื่อสัตย์', en: 'Loyal' },
  { id: 'brave', group: 'personality', th: 'กล้าหาญ', en: 'Brave', synonyms: ['หัวใจนักสู้'] },
  { id: 'curious', group: 'personality', th: 'ช่างสำรวจ', en: 'Curious', synonyms: ['อยากรู้อยากเห็น', 'ชอบสำรวจ'] },
  { id: 'adaptable', group: 'personality', th: 'ปรับตัวเก่ง', en: 'Adaptable' },
  { id: 'foodie', group: 'personality', th: 'กินเก่ง', en: 'Loves food' },
];

const BY_ID = new Map(TAGS.map((t) => [t.id, t]));
const BY_TEXT = new Map();
TAGS.forEach((t) => [t.th, ...(t.synonyms || [])].forEach((s) => BY_TEXT.set(s.trim(), t)));

export const CUSTOM_SEPARATOR = '||';

/** Standard tag for a stored value (id or a known Thai wording), or null for custom text. */
export function resolveTag(raw) {
  if (!raw) return null;
  const value = String(raw).trim();
  return BY_ID.get(value) || BY_TEXT.get(value) || null;
}

/** Split a stored custom tag "ขนปุกปุย||Fluffy" into its two languages. */
export function parseCustomTag(raw) {
  const [th, en] = String(raw).split(CUSTOM_SEPARATOR);
  return { th: (th || '').trim(), en: (en || '').trim() };
}

/** Label to show for any stored tag in the given language. */
export function tagLabel(raw, lang = 'th') {
  const std = resolveTag(raw);
  if (std) return lang === 'en' ? std.en : std.th;
  const { th, en } = parseCustomTag(raw);
  return lang === 'en' && en ? en : th;
}

const GROUP_ORDER = { health: 0, living: 1, personality: 2 };

/**
 * Display-ready tags: duplicates removed (e.g. "ทำวัคซีนแล้ว" + "vaccinated"),
 * standard tags ordered health → living → personality, custom tags last.
 * In English, custom tags without an English version are left out rather than shown in Thai.
 */
export function displayTags(rawTags = [], lang = 'th') {
  const seen = new Set();
  const out = [];
  rawTags.filter(Boolean).forEach((raw) => {
    const std = resolveTag(raw);
    const key = std ? std.id : `custom:${parseCustomTag(raw).th}`;
    if (seen.has(key)) return;
    if (!std && lang === 'en' && !parseCustomTag(raw).en) return;
    seen.add(key);
    out.push({ key, label: tagLabel(raw, lang), group: std ? std.group : 'custom' });
  });
  return out.sort((a, b) => (GROUP_ORDER[a.group] ?? 3) - (GROUP_ORDER[b.group] ?? 3));
}

/** For the form: split stored tags into selected standard ids and custom entries. */
export function splitStoredTags(rawTags = []) {
  const ids = new Set();
  const custom = [];
  rawTags.filter(Boolean).forEach((raw) => {
    const std = resolveTag(raw);
    if (std) ids.add(std.id);
    else custom.push(parseCustomTag(raw));
  });
  return { ids: [...ids], custom };
}

/** For saving: standard ids in catalogue order, then custom tags ("ไทย" or "ไทย||English"). */
export function buildStoredTags(ids = [], custom = []) {
  const selected = new Set(ids);
  const standard = TAGS.filter((t) => selected.has(t.id)).map((t) => t.id);
  const extra = custom
    .filter((c) => c.th && c.th.trim())
    .map((c) => (c.en && c.en.trim() ? `${c.th.trim()}${CUSTOM_SEPARATOR}${c.en.trim()}` : c.th.trim()));
  return [...standard, ...extra];
}
