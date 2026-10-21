import { useState, useEffect, useRef } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { motion, useReducedMotion } from 'framer-motion';
import { Home, MessageCircle, LogIn, Shield, Building2, HandHeart, PawPrint, AlertTriangle } from 'lucide-react';
import { useAppContext } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../services/supabaseClient';
import { api } from '../services/api';

// One tab in the dock (mobile) / sidebar (desktop). DESIGN.md §7.4
function NavItem({ to, active, icon: Icon, label, ariaLabel, badge = 0, children }) {
  const reduceMotion = useReducedMotion();
  return (
    <Link
      to={to}
      className={`nav-item${active ? ' active' : ''}`}
      aria-label={badge > 0 ? `${ariaLabel || label} (${badge} รายการใหม่)` : ariaLabel || label}
      aria-current={active ? 'page' : undefined}
    >
      {active && (
        <motion.span
          layoutId="nav-active-pill"
          className="nav-pill"
          transition={reduceMotion ? { duration: 0 } : { type: 'spring', stiffness: 500, damping: 38 }}
          aria-hidden="true"
        />
      )}
      <span className="nav-icon">
        {children || <Icon size={22} strokeWidth={active ? 2.4 : 2} aria-hidden="true" />}
        {badge > 0 && <span className="nav-badge" aria-hidden="true">{badge > 9 ? '9+' : badge}</span>}
      </span>
      <span className="nav-label">{label}</span>
    </Link>
  );
}

