// Tiny i18n layer: Thai (default) and English. DESIGN.md §8.1
// Usage: const { t, lang, setLang } = useI18n(); t('feed.filters') or t('feed.near', { area })
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import th from './th';
import en from './en';

const DICTS = { th, en };
export const LANGS = ['th', 'en'];
const STORAGE_KEY = '4kh_lang';

function initialLang() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (LANGS.includes(saved)) return saved;
  } catch (e) {
    // storage blocked — fall through to the browser language
  }
  if (typeof navigator !== 'undefined' && /^en\b/i.test(navigator.language || '')) return 'en';
  return 'th';
}

// "{name} is {age}" + { name: 'Lucky', age: 2 } -> "Lucky is 2"
function interpolate(str, vars) {
  if (!vars) return str;
  return str.replace(/\{(\w+)\}/g, (m, k) => (vars[k] !== undefined && vars[k] !== null ? String(vars[k]) : m));
}

const I18nContext = createContext(null);

export function LanguageProvider({ children }) {
  const [lang, setLangState] = useState(initialLang);

  const setLang = useCallback((next) => {
    if (!LANGS.includes(next)) return;
    setLangState(next);
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch (e) {
      // ignore
    }
  }, []);

  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);

  const t = useCallback((key, vars) => {
    const value = DICTS[lang][key] ?? DICTS.th[key];
    if (value === undefined) {
      if (import.meta.env.DEV) console.warn(`[i18n] missing key: ${key}`);
      return key;
    }
    return typeof value === 'string' ? interpolate(value, vars) : value;
  }, [lang]);

  const value = useMemo(() => ({ lang, setLang, t }), [lang, setLang, t]);
  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error('useI18n must be used inside <LanguageProvider>');
  return ctx;
}

/** Segmented "ไทย | English" switch — each label is written in its own language. */
export function LanguageSwitch({ className = '' }) {
  const { lang, setLang } = useI18n();
  return (
    <div className={`ap-lang ${className}`} role="group" aria-label="ภาษา / Language">
      <button type="button" lang="th" aria-pressed={lang === 'th'} onClick={() => setLang('th')}>ไทย</button>
      <button type="button" lang="en" aria-pressed={lang === 'en'} onClick={() => setLang('en')}>English</button>
    </div>
  );
}

// ---- Localising values that come from the database in Thai ----

/** "2 ปี 4 เดือน" -> "2 yrs 4 mos" in English; unchanged in Thai. */
export function localizeAge(age, lang) {
  if (!age || lang !== 'en') return age || '';
  const y = /(\d+)\s*ปี/.exec(age);
  const m = /(\d+)\s*เดือน/.exec(age);
  if (!y && !m) return age;
  const parts = [];
  if (y) parts.push(`${y[1]} ${y[1] === '1' ? 'yr' : 'yrs'}`);
  if (m) parts.push(`${m[1]} ${m[1] === '1' ? 'mo' : 'mos'}`);
  return parts.join(' ');
}

/** "26.1 กม." / "< 1 กม." -> "26.1 km" / "< 1 km" in English. */
export function localizeDistance(distance, lang) {
  if (!distance || lang !== 'en') return distance || '';
  return distance.replace(/กม\./g, 'km');
}
