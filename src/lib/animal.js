// Shared formatting for animal records (feed card, detail panel, profile page).
// Pass `t` from useI18n() so labels follow the app language.

const fallbackT = (key) => ({
  'animal.male': 'ตัวผู้', 'animal.female': 'ตัวเมีย', 'common.notSpecified': 'ไม่ระบุ',
  'animal.dog': 'สุนัข', 'animal.cat': 'แมว', 'animal.pet': 'สัตว์เลี้ยง',
  'animal.small': 'เล็ก', 'animal.medium': 'กลาง', 'animal.large': 'ใหญ่',
}[key] || key);

export const formatGender = (gender, t = fallbackT) => {
  const g = String(gender || '').toLowerCase();
  if (g === 'female' || g === 'เพศเมีย' || g === 'เมีย') return t('animal.female');
  if (g === 'male' || g === 'เพศผู้' || g === 'ผู้') return t('animal.male');
  return gender || t('common.notSpecified');
};

export const formatType = (type, t = fallbackT) => {
  const v = String(type || '').toLowerCase();
  if (v === 'dog' || v === 'สุนัข' || v === 'หมา') return t('animal.dog');
  if (v === 'cat' || v === 'แมว') return t('animal.cat');
  return type || t('animal.pet');
};

export const formatSize = (size, t = fallbackT) => {
  const s = String(size || '').toLowerCase();
  if (s === 'small' || s === 'เล็ก') return t('animal.small');
  if (s === 'large' || s === 'ใหญ่') return t('animal.large');
  return t('animal.medium');
};

// Stories are stored as "ไทย: ... English: ..." — split them so either language can lead.
export const splitStory = (story = '') => {
  if (!story.includes('English:')) return { th: story.trim(), en: '' };
  const [th, en] = story.split('English:');
  return { th: th.replace(/^ไทย:\s*/, '').trim(), en: (en || '').trim() };
};

// "แชร์คาน (Shere Khan)" -> { main: "แชร์คาน", alias: "Shere Khan" }
export function splitAnimalName(name = '') {
  const match = name.match(/^(.*?)\s*\(([^)]+)\)\s*$/);
  return match ? { main: match[1], alias: match[2] } : { main: name, alias: null };
}

// Name to show big and the one to show small, by app language:
// Thai UI -> "แชร์คาน" / "Shere Khan"; English UI -> "Shere Khan" / "แชร์คาน"
export function displayNames(name = '', lang = 'th') {
  const { main, alias } = splitAnimalName(name);
  if (lang === 'en' && alias) return { primary: alias, secondary: main };
  return { primary: main, secondary: alias };
}
