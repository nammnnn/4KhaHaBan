// Wide screens only: details of the card on top, next to the deck (like Tinder on the web)
// so desktop users can decide without opening every profile — DESIGN.md §7.18
import { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Building2, MapPin, ArrowUpRight } from 'lucide-react';
import { splitAnimalName } from './SwipeCard';
import { formatGender, formatType, formatSize, splitStory } from '../lib/animal';

export function FeedDetailPanel({ animal }) {
  const [lang, setLang] = useState('th'); // kept while browsing, like a reading preference
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

  const { main: name, alias } = splitAnimalName(animal.name);
  const story = splitStory(animal.story || '');
  const hasEnglish = Boolean(story.en);
  const showEnglish = lang === 'en' && hasEnglish;
  const facts = [
    { label: 'ชนิด', value: formatType(animal.type) },
    { label: 'เพศ', value: formatGender(animal.gender) },
    { label: 'อายุ', value: animal.age || 'ไม่ระบุ' },
    { label: 'ขนาด', value: formatSize(animal.size) },
  ];

  return (
    <aside className="feed-panel" aria-label={`ข้อมูลของ${name}`}>
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
              ดูประวัติเต็ม <ArrowUpRight size={16} aria-hidden="true" />
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
              <h3 className="feed-panel__title">เรื่องราว</h3>
              {hasEnglish && (
                <div className="ap-lang" role="group" aria-label="ภาษา / Language">
                  <button type="button" lang="th" aria-pressed={!showEnglish} onClick={() => setLang('th')}>ไทย</button>
                  <button type="button" lang="en" aria-pressed={showEnglish} onClick={() => setLang('en')}>English</button>
                </div>
              )}
            </div>
            <p className="feed-panel__story" lang={showEnglish ? 'en' : 'th'}>
              {(showEnglish ? story.en : story.th) || `ยังไม่มีเรื่องราวของ${name}`}
            </p>
          </section>

          <section className="feed-panel__section">
            <h3 className="feed-panel__title">ผู้ดูแลน้อง</h3>
            <p className="feed-panel__shelter">
              <Building2 size={16} aria-hidden="true" /> {animal.shelter || 'ศูนย์พักพิงสัตว์'}
            </p>
            {animal.distance && (
              <p className="feed-panel__shelter feed-panel__shelter--sub">
                <MapPin size={16} aria-hidden="true" /> ห่างจากคุณ {animal.distance}
              </p>
            )}
          </section>

          <div className="feed-panel__fade" aria-hidden="true" />
        </motion.div>
      </AnimatePresence>

    </aside>
  );
}
