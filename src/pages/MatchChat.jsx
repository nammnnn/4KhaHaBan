import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAppContext } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { Search, MessageCircleHeart, PawPrint, Heart, ShieldCheck, MessagesSquare, ChevronDown } from 'lucide-react';
import { ChatListSkeleton } from '../components/Skeletons';
import { Badge } from '../components/ui';
import { useI18n } from '../i18n';
import { displayNames } from '../lib/animal';
import ChatRoom from './ChatRoom';
import './MatchChat.css';

// Adopter chat list — DESIGN.md §7.21
// One list grouped by status instead of tabs, so a new request is never hidden.

const SEARCH_MIN = 6; // show search only when the list is long enough to need it

const groupOf = (status) => {
  if (status === 'pending') return 'pending';
  if (status === 'rejected') return 'rejected';
  return 'active'; // approved, adopted, completed
};

const activityTime = (m) => new Date(m.last_message_at || m.created_at || 0).getTime();

function formatWhen(ms, lang, t) {
  if (!ms) return '';
  const d = new Date(ms);
  const now = new Date();
  const locale = lang === 'en' ? 'en-GB' : 'th-TH';
  const startOfDay = (x) => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime();
  const days = Math.round((startOfDay(now) - startOfDay(d)) / 86400000);
  if (days <= 0) return d.toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' });
  if (days === 1) return t('chat.yesterday');
  return d.toLocaleDateString(locale, { day: 'numeric', month: 'short' });
}

// Same rule as the chat badge in the navigation
function isUnread(m, readChats) {
  const sender = m.lastSender || m.last_sender;
  if (sender === 'user') return false;
  if ((readChats[m.id] || 0) >= activityTime(m)) return false;
  const hasUnread = (m.unread || 0) > 0;
  const actionable = ['approved', 'rejected', 'adopted'].includes(m.status) && !readChats[m.id];
  return hasUnread || actionable;
}

const readChatsFor = (userId) => {
  try {
    return JSON.parse(localStorage.getItem(`read_chats_${userId}`) || '{}');
  } catch {
    return {};
  }
};

function HowItWorks({ t, compact }) {
  const steps = [
    { icon: Heart, title: t('chat.how.1.title'), text: t('chat.how.1.text') },
    { icon: ShieldCheck, title: t('chat.how.2.title'), text: t('chat.how.2.text') },
    { icon: MessagesSquare, title: t('chat.how.3.title'), text: t('chat.how.3.text') },
  ];
  return (
    <div className={`mc-how ${compact ? 'mc-how--compact' : ''}`}>
      <div className="mc-how__icon" aria-hidden="true"><MessageCircleHeart size={compact ? 32 : 40} /></div>
      <h2 className="mc-how__title">{t('chat.empty.title')}</h2>
      <p className="mc-how__lead">{t('chat.empty.text')}</p>
      <ol className="mc-how__steps">
        {steps.map(({ icon: Icon, title, text }, i) => (
          <li key={title}>
            <span className="mc-how__num" aria-hidden="true"><Icon size={18} /></span>
            <div>
              <strong>{i + 1}. {title}</strong>
              <span>{text}</span>
            </div>
          </li>
        ))}
      </ol>
      <Link to="/" className="ui-btn ui-btn--primary mc-how__cta">
        <PawPrint size={18} aria-hidden="true" /> {t('chat.empty.cta')}
      </Link>
    </div>
  );
}

function MatchRow({ match, animal, active, unread, onOpen, t, lang }) {
  const { primary } = displayNames(animal?.name || '', lang);
  const name = primary || t('chat.unknownAnimal');
  const [imgOk, setImgOk] = useState(true);
  const img = animal?.images?.[0];
  const isDone = match.status === 'adopted' || match.status === 'completed';

  let preview = match.lastMessage;
  if (match.status === 'pending') preview = t('chat.preview.pending');
  if (match.status === 'rejected') preview = t('chat.preview.rejected');

  return (
    <li>
      <button
        type="button"
        className={`mc-row ${active ? 'is-active' : ''} ${unread ? 'is-unread' : ''} mc-row--${groupOf(match.status)}`}
        onClick={onOpen}
        aria-current={active ? 'true' : undefined}
      >
        <span className="mc-row__avatar">
          {img && imgOk ? (
            <img loading="lazy" src={img} alt="" onError={() => setImgOk(false)} />
          ) : (
            <PawPrint size={22} aria-hidden="true" />
          )}
        </span>
        <span className="mc-row__body">
          <span className="mc-row__top">
            <span className="mc-row__name">{name}</span>
            <span className="mc-row__time">{formatWhen(activityTime(match), lang, t)}</span>
          </span>
          <span className="mc-row__preview">{preview}</span>
          <span className="mc-row__meta">
            {isDone && <Badge tone="success">{t('chat.status.adopted')}</Badge>}
            {animal?.shelter && <span className="mc-row__shelter">{animal.shelter}</span>}
          </span>
        </span>
        {unread && <span className="mc-row__dot" aria-label={t('chat.unread')} />}
      </button>
    </li>
  );
}

