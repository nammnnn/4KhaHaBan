import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Heart, X, RotateCcw, SlidersHorizontal, MessageCircle, Search, ShieldAlert, ChevronRight, PawPrint, MapPin, Loader2 } from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { SwipeCard } from '../components/SwipeCard';
import { displayNames } from '../lib/animal';
import { hasAllTags, FILTERABLE_TAG_IDS } from '../lib/tags';
import { useI18n, localizeDistance } from '../i18n';
import { Button, Dialog, EmptyState, useToast } from '../components/ui';
import { FilterModal } from '../components/FilterModal';
import { VerificationPromptModal } from '../components/VerificationPromptModal';
import { FeedCardSkeleton } from '../components/Skeletons';
import { api } from '../services/api';
import { useAppContext } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';
import {
  calculateDistance, formatDistance, getUserCoordinates, requestUserLocation, getLocationPermission,
  onLocationPermissionChange, getAreaLabel, loadSavedLocation, saveLocation, clearSavedLocation,
} from '../lib/geo';
import { LocationSheet } from '../components/LocationSheet';
import { FeedDetailPanel } from '../components/FeedDetailPanel';
import { FeedOnboarding, hasSeenFeedOnboarding, markFeedOnboardingSeen } from '../components/FeedOnboarding';
import { MOTION } from '../lib/motion';
import { PawBurst, PawConfetti } from '../components/motion/PawMotion';

// Distance is only shown when we have the user's real location — never a guessed one.
const withDistance = (animal, coords) => {
  const distKm = coords && !coords.isFallback && animal.latitude && animal.longitude
    ? calculateDistance(coords.latitude, coords.longitude, animal.latitude, animal.longitude)
    : null;
  return { ...animal, distanceKm: distKm, distance: distKm !== null ? formatDistance(distKm) : '' };
};

// Keep the deck across navigation (e.g. open a profile and come back) and page reloads
// in the same tab, so the animal the user was looking at doesn't disappear.
const DECK_TTL_MS = 30 * 60 * 1000;
const deckKey = (userId) => `4kh_feed_deck_${userId || 'guest'}`;

function readDeck(userId) {
  try {
    const deck = JSON.parse(sessionStorage.getItem(deckKey(userId)) || 'null');
    if (!deck || Date.now() - deck.savedAt > DECK_TTL_MS || !deck.cards?.length) return null;
    return deck;
  } catch (e) {
    return null;
  }
}

