import React, { useEffect, useState, useRef } from 'react';
import { supabase } from '../services/supabaseClient';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { Loader, Shield, User, Search, Filter, CheckCircle, AlertCircle, AlertTriangle, X, Users, Home, XCircle, FileText, FileEdit, Clock, ChevronDown, Gift, MessageSquare, Send, ArrowLeft, Image as ImageIcon, MapPin, Phone, ExternalLink, Dog, Cat, Heart, Compass, Navigation, CheckCircle2, Eye, Lock, RotateCcw, UserCheck, ShieldCheck, Sparkles, Building2, Star, Banknote, PiggyBank, FileCheck } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const CustomDropdown = ({ value, options, onChange, style, buttonStyle }) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const selectedOption = options.find(o => o.value === value) || options[0];

  return (
    <div ref={dropdownRef} style={{ position: 'relative', width: '100%', ...style }}>
      <div 
        onClick={() => setIsOpen(!isOpen)}
        style={{
          width: '100%', padding: '12px 16px', borderRadius: '12px', border: '1px solid var(--gray-200)', 
          backgroundColor: 'var(--gray-50)', fontSize: '0.95rem', cursor: 'pointer', display: 'flex', 
          justifyContent: 'space-between', alignItems: 'center', userSelect: 'none',
          ...buttonStyle
        }}
      >
        <span style={{ color: 'var(--text-dark)' }}>{selectedOption.label}</span>
        <ChevronDown size={16} style={{ transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s', color: 'var(--text-medium)' }} />
      </div>
      
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.15 }}
            style={{
              position: 'absolute', top: '100%', left: 0, right: 0, marginTop: '8px',
              backgroundColor: 'white', borderRadius: '12px', boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
              border: '1px solid var(--gray-100)', zIndex: 50, overflow: 'hidden'
            }}
          >
            {options.map((opt) => (
              <div
                key={opt.value}
                onClick={() => { onChange(opt.value); setIsOpen(false); }}
                onMouseEnter={(e) => e.target.style.backgroundColor = 'var(--gray-50)'}
                onMouseLeave={(e) => e.target.style.backgroundColor = 'transparent'}
                style={{
                  padding: '12px 16px', cursor: 'pointer', fontSize: '0.95rem',
                  backgroundColor: value === opt.value ? 'var(--primary-light)' : 'transparent',
                  color: value === opt.value ? 'var(--primary)' : 'var(--text-dark)',
                  fontWeight: value === opt.value ? '600' : '400',
                  transition: 'background-color 0.2s', userSelect: 'none'
                }}
              >
                {opt.label}
              </div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

const AdminDashboard = () => {
  const { user: currentUser } = useAuth();
  
  const [profiles, setProfiles] = useState([]);
  const [pendingFoundations, setPendingFoundations] = useState([]);
  const [auditLogs, setAuditLogs] = useState([]);
  const [donations, setDonations] = useState([]);
  const [donationFilter, setDonationFilter] = useState('all');
  const [donationSearch, setDonationSearch] = useState('');
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);

  // Incidents state
  const [incidents, setIncidents] = useState([]);
  const [incidentFilter, setIncidentFilter] = useState('all');
  const [updatingIncidentId, setUpdatingIncidentId] = useState(null);

  // Support Chat states
  const [supportChats, setSupportChats] = useState([]);
  const [selectedSupportChat, setSelectedSupportChat] = useState(null);
  const [unreadSupportCount, setUnreadSupportCount] = useState(0);
  const activeTabRef = useRef('users'); // ref สำหรับ Realtime callback ให้อ่านค่า activeTab ล่าสุด
  const [supportMessages, setSupportMessages] = useState([]);
  const [loadingSupportMessages, setLoadingSupportMessages] = useState(false);
  const [supportInput, setSupportInput] = useState('');
  const [isSendingSupport, setIsSendingSupport] = useState(false);
  const [supportImageFile, setSupportImageFile] = useState(null);
  const [supportImagePreview, setSupportImagePreview] = useState(null);
  const supportFileInputRef = useRef(null);
  const messagesEndRef = useRef(null);
  
  // Search and Filter states
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [activeTab, setActiveTab] = useState('users'); // 'users' | 'approvals' | 'logs'
  
  // UI states for interactions
  const [toast, setToast] = useState(null);
  const [confirmModal, setConfirmModal] = useState({ isOpen: false, profile: null, newRole: null });
  const [rejectModal, setRejectModal] = useState({ isOpen: false, foundationId: null, reason: '' });
  
  // Report View states
  const [reportProofImage, setReportProofImage] = useState(null);
  const [reportChatHistoryModal, setReportChatHistoryModal] = useState({ isOpen: false, messages: [], loading: false });

  // States for viewing documents
  const [docUrls, setDocUrls] = useState({}); // { foundationId: { docType: url } }
  const [docLoading, setDocLoading] = useState({}); // { foundationId: boolean }

  useEffect(() => {
    fetchAllData();
  }, [activeTab]);

  const fetchAllData = async () => {
    setLoading(true);
    try {
      if (!supabase) throw new Error('Supabase not connected');
      
      // ดึง profiles เสมอหากยังไม่มี เพื่อให้การคำนวณ KPI stats และตัวนับถูกต้องทันที
      if (activeTab === 'users' || profiles.length === 0) {
        const { data, error } = await supabase
          .from('profiles')
          .select('*')
          .order('created_at', { ascending: false });
        if (!error && data) setProfiles(data);
      }

      // ดึงรายการคำขอมูลนิธิที่รออนุมัติ เพื่อแสดง badge บนแท็บให้ถูกต้อง
      if (activeTab !== 'approvals' && pendingFoundations.length === 0) {
        const { data: pendings } = await supabase
          .from('foundation_profiles')
          .select('id')
          .eq('verification_status', 'pending');
        if (pendings) setPendingFoundations(pendings);
      }

      // ดึงรายการแจ้งเหตุกู้ภัยเสมอ เพื่อแสดง badge และข้อมูลทันสมัย
      const incData = await api.getIncidentReports('all');
      setIncidents(incData || []);

      // ดึงจำนวน support chats ที่ยังไม่ได้อ่าน (สร้างหลังจาก admin ดูครั้งสุดท้าย)
      if (activeTab !== 'support') {
        const lastRead = localStorage.getItem('admin_support_last_read') || '1970-01-01T00:00:00Z';
        const { count: newSupportCount } = await supabase
          .from('support_chats')
          .select('*', { count: 'exact', head: true })
          .eq('status', 'open')
          .gt('updated_at', lastRead);
        setUnreadSupportCount(newSupportCount || 0);
      }
      
      if (activeTab === 'users') {
        // ดึงไปแล้วข้างต้น
      } 
      else if (activeTab === 'approvals') {
        // ดึงข้อมูล foundation ที่รอตรวจสอบ พร้อม join profile เพื่อเอาอีเมล
        const { data, error } = await supabase
          .from('foundation_profiles')
          .select(`
            *,
            profiles:profiles!foundation_profiles_id_fkey(email, full_name, avatar_url)
          `)
          .eq('verification_status', 'pending')
          .order('submitted_at', { ascending: false });
          
        if (error) throw error;
        setPendingFoundations(data || []);
      }
      else if (activeTab === 'logs') {
        const { data, error } = await supabase
          .from('admin_audit_log')
          .select(`
            *,
            admin:profiles!admin_id(full_name, email)
          `)
          .order('created_at', { ascending: false })
          .limit(50);
          
        if (error) throw error;
        setAuditLogs(data || []);
      }
      else if (activeTab === 'donations') {
        const { data, error } = await supabase
          .from('donations')
          .select(`
            *,
            profiles:user_id(full_name, email),
            foundation:foundation_id(full_name)
          `)
          .order('created_at', { ascending: false });
          
        if (error) throw error;
        setDonations(data || []);
      }
      else if (activeTab === 'support') {
        const { data, error } = await supabase
          .from('support_chats')
          .select(`
            *,
            profiles:user_id(full_name, email, avatar_url)
          `)
          .order('updated_at', { ascending: false });
          
        if (error) throw error;
        setSupportChats(data || []);
      }
      else if (activeTab === 'reports') {
        const { data, error } = await supabase
          .from('reports')
          .select(`
            *,
            reporter:profiles!reporter_id(full_name, email, avatar_url),
            reported:profiles!reported_id(full_name, email, avatar_url)
          `)
          .order('created_at', { ascending: false });
          
        if (error) throw error;
        setReports(data || []);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
      showToast(`เกิดข้อผิดพลาด: ${error.message || 'ไม่สามารถโหลดข้อมูลได้'}`, 'error');
    } finally {
      setLoading(false);
    }
  };

  // Realtime subscription for incident_reports
  useEffect(() => {
    if (!supabase) return;

    const channel = supabase
      .channel('admin_realtime_incidents')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'incident_reports' },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            setIncidents(prev => [payload.new, ...prev.filter(i => i.id !== payload.new.id)]);
            showToast('มีการแจ้งเหตุกู้ภัยสัตว์จรจัดเข้ามาใหม่!', 'error');
          } else if (payload.eventType === 'UPDATE') {
            setIncidents(prev => prev.map(i => i.id === payload.new.id ? payload.new : i));
          } else if (payload.eventType === 'DELETE') {
            setIncidents(prev => prev.filter(i => i.id !== payload.old.id));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // Realtime subscription สำหรับแจ้งเตือน support chats ใหม่
  useEffect(() => {
    if (!supabase) return;

    const supportChannel = supabase
      .channel('admin_realtime_support')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'support_chats' },
        (payload) => {
          // ถ้า admin ไม่ได้ดู tab support อยู่ → เพิ่ม badge + toast
          if (activeTabRef.current !== 'support') {
            setUnreadSupportCount(prev => prev + 1);
            showToast('มีผู้ใช้ส่งข้อความแจ้งเรื่องเข้ามาใหม่', 'error');
          }
          // เพิ่มเข้ารายการแชท
          setSupportChats(prev => {
            if (prev.some(c => c.id === payload.new.id)) return prev;
            return [payload.new, ...prev];
          });
        }
      )
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'support_messages' },
        (payload) => {
          // ข้อความใหม่จาก user (ไม่ใช่ admin เอง) + ไม่ได้ดู tab support อยู่
          if (payload.new.sender_id !== currentUser?.id && activeTabRef.current !== 'support') {
            setUnreadSupportCount(prev => prev + 1);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(supportChannel);
    };
  }, [currentUser?.id]);

  const handleUpdateIncidentStatus = async (reportId, newStatus, customRescuer = null) => {
    setUpdatingIncidentId(reportId);
    try {
      const rescuerInfo = newStatus === 'in_progress'
        ? (customRescuer || { id: currentUser?.id, name: currentUser?.user_metadata?.full_name || 'ผู้ดูแลระบบ', phone: '' })
        : newStatus === 'resolved'
        ? { name: currentUser?.user_metadata?.full_name || 'ผู้ดูแลระบบ' }
        : null;

      await api.updateIncidentStatus(reportId, newStatus, rescuerInfo);
      setIncidents(prev => prev.map(i => {
        if (i.id !== reportId) return i;
        return {
          ...i,
          status: newStatus,
          ...(newStatus === 'in_progress' ? {
            rescuer_id: rescuerInfo?.id || currentUser?.id,
            rescuer_name: rescuerInfo?.name || 'ผู้ดูแลระบบ',
            rescuer_phone: rescuerInfo?.phone || '',
            accepted_at: new Date().toISOString()
          } : newStatus === 'pending' ? {
            rescuer_id: null,
            rescuer_name: null,
            rescuer_phone: null,
            accepted_at: null
          } : newStatus === 'resolved' ? {
            resolved_at: new Date().toISOString(),
            rescuer_name: i.rescuer_name || 'ผู้ดูแลระบบ'
          } : {})
        };
      }));

      const statusLabels = {
        pending: 'ปลดล็อกเคสกลับสู่สถานะรอดำเนินการ',
        in_progress: 'อัปเดตเป็นกำลังเข้าช่วยเหลือ',
        resolved: 'บันทึกช่วยเหลือสำเร็จ',
        cancelled: 'ยกเลิกเคส'
      };
      showToast(statusLabels[newStatus] || 'อัปเดตสถานะเรียบร้อยแล้ว', 'success');
    } catch (err) {
      console.error('Failed to update status:', err);
      showToast('ไม่สามารถอัปเดตสถานะได้ กรุณาลองใหม่อีกครั้ง', 'error');
    } finally {
      setUpdatingIncidentId(null);
    }
  };

  const fetchSupportMessages = async (chatId) => {
    setSelectedSupportChat(chatId);
    setLoadingSupportMessages(true);
    try {
      if (!supabase) return;
      const { data, error } = await supabase
        .from('support_messages')
        .select('*')
        .eq('chat_id', chatId)
        .order('created_at', { ascending: true });
        
      if (error) throw error;
      setSupportMessages(data || []);
      
      // Setup realtime listener
      const channel = supabase
        .channel(`admin_chat_${chatId}`)
        .on('postgres_changes', 
          { event: 'INSERT', schema: 'public', table: 'support_messages', filter: `chat_id=eq.${chatId}` }, 
          (payload) => {
            if (payload.new.sender_id !== currentUser?.id) {
              setSupportMessages(prev => [...prev, payload.new]);
              setTimeout(() => {
                messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
              }, 100);
            }
          }
        )
        .subscribe();
        
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
        
      return () => {
        supabase.removeChannel(channel);
      };
    } catch (error) {
      console.error('Error fetching support messages:', error);
    } finally {
      setLoadingSupportMessages(false);
    }
  };

  const handleSupportImageSelect = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setSupportImageFile(file);
    const reader = new FileReader();
    reader.onloadend = () => setSupportImagePreview(reader.result);
    reader.readAsDataURL(file);
  };

  const removeSupportImage = () => {
    setSupportImageFile(null);
    setSupportImagePreview(null);
    if (supportFileInputRef.current) supportFileInputRef.current.value = '';
  };

  const uploadSupportImage = async (file) => {
    if (!supabase) return supportImagePreview;
    
    const fileExt = file.name.split('.').pop();
    const fileName = `${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
    
    const { error } = await supabase.storage.from('chat_images').upload(fileName, file);
    if (error) throw error;
    
    const { data: publicUrlData } = supabase.storage.from('chat_images').getPublicUrl(fileName);
    return publicUrlData.publicUrl;
  };

  const handleSendSupportMessage = async (e) => {
    e.preventDefault();
    if ((!supportInput.trim() && !supportImageFile) || isSendingSupport || !selectedSupportChat) return;

    const textToSend = supportInput.trim();
    setSupportInput('');
    setIsSendingSupport(true);

    try {
      let imageUrl = null;
      if (supportImageFile) {
        imageUrl = await uploadSupportImage(supportImageFile);
        removeSupportImage();
      }

      if (supabase && currentUser) {
        const tempMsg = {
          id: `temp_${Date.now()}`,
          chat_id: selectedSupportChat,
          sender_id: currentUser.id,
          text: textToSend,
          image_url: imageUrl,
          created_at: new Date().toISOString()
        };
        setSupportMessages(prev => [...prev, tempMsg]);
        
        setTimeout(() => {
          messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
        }, 100);

        const { error } = await supabase
          .from('support_messages')
          .insert([
            {
              chat_id: selectedSupportChat,
              sender_id: currentUser.id,
              text: textToSend || ' ',
              image_url: imageUrl
            }
          ]);
          
        if (error) {
          setSupportMessages(prev => prev.filter(m => m.id !== tempMsg.id));
          throw error;
        }
      }
    } catch (error) {
      console.error('Error sending message:', error);
    } finally {
      setIsSendingSupport(false);
    }
  };

  // ดึงเอกสารสำหรับ foundation ที่ต้องการ
  const fetchDocuments = async (foundationId) => {
    if (docUrls[foundationId]) return; // เคยดึงแล้ว ไม่ต้องดึงซ้ำ
    
    setDocLoading(prev => ({ ...prev, [foundationId]: true }));
    
    try {
      const { data: docs, error: docsError } = await supabase
        .from('foundation_documents')
        .select('*')
        .eq('foundation_id', foundationId);
        
      if (docsError) throw docsError;
      
      const urls = {};
      for (const doc of docs) {
        // สร้าง Signed URL 60 นาที (เพราะ Bucket เป็น Private)
        const { data: urlData, error: urlError } = await supabase.storage
          .from('foundation-docs')
          .createSignedUrl(doc.file_path, 3600);
          
        if (urlError) {
          console.error('Error creating signed url:', urlError);
        } else {
          urls[doc.doc_type] = urlData.signedUrl;
        }
      }
      
      setDocUrls(prev => ({ ...prev, [foundationId]: urls }));
    } catch (error) {
      console.error('Error fetching documents:', error);
      showToast('ไม่สามารถดึงข้อมูลเอกสารแนบได้', 'error');
    } finally {
      setDocLoading(prev => ({ ...prev, [foundationId]: false }));
    }
  };

  const handleRoleChangeRequest = (profile, newRole) => {
    if (profile.role === newRole) return;
    setConfirmModal({ isOpen: true, profile, newRole });
  };

  const confirmUpdateRole = async () => {
    const { profile, newRole } = confirmModal;
    setConfirmModal({ isOpen: false, profile: null, newRole: null });
    
    try {
      // อัปเดต role อย่างเดียวสำหรับตาราง profiles (ระบบใหม่ใช้ 'foundation' แทน 'shelter')
      const targetRole = newRole === 'shelter' ? 'foundation' : newRole;
      
      const { error } = await supabase
        .from('profiles')
        .update({ role: targetRole })
        .eq('id', profile.id);
        
      if (error) throw error;
      
      // ถ้าเปลี่ยนเป็น foundation ต้องไปสร้าง row ใน foundation_profiles ด้วยให้เป็น approved
      if (targetRole === 'foundation') {
        await supabase
          .from('foundation_profiles')
          .upsert({ 
            id: profile.id, 
            foundation_name: profile.full_name || 'ไม่ระบุ',
            verification_status: 'approved',
            reviewed_at: new Date().toISOString(),
            reviewed_by: currentUser.id
          });
      }
      
      setProfiles(profiles.map(p => p.id === profile.id ? { ...p, role: targetRole } : p));
      showToast('อัปเดตสิทธิ์สำเร็จแล้ว', 'success');
      
      logAction('UPDATE_ROLE', profile.id, { old_role: profile.role, new_role: targetRole });
    } catch (error) {
      console.error('Error updating role:', error);
      showToast('เกิดข้อผิดพลาด คุณอาจไม่มีสิทธิ์จัดการข้อมูลนี้', 'error');
    }
  };

  const handleApproveFoundation = async (foundationId) => {
    try {
      // 1. อัปเดตสถานะใน foundation_profiles
      const { error: fError } = await supabase
        .from('foundation_profiles')
        .update({ 
          verification_status: 'approved',
          reviewed_at: new Date().toISOString(),
          reviewed_by: currentUser.id
        })
        .eq('id', foundationId);
        
      if (fError) throw fError;
      
      // 2. ตรวจสอบและอัปเดต role ใน profiles ให้เป็น 'foundation' แน่ๆ
      await supabase.from('profiles').update({ role: 'foundation' }).eq('id', foundationId);
      
      // 3. อัปเดต UI
      setPendingFoundations(prev => prev.filter(f => f.id !== foundationId));
      showToast('อนุมัติมูลนิธิสำเร็จแล้ว', 'success');
      
      // 4. บันทึก Log
      logAction('APPROVE_FOUNDATION', foundationId, null);
    } catch (error) {
      console.error('Error approving foundation:', error);
      showToast('เกิดข้อผิดพลาดในการอนุมัติ', 'error');
    }
  };

  const submitRejectFoundation = async () => {
    const { foundationId, reason } = rejectModal;
    
    if (!reason.trim()) {
      showToast('กรุณาระบุเหตุผล', 'error');
      return;
    }

    try {
      const { error } = await supabase
        .from('foundation_profiles')
        .update({ 
          verification_status: 'rejected',
          rejection_reason: reason,
          reviewed_at: new Date().toISOString(),
          reviewed_by: currentUser.id
        })
        .eq('id', foundationId);
        
      if (error) throw error;
      
      setPendingFoundations(prev => prev.filter(f => f.id !== foundationId));
      setRejectModal({ isOpen: false, foundationId: null, reason: '' });
      showToast('ปฏิเสธคำขอสำเร็จแล้ว', 'success');
      
      logAction('REJECT_FOUNDATION', foundationId, { reason });
    } catch (error) {
      console.error('Error rejecting foundation:', error);
      showToast('เกิดข้อผิดพลาดในการปฏิเสธคำขอ', 'error');
    }
  };

  const logAction = async (action, targetId, detail) => {
    if (!supabase || !currentUser) return;
    try {
      await supabase.from('admin_audit_log').insert([{
        admin_id: currentUser.id,
        action,
        target_id: targetId,
        detail
      }]);
    } catch (e) {
      console.error('Failed to log action:', e);
    }
  };

  const showToast = (text, type = 'success') => {
    setToast({ text, type });
    setTimeout(() => setToast(null), 3000);
  };

  const getDocTypeName = (type) => {
    const map = {
      'registration_cert': 'ใบจดทะเบียนมูลนิธิ',
      'id_card': 'สำเนาบัตรประชาชน',
      'address_proof': 'หลักฐานที่อยู่',
      'other': 'อื่นๆ'
    };
    return map[type] || type;
  };

  // KPIs
  const totalCount = profiles.length;
  const superAdminCount = profiles.filter(p => p.role === 'super_admin').length;
  const foundationCount = profiles.filter(p => p.role === 'foundation').length;
  const userCount = profiles.filter(p => !p.role || p.role === 'user').length;

  const filteredProfiles = profiles.filter(profile => {
    const matchesSearch = 
      (profile.full_name && profile.full_name.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (profile.email && profile.email.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesRole = roleFilter === 'all' || profile.role === roleFilter;
    return matchesSearch && matchesRole;
  });

  return (
    <div className="admin-shell-container">
      <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
        
        {/* Header Area with Live Pulse & Sync Action */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2 }}
          className="admin-header-bar"
        >
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
              <h1 style={{ margin: 0, fontSize: '1.35rem', fontWeight: 700, color: 'var(--text-dark)', letterSpacing: '-0.02em' }}>
                สวัสดี, {currentUser?.user_metadata?.full_name || currentUser?.email?.split('@')[0] || 'ผู้ดูแลระบบ'}
              </h1>
              <span className="admin-badge-pulse">
                <span className="admin-pulse-dot" />
                <Shield size={13} /> ผู้ดูแลระบบ
              </span>
            </div>
            <p style={{ margin: '4px 0 0', color: 'var(--text-medium)', fontSize: '0.84rem' }}>
              ศูนย์ควบคุมและตรวจสอบระบบ 4 ขาหาบ้าน
            </p>
          </div>

          <button
            type="button"
            onClick={() => fetchAllData()}
            className="admin-refresh-btn"
            title="รีเฟรชข้อมูลทั้งหมด"
          >
            <RotateCcw size={15} className={loading ? 'spin' : ''} />
            <span>ซิงค์ข้อมูล</span>
          </button>
        </motion.div>

        {/* KPI Stats Overview (Modern Cards) */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25, delay: 0.05 }}
          className="admin-kpi-grid"
        >
          <div className="admin-kpi-card">
            <div className="admin-kpi-icon-wrap" style={{ background: '#F0F9FF' }}>
              <Users size={20} color="#0284C7" />
            </div>
            {loading && profiles.length === 0 ? (
              <div className="skeleton" style={{ width: '48px', height: '24px', borderRadius: '6px', margin: '3px 0' }} />
            ) : (
              <span className="admin-kpi-count">{totalCount}</span>
            )}
            <span className="admin-kpi-label">ผู้ใช้ทั้งหมด</span>
          </div>

          <div className="admin-kpi-card">
            <div className="admin-kpi-icon-wrap" style={{ background: '#FEF3C7' }}>
              <Building2 size={20} color="#D97706" />
            </div>
            {loading && profiles.length === 0 ? (
              <div className="skeleton" style={{ width: '48px', height: '24px', borderRadius: '6px', margin: '3px 0' }} />
            ) : (
              <span className="admin-kpi-count">{foundationCount}</span>
            )}
            <span className="admin-kpi-label">มูลนิธิ</span>
          </div>

          <div className="admin-kpi-card">
            <div className="admin-kpi-icon-wrap" style={{ background: '#ECFDF5' }}>
              <Shield size={20} color="#059669" />
            </div>
            {loading && profiles.length === 0 ? (
              <div className="skeleton" style={{ width: '48px', height: '24px', borderRadius: '6px', margin: '3px 0' }} />
            ) : (
              <span className="admin-kpi-count">{superAdminCount}</span>
            )}
            <span className="admin-kpi-label">ผู้ดูแลระบบ</span>
          </div>
        </motion.div>
        
        {/* Action Tabs: Horizontal Scrollable Segmented Bar on Mobile, Grid on Desktop */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25, delay: 0.08 }}
          className="admin-tab-nav"
        >
          {[
            { id: 'users', label: 'รายชื่อผู้ใช้', icon: <Users size={17} />, color: '#0284C7' },
            { id: 'approvals', label: 'คำขอมูลนิธิ', icon: <Building2 size={17} />, badge: pendingFoundations.length, color: '#D97706' },
            { id: 'incidents', label: 'แจ้งเหตุกู้ภัย', icon: <AlertTriangle size={17} />, badge: incidents.filter(i => i.status === 'pending').length, color: '#DC2626' },
            { id: 'donations', label: 'ประวัติบริจาค', icon: <Banknote size={17} />, color: '#059669' },
            { id: 'support', label: 'แจ้งเรื่อง', icon: <MessageSquare size={17} />, badge: unreadSupportCount, color: '#7C3AED' },
            { id: 'reports', label: 'รายงานผู้ใช้', icon: <AlertTriangle size={17} />, color: '#DC2626' },
            { id: 'logs', label: 'กิจกรรม', icon: <Star size={17} />, color: '#4B5563' }
          ].map(tab => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => {
                  setActiveTab(tab.id);
                  activeTabRef.current = tab.id;
                  if (tab.id === 'support') {
                    setUnreadSupportCount(0);
                    localStorage.setItem('admin_support_last_read', new Date().toISOString());
                  }
                }}
                className="admin-tab-pill"
                style={{
                  backgroundColor: isActive ? tab.color : '#FFFFFF',
                  color: isActive ? '#FFFFFF' : '#374151',
                  border: isActive ? `1.5px solid ${tab.color}` : '1px solid #E5E7EB',
                  boxShadow: isActive ? '0 2px 8px rgba(0,0,0,0.12)' : '0 1px 2px rgba(0,0,0,0.02)',
                  fontWeight: isActive ? 700 : 500
                }}
              >
                <span style={{ display: 'flex', alignItems: 'center', color: isActive ? '#FFFFFF' : tab.color }}>
                  {tab.icon}
                </span>
                <span>{tab.label}</span>
                {tab.badge > 0 && (
                  <span style={{
                    backgroundColor: isActive ? '#FFFFFF' : '#DC2626',
                    color: isActive ? tab.color : '#FFFFFF',
                    minWidth: '20px',
                    height: '20px',
                    borderRadius: '9999px',
                    padding: tab.badge > 9 ? '0 6px' : '0',
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '0.72rem',
                    fontWeight: 700,
                    lineHeight: 1,
                    marginLeft: '4px',
                    flexShrink: 0,
                    boxSizing: 'border-box'
                  }}>
                    <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', lineHeight: 1, transform: 'translateY(-0.5px)' }}>
                      {tab.badge}
                    </span>
                  </span>
                )}
              </button>
            );
          })}
        </motion.div>

      {loading ? (
        activeTab === 'users' ? <UsersTableSkeleton /> :
        activeTab === 'approvals' ? <ApprovalsTabSkeleton /> :
        activeTab === 'incidents' ? <IncidentsTabSkeleton /> :
        activeTab === 'donations' ? <DonationsTabSkeleton /> :
        activeTab === 'support' ? <SupportChatSkeleton /> :
        activeTab === 'reports' ? <ReportsTableSkeleton /> :
        <AuditLogsSkeleton />
      ) : activeTab === 'users' ? (
        <>
          {/* Data Card Container */}
          <div style={{ backgroundColor: 'white', borderRadius: '16px', border: '1px solid var(--gray-200)', boxShadow: '0 4px 12px rgba(0,0,0,0.02)', overflow: 'hidden' }}>
            
            {/* Toolbar: Responsive search and filter */}
            <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--gray-200)', backgroundColor: '#FAFAFA' }}>
              <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
                <div style={{ position: 'relative', flex: 1, minWidth: '180px' }}>
                  <Search size={16} style={{ position: 'absolute', left: '14px', top: '12px', color: 'var(--text-light)' }} />
                  <input 
                    type="text" placeholder="ค้นหาชื่อ หรืออีเมล..." 
                    value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
                    style={{ width: '100%', height: '38px', padding: '0 14px 0 38px', borderRadius: '8px', border: '1px solid var(--gray-200)', backgroundColor: 'white', fontSize: '0.88rem', outline: 'none', boxSizing: 'border-box' }}
                  />
                </div>
                <div style={{ width: '160px', flexShrink: 0 }}>
                  <CustomDropdown
                    value={roleFilter} 
                    onChange={(val) => setRoleFilter(val)}
                    buttonStyle={{ height: '38px', padding: '0 12px', borderRadius: '8px', backgroundColor: 'white', fontSize: '0.85rem' }}
                    options={[
                      { value: 'all', label: 'ทุกระดับสิทธิ์' },
                      { value: 'super_admin', label: 'Super Admin' },
                      { value: 'foundation', label: 'มูลนิธิ' },
                      { value: 'user', label: 'ผู้ใช้ทั่วไป' }
                    ]}
                  />
                </div>
              </div>
            </div>

            {/* Mobile View: Clean Card List (< 640px) */}
            <div className="admin-users-mobile-list">
              {filteredProfiles.map(profile => (
                <div
                  key={profile.id}
                  style={{
                    backgroundColor: '#FFFFFF',
                    borderRadius: '12px',
                    border: '1px solid #E5E7EB',
                    padding: '14px',
                    boxShadow: '0 1px 2px rgba(0,0,0,0.02)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '10px'
                  }}
                >
                  {/* Row 1: Avatar + Name + Current Role Badge */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0 }}>
                      <img 
                        src={profile.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(profile.full_name || profile.email?.split('@')[0] || 'User')}&background=D97706&color=fff&size=128`} 
                        alt="avatar" 
                        style={{ width: '38px', height: '38px', borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }} 
                        onError={(e) => {
                          e.target.onerror = null;
                          e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(profile.full_name || profile.email?.split('@')[0] || 'User')}&background=D97706&color=fff&size=128`;
                        }}
                      />
                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontWeight: 600, fontSize: '0.92rem', color: 'var(--text-dark)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {profile.full_name || 'ไม่ระบุชื่อ'}
                        </div>
                        <div style={{ fontSize: '0.76rem', color: '#6B7280', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {profile.email}
                        </div>
                      </div>
                    </div>
                    <div style={{ flexShrink: 0 }}>
                      <RoleBadge role={profile.role} />
                    </div>
                  </div>

                  {/* Row 2: Role Changer */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', paddingTop: '8px', borderTop: '1px solid #F3F4F6' }}>
                    <span style={{ fontSize: '0.78rem', color: '#6B7280', fontWeight: 500 }}>เปลี่ยนสิทธิ์:</span>
                    <div style={{ width: '150px' }}>
                      <CustomDropdown 
                        value={profile.role || 'user'} 
                        onChange={(val) => handleRoleChangeRequest(profile, val)}
                        buttonStyle={{ height: '34px', padding: '0 10px', borderRadius: '8px', fontSize: '0.82rem', border: '1px solid var(--gray-200)', backgroundColor: '#FAFAFA' }}
                        options={[
                          { value: 'user', label: 'ผู้ใช้ทั่วไป' },
                          { value: 'foundation', label: 'มูลนิธิ' },
                          { value: 'super_admin', label: 'Super Admin' }
                        ]}
                      />
                    </div>
                  </div>
                </div>
              ))}

              {filteredProfiles.length === 0 && (
                <div style={{ padding: '36px', textAlign: 'center', color: 'var(--text-light)', fontSize: '0.88rem' }}>
                  ไม่พบผู้ใช้งานที่ตรงกับเงื่อนไข
                </div>
              )}
            </div>
            
            {/* Desktop View: Full Data Table (>= 640px) */}
            <div className="admin-users-desktop-table" style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--gray-200)', backgroundColor: 'white' }}>
                    <th style={{ padding: '16px 24px', color: 'var(--text-light)', fontWeight: 600, fontSize: '0.85rem' }}>ผู้ใช้งาน</th>
                    <th style={{ padding: '16px 24px', color: 'var(--text-light)', fontWeight: 600, fontSize: '0.85rem' }}>อีเมล</th>
                    <th style={{ padding: '16px 24px', color: 'var(--text-light)', fontWeight: 600, fontSize: '0.85rem' }}>สิทธิ์ปัจจุบัน</th>
                    <th style={{ padding: '16px 24px', color: 'var(--text-light)', fontWeight: 600, fontSize: '0.85rem', width: '200px' }}>จัดการ</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredProfiles.map(profile => (
                    <tr key={profile.id} style={{ borderBottom: '1px solid var(--gray-100)', transition: 'background-color 0.2s' }} onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--gray-50)'} onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}>
                      <td style={{ padding: '16px 24px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                          {profile.avatar_url ? (
                            <img 
                              src={profile.avatar_url} 
                              alt="avatar" 
                              style={{ width: '36px', height: '36px', borderRadius: '50%', objectFit: 'cover' }} 
                              onError={(e) => {
                                e.target.onerror = null;
                                e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(profile.full_name || profile.email?.split('@')[0] || 'User')}&background=D97706&color=fff&size=128`;
                              }}
                            />
                          ) : (
                            <img 
                              src={`https://ui-avatars.com/api/?name=${encodeURIComponent(profile.full_name || profile.email?.split('@')[0] || 'User')}&background=D97706&color=fff&size=128`} 
                              alt="avatar fallback" 
                              style={{ width: '36px', height: '36px', borderRadius: '50%', objectFit: 'cover' }} 
                            />
                          )}
                          <span style={{ fontWeight: '600', color: 'var(--text-dark)' }}>{profile.full_name || 'ไม่ระบุชื่อ'}</span>
                        </div>
                      </td>
                      <td style={{ padding: '16px 24px', color: 'var(--text-medium)', fontSize: '0.9rem' }}>{profile.email}</td>
                      <td style={{ padding: '16px 24px' }}>
                        <RoleBadge role={profile.role} />
                      </td>
                      <td style={{ padding: '12px 24px' }}>
                        <CustomDropdown 
                          value={profile.role || 'user'} 
                          onChange={(val) => handleRoleChangeRequest(profile, val)}
                          buttonStyle={{ padding: '8px 12px', borderRadius: '8px', fontSize: '0.85rem', border: '1px solid var(--gray-200)', backgroundColor: 'white' }}
                          options={[
                            { value: 'user', label: 'ผู้ใช้ทั่วไป' },
                            { value: 'foundation', label: 'มูลนิธิ' },
                            { value: 'super_admin', label: 'Super Admin' }
                          ]}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {filteredProfiles.length === 0 && (
                <div style={{ padding: '48px', textAlign: 'center', color: 'var(--text-light)' }}>
                  ไม่พบผู้ใช้งานที่ตรงกับเงื่อนไข
                </div>
              )}
            </div>
          </div>
        </>
      ) : activeTab === 'approvals' ? (
        /* Approvals Tab */
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {pendingFoundations.length > 0 ? (
            pendingFoundations.map(foundation => (
              <div key={foundation.id} style={{ 
                backgroundColor: 'var(--surface)', borderRadius: '16px', padding: '24px', 
                boxShadow: '0 8px 24px rgba(0,0,0,0.06)', border: '1px solid rgba(249,168,38,0.2)',
                display: 'flex', flexDirection: 'column', gap: '16px' 
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px' }}>
                  
                  {/* Info Section */}
                  <div style={{ flex: '1 1 300px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
                      <div style={{ width: '48px', height: '48px', borderRadius: '10px', backgroundColor: '#FEF3C7', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                        <Home size={22} color="#D97706" />
                      </div>
                      <div>
                        <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-dark)' }}>{foundation.foundation_name}</h2>
                        <span style={{ fontSize: '0.85rem', color: 'var(--text-medium)' }}>สมัครเมื่อ: {new Date(foundation.submitted_at).toLocaleDateString('th-TH')}</span>
                      </div>
                    </div>
                    
                    <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', gap: '8px 16px', fontSize: '0.9rem' }}>
                      <span style={{ color: 'var(--text-light)' }}>อีเมลผู้ใช้:</span>
                      <span style={{ fontWeight: 500 }}>{foundation.profiles?.email}</span>
                      
                      <span style={{ color: 'var(--text-light)' }}>เลขทะเบียน:</span>
                      <span style={{ fontWeight: 500 }}>{foundation.registration_no || '-'}</span>
                      
                      <span style={{ color: 'var(--text-light)' }}>ผู้ติดต่อ:</span>
                      <span style={{ fontWeight: 500 }}>{foundation.contact_person} ({foundation.contact_phone})</span>
                      
                      <span style={{ color: 'var(--text-light)' }}>ที่อยู่:</span>
                      <span style={{ fontWeight: 500 }}>{foundation.address || '-'}</span>
                      
                      <span style={{ color: 'var(--text-light)' }}>รายละเอียด:</span>
                      <span style={{ fontWeight: 500 }}>{foundation.description || '-'}</span>
                    </div>
                  </div>
                  
                  {/* Actions Section */}
                  <div className="admin-approval-actions">
                    {!docUrls[foundation.id] ? (
                      <button 
                        onClick={() => fetchDocuments(foundation.id)}
                        disabled={docLoading[foundation.id]}
                        style={{ padding: '12px', backgroundColor: 'var(--gray-50)', border: '1px solid var(--gray-200)', borderRadius: '12px', cursor: docLoading[foundation.id] ? 'not-allowed' : 'pointer', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px', fontWeight: 600, color: 'var(--text-dark)' }}
                      >
                        {docLoading[foundation.id] ? (
                          <>
                            <Loader className="spin" size={18} color="var(--primary)" />
                            <span>กำลังโหลดเอกสาร...</span>
                          </>
                        ) : (
                          <>
                            <FileText size={18} />
                            <span>โหลดเอกสารแนบ</span>
                          </>
                        )}
                      </button>
                    ) : (
                      <div style={{ padding: '12px', backgroundColor: 'var(--gray-50)', border: '1px solid var(--gray-200)', borderRadius: '12px' }}>
                        <h4 style={{ margin: '0 0 8px', fontSize: '0.85rem', color: 'var(--text-medium)' }}>เอกสารแนบ:</h4>
                        {Object.keys(docUrls[foundation.id]).length > 0 ? (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                            {Object.entries(docUrls[foundation.id]).map(([docType, url]) => (
                              <a key={docType} href={url} target="_blank" rel="noopener noreferrer" style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem', color: 'var(--primary)', textDecoration: 'none', fontWeight: 600 }}>
                                <FileText size={14} /> {getDocTypeName(docType)}
                              </a>
                            ))}
                          </div>
                        ) : (
                          <span style={{ fontSize: '0.85rem', color: 'var(--danger)' }}>ไม่มีเอกสารแนบ</span>
                        )}
                      </div>
                    )}
                    
                    <button 
                      onClick={() => handleApproveFoundation(foundation.id)}
                      style={{ padding: '12px', backgroundColor: 'var(--success)', color: 'white', border: 'none', borderRadius: '12px', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', boxShadow: '0 4px 12px rgba(33,225,146,0.3)' }}
                    >
                      <CheckCircle size={18} /> อนุมัติมูลนิธิ
                    </button>
                    
                    <button 
                      onClick={() => setRejectModal({ isOpen: true, foundationId: foundation.id, reason: '' })}
                      style={{ padding: '12px', backgroundColor: 'transparent', color: 'var(--danger)', border: '2px solid var(--danger)', borderRadius: '12px', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
                    >
                      <XCircle size={18} /> ปฏิเสธ
                    </button>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div style={{ padding: '80px 24px', textAlign: 'center', backgroundColor: 'white', borderRadius: '16px', border: '2px dashed var(--gray-200)' }}>
              <div style={{ width: '64px', height: '64px', borderRadius: '50%', backgroundColor: 'rgba(33,225,146,0.1)', display: 'flex', justifyContent: 'center', alignItems: 'center', margin: '0 auto 16px' }}>
                <CheckCircle size={32} color="var(--success)" />
              </div>
              <h3 style={{ margin: '0 0 8px', color: 'var(--text-dark)' }}>ยอดเยี่ยม! ไม่มีคำขอใหม่</h3>
              <p style={{ margin: 0, color: 'var(--text-medium)' }}>ทุกคำขอได้รับการตรวจสอบเรียบร้อยแล้ว</p>
            </div>
          )}
        </div>
      ) : activeTab === 'donations' ? (
        <>
          {(() => {
            const totalAmount = donations.reduce((sum, d) => sum + Number(d.amount || 0), 0);
            const slipCount = donations.filter(d => d.slip_url).length;

            const filteredDonations = donations.filter(d => {
              // Search query
              if (donationSearch.trim()) {
                const q = donationSearch.toLowerCase();
                const donorName = (d.profiles?.full_name || '').toLowerCase();
                const donorEmail = (d.profiles?.email || '').toLowerCase();
                const foundationName = (d.foundation?.full_name || '').toLowerCase();
                if (!donorName.includes(q) && !donorEmail.includes(q) && !foundationName.includes(q)) {
                  return false;
                }
              }

              // Filter
              if (donationFilter === 'has_slip') return !!d.slip_url;
              if (donationFilter === 'no_slip') return !d.slip_url;
              return true;
            });

            return (
              <>
                {/* 3 Summary KPI Cards: Clean, Meaningful, Non-redundant */}
                <div className="admin-kpi-grid">
                  <div className="admin-kpi-card">
                    <div className="admin-kpi-icon-wrap" style={{ background: '#ECFDF5' }}>
                      <Banknote size={20} color="#059669" />
                    </div>
                    <span className="admin-kpi-count">฿ {totalAmount.toLocaleString()}</span>
                    <span className="admin-kpi-label">ยอดแจ้งบริจาครวม</span>
                  </div>

                  <div className="admin-kpi-card">
                    <div className="admin-kpi-icon-wrap" style={{ background: '#FEF3C7' }}>
                      <PiggyBank size={20} color="#D97706" />
                    </div>
                    <span className="admin-kpi-count">{donations.length}</span>
                    <span className="admin-kpi-label">รายการแจ้งโอนทั้งหมด</span>
                  </div>

                  <div className="admin-kpi-card">
                    <div className="admin-kpi-icon-wrap" style={{ background: '#EFF6FF' }}>
                      <FileCheck size={20} color="#2563EB" />
                    </div>
                    <span className="admin-kpi-count">{slipCount}</span>
                    <span className="admin-kpi-label">แนบหลักฐานสลิป</span>
                  </div>
                </div>

                {/* Main Data Container */}
                <div style={{ backgroundColor: 'white', borderRadius: '16px', border: '1px solid var(--gray-200)', boxShadow: '0 4px 12px rgba(0,0,0,0.02)', overflow: 'hidden' }}>
                  {/* Toolbar: Search & Filter */}
                  <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--gray-200)', backgroundColor: '#FAFAFA' }}>
                    <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
                      <div style={{ position: 'relative', flex: 1, minWidth: '180px' }}>
                        <Search size={16} style={{ position: 'absolute', left: '14px', top: '12px', color: 'var(--text-light)' }} />
                        <input 
                          type="text" 
                          placeholder="ค้นหาผู้บริจาค, อีเมล หรือมูลนิธิ..." 
                          value={donationSearch} 
                          onChange={(e) => setDonationSearch(e.target.value)}
                          style={{ width: '100%', height: '38px', padding: '0 14px 0 38px', borderRadius: '8px', border: '1px solid var(--gray-200)', backgroundColor: 'white', fontSize: '0.88rem', outline: 'none', boxSizing: 'border-box' }}
                        />
                      </div>
                      <div style={{ width: '160px', flexShrink: 0 }}>
                        <CustomDropdown
                          value={donationFilter} 
                          onChange={(val) => setDonationFilter(val)}
                          buttonStyle={{ height: '38px', padding: '0 12px', borderRadius: '8px', backgroundColor: 'white', fontSize: '0.85rem' }}
                          options={[
                            { value: 'all', label: 'ทั้งหมด' },
                            { value: 'has_slip', label: 'มีสลิปแนบ' },
                            { value: 'no_slip', label: 'ไม่มีสลิป' }
                          ]}
                        />
                      </div>
                    </div>
                  </div>

                  {filteredDonations.length > 0 ? (
                    <>
                      {/* Mobile Card List (< 768px) */}
                      <div className="admin-donations-mobile-list">
                        {filteredDonations.map((don) => (
                          <div 
                            key={don.id}
                            style={{
                              backgroundColor: '#FFFFFF',
                              borderRadius: '12px',
                              border: '1px solid #E5E7EB',
                              padding: '14px',
                              display: 'flex',
                              flexDirection: 'column',
                              gap: '10px',
                              boxShadow: '0 1px 3px rgba(0,0,0,0.02)'
                            }}
                          >
                            {/* Card Header: User info & Date */}
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px' }}>
                              <div>
                                <div style={{ fontWeight: 600, fontSize: '0.92rem', color: 'var(--text-dark)' }}>
                                  {don.profiles?.full_name || 'ผู้ใช้งาน'}
                                </div>
                                <div style={{ fontSize: '0.76rem', color: '#6B7280' }}>
                                  {don.profiles?.email || '-'}
                                </div>
                              </div>
                              <div style={{ fontSize: '0.74rem', color: 'var(--text-medium)', whiteSpace: 'nowrap' }}>
                                {new Date(don.created_at).toLocaleString('th-TH')}
                              </div>
                            </div>

                            {/* Amount & Foundation Info */}
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 12px', backgroundColor: 'var(--gray-50)', borderRadius: '8px' }}>
                              <div>
                                <div style={{ fontSize: '0.72rem', color: 'var(--text-light)' }}>ยอดแจ้งบริจาค</div>
                                <div style={{ fontWeight: 800, color: 'var(--primary)', fontSize: '1.15rem' }}>
                                  ฿ {Number(don.amount).toLocaleString()}
                                </div>
                              </div>
                              <div style={{ textAlign: 'right' }}>
                                <div style={{ fontSize: '0.72rem', color: 'var(--text-light)' }}>บริจาคให้</div>
                                <div style={{ fontSize: '0.84rem', fontWeight: 600, color: 'var(--text-dark)', marginTop: '2px' }}>
                                  {don.foundation?.full_name || '-'}
                                </div>
                              </div>
                            </div>

                            {/* Slip Viewer Button */}
                            {don.slip_url ? (
                              <button 
                                type="button"
                                onClick={() => setReportProofImage(don.slip_url)}
                                style={{
                                  width: '100%',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  gap: '6px',
                                  padding: '8px 12px',
                                  borderRadius: '8px',
                                  border: '1px solid #D1D5DB',
                                  backgroundColor: '#FFFFFF',
                                  color: 'var(--primary, #D97706)',
                                  fontWeight: 600,
                                  fontSize: '0.82rem',
                                  cursor: 'pointer',
                                  transition: 'all 0.15s'
                                }}
                              >
                                <Eye size={15} /> ดูหลักฐานสลิป
                              </button>
                            ) : (
                              <div style={{ fontSize: '0.76rem', color: '#9CA3AF', textAlign: 'center', padding: '4px' }}>
                                ไม่มีการแนบสลิป
                              </div>
                            )}
                          </div>
                        ))}
                      </div>

                      {/* Desktop Table (>= 768px) */}
                      <div className="admin-donations-desktop-table" style={{ overflowX: 'auto' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
                          <thead style={{ backgroundColor: '#FAFAFA', borderBottom: '1px solid var(--gray-200)' }}>
                            <tr style={{ textAlign: 'left' }}>
                              <th style={{ padding: '14px 18px', color: 'var(--text-light)', fontWeight: 600, fontSize: '0.84rem', whiteSpace: 'nowrap' }}>วันที่แจ้งโอน</th>
                              <th style={{ padding: '14px 18px', color: 'var(--text-light)', fontWeight: 600, fontSize: '0.84rem', whiteSpace: 'nowrap' }}>ผู้บริจาค</th>
                              <th style={{ padding: '14px 18px', color: 'var(--text-light)', fontWeight: 600, fontSize: '0.84rem', whiteSpace: 'nowrap' }}>ยอดเงิน</th>
                              <th style={{ padding: '14px 18px', color: 'var(--text-light)', fontWeight: 600, fontSize: '0.84rem', whiteSpace: 'nowrap' }}>บริจาคให้</th>
                              <th style={{ padding: '14px 18px', color: 'var(--text-light)', fontWeight: 600, fontSize: '0.84rem', textAlign: 'center', whiteSpace: 'nowrap' }}>หลักฐานสลิป</th>
                            </tr>
                          </thead>
                          <tbody>
                            {filteredDonations.map((don) => (
                              <tr 
                                key={don.id} 
                                style={{ borderBottom: '1px solid var(--gray-100)', transition: 'background-color 0.15s' }}
                                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--gray-50)'}
                                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                              >
                                <td style={{ padding: '14px 18px', color: 'var(--text-medium)', whiteSpace: 'nowrap', fontSize: '0.84rem' }}>
                                  {new Date(don.created_at).toLocaleString('th-TH')}
                                </td>
                                <td style={{ padding: '14px 18px', fontWeight: 500 }}>
                                  <div style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--text-dark)' }}>{don.profiles?.full_name || 'ผู้ใช้งาน'}</div>
                                  <div style={{ fontSize: '0.78rem', color: '#6B7280' }}>{don.profiles?.email || '-'}</div>
                                </td>
                                <td style={{ padding: '14px 18px', fontWeight: 700, color: 'var(--primary)', fontSize: '1rem', whiteSpace: 'nowrap' }}>
                                  ฿ {Number(don.amount).toLocaleString()}
                                </td>
                                <td style={{ padding: '14px 18px', color: 'var(--text-medium)', fontSize: '0.84rem' }}>
                                  {don.foundation?.full_name || '-'}
                                </td>
                                <td style={{ padding: '14px 16px', textAlign: 'center', whiteSpace: 'nowrap' }}>
                                  {don.slip_url ? (
                                    <button 
                                      type="button"
                                      onClick={() => setReportProofImage(don.slip_url)}
                                      style={{
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        gap: '5px',
                                        padding: '5px 12px',
                                        borderRadius: '6px',
                                        border: '1px solid #D1D5DB',
                                        backgroundColor: '#FFFFFF',
                                        color: 'var(--primary, #D97706)',
                                        fontWeight: 600,
                                        fontSize: '0.8rem',
                                        cursor: 'pointer',
                                        transition: 'all 0.15s'
                                      }}
                                    >
                                      <Eye size={14} /> ดูสลิป
                                    </button>
                                  ) : (
                                    <span style={{ 
                                      display: 'inline-flex', 
                                      alignItems: 'center', 
                                      padding: '3px 8px', 
                                      borderRadius: '6px', 
                                      fontSize: '0.75rem', 
                                      fontWeight: 500, 
                                      backgroundColor: '#F3F4F6', 
                                      color: '#9CA3AF', 
                                      border: '1px solid #E5E7EB' 
                                    }}>
                                      ไม่มีสลิป
                                    </span>
                                  )}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </>
                  ) : (
                    <div style={{ padding: '56px 20px', textAlign: 'center', color: 'var(--text-light)', fontSize: '0.9rem' }}>
                      <Banknote size={36} color="#D1D5DB" style={{ margin: '0 auto 10px', display: 'block' }} />
                      <span>ไม่พบประวัติรายการบริจาคที่ตรงกับเงื่อนไข</span>
                    </div>
                  )}
                </div>
              </>
            );
          })()}
        </>
      ) : activeTab === 'support' ? (
        <div className="admin-support-container">
          {/* Chat List */}
          <div className={`admin-support-list ${selectedSupportChat ? 'has-selected' : ''}`}>
            <div style={{ padding: '16px', borderBottom: '1px solid var(--gray-200)', backgroundColor: 'var(--gray-50)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 700, color: 'var(--text-dark)' }}>รายการแจ้งเรื่อง</h3>
              {supportChats.length > 0 && (
                <span style={{ fontSize: '0.76rem', color: 'var(--text-medium)', backgroundColor: 'var(--gray-200)', padding: '2px 8px', borderRadius: '10px' }}>
                  {supportChats.length} รายการ
                </span>
              )}
            </div>
            <div style={{ flex: 1, overflowY: 'auto' }}>
              {supportChats.length > 0 ? supportChats.map(chat => (
                <div 
                  key={chat.id} 
                  onClick={() => fetchSupportMessages(chat.id)}
                  style={{ 
                    padding: '14px 16px', borderBottom: '1px solid var(--gray-100)', cursor: 'pointer',
                    backgroundColor: selectedSupportChat === chat.id ? 'var(--primary-light)' : 'white',
                    transition: 'background-color 0.15s'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    {chat.profiles?.avatar_url ? (
                      <img src={chat.profiles.avatar_url} alt="avatar" style={{ width: '42px', height: '42px', borderRadius: '50%', objectFit: 'cover' }} />
                    ) : (
                      <div style={{ width: '42px', height: '42px', borderRadius: '50%', backgroundColor: 'var(--gray-200)', display: 'flex', justifyContent: 'center', alignItems: 'center', fontWeight: 'bold', color: 'var(--text-dark)' }}>
                        {chat.profiles?.full_name?.charAt(0) || 'U'}
                      </div>
                    )}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 600, fontSize: '0.92rem', color: 'var(--text-dark)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {chat.profiles?.full_name || 'ผู้ใช้งาน'}
                      </div>
                      <div style={{ fontSize: '0.78rem', color: 'var(--text-medium)', marginTop: '2px' }}>
                        {new Date(chat.updated_at).toLocaleString('th-TH')}
                      </div>
                    </div>
                  </div>
                </div>
              )) : (
                <div style={{ padding: '36px 20px', textAlign: 'center', color: 'var(--text-medium)' }}>ไม่มีการแจ้งเรื่อง</div>
              )}
            </div>
          </div>
          
          {/* Chat Window */}
          <div className={`admin-support-chat-window ${selectedSupportChat ? '' : 'no-selected'}`}>
            {selectedSupportChat ? (
              <>
                <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--gray-200)', backgroundColor: 'var(--gray-50)', display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <button
                    type="button"
                    onClick={() => setSelectedSupportChat(null)}
                    className="admin-support-back-btn"
                    style={{ background: 'none', border: 'none', padding: '6px', cursor: 'pointer', alignItems: 'center', justifyContent: 'center', borderRadius: '8px', color: 'var(--text-dark)' }}
                    title="กลับไปหน้ารายการ"
                  >
                    <ArrowLeft size={20} />
                  </button>
                  {(() => {
                    const activeChatObj = supportChats.find(c => c.id === selectedSupportChat);
                    return (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0, flex: 1 }}>
                        {activeChatObj?.profiles?.avatar_url ? (
                          <img src={activeChatObj.profiles.avatar_url} alt="avatar" style={{ width: '36px', height: '36px', borderRadius: '50%', objectFit: 'cover' }} />
                        ) : (
                          <div style={{ width: '36px', height: '36px', borderRadius: '50%', backgroundColor: 'var(--gray-200)', display: 'flex', justifyContent: 'center', alignItems: 'center', fontWeight: 'bold', fontSize: '0.85rem' }}>
                            {activeChatObj?.profiles?.full_name?.charAt(0) || 'U'}
                          </div>
                        )}
                        <div style={{ minWidth: 0, flex: 1 }}>
                          <h3 style={{ margin: 0, fontSize: '0.98rem', fontWeight: 700, color: 'var(--text-dark)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {activeChatObj?.profiles?.full_name || 'สนทนา'}
                          </h3>
                          <div style={{ fontSize: '0.74rem', color: 'var(--text-medium)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {activeChatObj?.profiles?.email || 'กำลังสนทนากับผู้ใช้'}
                          </div>
                        </div>
                      </div>
                    );
                  })()}
                </div>
                
                <div style={{ flex: 1, padding: '24px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '16px', backgroundColor: '#fdfdfd' }}>
                  {loadingSupportMessages ? (
                    <SupportChatMessagesSkeleton />
                  ) : supportMessages.length > 0 ? (
                    supportMessages.map(msg => {
                      const isMe = msg.sender_id === currentUser?.id;
                      return (
                        <div key={msg.id} style={{ display: 'flex', justifyContent: isMe ? 'flex-end' : 'flex-start' }}>
                          <div style={{ 
                            maxWidth: '70%', padding: '12px 16px', borderRadius: '16px',
                            backgroundColor: isMe ? 'var(--primary)' : 'var(--gray-100)',
                            color: isMe ? 'white' : 'var(--text-dark)',
                            borderBottomRightRadius: isMe ? '4px' : '16px',
                            borderBottomLeftRadius: isMe ? '16px' : '4px'
                          }}>
                            {msg.image_url && (
                              <img src={msg.image_url} alt="attached" style={{ maxWidth: '100%', borderRadius: '12px', marginBottom: '8px' }} />
                            )}
                            {msg.text && msg.text.trim() && <div style={{ lineHeight: 1.5 }}>{msg.text}</div>}
                            <div style={{ fontSize: '0.75rem', marginTop: '4px', textAlign: 'right', opacity: 0.8 }}>
                              {new Date(msg.created_at).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })}
                            </div>
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <div style={{ textAlign: 'center', color: 'var(--text-medium)', margin: 'auto' }}>
                      ยังไม่มีข้อความในการสนทนานี้
                    </div>
                  )}
                  <div ref={messagesEndRef} />
                </div>
                
                <div style={{ position: 'relative' }}>
                  {supportImagePreview && (
                    <div style={{ position: 'absolute', bottom: '100%', left: '16px', marginBottom: '8px', backgroundColor: 'white', padding: '8px', borderRadius: '12px', boxShadow: '0 -4px 16px rgba(0,0,0,0.1)', display: 'flex', alignItems: 'center', zIndex: 10 }}>
                      <img src={supportImagePreview} alt="preview" style={{ height: '80px', borderRadius: '8px' }} />
                      <button type="button" onClick={removeSupportImage} style={{ position: 'absolute', top: '0', right: '0', background: 'var(--danger)', color: 'white', border: 'none', borderRadius: '50%', width: '24px', height: '24px', cursor: 'pointer', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                        <X size={14} />
                      </button>
                    </div>
                  )}
                  <form onSubmit={handleSendSupportMessage} style={{ padding: '16px', borderTop: '1px solid var(--gray-200)', display: 'flex', alignItems: 'center', gap: '12px', backgroundColor: 'white' }}>
                    <button type="button" onClick={() => supportFileInputRef.current?.click()} style={{ background: 'none', border: 'none', padding: '8px', cursor: 'pointer', color: 'var(--primary)' }}>
                      <ImageIcon size={24} />
                    </button>
                    <input type="file" accept="image/*" ref={supportFileInputRef} onChange={handleSupportImageSelect} style={{ display: 'none' }} />
                    
                    <input 
                      type="text" 
                      placeholder="พิมพ์ข้อความตอบกลับ..." 
                      value={supportInput}
                      onChange={e => setSupportInput(e.target.value)}
                      style={{ flex: 1, padding: '12px 16px', borderRadius: '24px', border: '1px solid var(--gray-200)', outline: 'none' }}
                    />
                    <button type="submit" disabled={(!supportInput.trim() && !supportImageFile) || isSendingSupport} style={{ width: '48px', height: '48px', borderRadius: '50%', backgroundColor: 'var(--primary)', color: 'white', border: 'none', display: 'flex', justifyContent: 'center', alignItems: 'center', cursor: 'pointer' }}>
                      <Send size={20} />
                    </button>
                  </form>
                </div>
              </>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', height: '100%', color: 'var(--text-medium)' }}>
                <MessageSquare size={48} style={{ opacity: 0.2, marginBottom: '16px' }} />
                <p>เลือกรายการเพื่อเริ่มสนทนา</p>
              </div>
            )}
          </div>
        </div>
      ) : activeTab === 'reports' ? (
        <div style={{ backgroundColor: 'white', borderRadius: '16px', border: '1px solid var(--gray-200)', overflow: 'hidden' }}>
          {reports.length > 0 ? (
            <>
              {/* Mobile Card List (< 768px) */}
              <div className="admin-reports-mobile-list">
                {reports.map(report => (
                  <div 
                    key={report.id}
                    style={{
                      backgroundColor: '#FFFFFF',
                      borderRadius: '12px',
                      border: '1px solid #E5E7EB',
                      padding: '14px',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '10px',
                      boxShadow: '0 1px 3px rgba(0,0,0,0.02)'
                    }}
                  >
                    {/* Header: Date & Status Selector */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px' }}>
                      <span style={{ fontSize: '0.78rem', color: 'var(--text-medium)' }}>
                        {new Date(report.created_at).toLocaleString('th-TH')}
                      </span>
                      <select 
                        value={report.status}
                        onChange={async (e) => {
                          const newStatus = e.target.value;
                          try {
                            await api.updateReportStatus(report.id, newStatus);
                            setReports(reports.map(r => r.id === report.id ? { ...r, status: newStatus } : r));
                            showToast('อัปเดตสถานะเรียบร้อยแล้ว', 'success');
                          } catch (error) {
                            showToast('เกิดข้อผิดพลาดในการอัปเดต', 'error');
                          }
                        }}
                        style={{ 
                          padding: '5px 10px', borderRadius: '6px', fontSize: '0.74rem', fontWeight: 600,
                          backgroundColor: report.status === 'resolved' ? '#ECFDF5' : '#FEF3C7',
                          color: report.status === 'resolved' ? '#059669' : '#D97706',
                          border: `1px solid ${report.status === 'resolved' ? '#A7F3D0' : '#FCD34D'}`,
                          outline: 'none', cursor: 'pointer'
                        }}
                      >
                        <option value="pending">PENDING</option>
                        <option value="investigating">INVESTIGATING</option>
                        <option value="resolved">RESOLVED</option>
                        <option value="dismissed">DISMISSED</option>
                      </select>
                    </div>

                    {/* Target & Reporter Info */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '0.88rem' }}>
                      <div>
                        <span style={{ color: 'var(--text-medium)', fontSize: '0.8rem' }}>ผู้ถูกรายงาน: </span>
                        <span style={{ fontWeight: 700, color: 'var(--danger)' }}>{report.reported?.full_name || 'Unknown User'}</span>
                      </div>
                      <div>
                        <span style={{ color: 'var(--text-medium)', fontSize: '0.8rem' }}>ผู้รายงาน: </span>
                        <span style={{ fontWeight: 500, color: 'var(--text-dark)' }}>{report.reporter?.full_name || 'Unknown User'}</span>
                      </div>
                    </div>

                    {/* Reason Box */}
                    <div style={{ backgroundColor: 'var(--gray-50)', padding: '8px 12px', borderRadius: '8px', fontSize: '0.84rem', color: 'var(--text-dark)', lineHeight: 1.4 }}>
                      <span style={{ fontWeight: 600, color: 'var(--text-medium)', fontSize: '0.78rem', display: 'block', marginBottom: '2px' }}>เหตุผลการรายงาน:</span>
                      {report.reason}
                    </div>

                    {/* Actions */}
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap', marginTop: '2px' }}>
                      {report.image_url && (
                        <button 
                          type="button"
                          onClick={() => setReportProofImage(report.image_url)}
                          style={{ flex: 1, minWidth: '90px', padding: '8px 10px', backgroundColor: 'var(--primary-light)', color: 'var(--primary)', border: 'none', borderRadius: '8px', fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer' }}
                        >
                          ดูหลักฐาน
                        </button>
                      )}
                      <button 
                        type="button"
                        onClick={async () => {
                          setReportChatHistoryModal({ isOpen: true, messages: [], loading: true });
                          const match = await api.getMatchBetweenUsers(report.reporter_id, report.reported_id);
                          if (match) {
                            const msgs = await api.getMessages(match.id);
                            setReportChatHistoryModal({ isOpen: true, messages: msgs, loading: false });
                          } else {
                            setReportChatHistoryModal({ isOpen: true, messages: [], loading: false });
                          }
                        }}
                        style={{ flex: 1, minWidth: '80px', padding: '8px 10px', backgroundColor: 'var(--gray-200)', color: 'var(--text-dark)', border: 'none', borderRadius: '8px', fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer' }}
                      >
                        ดูแชท
                      </button>
                      <button 
                        type="button"
                        onClick={async () => {
                          if(window.confirm(`ยืนยันการแบนบัญชี ${report.reported?.full_name || 'นี้'} หรือไม่?`)) {
                            try {
                              await api.banUser(report.reported_id);
                              await api.updateReportStatus(report.id, 'resolved');
                              setReports(reports.map(r => r.id === report.id ? { ...r, status: 'resolved' } : r));
                              showToast('ระงับบัญชีเรียบร้อยแล้ว', 'success');
                            } catch (error) {
                              showToast('ไม่สามารถระงับบัญชีได้', 'error');
                            }
                          }
                        }}
                        style={{ flex: 1, minWidth: '85px', padding: '8px 10px', backgroundColor: 'var(--danger)', color: 'white', border: 'none', borderRadius: '8px', fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer' }}
                      >
                        แบนบัญชี
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Desktop Table (>= 768px) */}
              <div className="admin-reports-desktop-table" style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ backgroundColor: 'var(--gray-50)', borderBottom: '1px solid var(--gray-200)' }}>
                      <th style={{ padding: '16px', textAlign: 'left', color: 'var(--text-medium)', fontWeight: 600, fontSize: '0.85rem' }}>วันที่</th>
                      <th style={{ padding: '16px', textAlign: 'left', color: 'var(--text-medium)', fontWeight: 600, fontSize: '0.85rem' }}>ผู้รายงาน</th>
                      <th style={{ padding: '16px', textAlign: 'left', color: 'var(--text-medium)', fontWeight: 600, fontSize: '0.85rem' }}>ผู้ถูกรายงาน</th>
                      <th style={{ padding: '16px', textAlign: 'left', color: 'var(--text-medium)', fontWeight: 600, fontSize: '0.85rem' }}>เหตุผล</th>
                      <th style={{ padding: '16px', textAlign: 'left', color: 'var(--text-medium)', fontWeight: 600, fontSize: '0.85rem' }}>สถานะ</th>
                      <th style={{ padding: '16px', textAlign: 'left', color: 'var(--text-medium)', fontWeight: 600, fontSize: '0.85rem' }}>จัดการ</th>
                    </tr>
                  </thead>
                  <tbody>
                    {reports.map(report => (
                      <tr key={report.id} style={{ borderBottom: '1px solid var(--gray-100)' }}>
                        <td style={{ padding: '16px', color: 'var(--text-medium)', fontSize: '0.9rem' }}>
                          {new Date(report.created_at).toLocaleString('th-TH')}
                        </td>
                        <td style={{ padding: '16px', fontWeight: 500 }}>
                          {report.reporter?.full_name || 'Unknown User'}
                        </td>
                        <td style={{ padding: '16px', fontWeight: 500, color: 'var(--danger)' }}>
                          {report.reported?.full_name || 'Unknown User'}
                        </td>
                        <td style={{ padding: '16px', color: 'var(--text-dark)' }}>
                          {report.reason}
                        </td>
                        <td style={{ padding: '16px' }}>
                          <select 
                            value={report.status}
                            onChange={async (e) => {
                              const newStatus = e.target.value;
                              try {
                                await api.updateReportStatus(report.id, newStatus);
                                setReports(reports.map(r => r.id === report.id ? { ...r, status: newStatus } : r));
                                showToast('อัปเดตสถานะเรียบร้อยแล้ว', 'success');
                              } catch (error) {
                                showToast('เกิดข้อผิดพลาดในการอัปเดต', 'error');
                              }
                            }}
                            style={{ 
                              padding: '6px 12px', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 600,
                              backgroundColor: report.status === 'resolved' ? '#ECFDF5' : '#FEF3C7',
                              color: report.status === 'resolved' ? '#059669' : '#D97706',
                              border: `1px solid ${report.status === 'resolved' ? '#A7F3D0' : '#FCD34D'}`,
                              outline: 'none', cursor: 'pointer'
                            }}
                          >
                            <option value="pending">PENDING</option>
                            <option value="investigating">INVESTIGATING</option>
                            <option value="resolved">RESOLVED</option>
                            <option value="dismissed">DISMISSED</option>
                          </select>
                        </td>
                        <td style={{ padding: '16px' }}>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            {report.image_url && (
                              <button 
                                onClick={() => setReportProofImage(report.image_url)}
                                style={{ padding: '6px 12px', backgroundColor: 'var(--primary-light)', color: 'var(--primary)', border: 'none', borderRadius: '8px', fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer' }}>
                                ดูหลักฐาน
                              </button>
                            )}
                            <button 
                              onClick={async () => {
                                setReportChatHistoryModal({ isOpen: true, messages: [], loading: true });
                                const match = await api.getMatchBetweenUsers(report.reporter_id, report.reported_id);
                                if (match) {
                                  const msgs = await api.getMessages(match.id);
                                  setReportChatHistoryModal({ isOpen: true, messages: msgs, loading: false });
                                } else {
                                  setReportChatHistoryModal({ isOpen: true, messages: [], loading: false });
                                }
                              }}
                              style={{ padding: '6px 12px', backgroundColor: 'var(--gray-200)', color: 'var(--text-dark)', border: 'none', borderRadius: '8px', fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer' }}>
                              ดูแชท
                            </button>
                            <button 
                              onClick={async () => {
                                if(window.confirm(`ยืนยันการแบนบัญชี ${report.reported?.full_name || 'นี้'} หรือไม่?`)) {
                                  try {
                                    await api.banUser(report.reported_id);
                                    await api.updateReportStatus(report.id, 'resolved');
                                    setReports(reports.map(r => r.id === report.id ? { ...r, status: 'resolved' } : r));
                                    showToast('ระงับบัญชีเรียบร้อยแล้ว', 'success');
                                  } catch (error) {
                                    showToast('ไม่สามารถระงับบัญชีได้', 'error');
                                  }
                                }
                              }}
                              style={{ padding: '6px 12px', backgroundColor: 'var(--danger)', color: 'white', border: 'none', borderRadius: '8px', fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer' }}>
                              แบนบัญชี
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          ) : (
            <div style={{ padding: '60px', textAlign: 'center', color: 'var(--text-medium)' }}>
              ไม่มีรายงานผู้ใช้
            </div>
          )}
        </div>
      ) : activeTab === 'incidents' ? (
        /* Incidents Tab Content */
        <div style={{ backgroundColor: 'white', borderRadius: '16px', border: '1px solid var(--gray-200)', boxShadow: '0 4px 12px rgba(0,0,0,0.02)', overflow: 'hidden' }}>
          
          {/* Incidents Toolbar */}
          <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--gray-200)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px', backgroundColor: '#FAFAFA' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'nowrap', overflowX: 'auto', scrollbarWidth: 'none', WebkitOverflowScrolling: 'touch', maxWidth: '100%', backgroundColor: '#F3F4F6', padding: '4px', borderRadius: '10px' }}>
              {[
                { id: 'all', label: 'ทั้งหมด', count: incidents.length },
                { id: 'pending', label: 'รอดำเนินการ', count: incidents.filter(i => i.status === 'pending').length, highlight: incidents.filter(i => i.status === 'pending').length > 0 },
                { id: 'in_progress', label: 'กำลังเข้าช่วยเหลือ', count: incidents.filter(i => i.status === 'in_progress').length },
                { id: 'resolved', label: 'ช่วยเหลือสำเร็จ', count: incidents.filter(i => i.status === 'resolved').length },
                { id: 'cancelled', label: 'ยกเลิก', count: incidents.filter(i => i.status === 'cancelled').length }
              ].map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setIncidentFilter(tab.id)}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '6px 12px',
                    borderRadius: '8px',
                    border: 'none',
                    fontSize: '0.825rem',
                    fontWeight: incidentFilter === tab.id ? 600 : 500,
                    cursor: 'pointer',
                    backgroundColor: incidentFilter === tab.id ? '#FFFFFF' : 'transparent',
                    color: incidentFilter === tab.id ? '#111827' : '#6B7280',
                    boxShadow: incidentFilter === tab.id ? '0 1px 3px rgba(0,0,0,0.06)' : 'none',
                    transition: 'all 0.15s',
                    whiteSpace: 'nowrap',
                    flexShrink: 0
                  }}
                >
                  <span>{tab.label}</span>
                  <span style={{
                    fontSize: '0.72rem',
                    padding: '1px 6px',
                    borderRadius: '10px',
                    backgroundColor: incidentFilter === tab.id
                      ? (tab.highlight ? '#FEF2F2' : '#F3F4F6')
                      : (tab.highlight ? '#FEE2E2' : 'rgba(0,0,0,0.05)'),
                    color: tab.highlight ? '#DC2626' : (incidentFilter === tab.id ? '#111827' : '#6B7280'),
                    fontWeight: tab.highlight ? 700 : 500
                  }}>
                    {tab.count}
                  </span>
                </button>
              ))}
            </div>
            
            <button 
              onClick={async () => {
                const data = await api.getIncidentReports('all');
                setIncidents(data);
                showToast('รีเฟรชข้อมูลแจ้งเหตุกู้ภัยแล้ว', 'success');
              }}
              style={{ padding: '7px 14px', borderRadius: '8px', border: '1px solid #E5E7EB', backgroundColor: 'white', color: '#374151', fontSize: '0.825rem', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}
            >
              รีเฟรชข้อมูล
            </button>
          </div>

          {/* Incidents List */}
          {(() => {
            const filteredIncidents = incidents.filter(i => incidentFilter === 'all' || i.status === incidentFilter);
            
            if (filteredIncidents.length === 0) {
              return (
                <div style={{ padding: '60px 20px', textAlign: 'center', color: 'var(--text-medium)' }}>
                  <AlertTriangle size={36} color="#9CA3AF" style={{ margin: '0 auto 12px' }} />
                  <p style={{ margin: 0, fontSize: '0.95rem' }}>ไม่พบรายการแจ้งเหตุกู้ภัยในสถานะนี้</p>
                </div>
              );
            }

            return (
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                {filteredIncidents.map(inc => {
                  const hasCoords = Boolean(inc.latitude && inc.longitude);
                  const gmapsUrl = hasCoords 
                    ? `https://www.google.com/maps?q=${inc.latitude},${inc.longitude}`
                    : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(inc.location_text || '')}`;

                  const isUpdating = updatingIncidentId === inc.id;

                  return (
                    <div 
                      key={inc.id}
                      style={{ 
                        padding: '20px 24px', 
                        borderBottom: '1px solid var(--gray-100)', 
                        display: 'flex', 
                        flexWrap: 'wrap', 
                        gap: '20px',
                        alignItems: 'flex-start',
                        backgroundColor: inc.status === 'pending' ? '#fffaf5' : 'white',
                        transition: 'background-color 0.2s'
                      }}
                    >
                      {/* Image Thumbnail / Animal Friendly Placeholder */}
                      {inc.image_url ? (
                        <div 
                          onClick={() => setReportProofImage(inc.image_url)}
                          style={{ 
                            position: 'relative', width: '90px', height: '90px', flexShrink: 0, 
                            borderRadius: '12px', overflow: 'hidden', backgroundColor: '#F3F4F6', 
                            border: '1px solid #E5E7EB', cursor: 'pointer',
                            boxShadow: '0 1px 3px rgba(0,0,0,0.04)'
                          }}
                          title="คลิกเพื่อดูรูปขยายใหญ่"
                        >
                          <img 
                            src={inc.image_url} 
                            alt="Incident" 
                            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                          />
                          <div 
                            style={{
                              position: 'absolute', inset: 0, backgroundColor: 'rgba(0,0,0,0.25)',
                              opacity: 0, transition: 'opacity 0.15s', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white'
                            }}
                            onMouseEnter={e => e.currentTarget.style.opacity = '1'}
                            onMouseLeave={e => e.currentTarget.style.opacity = '0'}
                          >
                            <Eye size={20} />
                          </div>
                        </div>
                      ) : (
                        <div style={{ 
                          width: '90px', height: '90px', flexShrink: 0, borderRadius: '12px', 
                          backgroundColor: inc.animal_type === 'dog' ? '#FEF3C7' : inc.animal_type === 'cat' ? '#FEE2E2' : '#F3F4F6',
                          border: `1px solid ${inc.animal_type === 'dog' ? '#FDE68A' : inc.animal_type === 'cat' ? '#FECACA' : '#E5E7EB'}`,
                          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '4px',
                          boxShadow: '0 1px 2px rgba(0,0,0,0.02)'
                        }}>
                          {inc.animal_type === 'dog' ? (
                            <Dog size={32} color="#D97706" strokeWidth={1.75} />
                          ) : inc.animal_type === 'cat' ? (
                            <Cat size={32} color="#DC2626" strokeWidth={1.75} />
                          ) : (
                            <Heart size={30} color="#6B7280" strokeWidth={1.75} />
                          )}
                          <span style={{ fontSize: '0.68rem', color: inc.animal_type === 'dog' ? '#B45309' : inc.animal_type === 'cat' ? '#B91C1C' : '#6B7280', fontWeight: 500 }}>
                            ไม่มีรูปแนบ
                          </span>
                        </div>
                      )}

                      {/* Main Details */}
                      <div style={{ flex: '1 1 280px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                          {/* Status Badge */}
                          {inc.status === 'pending' ? (
                            <span style={{ 
                              display: 'inline-flex', alignItems: 'center', gap: '5px',
                              padding: '3px 10px', borderRadius: '20px', fontSize: '0.75rem', fontWeight: 600,
                              backgroundColor: '#FEF2F2', color: '#DC2626', border: '1px solid #FECACA'
                            }}>
                              <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#DC2626', display: 'inline-block' }} />
                              รอดำเนินการ
                            </span>
                          ) : inc.status === 'in_progress' ? (
                            <span style={{ 
                              display: 'inline-flex', alignItems: 'center', gap: '5px',
                              padding: '3px 10px', borderRadius: '20px', fontSize: '0.75rem', fontWeight: 600,
                              backgroundColor: '#EFF6FF', color: '#1D4ED8', border: '1px solid #BFDBFE'
                            }}>
                              <Compass size={13} color="#1D4ED8" />
                              กำลังเข้าช่วยเหลือ
                            </span>
                          ) : inc.status === 'resolved' ? (
                            <span style={{ 
                              display: 'inline-flex', alignItems: 'center', gap: '5px',
                              padding: '3px 10px', borderRadius: '20px', fontSize: '0.75rem', fontWeight: 600,
                              backgroundColor: '#ECFDF5', color: '#059669', border: '1px solid #A7F3D0'
                            }}>
                              <CheckCircle2 size={13} color="#059669" />
                              ช่วยเหลือสำเร็จ
                            </span>
                          ) : (
                            <span style={{ 
                              display: 'inline-flex', alignItems: 'center', gap: '5px',
                              padding: '3px 10px', borderRadius: '20px', fontSize: '0.75rem', fontWeight: 600,
                              backgroundColor: '#F3F4F6', color: '#4B5563', border: '1px solid #E5E7EB'
                            }}>
                              <X size={13} color="#6B7280" />
                              ยกเลิก
                            </span>
                          )}

                          {/* Rescuer Badge */}
                          {inc.rescuer_name && (
                            <span style={{
                              display: 'inline-flex', alignItems: 'center', gap: '4px',
                              padding: '3px 10px', borderRadius: '20px', fontSize: '0.75rem', fontWeight: 600,
                              backgroundColor: inc.status === 'resolved' ? '#ECFDF5' : '#FEF3C7',
                              color: inc.status === 'resolved' ? '#065F46' : '#92400E',
                              border: `1px solid ${inc.status === 'resolved' ? '#A7F3D0' : '#FDE68A'}`
                            }}>
                              {inc.status === 'resolved' ? <ShieldCheck size={12} /> : <UserCheck size={12} />}
                              ผู้รับเคส: {inc.rescuer_name}
                            </span>
                          )}

                          {/* Animal Type Tag */}
                          <span style={{
                            display: 'inline-flex', alignItems: 'center', gap: '4px',
                            padding: '3px 9px', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 600,
                            backgroundColor: inc.animal_type === 'dog' ? '#FEF3C7' : inc.animal_type === 'cat' ? '#FEE2E2' : '#F3F4F6',
                            color: inc.animal_type === 'dog' ? '#92400E' : inc.animal_type === 'cat' ? '#991B1B' : '#374151',
                            border: `1px solid ${inc.animal_type === 'dog' ? '#FDE68A' : inc.animal_type === 'cat' ? '#FECACA' : '#E5E7EB'}`
                          }}>
                            {inc.animal_type === 'dog' ? <Dog size={12} /> : inc.animal_type === 'cat' ? <Cat size={12} /> : <Heart size={12} />}
                            {inc.animal_type === 'dog' ? 'สุนัข' : inc.animal_type === 'cat' ? 'แมว' : 'สัตว์อื่น'}
                          </span>

                          {/* Timestamp */}
                          <span style={{ fontSize: '0.8rem', color: '#6B7280', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                            <Clock size={12} color="#9CA3AF" />
                            {new Date(inc.created_at).toLocaleString('th-TH', { dateStyle: 'medium', timeStyle: 'short' })} น.
                          </span>
                        </div>

                        {/* Symptoms */}
                        <div style={{ fontSize: '0.98rem', fontWeight: 600, color: '#111827', lineHeight: 1.4 }}>
                          {inc.symptoms}
                        </div>

                        {/* Location & Navigation */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap', marginTop: '2px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.85rem', color: '#4B5563' }}>
                            <MapPin size={15} color="#D97706" style={{ flexShrink: 0 }} />
                            <span>{inc.location_text || 'ไม่ได้ระบุคำอธิบายสถานที่'}</span>
                          </div>

                          {/* Google Maps Button */}
                          <a 
                            href={gmapsUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{ 
                              display: 'inline-flex', alignItems: 'center', gap: '5px',
                              padding: '5px 12px', backgroundColor: '#FFFBEB', color: '#B45309',
                              borderRadius: '8px', fontSize: '0.78rem', fontWeight: 600, textDecoration: 'none',
                              border: '1px solid #FDE68A', transition: 'all 0.15s',
                              boxShadow: '0 1px 2px rgba(0,0,0,0.03)'
                            }}
                            onMouseEnter={e => { e.currentTarget.style.backgroundColor = '#FEF3C7'; e.currentTarget.style.borderColor = '#FCD34D'; }}
                            onMouseLeave={e => { e.currentTarget.style.backgroundColor = '#FFFBEB'; e.currentTarget.style.borderColor = '#FDE68A'; }}
                          >
                            <Navigation size={12} color="#D97706" />
                            {hasCoords ? `นำทาง Google Maps (${Number(inc.latitude).toFixed(4)}, ${Number(inc.longitude).toFixed(4)})` : 'ค้นหาบน Google Maps'}
                            <ExternalLink size={11} style={{ opacity: 0.7 }} />
                          </a>
                        </div>

                        {/* Reporter info */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', fontSize: '0.82rem', color: '#6B7280', marginTop: '4px', flexWrap: 'wrap' }}>
                          <span>ผู้แจ้ง: <strong style={{ color: '#374151' }}>{inc.reporter_name || 'ไม่ระบุชื่อ'}</strong></span>
                          {inc.reporter_phone && (
                            <a 
                              href={`tel:${inc.reporter_phone}`}
                              style={{ 
                                display: 'inline-flex', alignItems: 'center', gap: '4px', 
                                color: '#059669', fontWeight: 600, textDecoration: 'none',
                                backgroundColor: '#ECFDF5', padding: '2px 8px', borderRadius: '6px',
                                border: '1px solid #A7F3D0'
                              }}
                            >
                              <Phone size={12} /> {inc.reporter_phone}
                            </a>
                          )}
                        </div>
                      </div>

                      {/* Action Status Transitions */}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', width: '180px', flexShrink: 0 }}>
                        <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#6B7280' }}>จัดการสถานะการช่วยเหลือ:</span>
                        
                        {/* State: Pending */}
                        {inc.status === 'pending' && (
                          <>
                            <button 
                              disabled={isUpdating}
                              onClick={() => handleUpdateIncidentStatus(inc.id, 'in_progress')}
                              style={{ 
                                height: '38px', borderRadius: '8px', fontSize: '0.82rem', fontWeight: 700, cursor: 'pointer',
                                backgroundColor: '#D97706', color: '#FFFFFF', border: 'none',
                                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
                                boxShadow: '0 2px 4px rgba(217, 119, 6, 0.25)', transition: 'all 0.15s'
                              }}
                              onMouseEnter={e => e.currentTarget.style.backgroundColor = '#B45309'}
                              onMouseLeave={e => e.currentTarget.style.backgroundColor = '#D97706'}
                            >
                              <Compass size={14} />
                              รับเคส / เข้าช่วยเหลือ
                            </button>
                            <button 
                              disabled={isUpdating}
                              onClick={() => handleUpdateIncidentStatus(inc.id, 'cancelled')}
                              style={{ 
                                height: '30px', borderRadius: '8px', fontSize: '0.75rem', fontWeight: 500, cursor: 'pointer',
                                backgroundColor: '#FFFFFF', color: '#6B7280', border: '1px solid #E5E7EB',
                                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '5px'
                              }}
                            >
                              <X size={12} />
                              ยกเลิกเคส
                            </button>
                          </>
                        )}

                        {/* State: In Progress */}
                        {inc.status === 'in_progress' && (
                          <>
                            <div style={{
                              padding: '6px 10px', backgroundColor: '#EFF6FF', border: '1px solid #BFDBFE',
                              borderRadius: '8px', fontSize: '0.75rem', color: '#1D4ED8', fontWeight: 600,
                              display: 'flex', alignItems: 'center', gap: '4px'
                            }}>
                              <UserCheck size={13} /> {inc.rescuer_name ? `ผู้รับเคส: ${inc.rescuer_name}` : 'กำลังเข้าช่วยเหลือ'}
                            </div>
                            <button 
                              disabled={isUpdating}
                              onClick={() => handleUpdateIncidentStatus(inc.id, 'resolved')}
                              style={{ 
                                height: '36px', borderRadius: '8px', fontSize: '0.82rem', fontWeight: 700, cursor: 'pointer',
                                backgroundColor: '#059669', color: '#FFFFFF', border: 'none',
                                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
                                boxShadow: '0 2px 4px rgba(5, 150, 105, 0.2)', transition: 'all 0.15s'
                              }}
                              onMouseEnter={e => e.currentTarget.style.backgroundColor = '#047857'}
                              onMouseLeave={e => e.currentTarget.style.backgroundColor = '#059669'}
                            >
                              <CheckCircle2 size={14} />
                              ช่วยเหลือสำเร็จ
                            </button>
                            <button 
                              disabled={isUpdating}
                              onClick={() => handleUpdateIncidentStatus(inc.id, 'pending')}
                              style={{ 
                                height: '30px', borderRadius: '8px', fontSize: '0.74rem', fontWeight: 500, cursor: 'pointer',
                                backgroundColor: '#FFFFFF', color: '#4B5563', border: '1px solid #D1D5DB',
                                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px'
                              }}
                              title="ปลดล็อกเคสและคืนกลับสู่สถานะรอดำเนินการ"
                            >
                              <RotateCcw size={12} /> ปลดล็อกสู่กองกลาง
                            </button>
                          </>
                        )}

                        {/* State: Resolved */}
                        {inc.status === 'resolved' && (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                            <div style={{
                              display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '3px',
                              padding: '10px 12px', backgroundColor: '#ECFDF5', border: '1px solid #A7F3D0',
                              borderRadius: '10px', color: '#059669', textAlign: 'center'
                            }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '0.82rem', fontWeight: 700 }}>
                                <CheckCircle2 size={15} color="#059669" /> ภารกิจสำเร็จ
                              </div>
                              <span style={{ fontSize: '0.7rem', color: '#047857' }}>
                                {inc.rescuer_name ? `โดย: ${inc.rescuer_name}` : 'ปิดเคสเรียบร้อย'}
                              </span>
                            </div>
                            <button
                              disabled={isUpdating}
                              onClick={() => handleUpdateIncidentStatus(inc.id, 'pending')}
                              style={{
                                background: 'none', border: 'none', color: '#6B7280', fontSize: '0.72rem',
                                cursor: 'pointer', textDecoration: 'underline', padding: '2px'
                              }}
                            >
                              เปิดเคสใหม่ (Admin Reopen)
                            </button>
                          </div>
                        )}

                        {/* State: Cancelled */}
                        {inc.status === 'cancelled' && (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                            <div style={{
                              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '5px',
                              padding: '8px 12px', backgroundColor: '#F3F4F6', border: '1px solid #E5E7EB',
                              borderRadius: '8px', color: '#6B7280', fontSize: '0.78rem', fontWeight: 500
                            }}>
                              <X size={13} /> ยกเลิกเคสแล้ว
                            </div>
                            <button
                              disabled={isUpdating}
                              onClick={() => handleUpdateIncidentStatus(inc.id, 'pending')}
                              style={{
                                background: 'none', border: 'none', color: '#6B7280', fontSize: '0.72rem',
                                cursor: 'pointer', textDecoration: 'underline', padding: '2px'
                              }}
                            >
                              นำกลับมาดำเนินการใหม่
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            );
          })()}
        </div>
      ) : activeTab === 'logs' ? (
        /* Audit Logs Tab */
        <div style={{ backgroundColor: 'white', borderRadius: '16px', boxShadow: '0 4px 16px rgba(0,0,0,0.04)', overflow: 'hidden' }}>
          {auditLogs.length > 0 ? (
            <>
              {/* Mobile Timeline View (< 768px) */}
              <div className="admin-logs-mobile-feed">
                <div className="admin-timeline-feed">
                  {auditLogs.map((log) => {
                    const isApprove = log.action === 'APPROVE_FOUNDATION';
                    const isReject = log.action === 'REJECT_FOUNDATION';
                    const isRole = log.action === 'UPDATE_ROLE';
                    const iconBg = isApprove ? '#ECFDF5' : isReject ? '#FEF2F2' : isRole ? '#EFF6FF' : '#F3F4F6';
                    const iconColor = isApprove ? '#059669' : isReject ? '#DC2626' : isRole ? '#2563EB' : '#4B5563';
                    const actionLabel = isApprove ? 'อนุมัติมูลนิธิ' : isReject ? 'ปฏิเสธมูลนิธิ' : isRole ? 'ปรับเปลี่ยนสิทธิ์ผู้ใช้' : log.action;

                    return (
                      <div key={log.id} className="admin-timeline-item">
                        <div className="admin-timeline-line" />
                        <div className="admin-timeline-icon" style={{ backgroundColor: iconBg, color: iconColor }}>
                          {isApprove ? <CheckCircle2 size={18} /> : isReject ? <XCircle size={18} /> : isRole ? <ShieldCheck size={18} /> : <Clock size={18} />}
                        </div>
                        <div className="admin-timeline-content">
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px', marginBottom: '4px', flexWrap: 'wrap' }}>
                            <span style={{ fontWeight: 700, fontSize: '0.88rem', color: iconColor }}>
                              {actionLabel}
                            </span>
                            <span style={{ fontSize: '0.72rem', color: 'var(--text-medium)' }}>
                              {new Date(log.created_at).toLocaleString('th-TH')}
                            </span>
                          </div>
                          <div style={{ fontSize: '0.8rem', color: 'var(--text-dark)', marginBottom: '4px' }}>
                            ดำเนินการโดย: <strong>{log.admin?.full_name || log.admin?.email || 'ผู้ดูแลระบบ'}</strong>
                          </div>
                          {log.target_id && (
                            <div style={{ fontSize: '0.74rem', color: 'var(--text-light)', fontFamily: 'monospace' }}>
                              เป้าหมาย ID: {log.target_id.slice(0, 12)}...
                            </div>
                          )}
                          {log.detail && (
                            <div style={{ marginTop: '6px', padding: '6px 8px', backgroundColor: '#FFFFFF', borderRadius: '6px', border: '1px solid #E5E7EB', fontSize: '0.74rem', color: '#4B5563', fontFamily: 'monospace', wordBreak: 'break-all' }}>
                              {JSON.stringify(log.detail)}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Desktop Table (>= 768px) */}
              <div className="admin-logs-desktop-table" style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
                  <thead>
                    <tr style={{ backgroundColor: 'var(--gray-50)', borderBottom: '2px solid var(--gray-200)', textAlign: 'left' }}>
                      <th style={{ padding: '16px' }}>เวลา</th>
                      <th style={{ padding: '16px' }}>แอดมิน</th>
                      <th style={{ padding: '16px' }}>การกระทำ</th>
                      <th style={{ padding: '16px' }}>รายละเอียด</th>
                    </tr>
                  </thead>
                  <tbody>
                    {auditLogs.map((log) => (
                      <tr key={log.id} style={{ borderBottom: '1px solid var(--gray-100)' }}>
                        <td style={{ padding: '16px', color: 'var(--text-medium)', whiteSpace: 'nowrap' }}>{new Date(log.created_at).toLocaleString('th-TH')}</td>
                        <td style={{ padding: '16px', fontWeight: 500 }}>{log.admin?.full_name || log.admin?.email || 'Unknown'}</td>
                        <td style={{ padding: '16px' }}>
                          <span style={{ 
                            padding: '4px 8px', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 600,
                            backgroundColor: log.action === 'APPROVE_FOUNDATION' ? '#ECFDF5' : log.action === 'REJECT_FOUNDATION' ? '#FEF2F2' : '#FEF3C7',
                            color: log.action === 'APPROVE_FOUNDATION' ? '#059669' : log.action === 'REJECT_FOUNDATION' ? '#DC2626' : '#D97706',
                            border: `1px solid ${log.action === 'APPROVE_FOUNDATION' ? '#A7F3D0' : log.action === 'REJECT_FOUNDATION' ? '#FCA5A5' : '#FCD34D'}`
                          }}>
                            {log.action}
                          </span>
                        </td>
                        <td style={{ padding: '16px', color: 'var(--text-medium)' }}>
                          Target: {log.target_id.slice(0, 8)}... <br/>
                          {log.detail && <span style={{ fontSize: '0.8rem', fontFamily: 'monospace' }}>{JSON.stringify(log.detail)}</span>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          ) : (
            <div style={{ padding: '60px', textAlign: 'center', color: 'var(--text-medium)' }}>
              ยังไม่มีบันทึกการทำงาน
            </div>
          )}
        </div>
      ) : null}

      {/* Confirmation Modal (Role Update) */}
      <AnimatePresence>
        {confirmModal.isOpen && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            onClick={() => setConfirmModal({ isOpen: false, profile: null, newRole: null })}
            style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 9998, padding: '20px' }}
          >
            <motion.div 
              initial={{ opacity: 0, scale: 0.96, y: 12 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 8 }}
              transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
              onClick={e => e.stopPropagation()}
              style={{ backgroundColor: 'white', borderRadius: '16px', padding: '28px', width: '100%', maxWidth: '400px', boxShadow: '0 20px 48px rgba(0,0,0,0.12)' }}
            >
              <h3 style={{ margin: '0 0 12px 0', color: 'var(--text-dark)', fontSize: '1.2rem', fontWeight: 700 }}>ยืนยันการเปลี่ยนสิทธิ์</h3>
              <p style={{ margin: '0 0 20px 0', color: 'var(--text-medium)', lineHeight: 1.5, fontSize: '0.95rem' }}>
                คุณกำลังจะเปลี่ยนสิทธิ์ของ <strong>{confirmModal.profile?.full_name}</strong> เป็น <strong>{confirmModal.newRole}</strong>
              </p>
              <div style={{ display: 'flex', gap: '10px' }}>
                <button onClick={() => setConfirmModal({ isOpen: false, profile: null, newRole: null })} style={{ flex: 1, height: '42px', backgroundColor: 'white', color: 'var(--text-dark)', border: '1px solid var(--gray-300)', borderRadius: '8px', fontWeight: 600, cursor: 'pointer' }}>ยกเลิก</button>
                <button onClick={confirmUpdateRole} style={{ flex: 1, height: '42px', backgroundColor: 'var(--primary)', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 600, cursor: 'pointer' }}>ยืนยันการเปลี่ยน</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Reject Modal */}
      <AnimatePresence>
        {rejectModal.isOpen && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            onClick={() => setRejectModal({ isOpen: false, foundationId: null, reason: '' })}
            style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 9998, padding: '20px' }}
          >
            <motion.div 
              initial={{ opacity: 0, scale: 0.96, y: 12 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 8 }}
              transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
              onClick={e => e.stopPropagation()}
              style={{ backgroundColor: 'white', borderRadius: '16px', padding: '28px', width: '100%', maxWidth: '400px', boxShadow: '0 20px 48px rgba(0,0,0,0.12)' }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '14px' }}>
                <XCircle size={24} color="var(--danger)" />
                <h3 style={{ margin: 0, color: 'var(--danger)', fontSize: '1.2rem', fontWeight: 700 }}>ปฏิเสธคำขอมูลนิธิ</h3>
              </div>
              <p style={{ margin: '0 0 14px 0', color: 'var(--text-medium)', fontSize: '0.9rem' }}>
                กรุณาระบุเหตุผลที่ไม่สามารถอนุมัติได้ เพื่อให้มูลนิธินำไปแก้ไข
              </p>
              <textarea
                value={rejectModal.reason}
                onChange={(e) => setRejectModal(prev => ({ ...prev, reason: e.target.value }))}
                placeholder="เช่น เอกสารไม่ชัดเจน, ข้อมูลไม่ครบถ้วน..."
                style={{ width: '100%', height: '100px', padding: '12px', borderRadius: '8px', border: '1px solid var(--gray-300)', marginBottom: '20px', outline: 'none', fontFamily: 'inherit', resize: 'vertical', fontSize: '0.9rem' }}
              />
              <div style={{ display: 'flex', gap: '10px' }}>
                <button onClick={() => setRejectModal({ isOpen: false, foundationId: null, reason: '' })} style={{ flex: 1, height: '42px', backgroundColor: 'white', color: 'var(--text-dark)', border: '1px solid var(--gray-300)', borderRadius: '8px', fontWeight: 600, cursor: 'pointer' }}>ยกเลิก</button>
                <button onClick={submitRejectFoundation} style={{ flex: 1, height: '42px', backgroundColor: 'var(--danger)', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 600, cursor: 'pointer' }}>ยืนยันปฏิเสธ</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Report Image Preview Modal */}
      <AnimatePresence>
        {reportProofImage && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 10000, padding: '20px' }} 
            onClick={() => setReportProofImage(null)}
          >
            <motion.div 
              initial={{ opacity: 0, scale: 0.94 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.94 }}
              transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
              style={{ position: 'relative', maxWidth: '90%', maxHeight: '90%' }} 
              onClick={e => e.stopPropagation()}
            >
              <img src={reportProofImage} alt="Proof" style={{ maxWidth: '100%', maxHeight: '80vh', borderRadius: '8px', objectFit: 'contain' }} />
              <button onClick={() => setReportProofImage(null)} style={{ position: 'absolute', top: '-12px', right: '-12px', backgroundColor: 'white', color: 'var(--danger)', border: 'none', borderRadius: '50%', width: '28px', height: '28px', display: 'flex', justifyContent: 'center', alignItems: 'center', cursor: 'pointer', boxShadow: '0 2px 8px rgba(0,0,0,0.2)' }}>
                <X size={18} />
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Chat History Modal */}
      <AnimatePresence>
        {reportChatHistoryModal.isOpen && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            onClick={() => setReportChatHistoryModal({ isOpen: false, messages: [], loading: false })}
            style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 9999, padding: '20px' }}
          >
            <motion.div 
              initial={{ opacity: 0, scale: 0.96, y: 12 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 8 }}
              transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
              onClick={e => e.stopPropagation()}
              style={{ backgroundColor: 'white', borderRadius: '16px', width: '100%', maxWidth: '600px', height: '80vh', display: 'flex', flexDirection: 'column', overflow: 'hidden', boxShadow: '0 20px 48px rgba(0,0,0,0.12)' }}
            >
              <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--gray-200)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: 'var(--gray-50)' }}>
                <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700 }}>ประวัติการแชทระหว่างผู้ใช้</h3>
                <button onClick={() => setReportChatHistoryModal({ isOpen: false, messages: [], loading: false })} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-medium)' }}><X size={20} /></button>
              </div>
              <div style={{ flex: 1, overflowY: 'auto', padding: '20px', backgroundColor: '#FAF8F5' }}>
                {reportChatHistoryModal.loading ? (
                  <ChatModalSkeleton />
                ) : reportChatHistoryModal.messages.length > 0 ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                    {reportChatHistoryModal.messages.map(msg => (
                      <div key={msg.id} style={{ display: 'flex', flexDirection: 'column', alignItems: msg.sender === 'shelter' ? 'flex-start' : 'flex-end' }}>
                        <span style={{ fontSize: '0.7rem', color: 'var(--text-medium)', marginBottom: '4px' }}>{msg.sender === 'shelter' ? 'มูลนิธิ' : 'ผู้ใช้งาน'}</span>
                        <div style={{ 
                          padding: '10px 14px', borderRadius: '12px', maxWidth: '80%',
                          backgroundColor: msg.sender === 'shelter' ? 'white' : 'var(--primary)',
                          color: msg.sender === 'shelter' ? 'var(--text-dark)' : 'white',
                          border: msg.sender === 'shelter' ? '1px solid var(--gray-200)' : 'none',
                          fontSize: '0.9rem'
                        }}>
                          {msg.imageUrl && (
                            <img src={msg.imageUrl} alt="Chat attachment" style={{ maxWidth: '100%', maxHeight: '200px', borderRadius: '8px', marginBottom: msg.text ? '8px' : 0 }} />
                          )}
                          {msg.text && <div>{msg.text}</div>}
                        </div>
                        <span style={{ fontSize: '0.7rem', color: 'var(--text-medium)', marginTop: '4px' }}>{msg.timestamp || new Date(msg.created_at).toLocaleTimeString('th-TH')}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div style={{ textAlign: 'center', color: 'var(--text-medium)', marginTop: '40px' }}>ไม่มีประวัติการแชทระหว่างสองผู้ใช้นี้</div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Toast Notification */}
      <AnimatePresence>
        {toast && (
          <motion.div 
            initial={{ opacity: 0, y: 16, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12, scale: 0.96 }}
            transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
            style={{ position: 'fixed', bottom: '24px', right: '24px', backgroundColor: toast.type === 'error' ? 'var(--danger)' : '#059669', color: 'white', padding: '12px 20px', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '10px', boxShadow: '0 8px 24px rgba(0,0,0,0.15)', zIndex: 9999 }}
          >
            {toast.type === 'error' ? <AlertCircle size={18} /> : <CheckCircle size={18} />}
            <span style={{ fontWeight: 600, fontSize: '0.9rem' }}>{toast.text}</span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
    </div>
  );
};

// Helper Components
const StatCard = ({ icon, count, label, loading }) => (
  <div className="admin-stat-card">
    <div style={{ marginBottom: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      {icon}
    </div>
    {loading ? (
      <div className="skeleton" style={{ width: '64px', height: '24px', borderRadius: '6px', margin: '4px 0 6px' }} />
    ) : (
      <span className="admin-stat-card-count">
        {count}
      </span>
    )}
    <span className="admin-stat-card-label">
      {label}
    </span>
  </div>
);

const RoleBadge = ({ role }) => {
  if (role === 'super_admin') return <span style={{ backgroundColor: '#FEF2F2', color: '#DC2626', border: '1px solid #FCA5A5', padding: '3px 8px', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 600 }}>Super Admin</span>;
  if (role === 'foundation') return <span style={{ backgroundColor: '#FEF3C7', color: '#D97706', border: '1px solid #FCD34D', padding: '3px 8px', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 600 }}>มูลนิธิ</span>;
  return <span style={{ backgroundColor: '#F3F4F6', color: '#374151', border: '1px solid #E5E7EB', padding: '3px 8px', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 500 }}>ผู้ใช้ทั่วไป</span>;
};

// ============================================
// Skeleton Loading Components for Admin Tabs
// ============================================

const UsersTableSkeleton = () => (
  <div style={{ backgroundColor: 'white', borderRadius: '16px', border: '1px solid var(--gray-200)', overflow: 'hidden', boxShadow: '0 4px 12px rgba(0,0,0,0.02)' }}>
    <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--gray-200)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px', backgroundColor: '#FAFAFA' }}>
      <div className="skeleton" style={{ width: '320px', maxWidth: '100%', height: '40px', borderRadius: '8px' }} />
      <div className="skeleton" style={{ width: '200px', height: '40px', borderRadius: '8px' }} />
    </div>
    <div style={{ overflowX: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr style={{ borderBottom: '1px solid var(--gray-200)', backgroundColor: 'white' }}>
            <th style={{ padding: '16px 24px', textAlign: 'left', color: 'var(--text-light)', fontWeight: 600, fontSize: '0.85rem' }}>ผู้ใช้งาน</th>
            <th style={{ padding: '16px 24px', textAlign: 'left', color: 'var(--text-light)', fontWeight: 600, fontSize: '0.85rem' }}>อีเมล</th>
            <th style={{ padding: '16px 24px', textAlign: 'left', color: 'var(--text-light)', fontWeight: 600, fontSize: '0.85rem' }}>สิทธิ์ปัจจุบัน</th>
            <th style={{ padding: '16px 24px', textAlign: 'left', color: 'var(--text-light)', fontWeight: 600, fontSize: '0.85rem', width: '200px' }}>จัดการ</th>
          </tr>
        </thead>
        <tbody>
          {[1, 2, 3, 4, 5].map(i => (
            <tr key={i} style={{ borderBottom: '1px solid var(--gray-100)' }}>
              <td style={{ padding: '16px 24px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div className="skeleton skeleton-circle" style={{ width: '36px', height: '36px', flexShrink: 0 }} />
                  <div className="skeleton skeleton-text" style={{ width: `${90 + (i % 3) * 25}px` }} />
                </div>
              </td>
              <td style={{ padding: '16px 24px' }}>
                <div className="skeleton skeleton-text" style={{ width: `${140 + (i % 2) * 40}px` }} />
              </td>
              <td style={{ padding: '16px 24px' }}>
                <div className="skeleton" style={{ width: '76px', height: '24px', borderRadius: '6px' }} />
              </td>
              <td style={{ padding: '12px 24px' }}>
                <div className="skeleton" style={{ width: '110px', height: '34px', borderRadius: '8px' }} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  </div>
);

const ApprovalsTabSkeleton = () => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
    {[1, 2].map(i => (
      <div key={i} style={{ 
        backgroundColor: 'var(--surface)', borderRadius: '16px', padding: '24px', 
        boxShadow: '0 8px 24px rgba(0,0,0,0.06)', border: '1px solid rgba(249,168,38,0.2)',
        display: 'flex', flexDirection: 'column', gap: '16px' 
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px' }}>
          <div style={{ flex: '1 1 300px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
              <div className="skeleton" style={{ width: '48px', height: '48px', borderRadius: '10px', flexShrink: 0 }} />
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <div className="skeleton skeleton-text" style={{ width: '180px', height: '18px' }} />
                <div className="skeleton skeleton-text" style={{ width: '120px', height: '12px' }} />
              </div>
            </div>
            
            <div style={{ display: 'grid', gridTemplateColumns: '100px 1fr', gap: '10px 16px' }}>
              {[1, 2, 3, 4, 5].map(j => (
                <React.Fragment key={j}>
                  <div className="skeleton skeleton-text" style={{ width: '70px' }} />
                  <div className="skeleton skeleton-text" style={{ width: `${140 + (j % 3) * 35}px` }} />
                </React.Fragment>
              ))}
            </div>
          </div>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', width: '100%', maxWidth: '240px' }}>
            <div className="skeleton" style={{ width: '100%', height: '44px', borderRadius: '12px' }} />
            <div className="skeleton" style={{ width: '100%', height: '44px', borderRadius: '12px' }} />
            <div className="skeleton" style={{ width: '100%', height: '44px', borderRadius: '12px' }} />
          </div>
        </div>
      </div>
    ))}
  </div>
);

const DonationsTabSkeleton = () => (
  <>
    <div className="admin-kpi-grid" style={{ marginBottom: '18px' }}>
      <div className="admin-kpi-card">
        <div className="admin-kpi-icon-wrap" style={{ background: '#ECFDF5' }}>
          <Banknote size={20} color="#059669" />
        </div>
        <div className="skeleton" style={{ width: '80px', height: '24px', borderRadius: '6px', margin: '4px 0' }} />
        <span className="admin-kpi-label">ยอดแจ้งบริจาครวม</span>
      </div>
      <div className="admin-kpi-card">
        <div className="admin-kpi-icon-wrap" style={{ background: '#FEF3C7' }}>
          <PiggyBank size={20} color="#D97706" />
        </div>
        <div className="skeleton" style={{ width: '48px', height: '24px', borderRadius: '6px', margin: '4px 0' }} />
        <span className="admin-kpi-label">รายการแจ้งโอนทั้งหมด</span>
      </div>
      <div className="admin-kpi-card">
        <div className="admin-kpi-icon-wrap" style={{ background: '#EFF6FF' }}>
          <FileCheck size={20} color="#2563EB" />
        </div>
        <div className="skeleton" style={{ width: '48px', height: '24px', borderRadius: '6px', margin: '4px 0' }} />
        <span className="admin-kpi-label">แนบหลักฐานสลิป</span>
      </div>
    </div>

    <div style={{ backgroundColor: 'white', borderRadius: '16px', border: '1px solid var(--gray-200)', boxShadow: '0 4px 12px rgba(0,0,0,0.02)', overflow: 'hidden' }}>
      <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--gray-200)', backgroundColor: '#FAFAFA' }}>
        <div className="skeleton" style={{ width: '280px', maxWidth: '100%', height: '38px', borderRadius: '8px' }} />
      </div>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
        <thead style={{ backgroundColor: '#FAFAFA', borderBottom: '1px solid var(--gray-200)' }}>
          <tr style={{ textAlign: 'left' }}>
            <th style={{ padding: '14px 16px', color: 'var(--text-light)', fontWeight: 600, fontSize: '0.84rem' }}>วันที่แจ้งโอน</th>
            <th style={{ padding: '14px 18px', color: 'var(--text-light)', fontWeight: 600, fontSize: '0.84rem' }}>ผู้บริจาค</th>
            <th style={{ padding: '14px 18px', color: 'var(--text-light)', fontWeight: 600, fontSize: '0.84rem' }}>ยอดเงิน</th>
            <th style={{ padding: '14px 18px', color: 'var(--text-light)', fontWeight: 600, fontSize: '0.84rem' }}>บริจาคให้</th>
            <th style={{ padding: '14px 18px', color: 'var(--text-light)', fontWeight: 600, fontSize: '0.84rem', textAlign: 'center' }}>หลักฐานสลิป</th>
          </tr>
        </thead>
        <tbody>
          {[1, 2, 3, 4, 5].map(i => (
            <tr key={i} style={{ borderBottom: '1px solid var(--gray-100)' }}>
              <td style={{ padding: '14px 18px' }}><div className="skeleton skeleton-text" style={{ width: '110px' }} /></td>
              <td style={{ padding: '14px 18px' }}>
                <div className="skeleton skeleton-text" style={{ width: '120px', height: '16px' }} />
                <div className="skeleton skeleton-text" style={{ width: '150px', height: '12px', marginTop: '4px' }} />
              </td>
              <td style={{ padding: '14px 18px' }}><div className="skeleton skeleton-text" style={{ width: '70px', height: '18px' }} /></td>
              <td style={{ padding: '14px 18px' }}><div className="skeleton skeleton-text" style={{ width: '100px' }} /></td>
              <td style={{ padding: '14px 18px', textAlign: 'center' }}><div className="skeleton" style={{ width: '75px', height: '28px', borderRadius: '6px', margin: '0 auto' }} /></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  </>
);

const IncidentsTabSkeleton = () => (
  <div style={{ backgroundColor: 'white', borderRadius: '16px', border: '1px solid var(--gray-200)', overflow: 'hidden' }}>
    <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--gray-200)', backgroundColor: '#FAFAFA' }}>
      <div className="skeleton" style={{ width: '300px', height: '36px', borderRadius: '8px' }} />
    </div>
    {[1, 2, 3].map(i => (
      <div key={i} style={{ padding: '20px 24px', borderBottom: '1px solid #E5E7EB', display: 'flex', gap: '20px' }}>
        <div className="skeleton" style={{ width: '90px', height: '90px', borderRadius: '12px', flexShrink: 0 }} />
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <div className="skeleton skeleton-text" style={{ width: '140px', height: '20px' }} />
          <div className="skeleton skeleton-text" style={{ width: '80%', height: '16px' }} />
          <div className="skeleton skeleton-text" style={{ width: '50%', height: '14px' }} />
        </div>
        <div className="skeleton" style={{ width: '160px', height: '80px', borderRadius: '8px', flexShrink: 0 }} />
      </div>
    ))}
  </div>
);

const SupportChatSkeleton = () => (
  <div style={{ display: 'flex', gap: '24px', height: '600px' }}>
    <div style={{ width: '320px', backgroundColor: 'white', borderRadius: '16px', border: '1px solid var(--gray-200)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <div style={{ padding: '16px', borderBottom: '1px solid var(--gray-200)', backgroundColor: 'var(--gray-50)' }}>
        <div className="skeleton skeleton-text" style={{ width: '120px', height: '18px' }} />
      </div>
      <div style={{ flex: 1, padding: '8px' }}>
        {[1, 2, 3, 4].map(i => (
          <div key={i} style={{ padding: '12px', display: 'flex', alignItems: 'center', gap: '12px', borderBottom: '1px solid var(--gray-100)' }}>
            <div className="skeleton skeleton-circle" style={{ width: '40px', height: '40px', flexShrink: 0 }} />
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <div className="skeleton skeleton-text" style={{ width: `${80 + (i % 3) * 20}px` }} />
              <div className="skeleton skeleton-text" style={{ width: '60px', height: '10px' }} />
            </div>
          </div>
        ))}
      </div>
    </div>
    <div style={{ flex: 1, backgroundColor: 'white', borderRadius: '16px', border: '1px solid var(--gray-200)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <div style={{ padding: '16px 24px', borderBottom: '1px solid var(--gray-200)', backgroundColor: 'var(--gray-50)', display: 'flex', alignItems: 'center', gap: '12px' }}>
        <div className="skeleton skeleton-circle" style={{ width: '22px', height: '22px' }} />
        <div className="skeleton skeleton-text" style={{ width: '80px', height: '16px' }} />
      </div>
      <div style={{ flex: 1, padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px', backgroundColor: '#fdfdfd' }}>
        <SupportChatMessagesSkeleton />
      </div>
    </div>
  </div>
);

const SupportChatMessagesSkeleton = () => (
  <div style={{ flex: 1, minHeight: '280px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '12px', padding: '40px 0' }}>
    <div style={{
      width: '44px',
      height: '44px',
      borderRadius: '50%',
      backgroundColor: '#FFFFFF',
      boxShadow: '0 4px 12px rgba(0,0,0,0.06)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      border: '1px solid #F3F4F6'
    }}>
      <div style={{
        width: '20px',
        height: '20px',
        border: '2.5px solid #F3F4F6',
        borderTopColor: 'var(--primary, #D97706)',
        borderRadius: '50%',
        animation: 'spin 0.8s linear infinite'
      }} />
    </div>
    <span style={{ fontSize: '0.84rem', color: '#9CA3AF', fontWeight: 500 }}>
      กำลังโหลดข้อความ...
    </span>
  </div>
);

const ReportsTableSkeleton = () => (
  <div style={{ backgroundColor: 'white', borderRadius: '16px', border: '1px solid var(--gray-200)', overflow: 'hidden' }}>
    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
      <thead>
        <tr style={{ backgroundColor: 'var(--gray-50)', borderBottom: '1px solid var(--gray-200)' }}>
          <th style={{ padding: '16px', textAlign: 'left', color: 'var(--text-medium)', fontWeight: 600, fontSize: '0.85rem' }}>วันที่</th>
          <th style={{ padding: '16px', textAlign: 'left', color: 'var(--text-medium)', fontWeight: 600, fontSize: '0.85rem' }}>ผู้รายงาน</th>
          <th style={{ padding: '16px', textAlign: 'left', color: 'var(--text-medium)', fontWeight: 600, fontSize: '0.85rem' }}>ผู้ถูกรายงาน</th>
          <th style={{ padding: '16px', textAlign: 'left', color: 'var(--text-medium)', fontWeight: 600, fontSize: '0.85rem' }}>เหตุผล</th>
          <th style={{ padding: '16px', textAlign: 'left', color: 'var(--text-medium)', fontWeight: 600, fontSize: '0.85rem' }}>สถานะ</th>
          <th style={{ padding: '16px', textAlign: 'left', color: 'var(--text-medium)', fontWeight: 600, fontSize: '0.85rem' }}>จัดการ</th>
        </tr>
      </thead>
      <tbody>
        {[1, 2, 3, 4].map(i => (
          <tr key={i} style={{ borderBottom: '1px solid var(--gray-100)' }}>
            <td style={{ padding: '16px' }}><div className="skeleton skeleton-text" style={{ width: '110px' }} /></td>
            <td style={{ padding: '16px' }}><div className="skeleton skeleton-text" style={{ width: '100px' }} /></td>
            <td style={{ padding: '16px' }}><div className="skeleton skeleton-text" style={{ width: '100px' }} /></td>
            <td style={{ padding: '16px' }}><div className="skeleton skeleton-text" style={{ width: '130px' }} /></td>
            <td style={{ padding: '16px' }}><div className="skeleton" style={{ width: '85px', height: '28px', borderRadius: '6px' }} /></td>
            <td style={{ padding: '16px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <div className="skeleton" style={{ width: '70px', height: '26px', borderRadius: '8px' }} />
                <div className="skeleton" style={{ width: '70px', height: '26px', borderRadius: '8px' }} />
              </div>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  </div>
);

const AuditLogsSkeleton = () => (
  <div style={{ backgroundColor: 'white', borderRadius: '16px', boxShadow: '0 4px 16px rgba(0,0,0,0.04)', overflow: 'hidden' }}>
    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
      <thead>
        <tr style={{ backgroundColor: 'var(--gray-50)', borderBottom: '2px solid var(--gray-200)', textAlign: 'left' }}>
          <th style={{ padding: '16px' }}>เวลา</th>
          <th style={{ padding: '16px' }}>แอดมิน</th>
          <th style={{ padding: '16px' }}>การกระทำ</th>
          <th style={{ padding: '16px' }}>รายละเอียด</th>
        </tr>
      </thead>
      <tbody>
        {[1, 2, 3, 4, 5].map(i => (
          <tr key={i} style={{ borderBottom: '1px solid var(--gray-100)' }}>
            <td style={{ padding: '16px' }}><div className="skeleton skeleton-text" style={{ width: '120px' }} /></td>
            <td style={{ padding: '16px' }}><div className="skeleton skeleton-text" style={{ width: '100px' }} /></td>
            <td style={{ padding: '16px' }}><div className="skeleton" style={{ width: '110px', height: '24px', borderRadius: '4px' }} /></td>
            <td style={{ padding: '16px' }}>
              <div className="skeleton skeleton-text" style={{ width: '160px', marginBottom: '6px' }} />
              <div className="skeleton skeleton-text" style={{ width: '220px', height: '11px' }} />
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  </div>
);

const ChatModalSkeleton = () => (
  <div style={{ minHeight: '260px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '12px', padding: '40px 0' }}>
    <div style={{
      width: '44px',
      height: '44px',
      borderRadius: '50%',
      backgroundColor: '#FFFFFF',
      boxShadow: '0 4px 12px rgba(0,0,0,0.06)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      border: '1px solid #F3F4F6'
    }}>
      <div style={{
        width: '20px',
        height: '20px',
        border: '2.5px solid #F3F4F6',
        borderTopColor: 'var(--primary, #D97706)',
        borderRadius: '50%',
        animation: 'spin 0.8s linear infinite'
      }} />
    </div>
    <span style={{ fontSize: '0.84rem', color: '#9CA3AF', fontWeight: 500 }}>
      กำลังโหลดประวัติการสนทนา...
    </span>
  </div>
);

export default AdminDashboard;
