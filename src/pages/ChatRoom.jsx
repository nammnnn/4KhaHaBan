import React, { useState, useEffect, useRef, useMemo, memo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ChevronLeft, Send, Loader, Image as ImageIcon, X, Info, MoreVertical, PlusCircle, MapPin, FileText, User, CheckCircle, Check, Clock, XCircle, CheckCircle2, Camera, Calendar } from 'lucide-react';
import { api } from '../services/api';
import { supabase } from '../services/supabaseClient';
import { useAppContext } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';
import { motion, AnimatePresence } from 'framer-motion';
import { ChatRoomSkeleton } from '../components/Skeletons';

const renderMessageContent = (text, isMe, isApplication = false) => {
  if (!text) return null;
  const lines = text.split('\n');
  return (
    <div style={{ overflowWrap: 'break-word', wordBreak: 'normal', maxWidth: '100%' }}>
      {lines.map((line, idx) => {
        const trimmed = line.trim();
        // Check if line is a divider like ━━━━━━━━━━━━━━━━━━ or ----------
        if (/^[━─\-=_~]{3,}$/.test(trimmed)) {
          return (
            <div
              key={idx}
              style={{
                height: '1px',
                backgroundColor: isApplication ? '#fed7aa' : (isMe ? 'rgba(255,255,255,0.35)' : 'var(--gray-200, #E5E7EB)'),
                margin: '10px 0',
                width: '100%',
                maxWidth: '100%',
                boxSizing: 'border-box'
              }}
            />
          );
        }

        const parts = line.split(/(https?:\/\/[^\s]+)/g);
        return (
          <div key={idx} style={{ minHeight: trimmed ? 'auto' : '0.6em', overflowWrap: 'break-word', wordBreak: 'normal', whiteSpace: 'pre-wrap' }}>
            {parts.map((part, pIdx) => {
              if (part.match(/^https?:\/\/[^\s]+$/)) {
                return (
                  <a
                    key={pIdx}
                    href={part}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      color: isMe ? '#ffffff' : '#2563eb',
                      textDecoration: 'underline',
                      wordBreak: 'break-all'
                    }}
                  >
                    {part}
                  </a>
                );
              }
              return part;
            })}
          </div>
        );
      })}
    </div>
  );
};

const MessageItem = memo(function MessageItem({ msg, isUser, avatarUrl }) {
  const isApplication = msg.text && (msg.text.includes('ใบสมัครขอรับเลี้ยง') || msg.text.startsWith('\uD83D\uDCCB'));

  return (
    <div className={`message-row msg-${msg.sender}`} style={{ marginBottom: '16px' }}>
      {!isUser && <img src={avatarUrl} alt="avatar" className="message-avatar" style={{ width: '32px', height: '32px', borderRadius: '50%', objectFit: 'cover' }} />}
      <div className={`message-wrapper msg-${msg.sender}`} style={{ maxWidth: '100%', alignItems: isUser ? 'flex-end' : 'flex-start' }}>
        {isApplication ? (
          <div style={{
            background: '#ffffff',
            border: '1.5px solid #fed7aa',
            borderRadius: '16px',
            padding: '14px',
            boxShadow: '0 4px 14px rgba(249, 115, 22, 0.08)',
            maxWidth: '100%',
            width: '100%',
            boxSizing: 'border-box',
            textAlign: 'left',
            overflow: 'hidden'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid #ffedd5', paddingBottom: '10px', marginBottom: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: '#ffedd5', color: '#ea580c', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <FileText size={18} />
                </div>
                <div>
                  <div style={{ fontWeight: 700, fontSize: '0.92rem', color: '#9a3412' }}>ใบสมัครขอรับเลี้ยง & แบบประเมิน</div>
                  <div style={{ fontSize: '0.72rem', color: '#16a34a', display: 'flex', alignItems: 'center', gap: '4px', fontWeight: 600 }}>
                    <CheckCircle size={12} /> ยืนยันตัวตนแล้ว (KYC Verified)
                  </div>
                </div>
              </div>
            </div>
            <div style={{ fontSize: '0.85rem', color: '#334155', lineHeight: 1.6, background: '#fffaf5', padding: '12px', borderRadius: '12px', border: '1px solid #fed7aa30', boxSizing: 'border-box', width: '100%', overflow: 'hidden' }}>
              {renderMessageContent(msg.text, isUser, true)}
            </div>
          </div>
        ) : (
          <div className="message-bubble" style={{ overflowWrap: 'break-word', wordBreak: 'normal', width: 'max-content', maxWidth: '100%', boxSizing: 'border-box', textAlign: 'left' }}>
            {msg.imageUrl && (
              <img src={msg.imageUrl} alt="attached" style={{ maxWidth: '100%', borderRadius: '12px', marginBottom: '8px', display: 'block' }} />
            )}
            {msg.text && msg.text.trim() && renderMessageContent(msg.text, isUser, false)}
          </div>
        )}
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginTop: '4px', alignSelf: isUser ? 'flex-end' : 'flex-start', whiteSpace: 'nowrap' }}>
          <span className="message-timestamp" style={{ fontSize: '11px', color: 'var(--text-medium)', whiteSpace: 'nowrap' }}>{msg.timestamp}</span>
          {isUser && <Check size={12} color="var(--primary)" />}
        </div>
      </div>
    </div>
  );
});

