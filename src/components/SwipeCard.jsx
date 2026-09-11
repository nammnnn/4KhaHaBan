import { useEffect, memo } from 'react';
import { motion, useMotionValue, useTransform, animate } from 'framer-motion';
import { MapPin, Heart, X, CheckCircle2 } from 'lucide-react';
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
  const opacityRight = useTransform(x, [0, 80], [0, 1]);
  const opacityLeft = useTransform(x, [0, -80], [0, 1]);

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
    
    if (offset > 100 || velocity > 500) {
      Promise.all([
        animate(x, 500, { duration: 0.2 })
      ]).then(() => notifyRemove('right'));
    } else if (offset < -100 || velocity < -500) {
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
    y: 12,
    opacity: 0.92
  } : isFront ? {
    scale: 1,
    y: 0,
    opacity: 1
  } : {
    scale: 0.92,
    y: 20,
    opacity: 0
  };

  return (
    <motion.div
      className="swipe-card"
      style={{
        x,
        rotate,
        zIndex: isFront ? 10 : isSecond ? 5 : 0,
        pointerEvents: isFront ? 'auto' : 'none',
        borderRadius: '16px',
        overflow: 'hidden',
        border: '1px solid #E5E7EB',
        boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
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
      initial={isSecond ? { scale: 0.92, y: 20, opacity: 0 } : false}
    >
      <div className="card-image-container">
        <img 
          src={animal.images[0]} 
          alt={animal.name} 
          draggable="false" 
          loading={isFront ? "eager" : "lazy"} 
          decoding="async" 
          fetchPriority={isFront ? "high" : "auto"}
        />
        
        {/* Status Chip (Top Left) */}
        <div style={{
          position: 'absolute',
          top: '16px',
          left: '16px',
          backgroundColor: '#FFFFFF',
          padding: '4px 10px',
          borderRadius: '6px',
          border: '1px solid #A7F3D0',
          boxShadow: '0 1px 2px rgba(0,0,0,0.06)'
        }}>
          <span style={{
            fontSize: '0.78rem',
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

        {/* Like/Nope Stamps */}
        <motion.div 
          className="stamp stamp-nope" 
          style={{ 
            opacity: opacityLeft,
            border: '3px solid #DC2626',
            color: '#DC2626',
            backgroundColor: 'rgba(255, 255, 255, 0.92)',
            borderRadius: '12px',
            padding: '8px 24px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            boxShadow: '0 4px 16px rgba(220, 38, 38, 0.2)',
            fontWeight: 700,
            fontSize: '1.75rem',
            letterSpacing: '0.5px'
          }}
        >
          <X size={32} strokeWidth={2.5} /> ข้าม
        </motion.div>
        
        <motion.div 
          className="stamp stamp-like" 
          style={{ 
            opacity: opacityRight,
            border: '3px solid #059669',
            color: '#059669',
            backgroundColor: 'rgba(255, 255, 255, 0.92)',
            borderRadius: '12px',
            padding: '8px 24px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            boxShadow: '0 4px 16px rgba(5, 150, 105, 0.2)',
            fontWeight: 700,
            fontSize: '1.75rem',
            letterSpacing: '0.5px'
          }}
        >
          <Heart size={30} fill="currentColor" strokeWidth={0} /> สนใจ
        </motion.div>

        <div className="card-gradient"></div>
      </div>

      <div className="card-info-section" onClick={(e) => { e.stopPropagation(); document.querySelector(`.info-btn-${animal.id}`)?.click(); }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
          <div>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#111827', margin: 0 }}>{animal.name}</h2>
            <p style={{ fontSize: '0.85rem', color: '#6B7280', margin: '4px 0 0 0', display: 'flex', alignItems: 'center', gap: '4px' }}>
              <MapPin size={15} color="#D97706" /> {animal.shelter || 'ศูนย์พักพิงสัตว์'}{animal.distance ? ` (${animal.distance})` : ''}
            </p>
          </div>
          <span style={{ fontSize: '1rem', fontWeight: 600, color: '#374151' }}>{animal.age}</span>
        </div>
        
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '8px' }}>
          {animal.tags.slice(0, 3).map(tag => (
            <span
              key={tag}
              style={{
                backgroundColor: '#F3F4F6',
                color: '#374151',
                border: '1px solid #E5E7EB',
                fontSize: '0.75rem',
                fontWeight: 500,
                padding: '3px 8px',
                borderRadius: '6px'
              }}
            >
              {tag}
            </span>
          ))}
        </div>
        
        <p style={{
          fontSize: '0.85rem',
          color: '#4B5563',
          marginTop: '8px',
          borderTop: '1px solid #F3F4F6',
          paddingTop: '10px',
          display: '-webkit-box',
          WebkitLineClamp: 2,
          WebkitBoxOrient: 'vertical',
          overflow: 'hidden',
          lineHeight: 1.5
        }}>
          {animal.description || 'รอผู้ใจดีมารับเลี้ยงอยู่นะครับ สุนัขตัวนี้ต้องการบ้านที่อบอุ่นและให้ความรัก'}
        </p>
        
        {/* Hidden link for full profile */}
        <Link to={`/animal/${animal.id}`} className={`info-btn-${animal.id}`} style={{ display: 'none' }}></Link>
      </div>
    </motion.div>
  );
}

export const SwipeCard = memo(SwipeCardComponent);
