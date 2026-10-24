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
  CheckCircle2,
  Flag,
} from 'lucide-react';
import { api } from '../services/api';
import { useAppContext } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';
import { AnimalProfileSkeleton } from '../components/Skeletons';
import { calculateDistance, formatDistance, getUserCoordinates, getLocationPermission } from '../lib/geo';
import { VerificationPromptModal } from '../components/VerificationPromptModal';
import { displayNames } from '../lib/animal';
import { displayTags } from '../lib/tags';
import { PetScene } from '../components/motion/PetScene';
import { useI18n, localizeAge, localizeDistance } from '../i18n';
import { formatGender, formatType, formatSize, splitStory } from '../lib/animal';
import { Button, IconButton, Chip, EmptyState, Dialog, useToast } from '../components/ui';

import './AnimalProfileBento.css';

function swapExtension(src) {
  if (/\.jpeg(\?|$)/.test(src)) return src.replace(/\.jpeg(\?|$)/, '.jpg$1');
  if (/\.jpg(\?|$)/.test(src)) return src.replace(/\.jpg(\?|$)/, '.jpeg$1');
  return null;
}

// Photo with loading skeleton, one .jpg/.jpeg retry, then a paw placeholder (DESIGN.md §5).
function ProfilePhoto({ src, alt, name, className }) {
  const { t } = useI18n();
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
        {name && <span>{t('animal.noPhoto', { name })}</span>}
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
  const [reporting, setReporting] = useState(false);
  const [reportReason, setReportReason] = useState('');
  const [reportMore, setReportMore] = useState('');
  const [reportBusy, setReportBusy] = useState(false);
  const { t, lang } = useI18n();
  const { matches, addMatch } = useAppContext();
  const { user, userVerificationStatus } = useAuth();

  const [animal, setAnimal] = useState(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showVerificationPrompt, setShowVerificationPrompt] = useState(false);
  const [photoIndex, setPhotoIndex] = useState(0);
  // Story language follows the app language; the ไทย | English switch can still override it
  const [storyLang, setStoryLang] = useState(lang);
  useEffect(() => setStoryLang(lang), [lang]);

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
      if (match?.notVerified) {
        setShowVerificationPrompt(true);
      } else if (match) {
        toast(t('ap.sent'), { tone: 'success' });
        navigate('/matches');
      } else {
        toast(t('common.retryError'), { tone: 'error' });
      }
    } catch (err) {
      console.error('Failed to submit adoption match:', err);
      toast(t('common.retryError'), { tone: 'error' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleShare = async () => {
    const shareName = animal ? displayNames(animal.name, lang).primary : '';
    if (navigator.share) {
      try {
        await navigator.share({
          title: t('ap.shareTitle', { name: shareName }),
          text: t('ap.shareText', { name: shareName }),
          url: window.location.href,
        });
        return;
      } catch (err) {
        if (err?.name === 'AbortError') return; // user closed the share sheet
      }
    }
    try {
      await navigator.clipboard.writeText(window.location.href);
      toast(t('ap.linkCopied'), { tone: 'success' });
    } catch (e) {
      toast(t('ap.copyFailed'), { tone: 'error' });
    }
  };

  if (loading) {
    return (
      <div className="animal-profile-page">
        <AnimalProfileSkeleton />
      </div>
    );
  }

  const sendReport = async () => {
    if (!reportReason || !user || !animal) return;
    setReportBusy(true);
    try {
      const reason = [t(`ap.report.reason.${reportReason}`), reportMore.trim()].filter(Boolean).join(' — ');
      await api.reportListing(user.id, animal, reason);
      toast(t('ap.report.sent'), { tone: 'success' });
      setReporting(false); setReportReason(''); setReportMore('');
    } catch (err) {
      console.error('report listing failed', err);
      toast(t('ap.report.fail'), { tone: 'error' });
    } finally {
      setReportBusy(false);
    }
  };

  if (notFound || !animal) {
    return (
      <div className="animal-profile-page ap-not-found">
        <EmptyState
          art={<PetScene variant="search" />}
          title={t('ap.notFoundTitle')}
          text={t('ap.notFoundText')}
          action={<Button variant="secondary" onClick={() => navigate('/')}>{t('ap.otherAnimals')}</Button>}
        />
      </div>
    );
  }

  const { primary: name, secondary: alias } = displayNames(animal.name, lang);
  const age = localizeAge(animal.age, lang);
  const distance = localizeDistance(animal.distance, lang);
  const images = Array.isArray(animal.images) && animal.images.length > 0
    ? animal.images
    : animal.image_url ? [animal.image_url] : [];
  const story = splitStory(animal.story || '');
  const typeLabel = formatType(animal.type, t);
  const facts = [
    { label: t('animal.type'), value: typeLabel },
    { label: t('animal.gender'), value: formatGender(animal.gender, t) },
    { label: t('animal.age'), value: age || t('common.notSpecified') },
    { label: t('animal.size'), value: formatSize(animal.size, t) },
  ];
  // Breed is only worth a chip when the foundation actually filled it in
  const tags = displayTags([animal.breed, ...(animal.tags || [])], lang);
  const hasEnglish = Boolean(story.en);
  const storyText = storyLang === 'en' && hasEnglish ? story.en : story.th;
  const adoptHint = existingMatch
    ? t('ap.hintExisting')
    : t('ap.hintNew');
  const showPrev = () => setPhotoIndex((i) => (i === 0 ? images.length - 1 : i - 1));
  const showNext = () => setPhotoIndex((i) => (i === images.length - 1 ? 0 : i + 1));

  const adoptLabel = existingMatch ? t('ap.openChat') : t('ap.adopt', { name });
  const adoptIcon = existingMatch
    ? <MessageCircle size={20} aria-hidden="true" />
    : <Heart size={20} fill="currentColor" strokeWidth={0} aria-hidden="true" />;

  return (
    <div className="animal-profile-page">
      <div className="ap-layout">
        {/* Photo */}
        <section className="ap-media" aria-label={t('ap.photosOf', { name })}>
          <div className="ap-hero">
            <ProfilePhoto
              key={images[photoIndex] || 'none'}
              src={images[photoIndex]}
              alt={`${age ? t('animal.photoAlt', { name, type: typeLabel, age }) : `${name} ${typeLabel}`}, ${t('ap.photoN', { n: photoIndex + 1 })}`}
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
                <button className="ap-hero__zone ap-hero__zone--prev" onClick={showPrev} aria-label={t('ap.prevPhoto')} />
                <button className="ap-hero__zone ap-hero__zone--next" onClick={showNext} aria-label={t('ap.nextPhoto')} />
                <button className="ap-hero__arrow ap-hero__arrow--prev" onClick={showPrev} aria-label={t('ap.prevPhoto')}>
                  <ChevronLeft size={22} />
                </button>
                <button className="ap-hero__arrow ap-hero__arrow--next" onClick={showNext} aria-label={t('ap.nextPhoto')}>
                  <ChevronRight size={22} />
                </button>
              </>
            )}

            <div className="ap-hero__bar">
              <IconButton label={t('common.back')} onClick={goBack}>
                <ChevronLeft size={22} />
              </IconButton>
              <IconButton label={t('ap.share', { name })} onClick={handleShare}>
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
                  aria-label={t('ap.viewPhotoN', { n: i + 1 })}
                  aria-pressed={i === photoIndex}
                >
                  <img src={img} alt="" loading="lazy" />
                </button>
              ))}
            </div>
          )}

          {/* Desktop: the adopt action stays under the photo while reading */}
          <div className="ap-cta-inline">
            <Button variant="primary" block loading={isSubmitting} onClick={handleAdopt}>
              {!isSubmitting && adoptIcon} {isSubmitting ? t('ap.sending') : adoptLabel}
            </Button>
            <p className="ap-cta-inline__text">{adoptHint}</p>
          </div>
        </section>

        {/* Details */}
        <motion.section
          className="ap-sheet"
        >
          {/* 1. Who */}
          <header className="ap-header">
            <h1 className="ap-name">{name}</h1>
            {alias && <p className="ap-alias">{alias}</p>}
          </header>

          {/* 2. Basics at a glance */}
          <dl className="ap-facts">
            {facts.map((f) => (
              <div key={f.label} className="ap-fact">
                <dt>{f.label}</dt>
                <dd>{f.value}</dd>
              </div>
            ))}
          </dl>

          {/* 3. Story — Thai first, English on request */}
          <section className="ap-section">
            <div className="ap-section__head">
              <h2 className="ap-section__title">{t('animal.storyOf', { name })}</h2>
              {hasEnglish && (
                <div className="ap-lang" role="group" aria-label="ภาษา / Language">
                  <button type="button" lang="th" aria-pressed={storyLang === 'th'} onClick={() => setStoryLang('th')}>ไทย</button>
                  <button type="button" lang="en" aria-pressed={storyLang === 'en'} onClick={() => setStoryLang('en')}>English</button>
                </div>
              )}
            </div>
            <p className="ap-story" lang={storyLang === 'en' && hasEnglish ? 'en' : 'th'}>
              {storyText || t('animal.noStory', { name })}
            </p>
          </section>

          {/* 4. Personality */}
          {tags.length > 0 && (
            <section className="ap-section">
              <h2 className="ap-section__title">{t('animal.personality')}</h2>
              <div className="ap-tags">
                {tags.map((tag) => (
                  <Chip key={tag.key} className={tag.group === 'health' ? 'ui-chip--health' : undefined}>
                    {tag.group === 'health' && <CheckCircle2 size={14} aria-hidden="true" />}
                    {tag.label}
                  </Chip>
                ))}
              </div>
            </section>
          )}

          {/* 5. Where */}
          <section className="ap-section">
            <h2 className="ap-section__title">{t('animal.caretaker')}</h2>
            <div className="ap-shelter">
              <span className="ap-shelter__icon" aria-hidden="true"><Building2 size={22} /></span>
              <div className="ap-shelter__text">
                <p className="ap-shelter__name">{animal.shelter || t('common.shelter')}</p>
                <p className="ap-shelter__sub">
                  {distance ? <><MapPin size={14} aria-hidden="true" /> {t('animal.distanceFromYou', { distance })}</> : t('animal.inServiceArea')}
                </p>
              </div>
              {animal.latitude && animal.longitude && (
                <a
                  href={`https://www.google.com/maps/dir/?api=1&destination=${animal.latitude},${animal.longitude}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="ui-btn ui-btn--secondary ui-btn--sm"
                >
                  <Navigation size={16} aria-hidden="true" /> {t('animal.directions')}
                </a>
              )}
            </div>
          </section>

          {user && animal.foundation_id && animal.foundation_id !== user.id && (
            <button type="button" className="ap-report" onClick={() => setReporting(true)}>
              <Flag size={14} aria-hidden="true" /> {t('ap.report.link')}
            </button>
          )}
        </motion.section>
      </div>

      <Dialog open={reporting} onClose={() => !reportBusy && setReporting(false)} title={t('ap.report.title')}
        actions={(
          <>
            <Button variant="secondary" onClick={() => setReporting(false)} disabled={reportBusy}>{t('common.cancel')}</Button>
            <Button variant="danger" onClick={sendReport} loading={reportBusy} disabled={!reportReason}>{t('ap.report.send')}</Button>
          </>
        )}>
        <p className="ap-report__note">{t('ap.report.note')}</p>
        <div className="ap-report__reasons" role="radiogroup" aria-label={t('ap.report.title')}>
          {LISTING_REPORT_REASONS.map((r) => (
            <button key={r} type="button" role="radio" aria-checked={reportReason === r}
              className={`ap-report__reason ${reportReason === r ? 'is-on' : ''}`} onClick={() => setReportReason(r)}>
              {t(`ap.report.reason.${r}`)}
            </button>
          ))}
        </div>
        <textarea className="ap-report__more" rows={2} value={reportMore} onChange={(e) => setReportMore(e.target.value)}
          placeholder={t('ap.report.morePh')} aria-label={t('ap.report.morePh')} />
      </Dialog>

      {/* Mobile sticky CTA (DESIGN.md §7.5) */}
      <div className="ap-cta-dock">
        <p className="ap-cta-dock__hint">{adoptHint}</p>
        <Button variant="primary" block loading={isSubmitting} onClick={handleAdopt}>
          {!isSubmitting && adoptIcon} {isSubmitting ? t('ap.sending') : adoptLabel}
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

const LISTING_REPORT_REASONS = ['fake', 'photos', 'selling', 'welfare', 'other'];

export default AnimalProfile;
