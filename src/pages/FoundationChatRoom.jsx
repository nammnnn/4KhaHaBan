import React, { useState, useEffect, useRef, useMemo, useCallback, memo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ChevronLeft, Send, Loader, CheckCircle, Check, XCircle, Image as ImageIcon, X, Info, User, Clock, MoreVertical, PlusCircle, MapPin, FileText, ShieldCheck, Home, DollarSign, Users, Heart, PawPrint, CheckCircle2 } from 'lucide-react';
import { api } from '../services/api';
import { supabase } from '../services/supabaseClient';
import { useAuth } from '../context/AuthContext';
import { motion, AnimatePresence } from 'framer-motion';
import { ChatRoomSkeleton } from '../components/Skeletons';

const FoundationMessageItem = memo(function FoundationMessageItem({
  msg,
  isMe,
  adopterPic,
  setAdopterImgErr,
  handleOpenUserModal
}) {
  if (msg.sender === 'system') {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', margin: '16px 0' }}>
        <div style={{ padding: '6px 12px', backgroundColor: 'var(--success-light)', color: 'var(--success-dark)', borderRadius: '16px', fontSize: '0.8rem', fontWeight: 600 }}>
          {msg.text}
        </div>
      </div>
    );
  }

  const isApplication = msg.text && (msg.text.includes('ใบสมัครขอรับเลี้ยง') || msg.text.startsWith('\uD83D\uDCCB'));

  return (
    <div className={`message-row msg-${isMe ? 'user' : 'shelter'}`} style={{ marginBottom: '16px' }}>
      {!isMe && (
        <img 
          src={adopterPic} 
          alt="avatar" 
          className="message-avatar" 
          onError={() => setAdopterImgErr(true)}
          style={{ width: '32px', height: '32px', borderRadius: '50%', objectFit: 'cover' }} 
        />
      )}
      <div className={`message-wrapper msg-${isMe ? 'user' : 'shelter'}`}>
        {isApplication ? (
          <div style={{
            background: '#ffffff',
            border: '1.5px solid #fed7aa',
            borderRadius: '16px',
            padding: '16px',
            boxShadow: '0 4px 14px rgba(249, 115, 22, 0.08)',
            maxWidth: '440px',
            width: '100%',
            textAlign: 'left'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid #ffedd5', paddingBottom: '10px', marginBottom: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: '#ffedd5', color: '#ea580c', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <FileText size={18} />
                </div>
                <div>
                  <div style={{ fontWeight: 700, fontSize: '0.92rem', color: '#9a3412' }}>ใบสมัครขอรับเลี้ยง & แบบประเมิน</div>
                  <div style={{ fontSize: '0.72rem', color: '#16a34a', display: 'flex', alignItems: 'center', gap: '4px', fontWeight: 600 }}>
                    <CheckCircle size={12} /> ยืนยันตัวตนแล้ว (KYC Verified)
                  </div>
                </div>
              </div>
              <button 
                type="button"
                onClick={handleOpenUserModal}
                style={{ padding: '5px 10px', fontSize: '0.75rem', fontWeight: 600, color: 'white', background: '#ea580c', border: 'none', borderRadius: '8px', cursor: 'pointer' }}
              >
                ดูข้อมูลผู้สมัคร
              </button>
            </div>
            <div style={{ fontSize: '0.85rem', color: '#334155', lineHeight: 1.6, whiteSpace: 'pre-line', background: '#fffaf5', padding: '12px', borderRadius: '12px', border: '1px solid #fed7aa30' }}>
              {msg.text}
            </div>
          </div>
        ) : (
          <div className="message-bubble">
            {msg.imageUrl && (
              <img src={msg.imageUrl} alt="attached" style={{ maxWidth: '100%', borderRadius: '12px', marginBottom: '8px' }} />
            )}
            {msg.text && msg.text.trim() && (
              <p style={{ margin: 0, whiteSpace: 'pre-line' }}>
                {msg.text.split(/(https?:\/\/[^\s]+)/g).map((part, i) => {
                  if (part.match(/(https?:\/\/[^\s]+)/)) {
                    return (
                      <a key={i} href={part} target="_blank" rel="noopener noreferrer" style={{ color: isMe ? '#ffffff' : '#2563eb', textDecoration: 'underline', wordBreak: 'break-all' }}>
                        {part}
                      </a>
                    );
                  }
                  return part;
                })}
              </p>
            )}
          </div>
        )}
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginTop: '4px', alignSelf: isMe ? 'flex-end' : 'flex-start' }}>
          <span className="message-timestamp" style={{ fontSize: '11px', color: 'var(--text-medium)' }}>{msg.timestamp}</span>
          {isMe && <Check size={12} color="var(--primary)" />}
        </div>
      </div>
    </div>
  );
});

