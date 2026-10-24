// Adopter side of one adoption chat: which animal and foundation, where the request stands,
// then the conversation. Mirrors FoundationChatRoom and shares its pieces (components/chat/ChatParts).
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import {
  Building2, CalendarCheck, ChevronLeft, Clock, FileText, Flag, Heart, Image as ImageIcon, Loader, MapPin,
  MoreVertical, Navigation, PawPrint, Phone, PlusCircle, Send, ShieldCheck, X, XCircle,
} from 'lucide-react';
import { api } from '../services/api';
import { supabase } from '../services/supabaseClient';
import { useAppContext } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';
import { ChatRoomSkeleton } from '../components/Skeletons';
import { Button, Dialog, EmptyState, LoadError, useToast } from '../components/ui';
import { initialsAvatar } from '../lib/avatar';
import { MessageItem, dayLabel } from '../components/chat/ChatParts';
import { PetScene } from '../components/motion/PetScene';
import { useI18n } from '../i18n';
import './FoundationChatRoom.css';

// Sent to the foundation in Thai (the chat notice is Thai); labels follow the app language
const CANCEL_REASONS = [
  { id: 'family', th: 'ไม่สะดวกรับเลี้ยงแล้ว / ติดปัญหาครอบครัว' },
  { id: 'home', th: 'สภาพแวดล้อมหรือที่อยู่อาศัยยังไม่พร้อม' },
  { id: 'terms', th: 'พูดคุยแล้วเงื่อนไขไม่ตรงกัน' },
  { id: 'other_pet', th: 'ต้องการเลือกดูสัตว์ตัวอื่นแทน' },
  { id: 'other', th: null },
];

const markRead = (userId, matchId) => {
  try {
    const readChats = JSON.parse(localStorage.getItem(`read_chats_${userId}`) || '{}');
    readChats[matchId] = Date.now();
    localStorage.setItem(`read_chats_${userId}`, JSON.stringify(readChats));
    window.dispatchEvent(new Event('chatReadUpdated'));
  } catch (e) { /* storage blocked */ }
};

const now = () => ({ created_at: new Date().toISOString(), timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) });

// Global in-memory cache for instant room switching
const userChatCache = new Map();

