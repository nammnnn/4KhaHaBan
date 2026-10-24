import React from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { Heart, X, RotateCcw, ShieldCheck, MessageCircle } from 'lucide-react';
import BrandMark from './BrandMark';
import { useI18n, localizeAge } from '../i18n';

// Real animals from the foundation (the 800px cat photos are sharp enough for a hero)
const FRONT = { src: '/animals/cat_p2_7.jpg', name: { th: 'เฟร็กเคิล', en: 'Freckle' }, age: '9 เดือน' };
const BACK = ['/animals/cat_p1_3.jpg', '/animals/cat_p2_17.jpg'];
export const MOBILE_FACES = ['/animals/cat_p2_7.jpg', '/animals/cat_p1_3.jpg', '/animals/cat_p2_17.jpg', '/animals/cat_p3_2.jpg'];

/** Desktop left panel on the login page: a live preview of the swipe deck. DESIGN.md §7.20 */
export function LoginShowcase() {
  const { t, lang } = useI18n();
  const reduceMotion = useReducedMotion();

  // The front card leans right like a "like" swipe, then settles back
  const swipe = reduceMotion
    ? {}
    : {
        animate: { x: [0, 0, 34, 34, 0], rotate: [0, 0, 7, 7, 0] },
        transition: { duration: 4.4, times: [0, 0.35, 0.5, 0.72, 0.9], repeat: Infinity, ease: 'easeInOut' },
      };
  const stamp = reduceMotion
    ? { style: { opacity: 0 } }
    : {
        animate: { opacity: [0, 0, 1, 1, 0] },
        transition: { duration: 4.4, times: [0, 0.38, 0.5, 0.72, 0.84], repeat: Infinity, ease: 'easeInOut' },
      };
  // The like button lights up green while the card swipes, as if it was tapped
  const press = reduceMotion
    ? {}
    : {
        animate: {
          backgroundColor: ['#FFFFFF', '#FFFFFF', 'var(--success-fill)', 'var(--success-fill)', '#FFFFFF'],
          color: ['var(--success-fill)', 'var(--success-fill)', '#FFFFFF', '#FFFFFF', 'var(--success-fill)'],
          scale: [1, 1, 0.9, 1, 1, 1],
        },
        transition: {
          default: { duration: 4.4, times: [0, 0.34, 0.42, 0.72, 0.84], repeat: Infinity, ease: 'easeInOut' },
          scale: { duration: 4.4, times: [0, 0.32, 0.36, 0.42, 0.9, 1], repeat: Infinity, ease: 'easeInOut' },
        },
      };

  return (
    <div className="ls">
      <div className="ls-brand">
        <span className="ls-brand__icon" aria-hidden="true">
          <BrandMark size={32} />
        </span>
        <span className="ls-brand__name">
          {t('app.name.prefix')}<span>{t('app.name.accent')}</span>
        </span>
      </div>

      <div className="ls-body">
        <h1 className="ls-title">
          {t('login.heroTitle1')}
          <br />
          <span className="ls-title__accent">{t('login.heroTitle2')}</span>
        </h1>
        <p className="ls-desc">{t('login.heroDesc')}</p>

        <div className="ls-stage" aria-hidden="true">
          <div className="ls-stack">
            <div className="ls-card ls-card--left"><img src={BACK[0]} alt="" /></div>
            <div className="ls-card ls-card--right"><img src={BACK[1]} alt="" /></div>
            <motion.div className="ls-card ls-card--front" {...swipe}>
              <img src={FRONT.src} alt="" />
              <motion.span className="ls-stamp" {...stamp}>{t('feed.like')}</motion.span>
              <div className="ls-card__info">
                <strong>{FRONT.name[lang] || FRONT.name.th}</strong>
                <span>{localizeAge(FRONT.age, lang)}</span>
              </div>
            </motion.div>
          </div>
          <div className="ls-actions">
            {/* Same buttons as the feed (DESIGN.md §7.2), scaled down */}
            <span className="ls-btn ls-btn--nope"><X size={24} strokeWidth={2.5} /></span>
            <span className="ls-btn ls-btn--undo"><RotateCcw size={16} strokeWidth={2.5} /></span>
            <motion.span className="ls-btn ls-btn--like" {...press}><Heart size={24} fill="currentColor" strokeWidth={0} /></motion.span>
          </div>
        </div>

        <ul className="ls-proof">
          <li><ShieldCheck size={16} aria-hidden="true" /> {t('login.f2.title')}</li>
          <li><MessageCircle size={16} aria-hidden="true" /> {t('login.f3.title')}</li>
        </ul>
      </div>
    </div>
  );
}