function MatchChat() {
  const { matches, loadingMatches } = useAppContext();
  const { user } = useAuth();
  const { t, lang } = useI18n();
  const navigate = useNavigate();
  const { matchId } = useParams();

  const [fetchedAnimals, setFetchedAnimals] = useState({});
  const [loadingAnimals, setLoadingAnimals] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showRejected, setShowRejected] = useState(false);
  const [isDesktop, setIsDesktop] = useState(() => window.matchMedia?.('(min-width: 768px)').matches);

  useEffect(() => {
    const mq = window.matchMedia?.('(min-width: 768px)');
    if (!mq) return;
    const onChange = (e) => setIsDesktop(e.matches);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);

  // Matches already carry their animal (joined in the query); only fetch the ones that don't
  useEffect(() => {
    const missing = [...new Set((matches || []).filter((m) => !m.animal).map((m) => m.animalId))]
      .filter((id) => id && !fetchedAnimals[id]);
    if (missing.length === 0) return;
    let cancelled = false;
    setLoadingAnimals(true);
    Promise.all(
      missing.map((id) => api.getAnimalById(id).then((a) => [id, a]).catch(() => [id, null]))
    ).then((pairs) => {
      if (cancelled) return;
      setFetchedAnimals((prev) => ({ ...prev, ...Object.fromEntries(pairs.map(([id, a]) => [id, a || {}])) }));
      setLoadingAnimals(false);
    });
    return () => { cancelled = true; };
  }, [matches]); // eslint-disable-line react-hooks/exhaustive-deps

  const animalFor = (m) => m.animal || fetchedAnimals[m.animalId] || null;

  const readChats = useMemo(() => (user?.id ? readChatsFor(user.id) : {}), [user?.id, matches, matchId]);

  const q = searchQuery.trim().toLowerCase();
  const visible = (matches || [])
    .filter((m) => {
      if (!q) return true;
      const a = animalFor(m);
      return `${a?.name || ''} ${a?.shelter || ''}`.toLowerCase().includes(q);
    })
    .sort((a, b) => activityTime(b) - activityTime(a));

  const groups = {
    active: visible.filter((m) => groupOf(m.status) === 'active'),
    pending: visible.filter((m) => groupOf(m.status) === 'pending'),
    rejected: visible.filter((m) => groupOf(m.status) === 'rejected'),
  };

  const openMatch = (m, replace = false) => {
    if (user?.id) {
      try {
        const rc = readChatsFor(user.id);
        rc[m.id] = Date.now();
        localStorage.setItem(`read_chats_${user.id}`, JSON.stringify(rc));
        window.dispatchEvent(new Event('chatReadUpdated'));
      } catch { /* storage unavailable */ }
      api.markMatchAsRead(m.id, 'user', user.id);
    }
    navigate(`/chat/${m.id}`, { replace });
  };

  // Desktop: open the latest conversation instead of an empty "pick a chat" panel
  const firstOpenable = groups.active[0] || groups.pending[0];
  useEffect(() => {
    if (isDesktop && !matchId && !loadingMatches && firstOpenable) openMatch(firstOpenable, true);
  }, [isDesktop, matchId, loadingMatches, firstOpenable?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  if (loadingMatches || loadingAnimals) {
    return <ChatListSkeleton />;
  }

  const total = matches?.length || 0;
  const hasAny = total > 0;

  const renderGroup = (key, items) =>
    items.length > 0 && (
      <section className="mc-group" aria-labelledby={`mc-${key}`}>
        <h2 id={`mc-${key}`} className="mc-group__title">
          {t(`chat.group.${key}`)} <span>{items.length}</span>
        </h2>
        {key === 'pending' && <p className="mc-group__hint">{t('chat.group.pendingHint')}</p>}
        <ul className="mc-list">
          {items.map((m) => (
            <MatchRow
              key={m.id}
              match={m}
              animal={animalFor(m)}
              active={m.id === matchId}
              unread={m.id !== matchId && isUnread(m, readChats)}
              onOpen={() => openMatch(m)}
              t={t}
              lang={lang}
            />
          ))}
        </ul>
      </section>
    );

  return (
    <div className="match-page matches-split-view mc">
      {/* List panel */}
      <div className={`matches-list-panel ${matchId ? 'hidden-on-mobile' : ''}`}>
        <motion.header
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2 }}
          className="mc-header"
        >
          <h1 className="mc-header__title">{t('chat.title')}</h1>
          {total >= SEARCH_MIN && (
            <label className="mc-search">
              <Search size={18} aria-hidden="true" />
              <input
                type="search"
                placeholder={t('chat.search')}
                aria-label={t('chat.search')}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </label>
          )}
        </motion.header>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25, delay: 0.05 }}
          className="mc-scroll"
        >
          {!hasAny ? (
            <>
              {/* Mobile shows the full guide here; desktop shows it in the right panel */}
              <div className="mc-only-mobile"><HowItWorks t={t} compact /></div>
              <p className="mc-only-desktop mc-empty-note">{t('chat.empty.listNote')}</p>
            </>
          ) : visible.length === 0 ? (
            <p className="mc-empty-note">{t('chat.noResults')}</p>
          ) : (
            <>
              {renderGroup('active', groups.active)}
              {renderGroup('pending', groups.pending)}
              {groups.rejected.length > 0 && (
                <div className="mc-rejected">
                  <button
                    type="button"
                    className="mc-rejected__toggle"
                    aria-expanded={showRejected}
                    onClick={() => setShowRejected((v) => !v)}
                  >
                    {t('chat.group.rejected', { count: groups.rejected.length })}
                    <ChevronDown size={16} aria-hidden="true" />
                  </button>
                  {showRejected && renderGroup('rejectedList', groups.rejected)}
                </div>
              )}
            </>
          )}
        </motion.div>
      </div>

      {/* Chat panel */}
      <div className={`matches-chat-panel ${!matchId ? 'hidden-on-mobile' : ''}`}>
        {matchId ? (
          <ChatRoom />
        ) : (
          <div className="mc-panel-empty">
            {hasAny ? (
              <p className="mc-empty-note">{t('chat.pick')}</p>
            ) : (
              <HowItWorks t={t} />
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default MatchChat;
