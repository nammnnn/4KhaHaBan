// Shared formatting for animal records (profile page, feed detail panel)

export const formatGender = (gender) => {
  const g = String(gender || '').toLowerCase();
  if (g === 'female' || g === 'เพศเมีย' || g === 'เมีย') return 'ตัวเมีย';
  if (g === 'male' || g === 'เพศผู้' || g === 'ผู้') return 'ตัวผู้';
  return gender || 'ไม่ระบุ';
};

export const formatType = (type) => {
  const t = String(type || '').toLowerCase();
  if (t === 'dog' || t === 'สุนัข' || t === 'หมา') return 'สุนัข';
  if (t === 'cat' || t === 'แมว') return 'แมว';
  return type || 'สัตว์เลี้ยง';
};

export const formatSize = (size) => {
  const s = String(size || '').toLowerCase();
  if (s === 'small' || s === 'เล็ก') return 'เล็ก';
  if (s === 'large' || s === 'ใหญ่') return 'ใหญ่';
  return 'กลาง';
};

// Stories are stored as "ไทย: ... English: ..." — split them so Thai leads.
export const splitStory = (story = '') => {
  if (!story.includes('English:')) return { th: story.trim(), en: '' };
  const [th, en] = story.split('English:');
  return { th: th.replace(/^ไทย:\s*/, '').trim(), en: (en || '').trim() };
};
