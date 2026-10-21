// Wide screens only: details of the card on top, next to the deck (like Tinder on the web)
// so desktop users can decide without opening every profile — DESIGN.md §7.18
import { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Building2, MapPin, ArrowUpRight } from 'lucide-react';
import { formatGender, formatType, formatSize, splitStory, displayNames } from '../lib/animal';
import { useI18n, localizeAge, localizeDistance } from '../i18n';

export function FeedDetailPanel({ animal }) {
  const { t, lang: appLang } = useI18n();
  // Story language starts from the app language; kept while browsing, like a reading preference
  const [lang, setLang] = useState(appLang);
  useEffect(() => setLang(appLang), [appLang]);
  const [moreBelow, setMoreBelow] = useState(false); // fade the bottom edge while there's more to scroll
  const innerRef = useRef(null);
  const checkOverflow = useCallback(() => {
    const el = innerRef.current;
    setMoreBelow(Boolean(el) && el.scrollHeight - el.scrollTop - el.clientHeight > 4);
  }, []);

  useEffect(() => {
    const el = innerRef.current;
    if (!el) return undefined;
    el.scrollTop = 0;
    checkOverflow();
    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(checkOverflow) : null;
    ro?.observe(el);
    return () => ro?.disconnect();
  }, [animal?.id, lang, checkOverflow]);

  if (!animal) return <aside className="feed-panel" aria-hidden="true" />;

  const { primary: name, secondary: alias } = displayNames(animal.name, appLang);
  const story = splitStory(animal.story || '');
  const hasEnglish = Boolean(story.en);
  const showEnglish = lang === 'en' && hasEnglish;
  const facts = [
    { label: t('animal.type'), value: formatType(animal.type, t) },
    { label: t('animal.gender'), value: formatGender(animal.gender, t) },
    { label: t('animal.age'), value: localizeAge(animal.age, appLang) || t('common.notSpecified') },
    { label: t('animal.size'), value: formatSize(animal.size, t) },
  ];

  return (
    <aside className="feed-panel" aria-label={t('animal.detailsOf', { name })}>
      <AnimatePresence mode="wait">
        <motion.div
          key={animal.id}
          ref={innerRef}
          onScroll={checkOverflow}
          className={`feed-panel__inner${moreBelow ? ' has-more' : ''}`}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2, ease: [0.2, 0, 0, 1] }}
        >
          <header className="feed-panel__head">
            <div>
              <h2 className="feed-panel__name">{name}</h2>
              {alias && <p className="feed-panel__alias">{alias}</p>}
            </div>
            <Link to={`/animal/${animal.id}`} className="feed-panel__more">
              {t('animal.viewFullProfile')} <ArrowUpRight size={16} aria-hidden="true" />
            </Link>
          </header>

          <dl className="ap-facts feed-panel__facts">
            {facts.map((f) => (
              <div key={f.label} className="ap-fact">
                <dt>{f.label}</dt>
                <dd>{f.value}</dd>
              </div>
            ))}
          </dl>

          <section className="feed-panel__section">
            <div className="ap-section__head">
              <h3 className="feed-panel__title">{t('animal.story')}</h3>
              {hasEnglish && (
                <div className="ap-lang" role="group" aria-label="ภาษา / Language">
                  <button type="button" lang="th" aria-pressed={!showEnglish} onClick={() => setLang('th')}>ไทย</button>
                  <button type="button" lang="en" aria-pressed={showEnglish} onClick={() => setLang('en')}>English</button>
                </div>
              )}
            </div>
            <p className="feed-panel__story" lang={showEnglish ? 'en' : 'th'}>
              {(showEnglish ? story.en : story.th) || t('animal.noStory', { name })}
            </p>
          </section>

          <section className="feed-panel__section">
            <h3 className="feed-panel__title">{t('animal.caretaker')}</h3>
            <p className="feed-panel__shelter">
              <Building2 size={16} aria-hidden="true" /> {animal.shelter || t('common.shelter')}
            </p>
            {animal.distance && (
              <p className="feed-panel__shelter feed-panel__shelter--sub">
                <MapPin size={16} aria-hidden="true" /> {t('animal.distanceFromYou', { distance: localizeDistance(animal.distance, appLang) })}
              </p>
            )}
          </section>

          <div className="feed-panel__fade" aria-hidden="true" />
        </motion.div>
      </AnimatePresence>

    </aside>
  );
}
