import { useState, useEffect, useRef } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Home, Heart, MessageCircle, User, LogIn, Shield, Building2, HandHeart, PawPrint, AlertTriangle, PlusCircle } from 'lucide-react';
import { useAppContext } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../services/supabaseClient';
import { api } from '../services/api';

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

  return (
    <nav className="main-nav">
      {/* Logo — visible only on desktop sidebar */}
      <div className="nav-logo">
        <PawPrint className="logo-icon text-primary" size={24} />
        <span className="font-bold text-headline-md">4 ขา<span className="text-primary">หาบ้าน</span></span>
      </div>

      {/* Main menu for users */}
      {!isFoundationPending && !isFoundationApproved && role !== 'super_admin' && (
        <>
          <Link to="/" className={`nav-item ${isActive('/') ? 'active' : ''}`} aria-label="หน้าหลัก หาบ้าน">
            <Home size={24} />
            <span>หน้าแรก</span>
          </Link>
          <Link 
            to="/matches" 
            className={`nav-item ${isActive('/matches') || location.pathname.startsWith('/chat') ? 'active' : ''}`} 
            aria-label="แชท"
          >
            <div className="relative flex justify-center">
              <MessageCircle size={24} />
              {userChatBadge > 0 && (
                <span className="nav-badge absolute -top-1 -right-2 bg-[#DC2626] text-white text-[10px] w-4 h-4 rounded-full flex items-center justify-center font-bold">
                  {userChatBadge}
                </span>
              )}
            </div>
            <span>แชท</span>
          </Link>
          <Link to="/donation" className={`nav-item ${isActive('/donation') ? 'active' : ''}`} aria-label="บริจาคช่วยเหลือ">
            <HandHeart size={24} />
            <span>บริจาค</span>
          </Link>
        </>
      )}

      {/* Foundation pending */}
      {isFoundationPending && (
        <Link to="/foundation/pending" className={`nav-item ${isActive('/foundation/pending') ? 'active' : ''}`} aria-label="สถานะมูลนิธิ">
          <Building2 size={24} />
          <span>สถานะมูลนิธิ</span>
        </Link>
      )}

      {/* Foundation approved: 4 core tabs (Home, Animals, Chats, Incidents) */}
      {isFoundationApproved && (
        <>
          <Link
            to="/foundation"
            className={`nav-item ${location.pathname === '/foundation' ? 'active' : ''}`}
            aria-label="หน้าหลักมูลนิธิ"
          >
            <Home size={24} />
            <span>หน้าหลัก</span>
          </Link>
          <Link
            to="/foundation/animals"
            className={`nav-item ${location.pathname.startsWith('/foundation/animals') ? 'active' : ''}`}
            aria-label="สัตว์ในดูแล"
          >
            <PawPrint size={24} />
            <span>สัตว์ในดูแล</span>
          </Link>
          <Link
            to="/foundation/matches"
            className={`nav-item ${location.pathname.startsWith('/foundation/matches') || location.pathname.startsWith('/foundation/chat') ? 'active' : ''}`}
            aria-label="แชท"
          >
            <div className="relative flex justify-center">
              <MessageCircle size={24} />
              {foundationChatBadge > 0 && (
                <span className="nav-badge absolute -top-1 -right-2 bg-[#DC2626] text-white text-[10px] w-4 h-4 rounded-full flex items-center justify-center font-bold">
                  {foundationChatBadge}
                </span>
              )}
            </div>
            <span>แชท</span>
          </Link>
          <Link
            to="/foundation/incidents"
            className={`nav-item ${location.pathname.startsWith('/foundation/incidents') ? 'active' : ''}`}
            aria-label="แจ้งเหตุกู้ภัย"
          >
            <div className="relative flex justify-center">
              <AlertTriangle size={24} />
              {pendingIncidents > 0 && (
                <span className="nav-badge absolute -top-1 -right-2 bg-[#DC2626] text-white text-[10px] w-4 h-4 rounded-full flex items-center justify-center font-bold">
                  {pendingIncidents}
                </span>
              )}
            </div>
            <span>แจ้งเหตุกู้ภัย</span>
          </Link>
        </>
      )}
      
      {/* Super Admin */}
      {role === 'super_admin' && (
        <Link to="/admin" className={`nav-item ${isActive('/admin') ? 'active' : ''}`} aria-label="ระบบจัดการผู้ใช้งาน">
          <Shield size={24} />
          <span>ระบบจัดการ</span>
        </Link>
      )}
      
      {/* Profile / Login */}
      {user ? (
        <Link to="/profile" className={`nav-item ${isActive('/profile') ? 'active' : ''}`} aria-label="โปรไฟล์ผู้ใช้งาน">
          {avatarUrl && !imgError ? (
            <img 
              src={avatarUrl} 
              alt="Profile" 
              style={{ width: '24px', height: '24px', borderRadius: '50%', objectFit: 'cover' }} 
              onError={() => setImgError(true)}
            />
          ) : (
            <img 
              src={`https://ui-avatars.com/api/?name=${encodeURIComponent(displayName)}&background=D97706&color=fff`} 
              alt="Profile Default" 
              style={{ width: '24px', height: '24px', borderRadius: '50%', objectFit: 'cover' }} 
            />
          )}
          <span>โปรไฟล์</span>
        </Link>
      ) : (
        <Link to="/login" className="nav-item" aria-label="เข้าสู่ระบบ">
          <LogIn size={24} />
          <span>เข้าสู่ระบบ</span>
        </Link>
      )}
    </nav>
  );
}
