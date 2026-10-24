// Foundation side of one adoption chat: who is asking for which animal, their answers,
// one clear next step for the request's stage, then the conversation.
import React, { useState, useEffect, useRef, useMemo, useCallback, memo } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import {
  AlertTriangle, Building2, CalendarCheck, Check, CheckCircle2, ChevronDown, ChevronLeft, Clock, FileText,
  Flag, Heart, Image as ImageIcon, Info, Loader, MapPin, MoreVertical, Navigation, PawPrint, Phone,
  PlusCircle, Send, ShieldCheck, X, XCircle,
} from 'lucide-react';
import { api } from '../services/api';
import { supabase } from '../services/supabaseClient';
import { useAuth } from '../context/AuthContext';
import { ChatRoomSkeleton } from '../components/Skeletons';
import { Button, Dialog, useToast } from '../components/ui';
import { initialsAvatar } from '../lib/avatar';
import { readAssessment } from '../lib/assessment';
import { useI18n } from '../i18n';
import { Answers, MessageItem, dayLabel } from '../components/chat/ChatParts';
import './FoundationChatRoom.css';

// Reasons are sent to the adopter in Thai (the chat notice template is Thai); labels follow the app language
const DECLINE_REASONS = [
  { id: 'criteria', th: 'พูดคุยแล้วเงื่อนไขหรือความพร้อมไม่ตรงตามเกณฑ์ของมูลนิธิ' },
  { id: 'withdrew', th: 'ผู้ขอรับเลี้ยงแจ้งขอยกเลิกหรือไม่สะดวกรับเลี้ยงแล้ว' },
  { id: 'noContact', th: 'ไม่สามารถติดต่อผู้ขอรับเลี้ยงได้ / ขาดการติดต่อ' },
  { id: 'home', th: 'ที่อยู่อาศัยหรือสภาพแวดล้อมยังไม่เหมาะสมกับสัตว์ตัวนี้' },
  { id: 'taken', th: 'มีผู้ขอรับเลี้ยงสัตว์ตัวนี้ไปแล้ว หรือมีคิวรับเลี้ยงก่อนหน้า' },
  { id: 'other', th: null },
];

// Global in-memory cache for instant room switching
const foundationChatCache = new Map();

