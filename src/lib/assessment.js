// Adopter readiness questions (answered in UserVerification.jsx, stored in Thai on
// user_verifications.assessment). Option 0 is the "ready" answer; anything else is worth
// talking through with the adopter before approving.
export const ASSESSMENT = [
  {
    id: 'housing',
    th: 'ที่อยู่อาศัย',
    en: 'Home',
    options: [
      ['มีบ้าน/คอนโดที่อนุญาตให้เลี้ยงสัตว์', 'Home allows pets'],
      ['อยู่ระหว่างจัดหาที่พักที่เหมาะสม', 'Still finding a suitable place'],
      ['ยังไม่แน่ใจ / ไม่สามารถเลี้ยงได้', 'Not sure / pets not allowed'],
    ],
  },
  {
    id: 'time',
    th: 'เวลาดูแลน้อง',
    en: 'Time for the pet',
    options: [
      ['มาก (อย่างน้อยวันละ 2 ครั้ง)', 'Plenty (at least twice a day)'],
      ['ปานกลาง', 'Some'],
      ['น้อย', 'Little'],
    ],
  },
  {
    id: 'budget',
    th: 'งบค่าอาหารและรักษา',
    en: 'Budget for food and vet care',
    options: [
      ['มี (อย่างน้อย 1,000 บาท/เดือน)', 'Yes (at least 1,000 THB a month)'],
      ['พอมี / อาจไม่แน่นอน', 'Some / not always'],
      ['ยังไม่มี', 'Not yet'],
    ],
  },
  {
    id: 'family',
    th: 'ครอบครัวเห็นด้วย',
    en: 'Family agrees',
    options: [
      ['เห็นด้วยทั้งหมด', 'Everyone agrees'],
      ['บางคนไม่เห็นด้วย', 'Some disagree'],
      ['ยังไม่แน่ใจ', 'Not sure yet'],
    ],
  },
  {
    id: 'longterm',
    th: 'พร้อมดูแลระยะยาว',
    en: 'Long-term commitment',
    options: [
      ['พร้อม ดูแลตลอดชีวิต', 'Ready, for life'],
      ['อาจมีข้อจำกัดในอนาคต', 'May have limits later'],
      ['ไม่แน่ใจ', 'Not sure'],
    ],
  },
];

/**
 * One row per question for the applicant's stored answers.
 * answer: text in the current language, or null when the question wasn't answered.
 * concern: true when the answer isn't the "ready" option.
 */
export function readAssessment(stored, lang) {
  const a = stored || {};
  return ASSESSMENT.map((q) => {
    const raw = a[q.id];
    if (!raw) return { id: q.id, label: lang === 'en' ? q.en : q.th, answer: null, concern: false };
    const idx = q.options.findIndex(([th]) => th === raw);
    const answer = idx >= 0 && lang === 'en' ? q.options[idx][1] : raw;
    return { id: q.id, label: lang === 'en' ? q.en : q.th, answer, concern: idx !== 0 };
  });
}
