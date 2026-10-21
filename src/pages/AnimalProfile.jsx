import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  ChevronLeft,
  ChevronRight,
  Heart,
  Share2,
  Navigation,
  Building2,
  MessageCircle,
  PawPrint,
  MapPin,
} from 'lucide-react';
import { api } from '../services/api';
import { useAppContext } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';
import { AnimalProfileSkeleton } from '../components/Skeletons';
import { calculateDistance, formatDistance, getUserCoordinates, getLocationPermission } from '../lib/geo';
import { VerificationPromptModal } from '../components/VerificationPromptModal';
import { splitAnimalName } from '../components/SwipeCard';
import { Button, IconButton, Chip, EmptyState, useToast } from '../components/ui';

import './AnimalProfileBento.css';

const formatGender = (gender) => {
  const g = String(gender || '').toLowerCase();
  if (g === 'female' || g === 'เพศเมีย' || g === 'เมีย') return 'ตัวเมีย';
  if (g === 'male' || g === 'เพศผู้' || g === 'ผู้') return 'ตัวผู้';
  return gender || 'ไม่ระบุ';
};

const formatType = (type) => {
  const t = String(type || '').toLowerCase();
  if (t === 'dog' || t === 'สุนัข' || t === 'หมา') return 'สุนัข';
  if (t === 'cat' || t === 'แมว') return 'แมว';
  return type || 'สัตว์เลี้ยง';
};

const formatSize = (size) => {
  const s = String(size || '').toLowerCase();
  if (s === 'small' || s === 'เล็ก') return 'เล็ก';
  if (s === 'large' || s === 'ใหญ่') return 'ใหญ่';
  return 'กลาง';
};

// Stories are stored as "ไทย: ... English: ..." — split them so Thai leads.
const splitStory = (story = '') => {
  if (!story.includes('English:')) return { th: story.trim(), en: '' };
  const [th, en] = story.split('English:');
  return { th: th.replace(/^ไทย:\s*/, '').trim(), en: (en || '').trim() };
};

function swapExtension(src) {
  if (/\.jpeg(\?|$)/.test(src)) return src.replace(/\.jpeg(\?|$)/, '.jpg$1');
  if (/\.jpg(\?|$)/.test(src)) return src.replace(/\.jpg(\?|$)/, '.jpeg$1');
  return null;
}

// Photo with loading skeleton, one .jpg/.jpeg retry, then a paw placeholder (DESIGN.md §5).
function ProfilePhoto({ src, alt, name, className }) {
  const [current, setCurrent] = useState(src);
  const [state, setState] = useState(src ? 'loading' : 'error');
  const [triedSwap, setTriedSwap] = useState(false);

  useEffect(() => {
    setCurrent(src);
    setState(src ? 'loading' : 'error');
    setTriedSwap(false);
  }, [src]);

  if (state === 'error') {
    return (
      <div className={`ap-photo-fallback ${className || ''}`}>
        <PawPrint size={48} aria-hidden="true" />
        {name && <span>ยังไม่มีรูปของ{name}</span>}
      </div>
    );
  }

  return (
    <>
      {state === 'loading' && <div className="skeleton ap-photo-skeleton" />}
      <img
        src={current}
        alt={alt}
        className={className}
        style={{ opacity: state === 'loaded' ? 1 : 0 }}
        onLoad={() => setState('loaded')}
        onError={() => {
          const swapped = !triedSwap && current ? swapExtension(current) : null;
          if (swapped) {
            setTriedSwap(true);
            setCurrent(swapped);
          } else {
            setState('error');
          }
        }}
      />
    </>
  );
}

