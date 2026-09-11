import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, Send, Loader, ShieldAlert, Image as ImageIcon, X, CheckCheck } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../services/supabaseClient';
import { motion, AnimatePresence } from 'framer-motion';
import { ChatRoomSkeleton } from '../components/Skeletons';

function SupportChat() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [chatId, setChatId] = useState(null);
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [isTyping, setIsTyping] = useState(false);
  const [isAdminOnline, setIsAdminOnline] = useState(true); // Default to true (online)

  const fileInputRef = useRef(null);
  const messagesEndRef = useRef(null);
  const typingTimeoutRef = useRef(null);

  useEffect(() => {
    fetchOrCreateChat();
  }, [user]);

  // Scroll to bottom on new message or typing indicator
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  // Check Admin Online Status
  useEffect(() => {
    const checkAdminStatus = async () => {
      if (!supabase) {
        setIsAdminOnline(true);
        return;
      }
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('last_seen')
          .eq('role', 'super_admin')
          .order('last_seen', { ascending: false })
          .limit(1);

        if (error) throw error;

        if (data && data.length > 0 && data[0].last_seen) {
          const lastSeenTime = new Date(data[0].last_seen).getTime();
          const now = new Date().getTime();
          // ถ้าเห็นใน 5 นาที (300000 ms) ถือว่าออนไลน์
          setIsAdminOnline(now - lastSeenTime <= 300000);
        } else {
          setIsAdminOnline(false);
        }
      } catch (err) {
        console.error("Failed to check admin status:", err);
      }
    };

    checkAdminStatus();
    const interval = setInterval(checkAdminStatus, 60000); // Check every minute
    return () => clearInterval(interval);
  }, []);

  const fetchOrCreateChat = async () => {
    if (!user) return;
    setLoading(true);

    try {
      if (supabase) {
        // ค้นหาแชทที่มีอยู่แล้วเท่านั้น ยังไม่สร้างใหม่จนกว่า user จะส่งข้อความแรก
        let { data: chats, error: fetchError } = await supabase
          .from('support_chats')
          .select('id')
          .eq('user_id', user.id)
          .eq('status', 'open')
          .order('created_at', { ascending: false })
          .limit(1);

        if (fetchError) throw fetchError;

        if (chats && chats.length > 0) {
          const activeChatId = chats[0].id;
          setChatId(activeChatId);

          const { data: msgs, error: msgError } = await supabase
            .from('support_messages')
            .select('*')
            .eq('chat_id', activeChatId)
            .order('created_at', { ascending: true });

          if (msgError) throw msgError;

          const channel = supabase
            .channel(`support_chat_${activeChatId}`)
            .on('postgres_changes',
              { event: 'INSERT', schema: 'public', table: 'support_messages', filter: `chat_id=eq.${activeChatId}` },
              (payload) => {
                if (payload.new.sender_id !== user.id) {
                  setMessages(prev => [...prev, payload.new]);
                }
              }
            )
            .subscribe();

          setMessages(msgs || []);

          return () => {
            supabase.removeChannel(channel);
          };
        }
        // ถ้าไม่มีแชทเก่า → ไม่สร้างใหม่ รอให้ user ส่งข้อความแรกก่อน
        setMessages([]);
      } else {
        setMessages([]);
      }
    } catch (error) {
      console.error("Failed to load support chat:", error);
    } finally {
      setLoading(false);
    }
  };

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
    if (!supabase) {
      return imagePreview;
    }
    const fileExt = file.name.split('.').pop();
    const fileName = `${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;

    const { error } = await supabase.storage.from('chat_images').upload(fileName, file);
    if (error) throw error;

    const { data: publicUrlData } = supabase.storage.from('chat_images').getPublicUrl(fileName);
    return publicUrlData.publicUrl;
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

      if (supabase) {
        // ถ้ายังไม่มี chatId → สร้าง support_chat ใหม่ตอนส่งข้อความแรก
        let activeChatId = chatId;
        if (!activeChatId) {
          const { data: newChat, error: createError } = await supabase
            .from('support_chats')
            .insert([{ user_id: user.id, status: 'open' }])
            .select()
            .single();

          if (createError) throw createError;
          activeChatId = newChat.id;
          setChatId(activeChatId);

          // สมัคร Realtime channel สำหรับ chat ใหม่
          const channel = supabase
            .channel(`support_chat_${activeChatId}`)
            .on('postgres_changes',
              { event: 'INSERT', schema: 'public', table: 'support_messages', filter: `chat_id=eq.${activeChatId}` },
              (payload) => {
                if (payload.new.sender_id !== user.id) {
                  setMessages(prev => [...prev, payload.new]);
                }
              }
            )
            .subscribe();
        }

        const tempMsg = {
          id: `temp_${Date.now()}`,
          chat_id: activeChatId,
          sender_id: user.id,
          text: textToSend,
          image_url: imageUrl,
          created_at: new Date().toISOString(),
          status: 'sending'
        };
        setMessages(prev => [...prev, tempMsg]);

        const { error } = await supabase
          .from('support_messages')
          .insert([
            {
              chat_id: activeChatId,
              sender_id: user.id,
              text: textToSend || ' ',
              image_url: imageUrl
            }
          ]);

        if (error) {
          setMessages(prev => prev.filter(m => m.id !== tempMsg.id));
          throw error;
        } else {
          setMessages(prev => prev.map(m => m.id === tempMsg.id ? { ...m, status: 'sent' } : m));
        }
      }
    } catch (error) {
      console.error("Failed to send message", error);
    } finally {
      setIsSending(false);
    }
  };

  if (loading) {
    return <ChatRoomSkeleton />;
  }

  return (
    <div className="chat-room-container">
      {/* Header */}
      <div className="chat-header">
        <button className="chat-back-btn" onClick={() => navigate(-1)} aria-label="ย้อนกลับ" style={{ marginRight: '8px' }}>
          <ChevronLeft size={20} />
        </button>

        <div className="chat-partner-info" style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: '12px', flex: 1 }}>
          <div style={{ width: '40px', height: '40px', borderRadius: '50%', backgroundColor: isAdminOnline ? 'var(--success-light)' : 'var(--gray-200)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: isAdminOnline ? 'var(--success)' : 'var(--gray-500)' }}>
            <ShieldAlert size={20} />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <h2 style={{ margin: 0, fontSize: '1rem', color: 'var(--text-dark)' }}>ติดต่อผู้ดูแลระบบ</h2>
            <span style={{ fontSize: '0.8rem', color: isAdminOnline ? 'var(--success)' : 'var(--gray-500)', display: 'flex', alignItems: 'center', gap: '4px' }}>
              <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: isAdminOnline ? 'var(--success)' : 'var(--gray-400)' }}></span>
              {isAdminOnline ? 'ออนไลน์' : 'ออฟไลน์ (ทิ้งข้อความไว้ได้เลย)'}
            </span>
          </div>
        </div>
      </div>

      {/* Messages Area */}
      <div className="chat-messages-area">
        {messages.length === 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', opacity: 0.7, marginTop: '40px' }}
          >
            <div style={{ width: '80px', height: '80px', backgroundColor: 'var(--danger-light)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '16px', color: 'var(--danger)' }}>
              <ShieldAlert size={40} />
            </div>
            <p style={{ color: 'var(--text-medium)', fontWeight: 500, padding: '0 24px', textAlign: 'center', fontSize: '0.9rem', lineHeight: 1.6 }}>
              คุณสามารถสอบถามปัญหาการใช้งาน<br />หรือรายงานพฤติกรรมไม่เหมาะสมได้ที่นี่
            </p>
          </motion.div>
        )}

        <AnimatePresence>
          {messages.map((msg) => {
            const isMe = msg.sender_id === user?.id;

            return (
              <motion.div
                key={msg.id}
                initial={{ opacity: 0, y: 10, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ duration: 0.2, ease: "easeOut" }}
                className={`message-wrapper msg-${isMe ? 'user' : 'shelter'}`}
              >
                <div className="message-bubble" style={{ display: 'flex', flexDirection: 'column' }}>
                  {msg.image_url && (
                    <img src={msg.image_url} alt="attached" style={{ maxWidth: '100%', borderRadius: '12px', marginBottom: '8px' }} />
                  )}
                  {msg.text && msg.text.trim() && <div>{msg.text}</div>}
                </div>
                <span className="message-timestamp" style={{ display: 'flex', alignItems: 'center', justifyContent: isMe ? 'flex-end' : 'flex-start', gap: '4px' }}>
                  {new Date(msg.created_at).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })}
                  {isMe && msg.status === 'sent' && <CheckCheck size={12} style={{ color: 'var(--primary)' }} />}
                  {isMe && (!msg.status || msg.status === 'sending') && <CheckCheck size={12} style={{ color: 'var(--gray-300)' }} />}
                </span>
              </motion.div>
            );
          })}

          {isTyping && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="message-wrapper msg-shelter"
            >
              <div className="message-bubble" style={{ opacity: 0.7 }}>
                กำลังพิมพ์...
              </div>
            </motion.div>
          )}
        </AnimatePresence>
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div style={{ position: 'relative', borderTop: '1px solid var(--gray-200)', backgroundColor: 'white' }}>
        <AnimatePresence>
          {imagePreview && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              style={{ position: 'absolute', bottom: '100%', left: '16px', marginBottom: '8px', backgroundColor: 'white', padding: '8px', borderRadius: '12px', boxShadow: '0 -4px 16px rgba(0,0,0,0.1)', display: 'flex', alignItems: 'center' }}
            >
              <img src={imagePreview} alt="preview" style={{ height: '80px', borderRadius: '8px' }} />
              <button 
                type="button"
                onClick={removeImage} 
                style={{ position: 'absolute', top: '-8px', right: '-8px', background: 'var(--danger)', color: 'white', border: 'none', borderRadius: '50%', width: '24px', height: '24px', cursor: 'pointer', display: 'flex', justifyContent: 'center', alignItems: 'center', boxShadow: '0 2px 4px rgba(0,0,0,0.2)' }}
              >
                <X size={14} />
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        <form className="chat-input-area" onSubmit={handleSend} style={{ display: 'flex', alignItems: 'center', gap: '8px', margin: 0, padding: '12px 16px' }}>
          <button type="button" onClick={() => fileInputRef.current?.click()} style={{ background: 'none', border: 'none', padding: '8px', cursor: 'pointer', color: 'var(--primary)' }}>
            <ImageIcon size={24} />
          </button>
          <input type="file" accept="image/*" ref={fileInputRef} onChange={handleImageSelect} style={{ display: 'none' }} />
          
          <input 
            type="text" 
            placeholder="พิมพ์ข้อความถึงแอดมิน..." 
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            disabled={isSending}
            style={{ flex: 1, padding: '12px 16px', borderRadius: '24px', border: '1px solid var(--gray-200)', outline: 'none' }}
          />
          <button type="submit" className="btn-send" disabled={(!inputText.trim() && !imageFile) || isSending} style={{ background: 'var(--primary)', color: 'white', border: 'none', borderRadius: '50%', width: '40px', height: '40px', display: 'flex', justifyContent: 'center', alignItems: 'center', cursor: 'pointer' }}>
            {isSending ? <Loader className="spin" size={20} /> : <Send size={20} />}
          </button>
        </form>
      </div>
      
    </div>
  );
}

export default SupportChat;
