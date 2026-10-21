// First-visit coach marks for the swipe feed (like Tinder/Bumble's intro) — DESIGN.md §7.17
import { useEffect, useRef } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { Heart, X, RotateCcw, Info, Hand } from 'lucide-react';
import { Button } from './ui';

const SEEN_KEY = '4kh_feed_onboarding_seen';

export function hasSeenFeedOnboarding() {
  try {
    return localStorage.getItem(SEEN_KEY) === '1';
  } catch (e) {
    return true; // storage blocked: don't nag on every visit
  }
}

export function markFeedOnboardingSeen() {
  try {
    localStorage.setItem(SEEN_KEY, '1');
  } catch (e) {
    // ignore
  }
}

const TIPS = [
  { icon: Heart, tone: 'like', title: 'ปัดขวา หรือกดหัวใจ', text: 'สนใจรับเลี้ยง ส่งคำขอถึงมูลนิธิ' },
  { icon: X, tone: 'nope', title: 'ปัดซ้าย หรือกดกากบาท', text: 'ข้ามไปดูน้องตัวถัดไป' },
  { icon: RotateCcw, tone: 'rewind', title: 'ปุ่มสีส้ม', text: 'ย้อนกลับมาดูน้องตัวที่เพิ่งข้าม' },
  { icon: Info, tone: 'info', title: 'ปุ่ม (i) บนการ์ด', text: 'ดูประวัติและเรื่องราวของน้อง' },
];

// Wide screens show details beside the card instead of an (i) button (DESIGN.md §7.18)
const WIDE_INFO_TIP = { icon: Info, tone: 'info', title: 'ข้อมูลด้านขวา', text: 'อ่านเรื่องราวของน้อง หรือกด "ดูประวัติเต็ม"' };
const isWideScreen = () => typeof window !== 'undefined' && window.matchMedia?.('(min-width: 1200px)').matches;

export function FeedOnboarding({ open, onClose }) {
  const reduceMotion = useReducedMotion();
  const buttonRef = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    buttonRef.current?.focus();
    const onKey = (e) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="feed-onboarding"
          role="dialog"
          aria-modal="true"
          aria-labelledby="feed-onboarding-title"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
        >
          <motion.div
            className="feed-onboarding__panel"
            initial={reduceMotion ? false : { y: 16, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.32, ease: [0.2, 0, 0, 1] }}
          >
            {/* Swipe demo: a hand moving left and right */}
            <div className="feed-onboarding__demo" aria-hidden="true">
              <span className="feed-onboarding__side feed-onboarding__side--nope"><X size={20} strokeWidth={3} /></span>
              <motion.span
                className="feed-onboarding__hand"
                animate={reduceMotion ? undefined : { x: [0, 56, 0, -56, 0], rotate: [0, 10, 0, -10, 0] }}
                transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut', repeatDelay: 0.4 }}
              >
                <Hand size={40} />
              </motion.span>
              <span className="feed-onboarding__side feed-onboarding__side--like"><Heart size={20} fill="currentColor" strokeWidth={0} /></span>
            </div>

            <h2 id="feed-onboarding-title" className="feed-onboarding__title">ปัดเพื่อหาน้องที่ใช่</h2>

            <ul className="feed-onboarding__tips">
              {(isWideScreen() ? [...TIPS.slice(0, 3), WIDE_INFO_TIP] : TIPS).map(({ icon: Icon, tone, title, text }) => (
                <li key={title}>
                  <span className={`feed-onboarding__icon feed-onboarding__icon--${tone}`} aria-hidden="true">
                    <Icon size={20} strokeWidth={2.5} {...(tone === 'like' ? { fill: 'currentColor', strokeWidth: 0 } : {})} />
                  </span>
                  <span>
                    <strong>{title}</strong>
                    <small>{text}</small>
                  </span>
                </li>
              ))}
            </ul>

            <Button ref={buttonRef} variant="primary" block onClick={onClose}>เริ่มดูน้องๆ</Button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