function AnimalProfile() {
  const { id } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const { matches, addMatch } = useAppContext();
  const { user, userVerificationStatus } = useAuth();

  const [animal, setAnimal] = useState(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showVerificationPrompt, setShowVerificationPrompt] = useState(false);
  const [photoIndex, setPhotoIndex] = useState(0);
  const [showEnglish, setShowEnglish] = useState(false);

  const existingMatch = matches?.find((m) => m.animalId === id || m.animal_id === id);

  useEffect(() => {
    let cancelled = false;
    const fetchAnimal = async () => {
      let data;
      try {
        data = await api.getAnimalById(id);
        // Show the page right away; distance is filled in only from the user's real location
        if (!cancelled) setAnimal({ ...data, distance: '' });
      } catch (err) {
        if (!cancelled) setNotFound(true);
      } finally {
        if (!cancelled) setLoading(false);
      }
      if (!data?.latitude || !data?.longitude) return;
      if ((await getLocationPermission()) !== 'granted') return;
      const coords = await getUserCoordinates(false, 5000);
      if (cancelled || !coords) return;
      const distance = formatDistance(calculateDistance(coords.latitude, coords.longitude, data.latitude, data.longitude));
      setAnimal((prev) => (prev ? { ...prev, distance } : prev));
    };
    fetchAnimal();
    return () => { cancelled = true; };
  }, [id]);

  const isVerifiedUser =
    userVerificationStatus === 'verified' ||
    (user?.email && user.email.toLowerCase().trim() === 'songkaen2547@gmail.com') ||
    user?.user_metadata?.is_verified === true ||
    user?.user_metadata?.user_verification_status === 'verified';

  const goBack = () => {
    if (window.history.length > 1) navigate(-1);
    else navigate('/');
  };

  const handleAdopt = async () => {
    if (existingMatch) {
      navigate(existingMatch.id ? `/chat/${existingMatch.id}` : '/matches');
      return;
    }
    if (!user) {
      navigate('/login');
      return;
    }
    if (!isVerifiedUser) {
      setShowVerificationPrompt(true);
      return;
    }
    setIsSubmitting(true);
    try {
      const match = await addMatch(id, user.id);
      if (match) {
        toast(`ส่งคำขอรับเลี้ยงแล้ว มูลนิธิจะตอบกลับในกล่องข้อความ`, { tone: 'success' });
        navigate('/matches');
      } else {
        toast('ส่งคำขอไม่สำเร็จ กรุณาลองอีกครั้ง', { tone: 'error' });
      }
    } catch (err) {
      console.error('Failed to submit adoption match:', err);
      toast('ส่งคำขอไม่สำเร็จ กรุณาลองอีกครั้ง', { tone: 'error' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleShare = async () => {
    const shareName = animal ? splitAnimalName(animal.name).main : 'น้อง';
    if (navigator.share) {
      try {
        await navigator.share({
          title: `${shareName} กำลังหาบ้าน - 4 ขาหาบ้าน`,
          text: `มาช่วยหาบ้านให้${shareName}กัน`,
          url: window.location.href,
        });
        return;
      } catch (err) {
        if (err?.name === 'AbortError') return; // user closed the share sheet
      }
    }
    try {
      await navigator.clipboard.writeText(window.location.href);
      toast('คัดลอกลิงก์แล้ว', { tone: 'success' });
    } catch (e) {
      toast('คัดลอกลิงก์ไม่สำเร็จ', { tone: 'error' });
    }
  };

  if (loading) {
    return (
      <div className="animal-profile-page">
        <AnimalProfileSkeleton />
      </div>
    );
  }

  if (notFound || !animal) {
    return (
      <div className="animal-profile-page ap-not-found">
        <EmptyState
          icon={PawPrint}
          title="ไม่พบข้อมูลน้องตัวนี้"
          text="น้องอาจได้บ้านใหม่แล้ว หรือลิงก์ไม่ถูกต้อง"
          action={<Button variant="secondary" onClick={() => navigate('/')}>ดูน้องตัวอื่น</Button>}
        />
      </div>
    );
  }

  const { main: name, alias } = splitAnimalName(animal.name);
  const images = Array.isArray(animal.images) && animal.images.length > 0
    ? animal.images
    : animal.image_url ? [animal.image_url] : [];
  const story = splitStory(animal.story || '');
  const typeLabel = formatType(animal.type);
  const facts = [
    { label: 'เพศ', value: formatGender(animal.gender) },
    { label: 'อายุ', value: animal.age || 'ไม่ระบุ' },
    { label: 'ขนาด', value: formatSize(animal.size) },
    { label: 'สายพันธุ์', value: animal.breed || 'พันธุ์ผสม' },
  ];
  const showPrev = () => setPhotoIndex((i) => (i === 0 ? images.length - 1 : i - 1));
  const showNext = () => setPhotoIndex((i) => (i === images.length - 1 ? 0 : i + 1));

  const adoptLabel = existingMatch ? 'เปิดแชทกับมูลนิธิ' : `ส่งคำขอรับเลี้ยง${name}`;
  const adoptIcon = existingMatch
    ? <MessageCircle size={20} aria-hidden="true" />
    : <Heart size={20} fill="currentColor" strokeWidth={0} aria-hidden="true" />;

  return (
    <div className="animal-profile-page">
      <div className="ap-layout">
        {/* Photo */}
        <section className="ap-media" aria-label={`รูปของ${name}`}>
          <div className="ap-hero">
            <ProfilePhoto
              key={images[photoIndex] || 'none'}
              src={images[photoIndex]}
              alt={`${name} ${typeLabel}${animal.age ? ` อายุ ${animal.age}` : ''} รูปที่ ${photoIndex + 1}`}
              name={name}
              className="ap-hero__img"
            />

            {images.length > 1 && (
              <>
                <div className="ap-hero__progress" aria-hidden="true">
                  {images.map((_, i) => (
                    <span key={i} className={i === photoIndex ? 'is-active' : ''} />
                  ))}
                </div>
                <button className="ap-hero__zone ap-hero__zone--prev" onClick={showPrev} aria-label="รูปก่อนหน้า" />
                <button className="ap-hero__zone ap-hero__zone--next" onClick={showNext} aria-label="รูปถัดไป" />
                <button className="ap-hero__arrow ap-hero__arrow--prev" onClick={showPrev} aria-label="รูปก่อนหน้า">
                  <ChevronLeft size={22} />
                </button>
                <button className="ap-hero__arrow ap-hero__arrow--next" onClick={showNext} aria-label="รูปถัดไป">
                  <ChevronRight size={22} />
                </button>
              </>
            )}

            <div className="ap-hero__bar">
              <IconButton label="ย้อนกลับ" onClick={goBack}>
                <ChevronLeft size={22} />
              </IconButton>
              <IconButton label={`แชร์โปรไฟล์ของ${name}`} onClick={handleShare}>
                <Share2 size={20} />
              </IconButton>
            </div>
          </div>

          {images.length > 1 && (
            <div className="ap-thumbs">
              {images.map((img, i) => (
                <button
                  key={img}
                  className={`ap-thumb${i === photoIndex ? ' is-active' : ''}`}
                  onClick={() => setPhotoIndex(i)}
                  aria-label={`ดูรูปที่ ${i + 1}`}
                  aria-pressed={i === photoIndex}
                >
                  <img src={img} alt="" loading="lazy" />
                </button>
              ))}
            </div>
          )}
        </section>

        {/* Details */}
        <motion.section
          className="ap-sheet"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.32, ease: [0.2, 0, 0, 1] }}
        >
          <header className="ap-header">
            <h1 className="ap-name">{name}</h1>
            {alias && <p className="ap-alias">{alias}</p>}
            <p className="ap-meta">
              {typeLabel}
              {animal.distance && (
                <>
                  <span aria-hidden="true"> · </span>
                  <MapPin size={14} aria-hidden="true" /> ห่างจากคุณ {animal.distance}
                </>
              )}
            </p>
          </header>

          <dl className="ap-facts">
            {facts.map((f) => (
              <div key={f.label} className="ap-fact">
                <dt>{f.label}</dt>
                <dd>{f.value}</dd>
              </div>
            ))}
          </dl>

          {animal.tags?.length > 0 && (
            <section className="ap-section">
              <h2 className="ap-section__title">นิสัยและสุขภาพ</h2>
              <div className="ap-tags">
                {animal.tags.map((tag) => <Chip key={tag}>{tag}</Chip>)}
              </div>
            </section>
          )}

          <section className="ap-section">
            <h2 className="ap-section__title">เรื่องราวของ{name}</h2>
            <p className="ap-story">{story.th || `ยังไม่มีเรื่องราวของ${name}`}</p>
            {story.en && (
              <>
                <button
                  className="ap-lang-toggle"
                  onClick={() => setShowEnglish((v) => !v)}
                  aria-expanded={showEnglish}
                >
                  {showEnglish ? 'ซ่อนภาษาอังกฤษ' : 'อ่านภาษาอังกฤษ'}
                </button>
                {showEnglish && <p className="ap-story ap-story--en" lang="en">{story.en}</p>}
              </>
            )}
          </section>

          <section className="ap-section">
            <h2 className="ap-section__title">ผู้ดูแลน้อง</h2>
            <div className="ap-shelter">
              <span className="ap-shelter__icon" aria-hidden="true"><Building2 size={22} /></span>
              <div className="ap-shelter__text">
                <p className="ap-shelter__name">{animal.shelter || 'ศูนย์พักพิงสัตว์'}</p>
                <p className="ap-shelter__sub">
                  {animal.distance ? `ห่างจากคุณ ${animal.distance}` : 'อยู่ในพื้นที่บริการ'}
                </p>
              </div>
              {animal.latitude && animal.longitude && (
                <a
                  href={`https://www.google.com/maps/dir/?api=1&destination=${animal.latitude},${animal.longitude}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="ui-btn ui-btn--secondary ui-btn--sm"
                >
                  <Navigation size={16} aria-hidden="true" /> นำทาง
                </a>
              )}
            </div>
          </section>

          {/* Desktop CTA, inline at the end of the details */}
          <div className="ap-cta-inline">
            <p className="ap-cta-inline__text">
              {existingMatch
                ? 'คุณส่งคำขอรับเลี้ยงน้องแล้ว คุยรายละเอียดกับมูลนิธิได้ในแชท'
                : 'มูลนิธิจะตรวจสอบข้อมูลของคุณ แล้วเปิดห้องแชทเพื่อคุยเรื่องการรับเลี้ยง'}
            </p>
            <Button variant="primary" block loading={isSubmitting} onClick={handleAdopt}>
              {!isSubmitting && adoptIcon} {isSubmitting ? 'กำลังส่งคำขอ…' : adoptLabel}
            </Button>
          </div>
        </motion.section>
      </div>

      {/* Mobile sticky CTA (DESIGN.md §7.5) */}
      <div className="ap-cta-dock">
        <Button variant="primary" block loading={isSubmitting} onClick={handleAdopt}>
          {!isSubmitting && adoptIcon} {isSubmitting ? 'กำลังส่งคำขอ…' : adoptLabel}
        </Button>
      </div>

      <VerificationPromptModal
        isOpen={showVerificationPrompt}
        onClose={() => setShowVerificationPrompt(false)}
        fromPath={`/animal/${id}`}
      />
    </div>
  );
}

export default AnimalProfile;