export function Navigation() {
  const location = useLocation();
  const { matches } = useAppContext();
  const { user, profile, role, foundationStatus } = useAuth();
  const [imgError, setImgError] = useState(false);
  const [pendingIncidents, setPendingIncidents] = useState(0);
  const [foundationChatBadge, setFoundationChatBadge] = useState(0);
  const [userChatBadge, setUserChatBadge] = useState(0);
  const pathnameRef = useRef(location.pathname);

  useEffect(() => {
    pathnameRef.current = location.pathname;
  }, [location.pathname]);

  const avatarUrl = profile?.avatar_url || user?.user_metadata?.avatar_url;
  const displayName = profile?.full_name || user?.user_metadata?.full_name || user?.email || 'User';

  useEffect(() => {
    setImgError(false);
  }, [avatarUrl]);

  const isFoundationApproved = role === 'foundation' && foundationStatus === 'approved';

  // Fetch pending rescue incident reports count for foundation badge
  useEffect(() => {
    if (!isFoundationApproved || !supabase) return;

    const fetchPendingIncidents = async () => {
      try {
        const { count } = await supabase
          .from('incident_reports')
          .select('*', { count: 'exact', head: true })
          .eq('status', 'pending');
        setPendingIncidents(count || 0);
      } catch (err) {
        // Fallback gracefully
      }
    };

    fetchPendingIncidents();

    const channel = supabase
      .channel('nav_foundation_incidents')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'incident_reports' },
        () => {
          fetchPendingIncidents();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [isFoundationApproved]);

  // Fetch unread messages & pending chat applications count for foundation badge
  useEffect(() => {
    if (!isFoundationApproved || !user?.id) return;

    let isMounted = true;

    const fetchFoundationChatBadge = async () => {
      try {
        const foundationMatches = await api.getFoundationMatches(user.id);
        if (!isMounted) return;

        if (foundationMatches && foundationMatches.length > 0) {
          const readChats = JSON.parse(localStorage.getItem(`read_chats_foundation_${user.id}`) || '{}');
          const currentPath = pathnameRef.current;
          const currentOpenMatchId = currentPath.startsWith('/foundation/chat/')
            ? currentPath.split('/foundation/chat/')[1]
            : null;

          const totalUnread = foundationMatches.reduce((acc, m) => {
            // 1. If currently viewing this chat, don't show badge
            if (currentOpenMatchId && m.id === currentOpenMatchId) return acc;

            // 2. If the last message was sent by the shelter, do NOT show badge to the shelter
            const sender = m.lastSender || m.last_sender;
            if (sender === 'shelter') return acc;

            // 3. If shelter already opened/read this chat after its latest update
            const lastRead = readChats[m.id] || 0;
            const matchTime = new Date(m.last_message_at || m.created_at).getTime();
            if (lastRead >= matchTime) return acc;

            // 4. Pending application not viewed yet or unread message from user
            const isUnreadPending = m.status === 'pending' && !readChats[m.id];
            const hasUnread = (m.unread || 0) > 0 && sender !== 'shelter';

            return acc + (hasUnread || isUnreadPending ? 1 : 0);
          }, 0);

          setFoundationChatBadge(totalUnread);
        } else {
          setFoundationChatBadge(0);
        }
      } catch (err) {
        setFoundationChatBadge(0);
      }
    };

    fetchFoundationChatBadge();

    window.addEventListener('chatReadUpdated', fetchFoundationChatBadge);
    window.addEventListener('storage', fetchFoundationChatBadge);

    let matchesChannel = null;
    if (supabase) {
      matchesChannel = supabase
        .channel(`nav_foundation_matches_${user.id}`)
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'matches' },
          () => {
            fetchFoundationChatBadge();
          }
        )
        .subscribe();
    }

    return () => {
      isMounted = false;
      window.removeEventListener('chatReadUpdated', fetchFoundationChatBadge);
      window.removeEventListener('storage', fetchFoundationChatBadge);
      if (matchesChannel && supabase) {
        supabase.removeChannel(matchesChannel);
      }
    };
  }, [isFoundationApproved, user?.id]);

  // Update badge immediately when navigating between routes
  useEffect(() => {
    if (isFoundationApproved && user?.id) {
      window.dispatchEvent(new Event('chatReadUpdated'));
    }
  }, [location.pathname, isFoundationApproved, user?.id]);

  // Fetch unread messages & new updates count for user chat badge
  useEffect(() => {
    if (isFoundationApproved || !user?.id) {
      setUserChatBadge(0);
      return;
    }

    const computeUserChatBadge = () => {
      try {
        const readChats = JSON.parse(localStorage.getItem(`read_chats_${user.id}`) || '{}');
        const currentOpenMatchId = location.pathname.startsWith('/chat/')
          ? location.pathname.split('/chat/')[1]
          : null;

        const count = matches.reduce((acc, m) => {
          // If currently viewing this chat, don't show badge
          if (currentOpenMatchId && m.id === currentOpenMatchId) return acc;

          // If last sender was the user, do NOT show badge to the user
          const sender = m.lastSender || m.last_sender;
          if (sender === 'user') return acc;

          const lastRead = readChats[m.id] || 0;
          const matchTime = new Date(m.last_message_at || m.created_at).getTime();
          if (lastRead >= matchTime) return acc;

          const hasUnreadFlag = (m.unread || 0) > 0 && sender !== 'user';
          const isActionableNotRead = (m.status === 'approved' || m.status === 'rejected' || m.status === 'adopted') && !readChats[m.id];
          return acc + (hasUnreadFlag || isActionableNotRead ? 1 : 0);
        }, 0);
        setUserChatBadge(count);
      } catch (err) {
        setUserChatBadge(0);
      }
    };

    computeUserChatBadge();

    const handleUpdate = () => computeUserChatBadge();
    window.addEventListener('storage', handleUpdate);
    window.addEventListener('chatReadUpdated', handleUpdate);

    return () => {
      window.removeEventListener('storage', handleUpdate);
      window.removeEventListener('chatReadUpdated', handleUpdate);
    };
  }, [matches, user?.id, isFoundationApproved, location.pathname]);

  const isActive = (path) => location.pathname === path;

  // Hide navbar on login, onboarding
  const hiddenPaths = ['/login', '/foundation/onboarding'];
  if (hiddenPaths.some(p => location.pathname.startsWith(p))) {
    return null;
  }

  const isFoundationPending = role === 'foundation' && foundationStatus !== 'approved';

  const initial = (displayName || '?').trim().charAt(0).toUpperCase();
  const avatar = (
    <span className="nav-avatar" aria-hidden="true">
      {avatarUrl && !imgError ? (
        <img src={avatarUrl} alt="" onError={() => setImgError(true)} />
      ) : (
        initial
      )}
    </span>
  );
  const path = location.pathname;

  return (
    <nav className="main-nav" aria-label="เมนูหลัก">
      {/* Logo — desktop sidebar only */}
      <Link to={isFoundationApproved ? '/foundation' : '/'} className="nav-logo" aria-label="4 ขาหาบ้าน หน้าแรก">
        <span className="nav-logo__mark" aria-hidden="true"><PawPrint size={20} /></span>
        <span>4 ขา<span className="nav-logo__accent">หาบ้าน</span></span>
      </Link>

      <div className="nav-items">
        {/* Adopter / donor */}
        {!isFoundationPending && !isFoundationApproved && role !== 'super_admin' && (
          <>
            <NavItem to="/" active={isActive('/')} icon={Home} label="หน้าแรก" ariaLabel="หน้าแรก หาบ้านให้น้อง" />
            <NavItem to="/matches" active={isActive('/matches') || path.startsWith('/chat')} icon={MessageCircle} label="แชท" badge={userChatBadge} />
            <NavItem to="/report" active={isActive('/report')} icon={AlertTriangle} label="แจ้งเหตุ" ariaLabel="แจ้งเหตุสัตว์ต้องการความช่วยเหลือ" />
            <NavItem to="/donation" active={isActive('/donation')} icon={HandHeart} label="บริจาค" />
          </>
        )}

        {isFoundationPending && (
          <NavItem to="/foundation/pending" active={isActive('/foundation/pending')} icon={Building2} label="สถานะมูลนิธิ" />
        )}

        {isFoundationApproved && (
          <>
            <NavItem to="/foundation" active={path === '/foundation'} icon={Home} label="หน้าหลัก" ariaLabel="หน้าหลักมูลนิธิ" />
            <NavItem to="/foundation/animals" active={path.startsWith('/foundation/animals')} icon={PawPrint} label="สัตว์ในดูแล" />
            <NavItem
              to="/foundation/matches"
              active={path.startsWith('/foundation/matches') || path.startsWith('/foundation/chat')}
              icon={MessageCircle}
              label="แชท"
              badge={foundationChatBadge}
            />
            <NavItem to="/foundation/incidents" active={path.startsWith('/foundation/incidents')} icon={AlertTriangle} label="แจ้งเหตุ" ariaLabel="แจ้งเหตุกู้ภัย" badge={pendingIncidents} />
          </>
        )}

        {role === 'super_admin' && (
          <NavItem to="/admin" active={isActive('/admin')} icon={Shield} label="ระบบจัดการ" ariaLabel="ระบบจัดการผู้ใช้งาน" />
        )}

        {user ? (
          <NavItem to="/profile" active={isActive('/profile')} label="โปรไฟล์" ariaLabel="โปรไฟล์ของฉัน">
            {avatar}
          </NavItem>
        ) : (
          <NavItem to="/login" active={false} icon={LogIn} label="เข้าสู่ระบบ" />
        )}
      </div>

      {/* Desktop: signed-in user card at the bottom of the sidebar */}
      {user && (
        <Link to="/profile" className="nav-user">
          {avatar}
          <span className="nav-user__text">
            <span className="nav-user__name">{displayName}</span>
            <span className="nav-user__hint">ดูโปรไฟล์</span>
          </span>
        </Link>
      )}
    </nav>
  );
}