function FoundationChatRoom() {
  const { matchId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { t, lang } = useI18n();
  const toast = useToast();

  const initialCache = useMemo(() => (matchId ? foundationChatCache.get(matchId) : null), [matchId]);

  const [messages, setMessages] = useState(() => initialCache?.messages || []);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(() => !initialCache);
  const [animal, setAnimal] = useState(() => initialCache?.animal || null);
  const [match, setMatch] = useState(() => initialCache?.match || null);
  const [isSending, setIsSending] = useState(false);
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const fileInputRef = useRef(null);
  const messagesEndRef = useRef(null);
  const [adopterImgErr, setAdopterImgErr] = useState(false);

  // Answers open by default on wide screens, folded on phones so the chat keeps its room
  const [showAnswers, setShowAnswers] = useState(() => typeof window !== 'undefined' && Boolean(window.matchMedia?.('(min-width: 768px)').matches));

  // Handover
  const [showHandoverModal, setShowHandoverModal] = useState(false);
  const [handoverDate, setHandoverDate] = useState(new Date().toISOString().split('T')[0]);
  const [handoverNotes, setHandoverNotes] = useState('');
  const [isSubmittingHandover, setIsSubmittingHandover] = useState(false);

  // Dialogs and menus
  const [showUserModal, setShowUserModal] = useState(false);
  const [showAttachMenu, setShowAttachMenu] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [showBlockModal, setShowBlockModal] = useState(false);
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const moreRef = useRef(null);
  const attachRef = useRef(null);
  const [reportReason, setReportReason] = useState('');
  const [reportImagePreview, setReportImagePreview] = useState(null);
  const [isSubmittingReport, setIsSubmittingReport] = useState(false);
  const reportImageInputRef = useRef(null);
  const docInputRef = useRef(null);

  // Approve / decline
  const [showDeclineModal, setShowDeclineModal] = useState(false);
  const [showApproveModal, setShowApproveModal] = useState(false);
  const [declineReason, setDeclineReason] = useState('criteria');
  const [customDeclineReason, setCustomDeclineReason] = useState('');
  const [sendDeclineMessage, setSendDeclineMessage] = useState(true);
  const [isSubmittingDecline, setIsSubmittingDecline] = useState(false);
  const [isSubmittingApprove, setIsSubmittingApprove] = useState(false);

  useEffect(() => { setAdopterImgErr(false); }, [matchId, match?.user_id]);

  // Close the ⋯ menu and the attach menu on an outside tap or Escape
  useEffect(() => {
    if (!showMoreMenu && !showAttachMenu) return undefined;
    const close = (e) => {
      if (showMoreMenu && !moreRef.current?.contains(e.target)) setShowMoreMenu(false);
      if (showAttachMenu && !attachRef.current?.contains(e.target)) setShowAttachMenu(false);
    };
    const esc = (e) => { if (e.key === 'Escape') { setShowMoreMenu(false); setShowAttachMenu(false); } };
    document.addEventListener('pointerdown', close);
    document.addEventListener('keydown', esc);
    return () => { document.removeEventListener('pointerdown', close); document.removeEventListener('keydown', esc); };
  }, [showMoreMenu, showAttachMenu]);

  // Keep cache updated whenever state changes
  useEffect(() => {
    if (matchId && (match || messages.length > 0)) {
      const prevCached = foundationChatCache.get(matchId) || {};
      foundationChatCache.set(matchId, {
        ...prevCached,
        match: match || prevCached.match,
        animal: animal || prevCached.animal,
        messages: messages.length > 0 ? messages : prevCached.messages || [],
      });
    }
  }, [matchId, messages, match, animal]);

  // Load chat history & match info
  useEffect(() => {
    let isMounted = true;

    if (foundationChatCache.has(matchId)) {
      const cached = foundationChatCache.get(matchId);
      if (cached.match) setMatch(cached.match);
      if (cached.animal) setAnimal(cached.animal);
      if (cached.messages) setMessages(cached.messages);
      setLoading(false);
    } else {
      setLoading(true);
    }

    const loadChat = async () => {
      try {
        let currentMatch = null;

        if (user?.id) {
          const foundationMatches = await api.getFoundationMatches(user.id);
          currentMatch = foundationMatches?.find((m) => m.id === matchId) || null;
        }

        // Direct fetch fallback if not found in list
        if (!currentMatch && matchId && supabase) {
          try {
            const { data: directMatch, error: dmErr } = await supabase
              .from('matches')
              .select('*, animal:animals(*)')
              .eq('id', matchId)
              .maybeSingle();
            if (!dmErr && directMatch) {
              currentMatch = {
                ...directMatch,
                animalId: directMatch.animal_id,
                animal: directMatch.animal,
                lastMessage: directMatch.last_message,
              };
            }
          } catch (dErr) {
            console.warn('Could not fetch match directly:', dErr);
          }
        }

        if (!isMounted) return;

        if (currentMatch) {
          if (!currentMatch.userData?.avatar_url && currentMatch.user_id && supabase) {
            try {
              const { data: prof } = await supabase
                .from('profiles')
                .select('id, full_name, phone, avatar_url')
                .eq('id', currentMatch.user_id)
                .maybeSingle();
              if (prof && isMounted) {
                currentMatch.userData = {
                  ...(currentMatch.userData || {}),
                  full_name: prof.full_name || currentMatch.userData?.full_name,
                  phone: prof.phone || currentMatch.userData?.phone,
                  avatar_url: prof.avatar_url,
                };
              }
            } catch (pErr) {
              console.warn('Could not fetch profile in loadChat:', pErr);
            }
          }

          if (!currentMatch.userData || !currentMatch.userData.assessment) {
            try {
              const uData = await api.getUserVerification(currentMatch.user_id);
              if (uData && isMounted) currentMatch.userData = { ...(currentMatch.userData || {}), ...uData };
            } catch (e) {
              console.warn('Could not fetch user verification in loadChat:', e);
            }
          }

          if (isMounted) {
            setMatch(currentMatch);
            if (currentMatch.animal) {
              setAnimal(currentMatch.animal);
            } else if (currentMatch.animalId) {
              try {
                const animalData = await api.getAnimalById(currentMatch.animalId);
                if (isMounted) setAnimal(animalData);
              } catch (aErr) {
                console.warn('Could not load animal in loadChat:', aErr);
              }
            }
          }
        }

        try {
          const chatHistory = await api.getMessages(matchId);
          if (isMounted) setMessages(chatHistory || []);
        } catch (mErr) {
          console.error('Could not fetch messages in loadChat:', mErr);
        }

        if (matchId && user?.id) api.markMatchAsRead(matchId, 'shelter', user.id);
      } catch (error) {
        console.error('Failed to load chat data', error);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    loadChat();
    return () => { isMounted = false; };
  }, [matchId, user?.id]);

  // Incoming messages arrive live
  useEffect(() => {
    if (!matchId || !supabase) return undefined;
    const channel = supabase
      .channel(`foundation_chat_messages_${matchId}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: `match_id=eq.${matchId}` }, (payload) => {
        const newMsg = payload.new;
        setMessages((prev) => {
          if (prev.some((m) => m.id === newMsg.id)) return prev;
          const filtered = prev.filter((m) => !(String(m.id).startsWith('temp_') && m.sender === newMsg.sender && m.text === newMsg.text));
          return [...filtered, {
            ...newMsg,
            imageUrl: newMsg.image_url,
            timestamp: new Date(newMsg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          }];
        });
        if (newMsg.sender === 'user' && user?.id) api.markMatchAsRead(matchId, 'shelter', user.id);
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [matchId, user?.id]);

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
      setMessages((prev) => [...prev, {
        id: tempId,
        sender: 'shelter',
        text: textToSend,
        imageUrl,
        created_at: new Date().toISOString(),
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      }]);

      const sent = await api.sendMessage(matchId, textToSend, 'shelter', imageUrl);
      if (sent && sent.id) {
        setMessages((prev) => prev.map((m) => (m.id === tempId ? { ...sent, imageUrl: sent.image_url || sent.imageUrl } : m)));
      }

      if (user?.id) {
        try {
          const readChats = JSON.parse(localStorage.getItem(`read_chats_foundation_${user.id}`) || '{}');
          readChats[matchId] = Date.now();
          localStorage.setItem(`read_chats_foundation_${user.id}`, JSON.stringify(readChats));
          window.dispatchEvent(new Event('chatReadUpdated'));
        } catch (err) { /* storage blocked */ }
      }
    } catch (error) {
      console.error('Failed to send message', error);
      setInputText(textToSend);
      toast(t('fcr.sendFail'), { tone: 'error' });
    } finally {
      setIsSending(false);
    }
  };

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
      toast(t('fcr.report.sent'), { tone: 'success' });
      setShowBlockModal(true);
    } catch (error) {
      console.error(error);
      toast(t('fcr.report.fail'), { tone: 'error' });
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
      toast(t('fcr.block.fail'), { tone: 'error' });
    }
  };

  const handleApprove = () => setShowApproveModal(true);
  const handleDecline = () => setShowDeclineModal(true);

  const handleConfirmDecline = async () => {
    setIsSubmittingDecline(true);
    try {
      const reason = DECLINE_REASONS.find((r) => r.id === declineReason) || DECLINE_REASONS[0];
      const finalReason = reason.id === 'other'
        ? (customDeclineReason.trim() || 'เหตุผลอื่นๆ ตามความเหมาะสมของมูลนิธิ')
        : reason.th;
      const isPreviouslyApproved = match?.status === 'approved';

      await api.updateMatchStatus(matchId, 'rejected');
      setMatch((prev) => ({ ...prev, status: 'rejected' }));
      // Declining one person never changes the animal's status (it used to reset it to
      // 'available', which put adopted or hidden animals back in the swipe feed).

      if (sendDeclineMessage) {
        const petName = animal?.name || 'สัตว์เลี้ยง';
        const declineMsgText = isPreviouslyApproved
          ? `[แจ้งขอยกเลิกคำขอรับเลี้ยง]\n━━━━━━━━━━━━━━━━━━\nทางมูลนิธิขอแจ้งยกเลิกคำขอรับเลี้ยง ${petName}\n\nจากการพูดคุยรายละเอียดเพิ่มเติม ทางมูลนิธิต้องขออภัยที่ไม่สามารถดำเนินการส่งมอบสัตว์เลี้ยงต่อได้ในครั้งนี้\n\nเหตุผล: ${finalReason}\n━━━━━━━━━━━━━━━━━━\nขอขอบคุณในความเมตตาที่มีต่อน้องๆ ท่านสามารถติดตามและเลือกดูสัตว์ตัวอื่นๆ ในระบบได้เสมอครับ/ค่ะ`
          : `[แจ้งผลการพิจารณาคำขอรับเลี้ยง]\n━━━━━━━━━━━━━━━━━━\nทางมูลนิธิขอขอบคุณที่ให้ความสนใจรับเลี้ยง ${petName}\n\nจากการพิจารณาข้อมูลและแบบประเมินความพร้อม ทางมูลนิธิขออภัยที่ไม่สามารถอนุมัติคำขอรับเลี้ยงในครั้งนี้ได้\n\nเหตุผล: ${finalReason}\n━━━━━━━━━━━━━━━━━━\nขอขอบคุณในความเมตตาที่มีต่อน้องๆ ท่านสามารถติดตามและเลือกดูสัตว์ตัวอื่นๆ ในระบบได้เสมอครับ/ค่ะ`;
        await api.sendMessage(matchId, declineMsgText, 'shelter');
      }

      setMessages((prev) => [...prev, {
        id: `sys_${Date.now()}`,
        sender: 'system',
        text: isPreviouslyApproved ? t('fcr.sys.cancelled') : t('fcr.sys.declined'),
        created_at: new Date().toISOString(),
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      }]);
      setShowDeclineModal(false);
      setShowUserModal(false);
    } catch (error) {
      console.error('Failed to decline/cancel adoption request:', error);
      toast(t('fcr.actionFail'), { tone: 'error' });
    } finally {
      setIsSubmittingDecline(false);
    }
  };

  const handleConfirmApprove = async () => {
    setIsSubmittingApprove(true);
    try {
      await api.updateMatchStatus(matchId, 'approved');
      setMatch((prev) => ({ ...prev, status: 'approved' }));

      const petName = animal?.name || 'สัตว์เลี้ยง';
      const approveMsgText = `[แจ้งผลการพิจารณาคำขอรับเลี้ยง]\n━━━━━━━━━━━━━━━━━━\nยินดีด้วยครับ/ค่ะ! คำขอรับเลี้ยง ${petName} ของท่านได้รับการอนุมัติแล้ว\n\nเจ้าหน้าที่จะประสานงานและพูดคุยรายละเอียดขั้นตอนการส่งมอบ รวมถึงการเตรียมความพร้อมในแชทนี้ได้เลยครับ/ค่ะ\n━━━━━━━━━━━━━━━━━━`;
      await api.sendMessage(matchId, approveMsgText, 'shelter');

      setMessages((prev) => [...prev, {
        id: `sys_${Date.now()}`,
        sender: 'system',
        text: t('fcr.sys.approved'),
        created_at: new Date().toISOString(),
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      }]);
      setShowApproveModal(false);
      setShowUserModal(false);
      if (user?.id) api.markMatchAsRead(matchId, 'shelter', user.id);
    } catch (error) {
      console.error('Failed to approve adoption request:', error);
      toast(t('fcr.approveFail'), { tone: 'error' });
    } finally {
      setIsSubmittingApprove(false);
    }
  };

  const handleConfirmHandover = async () => {
    try {
      setIsSubmittingHandover(true);
      const res = await api.confirmAdoptionHandover(matchId, handoverDate, handoverNotes);
      if (user?.id) api.markMatchAsRead(matchId, 'shelter', user.id);
      setMatch((prev) => ({ ...prev, status: 'adopted', handover_date: handoverDate }));
      setAnimal((prev) => (prev ? { ...prev, status: 'adopted' } : prev));
      setShowHandoverModal(false);
      toast(res?.closedOthers ? t('fcr.handover.doneOthers', { n: res.closedOthers }) : t('fcr.handover.done'), { tone: 'success' });
      setMessages(await api.getMessages(matchId));
    } catch (err) {
      console.error('Failed to confirm handover:', err);
      toast(t('fcr.handover.fail'), { tone: 'error' });
    } finally {
      setIsSubmittingHandover(false);
    }
  };

  // Pinned centre location from the foundation profile (never a made-up point)
  const handleShareCentre = async () => {
    setShowAttachMenu(false);
    try {
      const { data } = await supabase.from('foundation_profiles').select('latitude, longitude').eq('id', user.id).maybeSingle();
      if (data?.latitude != null && data?.longitude != null) {
        await api.sendMessage(matchId, `ตำแหน่งที่ตั้งมูลนิธิ / จุดนัดหมาย:\nhttps://www.google.com/maps/search/?api=1&query=${data.latitude},${data.longitude}`, 'shelter');
        return;
      }
      toast(t('fcr.loc.noPin'), { tone: 'error' });
    } catch (err) {
      console.warn('Could not share centre location:', err);
      toast(t('fcr.loc.fail'), { tone: 'error' });
    }
  };

  const handleShareCurrent = () => {
    setShowAttachMenu(false);
    if (!navigator.geolocation) { toast(t('fcr.loc.noGps'), { tone: 'error' }); return; }
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        api.sendMessage(matchId, `แชร์ตำแหน่งที่ตั้ง / จุดนัดหมาย:\nhttps://www.google.com/maps?q=${coords.latitude},${coords.longitude}`, 'shelter');
      },
      () => toast(t('fcr.loc.gpsFail'), { tone: 'error' }),
      { timeout: 10000 },
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
        if (!error) docUrl = supabase.storage.from('chat_images').getPublicUrl(fileName).data?.publicUrl;
      }
      await api.sendMessage(matchId, `แนบเอกสาร: ${file.name}${docUrl ? `\nดาวน์โหลด/เปิดดู: ${docUrl}` : ''}`, 'shelter');
    } catch (err) {
      console.error('Failed to send document:', err);
      toast(t('fcr.sendFail'), { tone: 'error' });
    } finally {
      setIsSending(false);
      if (docInputRef.current) docInputRef.current.value = '';
    }
  };

  const formatIdCard = (id) => {
    if (!id) return '-';
    const clean = id.replace(/\D/g, '');
    return clean.length === 13 ? `${clean.slice(0, 1)}-${clean.slice(1, 5)}-${clean.slice(5, 10)}-${clean.slice(10, 12)}-${clean.slice(12)}` : id;
  };

  const handleOpenUserModal = useCallback(async () => {
    setShowUserModal(true);
    if (match?.user_id && (!match?.userData || !match?.userData?.assessment || !match?.userData?.avatar_url)) {
      try {
        const uData = await api.getUserVerification(match.user_id);
        if (uData) setMatch((prev) => ({ ...prev, userData: { ...(prev?.userData || {}), ...uData } }));
      } catch (e) {
        console.warn('Could not fetch user verification on open modal:', e);
      }
    }
  }, [match?.user_id, match?.userData]);

  const adopterName = match?.userData?.full_name || t('fcr.adopter');
  const defaultAdopterAvatar = useMemo(() => initialsAvatar(adopterName), [adopterName]);
  const adopterAvatar = (!adopterImgErr && match?.userData?.avatar_url) ? match.userData.avatar_url : defaultAdopterAvatar;
  const answers = useMemo(() => readAssessment(match?.userData?.assessment, lang), [match?.userData?.assessment, lang]);

  if (loading) return <ChatRoomSkeleton />;

  if (!match && messages.length === 0) {
    return (
      <div className="chat-room-container fcr fcr--empty">
        <span className="fcr-empty__icon" aria-hidden="true"><Info size={32} /></span>
        <h2>{t('fcr.notFound.title')}</h2>
        <p>{t('fcr.notFound.text')}</p>
        <Button onClick={() => navigate('/foundation/matches')}>{t('fcr.notFound.back')}</Button>
      </div>
    );
  }

  const status = match?.status;
  const petName = animal?.name || t('fmc.pet');
  const verified = match?.userData?.status === 'verified';
  const concerns = answers.filter((a) => a.concern && a.answer).length;
  const unanswered = answers.filter((a) => !a.answer).length;
  const answersLine = unanswered === answers.length
    ? t('fcr.ans.none')
    : [
      concerns ? t('fcr.ans.concerns', { n: concerns }) : t('fcr.ans.allReady'),
      unanswered ? t('fcr.ans.missing', { n: unanswered }) : null,
    ].filter(Boolean).join(' · ');
  const petAdoptedElsewhere = animal?.status === 'adopted' && status !== 'adopted' && status !== 'completed';

  // Day separators: one pill wherever the date changes
  let lastDay = null;

  return (
    <div className="chat-room-container fcr">
      <header className="fcr-head">
        <button type="button" className="fcr-icon-btn fcr-back chat-back-btn" onClick={() => navigate('/foundation/matches')} aria-label={t('fcr.backToList')}>
          <ChevronLeft size={22} />
        </button>
        <button type="button" className="fcr-who" onClick={handleOpenUserModal} aria-label={t('fcr.openApplicant', { name: adopterName })}>
          <img src={adopterAvatar} alt="" className="fcr-who__avatar" onError={() => setAdopterImgErr(true)} />
          <span className="fcr-who__text">
            <span className="fcr-who__name">
              {adopterName}
              {verified && <ShieldCheck size={15} className="fcr-verified" aria-label={t('fmc.verified')} />}
            </span>
            <span className="fcr-who__sub">{t('fmc.asks')} <strong>{petName}</strong></span>
          </span>
        </button>
        {animal && (
          <Link to={`/animal/${animal.id}`} className="fcr-pet" aria-label={t('fcr.viewPet', { name: petName })} title={t('fcr.viewPet', { name: petName })}>
            {animal.images?.[0] ? <img src={animal.images[0]} alt="" /> : <PawPrint size={18} aria-hidden="true" />}
          </Link>
        )}
        <div className="fcr-pop" ref={moreRef}>
          <button type="button" className="fcr-icon-btn" aria-label={t('fcr.more')} aria-haspopup="menu" aria-expanded={showMoreMenu} onClick={() => setShowMoreMenu((v) => !v)}>
            <MoreVertical size={20} />
          </button>
          {showMoreMenu && (
            <div className="fcr-menu" role="menu">
              <button type="button" role="menuitem" className="fcr-menu__item" onClick={() => { setShowMoreMenu(false); handleOpenUserModal(); }}>
                <FileText size={16} aria-hidden="true" /> {t('fcr.menu.application')}
              </button>
              {match?.userData?.phone && (
                <a role="menuitem" className="fcr-menu__item" href={`tel:${match.userData.phone}`}>
                  <Phone size={16} aria-hidden="true" /> {t('fcr.menu.call', { phone: match.userData.phone })}
                </a>
              )}
              {(status === 'approved' || status === 'pending') && (
                <button type="button" role="menuitem" className="fcr-menu__item fcr-menu__item--danger" onClick={() => { setShowMoreMenu(false); handleDecline(); }}>
                  <XCircle size={16} aria-hidden="true" /> {status === 'approved' ? t('fcr.menu.cancel') : t('fcr.menu.decline')}
                </button>
              )}
              <button type="button" role="menuitem" className="fcr-menu__item" onClick={() => { setShowMoreMenu(false); setShowReportModal(true); }}>
                <Flag size={16} aria-hidden="true" /> {t('fcr.menu.report')}
              </button>
            </div>
          )}
        </div>
      </header>

      {/* One card for where this request stands and what to do next */}
      {status === 'pending' && (
        <section className="fcr-status fcr-status--pending" aria-label={t('fcr.pending.title', { pet: petName })}>
          <div className="fcr-status__top">
            <span className="fcr-status__icon" aria-hidden="true"><Clock size={18} /></span>
            <span className="fcr-status__text">
              <strong>{t('fcr.pending.title', { pet: petName })}</strong>
              <span className={concerns ? 'is-warn' : ''}>{answersLine}</span>
            </span>
            <button type="button" className="fcr-link fcr-toggle" aria-expanded={showAnswers} onClick={() => setShowAnswers((v) => !v)}>
              {showAnswers ? t('fcr.ans.hide') : t('fcr.ans.show')} <ChevronDown size={15} aria-hidden="true" />
            </button>
          </div>
          {showAnswers && <Answers rows={answers} />}
          {petAdoptedElsewhere && <p className="fcr-status__note"><Info size={15} aria-hidden="true" /> {t('fcr.petAdopted', { pet: petName })}</p>}
          <div className="fcr-status__actions">
            <Button variant="secondary" size="sm" onClick={handleDecline}><XCircle size={16} aria-hidden="true" /> {t('fcr.decline')}</Button>
            {!petAdoptedElsewhere && <Button size="sm" onClick={handleApprove}><CheckCircle2 size={16} aria-hidden="true" /> {t('fcr.approve')}</Button>}
          </div>
        </section>
      )}

      {status === 'approved' && (
        <section className="fcr-status fcr-status--approved">
          <div className="fcr-status__top">
            <span className="fcr-status__icon" aria-hidden="true"><CalendarCheck size={18} /></span>
            <span className="fcr-status__text">
              <strong>{t('fcr.approved.title')}</strong>
              <span>{t('fcr.approved.text', { pet: petName })}</span>
            </span>
          </div>
          <div className="fcr-status__actions">
            <Button size="sm" onClick={() => setShowHandoverModal(true)}><Check size={16} aria-hidden="true" /> {t('fcr.handover')}</Button>
          </div>
        </section>
      )}

      {(status === 'adopted' || status === 'completed') && (
        <section className="fcr-status fcr-status--adopted">
          <div className="fcr-status__top">
            <span className="fcr-status__icon" aria-hidden="true"><Heart size={18} /></span>
            <span className="fcr-status__text">
              <strong>{t('fcr.adopted.title', { pet: petName })}</strong>
              <span>{t('fcr.adopted.text')}</span>
            </span>
            <Link to={`/adoption/timeline/${matchId}`} className="fcr-link">{t('fcr.adopted.timeline')}</Link>
          </div>
        </section>
      )}

      {status === 'rejected' && (
        <section className="fcr-status fcr-status--rejected">
          <div className="fcr-status__top">
            <span className="fcr-status__icon" aria-hidden="true"><XCircle size={18} /></span>
            <span className="fcr-status__text">
              <strong>{t('fcr.rejected.title')}</strong>
              {petAdoptedElsewhere && <span>{t('fcr.petAdopted', { pet: petName })}</span>}
            </span>
            {!petAdoptedElsewhere && <button type="button" className="fcr-link" onClick={handleApprove}>{t('fcr.rejected.undo')}</button>}
          </div>
        </section>
      )}

      <div className="chat-messages fcr-messages">
        {messages.length === 0 && <p className="fcr-messages__empty">{t('fcr.noMessages')}</p>}
        {messages.map((msg) => {
          const day = dayLabel(msg.created_at, t, lang);
          const showDay = day !== lastDay;
          lastDay = day;
          return (
            <React.Fragment key={msg.id}>
              {showDay && <div className="fcr-day"><span>{day}</span></div>}
              <MessageItem
                msg={msg}
                isMe={msg.sender === 'shelter'}
                otherPic={adopterAvatar}
                onPicError={() => setAdopterImgErr(true)}
                onOpenApplication={handleOpenUserModal}
              />
            </React.Fragment>
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      <div className="fcr-compose chat-input-wrapper">
        {imagePreview && (
          <div className="fcr-compose__preview">
            <img src={imagePreview} alt="" />
            <button type="button" onClick={removeImage} aria-label={t('fcr.removeImage')}><X size={14} /></button>
          </div>
        )}
        <form className="fcr-compose__bar" onSubmit={handleSend}>
          <div className="fcr-pop" ref={attachRef}>
            <button type="button" className={`fcr-icon-btn fcr-attach ${showAttachMenu ? 'is-open' : ''}`} aria-label={t('fcr.attach')} aria-haspopup="menu" aria-expanded={showAttachMenu} onClick={() => setShowAttachMenu((v) => !v)}>
              <PlusCircle size={22} />
            </button>
            {showAttachMenu && (
              <div className="fcr-menu fcr-menu--up" role="menu">
                <button type="button" role="menuitem" className="fcr-menu__item" onClick={handleShareCentre}><Building2 size={16} aria-hidden="true" /> {t('fcr.attach.centre')}</button>
                <button type="button" role="menuitem" className="fcr-menu__item" onClick={handleShareCurrent}><Navigation size={16} aria-hidden="true" /> {t('fcr.attach.current')}</button>
                <button type="button" role="menuitem" className="fcr-menu__item" onClick={() => docInputRef.current?.click()}><FileText size={16} aria-hidden="true" /> {t('fcr.attach.doc')}</button>
              </div>
            )}
          </div>
          <button type="button" className="fcr-icon-btn" aria-label={t('fcr.attach.photo')} onClick={() => fileInputRef.current?.click()}>
            <ImageIcon size={22} />
          </button>
          <input type="file" accept="image/*" ref={fileInputRef} onChange={handleImageSelect} hidden />
          <input type="file" accept=".pdf,.doc,.docx,image/*" ref={docInputRef} onChange={handleDocSelect} hidden />
          <input
            type="text"
            className="fcr-compose__input"
            placeholder={t('fcr.placeholder')}
            aria-label={t('fcr.placeholder')}
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            disabled={isSending}
          />
          <button type="submit" className="fcr-send" disabled={(!inputText.trim() && !imageFile) || isSending} aria-label={t('fcr.send')}>
            {isSending ? <Loader className="ui-spin" size={18} /> : <Send size={17} />}
          </button>
        </form>
      </div>

      {/* Applicant */}
      <Dialog open={showUserModal} onClose={() => setShowUserModal(false)} title={t('fcr.applicant.title')} className="fcr-dialog">
        <div className="fcr-person">
          <img src={adopterAvatar} alt="" onError={() => setAdopterImgErr(true)} />
          <div>
            <div className="fcr-person__name">{adopterName}</div>
            {verified
              ? <span className="fcr-badge fcr-badge--ok"><ShieldCheck size={13} aria-hidden="true" /> {t('fmc.verified')}</span>
              : <span className="fcr-badge fcr-badge--warn"><AlertTriangle size={13} aria-hidden="true" /> {t('fcr.applicant.notVerified')}</span>}
          </div>
        </div>
        <dl className="fcr-facts">
          <div><dt>{t('fcr.applicant.wants')}</dt><dd>{petName}</dd></div>
          <div><dt>{t('fcr.applicant.phone')}</dt><dd>{match?.userData?.phone ? <a href={`tel:${match.userData.phone}`}>{match.userData.phone}</a> : '-'}</dd></div>
          <div><dt>{t('fcr.applicant.id')}</dt><dd>{formatIdCard(match?.userData?.id_card_no)}</dd></div>
        </dl>
        <h3 className="fcr-subhead">{t('fcr.applicant.answers')}</h3>
        <Answers rows={answers} />
        {status === 'pending' && (
          <div className="ui-dialog__actions">
            <Button variant="secondary" onClick={() => { setShowUserModal(false); setShowDeclineModal(true); }}>{t('fcr.decline')}</Button>
            {!petAdoptedElsewhere && <Button onClick={() => { setShowUserModal(false); setShowApproveModal(true); }}>{t('fcr.approve')}</Button>}
          </div>
        )}
      </Dialog>

      {/* Approve */}
      <Dialog open={showApproveModal} onClose={() => !isSubmittingApprove && setShowApproveModal(false)} title={t('fcr.approveQ', { name: adopterName, pet: petName })}>
        {concerns > 0 && <p className="fcr-callout fcr-callout--warn"><AlertTriangle size={16} aria-hidden="true" /> {t('fcr.approveConcerns', { n: concerns })}</p>}
        <ul className="fcr-steps">
          <li>{t('fcr.approveStep1')}</li>
          <li>{t('fcr.approveStep2')}</li>
        </ul>
        <div className="ui-dialog__actions">
          <Button variant="secondary" onClick={() => setShowApproveModal(false)} disabled={isSubmittingApprove}>{t('fnd.back')}</Button>
          <Button onClick={handleConfirmApprove} loading={isSubmittingApprove}>{t('fcr.approveConfirm')}</Button>
        </div>
      </Dialog>

      {/* Decline / cancel */}
      <Dialog
        open={showDeclineModal}
        onClose={() => !isSubmittingDecline && setShowDeclineModal(false)}
        title={status === 'approved' ? t('fcr.cancelQ', { name: adopterName }) : t('fcr.declineQ', { name: adopterName })}
      >
        <fieldset className="fcr-reasons">
          <legend>{t('fcr.reason')}</legend>
          {DECLINE_REASONS.map((r) => (
            <label key={r.id} className={`fcr-reason ${declineReason === r.id ? 'is-on' : ''}`}>
              <input type="radio" name="fcr-reason" value={r.id} checked={declineReason === r.id} onChange={() => setDeclineReason(r.id)} />
              <span>{t(`fcr.reason.${r.id}`)}</span>
            </label>
          ))}
        </fieldset>
        {declineReason === 'other' && (
          <textarea
            className="fcr-textarea"
            placeholder={t('fcr.reason.otherPh')}
            aria-label={t('fcr.reason.otherPh')}
            value={customDeclineReason}
            onChange={(e) => setCustomDeclineReason(e.target.value)}
          />
        )}
        <label className="fcr-check">
          <input type="checkbox" checked={sendDeclineMessage} onChange={(e) => setSendDeclineMessage(e.target.checked)} />
          <span>{t('fcr.reason.send')}</span>
        </label>
        <div className="ui-dialog__actions">
          <Button variant="secondary" onClick={() => setShowDeclineModal(false)} disabled={isSubmittingDecline}>{t('fnd.back')}</Button>
          <Button
            variant="danger"
            onClick={handleConfirmDecline}
            loading={isSubmittingDecline}
            disabled={declineReason === 'other' && !customDeclineReason.trim()}
          >
            {status === 'approved' ? t('fcr.cancelConfirm') : t('fcr.declineConfirm')}
          </Button>
        </div>
      </Dialog>

      {/* Handover */}
      <Dialog open={showHandoverModal} onClose={() => !isSubmittingHandover && setShowHandoverModal(false)} title={t('fcr.handoverQ', { name: adopterName, pet: petName })}>
        <ul className="fcr-steps">
          <li>{t('fcr.handoverStep1', { pet: petName })}</li>
          <li>{t('fcr.handoverStep2', { pet: petName })}</li>
          <li>{t('fcr.handoverStep3')}</li>
        </ul>
        <label className="fcr-field">
          <span>{t('fcr.handoverDate')}</span>
          <input type="date" className="fcr-input" value={handoverDate} onChange={(e) => setHandoverDate(e.target.value)} />
        </label>
        <label className="fcr-field">
          <span>{t('fcr.handoverNotes')}</span>
          <textarea className="fcr-textarea" value={handoverNotes} onChange={(e) => setHandoverNotes(e.target.value)} placeholder={t('fcr.handoverNotesPh')} />
        </label>
        <div className="ui-dialog__actions">
          <Button variant="secondary" onClick={() => setShowHandoverModal(false)} disabled={isSubmittingHandover}>{t('fnd.back')}</Button>
          <Button onClick={handleConfirmHandover} loading={isSubmittingHandover}>{t('fcr.handoverConfirm')}</Button>
        </div>
      </Dialog>

      {/* Report */}
      <Dialog open={showReportModal} onClose={() => !isSubmittingReport && setShowReportModal(false)} title={t('fcr.report.title', { name: adopterName })}>
        <form onSubmit={handleReport}>
          <textarea
            className="fcr-textarea"
            placeholder={t('fcr.report.ph')}
            aria-label={t('fcr.report.ph')}
            value={reportReason}
            onChange={(e) => setReportReason(e.target.value)}
            required
          />
          <input type="file" accept="image/*" ref={reportImageInputRef} onChange={handleReportImageSelect} hidden />
          {reportImagePreview ? (
            <div className="fcr-compose__preview fcr-report-img">
              <img src={reportImagePreview} alt="" />
              <button type="button" onClick={() => setReportImagePreview(null)} aria-label={t('fcr.removeImage')}><X size={14} /></button>
            </div>
          ) : (
            <button type="button" className="fcr-link fcr-report-attach" onClick={() => reportImageInputRef.current?.click()}>
              <ImageIcon size={16} aria-hidden="true" /> {t('fcr.report.attach')}
            </button>
          )}
          <div className="ui-dialog__actions">
            <Button type="button" variant="secondary" onClick={() => setShowReportModal(false)} disabled={isSubmittingReport}>{t('fnd.back')}</Button>
            <Button type="submit" variant="danger" loading={isSubmittingReport} disabled={!reportReason.trim()}>{t('fcr.report.send')}</Button>
          </div>
        </form>
      </Dialog>

      {/* Block, offered after a report */}
      <Dialog open={showBlockModal} onClose={() => setShowBlockModal(false)} title={t('fcr.block.title')}>
        <p>{t('fcr.block.text')}</p>
        <div className="ui-dialog__actions">
          <Button variant="secondary" onClick={() => setShowBlockModal(false)}>{t('fcr.block.no')}</Button>
          <Button variant="danger" onClick={handleBlock}>{t('fcr.block.yes')}</Button>
        </div>
      </Dialog>
    </div>
  );
}

export default FoundationChatRoom;
