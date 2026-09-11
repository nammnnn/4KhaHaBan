import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Heart, X, RotateCcw, Loader2, SlidersHorizontal, MessageCircle, Search, Sparkles, MapPin } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { SwipeCard } from '../components/SwipeCard';
import { FilterModal } from '../components/FilterModal';
import { FeedCardSkeleton } from '../components/Skeletons';
import { api } from '../services/api';
import { useAppContext } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';
import { calculateDistance, formatDistance, getUserCoordinates, requestUserLocation, DEFAULT_USER_COORDS } from '../lib/geo';

const makeCard = (animal) => ({
  ...animal,
  cardKey: `${animal.id}_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`
});

function Feed() {
  const [cards, setCards] = useState([]);
  const cardsRef = useRef(cards);
  cardsRef.current = cards;
  const poolRef = useRef([]);
  const [loading, setLoading] = useState(true);
  const [showMatch, setShowMatch] = useState(false);
  const [swipeTrigger, setSwipeTrigger] = useState(null);
  const [history, setHistory] = useState([]);
  const [pendingMatch, setPendingMatch] = useState(null);
  const [userCoords, setUserCoords] = useState(null);
  const [isLocating, setIsLocating] = useState(false);
  
  const navigate = useNavigate();
  
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [filters, setFilters] = useState({ maxDistance: 100, animalType: 'all', gender: 'all' });

  const { addMatch } = useAppContext();
  const { user } = useAuth();

  const loadAnimals = async (appliedFilters = filters, forcedCoords = null) => {
    setLoading(true);
    try {
      let currentFilters = appliedFilters;
      
      // ดึงข้อมูลการตั้งค่า, พิกัด GPS และรายการสัตว์พร้อมกันแบบ Parallel ไม่บล็อกกัน
      const [userPrefsResult, coordsResult, data] = await Promise.all([
        appliedFilters === filters && !isFilterOpen
          ? api.getUserPreferences(user?.id).catch(() => ({ maxDistance: 100, animalType: 'all', gender: 'all' }))
          : Promise.resolve(appliedFilters),
        forcedCoords ? Promise.resolve(forcedCoords) : (userCoords ? Promise.resolve(userCoords) : getUserCoordinates(true, 1800)),
        api.getAnimals(user?.id).catch(err => {
          console.error("Failed to fetch animals from API:", err);
          return [];
        })
      ]);

      if (appliedFilters === filters && !isFilterOpen && userPrefsResult) {
        currentFilters = userPrefsResult;
        setFilters(userPrefsResult);
      }

      const activeCoords = forcedCoords || coordsResult || DEFAULT_USER_COORDS;
      if (!userCoords || forcedCoords) {
        setUserCoords(activeCoords);
      }

      // คำนวณระยะทางจริงจาก GPS ระหว่างผู้ใช้กับสัตว์แต่ละตัว
      const animalsWithDistance = (data || []).map(animal => {
        let distKm = null;
        if (animal.latitude && animal.longitude && activeCoords) {
          distKm = calculateDistance(activeCoords.latitude, activeCoords.longitude, animal.latitude, animal.longitude);
        } else if (animal.distance && !isNaN(parseFloat(animal.distance))) {
          distKm = parseFloat(animal.distance);
        }

        const distFormatted = distKm !== null ? formatDistance(distKm) : (animal.distance || 'ใกล้คุณ');

        return {
          ...animal,
          distanceKm: distKm,
          distance: distFormatted
        };
      });

      // กรองตามเงื่อนไข ชนิด เพศ และระยะทางจริง
      let filteredData = animalsWithDistance.filter(animal => {
        if (currentFilters.animalType && currentFilters.animalType !== 'all' && animal.type !== currentFilters.animalType) return false;
        if (currentFilters.gender && currentFilters.gender !== 'all' && animal.gender !== currentFilters.gender) return false;
        if (currentFilters.maxDistance && currentFilters.maxDistance < 300 && animal.distanceKm !== null) {
          if (animal.distanceKm > currentFilters.maxDistance) {
            return false;
          }
        }
        return true;
      });

      // ป้องกันหน้าปัดว่างบนมือถือ: กรณีผู้ใช้อยู่นอกเขตตัวกรอง (เช่น ต่างจังหวัด หรือไกลกว่าระยะที่ตั้งไว้)
      // หากไม่มีสัตว์ในระยะ แต่มีสัตว์ชนิดที่เลือก ให้แสดงสัตว์ทั้งหมดที่มีโดยเรียงจากตัวที่ใกล้ที่สุด
      if (filteredData.length === 0 && animalsWithDistance.length > 0) {
        const typeGenderFiltered = animalsWithDistance.filter(animal => {
          if (currentFilters.animalType && currentFilters.animalType !== 'all' && animal.type !== currentFilters.animalType) return false;
          if (currentFilters.gender && currentFilters.gender !== 'all' && animal.gender !== currentFilters.gender) return false;
          return true;
        });
        if (typeGenderFiltered.length > 0) {
          filteredData = typeGenderFiltered;
        }
      }

      // จัดเรียงน้องที่อยู่ใกล้ตัวผู้ใช้มากที่สุดขึ้นมาก่อน
      filteredData.sort((a, b) => {
        if (a.distanceKm === null) return 1;
        if (b.distanceKm === null) return -1;
        return a.distanceKm - b.distanceKm;
      });
      
      poolRef.current = filteredData;
      setCards(filteredData.map(makeCard));
      setHistory([]);
      setPendingMatch(null);
    } catch (error) {
      console.error("Failed to fetch animals", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAnimals();
  }, [user?.id]);

  const handleApplyFilters = (newFilters) => {
    setFilters(newFilters);
    setIsFilterOpen(false);
    loadAnimals(newFilters);
  };

  const handleRequestGps = async () => {
    setIsLocating(true);
    try {
      const coords = await requestUserLocation(8000);
      setUserCoords(coords);
      await loadAnimals(filters, coords);
    } catch (err) {
      console.warn('GPS permission denied or unavailable:', err);
      alert('ไม่สามารถดึงพิกัด GPS ได้ กรุณาเปิด GPS และอนุญาตการเข้าถึงตำแหน่งในการตั้งค่าเบราว์เซอร์หรือโทรศัพท์ของคุณ');
    } finally {
      setIsLocating(false);
    }
  };

  const removeCard = useCallback(async (cardIdentifier, action) => {
    const swipedAnimal = cardsRef.current.find((card) => (card.cardKey || card.id) === cardIdentifier);
    if (!swipedAnimal) return;

    const realAnimalId = swipedAnimal.id;
    setSwipeTrigger(null);

    if (action === 'right') {
      api.submitSwipe(realAnimalId, user?.id, 'like');
      setPendingMatch({ animal: swipedAnimal, id: cardIdentifier });
      // สัตว์ที่ถูกใจแล้ว จะตัดออกจาก pool ถาวร ไม่นำกลับมาวนซ้ำ
      poolRef.current = poolRef.current.filter((a) => a.id !== realAnimalId);
    } else {
      // ปัดข้าม (Nope): ยังคงอยู่ใน pool เพื่อรอการวนกลับมา
      api.submitSwipe(realAnimalId, user?.id, 'nope');
      setHistory((prev) => [...prev, { animal: swipedAnimal, action: 'left' }]);
    }

    setCards((prev) => {
      const remaining = prev.filter((card) => (card.cardKey || card.id) !== cardIdentifier);

      // ระบบเติมการ์ดวนลูปอัตโนมัติในเบื้องหลัง (Seamless Infinite Swipe)
      // เมื่อการ์ดในมือเหลือ 3 ใบ หรือน้อยกว่า ให้เติมการ์ดจาก pool มาต่อท้ายสำรับทันที
      if (remaining.length <= 3 && poolRef.current.length > 0) {
        const remainingIds = new Set(remaining.map((c) => c.id));
        let candidates = poolRef.current.filter((a) => !remainingIds.has(a.id));

        if (candidates.length === 0) {
          candidates = [...poolRef.current];
        }

        const shuffled = [...candidates].sort(() => Math.random() - 0.5);
        const newCards = shuffled.map(makeCard);
        return [...remaining, ...newCards];
      }

      if (remaining.length === 0 && poolRef.current.length > 0) {
        const shuffled = [...poolRef.current].sort(() => Math.random() - 0.5);
        return shuffled.map(makeCard);
      }

      return remaining;
    });
  }, [user?.id]);

  const handleConfirmMatch = async () => {
    if (!pendingMatch) return;
    
    const newMatch = await addMatch(pendingMatch.animal.id, user?.id);
    setPendingMatch(null);
    
    if (newMatch) {
      setShowMatch(newMatch);
    }
  };

  const handleCancelMatch = () => {
    if (!pendingMatch) return;
    setCards((prev) => [makeCard(pendingMatch.animal), ...prev]);
    if (!poolRef.current.some((a) => a.id === pendingMatch.animal.id)) {
      poolRef.current.push(pendingMatch.animal);
    }
    setPendingMatch(null);
  };

  const handleUndo = () => {
    if (history.length === 0) return;
    const lastAction = history[history.length - 1];
    setHistory((prev) => prev.slice(0, -1));
    setCards((prev) => [makeCard(lastAction.animal), ...prev]);
  };

  const handleSwipeAction = (direction) => {
    if (cards.length > 0) {
      setSwipeTrigger({ id: cards[0].cardKey || cards[0].id, direction });
    }
  };

  return (
    <div className="feed-container" style={{ backgroundColor: '#FAF8F5', height: '100%', maxHeight: '100%', overflow: 'hidden' }}>
      {/* Top Bar */}
      <div className="feed-header">
        <h1 className="logo-text" style={{ fontSize: '1.25rem', fontWeight: 700, margin: 0, color: '#111827', whiteSpace: 'nowrap' }}>
          4 ขา<span style={{ color: '#D97706' }}>หาบ้าน</span>
        </h1>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button
            className="filter-btn"
            onClick={handleRequestGps}
            disabled={isLocating}
            title={userCoords && !userCoords.isFallback ? 'ระบุพิกัด GPS จริงแล้ว (แตะเพื่ออัปเดต)' : 'แตะเพื่อขอสิทธิ์และระบุพิกัด GPS จริงของคุณ'}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '36px',
              height: '36px',
              padding: 0,
              borderRadius: '50%',
              backgroundColor: userCoords && !userCoords.isFallback ? '#ECFDF5' : '#FFFBEB',
              border: userCoords && !userCoords.isFallback ? '1px solid #A7F3D0' : '1px solid #FDE68A',
              color: userCoords && !userCoords.isFallback ? '#065F46' : '#92400E',
              cursor: 'pointer',
              transition: 'all 0.15s ease',
              flexShrink: 0
            }}
          >
            {isLocating ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              <MapPin size={16} />
            )}
          </button>

          <button
            className="filter-btn"
            onClick={() => setIsFilterOpen(true)}
          >
            <SlidersHorizontal size={15} color="#D97706" />
            <span>ตัวกรอง</span>
          </button>
        </div>
      </div>

      <FilterModal 
        isOpen={isFilterOpen} 
        currentFilters={filters}
        userCoords={userCoords}
        onRequestGps={handleRequestGps}
        isLocating={isLocating}
        onClose={() => setIsFilterOpen(false)} 
        onApply={handleApplyFilters} 
      />

      {/* Card Stack */}
      <div className="card-stack-container">
        {loading ? (
          <FeedCardSkeleton />
        ) : cards.length === 0 ? (
          <div className="empty-state" style={{
            textAlign: 'center',
            padding: '40px 24px',
            backgroundColor: '#FFFFFF',
            borderRadius: '16px',
            border: '1px solid #E5E7EB',
            maxWidth: '440px',
            margin: '0 auto',
            boxShadow: '0 1px 3px rgba(0,0,0,0.02)'
          }}>
            <div style={{
              width: '56px',
              height: '56px',
              borderRadius: '12px',
              backgroundColor: '#FEF3C7',
              color: '#D97706',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 16px'
            }}>
              <Search size={28} />
            </div>
            <h3 style={{ fontSize: '1.2rem', fontWeight: 700, color: '#111827', marginBottom: '8px' }}>
              ไม่พบสัตว์เลี้ยงตามเงื่อนไขที่เลือก
            </h3>
            <p style={{ fontSize: '0.875rem', color: '#6B7280', marginBottom: '20px', lineHeight: 1.5 }}>
              ลองขยายรัศมีการค้นหา หรือปรับเปลี่ยนตัวกรองเพื่อดูสัตว์เลี้ยงเพิ่มเติมครับ
            </p>
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
              <button
                className="btn btn-secondary"
                onClick={() => setIsFilterOpen(true)}
                style={{
                  height: '42px',
                  padding: '0 20px',
                  borderRadius: '10px',
                  fontSize: '0.88rem',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px'
                }}
              >
                <SlidersHorizontal size={16} /> ปรับเปลี่ยนตัวกรอง
              </button>
            </div>
          </div>
        ) : (
          [...cards].reverse().map((animal, reversedIndex, arr) => {
            const index = arr.length - 1 - reversedIndex;
            // Only render top 2 cards for optimal performance and clean stacking
            if (index > 1) return null;
            return (
              <SwipeCard 
                key={animal.cardKey || animal.id}
                animal={animal}
                isFront={index === 0}
                isSecond={index === 1}
                swipeTrigger={swipeTrigger}
                onRemove={removeCard}
              />
            );
          })
        )}

        {/* Match Animation Overlay */}
        <AnimatePresence>
          {showMatch && (
            <motion.div 
              className="match-overlay" 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2, ease: 'easeOut' }}
              onClick={() => setShowMatch(false)}
              style={{ pointerEvents: 'auto', backgroundColor: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)' }}
            >
              <motion.div 
                initial={{ opacity: 0, scale: 0.96, y: 12 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.96, y: 8 }}
                transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
                onClick={e => e.stopPropagation()}
                className="match-content"
                style={{
                  backgroundColor: '#FFFFFF',
                  borderRadius: '16px',
                  border: '1px solid #E5E7EB',
                  padding: '36px 28px',
                  maxWidth: '420px',
                  width: '90%',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  textAlign: 'center',
                  boxShadow: '0 20px 48px rgba(0,0,0,0.12)'
                }}
              >
                <div style={{
                  width: '56px',
                  height: '56px',
                  borderRadius: '12px',
                  backgroundColor: '#ECFDF5',
                  color: '#059669',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginBottom: '16px'
                }}>
                  <Heart size={28} fill="currentColor" />
                </div>
                <h2 style={{ fontSize: '1.35rem', fontWeight: 700, color: '#111827', margin: '0 0 8px' }}>
                  ส่งคำขอรับเลี้ยงสำเร็จ!
                </h2>
                <p style={{ color: '#6B7280', fontSize: '0.9rem', lineHeight: 1.5, margin: '0 0 24px' }}>
                  ส่งข้อมูลแนะนำตัวไปยังศูนย์พักพิงแล้ว เจ้าหน้าที่จะตรวจสอบและติดต่อกลับผ่านกล่องข้อความ
                </p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', width: '100%' }}>
                  <button 
                    onClick={() => navigate(`/matches`)}
                    style={{
                      height: '42px',
                      backgroundColor: '#D97706',
                      color: '#FFFFFF',
                      border: 'none',
                      borderRadius: '8px',
                      fontSize: '0.875rem',
                      fontWeight: 600,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '6px'
                    }}
                  >
                    <MessageCircle size={18} /> ดูสถานะคำขอในกล่องข้อความ
                  </button>
                  <button 
                    onClick={() => setShowMatch(false)}
                    style={{
                      height: '42px',
                      backgroundColor: '#FFFFFF',
                      color: '#374151',
                      border: '1px solid #D1D5DB',
                      borderRadius: '8px',
                      fontSize: '0.875rem',
                      fontWeight: 500,
                      cursor: 'pointer'
                    }}
                  >
                    ค้นหาสัตว์ตัวต่อไป
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Swiper Actions */}
      {loading ? (
        <div className="swiper-actions">
          <div className="skeleton skeleton-circle" style={{ width: '44px', height: '44px' }} />
          <div className="skeleton skeleton-circle" style={{ width: '58px', height: '58px' }} />
          <div className="skeleton skeleton-circle" style={{ width: '58px', height: '58px' }} />
        </div>
      ) : (cards.length > 0 || history.length > 0) && (
        <div className="swiper-actions">
          <button 
            className="swiper-btn btn-undo" 
            onClick={handleUndo} 
            disabled={history.length === 0} 
            title="ย้อนกลับ"
          >
            <RotateCcw size={18} />
          </button>
          {cards.length > 0 && (
            <>
              <button
                aria-label="Pass"
                className="swiper-btn btn-nope"
                onClick={() => handleSwipeAction('left')}
                title="ข้าม"
              >
                <X size={26} strokeWidth={2.5} />
              </button>
              <button
                aria-label="Like"
                className="swiper-btn btn-like"
                onClick={() => handleSwipeAction('right')}
                title="สนใจรับเลี้ยง"
              >
                <Heart size={26} fill="currentColor" strokeWidth={0} />
              </button>
            </>
          )}
        </div>
      )}

      {/* Confirmation Dialog Overlay */}
      <AnimatePresence>
        {pendingMatch && (
          <motion.div 
            className="confirm-dialog-overlay" 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            onClick={handleCancelMatch}
            style={{ backgroundColor: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)' }}
          >
            <motion.div 
              className="confirm-dialog-content" 
              initial={{ opacity: 0, scale: 0.96, y: 12 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 8 }}
              transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
              onClick={e => e.stopPropagation()}
              style={{
                backgroundColor: '#FFFFFF',
                borderRadius: '16px',
                border: '1px solid #E5E7EB',
                padding: '28px 24px',
                maxWidth: '440px',
                boxShadow: '0 20px 48px rgba(0,0,0,0.12)',
                animation: 'none'
              }}
            >
              <div className="confirm-dialog-title" style={{ fontSize: '1.15rem', fontWeight: 700, color: '#111827', marginBottom: '8px' }}>
                ส่งคำขอแนะนำตัวเพื่อรับเลี้ยง {pendingMatch.animal.name}
              </div>
              <div className="confirm-dialog-text" style={{ fontSize: '0.875rem', color: '#6B7280', lineHeight: 1.5, marginBottom: '20px' }}>
                ระบบจะส่งข้อมูลประวัติเบื้องต้นของคุณให้กับทาง {pendingMatch.animal.shelter || 'มูลนิธิ'} เพื่อให้เจ้าหน้าที่ทำการตรวจสอบและเปิดห้องสนทนา
              </div>
              <div className="confirm-dialog-actions" style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                <button
                  className="btn btn-secondary"
                  onClick={handleCancelMatch}
                  style={{ height: '40px', padding: '0 16px', borderRadius: '8px' }}
                >
                  ยกเลิก
                </button>
                <button
                  className="btn btn-primary"
                  onClick={handleConfirmMatch}
                  style={{ height: '40px', padding: '0 18px', borderRadius: '8px' }}
                >
                  ยืนยันการส่งคำขอ
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default Feed;