function ChatRoom() {
  const { matchId } = useParams();
  const navigate = useNavigate();
  const { matches } = useAppContext();
  const { user, profile } = useAuth();
  const { t, lang } = useI18n();
  const toast = useToast();

  const initialCache = useMemo(() => (matchId ? userChatCache.get(matchId) : null), [matchId]);

  const [messages, setMessages] = useState(() => initialCache?.messages || []);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(() => !initialCache);
  const [animal, setAnimal] = useState(() => initialCache?.animal || null);
  const [match, setMatch] = useState(() => initialCache?.match || null);
  const [foundation, setFoundation] = useState(() => initialCache?.foundation || null);
  const [isSending, setIsSending] = useState(false);
  const [petImgErr, setPetImgErr] = useState(false);
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const fileInputRef = useRef(null);
  const docInputRef = useRef(null);
  const messagesEndRef = useRef(null);

  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const [showAttachMenu, setShowAttachMenu] = useState(false);
  const moreRef = useRef(null);
  const attachRef = useRef(null);
  const [showShelterModal, setShowShelterModal] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [showBlockModal, setShowBlockModal] = useState(false);
  const [reportReason, setReportReason] = useState('');
  const [reportImagePreview, setReportImagePreview] = useState(null);
  const [isSubmittingReport, setIsSubmittingReport] = useState(false);
  const reportImageInputRef = useRef(null);

  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancelReason, setCancelReason] = useState('family');
  const [customCancelReason, setCustomCancelReason] = useState('');
  const [isSubmittingCancel, setIsSubmittingCancel] = useState(false);

  // Latest matches / user without re-running the loader when they change
  const matchesRef = useRef(matches);
  const userRef = useRef(user);
  useEffect(() => { matchesRef.current = matches; }, [matches]);
  useEffect(() => { userRef.current = user; }, [user]);

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
      const prev = userChatCache.get(matchId) || {};
      userChatCache.set(matchId, {
        ...prev,
        match: match || prev.match,
        animal: animal || prev.animal,
        foundation: foundation || prev.foundation,
        messages: messages.length > 0 ? messages : prev.messages || [],
      });
    }
  }, [matchId, messages, match, animal, foundation]);

  const [loadError, setLoadError] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  // Load once per chat
  useEffect(() => {
    let cancelled = false;
    setLoadError(false);
    if (userChatCache.has(matchId)) {
      const cached = userChatCache.get(matchId);
      if (cached.match) setMatch(cached.match);
      if (cached.animal) setAnimal(cached.animal);
      if (cached.foundation) setFoundation(cached.foundation);
      if (cached.messages) setMessages(cached.messages);
      setLoading(false);
    } else {
      setLoading(true);
    }

    (async () => {
      try {
        const currentUser = userRef.current;
        let currentMatch = matchesRef.current?.find((m) => m.id === matchId);
        if (!currentMatch && currentUser?.id) {
          const userMatches = await api.getUserMatches(currentUser.id);
          currentMatch = userMatches.find((m) => m.id === matchId);
        }
        if (cancelled) return;

        if (currentMatch) {
          setMatch(currentMatch);
          let animalData = null;
          try {
            animalData = await api.getAnimalById(currentMatch.animalId);
          } catch (animalErr) {
            console.warn('Could not load animal details in ChatRoom:', animalErr);
          }
          if (!cancelled) setAnimal(animalData || { id: currentMatch.animalId, name: null, images: [] });

          // The foundation's real details (the info window used to show a hardcoded sample foundation)
          const foundationId = animalData?.foundation_id;
          if (foundationId && supabase) {
            const { data: fp } = await supabase
              .from('foundation_profiles')
              .select('id, foundation_name, address, contact_phone, verification_status, latitude, longitude')
              .eq('id', foundationId)
              .maybeSingle();
            if (!cancelled) setFoundation(fp || { id: foundationId, foundation_name: animalData?.shelter || null });
          }

          if (currentUser?.id) {
            markRead(currentUser.id, matchId);
            api.markMatchAsRead(matchId, 'user', currentUser.id);
          }
        }

        try {
          const chatHistory = await api.getMessages(matchId);
          if (!cancelled) setMessages(chatHistory || []);
        } catch (msgErr) {
          console.error('Failed to load chat history:', msgErr);
        }
      } catch (error) {
        console.error('Failed to load chat data', error);
        if (!cancelled) setLoadError(true);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [matchId, reloadKey]);

  // Status changes (approved, handed over…) arrive live
  useEffect(() => {
    if (!matchId || !supabase) return undefined;
    const channel = supabase
      .channel(`user_chat_match_${matchId}`)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'matches', filter: `id=eq.${matchId}` }, (payload) => {
        if (payload.new) setMatch((prev) => ({ ...(prev || {}), ...payload.new, animalId: payload.new.animal_id }));
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [matchId]);

  // Incoming messages arrive live
  useEffect(() => {
    if (!matchId || !supabase) return undefined;
    const channel = supabase
      .channel(`chat_messages_${matchId}`)
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
        if (newMsg.sender === 'shelter' && userRef.current?.id) {
          markRead(userRef.current.id, matchId);
          api.markMatchAsRead(matchId, 'user', userRef.current.id);
        }
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [matchId]);

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
      return supabase.storage.from('chat_images').getPublicUrl(fileName).data.publicUrl;
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
      setMessages((prev) => [...prev, { id: tempId, sender: 'user', text: textToSend, imageUrl, ...now() }]);
      const sent = await api.sendMessage(matchId, textToSend, 'user', imageUrl);
      if (sent && sent.id) {
        setMessages((prev) => prev.map((m) => (m.id === tempId ? { ...sent, imageUrl: sent.image_url || sent.imageUrl } : m)));
      }
      if (user?.id) markRead(user.id, matchId);
    } catch (error) {
      console.error('Failed to send message', error);
      setInputText(textToSend);
      toast(t('fcr.sendFail'), { tone: 'error' });
    } finally {
      setIsSending(false);
    }
  };

  // Current position only; when it can't be found, say so (it used to send a fixed Bangkok point)
  const handleShareLocation = () => {
    setShowAttachMenu(false);
    if (!navigator.geolocation) { toast(t('fcr.loc.noGps'), { tone: 'error' }); return; }
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        api.sendMessage(matchId, `แชร์ตำแหน่งที่อยู่ของฉัน:\nhttps://www.google.com/maps?q=${coords.latitude},${coords.longitude}`, 'user');
      },
      () => toast(t('cr.locFail'), { tone: 'error' }),
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
        const fileName = `user_doc_${matchId}_${Date.now()}.${fileExt}`;
        const { error } = await supabase.storage.from('chat_images').upload(fileName, file);
        if (!error) docUrl = supabase.storage.from('chat_images').getPublicUrl(fileName).data?.publicUrl;
      }
      await api.sendMessage(matchId, `แนบเอกสาร: ${file.name}${docUrl ? `\nดาวน์โหลด/เปิดดู: ${docUrl}` : ''}`, 'user');
    } catch (err) {
      console.error('Failed to send document:', err);
      toast(t('fcr.sendFail'), { tone: 'error' });
    } finally {
      setIsSending(false);
      if (docInputRef.current) docInputRef.current.value = '';
    }
  };

  const handleConfirmCancel = async () => {
    setIsSubmittingCancel(true);
    try {
      const reason = CANCEL_REASONS.find((r) => r.id === cancelReason) || CANCEL_REASONS[0];
      const finalReason = reason.id === 'other' ? (customCancelReason.trim() || 'เหตุผลส่วนตัว') : reason.th;

      await api.updateMatchStatus(matchId, 'rejected');
      setMatch((prev) => ({ ...prev, status: 'rejected' }));
      // The animal's status is the foundation's to change (this used to try resetting it to 'available')

      await api.sendMessage(matchId, `[ผู้ขอรับเลี้ยงแจ้งขอยกเลิกคำขอ]\n━━━━━━━━━━━━━━━━━━\nขออภัยทางมูลนิธิที่ไม่สามารถรับเลี้ยง ${animal?.name || 'น้อง'} ได้ในครั้งนี้\n\nเหตุผล: ${finalReason}\n━━━━━━━━━━━━━━━━━━\nขอบพระคุณมูลนิธิที่ให้คำแนะนำเป็นอย่างดีครับ/ค่ะ`, 'user');

      setMessages((prev) => [...prev, { id: `sys_${Date.now()}`, sender: 'system', text: t('cr.sys.cancelled'), ...now() }]);
      setShowCancelModal(false);
    } catch (err) {
      console.error('Error cancelling adoption:', err);
      toast(t('cr.cancelFail'), { tone: 'error' });
    } finally {
      setIsSubmittingCancel(false);
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
      await api.reportUser(profile?.id, animal?.foundation_id, reportReason, reportImagePreview);
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
      await api.blockUser(profile?.id, animal?.foundation_id);
      navigate('/matches');
    } catch (error) {
      console.error(error);
      toast(t('fcr.block.fail'), { tone: 'error' });
    }
  };

  const foundationName = foundation?.foundation_name || animal?.shelter || t('cr.foundation');
  const foundationAvatar = useMemo(() => initialsAvatar(foundationName), [foundationName]);

  if (loading) return <ChatRoomSkeleton />;

  if (!match && messages.length === 0 && loadError) {
    return (
      <div className="chat-room-container fcr fcr--empty">
        <LoadError onRetry={() => { setLoading(true); setReloadKey((k) => k + 1); }} />
      </div>
    );
  }

  if (!match && messages.length === 0) {
    return (
      <div className="chat-room-container fcr fcr--empty">
        <EmptyState
          art={<PetScene variant="search" />}
          title={t('fcr.notFound.title')}
          text={t('cr.notFound.text')}
          action={<Button onClick={() => navigate('/matches')}>{t('fcr.notFound.back')}</Button>}
        />
      </div>
    );
  }

  const status = match?.status;
  const petName = animal?.name || t('fmc.pet');
  const verified = foundation?.verification_status === 'approved';
  const canCancel = status === 'pending' || status === 'approved';
  const mapsUrl = foundation?.latitude != null && foundation?.longitude != null
    ? `https://www.google.com/maps/dir/?api=1&destination=${foundation.latitude},${foundation.longitude}`
    : foundation?.address ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(foundation.address)}` : null;
  let lastDay = null;

  return (
    <div className="chat-room-container fcr">
      <header className="fcr-head">
        <button type="button" className="fcr-icon-btn fcr-back chat-back-btn" onClick={() => navigate('/matches')} aria-label={t('fcr.backToList')}>
          <ChevronLeft size={22} />
        </button>
        {animal?.id ? (
          <Link to={`/animal/${animal.id}`} className="fcr-who" aria-label={t('fcr.viewPet', { name: petName })}>
            <span className="fcr-pet fcr-pet--round">
              {animal.images?.[0] && !petImgErr ? <img src={animal.images[0]} alt="" onError={() => setPetImgErr(true)} /> : <PawPrint size={18} aria-hidden="true" />}
            </span>
            <span className="fcr-who__text">
              <span className="fcr-who__name">{petName}</span>
              <span className="fcr-who__sub fcr-who__sub--row"><span>{foundationName}</span>{verified && <ShieldCheck size={13} className="fcr-verified" aria-label={t('cr.verifiedFoundation')} />}</span>
            </span>
          </Link>
        ) : <span className="fcr-who" />}
        <div className="fcr-pop" ref={moreRef}>
          <button type="button" className="fcr-icon-btn" aria-label={t('fcr.more')} aria-haspopup="menu" aria-expanded={showMoreMenu} onClick={() => setShowMoreMenu((v) => !v)}>
            <MoreVertical size={20} />
          </button>
          {showMoreMenu && (
            <div className="fcr-menu" role="menu">
              <button type="button" role="menuitem" className="fcr-menu__item" onClick={() => { setShowMoreMenu(false); setShowShelterModal(true); }}>
                <Building2 size={16} aria-hidden="true" /> {t('cr.menu.foundation')}
              </button>
              {foundation?.contact_phone && (
                <a role="menuitem" className="fcr-menu__item" href={`tel:${foundation.contact_phone}`}>
                  <Phone size={16} aria-hidden="true" /> {t('fcr.menu.call', { phone: foundation.contact_phone })}
                </a>
              )}
              {canCancel && (
                <button type="button" role="menuitem" className="fcr-menu__item fcr-menu__item--danger" onClick={() => { setShowMoreMenu(false); setShowCancelModal(true); }}>
                  <XCircle size={16} aria-hidden="true" /> {t('cr.menu.cancel')}
                </button>
              )}
              <button type="button" role="menuitem" className="fcr-menu__item" onClick={() => { setShowMoreMenu(false); setShowReportModal(true); }}>
                <Flag size={16} aria-hidden="true" /> {t('cr.menu.report')}
              </button>
            </div>
          )}
        </div>
      </header>

      {/* Where the request stands, with the one thing the adopter can do next */}
      {status === 'pending' && (
        <section className="fcr-status fcr-status--pending">
          <div className="fcr-status__top">
            <span className="fcr-status__icon" aria-hidden="true"><Clock size={18} /></span>
            <span className="fcr-status__text">
              <strong>{t('cr.pending.title', { pet: petName })}</strong>
              <span>{t('cr.pending.text')}</span>
              <button type="button" className="fcr-link fcr-link--quiet fcr-link--inline" onClick={() => setShowCancelModal(true)}>{t('cr.cancelShort')}</button>
            </span>
          </div>
        </section>
      )}

      {status === 'approved' && (
        <section className="fcr-status fcr-status--approved">
          <div className="fcr-status__top">
            <span className="fcr-status__icon" aria-hidden="true"><CalendarCheck size={18} /></span>
            <span className="fcr-status__text">
              <strong>{t('cr.approved.title')}</strong>
              <span>{t('cr.approved.text', { pet: petName })}</span>
            </span>
            {mapsUrl && <a className="fcr-link" href={mapsUrl} target="_blank" rel="noopener noreferrer"><Navigation size={15} aria-hidden="true" /> {t('cr.directions')}</a>}
          </div>
        </section>
      )}

      {(status === 'adopted' || status === 'completed') && (
        <section className="fcr-status fcr-status--adopted">
          <div className="fcr-status__top">
            <span className="fcr-status__icon" aria-hidden="true"><Heart size={18} /></span>
            <span className="fcr-status__text">
              <strong>{t('cr.adopted.title', { pet: petName })}</strong>
              <span>{t('cr.adopted.text')}</span>
            </span>
          </div>
          <div className="fcr-status__actions">
            <Button size="sm" onClick={() => navigate(`/adoption/timeline/${matchId}`)}><CalendarCheck size={16} aria-hidden="true" /> {t('cr.adopted.cta')}</Button>
          </div>
        </section>
      )}

      {status === 'rejected' && (
        <section className="fcr-status fcr-status--rejected">
          <div className="fcr-status__top">
            <span className="fcr-status__icon" aria-hidden="true"><XCircle size={18} /></span>
            <span className="fcr-status__text">
              <strong>{t('cr.rejected.title')}</strong>
              <span>{t('cr.rejected.text')}</span>
            </span>
            <Link to="/" className="fcr-link">{t('cr.rejected.cta')}</Link>
          </div>
        </section>
      )}

      <div className="chat-messages fcr-messages">
        {messages.length === 0 && <p className="fcr-messages__empty">{t('cr.noMessages')}</p>}
        {messages.map((msg) => {
          const day = dayLabel(msg.created_at, t, lang);
          const showDay = day !== lastDay;
          lastDay = day;
          return (
            <React.Fragment key={msg.id}>
              {showDay && <div className="fcr-day"><span>{day}</span></div>}
              <MessageItem msg={msg} isMe={msg.sender === 'user'} otherPic={foundationAvatar} />
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
                <button type="button" role="menuitem" className="fcr-menu__item" onClick={handleShareLocation}><Navigation size={16} aria-hidden="true" /> {t('fcr.attach.current')}</button>
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

      {/* Foundation (real details; this used to be a hardcoded sample foundation) */}
      <Dialog open={showShelterModal} onClose={() => setShowShelterModal(false)} title={foundationName}>
        {verified
          ? <span className="fcr-badge fcr-badge--ok"><ShieldCheck size={13} aria-hidden="true" /> {t('cr.verifiedFoundation')}</span>
          : <span className="fcr-badge fcr-badge--warn">{t('cr.unverifiedFoundation')}</span>}
        <dl className="fcr-facts fcr-facts--single">
          <div><dt>{t('fcr.applicant.phone')}</dt><dd>{foundation?.contact_phone ? <a href={`tel:${foundation.contact_phone}`}>{foundation.contact_phone}</a> : '-'}</dd></div>
          <div><dt>{t('cr.address')}</dt><dd>{foundation?.address || '-'}</dd></div>
        </dl>
        <div className="ui-dialog__actions">
          <Button variant="secondary" onClick={() => setShowShelterModal(false)}>{t('fcr.close')}</Button>
          {mapsUrl && <a className="ui-btn ui-btn--primary" href={mapsUrl} target="_blank" rel="noopener noreferrer"><MapPin size={16} aria-hidden="true" /> {t('cr.directions')}</a>}
        </div>
      </Dialog>

      {/* Cancel */}
      <Dialog open={showCancelModal} onClose={() => !isSubmittingCancel && setShowCancelModal(false)} title={t('cr.cancelQ', { pet: petName })}>
        <fieldset className="fcr-reasons">
          <legend>{t('fcr.reason')}</legend>
          {CANCEL_REASONS.map((r) => (
            <label key={r.id} className={`fcr-reason ${cancelReason === r.id ? 'is-on' : ''}`}>
              <input type="radio" name="cr-reason" value={r.id} checked={cancelReason === r.id} onChange={() => setCancelReason(r.id)} />
              <span>{t(`cr.reason.${r.id}`)}</span>
            </label>
          ))}
        </fieldset>
        {cancelReason === 'other' && (
          <textarea className="fcr-textarea" placeholder={t('cr.reason.otherPh')} aria-label={t('cr.reason.otherPh')} value={customCancelReason} onChange={(e) => setCustomCancelReason(e.target.value)} />
        )}
        <p className="fcr-note">{t('cr.cancelNote')}</p>
        <div className="ui-dialog__actions">
          <Button variant="secondary" onClick={() => setShowCancelModal(false)} disabled={isSubmittingCancel}>{t('fnd.back')}</Button>
          <Button variant="danger" onClick={handleConfirmCancel} loading={isSubmittingCancel} disabled={cancelReason === 'other' && !customCancelReason.trim()}>{t('cr.cancelConfirm')}</Button>
        </div>
      </Dialog>

      {/* Report */}
      <Dialog open={showReportModal} onClose={() => !isSubmittingReport && setShowReportModal(false)} title={t('fcr.report.title', { name: foundationName })}>
        <form onSubmit={handleReport}>
          <textarea className="fcr-textarea" placeholder={t('fcr.report.ph')} aria-label={t('fcr.report.ph')} value={reportReason} onChange={(e) => setReportReason(e.target.value)} required />
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

      <Dialog open={showBlockModal} onClose={() => setShowBlockModal(false)} title={t('cr.block.title')}>
        <p>{t('cr.block.text')}</p>
        <div className="ui-dialog__actions">
          <Button variant="secondary" onClick={() => setShowBlockModal(false)}>{t('fcr.block.no')}</Button>
          <Button variant="danger" onClick={handleBlock}>{t('fcr.block.yes')}</Button>
        </div>
      </Dialog>
    </div>
  );
}

export default ChatRoom;
