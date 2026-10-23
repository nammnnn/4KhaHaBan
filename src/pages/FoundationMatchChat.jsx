import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { supabase } from '../services/supabaseClient';
import { ChevronDown, MessageCircle, PawPrint, Search, ShieldCheck } from 'lucide-react';
import { ChatListSkeleton } from '../components/Skeletons';
import FoundationChatRoom from './FoundationChatRoom';
import './MatchChat.css';
import './FoundationMatchChat.css';

const GROUP_TITLES = {
  pending: 'คำขอใหม่ · รอคุณตอบ',
  active: 'กำลังคุย',
  adopted: 'ส่งมอบแล้ว',
  rejected: 'ปฏิเสธแล้ว',
};

function groupOf(status) {
  if (status === 'pending') return 'pending';
  if (status === 'adopted' || status === 'completed') return 'adopted';
  if (status === 'rejected') return 'rejected';
  return 'active';
}

// "14:05" today, "เมื่อวาน", weekday this week, otherwise "12 ต.ค."
function whenLabel(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  const now = new Date();
  const days = Math.floor((new Date(now.toDateString()) - new Date(d.toDateString())) / 86400000);
  if (days <= 0) return d.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' });
  if (days === 1) return 'เมื่อวาน';
  if (days < 7) return d.toLocaleDateString('th-TH', { weekday: 'short' });
  return d.toLocaleDateString('th-TH', { day: 'numeric', month: 'short' });
}

// Adopter initials + a small photo of the pet they asked for (no third-party avatar service)
function RequestRow({ match, animal, active, onOpen }) {
  const name = match.userData?.full_name || 'ผู้ขอรับเลี้ยง';
  const [photoOk, setPhotoOk] = useState(true);
  const [petOk, setPetOk] = useState(true);
  const photo = match.userData?.avatar_url;
  const pet = animal?.images?.[0];
  const group = groupOf(match.status);
  const waitingForYou = group === 'active' && match.lastSender === 'user';

  let preview = match.lastMessage || '';
  if (group === 'pending') preview = 'ส่งใบสมัครแล้ว รอคุณพิจารณา';

  return (
    <li>
      <button
        type="button"
        className={`mc-row fmc-row mc-row--${group} ${active ? 'is-active' : ''} ${group === 'pending' || waitingForYou ? 'is-unread' : ''}`}
        onClick={onOpen}
        aria-current={active ? 'true' : undefined}
      >
        <span className="fmc-avatar">
          <span className="mc-row__avatar fmc-avatar__person">
            {photo && photoOk ? <img src={photo} alt="" loading="lazy" onError={() => setPhotoOk(false)} /> : name.trim().charAt(0)}
          </span>
          <span className="fmc-avatar__pet" aria-hidden="true">
            {pet && petOk ? <img src={pet} alt="" loading="lazy" onError={() => setPetOk(false)} /> : <PawPrint size={12} />}
          </span>
        </span>
        <span className="mc-row__body">
          <span className="mc-row__top">
            <span className="mc-row__name">
              {name}
              {match.userData?.status === 'verified' && <ShieldCheck size={14} className="fmc-verified" aria-label="ยืนยันตัวตนแล้ว" />}
            </span>
            <span className="mc-row__time">{whenLabel(match.created_at)}</span>
          </span>
          <span className="fmc-pet">ขอรับ <strong>{animal?.name || 'น้อง'}</strong></span>
          <span className="mc-row__preview">{preview}</span>
        </span>
        {(group === 'pending' || waitingForYou) && <span className="mc-row__dot" aria-label="รอคุณตอบ" />}
      </button>
    </li>
  );
}

