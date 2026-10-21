import { useEffect, useState, memo } from 'react';
import { motion, useMotionValue, useTransform, animate, useReducedMotion } from 'framer-motion';
import { Heart, X, Info, PawPrint, Building2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Chip } from './ui';
import { useI18n, localizeAge, localizeDistance } from '../i18n';
import { displayNames, formatGender, formatType } from '../lib/animal';

export { splitAnimalName } from '../lib/animal';

// Some uploads exist as .jpg and others as .jpeg — try the other extension once before giving up.
function swapExtension(src) {
  if (/\.jpeg(\?|$)/.test(src)) return src.replace(/\.jpeg(\?|$)/, '.jpg$1');
  if (/\.jpg(\?|$)/.test(src)) return src.replace(/\.jpg(\?|$)/, '.jpeg$1');
  return null;
}

function SwipeCardComponent({ animal, isFront, isSecond, onRemove, swipeTrigger, canSwipeRight = true, onBlockedSwipeRight }) {
  const { t, lang } = useI18n();
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

  const { primary: name, secondary: alias } = displayNames(animal.name, lang);
  const age = localizeAge(animal.age, lang);
  const meta = [
    age,
    animal.gender === 'male' || animal.gender === 'female' ? formatGender(animal.gender, t) : null,
    localizeDistance(animal.distance, lang),
  ].filter(Boolean);
  const typeLabel = formatType(animal.type, t);

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
            <span>{t('animal.noPhoto', { name })}</span>
          </div>
        ) : (
          <img
            src={imgSrc}
            alt={age ? t('animal.photoAlt', { name, type: typeLabel, age }) : `${name} ${typeLabel}`}
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
        <Heart size={24} fill="currentColor" strokeWidth={0} /> {t('feed.like')}
      </motion.div>
      <motion.div className="feed-stamp feed-stamp--nope" style={{ opacity: nopeOpacity }} aria-hidden="true">
        <X size={24} strokeWidth={3} /> {t('feed.skip')}
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
            aria-label={t('animal.viewProfile', { name })}
            title={t('animal.viewProfileShort')}
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
          <span>{animal.shelter || t('common.shelter')}</span>
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