function FoundationChatRoom() {
  const { matchId } = useParams();
  const navigate = useNavigate();
  const { user, profile } = useAuth();
  
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(true);
  const [animal, setAnimal] = useState(null);
  const [match, setMatch] = useState(null);
  const [isSending, setIsSending] = useState(false);
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const fileInputRef = useRef(null);
  
  const messagesEndRef = useRef(null);
  const [adopterImgErr, setAdopterImgErr] = useState(false);

  // Adoption Handover states
  const [showHandoverModal, setShowHandoverModal] = useState(false);
  const [handoverDate, setHandoverDate] = useState(new Date().toISOString().split('T')[0]);
  const [handoverNotes, setHandoverNotes] = useState('');
  const [isSubmittingHandover, setIsSubmittingHandover] = useState(false);

  useEffect(() => {
    setAdopterImgErr(false);
  }, [matchId, match?.user_id]);

  // Load chat history & match info
  useEffect(() => {
    const loadChat = async () => {
      try {
        setLoading(true);
        const foundationMatches = await api.getFoundationMatches(user?.id);
        const currentMatch = foundationMatches.find(m => m.id === matchId);
        
        if (currentMatch) {
          if (!currentMatch.userData?.avatar_url && currentMatch.user_id && supabase) {
            try {
              const { data: prof } = await supabase
                .from('profiles')
                .select('id, full_name, phone, avatar_url')
                .eq('id', currentMatch.user_id)
                .maybeSingle();
              if (prof) {
                currentMatch.userData = {
                  ...(currentMatch.userData || {}),
                  full_name: prof.full_name || currentMatch.userData?.full_name,
                  phone: prof.phone || currentMatch.userData?.phone,
                  avatar_url: prof.avatar_url
                };
              }
            } catch (pErr) {
              console.warn('Could not fetch profile in loadChat:', pErr);
            }
          }

          if (!currentMatch.userData || !currentMatch.userData.assessment) {
            try {
              const uData = await api.getUserVerification(currentMatch.user_id);
              if (uData) {
                currentMatch.userData = { ...(currentMatch.userData || {}), ...uData };
              }
            } catch (e) {
              console.warn('Could not fetch user verification in loadChat:', e);
            }
          }
          setMatch(currentMatch);
          const animalData = await api.getAnimalById(currentMatch.animalId);
          setAnimal(animalData);
        }

        const chatHistory = await api.getMessages(matchId);
        setMessages(chatHistory);

        // Mark as read immediately for foundation
        if (matchId && user?.id) {
          api.markMatchAsRead(matchId, 'shelter', user.id);
        }
      } catch (error) {
        console.error("Failed to load chat data", error);
      } finally {
        setLoading(false);
      }
    };

    loadChat();
  }, [matchId, user?.id]);

  // Subscribe to Supabase Realtime for incoming messages
  useEffect(() => {
    if (!matchId) return;

    let channel = null;
    if (supabase) {
      channel = supabase
        .channel(`foundation_chat_messages_${matchId}`)
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

            // If incoming message from user, immediately mark as read since user is looking at this screen
            if (newMsg.sender === 'user' && user?.id) {
              api.markMatchAsRead(matchId, 'shelter', user.id);
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
  }, [matchId, user?.id]);

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
        sender: 'shelter',
        text: textToSend,
        imageUrl,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      setMessages(prev => [...prev, tempMsg]);

      const sent = await api.sendMessage(matchId, textToSend, 'shelter', imageUrl);
      if (sent && sent.id) {
        setMessages(prev => prev.map(m => m.id === tempId ? { ...sent, imageUrl: sent.image_url || sent.imageUrl } : m));
      }

      if (user?.id) {
        try {
          const readChats = JSON.parse(localStorage.getItem(`read_chats_foundation_${user.id}`) || '{}');
          readChats[matchId] = Date.now();
          localStorage.setItem(`read_chats_foundation_${user.id}`, JSON.stringify(readChats));
          window.dispatchEvent(new Event('chatReadUpdated'));
        } catch (e) {}
      }
    } catch (error) {
      console.error("Failed to send message", error);
    } finally {
      setIsSending(false);
    }
  };

  const [showUserModal, setShowUserModal] = useState(false);
  const [showAttachMenu, setShowAttachMenu] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [showBlockModal, setShowBlockModal] = useState(false);
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const [reportReason, setReportReason] = useState('');
  const [reportImagePreview, setReportImagePreview] = useState(null);
  const [isSubmittingReport, setIsSubmittingReport] = useState(false);
  const reportImageInputRef = useRef(null);
  const docInputRef = useRef(null);

  // Adoption Approval & Decline States
  const [showDeclineModal, setShowDeclineModal] = useState(false);
  const [showApproveModal, setShowApproveModal] = useState(false);
  const [declineReason, setDeclineReason] = useState('พูดคุยแล้วเงื่อนไขหรือความพร้อมไม่ตรงตามเกณฑ์ของมูลนิธิ');
  const [customDeclineReason, setCustomDeclineReason] = useState('');
  const [sendDeclineMessage, setSendDeclineMessage] = useState(true);
  const [isSubmittingDecline, setIsSubmittingDecline] = useState(false);
  const [isSubmittingApprove, setIsSubmittingApprove] = useState(false);

  const DECLINE_REASONS = [
    'พูดคุยแล้วเงื่อนไขหรือความพร้อมไม่ตรงตามเกณฑ์ของมูลนิธิ',
    'ผู้ขอรับเลี้ยงแจ้งขอยกเลิกหรือไม่สะดวกรับเลี้ยงแล้ว',
    'ไม่สามารถติดต่อผู้ขอรับเลี้ยงได้ / ขาดการติดต่อ',
    'ที่อยู่อาศัยหรือสภาพแวดล้อมยังไม่เหมาะสมกับสัตว์ตัวนี้',
    'มีผู้ขอรับเลี้ยงสัตว์ตัวนี้ไปแล้ว หรือมีคิวรับเลี้ยงก่อนหน้า',
    'อื่นๆ (ระบุเพิ่มเติม)'
  ];

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
      await api.reportUser(user?.id, match?.user_id, reportReason, reportImagePreview);
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
      await api.blockUser(user?.id, match?.user_id);
      navigate('/foundation/matches');
    } catch (error) {
      console.error(error);
    }
  };

  const handleApprove = () => {
    setShowApproveModal(true);
  };

  const handleDecline = () => {
    setShowDeclineModal(true);
  };

  const handleConfirmDecline = async () => {
    setIsSubmittingDecline(true);
    try {
      const finalReason = declineReason === 'อื่นๆ (ระบุเพิ่มเติม)' 
        ? (customDeclineReason.trim() || 'เหตุผลอื่นๆ ตามความเหมาะสมของมูลนิธิ')
        : (declineReason || 'คุณสมบัติยังไม่ตรงตามเกณฑ์ของมูลนิธิ');

      const isPreviouslyApproved = match?.status === 'approved';

      // 1. Update match status in database
      await api.updateMatchStatus(matchId, 'rejected');
      setMatch(prev => ({ ...prev, status: 'rejected' }));

      // 1.1 If previously approved or reserved, ensure animal status is reverted back to 'available'
      if (animal?.id && supabase) {
        try {
          await supabase.from('animals').update({ status: 'available' }).eq('id', animal.id);
        } catch (animalErr) {
          console.warn('Could not revert animal status:', animalErr);
        }
      }

      // 2. Send official notification message if enabled
      if (sendDeclineMessage) {
        const petName = animal?.name || 'สัตว์เลี้ยง';
        const declineMsgText = isPreviouslyApproved
          ? `[แจ้งขอยกเลิกคำขอรับเลี้ยง]\n━━━━━━━━━━━━━━━━━━\nทางมูลนิธิขอแจ้งยกเลิกคำขอรับเลี้ยง ${petName}\n\nจากการพูดคุยรายละเอียดเพิ่มเติม ทางมูลนิธิต้องขออภัยที่ไม่สามารถดำเนินการส่งมอบสัตว์เลี้ยงต่อได้ในครั้งนี้\n\nเหตุผล: ${finalReason}${customDeclineReason && declineReason !== 'อื่นๆ (ระบุเพิ่มเติม)' ? `\nรายละเอียดเพิ่มเติม: ${customDeclineReason}` : ''}\n━━━━━━━━━━━━━━━━━━\nขอขอบคุณในความเมตตาที่มีต่อน้องๆ ท่านสามารถติดตามและเลือกดูสัตว์ตัวอื่นๆ ในระบบได้เสมอครับ/ค่ะ`
          : `[แจ้งผลการพิจารณาคำขอรับเลี้ยง]\n━━━━━━━━━━━━━━━━━━\nทางมูลนิธิขอขอบคุณที่ให้ความสนใจรับเลี้ยง ${petName}\n\nจากการพิจารณาข้อมูลและแบบประเมินความพร้อม ทางมูลนิธิขออภัยที่ไม่สามารถอนุมัติคำขอรับเลี้ยงในครั้งนี้ได้\n\nเหตุผล: ${finalReason}${customDeclineReason && declineReason !== 'อื่นๆ (ระบุเพิ่มเติม)' ? `\nรายละเอียดเพิ่มเติม: ${customDeclineReason}` : ''}\n━━━━━━━━━━━━━━━━━━\nขอขอบคุณในความเมตตาที่มีต่อน้องๆ ท่านสามารถติดตามและเลือกดูสัตว์ตัวอื่นๆ ในระบบได้เสมอครับ/ค่ะ`;

        await api.sendMessage(matchId, declineMsgText, 'shelter');
      }

      // 3. Optimistic system message
      const sysMsg = {
        id: `sys_${Date.now()}`,
        sender: 'system',
        text: isPreviouslyApproved ? 'คุณได้ยกเลิกคำขอรับเลี้ยงนี้แล้ว' : 'คุณได้ปฏิเสธคำขอรับเลี้ยงนี้แล้ว',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      setMessages(prev => [...prev, sysMsg]);

      setShowDeclineModal(false);
      setShowUserModal(false);
    } catch (error) {
      console.error('Failed to decline/cancel adoption request:', error);
      alert('เกิดข้อผิดพลาดในการดำเนินการ กรุณาลองใหม่อีกครั้ง');
    } finally {
      setIsSubmittingDecline(false);
    }
  };

  const handleConfirmApprove = async () => {
    setIsSubmittingApprove(true);
    try {
      // 1. Update match status in database
      await api.updateMatchStatus(matchId, 'approved');
      setMatch(prev => ({ ...prev, status: 'approved' }));

      // 2. Send official congratulatory message into chat
      const petName = animal?.name || 'สัตว์เลี้ยง';
      const approveMsgText = `[แจ้งผลการพิจารณาคำขอรับเลี้ยง]\n━━━━━━━━━━━━━━━━━━\nยินดีด้วยครับ/ค่ะ! คำขอรับเลี้ยง ${petName} ของท่านได้รับการอนุมัติแล้ว\n\nเจ้าหน้าที่จะประสานงานและพูดคุยรายละเอียดขั้นตอนการส่งมอบ รวมถึงการเตรียมความพร้อมในแชทนี้ได้เลยครับ/ค่ะ\n━━━━━━━━━━━━━━━━━━`;

      await api.sendMessage(matchId, approveMsgText, 'shelter');

      // 3. Optimistic system message
      const sysMsg = {
        id: `sys_${Date.now()}`,
        sender: 'system',
        text: 'คุณได้อนุมัติการรับเลี้ยงแล้ว!',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      setMessages(prev => [...prev, sysMsg]);

      setShowApproveModal(false);
      setShowUserModal(false);
      if (user?.id) {
        api.markMatchAsRead(matchId, 'shelter', user.id);
      }
    } catch (error) {
      console.error('Failed to approve adoption request:', error);
      alert('เกิดข้อผิดพลาดในการอนุมัติคำขอ กรุณาลองใหม่อีกครั้ง');
    } finally {
      setIsSubmittingApprove(false);
    }
  };

  const handleConfirmHandover = async () => {
    try {
      setIsSubmittingHandover(true);
      await api.confirmAdoptionHandover(matchId, handoverDate, handoverNotes);
      if (user?.id) {
        api.markMatchAsRead(matchId, 'shelter', user.id);
      }
      setMatch(prev => ({ ...prev, status: 'adopted', handover_date: handoverDate }));
      setShowHandoverModal(false);
      const updatedMessages = await api.getMessages(matchId);
      setMessages(updatedMessages);
    } catch (err) {
      console.error('Failed to confirm handover:', err);
      alert('เกิดข้อผิดพลาดในการบันทึกการส่งมอบ กรุณาลองใหม่อีกครั้ง');
    } finally {
      setIsSubmittingHandover(false);
    }
  };

  const handleShareLocation = () => {
    setShowAttachMenu(false);
    if (!navigator.geolocation) {
      const locationText = `ตำแหน่งที่ตั้งมูลนิธิ / จุดนัดหมาย:\nhttps://www.google.com/maps/search/?api=1&query=13.7563,100.5018`;
      api.sendMessage(matchId, locationText, 'shelter');
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        const mapUrl = `https://www.google.com/maps?q=${latitude},${longitude}`;
        const locationText = `แชร์ตำแหน่งที่ตั้ง / จุดนัดหมาย:\n${mapUrl}`;
        api.sendMessage(matchId, locationText, 'shelter');
      },
      (err) => {
        console.warn('Geolocation error, fallback to general maps:', err);
        const locationText = `ตำแหน่งที่ตั้งมูลนิธิ / จุดนัดหมาย:\nhttps://www.google.com/maps/search/?api=1&query=13.7563,100.5018`;
        api.sendMessage(matchId, locationText, 'shelter');
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
        const fileName = `doc_${matchId}_${Date.now()}.${fileExt}`;
        const { error } = await supabase.storage.from('chat_images').upload(fileName, file);
        if (!error) {
          const { data } = supabase.storage.from('chat_images').getPublicUrl(fileName);
          docUrl = data?.publicUrl;
        }
      }
      
      const docMsgText = `แนบเอกสาร: ${file.name}${docUrl ? `\nดาวน์โหลด/เปิดดู: ${docUrl}` : ''}`;
      await api.sendMessage(matchId, docMsgText, 'shelter');
    } catch (err) {
      console.error('Failed to send document:', err);
    } finally {
      setIsSending(false);
      if (docInputRef.current) docInputRef.current.value = '';
    }
  };

  const formatIdCard = (id) => {
    if (!id) return '-';
    const clean = id.replace(/\D/g, '');
    if (clean.length === 13) {
      return `${clean.slice(0, 1)}-${clean.slice(1, 5)}-${clean.slice(5, 10)}-${clean.slice(10, 12)}-${clean.slice(12)}`;
    }
    return id;
  };

  const handleOpenUserModal = useCallback(async () => {
    setShowUserModal(true);
    if (match?.user_id && (!match?.userData || !match?.userData?.assessment || !match?.userData?.avatar_url)) {
      try {
        const uData = await api.getUserVerification(match.user_id);
        if (uData) {
          setMatch(prev => ({
            ...prev,
            userData: { ...(prev?.userData || {}), ...uData }
          }));
        }
      } catch (e) {
        console.warn('Could not fetch user verification on open modal:', e);
      }
    }
  }, [match?.user_id, match?.userData]);

  if (loading) {
    return <ChatRoomSkeleton />;
  }

  const adopterName = match?.userData?.full_name || 'ผู้ใช้งานทั่วไป';
  const defaultAdopterAvatar = useMemo(() => `https://ui-avatars.com/api/?name=${encodeURIComponent(adopterName)}&background=D97706&color=fff`, [adopterName]);
  const adopterAvatar = (!adopterImgErr && match?.userData?.avatar_url) ? match.userData.avatar_url : defaultAdopterAvatar;

  return (
    <div className="chat-room-container" style={{ display: 'flex', flexDirection: 'column', height: '100%', width: '100%' }}>
      {/* Header */}
      <div className="chat-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 18px', borderBottom: '1px solid var(--gray-200, #E5E7EB)', backgroundColor: '#FFFFFF' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: 0 }}>
          <button 
            className="chat-back-btn" 
            onClick={() => navigate('/foundation/matches')} 
            aria-label="ย้อนกลับไปหน้ารายการแชท"
          >
            <ChevronLeft size={20} />
          </button>
          
          <div className="chat-partner-info" style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: 0, margin: 0 }}>
            <div style={{ position: 'relative', flexShrink: 0 }}>
              <img 
                src={adopterAvatar} 
                alt={adopterName} 
                className="chat-avatar" 
                onError={() => setAdopterImgErr(true)}
                style={{ width: '42px', height: '42px', borderRadius: '50%', objectFit: 'cover', border: '1.5px solid #E5E7EB' }} 
              />
              <span style={{ position: 'absolute', bottom: '1px', right: '1px', width: '10px', height: '10px', borderRadius: '50%', backgroundColor: '#10B981', border: '2px solid #FFFFFF' }}></span>
            </div>
            <div style={{ minWidth: 0 }}>
              <h2 style={{ fontSize: '1rem', fontWeight: 700, margin: 0, color: '#111827', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {adopterName}
              </h2>
              <p style={{ fontSize: '0.78rem', color: '#6B7280', margin: '2px 0 0', display: 'flex', alignItems: 'center', gap: '4px' }}>
                กำลังออนไลน์
              </p>
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', position: 'relative', flexShrink: 0 }}>
          <button 
            onClick={handleOpenUserModal} 
            title="ข้อมูลผู้ขอรับเลี้ยง" 
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
                  onClick={() => { setShowMoreMenu(false); handleDecline(); }}
                >
                  <XCircle size={15} /> {match.status === 'approved' ? 'ยกเลิกคำขอรับเลี้ยงนี้' : 'ปฏิเสธคำขอรับเลี้ยง'}
                </button>
              )}
              <button style={{ width: '100%', padding: '12px 16px', background: 'none', border: 'none', textAlign: 'left', cursor: 'pointer', color: '#6B7280', fontSize: '0.85rem', fontWeight: 500 }} onClick={() => { setShowMoreMenu(false); setShowReportModal(true); }}>
                รายงานผู้ใช้ / บล็อก
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Action Bar for Pending / Approved / Rejected Matches */}
      {match && match.status === 'pending' && (
        <div className="pending-approval-card">
          <div className="pending-card-content">
            <div className="pending-icon">
              <Clock size={20} />
            </div>
            <div className="pending-text">
              <h4>รอการพิจารณาอนุมัติ</h4>
              <p>กรุณาตรวจสอบข้อมูลก่อนอนุมัติให้ผู้สนใจเริ่มสนทนา</p>
            </div>
          </div>
          <div className="pending-actions" style={{ flexDirection: 'column', gap: '8px' }}>
            <button className="pending-btn" style={{ width: '100%', background: 'var(--gray-100)', color: 'var(--text-dark)' }} onClick={handleOpenUserModal}>
              <Info size={18} /> ตรวจสอบข้อมูลผู้ขอรับเลี้ยง
            </button>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button className="pending-btn decline" onClick={handleDecline}>
                <XCircle size={18} /> ปฏิเสธ
              </button>
              <button className="pending-btn approve" onClick={handleApprove}>
                <CheckCircle size={18} /> อนุมัติ
              </button>
            </div>
          </div>
        </div>
      )}

      {match && match.status === 'approved' && (
        <div style={{ padding: '10px 18px', backgroundColor: '#ECFDF5', borderBottom: '1px solid #A7F3D0', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#047857', fontSize: '0.84rem', fontWeight: 600 }}>
            <CheckCircle size={18} color="#059669" />
            <span>อนุมัติคำขอรับเลี้ยงแล้ว • พูดคุยและนัดหมายวันส่งมอบได้ในแชทนี้</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            <button 
              type="button"
              onClick={handleDecline}
              style={{ 
                padding: '6px 13px', fontSize: '0.82rem', fontWeight: 600, 
                color: '#DC2626', backgroundColor: '#FFFFFF', border: '1px solid #FCA5A5', 
                borderRadius: '8px', cursor: 'pointer', display: 'inline-flex', 
                alignItems: 'center', gap: '6px', transition: 'all 0.15s ease' 
              }}
              onMouseEnter={e => e.currentTarget.style.backgroundColor = '#FEF2F2'}
              onMouseLeave={e => e.currentTarget.style.backgroundColor = '#FFFFFF'}
            >
              <XCircle size={15} /> ยกเลิกคำขอรับเลี้ยง
            </button>
            <button 
              type="button"
              onClick={() => setShowHandoverModal(true)}
              style={{ 
                padding: '6px 14px', fontSize: '0.82rem', fontWeight: 700, 
                color: '#FFFFFF', backgroundColor: '#15803D', border: 'none', 
                borderRadius: '8px', cursor: 'pointer', display: 'inline-flex', 
                alignItems: 'center', gap: '6px', boxShadow: '0 1px 3px rgba(21,128,61,0.2)' 
              }}
            >
              <Check size={16} /> ยืนยันการส่งมอบสัตว์เลี้ยง
            </button>
          </div>
        </div>
      )}

      {match && (match.status === 'adopted' || match.status === 'completed') && (
        <div style={{ padding: '10px 18px', backgroundColor: '#F0FDF4', borderBottom: '1px solid #BBF7D0', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#15803D', fontSize: '0.84rem', fontWeight: 600 }}>
            <CheckCircle2 size={18} color="#16A34A" />
            <span>ส่งมอบสัตว์เลี้ยงสำเร็จแล้ว • น้องอยู่กับผู้รับเลี้ยงแล้ว (ติดตามสถานะทุก 2 เดือน)</span>
          </div>
          <button 
            type="button"
            onClick={() => navigate(`/adoption/timeline/${matchId}`)}
            style={{ 
              padding: '6px 14px', fontSize: '0.82rem', fontWeight: 700, 
              color: '#15803D', backgroundColor: '#DCFCE7', border: '1px solid #BBF7D0', 
              borderRadius: '8px', cursor: 'pointer', display: 'inline-flex', 
              alignItems: 'center', gap: '6px' 
            }}
          >
            <Clock size={16} /> ประวัติการติดตามสถานะ
          </button>
        </div>
      )}

      {match && match.status === 'rejected' && (
        <div style={{ padding: '10px 18px', backgroundColor: '#FEF2F2', borderBottom: '1px solid #FECACA', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#B91C1C', fontSize: '0.85rem', fontWeight: 600 }}>
            <XCircle size={18} color="#DC2626" />
            <span>ปฏิเสธคำขอรับเลี้ยงนี้แล้ว • บันทึกผลการพิจารณาเรียบร้อยแล้ว</span>
          </div>
          <button 
            onClick={handleApprove}
            style={{ padding: '5px 12px', fontSize: '0.78rem', fontWeight: 600, color: '#047857', backgroundColor: '#ECFDF5', border: '1px solid #A7F3D0', borderRadius: '8px', cursor: 'pointer', whiteSpace: 'nowrap' }}
          >
            เปลี่ยนใจอนุมัติ
          </button>
        </div>
      )}

      {/* User Review Modal */}
      <AnimatePresence>
        {showUserModal && (
          <motion.div 
            className="modal-overlay" 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            onClick={() => setShowUserModal(false)} 
            style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)', zIndex: 1000, display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '16px' }}
          >
            <motion.div 
              className="modal-content" 
              initial={{ opacity: 0, scale: 0.96, y: 12 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 8 }}
              transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
              onClick={e => e.stopPropagation()} 
              style={{ background: 'white', padding: '24px', borderRadius: '20px', width: '100%', maxWidth: '480px', maxHeight: '88vh', overflowY: 'auto', boxShadow: '0 20px 48px rgba(0,0,0,0.12)' }}
            >
              {/* Modal Header */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '18px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div style={{ width: '38px', height: '38px', borderRadius: '12px', background: '#ffedd5', color: '#ea580c', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <ShieldCheck size={22} />
                  </div>
                  <div>
                    <h3 style={{ margin: 0, fontSize: '1.12rem', color: 'var(--text-dark)', fontWeight: 700 }}>
                      ข้อมูลและผลประเมินผู้ขอรับเลี้ยง
                    </h3>
                    <span style={{ fontSize: '0.78rem', color: 'var(--text-medium)' }}>
                      ตรวจสอบความพร้อมก่อนพิจารณาอนุมัติ
                    </span>
                  </div>
                </div>
                <button 
                  onClick={() => setShowUserModal(false)}
                  style={{ background: 'none', border: 'none', padding: '6px', cursor: 'pointer', color: 'var(--text-medium)', borderRadius: '50%' }}
                >
                  <X size={20} />
                </button>
              </div>

              {/* Personal Info Box */}
              <div style={{ background: '#fffaf5', border: '1.5px solid #fed7aa', borderRadius: '16px', padding: '16px', marginBottom: '20px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '14px' }}>
                  <img 
                    src={adopterAvatar} 
                    alt={adopterName} 
                    onError={() => setAdopterImgErr(true)}
                    style={{ width: '48px', height: '48px', borderRadius: '50%', objectFit: 'cover', border: '2px solid white', boxShadow: '0 2px 8px rgba(0,0,0,0.08)' }} 
                  />
                  <div>
                    <div style={{ fontWeight: 700, fontSize: '1.05rem', color: 'var(--text-dark)' }}>{adopterName}</div>
                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '0.75rem', fontWeight: 600, color: '#16a34a', background: '#dcfce7', padding: '2px 8px', borderRadius: '6px', marginTop: '3px' }}>
                      <CheckCircle size={12} /> ผ่านการยืนยันตัวตนแล้ว (KYC Verified)
                    </div>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', fontSize: '0.88rem', borderTop: '1px solid #ffedd5', paddingTop: '12px' }}>
                  <div>
                    <span style={{ color: '#78716c', fontSize: '0.78rem', display: 'block' }}>เบอร์โทรศัพท์</span>
                    <strong style={{ color: 'var(--text-dark)' }}>{match?.userData?.phone || '-'}</strong>
                  </div>
                  <div>
                    <span style={{ color: '#78716c', fontSize: '0.78rem', display: 'block' }}>เลขบัตรประชาชน</span>
                    <strong style={{ color: 'var(--text-dark)' }}>{formatIdCard(match?.userData?.id_card_no)}</strong>
                  </div>
                </div>
              </div>

              {/* Assessment Section */}
              <div style={{ marginBottom: '24px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                  <PawPrint size={18} color="#ea580c" />
                  <span style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--text-dark)' }}>
                    ผลแบบประเมินความพร้อมก่อนรับเลี้ยง (5 ข้อ)
                  </span>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {/* Question 1: Housing */}
                  <div style={{ padding: '12px 14px', background: '#f8fafc', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.78rem', color: '#64748b', fontWeight: 600, marginBottom: '4px' }}>
                      <Home size={14} color="#ea580c" /> 1. ที่อยู่อาศัย
                    </div>
                    <div style={{ fontSize: '0.88rem', color: '#1e293b', fontWeight: 600 }}>
                      {match?.userData?.assessment?.housing || 'มีบ้าน/คอนโดที่อนุญาตให้เลี้ยงสัตว์'}
                    </div>
                  </div>

                  {/* Question 2: Time */}
                  <div style={{ padding: '12px 14px', background: '#f8fafc', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.78rem', color: '#64748b', fontWeight: 600, marginBottom: '4px' }}>
                      <Clock size={14} color="#ea580c" /> 2. เวลาในการดูแลน้อง
                    </div>
                    <div style={{ fontSize: '0.88rem', color: '#1e293b', fontWeight: 600 }}>
                      {match?.userData?.assessment?.time || 'มาก (อย่างน้อยวันละ 2 ครั้ง)'}
                    </div>
                  </div>

                  {/* Question 3: Budget */}
                  <div style={{ padding: '12px 14px', background: '#f8fafc', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.78rem', color: '#64748b', fontWeight: 600, marginBottom: '4px' }}>
                      <DollarSign size={14} color="#ea580c" /> 3. งบประมาณค่าอาหารและรักษาพยาบาล
                    </div>
                    <div style={{ fontSize: '0.88rem', color: '#1e293b', fontWeight: 600 }}>
                      {match?.userData?.assessment?.budget || 'มี (อย่างน้อย 1,000 บาท/เดือน)'}
                    </div>
                  </div>

                  {/* Question 4: Family */}
                  <div style={{ padding: '12px 14px', background: '#f8fafc', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.78rem', color: '#64748b', fontWeight: 600, marginBottom: '4px' }}>
                      <Users size={14} color="#ea580c" /> 4. ความเห็นชอบของคนรอบข้าง/ครอบครัว
                    </div>
                    <div style={{ fontSize: '0.88rem', color: '#1e293b', fontWeight: 600 }}>
                      {match?.userData?.assessment?.family || 'เห็นด้วยทั้งหมด'}
                    </div>
                  </div>

                  {/* Question 5: Longterm */}
                  <div style={{ padding: '12px 14px', background: '#f8fafc', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.78rem', color: '#64748b', fontWeight: 600, marginBottom: '4px' }}>
                      <Heart size={14} color="#ea580c" /> 5. ความพร้อมดูแลในระยะยาว
                    </div>
                    <div style={{ fontSize: '0.88rem', color: '#1e293b', fontWeight: 600 }}>
                      {match?.userData?.assessment?.longterm || 'พร้อม ดูแลตลอดชีวิต'}
                    </div>
                  </div>
                </div>
              </div>

              {match?.status === 'pending' && (
                <div style={{ display: 'flex', gap: '10px', marginBottom: '10px' }}>
                  <button 
                    type="button"
                    className="btn btn-outline" 
                    style={{ flex: 1, borderColor: '#EF4444', color: '#DC2626', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', fontWeight: 600, padding: '10px' }}
                    onClick={() => { setShowUserModal(false); setShowDeclineModal(true); }}
                  >
                    <XCircle size={18} /> ปฏิเสธคำขอ
                  </button>
                  <button 
                    type="button"
                    className="btn btn-primary" 
                    style={{ flex: 1.2, backgroundColor: '#059669', borderColor: '#059669', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', fontWeight: 600, padding: '10px' }}
                    onClick={() => { setShowUserModal(false); setShowApproveModal(true); }}
                  >
                    <CheckCircle size={18} /> อนุมัติการรับเลี้ยง
                  </button>
                </div>
              )}

              <button className="btn btn-primary btn-full" style={{ width: '100%', padding: '12px', borderRadius: '12px', fontWeight: 600, backgroundColor: 'var(--gray-100)', color: 'var(--text-dark)', border: '1px solid var(--gray-200)' }} onClick={() => setShowUserModal(false)}>ปิดหน้าต่าง</button>
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
                  style={{ width: '100%', height: '100px', padding: '12px', borderRadius: '12px', border: '1px solid var(--gray-200)', marginBottom: '16px', resize: 'none', outline: 'none', fontFamily: 'inherit', fontSize: '0.9rem' }}
                  required
                />
                <div style={{ marginBottom: '16px' }}>
                  <input type="file" accept="image/*" ref={reportImageInputRef} onChange={handleReportImageSelect} style={{ display: 'none' }} />
                  <button type="button" onClick={() => reportImageInputRef.current?.click()} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 16px', backgroundColor: 'var(--gray-50)', border: '1px solid var(--gray-200)', borderRadius: '12px', cursor: 'pointer', color: 'var(--text-medium)', fontSize: '0.9rem' }}>
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
              style={{ background: 'white', padding: '24px', borderRadius: '24px', width: '100%', maxWidth: '400px', boxShadow: '0 20px 48px rgba(0,0,0,0.12)', textAlign: 'center' }}
            >
              <h3 style={{ marginTop: 0, marginBottom: '16px', fontSize: '1.2rem', color: 'var(--text-dark)' }}>ต้องการบล็อกผู้ใช้นี้ด้วยหรือไม่?</h3>
              <p style={{ color: 'var(--text-medium)', marginBottom: '24px' }}>หากบล็อก คุณจะไม่ได้รับข้อความจากผู้ใช้นี้อีก</p>
              <div style={{ display: 'flex', gap: '12px' }}>
                <button className="btn btn-outline" style={{ flex: 1 }} onClick={() => setShowBlockModal(false)}>ไม่บล็อก</button>
                <button className="btn btn-primary" style={{ flex: 1, backgroundColor: 'var(--danger)', borderColor: 'var(--danger)' }} onClick={handleBlock}>บล็อกผู้ใช้</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Decline Adoption Modal */}
      <AnimatePresence>
        {showDeclineModal && (
          <motion.div 
            className="modal-overlay" 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            onClick={() => !isSubmittingDecline && setShowDeclineModal(false)} 
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
                    {match?.status === 'approved' ? 'ยกเลิกคำขอรับเลี้ยง' : 'ปฏิเสธคำขอรับเลี้ยง'}
                  </h3>
                  <p style={{ margin: '2px 0 0', fontSize: '0.8rem', color: '#6B7280' }}>
                    สำหรับผู้ขอรับเลี้ยง: <strong>{adopterName}</strong>
                  </p>
                </div>
              </div>

              <p style={{ fontSize: '0.875rem', color: '#374151', margin: '0 0 12px', fontWeight: 600 }}>
                {match?.status === 'approved' ? 'เลือกเหตุผลในการยกเลิกคำขอรับเลี้ยง:' : 'เลือกเหตุผลในการปฏิเสธคำขอ:'}
              </p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '16px' }}>
                {DECLINE_REASONS.map((reason, idx) => (
                  <label 
                    key={idx}
                    style={{ 
                      display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 12px', 
                      borderRadius: '10px', border: declineReason === reason ? '1.5px solid #DC2626' : '1px solid #E5E7EB',
                      backgroundColor: declineReason === reason ? '#FEF2F2' : '#F9FAFB',
                      cursor: 'pointer', fontSize: '0.85rem', color: '#1F2937', transition: 'all 0.15s'
                    }}
                  >
                    <input 
                      type="radio" 
                      name="declineReason" 
                      value={reason} 
                      checked={declineReason === reason} 
                      onChange={() => setDeclineReason(reason)}
                      style={{ accentColor: '#DC2626' }}
                    />
                    <span>{reason}</span>
                  </label>
                ))}
              </div>

              {declineReason === 'อื่นๆ (ระบุเพิ่มเติม)' && (
                <textarea 
                  placeholder="โปรดระบุเหตุผลเพื่อแจ้งให้ผู้สมัครทราบ..." 
                  value={customDeclineReason}
                  onChange={(e) => setCustomDeclineReason(e.target.value)}
                  style={{ width: '100%', height: '80px', padding: '10px', borderRadius: '10px', border: '1px solid #E5E7EB', marginBottom: '14px', resize: 'none', outline: 'none', fontFamily: 'inherit', fontSize: '0.85rem', boxSizing: 'border-box' }}
                  required
                />
              )}

              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.8rem', color: '#4B5563', marginBottom: '20px', cursor: 'pointer' }}>
                <input 
                  type="checkbox" 
                  checked={sendDeclineMessage} 
                  onChange={(e) => setSendDeclineMessage(e.target.checked)}
                  style={{ accentColor: '#DC2626' }}
                />
                <span>ส่งข้อความแจ้งเหตุผลให้ผู้ขอรับเลี้ยงในแชทอัตโนมัติ</span>
              </label>

              <div style={{ display: 'flex', gap: '10px' }}>
                <button 
                  type="button" 
                  className="btn btn-outline" 
                  style={{ flex: 1, padding: '10px', borderRadius: '10px', fontWeight: 600 }} 
                  onClick={() => setShowDeclineModal(false)}
                  disabled={isSubmittingDecline}
                >
                  ปิด
                </button>
                <button 
                  type="button" 
                  className="btn btn-primary" 
                  style={{ flex: 1.3, padding: '10px', borderRadius: '10px', fontWeight: 600, backgroundColor: '#DC2626', borderColor: '#DC2626', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
                  onClick={handleConfirmDecline}
                  disabled={isSubmittingDecline || (declineReason === 'อื่นๆ (ระบุเพิ่มเติม)' && !customDeclineReason.trim())}
                >
                  {isSubmittingDecline ? <Loader size={18} className="spin" /> : (match?.status === 'approved' ? 'ยืนยันยกเลิกคำขอ' : 'ยืนยันปฏิเสธคำขอ')}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Approve Adoption Modal */}
      <AnimatePresence>
        {showApproveModal && (
          <motion.div 
            className="modal-overlay" 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            onClick={() => !isSubmittingApprove && setShowApproveModal(false)} 
            style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)', zIndex: 1100, display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '16px' }}
          >
            <motion.div 
              className="modal-content" 
              initial={{ opacity: 0, scale: 0.96, y: 12 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 8 }}
              transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
              onClick={e => e.stopPropagation()} 
              style={{ background: 'white', padding: '24px', borderRadius: '20px', width: '100%', maxWidth: '420px', boxShadow: '0 20px 48px rgba(0,0,0,0.12)', textAlign: 'center' }}
            >
              <div style={{ width: '52px', height: '52px', borderRadius: '50%', background: '#D1FAE5', color: '#059669', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
                <CheckCircle size={28} />
              </div>

              <h3 style={{ margin: '0 0 8px', fontSize: '1.2rem', color: '#111827', fontWeight: 700 }}>
                ยืนยันการอนุมัติคำขอรับเลี้ยง
              </h3>
              <p style={{ margin: '0 0 16px', fontSize: '0.88rem', color: '#4B5563', lineHeight: 1.5 }}>
                คุณต้องการอนุมัติให้ <strong>{adopterName}</strong> รับเลี้ยง <strong>{animal?.name || 'สัตว์เลี้ยง'}</strong> ใช่หรือไม่?
              </p>

              <div style={{ backgroundColor: '#F0FDF4', border: '1px solid #BBF7D0', borderRadius: '12px', padding: '12px', textAlign: 'left', marginBottom: '20px', fontSize: '0.8rem', color: '#166534', lineHeight: 1.5 }}>
                <div style={{ fontWeight: 700, marginBottom: '2px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <Info size={14} /> สิ่งที่จะเกิดขึ้นหลังการอนุมัติ:
                </div>
                • สถานะคำขอจะเปลี่ยนเป็น "อนุมัติแล้ว"<br />
                • ระบบจะส่งข้อความแจ้งผลเข้าห้องแชทอัตโนมัติ<br />
                • สามารถเริ่มพูดคุยและนัดหมายวันส่งมอบได้ทันที
              </div>

              <div style={{ display: 'flex', gap: '10px' }}>
                <button 
                  type="button" 
                  className="btn btn-outline" 
                  style={{ flex: 1, padding: '10px', borderRadius: '10px', fontWeight: 600 }} 
                  onClick={() => setShowApproveModal(false)}
                  disabled={isSubmittingApprove}
                >
                  ยกเลิก
                </button>
                <button 
                  type="button" 
                  className="btn btn-primary" 
                  style={{ flex: 1.2, padding: '10px', borderRadius: '10px', fontWeight: 600, backgroundColor: '#059669', borderColor: '#059669', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
                  onClick={handleConfirmApprove}
                  disabled={isSubmittingApprove}
                >
                  {isSubmittingApprove ? <Loader size={18} className="spin" /> : <>ยืนยันอนุมัติ</>}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Handover Confirmation Modal */}
      <AnimatePresence>
        {showHandoverModal && (
          <motion.div 
            className="modal-overlay" 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            onClick={() => setShowHandoverModal(false)} 
            style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)', zIndex: 1000, display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '16px' }}
          >
            <motion.div 
              className="modal-content" 
              initial={{ opacity: 0, scale: 0.95, y: 16 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 12 }}
              transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
              onClick={e => e.stopPropagation()} 
              style={{ background: 'white', padding: '24px', borderRadius: '20px', width: '100%', maxWidth: '440px', boxShadow: '0 20px 48px rgba(0,0,0,0.14)' }}
            >
              <div style={{ width: '52px', height: '52px', borderRadius: '50%', background: '#DCFCE7', color: '#15803D', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
                <CheckCircle2 size={28} />
              </div>

              <h3 style={{ margin: '0 0 8px', fontSize: '1.2rem', color: '#111827', fontWeight: 700, textAlign: 'center' }}>
                ยืนยันการส่งมอบสัตว์เลี้ยง
              </h3>
              <p style={{ margin: '0 0 16px', fontSize: '0.88rem', color: '#4B5563', lineHeight: 1.5, textAlign: 'center' }}>
                ยืนยันว่า <strong>{adopterName}</strong> ได้รับตัว <strong>{animal?.name || 'สัตว์เลี้ยง'}</strong> ไปดูแลเรียบร้อยแล้ว
              </p>

              <div style={{ backgroundColor: '#F0FDF4', border: '1px solid #BBF7D0', borderRadius: '12px', padding: '12px', marginBottom: '16px', fontSize: '0.8rem', color: '#166534', lineHeight: 1.5 }}>
                <div style={{ fontWeight: 700, marginBottom: '2px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <Info size={14} /> สิ่งที่จะเกิดขึ้นหลังยืนยันการส่งมอบ:
                </div>
                • สถานะสัตว์เลี้ยงจะเปลี่ยนเป็น "ได้บ้านแล้ว"<br />
                • ระบบจะเริ่มกำหนดการติดตามสถานะสุขภาวะทุก 2 เดือนโดยอัตโนมัติ<br />
                • ผู้รับเลี้ยงและมูลนิธิสามารถตรวจสอบประวัติและส่งอัปเดตได้ตลอดเวลา
              </div>

              <div style={{ marginBottom: '14px', textAlign: 'left' }}>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: '#374151', marginBottom: '4px' }}>
                  วันที่ส่งมอบสัตว์เลี้ยง
                </label>
                <input
                  type="date"
                  value={handoverDate}
                  onChange={e => setHandoverDate(e.target.value)}
                  style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #D1D5DB', fontSize: '0.88rem', boxSizing: 'border-box', outline: 'none' }}
                />
              </div>

              <div style={{ marginBottom: '20px', textAlign: 'left' }}>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: '#374151', marginBottom: '4px' }}>
                  บันทึกเพิ่มเติม (ถ้ามี)
                </label>
                <textarea
                  value={handoverNotes}
                  onChange={e => setHandoverNotes(e.target.value)}
                  placeholder="เช่น มอบสมุดวัคซีนเรียบร้อยแล้ว นัดหมายสอบถามอีกครั้งใน 2 เดือน..."
                  style={{ width: '100%', height: '60px', padding: '8px 12px', borderRadius: '8px', border: '1px solid #D1D5DB', fontSize: '0.82rem', boxSizing: 'border-box', outline: 'none', resize: 'none', fontFamily: 'inherit' }}
                />
              </div>

              <div style={{ display: 'flex', gap: '10px' }}>
                <button 
                  type="button" 
                  className="btn btn-outline" 
                  style={{ flex: 1, padding: '10px', borderRadius: '10px', fontWeight: 600 }} 
                  onClick={() => setShowHandoverModal(false)}
                  disabled={isSubmittingHandover}
                >
                  ยกเลิก
                </button>
                <button 
                  type="button" 
                  style={{ flex: 1.3, padding: '10px', borderRadius: '10px', fontWeight: 700, backgroundColor: '#15803D', border: 'none', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', cursor: isSubmittingHandover ? 'not-allowed' : 'pointer' }}
                  onClick={handleConfirmHandover}
                  disabled={isSubmittingHandover}
                >
                  {isSubmittingHandover ? <Loader size={18} className="spin" /> : <><Check size={16} /> ยืนยันการส่งมอบ</>}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Messages */}
      {/* Messages */}
      <div className="chat-messages" style={{ padding: '24px 24px' }}>
        {messages.length === 0 && (
          <div className="chat-empty-state">
            <p>เริ่มบทสนทนากับผู้สนใจรับเลี้ยง</p>
          </div>
        )}

        {/* Date Separator */}
        {messages.length > 0 && (
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '24px' }}>
            <span style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--gray-200)', color: 'var(--text-medium)', fontSize: '0.75rem', padding: '4px 12px', borderRadius: '9999px' }}>
              วันนี้
            </span>
          </div>
        )}
        
        {messages.map((msg) => (
          <FoundationMessageItem
            key={msg.id}
            msg={msg}
            isMe={msg.sender === 'shelter'}
            adopterPic={adopterAvatar}
            setAdopterImgErr={setAdopterImgErr}
            handleOpenUserModal={handleOpenUserModal}
          />
        ))}
        <div ref={messagesEndRef} />
        {isSending && (
          <div className="message-row msg-user" style={{ marginBottom: '16px' }}>
            <div className="message-wrapper msg-user">
              <div className="message-bubble" style={{ opacity: 0.7 }}>
                กำลังส่ง...
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Input Form */}
      <div style={{ position: 'relative', padding: '16px', borderTop: '1px solid var(--gray-200)', backgroundColor: 'white' }}>
        {showAttachMenu && (
          <div style={{ position: 'absolute', bottom: '100%', left: '16px', marginBottom: '8px', background: 'white', borderRadius: '16px', boxShadow: 'var(--shadow-lg)', padding: '16px', display: 'flex', gap: '20px', zIndex: 100, border: '1px solid var(--gray-100)' }}>

            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', cursor: 'pointer' }} onClick={() => docInputRef.current?.click()}>
              <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: 'var(--success-light)', color: 'var(--success)', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                <FileText size={24} />
              </div>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-dark)', fontWeight: 500 }}>เอกสาร</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', cursor: 'pointer' }} onClick={handleShareLocation}>
              <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: '#e0f2fe', color: '#0284c7', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                <MapPin size={24} />
              </div>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-dark)', fontWeight: 500 }}>ตำแหน่ง</span>
            </div>
          </div>
        )}
        
        {imagePreview && (
          <div style={{ position: 'absolute', bottom: '100%', left: '16px', marginBottom: '8px', backgroundColor: 'white', padding: '8px', borderRadius: '12px', boxShadow: '0 -4px 16px rgba(0,0,0,0.1)', display: 'flex', alignItems: 'center' }}>
            <img src={imagePreview} alt="preview" style={{ height: '80px', borderRadius: '8px' }} />
            <button type="button" onClick={removeImage} style={{ position: 'absolute', top: '0', right: '0', background: 'var(--danger)', color: 'white', border: 'none', borderRadius: '50%', width: '24px', height: '24px', cursor: 'pointer', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
              <X size={14} />
            </button>
          </div>
        )}
        <form className="chat-input-area" onSubmit={handleSend} style={{ display: 'flex', alignItems: 'center', gap: '12px', margin: 0, padding: '8px', backgroundColor: 'var(--surface-container-low, #fff8f6)', border: '1px solid var(--gray-200)', borderRadius: '9999px' }}>
          <button type="button" onClick={() => setShowAttachMenu(!showAttachMenu)} style={{ background: 'none', border: 'none', padding: '8px', cursor: 'pointer', color: 'var(--text-medium)', transition: 'transform 0.2s', transform: showAttachMenu ? 'rotate(45deg)' : 'rotate(0)' }}>
            <PlusCircle size={24} />
          </button>
          <button type="button" onClick={() => fileInputRef.current?.click()} style={{ background: 'none', border: 'none', padding: '8px', cursor: 'pointer', color: 'var(--text-medium)' }}>
            <ImageIcon size={24} />
          </button>
          <input type="file" accept="image/*" ref={fileInputRef} onChange={handleImageSelect} style={{ display: 'none' }} />
          <input type="file" accept=".pdf,.doc,.docx,image/*" ref={docInputRef} onChange={handleDocSelect} style={{ display: 'none' }} />
          
          <input 
            type="text" 
            placeholder="พิมพ์ข้อความตอบกลับ..."
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            disabled={isSending}
            style={{ flex: 1, padding: '8px', backgroundColor: 'transparent', border: 'none', outline: 'none', color: 'var(--text-dark)' }}
          />
          <button 
            type="submit" 
            className="send-btn"
            disabled={(!inputText.trim() && !imageFile) || isSending}
            style={{ background: 'var(--primary)', color: 'white', border: 'none', borderRadius: '50%', width: '40px', height: '40px', display: 'flex', justifyContent: 'center', alignItems: 'center', cursor: 'pointer', boxShadow: '0 2px 8px rgba(249,168,38,0.25)' }}
          >
            {isSending ? <Loader className="spin" size={20} /> : <Send size={20} />}
          </button>
        </form>
      </div>
    </div>
  );
}

export default FoundationChatRoom;