function FoundationMatchChat() {
  const { user } = useAuth();
  const [matches, setMatches] = useState([]);
  const [animalData, setAnimalData] = useState({});
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const { matchId } = useParams(); // Check if a chat is active

  const [searchQuery, setSearchQuery] = useState('');
  const [showRejected, setShowRejected] = useState(false);
  const [selectedAnimalId, setSelectedAnimalId] = useState('all');

  useEffect(() => {
    let isMounted = true;

    const fetchMatches = async (showSkeleton = false) => {
      try {
        if (showSkeleton) setLoading(true);
        const foundationMatches = await api.getFoundationMatches(user?.id);
        if (!isMounted) return;
        setMatches(foundationMatches || []);

        if (foundationMatches && foundationMatches.length > 0) {
          const animalIds = [...new Set(foundationMatches.map(m => m.animalId))];
          const dataMap = {};
          
          await Promise.all(
            animalIds.map(async (id) => {
              try {
                const data = await api.getAnimalById(id);
                if (isMounted) dataMap[id] = data;
              } catch (err) {
                console.error(`Error fetching animal ${id}:`, err);
              }
            })
          );
          
          if (isMounted) setAnimalData(dataMap);
        }
      } catch (error) {
        console.error("Error fetching foundation matches", error);
      } finally {
        if (isMounted && showSkeleton) setLoading(false);
      }
    };

    // Only show skeleton on initial load if we don't have matches yet
    fetchMatches(matches.length === 0);

    let channel = null;
    if (supabase && user?.id) {
      channel = supabase
        .channel(`foundation_matches_realtime_${user.id}`)
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'matches' },
          () => {
            // Background update — DO NOT flash skeleton screen!
            fetchMatches(false);
          }
        )
        .subscribe();
    }

    return () => {
      isMounted = false;
      if (channel && supabase) {
        supabase.removeChannel(channel);
      }
    };
  }, [user?.id]);

  if (loading) {
    return <ChatListSkeleton />;
  }

  // One list, grouped by what the foundation has to do (was three tabs; new requests sat in a
  // tab that wasn't open by default, so they were easy to miss)
  const q = searchQuery.toLowerCase().trim();
  const visible = matches.filter((m) => {
    const animal = animalData[m.animalId];
    if (!animal) return false;
    if (selectedAnimalId !== 'all' && m.animalId !== selectedAnimalId) return false;
    if (!q) return true;
    return [m.userData?.full_name, animal.name, m.lastMessage].some((v) => (v || '').toLowerCase().includes(q));
  });
  const groups = {
    pending: visible.filter((m) => groupOf(m.status) === 'pending'),
    active: visible.filter((m) => groupOf(m.status) === 'active'),
    adopted: visible.filter((m) => groupOf(m.status) === 'adopted'),
    rejected: visible.filter((m) => groupOf(m.status) === 'rejected'),
  };

  // Animals that have at least one request, for the filter
  const animalOptions = Object.entries(
    matches.reduce((acc, m) => ({ ...acc, [m.animalId]: (acc[m.animalId] || 0) + 1 }), {})
  ).map(([id, count]) => ({ id, count, name: animalData[id]?.name })).filter((o) => o.name);

  const openMatch = (match) => {
    if (user?.id) api.markMatchAsRead(match.id, 'shelter', user.id);
    navigate(`/foundation/chat/${match.id}`);
  };

  const renderGroup = (key, items) => items.length > 0 && (
    <section className="mc-group" aria-labelledby={`fmc-${key}`} key={key}>
      <h2 id={`fmc-${key}`} className="mc-group__title">
        {GROUP_TITLES[key]} <span>{items.length}</span>
      </h2>
      {key === 'pending' && <p className="mc-group__hint">อ่านใบสมัครแล้วกด "อนุมัติ" หรือ "ปฏิเสธ" ในแชท</p>}
      <ul className="mc-list">
        {items.map((m) => (
          <RequestRow key={m.id} match={m} animal={animalData[m.animalId]} active={m.id === matchId} onOpen={() => openMatch(m)} />
        ))}
      </ul>
    </section>
  );

  const nothing = visible.length === 0;

  return (
    <div className="match-page matches-split-view mc">
      <div className={`matches-list-panel ${matchId ? 'hidden-on-mobile' : ''}`}>
        <div className="mc-header">
          <h1 className="mc-header__title">แชท</h1>
          {matches.length > 0 && (
            <div className="fmc-filters">
              <label className="mc-search">
                <Search size={18} aria-hidden="true" />
                <input
                  type="search"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="ค้นหาชื่อผู้ขอ หรือชื่อน้อง"
                  aria-label="ค้นหาแชท"
                />
              </label>
              {animalOptions.length > 1 && (
                <select
                  className="fmc-animal"
                  value={selectedAnimalId}
                  onChange={(e) => setSelectedAnimalId(e.target.value)}
                  aria-label="กรองตามน้อง"
                >
                  <option value="all">น้องทุกตัว</option>
                  {animalOptions.map((o) => <option key={o.id} value={o.id}>{o.name} ({o.count})</option>)}
                </select>
              )}
            </div>
          )}
        </div>

        <div className="mc-scroll">
          {matches.length === 0 ? (
            <div className="mc-how">
              <span className="mc-how__icon" aria-hidden="true"><MessageCircle size={34} /></span>
              <h2 className="mc-how__title">ยังไม่มีคำขอรับเลี้ยง</h2>
              <p className="mc-how__lead">เมื่อมีคนกดขอรับเลี้ยงน้อง ใบสมัครและแชทจะมาอยู่ที่นี่</p>
              <Link to="/foundation/animals/new" className="ui-btn ui-btn--primary mc-how__cta">เพิ่มสัตว์หาบ้าน</Link>
            </div>
          ) : nothing ? (
            <div className="mc-empty-note">
              ไม่พบแชทที่ตรงกับการค้นหา
              {(selectedAnimalId !== 'all' || q) && (
                <div><button type="button" className="fmc-clear" onClick={() => { setSelectedAnimalId('all'); setSearchQuery(''); }}>ล้างการค้นหา</button></div>
              )}
            </div>
          ) : (
            <>
              {renderGroup('pending', groups.pending)}
              {renderGroup('active', groups.active)}
              {renderGroup('adopted', groups.adopted)}
              {groups.rejected.length > 0 && (
                <div className="mc-rejected">
                  <button
                    type="button"
                    className="mc-rejected__toggle"
                    aria-expanded={showRejected}
                    onClick={() => setShowRejected((v) => !v)}
                  >
                    ปฏิเสธแล้ว ({groups.rejected.length}) <ChevronDown size={16} aria-hidden="true" />
                  </button>
                  {showRejected && renderGroup('rejected', groups.rejected)}
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Chat Panel */}
      <div className={`matches-chat-panel ${!matchId ? 'hidden-on-mobile hidden-on-desktop' : ''}`}>
        {matchId ? (
          <FoundationChatRoom />
        ) : (
          <div className="mc-panel-empty">
            <p className="mc-empty-note">เลือกแชทจากรายการ เพื่ออ่านใบสมัครและคุยกับผู้ขอรับเลี้ยง</p>
          </div>
        )}
      </div>

    </div>
  );
}

export default FoundationMatchChat;
