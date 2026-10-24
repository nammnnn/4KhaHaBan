// Placeholder images drawn in the app, so names are never sent to a third-party avatar service.

const esc = (s) => s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

/** First letter of a name on the app's soft amber, as an SVG data URI usable in <img src>. */
export function initialsAvatar(name) {
  const letter = esc(Array.from((name || '?').trim())[0] || '?').toUpperCase();
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" fill="#FEF3C7"/><text x="32" y="33" text-anchor="middle" dominant-baseline="central" font-family="Prompt, Tahoma, sans-serif" font-size="28" font-weight="700" fill="#92400E">${letter}</text></svg>`;
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

/** Paw on warm grey, for an animal without a photo. */
export const PET_PLACEHOLDER = `data:image/svg+xml;charset=utf-8,${encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" fill="#F5F5F4"/><g fill="#A8A29E" transform="translate(32 30) scale(0.9)"><path d="M0 0 C4.8 0 8.8 3.4 9.8 7.8 C10.6 11.4 8.6 14.4 5.4 14.4 C3.5 14.4 2 13.5 0 13.5 C-2 13.5 -3.5 14.4 -5.4 14.4 C-8.6 14.4 -10.6 11.4 -9.8 7.8 C-8.8 3.4 -4.8 0 0 0 Z"/><ellipse cx="-10.6" cy="-2.2" rx="3.1" ry="3.9"/><ellipse cx="-4" cy="-7.2" rx="3.3" ry="4.2"/><ellipse cx="4" cy="-7.2" rx="3.3" ry="4.2"/><ellipse cx="10.6" cy="-2.2" rx="3.1" ry="3.9"/></g></svg>')}`;
