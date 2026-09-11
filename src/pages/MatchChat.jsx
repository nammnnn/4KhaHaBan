import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAppContext } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { Heart, Clock, MessageCircle, Loader, Search, XCircle, CheckCircle } from 'lucide-react';
import { ChatListSkeleton } from '../components/Skeletons';
import ChatRoom from './ChatRoom';

function MatchChat() {
  const { matches, loadingMatches } = useAppContext();
  const { user } = useAuth();
  const [animalData, setAnimalData] = useState({});
  const [loadingAnimals, setLoadingAnimals] = useState(true);
  const navigate = useNavigate();
  const { matchId } = useParams();

  const [activeTab, setActiveTab] = useState('active'); // 'active' or 'pending'
  const [searchQuery, setSearchQuery] = useState('');

  // We need to fetch details for all animals that are in our matches list
  useEffect(() => {
    const fetchMatchedAnimals = async () => {
      if (!matches || matches.length === 0) {
        setLoadingAnimals(false);
        return;
      }

      try {
        const animalIds = [...new Set(matches.map(m => m.animalId))];
        const dataMap = {};

        await Promise.all(
          animalIds.map(async (id) => {
            try {
              const data = await api.getAnimalById(id);
              dataMap[id] = data;
            } catch (err) {
              console.error(`Error fetching animal ${id}:`, err);
              const relevantMatch = matches.find(m => m.animalId === id);
              let fallbackName = 'สัตว์เลี้ยง';
              const nameMatch = relevantMatch?.last_message?.match(/ส่งมอบ\s+([^\s]+)\s+เสร็จสมบูรณ์/) ||
                                relevantMatch?.last_message?.match(/ขอรับเลี้ยง\s+([^\s]+)\s+เพื่อให้/) ||
                                relevantMatch?.last_message?.match(/รับเลี้ยง\s+([^\s]+)/);
              if (nameMatch && nameMatch[1]) {
                fallbackName = nameMatch[1];
              }
              dataMap[id] = {
                name: fallbackName,
                shelter: 'มูลนิธิเพื่อสัตว์เลี้ยง',
                images: ['https://images.unsplash.com/photo-1514888286974-6c03e2ca1dba?auto=format&fit=crop&w=150&q=80']
              };
            }
          })
        );

        setAnimalData(dataMap);
      } catch (error) {
        console.error("Error in Promise.all for matches", error);
      } finally {
        setLoadingAnimals(false);
      }
    };

    fetchMatchedAnimals();
  }, [matches]);

  if (loadingMatches || loadingAnimals) {
    return (
      <div className="page-container match-page">
        <ChatListSkeleton />
      </div>
    );
  }

  // Filter logic
  const filteredMatches = matches.filter(match => {
    const animal = animalData[match.animalId];
    if (!animal) return false;

    // Search filter
    const matchesSearch = animal.name.toLowerCase().includes(searchQuery.toLowerCase());
    
    // Tab filter
    let matchesTab = false;
    if (activeTab === 'active') matchesTab = match.status === 'approved' || match.status === 'adopted' || match.status === 'completed';
    else if (activeTab === 'pending') matchesTab = match.status === 'pending';
    else if (activeTab === 'rejected') matchesTab = match.status === 'rejected';

    return matchesSearch && matchesTab;
  });

  const activeCount = matches.filter(m => m.status === 'approved' || m.status === 'adopted' || m.status === 'completed').length;
  const pendingCount = matches.filter(m => m.status === 'pending').length;
  const rejectedCount = matches.filter(m => m.status === 'rejected').length;

  return (
    <div className="page-container match-page matches-split-view">
      
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
          <div className="chat-search-bar" style={{ padding: '14px 0' }}>
            <div style={{ position: 'relative' }}>
              <Search size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#9CA3AF' }} />
              <input 
                type="text" 
                placeholder="ค้นหาแชท..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
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
        </div>

        <div className="matches-list" style={{ overflowY: 'auto', overflowX: 'hidden', flex: 1, padding: '0 16px 20px' }}>
          {filteredMatches.length === 0 ? (
            <div className="empty-state" style={{ marginTop: '30px', display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%', textAlign: 'center' }}>
              <div style={{ width: '56px', height: '56px', borderRadius: '50%', backgroundColor: '#F3F4F6', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '12px' }}>
                <Search size={24} color="#9CA3AF" />
              </div>
              <p style={{ margin: 0, fontWeight: 600, fontSize: '0.95rem', color: '#374151' }}>ไม่พบรายการแชท</p>
              <p style={{ margin: '4px 0 0', fontSize: '0.8rem', color: '#9CA3AF' }}>{searchQuery ? 'ลองค้นหาด้วยคำอื่น' : 'ยังไม่มีข้อความในหมวดหมู่นี้'}</p>
            </div>
          ) : (
            filteredMatches.map(match => {
              const animal = animalData[match.animalId];
              if (!animal) return null;

              const isAdopted = match.status === 'adopted' || match.status === 'completed';
              const isApproved = match.status === 'approved';
              const isRejected = match.status === 'rejected';
              const isActive = match.id === matchId;

              return (
                <div
                  key={match.id}
                  className={`match-item ${isAdopted ? 'adopted' : isApproved ? 'approved' : isRejected ? 'rejected' : 'pending'} ${isActive ? 'active' : ''}`}
                  onClick={() => {
                    if (user?.id) {
                      try {
                        const readChats = JSON.parse(localStorage.getItem(`read_chats_${user.id}`) || '{}');
                        readChats[match.id] = Date.now();
                        localStorage.setItem(`read_chats_${user.id}`, JSON.stringify(readChats));
                        window.dispatchEvent(new Event('chatReadUpdated'));
                      } catch (e) {}
                      api.markMatchAsRead(match.id, 'user', user.id);
                    }
                    navigate(`/chat/${match.id}`);
                  }}
                >
                  <div className="match-avatar" style={{ position: 'relative' }}>
                    <img loading="lazy" src={animal.images[0]} alt={animal.name} />
                    {isAdopted ? (
                      <div style={{ position: 'absolute', bottom: 0, right: 0, width: '16px', height: '16px', backgroundColor: '#10B981', borderRadius: '50%', border: '2px solid white', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <CheckCircle size={10} color="#fff" strokeWidth={3} />
                      </div>
                    ) : isApproved ? (
                      <div style={{ position: 'absolute', bottom: 0, right: 0, width: '12px', height: '12px', backgroundColor: 'var(--success)', borderRadius: '50%', border: '2px solid white' }}></div>
                    ) : isRejected ? (
                      <div className="status-badge" style={{ backgroundColor: '#EF4444' }}><XCircle size={12} color="#fff" /></div>
                    ) : (
                      <div className="status-badge bg-warning"><Clock size={12} color="#fff" /></div>
                    )}
                  </div>
                  <div className="match-info">
                    <div className="match-header">
                      <h3 style={{ fontSize: '1rem' }}>{animal.name}</h3>
                      <span className="timestamp">{match.timestamp}</span>
                    </div>
                    <p className="last-message">
                      {match.lastMessage}
                    </p>
                    {isAdopted ? (
                      <p className="pending-text text-sm" style={{ color: '#059669', display: 'flex', alignItems: 'center', gap: '4px', fontWeight: 600, margin: '2px 0 0' }}>
                        <CheckCircle size={12} /> ได้รับเลี้ยงแล้ว • ติดตามสถานะ
                      </p>
                    ) : isRejected ? (
                      <p className="pending-text text-sm" style={{ color: '#DC2626', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <XCircle size={12} /> ปฏิเสธคำขอรับเลี้ยงแล้ว
                      </p>
                    ) : !isApproved ? (
                      <p className="pending-text text-sm" style={{ color: 'var(--warning-dark)' }}>รอผู้ดูแลตรวจสอบประวัติการรับเลี้ยง</p>
                    ) : null}
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
          <ChatRoom />
        ) : (
          <div className="empty-chat-state" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--text-medium)' }}>
            <div style={{ padding: '24px', backgroundColor: 'var(--surface-container-high)', borderRadius: '50%', marginBottom: '16px' }}>
              <MessageCircle size={48} color="var(--primary)" style={{ opacity: 0.5 }} />
            </div>
            <h3 style={{ fontSize: '1.2rem', fontWeight: 600 }}>เลือกแชทเพื่อสนทนา</h3>
          </div>
        )}
      </div>

    </div>
  );
}

export default MatchChat;
