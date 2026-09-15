import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  AlertTriangle, MapPin, Camera, CheckCircle2, Clock, Send, ShieldAlert, 
  Dog, Cat, Heart, Compass, Phone, User, Image as ImageIcon, X, ChevronRight, 
  Info, Sparkles, ArrowRight, History, ShieldCheck, Check
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { supabase } from '../services/supabaseClient';
import { getAddressFromCoordinates } from '../lib/geo';
import { Link } from 'react-router-dom';

function IncidentReport() {
  const { user, profile } = useAuth();

  // Active view: 'form' | 'history'
  const [activeTab, setActiveTab] = useState('form');

  // Incident Form States
  const [animalType, setAnimalType] = useState('dog');
  const [symptoms, setSymptoms] = useState('');
  const [urgencyLevel, setUrgencyLevel] = useState('urgent'); // 'critical' | 'urgent' | 'normal'
  const [locationText, setLocationText] = useState('');
  const [coordinates, setCoordinates] = useState(null);
  const [isGettingLocation, setIsGettingLocation] = useState(false);
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [reporterName, setReporterName] = useState('');
  const [reporterPhone, setReporterPhone] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submittedReport, setSubmittedReport] = useState(null);

  // Statistics & History States (cached in sessionStorage to prevent 0 flicker on mount)
  const [incidentStats, setIncidentStats] = useState(() => {
    try {
      const cached = sessionStorage.getItem('cached_incident_stats');
      if (cached) {
        const parsed = JSON.parse(cached);
        if (typeof parsed?.inProgress === 'number' && typeof parsed?.resolved === 'number') {
          return parsed;
        }
      }
    } catch (e) {}
    return null;
  });
  const [userReports, setUserReports] = useState([]);
  const [loadingReports, setLoadingReports] = useState(false);

  const fileInputRef = useRef(null);

  // Pre-fill user profile info if logged in
  useEffect(() => {
    if (user) {
      if (!reporterName) {
        setReporterName(profile?.full_name || user?.user_metadata?.full_name || '');
      }
      if (!reporterPhone && profile?.phone) {
        setReporterPhone(formatPhoneNumber(profile.phone));
      }
    }
  }, [user, profile]);

  // Fetch real-time rescue stats
  useEffect(() => {
    let channel = null;
    const fetchStats = async () => {
      try {
        const stats = await api.getIncidentStats();
        setIncidentStats(stats);
        try {
          sessionStorage.setItem('cached_incident_stats', JSON.stringify(stats));
        } catch (e) {}
      } catch (err) {
        console.warn('Error fetching incident stats:', err);
      }
    };
    fetchStats();

    if (supabase) {
      channel = supabase
        .channel('realtime_incident_stats_page')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'incident_reports' }, () => {
          fetchStats();
        })
        .subscribe();
    }

    return () => {
      if (channel && supabase) {
        supabase.removeChannel(channel);
      }
    };
  }, [submittedReport]);

  // Fetch user's reported incidents history
  useEffect(() => {
    if (!user) return;
    const fetchMyReports = async () => {
      setLoadingReports(true);
      try {
        if (!supabase) {
          setUserReports([]);
          return;
        }
        const { data, error } = await supabase
          .from('incident_reports')
          .select('*')
          .eq('reporter_id', user.id)
          .order('created_at', { ascending: false });

        if (!error && data) {
          setUserReports(data);
        }
      } catch (err) {
        console.warn('Error fetching user reports:', err);
      } finally {
        setLoadingReports(false);
      }
    };

    fetchMyReports();
  }, [user, submittedReport]);

  // Phone number auto-formatter (e.g. 081-234-5678 or 02-123-4567)
  const formatPhoneNumber = (val) => {
    if (!val) return '';
    const digits = val.replace(/\D/g, '').slice(0, 10);
    if (digits.startsWith('02')) {
      if (digits.length <= 2) return digits;
      if (digits.length <= 5) return `${digits.slice(0, 2)}-${digits.slice(2)}`;
      return `${digits.slice(0, 2)}-${digits.slice(2, 5)}-${digits.slice(5)}`;
    } else {
      if (digits.length <= 3) return digits;
      if (digits.length <= 6) return `${digits.slice(0, 3)}-${digits.slice(3)}`;
      return `${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6)}`;
    }
  };

  // GPS auto-detection
  const handleGetLocation = () => {
    if (!navigator.geolocation) {
      alert('เบราว์เซอร์ของคุณไม่รองรับการดึงพิกัด GPS อัตโนมัติ');
      return;
    }

    setIsGettingLocation(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude } = pos.coords;
        setCoordinates({ latitude, longitude });

        let resolvedAddress = '';
        try {
          const rev = await getAddressFromCoordinates(latitude, longitude);
          if (rev && rev.formattedAddress) {
            resolvedAddress = rev.formattedAddress;
          }
        } catch (e) {
          console.warn('Reverse geocode error:', e);
        }

        if (resolvedAddress) {
          setLocationText(resolvedAddress);
        } else {
          setLocationText(`พิกัด GPS: ${latitude.toFixed(5)}, ${longitude.toFixed(5)}`);
        }
        setIsGettingLocation(false);
      },
      (err) => {
        setIsGettingLocation(false);
        console.warn('Geolocation error:', err);
        alert('ไม่สามารถดึงพิกัดอัตโนมัติได้ กรุณาเปิดสิทธิ์ GPS หรือพิมพ์ระบุสถานที่พบเห็น');
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  // Image upload handling
  const handleImageSelect = (e) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setImageFile(file);
      setImagePreview(URL.createObjectURL(file));
    }
  };

  const removeImage = () => {
    setImageFile(null);
    setImagePreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Submit report
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!symptoms.trim() || !locationText.trim()) {
      alert('กรุณากรอกอาการที่พบและระบุสถานที่พบเห็น');
      return;
    }
    const cleanPhone = reporterPhone.replace(/\D/g, '');
    if (cleanPhone.length < 9 || cleanPhone.length > 10) {
      alert('กรุณากรอกเบอร์โทรศัพท์ที่ถูกต้อง (9 หรือ 10 หลัก) เพื่อให้ทีมงานติดต่อกลับได้');
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await api.submitIncidentReport({
        userId: user?.id,
        animalType,
        symptoms: urgencyLevel === 'critical' ? `[ฉุกเฉินวิกฤต] ${symptoms}` : symptoms,
        locationText,
        latitude: coordinates?.latitude,
        longitude: coordinates?.longitude,
        reporterName: reporterName.trim() || 'ผู้แจ้งไม่ประสงค์ออกนาม',
        reporterPhone
      }, imageFile);

      setSubmittedReport(result || { id: 'temp_' + Date.now() });
      // Reset form
      setSymptoms('');
      setLocationText('');
      setCoordinates(null);
      setImageFile(null);
      setImagePreview(null);
    } catch (err) {
      console.error('Report submit error:', err);
      alert('เกิดข้อผิดพลาดในการส่งข้อมูล กรุณาลองใหม่อีกครั้ง');
    } finally {
      setIsSubmitting(false);
    }
  };

  const statusLabels = {
    pending: { label: 'รอความช่วยเหลือ', bg: '#FEF2F2', text: '#DC2626', border: '#FCA5A5' },
    in_progress: { label: 'กำลังเข้าช่วยเหลือ', bg: '#EFF6FF', text: '#2563EB', border: '#BFDBFE' },
    resolved: { label: 'ช่วยเหลือสำเร็จแล้ว', bg: '#ECFDF5', text: '#059669', border: '#A7F3D0' },
    cancelled: { label: 'ยกเลิกเคส', bg: '#F3F4F6', text: '#6B7280', border: '#E5E7EB' }
  };

  return (
    <div style={{
      minHeight: '100dvh',
      backgroundColor: '#FAF8F5',
      fontFamily: 'Prompt, sans-serif',
      padding: '24px 16px 100px',
      boxSizing: 'border-box'
    }}>
      <div style={{ maxWidth: '860px', margin: '0 auto', width: '100%' }}>
        
        {/* Top Header Card */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2 }}
          style={{
            backgroundColor: '#FFFFFF',
            borderRadius: '16px',
            border: '1px solid #E5E7EB',
            padding: '20px 24px',
            marginBottom: '16px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
            display: 'flex',
            alignItems: 'center',
            gap: '14px'
          }}
        >
          <div style={{
            width: '46px',
            height: '46px',
            borderRadius: '12px',
            backgroundColor: '#FEF2F2',
            color: '#DC2626',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0
          }}>
            <AlertTriangle size={24} />
          </div>
          <div>
            <h1 style={{ margin: '0 0 4px', fontSize: '1.35rem', fontWeight: 700, color: '#111827', letterSpacing: '-0.02em' }}>
              แจ้งเหตุกู้ภัยสัตว์จรจัด
            </h1>
            <p style={{ margin: 0, color: '#6B7280', fontSize: '0.875rem' }}>
              พบเจอน้องหมาหรือน้องแมวเจ็บป่วย บาดเจ็บ หรือต้องการความช่วยเหลือ ปักหมุดแจ้งทีมงานได้ทันที
            </p>
          </div>
        </motion.div>

        {/* Tab Switcher & Live Stats Row (Left Tabs + Right Stats) */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25, delay: 0.05 }}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '12px',
            marginBottom: '20px'
          }}
        >
          {/* Navigation Tabs between Form & My History */}
          <div style={{
            display: 'flex',
            backgroundColor: '#F3F4F6',
            padding: '4px',
            borderRadius: '12px',
            border: '1px solid #E5E7EB',
            width: '100%',
            maxWidth: '380px'
          }}>
            <button
              type="button"
              onClick={() => setActiveTab('form')}
              style={{
                flex: 1,
                padding: '9px 16px',
                borderRadius: '8px',
                border: 'none',
                backgroundColor: activeTab === 'form' ? '#FFFFFF' : 'transparent',
                color: activeTab === 'form' ? '#DC2626' : '#6B7280',
                fontWeight: activeTab === 'form' ? 700 : 500,
                fontSize: '0.88rem',
                cursor: 'pointer',
                boxShadow: activeTab === 'form' ? '0 1px 3px rgba(0,0,0,0.06)' : 'none',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
                transition: 'all 0.15s ease'
              }}
            >
              <AlertTriangle size={15} />
              <span>แจ้งเหตุใหม่</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('history')}
              style={{
                flex: 1,
                padding: '9px 16px',
                borderRadius: '8px',
                border: 'none',
                backgroundColor: activeTab === 'history' ? '#FFFFFF' : 'transparent',
                color: activeTab === 'history' ? '#111827' : '#6B7280',
                fontWeight: activeTab === 'history' ? 700 : 500,
                fontSize: '0.88rem',
                cursor: 'pointer',
                boxShadow: activeTab === 'history' ? '0 1px 3px rgba(0,0,0,0.06)' : 'none',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
                transition: 'all 0.15s ease'
              }}
            >
              <History size={15} />
              <span>ประวัติเคสของฉัน</span>
              {userReports.length > 0 && (
                <span style={{
                  backgroundColor: activeTab === 'history' ? '#DC2626' : '#E5E7EB',
                  color: activeTab === 'history' ? '#FFFFFF' : '#4B5563',
                  fontSize: '0.72rem',
                  fontWeight: 700,
                  padding: '1px 6px',
                  borderRadius: '9999px',
                  marginLeft: '2px'
                }}>
                  {userReports.length}
                </span>
              )}
            </button>
          </div>

          {/* Rescue Live Stats Pill (Right Aligned) */}
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '12px',
            padding: '7px 16px',
            borderRadius: '12px',
            backgroundColor: '#FFFFFF',
            border: '1px solid #E5E7EB',
            boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
            fontSize: '0.825rem'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#DC2626', flexShrink: 0 }} />
              <span style={{ color: '#4B5563' }}>กำลังช่วย:</span>
              <strong style={{ color: '#DC2626', minWidth: '36px', display: 'inline-flex', alignItems: 'center' }}>
                {incidentStats?.inProgress != null ? (
                  <motion.span
                    key={incidentStats.inProgress}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.2 }}
                  >
                    {incidentStats.inProgress} เคส
                  </motion.span>
                ) : (
                  <span className="skeleton" style={{ width: '34px', height: '14px', borderRadius: '4px', display: 'inline-block' }} />
                )}
              </strong>
            </div>
            <div style={{ width: '1px', height: '14px', backgroundColor: '#E5E7EB' }} />
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <CheckCircle2 size={14} color="#059669" style={{ flexShrink: 0 }} />
              <span style={{ color: '#4B5563' }}>ช่วยสำเร็จ:</span>
              <strong style={{ color: '#059669', minWidth: '36px', display: 'inline-flex', alignItems: 'center' }}>
                {incidentStats?.resolved != null ? (
                  <motion.span
                    key={incidentStats.resolved}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.2 }}
                  >
                    {incidentStats.resolved} เคส
                  </motion.span>
                ) : (
                  <span className="skeleton" style={{ width: '34px', height: '14px', borderRadius: '4px', display: 'inline-block' }} />
                )}
              </strong>
            </div>
          </div>
        </motion.div>
        {activeTab === 'form' ? (
          <>
            {/* Submitted Success Notice Modal / Card */}
            {submittedReport ? (
              <motion.div
                initial={{ opacity: 0, scale: 0.96 }}
                animate={{ opacity: 1, scale: 1 }}
                style={{
                  backgroundColor: '#FFFFFF',
                  borderRadius: '20px',
                  border: '1px solid #BBF7D0',
                  padding: '36px 24px',
                  textAlign: 'center',
                  boxShadow: '0 8px 24px rgba(5, 150, 105, 0.08)',
                  maxWidth: '540px',
                  margin: '0 auto 24px'
                }}
              >
                <div style={{
                  width: '64px',
                  height: '64px',
                  borderRadius: '50%',
                  backgroundColor: '#ECFDF5',
                  color: '#059669',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginBottom: '16px'
                }}>
                  <CheckCircle2 size={36} />
                </div>
                <h2 style={{ fontSize: '1.35rem', fontWeight: 800, color: '#065F46', margin: '0 0 8px' }}>
                  ส่งข้อมูลแจ้งเหตุกู้ภัยสำเร็จแล้ว
                </h2>
                <p style={{ color: '#4B5563', fontSize: '0.9rem', lineHeight: 1.55, margin: '0 0 24px' }}>
                  ระบบได้ส่งข้อมูลพิกัดและอาการของสัตว์ไปยังทีมงานกู้ภัยและศูนย์พักพิงในพื้นที่เรียบร้อยแล้ว ทีมงานจะเร่งประสานงานและเข้าตรวจสอบโดยเร็วที่สุด
                </p>

                <div style={{ display: 'flex', gap: '10px', justifyContent: 'center', flexWrap: 'wrap' }}>
                  <button
                    type="button"
                    onClick={() => {
                      setSubmittedReport(null);
                      setActiveTab('history');
                    }}
                    style={{
                      padding: '10px 20px',
                      borderRadius: '10px',
                      border: '1px solid #D1D5DB',
                      backgroundColor: '#FFFFFF',
                      color: '#374151',
                      fontWeight: 600,
                      fontSize: '0.88rem',
                      cursor: 'pointer'
                    }}
                  >
                    ติดตามสถานะเคสนี้
                  </button>
                  <button
                    type="button"
                    onClick={() => setSubmittedReport(null)}
                    style={{
                      padding: '10px 22px',
                      borderRadius: '10px',
                      border: 'none',
                      backgroundColor: '#DC2626',
                      color: '#FFFFFF',
                      fontWeight: 600,
                      fontSize: '0.88rem',
                      cursor: 'pointer',
                      boxShadow: '0 2px 8px rgba(220, 38, 38, 0.25)'
                    }}
                  >
                    แจ้งเหตุเคสอื่นเพิ่ม
                  </button>
                </div>
              </motion.div>
            ) : (
              /* Emergency Reporting Form */
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.25, delay: 0.1 }}
                style={{
                  backgroundColor: '#FFFFFF',
                  borderRadius: '16px',
                  border: '1px solid #E5E7EB',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
                  overflow: 'hidden'
                }}
              >
                {/* 3 Step Minimal Stepper Header */}
                <div style={{
                  backgroundColor: '#FFFFFF',
                  borderBottom: '1px solid #F3F4F6',
                  padding: '16px 20px'
                }}>
                  <div style={{ 
                    display: 'grid', 
                    gridTemplateColumns: 'repeat(3, 1fr)', 
                    gap: '10px' 
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{
                        width: '26px',
                        height: '26px',
                        borderRadius: '8px',
                        backgroundColor: '#FEF2F2',
                        color: '#DC2626',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '0.78rem',
                        fontWeight: 700,
                        flexShrink: 0
                      }}>1</span>
                      <span style={{ fontSize: '0.82rem', color: '#111827', fontWeight: 600 }}>
                        ประเภท & อาการ
                      </span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{
                        width: '26px',
                        height: '26px',
                        borderRadius: '8px',
                        backgroundColor: '#F3F4F6',
                        color: '#6B7280',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '0.78rem',
                        fontWeight: 700,
                        flexShrink: 0
                      }}>2</span>
                      <span style={{ fontSize: '0.82rem', color: '#6B7280', fontWeight: 500 }}>
                        พิกัด & ภาพถ่าย
                      </span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{
                        width: '26px',
                        height: '26px',
                        borderRadius: '8px',
                        backgroundColor: '#F3F4F6',
                        color: '#6B7280',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '0.78rem',
                        fontWeight: 700,
                        flexShrink: 0
                      }}>3</span>
                      <span style={{ fontSize: '0.82rem', color: '#6B7280', fontWeight: 500 }}>
                        ข้อมูลผู้แจ้ง
                      </span>
                    </div>
                  </div>
                </div>

                {/* Form Body */}
                <form onSubmit={handleSubmit} style={{ padding: '24px 20px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
                  
                  {/* Animal Type Selection */}
                  <div>
                    <label style={{ display: 'block', fontWeight: 700, fontSize: '0.92rem', color: '#1F2937', marginBottom: '8px' }}>
                      ประเภทสัตว์ที่พบเห็น <span style={{ color: '#DC2626' }}>*</span>
                    </label>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px' }}>
                      {[
                        { id: 'dog', label: 'สุนัข', icon: <Dog size={18} /> },
                        { id: 'cat', label: 'แมว', icon: <Cat size={18} /> },
                        { id: 'other', label: 'สัตว์อื่นๆ', icon: <Heart size={18} /> }
                      ].map((item) => {
                        const isSelected = animalType === item.id;
                        return (
                          <button
                            key={item.id}
                            type="button"
                            onClick={() => setAnimalType(item.id)}
                            style={{
                              display: 'flex',
                              flexDirection: 'column',
                              alignItems: 'center',
                              justifyContent: 'center',
                              gap: '6px',
                              padding: '12px 8px',
                              borderRadius: '12px',
                              border: isSelected ? '2px solid #DC2626' : '2px solid #E5E7EB',
                              backgroundColor: isSelected ? '#FEF2F2' : '#FFFFFF',
                              color: isSelected ? '#DC2626' : '#4B5563',
                              fontWeight: isSelected ? 700 : 500,
                              fontSize: '0.88rem',
                              cursor: 'pointer',
                              boxSizing: 'border-box',
                              transition: 'background-color 0.15s ease, border-color 0.15s ease, color 0.15s ease'
                            }}
                          >
                            {item.icon}
                            <span>{item.label}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Urgency Level */}
                  <div>
                    <label style={{ display: 'block', fontWeight: 700, fontSize: '0.92rem', color: '#1F2937', marginBottom: '8px' }}>
                      ระดับความเร่งด่วน
                    </label>
                    <div style={{ display: 'flex', gap: '10px' }}>
                      {[
                        { id: 'critical', label: 'วิกฤต (เลือดออก/โดนชน)', color: '#DC2626', bg: '#FEF2F2' },
                        { id: 'urgent', label: 'เร่งด่วน (บาดเจ็บ/ป่วย)', color: '#D97706', bg: '#FFFBEB' },
                        { id: 'normal', label: 'ปกติ (สัตว์จรจัดไร้บ้าน)', color: '#2563EB', bg: '#EFF6FF' }
                      ].map((u) => {
                        const isSelected = urgencyLevel === u.id;
                        return (
                          <button
                            key={u.id}
                            type="button"
                            onClick={() => setUrgencyLevel(u.id)}
                            style={{
                              flex: 1,
                              padding: '9px 10px',
                              borderRadius: '10px',
                              border: isSelected ? `2px solid ${u.color}` : '2px solid #E5E7EB',
                              backgroundColor: isSelected ? u.bg : '#FFFFFF',
                              color: isSelected ? u.color : '#4B5563',
                              fontWeight: isSelected ? 700 : 500,
                              fontSize: '0.8rem',
                              cursor: 'pointer',
                              textAlign: 'center',
                              boxSizing: 'border-box',
                              transition: 'background-color 0.15s ease, border-color 0.15s ease, color 0.15s ease'
                            }}
                          >
                            {u.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Symptoms & Condition */}
                  <div>
                    <label style={{ display: 'block', fontWeight: 700, fontSize: '0.92rem', color: '#1F2937', marginBottom: '8px' }}>
                      อาการและสภาพที่พบเห็น <span style={{ color: '#DC2626' }}>*</span>
                    </label>
                    <textarea
                      rows={3}
                      value={symptoms}
                      onChange={(e) => setSymptoms(e.target.value)}
                      placeholder="เช่น ขาหลังหัก ลุกเดินไม่ได้ โดนรถชน มีแผลเปิด หรือลูกสัตว์ตกลงไปในท่อระบายน้ำ..."
                      required
                      style={{
                        width: '100%',
                        padding: '12px 14px',
                        borderRadius: '12px',
                        border: '1px solid #D1D5DB',
                        fontSize: '0.9rem',
                        lineHeight: 1.5,
                        outline: 'none',
                        boxSizing: 'border-box',
                        resize: 'vertical'
                      }}
                    />
                  </div>

                  {/* Location & GPS Detection */}
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px', flexWrap: 'wrap', gap: '6px' }}>
                      <label style={{ fontWeight: 700, fontSize: '0.92rem', color: '#1F2937', margin: 0 }}>
                        สถานที่พบเห็น / พิกัด <span style={{ color: '#DC2626' }}>*</span>
                      </label>
                      <button
                        type="button"
                        onClick={handleGetLocation}
                        disabled={isGettingLocation}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '6px',
                          padding: '6px 12px',
                          borderRadius: '8px',
                          border: '1px solid #DC2626',
                          backgroundColor: '#FEF2F2',
                          color: '#DC2626',
                          fontWeight: 600,
                          fontSize: '0.8rem',
                          cursor: 'pointer'
                        }}
                      >
                        <Compass size={14} className={isGettingLocation ? 'spin' : ''} />
                        {isGettingLocation ? 'กำลังค้นหา GPS...' : 'ดึงพิกัด GPS ปัจจุบัน'}
                      </button>
                    </div>

                    <div style={{ position: 'relative' }}>
                      <MapPin size={18} style={{ position: 'absolute', left: '14px', top: '13px', color: '#DC2626' }} />
                      <input
                        type="text"
                        value={locationText}
                        onChange={(e) => setLocationText(e.target.value)}
                        placeholder="ระบุชื่อซอย ถนน จุดสังเกต เช่น ปากซอยสุขุมวิท 22 หน้าร้านสะดวกซื้อ..."
                        required
                        style={{
                          width: '100%',
                          height: '44px',
                          padding: '0 14px 0 42px',
                          borderRadius: '12px',
                          border: '1px solid #D1D5DB',
                          fontSize: '0.9rem',
                          outline: 'none',
                          boxSizing: 'border-box'
                        }}
                      />
                    </div>
                    {coordinates && (
                      <div style={{ fontSize: '0.78rem', color: '#059669', marginTop: '6px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <CheckCircle2 size={13} /> พิกัด GPS ยืนยันแล้ว: {coordinates.latitude.toFixed(5)}, {coordinates.longitude.toFixed(5)}
                      </div>
                    )}
                  </div>

                  {/* Photo Upload */}
                  <div>
                    <label style={{ display: 'block', fontWeight: 700, fontSize: '0.92rem', color: '#1F2937', marginBottom: '8px' }}>
                      ภาพถ่ายหน้างาน (ถ้ามี)
                    </label>
                    <input 
                      ref={fileInputRef}
                      type="file" 
                      accept="image/*" 
                      style={{ display: 'none' }} 
                      onChange={handleImageSelect}
                    />

                    {imagePreview ? (
                      <div style={{ position: 'relative', width: '100%', maxHeight: '240px', borderRadius: '14px', overflow: 'hidden', border: '1px solid #E5E7EB', backgroundColor: '#000000' }}>
                        <img 
                          src={imagePreview} 
                          alt="Incident Preview" 
                          style={{ width: '100%', maxHeight: '240px', objectFit: 'contain' }} 
                        />
                        <button
                          type="button"
                          onClick={removeImage}
                          style={{
                            position: 'absolute',
                            top: '10px',
                            right: '10px',
                            width: '32px',
                            height: '32px',
                            borderRadius: '50%',
                            backgroundColor: 'rgba(0,0,0,0.6)',
                            color: '#FFFFFF',
                            border: 'none',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            cursor: 'pointer'
                          }}
                        >
                          <X size={18} />
                        </button>
                      </div>
                    ) : (
                      <div
                        onClick={() => fileInputRef.current?.click()}
                        style={{
                          border: '2px dashed #D1D5DB',
                          borderRadius: '14px',
                          padding: '24px 16px',
                          textAlign: 'center',
                          backgroundColor: '#F9FAFB',
                          cursor: 'pointer',
                          transition: 'border-color 0.15s ease'
                        }}
                      >
                        <Camera size={32} color="#9CA3AF" style={{ margin: '0 auto 8px', display: 'block' }} />
                        <div style={{ fontWeight: 600, fontSize: '0.9rem', color: '#374151', marginBottom: '2px' }}>
                          กดเพื่อถ่ายภาพหรือเลือกรูปจากเครื่อง
                        </div>
                        <div style={{ fontSize: '0.78rem', color: '#9CA3AF' }}>
                          ภาพถ่ายช่วยให้ทีมกู้ภัยเตรียมอุปกรณ์และยารักษาได้อย่างถูกต้อง
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Reporter Contact Info */}
                  <div style={{ 
                    padding: '16px', 
                    borderRadius: '14px', 
                    backgroundColor: '#F9FAFB', 
                    border: '1px solid #E5E7EB',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '12px'
                  }}>
                    <div style={{ fontSize: '0.84rem', fontWeight: 700, color: '#374151' }}>
                      ข้อมูลติดต่อผู้แจ้ง (สำหรับประสานงานเมื่อทีมกู้ภัยถึงพื้นที่)
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '12px' }}>
                      <div>
                        <label style={{ display: 'block', fontSize: '0.8rem', color: '#6B7280', marginBottom: '4px' }}>
                          ชื่อผู้แจ้ง
                        </label>
                        <div style={{ position: 'relative' }}>
                          <User size={16} style={{ position: 'absolute', left: '12px', top: '12px', color: '#9CA3AF' }} />
                          <input
                            type="text"
                            value={reporterName}
                            onChange={(e) => setReporterName(e.target.value)}
                            placeholder="ชื่อของคุณ"
                            style={{
                              width: '100%',
                              height: '40px',
                              padding: '0 12px 0 36px',
                              borderRadius: '8px',
                              border: '1px solid #D1D5DB',
                              fontSize: '0.88rem',
                              boxSizing: 'border-box'
                            }}
                          />
                        </div>
                      </div>

                      <div>
                        <label style={{ display: 'block', fontSize: '0.8rem', color: '#6B7280', marginBottom: '4px' }}>
                          เบอร์โทรศัพท์ติดต่อเร่งด่วน <span style={{ color: '#DC2626' }}>*</span>
                        </label>
                        <div style={{ position: 'relative' }}>
                          <Phone size={16} style={{ position: 'absolute', left: '12px', top: '12px', color: '#DC2626' }} />
                          <input
                            type="tel"
                            value={reporterPhone}
                            onChange={(e) => setReporterPhone(formatPhoneNumber(e.target.value))}
                            placeholder="08x-xxx-xxxx"
                            required
                            style={{
                              width: '100%',
                              height: '40px',
                              padding: '0 12px 0 36px',
                              borderRadius: '8px',
                              border: '1px solid #D1D5DB',
                              fontSize: '0.88rem',
                              boxSizing: 'border-box'
                            }}
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Submit Button */}
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    style={{
                      width: '100%',
                      height: '48px',
                      borderRadius: '12px',
                      border: 'none',
                      backgroundColor: '#DC2626',
                      color: '#FFFFFF',
                      fontWeight: 700,
                      fontSize: '1rem',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '8px',
                      cursor: isSubmitting ? 'not-allowed' : 'pointer',
                      opacity: isSubmitting ? 0.7 : 1,
                      boxShadow: '0 4px 14px rgba(220, 38, 38, 0.28)',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    <Send size={18} />
                    {isSubmitting ? 'กำลังส่งข้อมูลแจ้งเหตุ...' : 'ส่งข้อมูลแจ้งเหตุกู้ภัยด่วน'}
                  </button>
                </form>
              </motion.div>
            )}
          </>
        ) : (
          /* User Reports History Tab */
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25, delay: 0.1 }}
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: '20px',
              border: '1px solid #E5E7EB',
              boxShadow: '0 4px 16px rgba(0,0,0,0.03)',
              overflow: 'hidden',
              padding: '20px'
            }}
          >
            <h2 style={{ fontSize: '1.15rem', fontWeight: 700, color: '#1F2937', margin: '0 0 16px' }}>
              ประวัติเคสที่คุณเคยแจ้ง
            </h2>

            {!user ? (
              <div style={{ textAlign: 'center', padding: '48px 16px', color: '#6B7280' }}>
                <ShieldAlert size={36} color="#9CA3AF" style={{ margin: '0 auto 12px', display: 'block' }} />
                <p style={{ margin: '0 0 14px', fontSize: '0.92rem' }}>กรุณาเข้าสู่ระบบเพื่อติดตามประวัติการแจ้งเหตุของคุณ</p>
                <Link
                  to="/login"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '8px 18px',
                    borderRadius: '8px',
                    backgroundColor: 'var(--primary, #D97706)',
                    color: '#FFFFFF',
                    fontWeight: 600,
                    fontSize: '0.85rem',
                    textDecoration: 'none'
                  }}
                >
                  เข้าสู่ระบบ
                </Link>
              </div>
            ) : loadingReports ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {[1, 2, 3].map(i => (
                  <div
                    key={i}
                    style={{
                      padding: '16px',
                      borderRadius: '14px',
                      border: '1px solid #E5E7EB',
                      backgroundColor: '#FFFFFF',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '12px'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        <div className="skeleton skeleton-text" style={{ width: '180px', height: '18px' }} />
                        <div className="skeleton skeleton-text" style={{ width: '90px', height: '12px' }} />
                      </div>
                      <div className="skeleton" style={{ width: '84px', height: '24px', borderRadius: '12px' }} />
                    </div>
                    <div className="skeleton skeleton-text" style={{ width: '85%', height: '14px' }} />
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '10px', borderTop: '1px solid #F3F4F6' }}>
                      <div className="skeleton skeleton-text" style={{ width: '140px', height: '14px' }} />
                      <div className="skeleton" style={{ width: '70px', height: '28px', borderRadius: '8px' }} />
                    </div>
                  </div>
                ))}
              </div>
            ) : userReports.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '48px 16px', color: '#6B7280' }}>
                <CheckCircle2 size={36} color="#D1D5DB" style={{ margin: '0 auto 12px', display: 'block' }} />
                <p style={{ margin: 0, fontSize: '0.92rem' }}>คุณยังไม่มีประวัติการแจ้งเหตุกู้ภัย</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {userReports.map((report) => {
                  const statusInfo = statusLabels[report.status] || statusLabels.pending;
                  return (
                    <div
                      key={report.id}
                      style={{
                        padding: '16px',
                        borderRadius: '14px',
                        border: '1px solid #E5E7EB',
                        backgroundColor: '#FFFFFF',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '10px'
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '10px' }}>
                        <div>
                          <div style={{ fontWeight: 700, fontSize: '0.95rem', color: '#1F2937' }}>
                            {report.animal_type === 'dog' ? 'สุนัข' : report.animal_type === 'cat' ? 'แมว' : 'สัตว์อื่นๆ'}
                          </div>
                          <div style={{ fontSize: '0.78rem', color: '#6B7280', marginTop: '2px' }}>
                            {new Date(report.created_at).toLocaleString('th-TH')}
                          </div>
                        </div>

                        <span style={{
                          fontSize: '0.76rem',
                          fontWeight: 700,
                          padding: '3px 10px',
                          borderRadius: '9999px',
                          backgroundColor: statusInfo.bg,
                          color: statusInfo.text,
                          border: `1px solid ${statusInfo.border}`
                        }}>
                          {statusInfo.label}
                        </span>
                      </div>

                      <div style={{ fontSize: '0.88rem', color: '#374151', lineHeight: 1.5 }}>
                        <strong>อาการ:</strong> {report.symptoms}
                      </div>

                      <div style={{ fontSize: '0.82rem', color: '#6B7280', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <MapPin size={14} color="#DC2626" style={{ flexShrink: 0 }} />
                        <span>{report.location_text || 'ไม่ได้ระบุสถานที่'}</span>
                      </div>

                      {report.image_url && (
                        <div style={{ marginTop: '4px' }}>
                          <img
                            src={report.image_url}
                            alt="Report thumbnail"
                            style={{
                              width: '80px',
                              height: '80px',
                              borderRadius: '8px',
                              objectFit: 'cover',
                              border: '1px solid #E5E7EB'
                            }}
                          />
                        </div>
                      )}

                      {report.rescuer_name && (
                        <div style={{
                          padding: '8px 12px',
                          borderRadius: '8px',
                          backgroundColor: '#EFF6FF',
                          color: '#1E40AF',
                          fontSize: '0.8rem',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px'
                        }}>
                          <ShieldCheck size={15} color="#2563EB" />
                          <span>ผู้รับเคสเข้าช่วยเหลือ: <strong>{report.rescuer_name}</strong> {report.rescuer_phone ? `(โทร. ${report.rescuer_phone})` : ''}</span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </motion.div>
        )}

      </div>
    </div>
  );
}

export default IncidentReport;