function writeDeck(userId, deck) {
  try {
    sessionStorage.setItem(deckKey(userId), JSON.stringify({ ...deck, savedAt: Date.now() }));
  } catch (e) {
    // storage full or blocked — the deck just won't survive navigation
  }
}

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
  // 'locating' | 'ready' | 'unavailable' | 'denied'  (DESIGN.md §7.15)
  const [locStatus, setLocStatus] = useState('locating');
  const [locLabel, setLocLabel] = useState('');
  const [isLocSheetOpen, setIsLocSheetOpen] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const locSourceRef = useRef(null); // 'gps' | 'manual'
  const loadSeqRef = useRef(0);       // ignore results from superseded loads
  const [tagCounts, setTagCounts] = useState({}); // lifestyle tag id -> animals available, for the filter sheet
  const hasSwipedRef = useRef(false); // once the user starts swiping, don't reshuffle the deck
  
  const navigate = useNavigate();
  const toast = useToast();
  const { t, lang } = useI18n();
  const nameOf = (animal) => displayNames(animal?.name, lang).primary;
  const [searchParams, setSearchParams] = useSearchParams();
  
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [filters, setFilters] = useState({ maxDistance: 100, animalType: 'all', gender: 'all' });

  const { addMatch } = useAppContext();
  const { user, profile, userVerificationStatus } = useAuth();
  const myAvatar = profile?.avatar_url || user?.user_metadata?.avatar_url || null;
  const myInitial = (profile?.full_name || user?.user_metadata?.full_name || user?.email || '?').trim().charAt(0).toUpperCase();
  // Bumped on each like / skip / rewind to replay the button's little animation (DESIGN.md §6.1)
  const [likePulse, setLikePulse] = useState(0);
  const [nopePulse, setNopePulse] = useState(0);
  const [undoPulse, setUndoPulse] = useState(0);
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
      setTagCounts(Object.fromEntries(FILTERABLE_TAG_IDS.map((id) => [id, (data || []).filter((a) => hasAllTags(a.tags, [id])).length])));

      // กรองตามเงื่อนไข ชนิด เพศ และระยะทางจริง
      let filteredData = animalsWithDistance.filter(animal => {
        if (currentFilters.animalType && currentFilters.animalType !== 'all' && animal.type !== currentFilters.animalType) return false;
        if (currentFilters.gender && currentFilters.gender !== 'all' && animal.gender !== currentFilters.gender) return false;
        if (!hasAllTags(animal.tags, currentFilters.living)) return false;
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
          if (!hasAllTags(animal.tags, currentFilters.living)) return false;
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

    // A place the user picked earlier wins over GPS until they choose "use current location"
    const saved = loadSavedLocation();
    if (saved) {
      locSourceRef.current = 'manual';
      setLocStatus('ready');
      setLocLabel(saved.label || t('feed.savedArea'));
      applyCoords(saved);
      return undefined;
    }

    const locate = async () => {
      setLocStatus('locating');
      // Generous timeout so the user has time to answer the browser's permission prompt
      const coords = await getUserCoordinates(false, 20000);
      if (cancelled || locSourceRef.current === 'manual') return;
      if (coords) {
        locSourceRef.current = 'gps';
        setLocStatus('ready');
        applyCoords(coords);
        setLocLabel(t('feed.currentLocation'));
        const area = await getAreaLabel(coords.latitude, coords.longitude).catch(() => null);
        if (!cancelled && area && locSourceRef.current === 'gps') setLocLabel(area);
      } else {
        const state = await getLocationPermission();
        if (!cancelled) setLocStatus(state === 'denied' ? 'denied' : 'unavailable');
      }
    };

    getLocationPermission().then((state) => {
      if (cancelled) return;
      if (state === 'denied') setLocStatus('denied');
      else locate();
    });
    const stopWatching = onLocationPermissionChange((state) => {
      if (state === 'granted' && locSourceRef.current !== 'manual') locate();
      if (state === 'denied' && locSourceRef.current !== 'manual') setLocStatus('denied');
    });

    return () => {
      cancelled = true;
      stopWatching();
    };
  }, [applyCoords]);


  useEffect(() => {
    const deck = readDeck(user?.id);
    if (deck) {
      poolRef.current = deck.pool || [];
      setCards(deck.cards);
      setHistory(deck.history || []);
      if (deck.filters) setFilters(deck.filters);
      hasSwipedRef.current = true; // location updates only fill in distances, never reshuffle
      setLoading(false);
      return;
    }
    loadAnimals();
  }, [user?.id]);

  // Save the deck whenever it changes (only the next few cards are needed to resume)
  useEffect(() => {
    if (loading || cards.length === 0) return;
    writeDeck(user?.id, {
      cards: cards.slice(0, 20),
      pool: poolRef.current,
      history: history.slice(-10),
      filters,
    });
  }, [cards, history, filters, loading, user?.id]);

  const handleApplyFilters = (newFilters) => {
    setFilters(newFilters);
    setIsFilterOpen(false);
    loadAnimals(newFilters);
  };

  const labelFromCoords = async (coords, fallback) => {
    setLocLabel(fallback);
    const area = await getAreaLabel(coords.latitude, coords.longitude).catch(() => null);
    if (area) setLocLabel(area);
    return area || fallback;
  };

  // "ใช้ตำแหน่งปัจจุบัน" in the location sheet
  const handleUseGps = async () => {
    setIsLocating(true);
    try {
      const coords = await requestUserLocation(10000);
      clearSavedLocation();
      locSourceRef.current = 'gps';
      setUserCoords(coords);
      setLocStatus('ready');
      setIsLocSheetOpen(false);
      await loadAnimals(filters, coords);
      const fallback = t('feed.currentLocation');
      const area = await labelFromCoords(coords, fallback);
      toast(area === fallback ? t('feed.showingNearYou') : t('feed.showingNear', { area }), { tone: 'success' });
    } catch (err) {
      if (err?.code === 1) {
        setLocStatus('denied'); // sheet stays open and shows how to enable it
      } else {
        toast(t('feed.locateFailed'), { tone: 'error' });
      }
    } finally {
      setIsLocating(false);
    }
  };

  // Area picked by search in the location sheet
  const handlePickPlace = async ({ latitude, longitude, name }) => {
    const coords = { latitude, longitude, isFallback: false };
    locSourceRef.current = 'manual';
    setUserCoords(coords);
    setLocStatus('ready');
    setIsLocSheetOpen(false);
    loadAnimals(filters, coords);
    const area = await labelFromCoords(coords, name);
    saveLocation({ ...coords, label: area });
    toast(t('feed.showingNear', { area }), { tone: 'success' });
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
      setLikePulse((n) => n + 1);
      setPendingMatch({ animal: swipedAnimal, id: cardIdentifier });
      // สัตว์ที่ถูกใจแล้ว จะตัดออกจาก pool ถาวร ไม่นำกลับมาวนซ้ำ
      poolRef.current = poolRef.current.filter((a) => a.id !== realAnimalId);
    } else {
      // ปัดข้าม (Nope): ยังคงอยู่ใน pool เพื่อรอการวนกลับมา
      api.submitSwipe(realAnimalId, user?.id, 'nope');
      setNopePulse((n) => n + 1);
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
      toast(t('common.retryError'), { tone: 'error' });
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
    setUndoPulse((n) => n + 1);
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

  // Deep links from the profile page: /?sheet=location or /?sheet=filters
  useEffect(() => {
    const sheet = searchParams.get('sheet');
    if (!sheet) return;
    if (sheet === 'location') setIsLocSheetOpen(true);
    if (sheet === 'filters') setIsFilterOpen(true);
    setSearchParams({}, { replace: true });
  }, [searchParams, setSearchParams]);

  // First visit: explain swipe gestures once, after the first cards are on screen
  useEffect(() => {
    if (!loading && cards.length > 0 && !hasSeenFeedOnboarding()) setShowOnboarding(true);
  }, [loading, cards.length]);

  const closeOnboarding = useCallback(() => {
    markFeedOnboardingSeen();
    setShowOnboarding(false);
  }, []);

  // DESIGN.md §7.2: keyboard parity for swipe gestures
  const anyOverlayOpen = showOnboarding || isFilterOpen || isLocSheetOpen || !!pendingMatch || !!showMatch || showVerificationPrompt;
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
          {t('app.name.prefix')}<span className="logo-text__accent">{t('app.name.accent')}</span>
        </h1>
        <div className="feed-header__actions">
          <button className="filter-btn" onClick={() => setIsFilterOpen(true)}>
            <SlidersHorizontal size={18} aria-hidden="true" />
            <span>{t('feed.filters')}</span>
          </button>
        </div>
      </header>

      <button
        className={`feed-location feed-location--${locStatus}`}
        onClick={() => setIsLocSheetOpen(true)}
        aria-label={locStatus === 'ready' ? t('feed.locationAria', { area: locLabel }) : t('feed.setLocationAria')}
      >
        {locStatus === 'locating'
          ? <Loader2 size={16} className="ui-spin" aria-hidden="true" />
          : <MapPin size={16} aria-hidden="true" />}
        <span className="feed-location__text">
          {locStatus === 'locating' && t('feed.locating')}
          {locStatus === 'ready' && <>{t('feed.near')} <strong>{locLabel}</strong></>}
          {(locStatus === 'unavailable' || locStatus === 'denied') && t('feed.locationUnknown')}
        </span>
        {locStatus !== 'locating' && (
          <span className="feed-location__cta">{locStatus === 'ready' ? t('feed.change') : t('feed.setLocation')}</span>
        )}
      </button>

      <LocationSheet
        open={isLocSheetOpen}
        onClose={() => setIsLocSheetOpen(false)}
        status={locStatus}
        label={locLabel}
        isLocating={isLocating}
        onUseGps={handleUseGps}
        onPickPlace={handlePickPlace}
      />

      {user && !isVerifiedUser && (
        <button className="feed-verify-banner" onClick={() => setShowVerificationPrompt(true)}>
          <ShieldAlert size={20} aria-hidden="true" />
          <span className="feed-verify-banner__text">{t('feed.verifyBanner')}</span>
          <span className="feed-verify-banner__cta">{t('feed.verifyNow')}</span>
          <ChevronRight size={18} aria-hidden="true" />
        </button>
      )}

      <FilterModal
        isOpen={isFilterOpen}
        currentFilters={filters}
        hasLocation={!!userCoords}
        tagCounts={tagCounts}
        onSetLocation={() => { setIsFilterOpen(false); setIsLocSheetOpen(true); }}
        onClose={() => setIsFilterOpen(false)}
        onApply={handleApplyFilters}
      />

      <div className="card-stack-container">
        {loading ? (
          <FeedCardSkeleton />
        ) : cards.length === 0 ? (
          <EmptyState
            icon={Search}
            title={t('feed.emptyTitle')}
            text={t('feed.emptyText')}
            action={
              <Button variant="secondary" onClick={() => setIsFilterOpen(true)}>
                <SlidersHorizontal size={18} aria-hidden="true" /> {t('feed.adjustFilters')}
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
          <div className="skeleton skeleton-circle" style={{ width: '48px', height: '48px' }} />
          <div className="skeleton skeleton-circle" style={{ width: '64px', height: '64px' }} />
        </div>
      ) : cards.length > 0 && (
        <div className="swiper-actions">
          <button className="swiper-btn btn-nope" onClick={() => handleSwipeAction('left')} aria-label={t('feed.skip')} title={t('feed.skipTitle')}>
            {/* Skip: a quick head-shake */}
            <motion.span
              key={nopePulse}
              className="swiper-btn__icon"
              animate={nopePulse ? { rotate: [0, -16, 12, -6, 0] } : undefined}
              transition={{ duration: 0.4, ease: 'easeOut' }}
            >
              <X size={28} strokeWidth={2.5} />
            </motion.span>
          </button>
          {/* Rewind sits between skip and like, like Tinder's small middle button, so the row stays
              symmetric; always shown, dimmed until there's a skip to undo */}
          <button
            className="swiper-btn btn-undo"
            onClick={handleUndo}
            disabled={history.length === 0}
            aria-label={t('feed.rewindAria')}
            title={history.length > 0 ? t('feed.rewindTitle') : t('feed.rewindDisabled')}
          >
            {/* Rewind: spins backwards once */}
            <motion.span
              key={undoPulse}
              className="swiper-btn__icon"
              animate={undoPulse ? { rotate: [0, -360] } : undefined}
              transition={{ duration: 0.5, ease: [0.2, 0, 0, 1] }}
            >
              <RotateCcw size={20} strokeWidth={2.5} />
            </motion.span>
          </button>
          <button className="swiper-btn btn-like" onClick={() => handleSwipeAction('right')} aria-label={t('feed.likeAria')} title={t('feed.likeTitle')}>
            {/* Like: the heart pops and little paws burst out */}
            <motion.span
              key={likePulse}
              className="swiper-btn__icon"
              animate={likePulse ? { scale: [1, 1.38, 0.9, 1.06, 1] } : undefined}
              transition={{ duration: 0.5, ease: 'easeOut' }}
            >
              <Heart size={28} fill="currentColor" strokeWidth={0} />
            </motion.span>
            <PawBurst burstKey={likePulse} />
          </button>
        </div>
      )}

      {/* Confirm before sending an adoption request (DESIGN.md §7.10) */}
      <Dialog
        open={!!pendingMatch}
        onClose={handleCancelMatch}
        title={pendingMatch ? t('feed.confirmTitle', { name: nameOf(pendingMatch.animal) }) : ''}
        actions={
          <>
            <Button variant="secondary" onClick={handleCancelMatch}>{t('feed.notYet')}</Button>
            <Button variant="primary" onClick={handleConfirmMatch}>{t('feed.sendRequest')}</Button>
          </>
        }
      >
        {pendingMatch && (
          <>{t('feed.confirmBody', { shelter: pendingMatch.animal.shelter || t('common.foundation') })}</>
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
            transition={MOTION.base}
          >
            <PawConfetti />
            <div className="match-content">
              {/* You and the pet slide together, then the heart pops between you */}
              <div className="match-pair" aria-hidden="true">
                <motion.div
                  className="match-photo match-photo--you"
                  initial={{ x: -70, rotate: -16, opacity: 0 }}
                  animate={{ x: 0, rotate: -7, opacity: 1 }}
                  transition={{ type: 'spring', stiffness: 380, damping: 22, delay: 0.05 }}
                >
                  {myAvatar ? <img src={myAvatar} alt="" /> : <div className="match-photo__placeholder match-photo__placeholder--you">{myInitial}</div>}
                </motion.div>
                <motion.div
                  className="match-photo match-photo--pet"
                  initial={{ x: 70, rotate: 16, opacity: 0 }}
                  animate={{ x: 0, rotate: 7, opacity: 1 }}
                  transition={{ type: 'spring', stiffness: 380, damping: 22, delay: 0.05 }}
                >
                  {showMatch.animal?.images?.[0] ? (
                    <img src={showMatch.animal.images[0]} alt="" />
                  ) : (
                    <div className="match-photo__placeholder"><PawPrint size={48} /></div>
                  )}
                </motion.div>
                <motion.span
                  className="match-photo__heart"
                  initial={{ scale: 0 }}
                  animate={{ scale: [0, 1.35, 1] }}
                  transition={{ duration: 0.45, delay: 0.38, ease: 'easeOut' }}
                >
                  <Heart size={22} fill="currentColor" strokeWidth={0} />
                </motion.span>
              </div>
              <h2 id="match-title" className="match-title">
                {t('feed.sentTitle', { name: nameOf(showMatch.animal) })}
              </h2>
              <p className="match-text">
                {t('feed.sentBody', { shelter: showMatch.animal?.shelter || t('common.foundation') })}
              </p>
              <div className="match-actions">
                <Button variant="primary" block onClick={() => navigate('/matches')}>
                  <MessageCircle size={20} aria-hidden="true" /> {t('feed.viewInbox')}
                </Button>
                <Button variant="ghost" onDark block onClick={() => setShowMatch(false)}>
                  {t('feed.keepBrowsing')}
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

      {/* Wide screens: details of the top card beside the deck */}
      <FeedDetailPanel animal={!loading ? cards[0] : null} loading={loading} />

      <FeedOnboarding open={showOnboarding && !isLocSheetOpen && !isFilterOpen} onClose={closeOnboarding} />
    </div>
  );
}

export default Feed;