function ChatRoom() {
  const { matchId } = useParams();
  const navigate = useNavigate();
  const { matches } = useAppContext();
  const { user, profile } = useAuth();

  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(true);
  const [animal, setAnimal] = useState(null);
  const [match, setMatch] = useState(null);
  const [isSending, setIsSending] = useState(false);
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const docInputRef = useRef(null);
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const [showAttachMenu, setShowAttachMenu] = useState(false);
  const [showShelterModal, setShowShelterModal] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [showBlockModal, setShowBlockModal] = useState(false);
  const [reportReason, setReportReason] = useState('');
  const [reportImagePreview, setReportImagePreview] = useState(null);
  const [isSubmittingReport, setIsSubmittingReport] = useState(false);
  const fileInputRef = useRef(null);
  const reportImageInputRef = useRef(null);

  // Adopter Cancel States
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancelReason, setCancelReason] = useState('ไม่สะดวกรับเลี้ยงแล้ว / ติดปัญหาครอบครัว');
  const [customCancelReason, setCustomCancelReason] = useState('');
  const [isSubmittingCancel, setIsSubmittingCancel] = useState(false);

  const ADOPTER_CANCEL_REASONS = [
    'ไม่สะดวกรับเลี้ยงแล้ว / ติดปัญหาครอบครัว',
    'สภาพแวดล้อมหรือที่อยู่อาศัยยังไม่พร้อม',
    'พูดคุยแล้วเงื่อนไขไม่ตรงกัน',
    'ต้องการเลือกดูสัตว์ตัวอื่นแทน',
    'อื่นๆ (ระบุเพิ่มเติม)'
  ];

  const handleConfirmCancelAdoption = async () => {
    setIsSubmittingCancel(true);
    try {
      const finalReason = cancelReason === 'อื่นๆ (ระบุเพิ่มเติม)'
        ? (customCancelReason.trim() || 'เหตุผลส่วนตัว')
        : cancelReason;

      await api.updateMatchStatus(matchId, 'rejected');
      setMatch(prev => ({ ...prev, status: 'rejected' }));

      // Revert animal status if needed
      if (animal?.id && supabase) {
        try {
          await supabase.from('animals').update({ status: 'available' }).eq('id', animal.id);
        } catch (e) {
          console.warn('Could not revert animal status:', e);
        }
      }

      // Send polite cancellation message into chat
      const cancelText = `[ผู้ขอรับเลี้ยงแจ้งขอยกเลิกคำขอ]\n━━━━━━━━━━━━━━━━━━\nขออภัยทางมูลนิธิที่ไม่สามารถรับเลี้ยง ${animal?.name || 'น้อง'} ได้ในครั้งนี้\n\nเหตุผล: ${finalReason}${customCancelReason && cancelReason !== 'อื่นๆ (ระบุเพิ่มเติม)' ? `\nรายละเอียดเพิ่มเติม: ${customCancelReason}` : ''}\n━━━━━━━━━━━━━━━━━━\nขอบพระคุณมูลนิธิที่ให้คำแนะนำเป็นอย่างดีครับ/ค่ะ`;

      await api.sendMessage(matchId, cancelText, 'user');

      const sysMsg = {
        id: `sys_${Date.now()}`,
        sender: 'system',
        text: 'คุณได้ยกเลิกคำขอรับเลี้ยงนี้แล้ว',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      setMessages(prev => [...prev, sysMsg]);
      setShowCancelModal(false);
    } catch (err) {
      console.error('Error cancelling adoption:', err);
      alert('เกิดข้อผิดพลาดในการยกเลิกคำขอ กรุณาลองใหม่อีกครั้ง');
    } finally {
      setIsSubmittingCancel(false);
    }
  };

  // ใช้ ref เพื่อเข้าถึงค่าล่าสุดของ matches และ user โดยไม่ trigger re-render
  const matchesRef = useRef(matches);
  const userRef = useRef(user);
  useEffect(() => { matchesRef.current = matches; }, [matches]);
  useEffect(() => { userRef.current = user; }, [user]);

  const handleReportImageSelect = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => setReportImagePreview(reader.result);
    reader.readAsDataURL(file);
  };

  const handleReport = async (e) => {
    e.preventDefault();
    if (!reportReason.trim()) return;
    setIsSubmittingReport(true);
    try {
      await api.reportUser(profile?.id, animal?.foundation_id, reportReason, reportImagePreview);
      setShowReportModal(false);
      setReportReason('');
      setReportImagePreview(null);
      setShowBlockModal(true);
    } catch (error) {
      console.error(error);
    } finally {
      setIsSubmittingReport(false);
    }
  };

  const handleBlock = async () => {
    try {
      await api.blockUser(profile?.id, animal?.foundation_id);
      navigate('/matches');
    } catch (error) {
      console.error(error);
    }
  };

  const messagesEndRef = useRef(null);

  // โหลดข้อมูลแชทครั้งเดียวเมื่อ matchId เปลี่ยน (ไม่ re-fetch ซ้ำเมื่อ matches/user เปลี่ยน)
  useEffect(() => {
    let cancelled = false;
    const fetchChatData = async () => {
      try {
        // อ่านค่าจาก ref เพื่อไม่ให้เกิดการ re-run เมื่อ context เปลี่ยน
        const currentMatches = matchesRef.current;
        const currentUser = userRef.current;

        // Find match in context or fetch it
        let currentMatch = currentMatches?.find(m => m.id === matchId);
        if (!currentMatch && currentUser?.id) {
          const userMatches = await api.getUserMatches(currentUser.id);
          currentMatch = userMatches.find(m => m.id === matchId);
        }

        if (cancelled) return;

        if (currentMatch) {
          setMatch(currentMatch);
          try {
            const animalData = await api.getAnimalById(currentMatch.animalId);
            if (!cancelled) setAnimal(animalData);
          } catch (animalErr) {
            console.warn("Could not load animal details in ChatRoom:", animalErr);
            // Intelligent fallback from match last_message or placeholder
            let fallbackName = 'สัตว์เลี้ยง';
            const nameMatch = currentMatch.last_message?.match(/ส่งมอบ\s+([^\s]+)\s+เสร็จสมบูรณ์/) ||
                              currentMatch.last_message?.match(/ขอรับเลี้ยง\s+([^\s]+)\s+เพื่อให้/) ||
                              currentMatch.last_message?.match(/รับเลี้ยง\s+([^\s]+)/);
            if (nameMatch && nameMatch[1]) {
              fallbackName = nameMatch[1];
            }
            if (!cancelled) {
              setAnimal({
                id: currentMatch.animalId,
                name: fallbackName,
                shelter: 'มูลนิธิเพื่อสัตว์เลี้ยง',
                images: ['https://images.unsplash.com/photo-1514888286974-6c03e2ca1dba?auto=format&fit=crop&w=800&q=80']
              });
            }
          }

          // Mark this chat as read
          if (currentUser?.id) {
            try {
              const readChats = JSON.parse(localStorage.getItem(`read_chats_${currentUser.id}`) || '{}');
              readChats[matchId] = Date.now();
              localStorage.setItem(`read_chats_${currentUser.id}`, JSON.stringify(readChats));
              window.dispatchEvent(new Event('chatReadUpdated'));
            } catch (e) {}
            api.markMatchAsRead(matchId, 'user', currentUser.id);
          }
        }

        try {
          const chatHistory = await api.getMessages(matchId);
          if (cancelled) return;
          setMessages(chatHistory);
        } catch (msgErr) {
          console.error("Failed to load chat history:", msgErr);
        }
      } catch (error) {
        console.error("Failed to load chat data", error);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    setLoading(true);
    fetchChatData();
    return () => { cancelled = true; };
  }, [matchId]);

  // Subscribe to match status changes
  useEffect(() => {
    if (!matchId || !supabase) return;
    const matchChannel = supabase
      .channel(`user_chat_match_${matchId}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'matches', filter: `id=eq.${matchId}` },
        (payload) => {
          if (payload.new) {
            setMatch(prev => ({ ...(prev || {}), ...payload.new, animalId: payload.new.animal_id }));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(matchChannel);
    };
  }, [matchId]);

  // Subscribe to Supabase Realtime for incoming messages
  useEffect(() => {
    if (!matchId) return;

    // Realtime channel subscription
    let channel = null;
    if (supabase) {
      channel = supabase
        .channel(`chat_messages_${matchId}`)
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'messages',
            filter: `match_id=eq.${matchId}`
          },
          (payload) => {
            const newMsg = payload.new;
            setMessages((prev) => {
              if (prev.some((m) => m.id === newMsg.id)) return prev;
              const filtered = prev.filter(
                (m) => !(m.id.startsWith('temp_') && m.sender === newMsg.sender && m.text === newMsg.text)
              );
              return [
                ...filtered,
                {
                  ...newMsg,
                  imageUrl: newMsg.image_url,
                  timestamp: new Date(newMsg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                }
              ];
            });

            // Mark as read immediately when user is in the room
            if (newMsg.sender === 'shelter') {
              const currentUser = userRef.current;
              if (currentUser?.id) {
                try {
                  const readChats = JSON.parse(localStorage.getItem(`read_chats_${currentUser.id}`) || '{}');
                  readChats[matchId] = Date.now();
                  localStorage.setItem(`read_chats_${currentUser.id}`, JSON.stringify(readChats));
                  window.dispatchEvent(new Event('chatReadUpdated'));
                } catch (e) {}
                api.markMatchAsRead(matchId, 'user', currentUser.id);
              }
            }
          }
        )
        .subscribe();
    }

    return () => {
      if (channel && supabase) {
        supabase.removeChannel(channel);
      }
    };
  }, [matchId]);

  // Scroll to bottom on new message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleImageSelect = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setImageFile(file);
    const reader = new FileReader();
    reader.onloadend = () => setImagePreview(reader.result);
    reader.readAsDataURL(file);
  };

  const removeImage = () => {
    setImageFile(null);
    setImagePreview(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const uploadImage = async (file) => {
    if (!supabase) return imagePreview;
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `chat_${matchId}_${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
      const { error } = await supabase.storage.from('chat_images').upload(fileName, file);
      if (error) throw error;

      const { data } = supabase.storage.from('chat_images').getPublicUrl(fileName);
      return data.publicUrl;
    } catch (err) {
      console.warn('Storage upload error, fallback to base64 preview:', err);
      return imagePreview;
    }
  };

  const handleSend = async (e) => {
    e.preventDefault();
    if ((!inputText.trim() && !imageFile) || isSending) return;

    const textToSend = inputText.trim();
    setInputText('');
    setIsSending(true);

    try {
      let imageUrl = null;
      if (imageFile) {
        imageUrl = await uploadImage(imageFile);
        removeImage();
      }

      const tempId = `temp_${Date.now()}`;
      const tempMsg = {
        id: tempId,
        sender: 'user',
        text: textToSend,
        imageUrl,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      setMessages(prev => [...prev, tempMsg]);

      const sent = await api.sendMessage(matchId, textToSend, 'user', imageUrl);
      if (sent && sent.id) {
        setMessages(prev => prev.map(m => m.id === tempId ? { ...sent, imageUrl: sent.image_url || sent.imageUrl } : m));
      }
      if (user?.id) {
        try {
          const readChats = JSON.parse(localStorage.getItem(`read_chats_${user.id}`) || '{}');
          readChats[matchId] = Date.now();
          localStorage.setItem(`read_chats_${user.id}`, JSON.stringify(readChats));
          window.dispatchEvent(new Event('chatReadUpdated'));
        } catch (e) {}
      }
    } catch (error) {
      console.error("Failed to send message", error);
    } finally {
      setIsSending(false);
    }
  };

  const handleShareLocation = () => {
    setShowAttachMenu(false);
    if (!navigator.geolocation) {
      const locationText = `ตำแหน่งที่อยู่ของฉัน:\nhttps://www.google.com/maps/search/?api=1&query=13.7563,100.5018`;
      api.sendMessage(matchId, locationText, 'user');
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        const mapUrl = `https://www.google.com/maps?q=${latitude},${longitude}`;
        const locationText = `แชร์ตำแหน่งที่อยู่ของฉัน:\n${mapUrl}`;
        api.sendMessage(matchId, locationText, 'user');
      },
      (err) => {
        console.warn('Geolocation error:', err);
        const locationText = `ตำแหน่งที่อยู่ของฉัน:\nhttps://www.google.com/maps/search/?api=1&query=13.7563,100.5018`;
        api.sendMessage(matchId, locationText, 'user');
      },
      { timeout: 10000 }
    );
  };

  const handleDocSelect = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setShowAttachMenu(false);

    try {
      setIsSending(true);
      let docUrl = null;
      if (supabase) {
        const fileExt = file.name.split('.').pop();
        const fileName = `user_doc_${matchId}_${Date.now()}.${fileExt}`;
        const { error } = await supabase.storage.from('chat_images').upload(fileName, file);
        if (!error) {
          const { data } = supabase.storage.from('chat_images').getPublicUrl(fileName);
          docUrl = data?.publicUrl;
        }
      }
      
      const docMsgText = `แนบเอกสาร: ${file.name}${docUrl ? `\nดาวน์โหลด/เปิดดู: ${docUrl}` : ''}`;
      await api.sendMessage(matchId, docMsgText, 'user');
    } catch (err) {
      console.error('Failed to send document:', err);
    } finally {
      setIsSending(false);
      if (docInputRef.current) docInputRef.current.value = '';
    }
  };

  const userAvatarUrl = useMemo(() => {
    return profile?.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(profile?.full_name || profile?.name || 'User')}&background=D97706&color=fff`;
  }, [profile?.avatar_url, profile?.full_name, profile?.name]);

  const animalAvatarUrl = useMemo(() => {
    return animal?.images?.[0] || 'https://via.placeholder.com/150';
  }, [animal?.images]);

  if (loading) {
    return <ChatRoomSkeleton />;
  }

  return (
    <div className="chat-room-container" style={{ display: 'flex', flexDirection: 'column', height: '100%', width: '100%', backgroundColor: '#FFFFFF', position: 'relative', overflow: 'hidden' }}>
      {/* Header */}
      <div className="chat-header" style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '10px 14px',
        borderBottom: '1px solid var(--gray-200, #E5E7EB)',
        backgroundColor: '#FFFFFF',
        flexShrink: 0,
        zIndex: 10,
        boxSizing: 'border-box'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0, flex: 1 }}>
          <button 
            className="chat-back-btn" 
            onClick={() => navigate('/matches')} 
            aria-label="ย้อนกลับไปหน้ารายการแชท"
          >
            <ChevronLeft size={20} />
          </button>
          
          {animal && (
            <div className="chat-partner-info" style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0, margin: 0, flex: 1 }}>
              <div style={{ position: 'relative', flexShrink: 0 }}>
                <img 
                  src={animal.images?.[0] || 'https://via.placeholder.com/150'} 
                  alt={animal.name} 
                  className="chat-avatar" 
                  style={{ width: '40px', height: '40px', borderRadius: '50%', objectFit: 'cover', border: '1.5px solid #E5E7EB' }} 
                />
              </div>
              <div style={{ minWidth: 0, flex: 1 }}>
                <h2 style={{ fontSize: '0.98rem', fontWeight: 700, margin: 0, color: '#111827', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {animal.name}
                </h2>
                <p style={{ fontSize: '0.75rem', color: '#6B7280', margin: '1px 0 0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {animal.shelter_name || 'ศูนย์พักพิงสัตว์'}
                </p>
              </div>
            </div>
          )}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', position: 'relative', flexShrink: 0 }}>
          <button 
            onClick={() => setShowShelterModal(true)} 
            title="ข้อมูลศูนย์พักพิง" 
            style={{ 
              width: '36px', height: '36px', borderRadius: '8px', border: '1px solid #E5E7EB', 
              background: '#F9FAFB', cursor: 'pointer', color: '#4B5563',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              transition: 'background-color 0.15s' 
            }}
            onMouseEnter={e => e.currentTarget.style.backgroundColor = '#F3F4F6'}
            onMouseLeave={e => e.currentTarget.style.backgroundColor = '#F9FAFB'}
          >
            <Info size={18} />
          </button>
          <button 
            onClick={() => setShowMoreMenu(!showMoreMenu)} 
            title="ตัวเลือกเพิ่มเติม"
            style={{ 
              width: '36px', height: '36px', borderRadius: '8px', border: '1px solid #E5E7EB', 
              background: '#F9FAFB', cursor: 'pointer', color: '#4B5563',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              transition: 'background-color 0.15s' 
            }}
            onMouseEnter={e => e.currentTarget.style.backgroundColor = '#F3F4F6'}
            onMouseLeave={e => e.currentTarget.style.backgroundColor = '#F9FAFB'}
          >
            <MoreVertical size={18} />
          </button>
          
          {showMoreMenu && (
            <div style={{ position: 'absolute', top: '100%', right: '0', background: 'white', borderRadius: '12px', boxShadow: '0 10px 25px rgba(0,0,0,0.1)', overflow: 'hidden', zIndex: 100, border: '1px solid #E5E7EB', minWidth: '190px', marginTop: '6px' }}>
              {match && (match.status === 'approved' || match.status === 'pending') && (
                <button 
                  style={{ width: '100%', padding: '12px 16px', background: 'none', border: 'none', borderBottom: '1px solid #F3F4F6', textAlign: 'left', cursor: 'pointer', color: '#DC2626', fontSize: '0.85rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px' }} 
                  onClick={() => { setShowMoreMenu(false); setShowCancelModal(true); }}
                >
                  <XCircle size={15} /> ขอยกเลิกคำขอรับเลี้ยง
                </button>
              )}
              <button style={{ width: '100%', padding: '12px 16px', background: 'none', border: 'none', textAlign: 'left', cursor: 'pointer', color: '#6B7280', fontSize: '0.875rem', fontWeight: 500 }} onClick={() => { setShowMoreMenu(false); setShowReportModal(true); }}>
                รายงานมูลนิธิ / บล็อก
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Match Status Banner for Adopter */}
      {match && match.status === 'pending' && (
        <div style={{ padding: '10px 18px', backgroundColor: '#FFFBEB', borderBottom: '1px solid #FDE68A', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#B45309', fontSize: '0.82rem', fontWeight: 600 }}>
            <Clock size={16} color="#D97706" />
            <span>ใบสมัครและคำขอรับเลี้ยงอยู่ระหว่างรอการตรวจสอบและอนุมัติจากเจ้าหน้าที่มูลนิธิ</span>
          </div>
          <button
            type="button"
            onClick={() => setShowCancelModal(true)}
            style={{
              padding: '4px 10px',
              fontSize: '0.75rem',
              fontWeight: 600,
              color: '#6B7280',
              backgroundColor: '#FFFFFF',
              border: '1px solid #D1D5DB',
              borderRadius: '8px',
              cursor: 'pointer',
              whiteSpace: 'nowrap'
            }}
          >
            ยกเลิกคำขอ
          </button>
        </div>
      )}

      {match && match.status === 'approved' && (
        <div style={{ padding: '10px 18px', backgroundColor: '#ECFDF5', borderBottom: '1px solid #A7F3D0', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#047857', fontSize: '0.82rem', fontWeight: 600 }}>
            <CheckCircle size={16} color="#059669" />
            <span>ยินดีด้วย! คำขอรับเลี้ยงได้รับการอนุมัติแล้ว ท่านสามารถพูดคุยรายละเอียดและนัดหมายส่งมอบในแชทนี้ได้เลย</span>
          </div>
          <button
            type="button"
            onClick={() => setShowCancelModal(true)}
            style={{
              padding: '4px 10px',
              fontSize: '0.78rem',
              fontWeight: 600,
              color: '#DC2626',
              backgroundColor: '#FFFFFF',
              border: '1px solid #FCA5A5',
              borderRadius: '8px',
              cursor: 'pointer',
              whiteSpace: 'nowrap',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px'
            }}
          >
            <XCircle size={13} /> ขอยกเลิกคำขอ
          </button>
        </div>
      )}

      {match && match.status === 'rejected' && (
        <div style={{ padding: '10px 18px', backgroundColor: '#FEF2F2', borderBottom: '1px solid #FECACA', display: 'flex', alignItems: 'center', gap: '8px', color: '#B91C1C', fontSize: '0.82rem', fontWeight: 600 }}>
          <XCircle size={16} color="#DC2626" />
          <span>คำขอรับเลี้ยงนี้ถูกยกเลิกหรือปฏิเสธแล้ว ท่านสามารถเลือกดูสัตว์ตัวอื่นในหน้าหลักได้เสมอ</span>
        </div>
      )}

      {match && (match.status === 'adopted' || match.status === 'completed') && (
        <div style={{ padding: '10px 18px', backgroundColor: '#F0FDF4', borderBottom: '1px solid #BBF7D0', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#15803D', fontSize: '0.84rem', fontWeight: 600 }}>
            <CheckCircle2 size={18} color="#16A34A" />
            <span>น้องอยู่กับคุณแล้ว • อัปเดตรูปถ่ายและสถานะสุขภาพทุก 2 เดือน</span>
          </div>
          <button
            type="button"
            onClick={() => navigate(`/adoption/timeline/${matchId}`)}
            style={{
              padding: '6px 14px',
              fontSize: '0.82rem',
              fontWeight: 700,
              color: '#FFFFFF',
              backgroundColor: '#15803D',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              boxShadow: '0 1px 3px rgba(21,128,61,0.2)'
            }}
          >
            <Calendar size={15} /> ติดตามสถานะน้อง
          </button>
        </div>
      )}

      {match && match.status === 'rejected' && (
        <div style={{ padding: '10px 18px', backgroundColor: '#FEF2F2', borderBottom: '1px solid #FECACA', display: 'flex', alignItems: 'center', gap: '8px', color: '#B91C1C', fontSize: '0.82rem', fontWeight: 600 }}>
          <XCircle size={16} color="#DC2626" />
          <span>คำขอรับเลี้ยงนี้ไม่ผ่านการพิจารณา ท่านสามารถดูเหตุผลในแชท และเลือกดูสัตว์ตัวอื่นที่กำลังหาบ้านได้เสมอ</span>
        </div>
      )}

      {/* Shelter Info Modal */}
      <AnimatePresence>
        {showShelterModal && (
          <motion.div 
            className="modal-overlay" 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            onClick={() => setShowShelterModal(false)} 
            style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)', zIndex: 1000, display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '16px' }}
          >
            <motion.div 
              className="modal-content" 
              initial={{ opacity: 0, scale: 0.96, y: 12 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 8 }}
              transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
              onClick={e => e.stopPropagation()} 
              style={{ background: 'white', padding: '24px', borderRadius: '16px', width: '100%', maxWidth: '400px', boxShadow: '0 20px 48px rgba(0,0,0,0.12)' }}
            >
              <h3 style={{ marginTop: 0, marginBottom: '16px', fontSize: '1.2rem', color: 'var(--text-dark)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <User size={20} color="var(--primary)" /> ข้อมูลมูลนิธิ
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', fontSize: '0.95rem' }}>
                <div><strong>ชื่อศูนย์พักพิง:</strong> มูลนิธิเพื่อสุนัขจรจัดชลบุรี</div>
                <div><strong>เบอร์ติดต่อ:</strong> 038-123-4567</div>
                <div><strong>ที่อยู่:</strong> 123 ถ.สุขุมวิท ต.แสนสุข อ.เมือง จ.ชลบุรี</div>
                <div style={{ padding: '8px', background: 'var(--success-light)', color: 'var(--success)', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '8px', marginTop: '8px', fontWeight: 600 }}>
                  <Info size={16} /> ตรวจสอบและยืนยันตัวตนแล้ว
                </div>
              </div>
              <button className="btn btn-primary btn-full" style={{ marginTop: '24px' }} onClick={() => setShowShelterModal(false)}>ปิดหน้าต่าง</button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Report Modal */}
      <AnimatePresence>
        {showReportModal && (
          <motion.div 
            className="modal-overlay" 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            onClick={() => setShowReportModal(false)} 
            style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)', zIndex: 1000, display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '16px' }}
          >
            <motion.div 
              className="modal-content" 
              initial={{ opacity: 0, scale: 0.96, y: 12 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 8 }}
              transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
              onClick={e => e.stopPropagation()} 
              style={{ background: 'white', padding: '24px', borderRadius: '16px', width: '100%', maxWidth: '400px', boxShadow: '0 20px 48px rgba(0,0,0,0.12)' }}
            >
              <h3 style={{ marginTop: 0, marginBottom: '16px', fontSize: '1.2rem', color: 'var(--text-dark)' }}>รายงานปัญหา</h3>
              <form onSubmit={handleReport}>
                <textarea 
                  placeholder="โปรดระบุเหตุผลในการรายงาน..." 
                  value={reportReason}
                  onChange={(e) => setReportReason(e.target.value)}
                  style={{ width: '100%', height: '100px', padding: '12px', borderRadius: '8px', border: '1px solid var(--gray-200)', marginBottom: '16px', resize: 'none', outline: 'none', fontFamily: 'inherit', fontSize: '0.9rem' }}
                  required
                />
                <div style={{ marginBottom: '16px' }}>
                  <input type="file" accept="image/*" ref={reportImageInputRef} onChange={handleReportImageSelect} style={{ display: 'none' }} />
                  <button type="button" onClick={() => reportImageInputRef.current?.click()} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 16px', backgroundColor: 'var(--gray-50)', border: '1px solid var(--gray-200)', borderRadius: '8px', cursor: 'pointer', color: 'var(--text-medium)', fontSize: '0.9rem' }}>
                    <ImageIcon size={18} /> แนบรูปภาพหลักฐาน
                  </button>
                  {reportImagePreview && (
                    <div style={{ position: 'relative', marginTop: '12px', display: 'inline-block' }}>
                      <img src={reportImagePreview} alt="Proof preview" style={{ height: '80px', borderRadius: '8px', border: '1px solid var(--gray-200)', objectFit: 'cover' }} />
                      <button type="button" onClick={() => setReportImagePreview(null)} style={{ position: 'absolute', top: '-8px', right: '-8px', background: 'var(--danger)', color: 'white', border: 'none', borderRadius: '50%', width: '20px', height: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', padding: 0 }}>
                        <X size={14} />
                      </button>
                    </div>
                  )}
                </div>
                <div style={{ display: 'flex', gap: '12px' }}>
                  <button type="button" className="btn btn-outline" style={{ flex: 1 }} onClick={() => setShowReportModal(false)}>ยกเลิก</button>
                  <button type="submit" className="btn btn-primary" style={{ flex: 1, backgroundColor: 'var(--danger)', borderColor: 'var(--danger)' }} disabled={!reportReason.trim() || isSubmittingReport}>
                    {isSubmittingReport ? <Loader size={20} className="spin" /> : 'รายงาน'}
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Block Confirmation Modal */}
      <AnimatePresence>
        {showBlockModal && (
          <motion.div 
            className="modal-overlay" 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            onClick={() => setShowBlockModal(false)} 
            style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)', zIndex: 1000, display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '16px' }}
          >
            <motion.div 
              className="modal-content" 
              initial={{ opacity: 0, scale: 0.96, y: 12 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 8 }}
              transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
              onClick={e => e.stopPropagation()} 
              style={{ background: 'white', padding: '24px', borderRadius: '16px', width: '100%', maxWidth: '400px', boxShadow: '0 20px 48px rgba(0,0,0,0.12)', textAlign: 'center' }}
            >
              <h3 style={{ marginTop: 0, marginBottom: '16px', fontSize: '1.2rem', color: 'var(--text-dark)' }}>ต้องการบล็อกผู้ใช้นี้ด้วยหรือไม่?</h3>
              <p style={{ color: 'var(--text-medium)', marginBottom: '24px' }}>หากบล็อก คุณจะไม่ได้รับข้อความจากมูลนิธินี้อีก</p>
              <div style={{ display: 'flex', gap: '12px' }}>
                <button className="btn btn-outline" style={{ flex: 1 }} onClick={() => setShowBlockModal(false)}>ไม่บล็อก</button>
                <button className="btn btn-primary" style={{ flex: 1, backgroundColor: 'var(--danger)', borderColor: 'var(--danger)' }} onClick={handleBlock}>บล็อกผู้ใช้</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Cancel Adoption Modal for Adopter */}
      <AnimatePresence>
        {showCancelModal && (
          <motion.div 
            className="modal-overlay" 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            onClick={() => !isSubmittingCancel && setShowCancelModal(false)} 
            style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)', zIndex: 1100, display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '16px' }}
          >
            <motion.div 
              className="modal-content" 
              initial={{ opacity: 0, scale: 0.96, y: 12 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 8 }}
              transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
              onClick={e => e.stopPropagation()} 
              style={{ background: 'white', padding: '24px', borderRadius: '20px', width: '100%', maxWidth: '440px', boxShadow: '0 20px 48px rgba(0,0,0,0.12)' }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
                <div style={{ width: '42px', height: '42px', borderRadius: '12px', background: '#FEE2E2', color: '#DC2626', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <XCircle size={24} />
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: '1.15rem', color: '#111827', fontWeight: 700 }}>
                    ขอยกเลิกคำขอรับเลี้ยง
                  </h3>
                  <p style={{ margin: '2px 0 0', fontSize: '0.8rem', color: '#6B7280' }}>
                    สัตว์เลี้ยง: <strong>{animal?.name || 'น้อง'}</strong>
                  </p>
                </div>
              </div>

              <p style={{ fontSize: '0.875rem', color: '#374151', margin: '0 0 12px', fontWeight: 600 }}>
                เลือกเหตุผลในการขอยกเลิกคำขอ:
              </p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '16px' }}>
                {ADOPTER_CANCEL_REASONS.map((reason, idx) => (
                  <label 
                    key={idx}
                    style={{ 
                      display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 12px', 
                      borderRadius: '10px', border: cancelReason === reason ? '1.5px solid #DC2626' : '1px solid #E5E7EB',
                      backgroundColor: cancelReason === reason ? '#FEF2F2' : '#F9FAFB',
                      cursor: 'pointer', fontSize: '0.85rem', color: '#1F2937', transition: 'all 0.15s'
                    }}
                  >
                    <input 
                      type="radio" 
                      name="cancelReason" 
                      value={reason} 
                      checked={cancelReason === reason} 
                      onChange={() => setCancelReason(reason)}
                      style={{ accentColor: '#DC2626' }}
                    />
                    <span>{reason}</span>
                  </label>
                ))}
              </div>

              {cancelReason === 'อื่นๆ (ระบุเพิ่มเติม)' && (
                <textarea 
                  placeholder="โปรดระบุเหตุผลในการขอยกเลิก..." 
                  value={customCancelReason}
                  onChange={(e) => setCustomCancelReason(e.target.value)}
                  style={{ width: '100%', height: '80px', padding: '10px', borderRadius: '10px', border: '1px solid #E5E7EB', marginBottom: '14px', resize: 'none', outline: 'none', fontFamily: 'inherit', fontSize: '0.85rem', boxSizing: 'border-box' }}
                  required
                />
              )}

              <p style={{ fontSize: '0.78rem', color: '#6B7280', margin: '0 0 20px', lineHeight: 1.4 }}>
                ระบบจะส่งข้อความแจ้งขอยกเลิกคำขอพร้อมเหตุผลให้มูลนิธิทราบ และเปิดโอกาสให้น้องได้เจอบ้านอื่นต่อไป
              </p>

              <div style={{ display: 'flex', gap: '10px' }}>
                <button 
                  type="button" 
                  className="btn btn-outline" 
                  style={{ flex: 1, padding: '10px', borderRadius: '10px', fontWeight: 600 }} 
                  onClick={() => setShowCancelModal(false)}
                  disabled={isSubmittingCancel}
                >
                  ปิด
                </button>
                <button 
                  type="button" 
                  className="btn btn-primary" 
                  style={{ flex: 1.3, padding: '10px', borderRadius: '10px', fontWeight: 600, backgroundColor: '#DC2626', borderColor: '#DC2626', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
                  onClick={handleConfirmCancelAdoption}
                  disabled={isSubmittingCancel || (cancelReason === 'อื่นๆ (ระบุเพิ่มเติม)' && !customCancelReason.trim())}
                >
                  {isSubmittingCancel ? <Loader size={18} className="spin" /> : 'ยืนยันยกเลิกคำขอ'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Messages */}
      <div className="chat-messages-area" style={{ flex: 1, minHeight: 0, padding: '14px 12px', overflowY: 'auto', overflowX: 'hidden', display: 'flex', flexDirection: 'column', backgroundColor: '#FAF8F5' }}>
        {/* Date Separator */}
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '16px' }}>
          <span style={{ backgroundColor: 'var(--surface, #FFFFFF)', border: '1px solid var(--gray-200, #E5E7EB)', color: 'var(--text-medium, #6B7280)', fontSize: '0.72rem', padding: '3px 12px', borderRadius: '9999px', boxShadow: '0 1px 2px rgba(0,0,0,0.03)' }}>
            วันนี้
          </span>
        </div>

        {messages.map((msg) => {
          const isUser = msg.sender === 'user';
          return (
            <MessageItem
              key={msg.id}
              msg={msg}
              isUser={isUser}
              avatarUrl={isUser ? userAvatarUrl : animalAvatarUrl}
            />
          );
        })}
        <div ref={messagesEndRef} />
        {isSending && (
          <div className="message-row msg-user" style={{ marginBottom: '12px' }}>
            <div className="message-wrapper msg-user" style={{ maxWidth: '100%', alignItems: 'flex-end' }}>
              <div className="message-bubble" style={{ opacity: 0.7, width: 'max-content' }}>
                กำลังส่ง...
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Input */}
      <div className="chat-input-wrapper" style={{ position: 'relative', padding: '8px 12px calc(8px + env(safe-area-inset-bottom, 0px))', borderTop: '1px solid var(--gray-200, #E5E7EB)', backgroundColor: '#FFFFFF', flexShrink: 0, boxSizing: 'border-box', zIndex: 10 }}>
        {showAttachMenu && (
          <div style={{ position: 'absolute', bottom: '100%', left: '12px', marginBottom: '8px', background: 'white', borderRadius: '16px', boxShadow: '0 10px 25px rgba(0,0,0,0.1)', padding: '14px 18px', display: 'flex', gap: '20px', zIndex: 100, border: '1px solid #E5E7EB' }}>

            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px', cursor: 'pointer' }} onClick={() => docInputRef.current?.click()}>
              <div style={{ width: '44px', height: '44px', borderRadius: '50%', background: 'var(--success-light, #ECFDF5)', color: 'var(--success, #059669)', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                <FileText size={22} />
              </div>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-dark, #111827)', fontWeight: 500 }}>ส่งเอกสาร</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px', cursor: 'pointer' }} onClick={handleShareLocation}>
              <div style={{ width: '44px', height: '44px', borderRadius: '50%', background: '#e0f2fe', color: '#0284c7', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                <MapPin size={22} />
              </div>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-dark, #111827)', fontWeight: 500 }}>ตำแหน่ง</span>
            </div>
          </div>
        )}

        {imagePreview && (
          <div style={{ position: 'absolute', bottom: '100%', left: '12px', marginBottom: '8px', backgroundColor: 'white', padding: '8px', borderRadius: '12px', boxShadow: '0 4px 16px rgba(0,0,0,0.1)', display: 'flex', alignItems: 'center', border: '1px solid #E5E7EB' }}>
            <img src={imagePreview} alt="preview" style={{ height: '70px', borderRadius: '8px', objectFit: 'cover' }} />
            <button type="button" onClick={removeImage} style={{ position: 'absolute', top: '-6px', right: '-6px', background: 'var(--danger, #DC2626)', color: 'white', border: 'none', borderRadius: '50%', width: '22px', height: '22px', cursor: 'pointer', display: 'flex', justifyContent: 'center', alignItems: 'center', boxShadow: '0 1px 3px rgba(0,0,0,0.2)' }}>
              <X size={13} />
            </button>
          </div>
        )}
        <form className="chat-input-area" onSubmit={handleSend} style={{ display: 'flex', alignItems: 'center', gap: '6px', margin: 0, padding: '4px 6px', backgroundColor: 'var(--surface-container-low, #F9FAFB)', border: '1px solid var(--gray-200, #E5E7EB)', borderRadius: '24px' }}>
          <button type="button" onClick={() => setShowAttachMenu(!showAttachMenu)} style={{ background: 'none', border: 'none', padding: '6px', cursor: 'pointer', color: 'var(--text-medium, #6B7280)', transition: 'transform 0.2s', transform: showAttachMenu ? 'rotate(45deg)' : 'rotate(0)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <PlusCircle size={22} />
          </button>
          <button type="button" onClick={() => fileInputRef.current?.click()} style={{ background: 'none', border: 'none', padding: '6px', cursor: 'pointer', color: 'var(--text-medium, #6B7280)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <ImageIcon size={22} />
          </button>
          <input type="file" accept="image/*" ref={fileInputRef} onChange={handleImageSelect} style={{ display: 'none' }} />
          <input type="file" accept=".pdf,.doc,.docx,image/*" ref={docInputRef} onChange={handleDocSelect} style={{ display: 'none' }} />

          <input
            type="text"
            placeholder="พิมพ์ข้อความ..."
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            disabled={isSending}
            style={{ flex: 1, padding: '6px 8px', backgroundColor: 'transparent', border: 'none', outline: 'none', color: 'var(--text-dark, #111827)', fontSize: '16px', fontFamily: 'inherit' }}
          />
          <button type="submit" className="btn-send" disabled={(!inputText.trim() && !imageFile) || isSending} style={{ background: 'var(--primary, #D97706)', color: 'white', border: 'none', borderRadius: '50%', width: '36px', height: '36px', minWidth: '36px', display: 'flex', justifyContent: 'center', alignItems: 'center', cursor: 'pointer', boxShadow: '0 2px 6px rgba(217,119,6,0.25)', opacity: (!inputText.trim() && !imageFile) || isSending ? 0.5 : 1 }}>
            <Send size={16} />
          </button>
        </form>
      </div>
    </div>
  );
}

export default ChatRoom;
