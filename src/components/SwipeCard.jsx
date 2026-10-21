import { useEffect, useState, memo } from 'react';
import { motion, useMotionValue, useTransform, animate, useReducedMotion } from 'framer-motion';
import { Heart, X, Info, PawPrint, Building2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Chip } from './ui';

const GENDER_LABEL = { male: 'ตัวผู้', female: 'ตัวเมีย' };
const TYPE_LABEL = { dog: 'สุนัข', cat: 'แมว' };

// "แชร์คาน (Shere Khan)" -> { main: "แชร์คาน", alias: "Shere Khan" }
export function splitAnimalName(name = '') {
  const match = name.match(/^(.*?)\s*\(([^)]+)\)\s*$/);
  return match ? { main: match[1], alias: match[2] } : { main: name, alias: null };
}

// Some uploads exist as .jpg and others as .jpeg — try the other extension once before giving up.
function swapExtension(src) {
  if (/\.jpeg(\?|$)/.test(src)) return src.replace(/\.jpeg(\?|$)/, '.jpg$1');
  if (/\.jpg(\?|$)/.test(src)) return src.replace(/\.jpg(\?|$)/, '.jpeg$1');
  return null;
}

function SwipeCardComponent({ animal, isFront, isSecond, onRemove, swipeTrigger, canSwipeRight = true, onBlockedSwipeRight }) {
  const x = useMotionValue(0);
  const reduceMotion = useReducedMotion();
  const originalSrc = animal?.images?.[0] || null;
  const [imgSrc, setImgSrc] = useState(originalSrc);
  const [imgState, setImgState] = useState(originalSrc ? 'loading' : 'error');
  const [triedSwap, setTriedSwap] = useState(false);

  useEffect(() => {
    if (isSecond && originalSrc) {
      const img = new Image();
      img.src = originalSrc;
    }
  }, [isSecond, originalSrc]);

  // DESIGN.md §6: tilt up to ±12°, none when reduced motion is requested
  const rotate = useTransform(x, [-200, 200], reduceMotion ? [0, 0] : [-12, 12]);
  const likeOpacity = useTransform(x, [20, 90], [0, 1]);
  const nopeOpacity = useTransform(x, [-20, -90], [0, 1]);

  const notifyRemove = (direction) => {
    if (!onRemove) return;
    const cardId = animal.cardKey || animal.id;
    if (onRemove.length >= 2) {
      onRemove(cardId, direction);
    } else {
      onRemove(direction);
    }
  };

  const flyOut = (direction, duration) => {
    const target = direction === 'right' ? 500 : -500;
    animate(x, target, { duration: reduceMotion ? 0.01 : duration }).then(() => notifyRemove(direction));
  };

  const springBack = () => animate(x, 0, { type: 'spring', stiffness: 300, damping: 30 });

  useEffect(() => {
    if (swipeTrigger && (swipeTrigger.id === animal.id || swipeTrigger.id === animal.cardKey)) {
      if (swipeTrigger.direction === 'right' && !canSwipeRight) {
        if (onBlockedSwipeRight) onBlockedSwipeRight();
        return;
      }
      flyOut(swipeTrigger.direction, 0.28);
    }
  }, [swipeTrigger, animal.id, animal.cardKey, onRemove, x, canSwipeRight, onBlockedSwipeRight]);

  const handleDragEnd = (event, info) => {
    const offset = info.offset.x;
    const velocity = info.velocity.x;

    if (offset > 90 || velocity > 450) {
      if (!canSwipeRight) {
        springBack();
        if (onBlockedSwipeRight) onBlockedSwipeRight();
        return;
      }
      flyOut('right', 0.2);
    } else if (offset < -90 || velocity < -450) {
      flyOut('left', 0.2);
    } else {
      springBack();
    }
  };

  const handleImgError = () => {
    const swapped = !triedSwap && imgSrc ? swapExtension(imgSrc) : null;
    if (swapped) {
      setTriedSwap(true);
      setImgSrc(swapped);
    } else {
      setImgState('error');
    }
  };

  const stackStyles = isFront
    ? { scale: 1, opacity: 1 }
    : isSecond
      ? { scale: 0.96, opacity: 1 }
      : { scale: 0.92, opacity: 0 };

  const { main: name, alias } = splitAnimalName(animal.name);
  const meta = [animal.age, GENDER_LABEL[animal.gender], animal.distance].filter(Boolean);
  const typeLabel = TYPE_LABEL[animal.type] || 'สัตว์';

  return (
    <motion.div
      className={`swipe-card${isFront ? '' : ' swipe-card--back'}`}
      style={{ x, rotate, zIndex: isFront ? 10 : isSecond ? 5 : 0, pointerEvents: isFront ? 'auto' : 'none' }}
      drag={isFront ? 'x' : false}
      dragConstraints={{ left: 0, right: 0, top: 0, bottom: 0 }}
      onDragEnd={handleDragEnd}
      animate={stackStyles}
      transition={{ type: 'spring', stiffness: 300, damping: 30 }}
      initial={isSecond ? { scale: 0.94, opacity: 0 } : false}
      aria-hidden={!isFront}
    >
      <div className="swipe-card__media">
        {imgState === 'loading' && <div className="skeleton" style={{ position: 'absolute', inset: 0, borderRadius: 0 }} />}

        {imgState === 'error' ? (
          <div className="swipe-card__fallback">
            <PawPrint size={48} aria-hidden="true" />
            <span>ยังไม่มีรูปของ{name}</span>
          </div>
        ) : (
          <img
            src={imgSrc}
            alt={`${name} ${typeLabel}${animal.age ? ` อายุ ${animal.age}` : ''}`}
            className={`swipe-card__img${imgState === 'loading' ? ' swipe-card__img--loading' : ''}`}
            draggable="false"
            loading={isFront ? 'eager' : 'lazy'}
            decoding="async"
            fetchPriority={isFront ? 'high' : 'auto'}
            onLoad={() => setImgState('loaded')}
            onError={handleImgError}
          />
        )}
      </div>

      <div className="swipe-card__scrim" />

      <motion.div className="feed-stamp feed-stamp--like" style={{ opacity: likeOpacity }} aria-hidden="true">
        <Heart size={24} fill="currentColor" strokeWidth={0} /> ถูกใจ
      </motion.div>
      <motion.div className="feed-stamp feed-stamp--nope" style={{ opacity: nopeOpacity }} aria-hidden="true">
        <X size={24} strokeWidth={3} /> ข้าม
      </motion.div>

      <div className="swipe-card__info">
        <div className="swipe-card__title-row">
          <div className="swipe-card__text">
            <h2 className="swipe-card__name">{name}</h2>
            {alias && <div className="swipe-card__alias">{alias}</div>}
          </div>
          <Link
            to={`/animal/${animal.id}`}
            className="swipe-card__info-btn"
            aria-label={`ดูประวัติของ${name}`}
            title="ดูประวัติ"
            tabIndex={isFront ? 0 : -1}
            onClick={(e) => e.stopPropagation()}
            onPointerDownCapture={(e) => e.stopPropagation()}
          >
            <Info size={22} />
          </Link>
        </div>

        {meta.length > 0 && (
          <div className="swipe-card__meta">
            {meta.map((item, i) => (
              <span key={item}>
                {i > 0 && <span className="swipe-card__meta-sep" aria-hidden="true">· </span>}
                {item}
              </span>
            ))}
          </div>
        )}

        <div className="swipe-card__shelter">
          <Building2 size={14} aria-hidden="true" />
          <span>{animal.shelter || 'ศูนย์พักพิงสัตว์'}</span>
        </div>

        {animal.tags?.length > 0 && (
          <div className="swipe-card__tags">
            {animal.tags.slice(0, 3).map((tag) => (
              <Chip key={tag} onPhoto>{tag}</Chip>
            ))}
          </div>
        )}
      </div>
    </motion.div>
  );
}

export const SwipeCard = memo(SwipeCardComponent);
