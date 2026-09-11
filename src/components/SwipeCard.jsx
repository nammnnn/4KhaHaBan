import { useEffect, memo } from 'react';
import { motion, useMotionValue, useTransform, animate } from 'framer-motion';
import { MapPin, Heart, X, CheckCircle2, ChevronRight } from 'lucide-react';
import { Link } from 'react-router-dom';

function SwipeCardComponent({ animal, isFront, isSecond, onRemove, swipeTrigger }) {
  const x = useMotionValue(0);
  
  // Preload image if this card is second in the stack for seamless transition
  useEffect(() => {
    if (isSecond && animal?.images?.[0]) {
      const img = new Image();
      img.src = animal.images[0];
    }
  }, [isSecond, animal]);

  // Rotate based on drag x
  const rotate = useTransform(x, [-200, 200], [-16, 16]);
  // Opacity for nope/like stamps
  const opacityRight = useTransform(x, [0, 70], [0, 1]);
  const opacityLeft = useTransform(x, [0, -70], [0, 1]);

  const notifyRemove = (direction) => {
    if (!onRemove) return;
    const cardId = animal.cardKey || animal.id;
    if (onRemove.length >= 2) {
      onRemove(cardId, direction);
    } else {
      onRemove(direction);
    }
  };

  useEffect(() => {
    if (swipeTrigger && (swipeTrigger.id === animal.id || swipeTrigger.id === animal.cardKey)) {
      const targetX = swipeTrigger.direction === 'right' ? 500 : -500;
      
      Promise.all([
        animate(x, targetX, { duration: 0.28 })
      ]).then(() => notifyRemove(swipeTrigger.direction));
    }
  }, [swipeTrigger, animal.id, animal.cardKey, onRemove, x]);

  const handleDragEnd = (event, info) => {
    const offset = info.offset.x;
    const velocity = info.velocity.x;
    
    if (offset > 90 || velocity > 450) {
      Promise.all([
        animate(x, 500, { duration: 0.2 })
      ]).then(() => notifyRemove('right'));
    } else if (offset < -90 || velocity < -450) {
      Promise.all([
        animate(x, -500, { duration: 0.2 })
      ]).then(() => notifyRemove('left'));
    } else {
      animate(x, 0, { type: 'spring', stiffness: 320, damping: 22 });
    }
  };

  // Stack styling configuration for cards behind the front card
  const stackStyles = isSecond ? {
    scale: 0.96,
    y: 0,
    opacity: 0.98
  } : isFront ? {
    scale: 1,
    y: 0,
    opacity: 1
  } : {
    scale: 0.92,
    y: 0,
    opacity: 0
  };

  const imageSrc = animal?.images?.[0] || 'https://images.unsplash.com/photo-1543466835-00a7907e9de1?auto=format&fit=crop&q=80&w=800';

  return (
    <motion.div
      className="swipe-card"
      style={{
        x,
        rotate,
        zIndex: isFront ? 10 : isSecond ? 5 : 0,
        pointerEvents: isFront ? 'auto' : 'none',
        borderRadius: '22px',
        overflow: 'hidden',
        border: '1px solid rgba(217, 119, 6, 0.12)',
        boxShadow: isFront 
          ? '0 14px 34px rgba(28, 25, 23, 0.12), 0 4px 12px rgba(217, 119, 6, 0.08)' 
          : '0 8px 24px rgba(0, 0, 0, 0.08)',
        willChange: 'transform',
        transform: 'translateZ(0)',
        backfaceVisibility: 'hidden',
        WebkitBackfaceVisibility: 'hidden'
      }}
      drag={isFront ? "x" : false}
      dragConstraints={{ left: 0, right: 0, top: 0, bottom: 0 }}
      onDragEnd={handleDragEnd}
      animate={stackStyles}
      transition={{ type: 'spring', stiffness: 320, damping: 24 }}
      initial={isSecond ? { scale: 0.94, y: 0, opacity: 0 } : false}
    >
      <div className="card-image-container" style={{ width: '100%', height: '100%', position: 'relative', overflow: 'hidden', backgroundColor: '#111827' }}>
        <img 
          src={imageSrc} 
          alt={animal.name} 
          draggable="false" 
          loading={isFront ? "eager" : "lazy"} 
          decoding="async" 
          fetchPriority={isFront ? "high" : "auto"}
          style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
        />
        
        {/* Status Chip (Top Left) */}
        <div style={{
          position: 'absolute',
          top: '14px',
          left: '14px',
          backgroundColor: 'rgba(255, 255, 255, 0.94)',
          backdropFilter: 'blur(8px)',
          WebkitBackdropFilter: 'blur(8px)',
          padding: '4px 10px',
          borderRadius: '20px',
          border: '1px solid rgba(167, 243, 208, 0.8)',
          boxShadow: '0 2px 6px rgba(0,0,0,0.1)',
          zIndex: 3
        }}>
          <span style={{
            fontSize: '0.76rem',
            fontWeight: 600,
            color: '#059669',
            display: 'flex',
            alignItems: 'center',
            gap: '4px'
          }}>
            <CheckCircle2 size={13} />
            กำลังหาบ้าน
          </span>
        </div>



        {/* Like / Nope Stamps (on drag) */}
        <motion.div 
          className="stamp stamp-nope" 
          style={{ 
            opacity: opacityLeft,
            position: 'absolute',
            top: '24px',
            right: '20px',
            border: '3px solid #DC2626',
            color: '#DC2626',
            backgroundColor: 'rgba(255, 255, 255, 0.94)',
            borderRadius: '12px',
            padding: '6px 18px',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            boxShadow: '0 4px 16px rgba(220, 38, 38, 0.25)',
            fontWeight: 700,
            fontSize: '1.4rem',
            letterSpacing: '0.5px',
            transform: 'rotate(12deg)',
            zIndex: 10,
            pointerEvents: 'none'
          }}
        >
          <X size={26} strokeWidth={2.5} /> ข้าม
        </motion.div>
        
        <motion.div 
          className="stamp stamp-like" 
          style={{ 
            opacity: opacityRight,
            position: 'absolute',
            top: '24px',
            left: '20px',
            border: '3px solid #059669',
            color: '#059669',
            backgroundColor: 'rgba(255, 255, 255, 0.94)',
            borderRadius: '12px',
            padding: '6px 18px',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            boxShadow: '0 4px 16px rgba(5, 150, 105, 0.25)',
            fontWeight: 700,
            fontSize: '1.4rem',
            letterSpacing: '0.5px',
            transform: 'rotate(-12deg)',
            zIndex: 10,
            pointerEvents: 'none'
          }}
        >
          <Heart size={24} fill="currentColor" strokeWidth={0} /> สนใจ
        </motion.div>

        {/* Bottom Dark Gradient Overlay */}
        <div style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          height: '56%',
          background: 'linear-gradient(to top, rgba(18, 14, 10, 0.94) 0%, rgba(18, 14, 10, 0.68) 45%, rgba(18, 14, 10, 0.15) 80%, transparent 100%)',
          pointerEvents: 'none',
          zIndex: 1
        }} />

        {/* Bottom Info Content (Overlayed on gradient) */}
        <div 
          className="card-info-overlay"
          onClick={(e) => {
            e.stopPropagation();
            document.querySelector(`.info-btn-${animal.id}`)?.click();
          }}
          style={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            padding: '16px 16px 14px',
            zIndex: 2,
            color: '#FFFFFF',
            cursor: 'pointer'
          }}
        >
          {/* Name and Age */}
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', marginBottom: '3px' }}>
            <h2 style={{
              fontSize: '1.45rem',
              fontWeight: 700,
              color: '#FFFFFF',
              margin: 0,
              lineHeight: 1.2,
              textShadow: '0 2px 6px rgba(0,0,0,0.5)'
            }}>
              {animal.name}
            </h2>
            <span style={{
              fontSize: '1.05rem',
              fontWeight: 500,
              color: 'rgba(255, 255, 255, 0.9)',
              textShadow: '0 1px 4px rgba(0,0,0,0.5)'
            }}>
              {animal.age}
            </span>
          </div>

          {/* Shelter & Distance */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '5px',
            fontSize: '0.82rem',
            color: 'rgba(255, 255, 255, 0.9)',
            marginBottom: '8px',
            textShadow: '0 1px 3px rgba(0,0,0,0.5)'
          }}>
            <MapPin size={13} color="#FBBF24" />
            <span>{animal.shelter || 'ศูนย์พักพิงสัตว์'}{animal.distance ? ` (${animal.distance})` : ''}</span>
          </div>

          {/* Tags (Frosted pills) */}
          {animal.tags && animal.tags.length > 0 && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px', marginBottom: '8px' }}>
              {animal.tags.slice(0, 3).map(tag => (
                <span
                  key={tag}
                  style={{
                    backgroundColor: 'rgba(255, 255, 255, 0.2)',
                    backdropFilter: 'blur(6px)',
                    WebkitBackdropFilter: 'blur(6px)',
                    color: '#FFFFFF',
                    border: '1px solid rgba(255, 255, 255, 0.25)',
                    fontSize: '0.72rem',
                    fontWeight: 500,
                    padding: '2px 8px',
                    borderRadius: '6px'
                  }}
                >
                  {tag}
                </span>
              ))}
            </div>
          )}

          {/* Short Bio snippet + View Profile hint */}
          <Link
            to={`/animal/${animal.id}`}
            onClick={(e) => e.stopPropagation()}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              borderTop: '1px solid rgba(255, 255, 255, 0.15)',
              paddingTop: '6px',
              marginTop: '2px',
              textDecoration: 'none',
              cursor: 'pointer'
            }}
          >
            <p style={{
              fontSize: '0.78rem',
              color: 'rgba(255, 255, 255, 0.82)',
              margin: 0,
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              flex: 1,
              paddingRight: '8px'
            }}>
              {animal.description || 'รอผู้ใจดีมารับเลี้ยงอยู่นะครับ สุนัขตัวนี้ต้องการบ้านที่อบอุ่น'}
            </p>
            <span style={{
              fontSize: '0.74rem',
              color: '#FDE68A',
              display: 'flex',
              alignItems: 'center',
              gap: '2px',
              flexShrink: 0,
              fontWeight: 600
            }}>
              ดูประวัติ <ChevronRight size={13} />
            </span>
          </Link>
        </div>
      </div>
    </motion.div>
  );
}

export const SwipeCard = memo(SwipeCardComponent);
