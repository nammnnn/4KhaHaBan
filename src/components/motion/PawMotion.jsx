// Small "paw" motion pieces that give the app its personality — DESIGN.md §6.1
// All of them are decorative (aria-hidden) and respect the device's reduce-motion setting
// through <MotionConfig reducedMotion="user"> plus the explicit checks below.
import { useMemo } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { PawPrint } from 'lucide-react';
import './PawMotion.css';

/**
 * Paw prints bursting out of a button (e.g. "like"). Re-mount with a new `burstKey` to replay.
 * Renders nothing for burstKey 0 so it doesn't fire on first render.
 */
export function PawBurst({ burstKey, count = 6, distance = 46, color = 'var(--action-like)' }) {
  const reduce = useReducedMotion();
  const paws = useMemo(() => Array.from({ length: count }, (_, i) => {
    // Spread evenly around the circle with a little jitter, upper half favoured
    const angle = (-90 + (360 / count) * i + (Math.random() * 24 - 12)) * (Math.PI / 180);
    const d = distance * (0.8 + Math.random() * 0.4);
    return { x: Math.cos(angle) * d, y: Math.sin(angle) * d, rotate: Math.random() * 60 - 30, size: 12 + Math.round(Math.random() * 6) };
  }), [burstKey, count, distance]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!burstKey || reduce) return null;
  return (
    <span className="paw-burst" aria-hidden="true" key={burstKey}>
      {paws.map((p, i) => (
        <motion.span
          key={i}
          className="paw-burst__paw"
          style={{ color }}
          initial={{ x: 0, y: 0, scale: 0.4, opacity: 0, rotate: 0 }}
          animate={{ x: p.x, y: p.y, scale: 1, opacity: [0, 1, 1, 0], rotate: p.rotate }}
          transition={{ duration: 0.65, ease: [0.2, 0, 0, 1], opacity: { duration: 0.65, times: [0, 0.15, 0.6, 1] } }}
        >
          <PawPrint size={p.size} strokeWidth={2.4} />
        </motion.span>
      ))}
    </span>
  );
}

/** Paws drifting down once over a celebration (adoption request sent). */
export function PawConfetti({ count = 14 }) {
  const reduce = useReducedMotion();
  const paws = useMemo(() => Array.from({ length: count }, (_, i) => ({
    left: `${(100 / count) * i + Math.random() * (100 / count)}%`,
    delay: Math.random() * 0.5,
    duration: 1.6 + Math.random() * 0.9,
    drift: Math.random() * 60 - 30,
    rotate: Math.random() * 120 - 60,
    size: 14 + Math.round(Math.random() * 10),
    tone: i % 3,
  })), [count]);

  if (reduce) return null;
  return (
    <span className="paw-confetti" aria-hidden="true">
      {paws.map((p, i) => (
        <motion.span
          key={i}
          className={`paw-confetti__paw paw-confetti__paw--${p.tone}`}
          style={{ left: p.left }}
          initial={{ y: '-10vh', x: 0, opacity: 0, rotate: 0 }}
          animate={{ y: '70vh', x: p.drift, opacity: [0, 1, 1, 0], rotate: p.rotate }}
          transition={{ duration: p.duration, delay: p.delay, ease: 'easeIn', opacity: { duration: p.duration, delay: p.delay, times: [0, 0.1, 0.75, 1] } }}
        >
          <PawPrint size={p.size} strokeWidth={2.2} />
        </motion.span>
      ))}
    </span>
  );
}

/** Success mark: circle pops, the check draws itself, then a paw "stamps" the corner. */
export function SuccessMark({ size = 72 }) {
  return (
    <span className="success-mark" style={{ width: size, height: size }} aria-hidden="true">
      <motion.span
        className="success-mark__circle"
        initial={{ scale: 0.6, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 420, damping: 20 }}
      />
      <svg viewBox="0 0 24 24" className="success-mark__check" width={size * 0.5} height={size * 0.5}>
        <motion.path
          d="M5 12.5l4.2 4.2L19 7"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.6"
          strokeLinecap="round"
          strokeLinejoin="round"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 0.35, delay: 0.15, ease: [0.2, 0, 0, 1] }}
        />
      </svg>
      <motion.span
        className="success-mark__paw"
        initial={{ scale: 1.8, opacity: 0, rotate: -20 }}
        animate={{ scale: 1, opacity: 1, rotate: -12 }}
        transition={{ type: 'spring', stiffness: 520, damping: 18, delay: 0.5 }}
      >
        <PawPrint size={Math.round(size * 0.3)} strokeWidth={2.4} />
      </motion.span>
    </span>
  );
}

/** Loading: little paws walking across, used inside skeletons (CSS only). */
export function PawWalk({ steps = 4, size = 22 }) {
  return (
    <span className="paw-walk" aria-hidden="true">
      {Array.from({ length: steps }, (_, i) => (
        <span key={i} className={`paw-walk__step ${i % 2 ? 'is-right' : 'is-left'}`} style={{ animationDelay: `${i * 0.28}s` }}>
          <PawPrint size={size} strokeWidth={2} />
        </span>
      ))}
    </span>
  );
}
