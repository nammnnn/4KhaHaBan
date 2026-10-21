import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Heart, X, RotateCcw, SlidersHorizontal, MessageCircle, Search, ShieldAlert, ChevronRight, PawPrint } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { SwipeCard, splitAnimalName } from '../components/SwipeCard';
import { Button, Dialog, EmptyState, useToast } from '../components/ui';
import { FilterModal } from '../components/FilterModal';
import { VerificationPromptModal } from '../components/VerificationPromptModal';
import { FeedCardSkeleton } from '../components/Skeletons';
import { api } from '../services/api';
import { useAppContext } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';
import { calculateDistance, formatDistance, getUserCoordinates, requestUserLocation, getLocationPermission, onLocationPermissionChange } from '../lib/geo';

// Distance is only shown when we have the user's real location — never a guessed one.
const withDistance = (animal, coords) => {
  const distKm = coords && !coords.isFallback && animal.latitude && animal.longitude
    ? calculateDistance(coords.latitude, coords.longitude, animal.latitude, animal.longitude)
    : null;
  return { ...animal, distanceKm: distKm, distance: distKm !== null ? formatDistance(distKm) : '' };
};

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
  const loadSeqRef = useRef(0);       // ignore results from superseded loads
  const hasSwipedRef = useRef(false); // once the user starts swiping, don't reshuffle the deck
  
  const navigate = useNavigate();
  const toast = useToast();
  
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [filters, setFilters] = useState({ maxDistance: 100, animalType: 'all', gender: 'all' });

  const { addMatch } = useAppContext();
  const { user, userVerificationStatus } = useAuth();
  const [showVerificationPrompt, setShowVerificationPrompt] = useState(false);

  const isVerifiedUser = 
    userVerificationStatus === 'verified' ||
    (user?.email && user.email.toLowerCase().trim() === 'songkaen2547@gmail.com') ||
    user?.user_metadata?.is_verified === true ||
    user?.user_metadata?.user_verification_status === 'verified';

  const loadAnimals = async (appliedFilters = filters, forcedCoords = null) => {
    const seq = ++loadSeqRef.current;
    setLoading(true);
    try {
      let currentFilters = appliedFilters;
      
      // ดึงข้อมูลการตั้งค่า, พิกัด GPS และรายการสัตว์พร้อมกันแบบ Parallel ไม่บล็อกกัน
      const [userPrefsResult, coordsResult, data] = await Promise.all([
        appliedFilters === filters && !isFilterOpen
          ? api.getUserPreferences(user?.id).catch(() => ({ maxDistance: 100, animalType: 'all', gender: 'all' }))
          : Promise.resolve(appliedFilters),
        Promise.resolve(forcedCoords || userCoords || null),
        api.getAnimals(user?.id).catch(err => {
          console.error("Failed to fetch animals from API:", err);
          return [];
        })
      ]);

      if (seq !== loadSeqRef.current) return;

      if (appliedFilters === filters && !isFilterOpen && userPrefsResult) {
        currentFilters = userPrefsResult;
        setFilters(userPrefsResult);
      }

      const activeCoords = forcedCoords || coordsResult;
      if (forcedCoords) setUserCoords(forcedCoords);

      const animalsWithDistance = (data || []).map((animal) => withDistance(animal, activeCoords));

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

      // สุ่มสลับลำดับสัตว์เลี้ยง (Shuffle) เพื่อให้หน้า Feed มีความหลากหลาย ไม่ซ้ำซาก
      const randomized = [...filteredData].sort(() => Math.random() - 0.5);
      
      poolRef.current = randomized;
      setCards(randomized.map(makeCard));
      setHistory([]);
      setPendingMatch(null);
    } catch (error) {
      console.error("Failed to fetch animals", error);
    } finally {
      if (seq === loadSeqRef.current) setLoading(false);
    }
  };

  const loadAnimalsRef = useRef(loadAnimals);
  loadAnimalsRef.current = loadAnimals;

  // Use the user's location as soon as the browser allows it — no extra tap needed.
  const applyCoords = useCallback((coords) => {
    if (!coords || coords.isFallback) return;
    setUserCoords(coords);
    if (!hasSwipedRef.current) {
      // Nothing swiped yet: reload so distance filters and ordering use the real location
      loadAnimalsRef.current(undefined, coords);
    } else {
      // Mid-session: just fill in distances without reshuffling the deck
      poolRef.current = poolRef.current.map((a) => withDistance(a, coords));
      setCards((prev) => prev.map((c) => ({ ...withDistance(c, coords), cardKey: c.cardKey })));
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    const locate = async () => {
      // Generous timeout so the user has time to answer the browser's permission prompt
      const coords = await getUserCoordinates(false, 20000);
      if (!cancelled) applyCoords(coords);
    };

    getLocationPermission().then((state) => {
      if (!cancelled && state !== 'denied') locate();
    });
    const stopWatching = onLocationPermissionChange((state) => {
      if (state === 'granted') locate();
    });

    return () => {
      cancelled = true;
      stopWatching();
    };
  }, [applyCoords]);


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
      toast('ระบุตำแหน่งไม่สำเร็จ กรุณาเปิด GPS และอนุญาตให้เบราว์เซอร์เข้าถึงตำแหน่ง', { tone: 'error' });
    } finally {
      setIsLocating(false);
    }
  };

  const removeCard = useCallback(async (cardIdentifier, action) => {
    const swipedAnimal = cardsRef.current.find((card) => (card.cardKey || card.id) === cardIdentifier);
    if (!swipedAnimal) return;

    const realAnimalId = swipedAnimal.id;
    hasSwipedRef.current = true;
    setSwipeTrigger(null);

    if (action === 'right') {
      if (!user) {
        navigate('/login');
        return;
      }
      if (!isVerifiedUser) {
        setShowVerificationPrompt(true);
        return;
      }
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
  }, [user, userVerificationStatus, isVerifiedUser, navigate]);

  const handleConfirmMatch = async () => {
    if (!pendingMatch) return;
    
    const { animal } = pendingMatch;
    const newMatch = await addMatch(animal.id, user?.id);
    setPendingMatch(null);

    if (newMatch) {
      setShowMatch({ match: newMatch, animal });
    } else {
      toast('ส่งคำขอไม่สำเร็จ กรุณาลองอีกครั้ง', { tone: 'error' });
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
      if (direction === 'right') {
        if (!user) {
          navigate('/login');
          return;
        }
        if (!isVerifiedUser) {
          setShowVerificationPrompt(true);
          return;
        }
      }
      setSwipeTrigger({ id: cards[0].cardKey || cards[0].id, direction });
    }
  };

  // DESIGN.md §7.2: keyboard parity for swipe gestures
  const anyOverlayOpen = isFilterOpen || !!pendingMatch || !!showMatch || showVerificationPrompt;
  useEffect(() => {
    const onKey = (e) => {
      if (anyOverlayOpen || loading) return;
      const tag = e.target?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || e.target?.isContentEditable) return;
      if (e.key === 'ArrowLeft') { e.preventDefault(); handleSwipeAction('left'); }
      else if (e.key === 'ArrowRight') { e.preventDefault(); handleSwipeAction('right'); }
      else if (e.key === 'Backspace' && history.length > 0) { e.preventDefault(); handleUndo(); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  return (
    <div className="feed-container">
      <header className="feed-header">
        <h1 className="logo-text">
          4 ขา<span className="logo-text__accent">หาบ้าน</span>
        </h1>
        <div className="feed-header__actions">
          <button className="filter-btn" onClick={() => setIsFilterOpen(true)}>
            <SlidersHorizontal size={18} aria-hidden="true" />
            <span>ตัวกรอง</span>
          </button>
        </div>
      </header>

      {user && !isVerifiedUser && (
        <button className="feed-verify-banner" onClick={() => setShowVerificationPrompt(true)}>
          <ShieldAlert size={20} aria-hidden="true" />
          <span className="feed-verify-banner__text">ยืนยันตัวตนก่อน เพื่อเริ่มส่งคำขอรับเลี้ยง</span>
          <span className="feed-verify-banner__cta">ยืนยันเลย</span>
          <ChevronRight size={18} aria-hidden="true" />
        </button>
      )}

      <FilterModal
        isOpen={isFilterOpen}
        currentFilters={filters}
        userCoords={userCoords}
        onRequestGps={handleRequestGps}
        isLocating={isLocating}
        onClose={() => setIsFilterOpen(false)}
        onApply={handleApplyFilters}
      />

      <div className="card-stack-container">
        {loading ? (
          <FeedCardSkeleton />
        ) : cards.length === 0 ? (
          <EmptyState
            icon={Search}
            title="ไม่พบน้องตามเงื่อนไขที่เลือก"
            text="ลองขยายระยะค้นหา หรือเปลี่ยนชนิดและเพศของสัตว์"
            action={
              <Button variant="secondary" onClick={() => setIsFilterOpen(true)}>
                <SlidersHorizontal size={18} aria-hidden="true" /> ปรับตัวกรอง
              </Button>
            }
          />
        ) : (
          [...cards].reverse().map((animal, reversedIndex, arr) => {
            const index = arr.length - 1 - reversedIndex;
            // Only render the top 2 cards
            if (index > 1) return null;
            return (
              <SwipeCard
                key={animal.cardKey || animal.id}
                animal={animal}
                isFront={index === 0}
                isSecond={index === 1}
                swipeTrigger={swipeTrigger}
                onRemove={removeCard}
                canSwipeRight={isVerifiedUser}
                onBlockedSwipeRight={() => setShowVerificationPrompt(true)}
              />
            );
          })
        )}
      </div>

      {loading ? (
        <div className="swiper-actions" aria-hidden="true">
          <div className="skeleton skeleton-circle" style={{ width: '64px', height: '64px' }} />
          <div className="skeleton skeleton-circle" style={{ width: '64px', height: '64px' }} />
        </div>
      ) : cards.length > 0 && (
        <div className="swiper-actions">
          {history.length > 0 ? (
            <button className="swiper-btn btn-undo" onClick={handleUndo} aria-label="ย้อนกลับการ์ดก่อนหน้า" title="ย้อนกลับ (Backspace)">
              <RotateCcw size={20} />
            </button>
          ) : (
            <span className="swiper-btn-spacer" aria-hidden="true" />
          )}
          <button className="swiper-btn btn-nope" onClick={() => handleSwipeAction('left')} aria-label="ข้าม" title="ข้าม (←)">
            <X size={28} strokeWidth={2.5} />
          </button>
          <button className="swiper-btn btn-like" onClick={() => handleSwipeAction('right')} aria-label="ถูกใจ สนใจรับเลี้ยง" title="ถูกใจ (→)">
            <Heart size={28} fill="currentColor" strokeWidth={0} />
          </button>
          <span className="swiper-btn-spacer" aria-hidden="true" />
        </div>
      )}

      {/* Confirm before sending an adoption request (DESIGN.md §7.10) */}
      <Dialog
        open={!!pendingMatch}
        onClose={handleCancelMatch}
        title={pendingMatch ? `ส่งคำขอรับเลี้ยง${splitAnimalName(pendingMatch.animal.name).main}?` : ''}
        actions={
          <>
            <Button variant="secondary" onClick={handleCancelMatch}>ยังก่อน</Button>
            <Button variant="primary" onClick={handleConfirmMatch}>ส่งคำขอรับเลี้ยง</Button>
          </>
        }
      >
        {pendingMatch && (
          <>ระบบจะส่งข้อมูลแนะนำตัวของคุณให้ {pendingMatch.animal.shelter || 'มูลนิธิ'} เพื่อตรวจสอบและเปิดห้องแชทกับคุณ</>
        )}
      </Dialog>

      {/* Request-sent moment (DESIGN.md §7.3) */}
      <AnimatePresence>
        {showMatch && (
          <motion.div
            className="match-overlay"
            role="dialog"
            aria-modal="true"
            aria-labelledby="match-title"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            <div className="match-content">
              <motion.div
                className="match-photo"
                initial={{ scale: 0.6, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ type: 'spring', stiffness: 500, damping: 22, delay: 0.05 }}
              >
                {showMatch.animal?.images?.[0] ? (
                  <img src={showMatch.animal.images[0]} alt="" />
                ) : (
                  <div className="match-photo__placeholder"><PawPrint size={48} /></div>
                )}
                <span className="match-photo__heart" aria-hidden="true">
                  <Heart size={20} fill="currentColor" strokeWidth={0} />
                </span>
              </motion.div>
              <h2 id="match-title" className="match-title">
                ส่งคำขอรับเลี้ยง{splitAnimalName(showMatch.animal?.name).main}แล้ว
              </h2>
              <p className="match-text">
                {showMatch.animal?.shelter || 'มูลนิธิ'} จะตรวจสอบข้อมูลของคุณ แล้วตอบกลับในกล่องข้อความ
              </p>
              <div className="match-actions">
                <Button variant="primary" block onClick={() => navigate('/matches')}>
                  <MessageCircle size={20} aria-hidden="true" /> ดูสถานะในกล่องข้อความ
                </Button>
                <Button variant="ghost" onDark block onClick={() => setShowMatch(false)}>
                  ดูน้องตัวอื่นต่อ
                </Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <VerificationPromptModal
        isOpen={showVerificationPrompt}
        onClose={() => setShowVerificationPrompt(false)}
        fromPath="/"
      />
    </div>
  );
}

export default Feed;
