// Thai phone numbers: "0812345678" -> "081-234-5678", Bangkok landlines "021234567" -> "02-123-4567".
export function formatThaiPhone(val) {
  if (!val) return '';
  const d = String(val).replace(/\D/g, '').slice(0, 10);
  if (d.startsWith('02')) {
    if (d.length <= 2) return d;
    if (d.length <= 5) return `${d.slice(0, 2)}-${d.slice(2)}`;
    return `${d.slice(0, 2)}-${d.slice(2, 5)}-${d.slice(5)}`;
  }
  if (d.length <= 3) return d;
  if (d.length <= 6) return `${d.slice(0, 3)}-${d.slice(3)}`;
  return `${d.slice(0, 3)}-${d.slice(3, 6)}-${d.slice(6)}`;
}

/** 9 digits (landline) or 10 (mobile), starting with 0 */
export const isThaiPhone = (val) => /^0\d{8,9}$/.test(String(val || '').replace(/\D/g, ''));
