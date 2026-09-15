import { useEffect, useState, useMemo, useRef, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { supabase } from '../services/supabaseClient';
import { Heart, Clock, Loader, ArrowLeft, Search, XCircle, CheckCircle, PawPrint, User, ChevronLeft, ChevronRight } from 'lucide-react';
import { ChatListSkeleton } from '../components/Skeletons';
import FoundationChatRoom from './FoundationChatRoom';

// Removed 3D Icon

function FoundationMatchChat() {
  const { user } = useAuth();
  const [matches, setMatches] = useState([]);
  const [animalData, setAnimalData] = useState({});
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const { matchId } = useParams(); // Check if a chat is active

  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('active'); // 'active', 'pending', or 'rejected'
  const [selectedAnimalId, setSelectedAnimalId] = useState('all');

  const chipsRef = useRef(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const checkScroll = useCallback(() => {
    if (chipsRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = chipsRef.current;
      setCanScrollLeft(scrollLeft > 4);
      setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 4);
    }
  }, []);

  // Reset selected animal filter whenever active tab changes
  useEffect(() => {
    setSelectedAnimalId('all');
  }, [activeTab]);

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

  // Animals with application count in current active tab (must be before any early returns)
  const animalChips = useMemo(() => {
    const counts = {};
    matches.forEach(m => {
      let matchesTab = false;
      if (activeTab === 'active') matchesTab = m.status === 'approved' || m.status === 'adopted' || m.status === 'completed';
      else if (activeTab === 'pending') matchesTab = m.status === 'pending';
      else if (activeTab === 'rejected') matchesTab = m.status === 'rejected';

      if (matchesTab && m.animalId) {
        counts[m.animalId] = (counts[m.animalId] || 0) + 1;
      }
    });

    return Object.keys(counts)
      .map(id => ({
        id,
        animal: animalData[id],
        count: counts[id]
      }))
      .filter(item => item.animal);
  }, [matches, activeTab, animalData]);

  useEffect(() => {
    checkScroll();
    const handleResize = () => checkScroll();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [checkScroll, animalChips]);

  const handleScrollChips = (direction) => {
    if (chipsRef.current) {
      chipsRef.current.scrollBy({
        left: direction === 'left' ? -200 : 200,
        behavior: 'smooth'
      });
      setTimeout(checkScroll, 220);
    }
  };

  if (loading) {
    return <ChatListSkeleton />;
  }

  // Filter logic
  const filteredMatches = matches.filter(match => {
    const animal = animalData[match.animalId];
    if (!animal) return false;

    // 1. Tab filter
    let matchesTab = false;
    if (activeTab === 'active') matchesTab = match.status === 'approved' || match.status === 'adopted' || match.status === 'completed';
    else if (activeTab === 'pending') matchesTab = match.status === 'pending';
    else if (activeTab === 'rejected') matchesTab = match.status === 'rejected';
    if (!matchesTab) return false;

    // 2. Animal filter chip
    if (selectedAnimalId !== 'all' && match.animalId !== selectedAnimalId) {
      return false;
    }

    // 3. Search filter (by adopter name, animal name, or message)
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      const adopterName = (match.userData?.full_name || 'ผู้ขอรับเลี้ยง').toLowerCase();
      const animalName = animal.name.toLowerCase();
      const lastMsg = (match.lastMessage || '').toLowerCase();
      if (!adopterName.includes(q) && !animalName.includes(q) && !lastMsg.includes(q)) {
        return false;
      }
    }

    return true;
  });

  const activeCount = matches.filter(m => m.status === 'approved' || m.status === 'adopted' || m.status === 'completed').length;
  const pendingCount = matches.filter(m => m.status === 'pending').length;
  const rejectedCount = matches.filter(m => m.status === 'rejected').length;

  return (
    <div className="match-page matches-split-view">
      
      {/* List Panel */}
      <div className={`matches-list-panel ${matchId ? 'hidden-on-mobile' : ''}`}>
        <div className="list-header" style={{ padding: '20px 20px 0' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <h1 className="page-title" style={{ margin: 0, fontSize: '1.4rem', fontWeight: 700, color: 'var(--text-dark, #111827)' }}>
              แชทพูดคุย
            </h1>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-medium, #6B7280)', backgroundColor: 'var(--gray-100, #F3F4F6)', padding: '3px 10px', borderRadius: '12px', fontWeight: 600 }}>
              {matches.length} รายการ
            </span>
          </div>

          {/* Tabs with Count Badges */}
          <div className="chat-tabs" style={{ display: 'flex', borderBottom: '1px solid var(--gray-200, #E5E7EB)', marginTop: '16px' }}>
            <button 
              onClick={() => setActiveTab('active')}
              style={{ 
                flex: 1, paddingBottom: '12px', textAlign: 'center', fontSize: '0.85rem', fontWeight: 600,
                borderBottom: activeTab === 'active' ? '2.5px solid var(--primary, #D97706)' : '2.5px solid transparent',
                color: activeTab === 'active' ? 'var(--primary, #D97706)' : 'var(--text-medium, #6B7280)',
                background: 'none', border: 'none', cursor: 'pointer', transition: 'all 0.15s ease',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px'
              }}
            >
              <span>ข้อความ</span>
              {activeCount > 0 && (
                <span style={{ 
                  fontSize: '0.72rem', padding: '1px 6px', borderRadius: '10px',
                  backgroundColor: activeTab === 'active' ? '#FEF3C7' : '#F3F4F6',
                  color: activeTab === 'active' ? '#D97706' : '#6B7280',
                  fontWeight: 700
                }}>
                  {activeCount}
                </span>
              )}
            </button>
            <button 
              onClick={() => setActiveTab('pending')}
              style={{ 
                flex: 1, paddingBottom: '12px', textAlign: 'center', fontSize: '0.85rem', fontWeight: 600,
                borderBottom: activeTab === 'pending' ? '2.5px solid var(--primary, #D97706)' : '2.5px solid transparent',
                color: activeTab === 'pending' ? 'var(--primary, #D97706)' : 'var(--text-medium, #6B7280)',
                background: 'none', border: 'none', cursor: 'pointer', transition: 'all 0.15s ease',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px'
              }}
            >
              <span>รอดำเนินการ</span>
              {pendingCount > 0 && (
                <span style={{ 
                  fontSize: '0.72rem', padding: '1px 6px', borderRadius: '10px',
                  backgroundColor: activeTab === 'pending' ? '#FEF3C7' : '#F3F4F6',
                  color: activeTab === 'pending' ? '#D97706' : '#6B7280',
                  fontWeight: 700
                }}>
                  {pendingCount}
                </span>
              )}
            </button>
            <button 
              onClick={() => setActiveTab('rejected')}
              style={{ 
                flex: 1, paddingBottom: '12px', textAlign: 'center', fontSize: '0.85rem', fontWeight: 600,
                borderBottom: activeTab === 'rejected' ? '2.5px solid #DC2626' : '2.5px solid transparent',
                color: activeTab === 'rejected' ? '#DC2626' : 'var(--text-medium, #6B7280)',
                background: 'none', border: 'none', cursor: 'pointer', transition: 'all 0.15s ease',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px'
              }}
            >
              <span>ปฏิเสธแล้ว</span>
              {rejectedCount > 0 && (
                <span style={{ 
                  fontSize: '0.72rem', padding: '1px 6px', borderRadius: '10px',
                  backgroundColor: activeTab === 'rejected' ? '#FEE2E2' : '#F3F4F6',
                  color: activeTab === 'rejected' ? '#DC2626' : '#6B7280',
                  fontWeight: 700
                }}>
                  {rejectedCount}
                </span>
              )}
            </button>
          </div>
          
          {/* Search Box */}
          <div className="chat-search-bar" style={{ padding: '14px 0 10px' }}>
            <div style={{ position: 'relative' }}>
              <Search size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#9CA3AF' }} />
              <input 
                type="text" 
                placeholder="ค้นหาชื่อผู้ขอ, ชื่อน้องสัตว์..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{ 
                  width: '100%', height: '40px', padding: '0 16px 0 38px', 
                  borderRadius: '10px', border: '1px solid var(--gray-200, #E5E7EB)', 
                  backgroundColor: '#F9FAFB', outline: 'none', fontSize: '0.875rem', 
                  boxSizing: 'border-box', transition: 'all 0.15s ease' 
                }}
                onFocus={(e) => { e.target.style.backgroundColor = '#FFFFFF'; e.target.style.borderColor = 'var(--primary, #D97706)'; }}
                onBlur={(e) => { e.target.style.backgroundColor = '#F9FAFB'; e.target.style.borderColor = '#E5E7EB'; }}
              />
            </div>
          </div>

          {/* Animal Filter Chips (หมวดหมู่ตามน้องสัตว์) */}
          {animalChips.length > 0 && (
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center', marginBottom: '8px' }}>
              {canScrollLeft && (
                <button
                  type="button"
                  onClick={() => handleScrollChips('left')}
                  aria-label="เลื่อนซ้าย"
                  style={{
                    position: 'absolute',
                    left: '-8px',
                    zIndex: 10,
                    width: '28px',
                    height: '28px',
                    borderRadius: '50%',
                    backgroundColor: '#FFFFFF',
                    border: '1px solid #E5E7EB',
                    boxShadow: '0 2px 6px rgba(0,0,0,0.14)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#374151',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease'
                  }}
                >
                  <ChevronLeft size={16} />
                </button>
              )}

              <div 
                ref={chipsRef}
                className="animal-filter-chips"
                onScroll={checkScroll}
                onWheel={(e) => {
                  if (e.deltaY !== 0 && chipsRef.current) {
                    chipsRef.current.scrollLeft += e.deltaY;
                    checkScroll();
                  }
                }}
                style={{ flex: 1, padding: '2px 0 6px' }}
              >
                <button
                  type="button"
                  onClick={() => setSelectedAnimalId('all')}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '5px 12px',
                    borderRadius: '20px',
                    fontSize: '0.8rem',
                    fontWeight: 600,
                    whiteSpace: 'nowrap',
                    cursor: 'pointer',
                    border: selectedAnimalId === 'all' ? '1.5px solid var(--primary, #D97706)' : '1px solid #E5E7EB',
                    backgroundColor: selectedAnimalId === 'all' ? 'var(--primary, #D97706)' : '#FFFFFF',
                    color: selectedAnimalId === 'all' ? '#FFFFFF' : '#4B5563',
                    boxShadow: selectedAnimalId === 'all' ? '0 2px 6px rgba(217,119,6,0.25)' : 'none',
                    transition: 'all 0.15s ease',
                    flexShrink: 0
                  }}
                >
                  <PawPrint size={13} />
                  <span>ทั้งหมด</span>
                  <span style={{ 
                    fontSize: '0.72rem', 
                    padding: '1px 6px', 
                    borderRadius: '10px', 
                    backgroundColor: selectedAnimalId === 'all' ? 'rgba(255,255,255,0.25)' : '#F3F4F6',
                    color: selectedAnimalId === 'all' ? '#FFFFFF' : '#6B7280'
                  }}>
                    {activeTab === 'active' ? activeCount : activeTab === 'pending' ? pendingCount : rejectedCount}
                  </span>
                </button>

                {animalChips.map(item => {
                  const isSelected = selectedAnimalId === item.id;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setSelectedAnimalId(isSelected ? 'all' : item.id)}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                        padding: '4px 11px 4px 5px',
                        borderRadius: '20px',
                        fontSize: '0.8rem',
                        fontWeight: 600,
                        whiteSpace: 'nowrap',
                        cursor: 'pointer',
                        border: isSelected ? '1.5px solid var(--primary, #D97706)' : '1px solid #E5E7EB',
                        backgroundColor: isSelected ? 'var(--primary, #D97706)' : '#FFFFFF',
                        color: isSelected ? '#FFFFFF' : '#4B5563',
                        boxShadow: isSelected ? '0 2px 6px rgba(217,119,6,0.25)' : 'none',
                        transition: 'all 0.15s ease',
                        flexShrink: 0
                      }}
                    >
                      <img 
                        src={item.animal.images?.[0] || 'https://via.placeholder.com/60'} 
                        alt={item.animal.name}
                        style={{ width: '22px', height: '22px', borderRadius: '50%', objectFit: 'cover' }}
                      />
                      <span>{item.animal.name}</span>
                      <span style={{ 
                        fontSize: '0.72rem', 
                        padding: '1px 6px', 
                        borderRadius: '10px', 
                        backgroundColor: isSelected ? 'rgba(255,255,255,0.25)' : '#F3F4F6',
                        color: isSelected ? '#FFFFFF' : '#6B7280'
                      }}>
                        {item.count}
                      </span>
                    </button>
                  );
                })}
              </div>

              {canScrollRight && (
                <button
                  type="button"
                  onClick={() => handleScrollChips('right')}
                  aria-label="เลื่อนขวา"
                  style={{
                    position: 'absolute',
                    right: '-8px',
                    zIndex: 10,
                    width: '28px',
                    height: '28px',
                    borderRadius: '50%',
                    backgroundColor: '#FFFFFF',
                    border: '1px solid #E5E7EB',
                    boxShadow: '0 2px 6px rgba(0,0,0,0.14)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#374151',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease'
                  }}
                >
                  <ChevronRight size={16} />
                </button>
              )}
            </div>
          )}
        </div>
        
        <div className="matches-list" style={{ overflowY: 'auto', overflowX: 'hidden', flex: 1, padding: '0 16px 20px' }}>
          {filteredMatches.length === 0 ? (
            <div className="empty-state" style={{ marginTop: '30px', display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%', textAlign: 'center' }}>
              <div style={{ width: '56px', height: '56px', borderRadius: '50%', backgroundColor: '#F3F4F6', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '12px' }}>
                <Search size={24} color="#9CA3AF" />
              </div>
              <p style={{ margin: 0, fontWeight: 600, fontSize: '0.95rem', color: '#374151' }}>ไม่พบรายการแชท</p>
              <p style={{ margin: '4px 0 0', fontSize: '0.8rem', color: '#9CA3AF' }}>
                {selectedAnimalId !== 'all' ? 'ไม่พบคำขอรับเลี้ยงของน้องตัวนี้ในหมวดนี้' : searchQuery ? 'ลองค้นหาด้วยคำอื่น' : 'ยังไม่มีข้อความในหมวดหมู่นี้'}
              </p>
              {selectedAnimalId !== 'all' && (
                <button
                  type="button"
                  onClick={() => setSelectedAnimalId('all')}
                  style={{ marginTop: '10px', fontSize: '0.8rem', color: 'var(--primary, #D97706)', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600 }}
                >
                  แสดงผู้ขอรับเลี้ยงทั้งหมด
                </button>
              )}
            </div>
          ) : (
            filteredMatches.map(match => {
              const animal = animalData[match.animalId];
              if (!animal) return null;

              const isAdopted = match.status === 'adopted' || match.status === 'completed';
              const isApproved = match.status === 'approved' || isAdopted;
              const isRejected = match.status === 'rejected';
              const isActive = match.id === matchId;

              const adopterName = match.userData?.full_name || 'ผู้ขอรับเลี้ยง';
              const defaultAvatar = `https://ui-avatars.com/api/?name=${encodeURIComponent(adopterName)}&background=D97706&color=fff`;
              const adopterAvatar = match.userData?.avatar_url || defaultAvatar;

              return (
                <div 
                  key={match.id} 
                  className={`match-item ${isAdopted ? 'approved' : isApproved ? 'approved' : isRejected ? 'rejected' : 'pending'} ${isActive ? 'active' : ''}`}
                  style={{ minHeight: '88px', boxSizing: 'border-box' }}
                  onClick={() => {
                    if (user?.id) {
                      api.markMatchAsRead(match.id, 'shelter', user.id);
                    }
                    navigate(`/foundation/chat/${match.id}`);
                  }}
                >
                  {/* Adopter Avatar with Pet Badge Overlaid */}
                  <div className="match-avatar" style={{ position: 'relative', width: '52px', height: '52px', minWidth: '52px', minHeight: '52px', flexShrink: 0 }}>
                    <img 
                      loading="lazy" 
                      src={adopterAvatar} 
                      alt={adopterName} 
                      style={{ width: '52px', height: '52px', minWidth: '52px', minHeight: '52px', borderRadius: '50%', objectFit: 'cover', border: '1.5px solid #E5E7EB' }} 
                      onError={(e) => { e.currentTarget.src = defaultAvatar; }}
                    />
                    {/* Corner Pet Badge */}
                    <div 
                      title={`ขอรับเลี้ยง: ${animal.name}`}
                      style={{ 
                        position: 'absolute', 
                        bottom: '-2px', 
                        right: '-2px', 
                        width: '24px', 
                        height: '24px', 
                        borderRadius: '50%', 
                        overflow: 'hidden', 
                        border: '2px solid #FFFFFF', 
                        boxShadow: '0 1px 4px rgba(0,0,0,0.15)',
                        backgroundColor: '#FFFFFF',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        zIndex: 2
                      }}
                    >
                      <img 
                        src={animal.images?.[0] || 'https://via.placeholder.com/50'} 
                        alt={animal.name} 
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
                      />
                    </div>
                  </div>

                  <div className="match-info" style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                    <div className="match-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '6px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', minWidth: 0, overflow: 'hidden' }}>
                        <h3 style={{ fontSize: '0.98rem', fontWeight: 700, margin: 0, color: '#111827', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {adopterName}
                        </h3>
                        {match.userData?.kyc_verified && (
                          <CheckCircle size={13} color="#16A34A" style={{ flexShrink: 0 }} title="ยืนยันตัวตนแล้ว (KYC)" />
                        )}
                      </div>
                      <span className="timestamp" style={{ fontSize: '0.72rem', color: '#9CA3AF', flexShrink: 0 }}>
                        {match.timestamp || 'เมื่อวาน'}
                      </span>
                    </div>

                    {/* Target Pet Badge */}
                    <div style={{ margin: '3px 0' }}>
                      <span style={{ 
                        display: 'inline-flex', 
                        alignItems: 'center', 
                        gap: '4px', 
                        fontSize: '0.73rem', 
                        color: '#9A3412', 
                        backgroundColor: '#FFEDD5', 
                        padding: '1px 8px', 
                        borderRadius: '6px', 
                        fontWeight: 600,
                        maxWidth: '100%',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap'
                      }}>
                        <PawPrint size={11} style={{ flexShrink: 0 }} />
                        <span>ขอรับเลี้ยง: <strong>{animal.name}</strong></span>
                      </span>
                    </div>

                    <p className="last-message" style={{ margin: 0, fontSize: '0.82rem', color: '#6B7280', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {match.lastMessage || 'ส่งคำขอแล้ว'}
                    </p>

                    {isAdopted ? (
                      <p className="pending-text text-sm" style={{ color: '#15803D', display: 'flex', alignItems: 'center', gap: '4px', fontWeight: 600, margin: '2px 0 0' }}>
                        <CheckCircle size={12} /> ส่งมอบแล้ว (ติดตามสถานะ)
                      </p>
                    ) : isRejected ? (
                      <p className="pending-text text-sm" style={{ color: '#DC2626', display: 'flex', alignItems: 'center', gap: '4px', margin: '2px 0 0' }}>
                        <XCircle size={12} /> ปฏิเสธคำขอรับเลี้ยงแล้ว
                      </p>
                    ) : match.status === 'approved' ? (
                      <p className="pending-text text-sm" style={{ color: '#059669', display: 'flex', alignItems: 'center', gap: '4px', fontWeight: 600, margin: '2px 0 0' }}>
                        <CheckCircle size={12} /> อนุมัติแล้ว • กำลังสนทนา
                      </p>
                    ) : (
                      <p className="pending-text text-sm" style={{ color: 'var(--warning-dark, #D97706)', margin: '2px 0 0', fontWeight: 500 }}>
                        รอตรวจสอบและอนุมัติการรับเลี้ยง
                      </p>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Chat Panel */}
      <div className={`matches-chat-panel ${!matchId ? 'hidden-on-mobile hidden-on-desktop' : ''}`}>
        {matchId ? (
          <FoundationChatRoom />
        ) : (
          <div className="empty-chat-state">
            <div style={{ padding: '24px', backgroundColor: 'var(--surface-container-high)', borderRadius: '50%', marginBottom: '16px' }}>
              <Search size={48} color="var(--primary)" style={{ opacity: 0.5 }} />
            </div>
            <h3>เลือกแชทเพื่อจัดการคำขอและสนทนา</h3>
          </div>
        )}
      </div>

    </div>
  );
}

export default FoundationMatchChat;
