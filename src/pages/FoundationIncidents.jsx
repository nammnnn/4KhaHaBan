import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  ChevronLeft, 
  AlertTriangle, 
  MapPin, 
  Phone, 
  ExternalLink, 
  Loader2, 
  CheckCircle, 
  AlertCircle,
  X, 
  Image as ImageIcon,
  RefreshCw,
  Dog,
  Cat,
  Heart,
  Clock,
  Compass,
  Navigation,
  CheckCircle2,
  Eye,
  Lock,
  RotateCcw,
  UserCheck,
  ShieldCheck,
  Sparkles
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import { FoundationIncidentsSkeleton } from '../components/Skeletons';
import { api } from '../services/api';
import { supabase } from '../services/supabaseClient';

export default function FoundationIncidents() {
  const navigate = useNavigate();
  const { user, profile } = useAuth();

  const [incidents, setIncidents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [updatingId, setUpdatingId] = useState(null);
  const [previewImage, setPreviewImage] = useState(null);
  const [toast, setToast] = useState(null);
  const [confirmModal, setConfirmModal] = useState(null); // { type: 'accept' | 'release' | 'resolve' | 'cancel', incident: obj }

  const showToast = (text, type = 'success') => {
    setToast({ text, type });
    setTimeout(() => setToast(null), 4000);
  };

  const loadIncidents = async () => {
    setLoading(true);
    try {
      const data = await api.getIncidentReports('all');
      setIncidents(data || []);
    } catch (err) {
      console.error('Error loading incidents:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadIncidents();
  }, []);

  // Supabase Realtime subscription
  useEffect(() => {
    if (!supabase) return;

    const channel = supabase
      .channel('foundation_realtime_incidents')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'incident_reports' },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            setIncidents(prev => [payload.new, ...prev.filter(i => i.id !== payload.new.id)]);
            showToast('มีการแจ้งเหตุกู้ภัยสัตว์จรจัดเข้ามาใหม่!', 'error');
          } else if (payload.eventType === 'UPDATE') {
            setIncidents(prev => prev.map(i => i.id === payload.new.id ? { ...i, ...payload.new } : i));
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

  const handleUpdateStatus = async (reportId, newStatus, customRescuer = null) => {
    setUpdatingId(reportId);
    try {
      const rescuerInfo = newStatus === 'in_progress' 
        ? (customRescuer || { id: user?.id, name: profile?.full_name || 'มูลนิธิ', phone: profile?.phone || '' })
        : newStatus === 'resolved'
        ? { name: profile?.full_name || 'มูลนิธิ' }
        : null;

      await api.updateIncidentStatus(reportId, newStatus, rescuerInfo);

      setIncidents(prev => prev.map(i => {
        if (i.id !== reportId) return i;
        return {
          ...i,
          status: newStatus,
          ...(newStatus === 'in_progress' ? {
            rescuer_id: rescuerInfo?.id || user?.id,
            rescuer_name: rescuerInfo?.name || profile?.full_name || 'มูลนิธิ',
            rescuer_phone: rescuerInfo?.phone || profile?.phone || '',
            accepted_at: new Date().toISOString()
          } : newStatus === 'pending' ? {
            rescuer_id: null,
            rescuer_name: null,
            rescuer_phone: null,
            accepted_at: null
          } : newStatus === 'resolved' ? {
            resolved_at: new Date().toISOString(),
            rescuer_name: i.rescuer_name || profile?.full_name || 'มูลนิธิ'
          } : {})
        };
      }));

      const labels = {
        pending: 'ปลดล็อกเคสกลับสู่สถานะรอดำเนินการ',
        in_progress: 'รับเคสและเริ่มเข้าช่วยเหลือเรียบร้อยแล้ว',
        resolved: 'บันทึกว่าช่วยเหลือสัตว์สำเร็จเรียบร้อยแล้ว',
        cancelled: 'ยกเลิกเคสเรียบร้อยแล้ว'
      };
      showToast(labels[newStatus] || 'อัปเดตสถานะสำเร็จ', 'success');
    } catch (err) {
      console.error('Failed to update status:', err);
      const msg = err?.message || '';
      const isRls = msg.includes('violates row-level security') || msg.includes('policy') || msg.includes('permission');
      showToast(isRls 
        ? 'เกิดข้อผิดพลาด: สิทธิ์ RLS ในฐานข้อมูลยังไม่อนุญาตให้แก้ไขเคส (กรุณารันคำสั่ง SQL 011 ใน Supabase)' 
        : `เกิดข้อผิดพลาด: ${msg || 'ไม่สามารถอัปเดตสถานะได้'}`, 
        'error'
      );
    } finally {
      setUpdatingId(null);
      setConfirmModal(null);
    }
  };

  const pendingCount = incidents.filter(i => i.status === 'pending').length;
  const inProgressCount = incidents.filter(i => i.status === 'in_progress').length;
  const myCasesCount = incidents.filter(i => i.status === 'in_progress' && i.rescuer_id === user?.id).length;
  const resolvedCount = incidents.filter(i => i.status === 'resolved').length;
  const cancelledCount = incidents.filter(i => i.status === 'cancelled').length;

  const filtered = incidents.filter(i => {
    if (filter === 'all') return true;
    if (filter === 'my_cases') return i.status === 'in_progress' && i.rescuer_id === user?.id;
    return i.status === filter;
  });

  if (loading) {
    return (
      <div style={{
        minHeight: '100dvh',
        backgroundColor: '#FAF8F5',
        fontFamily: 'Prompt, sans-serif',
        padding: '24px 16px 100px',
        boxSizing: 'border-box'
      }}>
        <div style={{ maxWidth: '840px', margin: '0 auto', width: '100%' }}>
          <FoundationIncidentsSkeleton />
        </div>
      </div>
    );
  }

  return (
    <div style={{
      minHeight: '100dvh',
      backgroundColor: '#FAF8F5',
      fontFamily: 'Prompt, sans-serif',
      padding: '24px 16px 100px',
      boxSizing: 'border-box'
    }}>
      <div style={{ maxWidth: '840px', margin: '0 auto', width: '100%' }}>
        
        {/* Top Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
          <button
            type="button"
            onClick={() => navigate('/foundation')}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '10px',
              background: 'none',
              border: 'none',
              padding: 0,
              cursor: 'pointer',
              color: '#374151'
            }}
          >
            <div
              style={{
                width: '38px',
                height: '38px',
                borderRadius: '8px',
                backgroundColor: '#FFFFFF',
                border: '1px solid #D1D5DB',
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                color: '#374151',
                boxShadow: '0 1px 2px rgba(0,0,0,0.04)',
                transition: 'background-color 0.15s'
              }}
              onMouseEnter={e => e.currentTarget.style.backgroundColor = '#F9FAFB'}
              onMouseLeave={e => e.currentTarget.style.backgroundColor = '#FFFFFF'}
              aria-label="ย้อนกลับ"
            >
              <ChevronLeft size={20} />
            </div>
            <span style={{ fontSize: '0.95rem', fontWeight: 600, color: '#374151' }}>
              กลับสู่หน้าหลักมูลนิธิ
            </span>
          </button>

          <button
            type="button"
            onClick={loadIncidents}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '6px 12px',
              backgroundColor: '#FFFFFF',
              border: '1px solid #E5E7EB',
              borderRadius: '8px',
              fontSize: '0.85rem',
              fontWeight: 500,
              color: '#4B5563',
              cursor: 'pointer'
            }}
          >
            <RefreshCw size={14} /> รีเฟรชข้อมูล
          </button>
        </div>

        {/* Title Card */}
        <div style={{
          backgroundColor: '#FFFFFF',
          borderRadius: '16px',
          border: '1px solid #E5E7EB',
          padding: '20px 24px',
          marginBottom: '20px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '12px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <div style={{
              width: '46px',
              height: '46px',
              borderRadius: '12px',
              backgroundColor: '#FEF2F2',
              color: '#DC2626',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <AlertTriangle size={26} />
            </div>
            <div>
              <h1 style={{ margin: '0 0 4px', fontSize: '1.35rem', fontWeight: 700, color: '#111827' }}>
                แจ้งเหตุกู้ภัยสัตว์จรจัดฉุกเฉิน
              </h1>
              <p style={{ margin: 0, color: '#6B7280', fontSize: '0.875rem' }}>
                รับเรื่องและประสานงานเข้าช่วยเหลือสุนัขและแมวป่วย/บาดเจ็บในพื้นที่
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            {myCasesCount > 0 && (
              <div style={{
                padding: '6px 14px',
                borderRadius: '20px',
                backgroundColor: '#EFF6FF',
                border: '1px solid #BFDBFE',
                color: '#1D4ED8',
                fontWeight: 700,
                fontSize: '0.85rem',
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}>
                <Sparkles size={14} />
                คุณกำลังดูแล {myCasesCount} เคส
              </div>
            )}
            {pendingCount > 0 && (
              <div style={{
                padding: '6px 14px',
                borderRadius: '20px',
                backgroundColor: '#FEF2F2',
                border: '1px solid #FCA5A5',
                color: '#DC2626',
                fontWeight: 700,
                fontSize: '0.85rem',
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}>
                <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#DC2626', display: 'inline-block' }} />
                รอช่วยเหลือ {pendingCount} เคส
              </div>
            )}
          </div>
        </div>

        {/* Filter Pills - Exactly 5 tabs matching AdminDashboard, strictly single-line nowrap */}
        <div style={{
          display: 'flex',
          gap: '6px',
          flexWrap: 'nowrap',
          overflowX: 'auto',
          marginBottom: '24px',
          backgroundColor: '#F3F4F6',
          padding: '4px',
          borderRadius: '10px',
          width: 'fit-content',
          maxWidth: '100%',
          scrollbarWidth: 'none',
          WebkitOverflowScrolling: 'touch'
        }}>
          {[
            { id: 'all', label: 'ทั้งหมด', count: incidents.length },
            { id: 'pending', label: 'รอดำเนินการ', count: pendingCount, highlight: pendingCount > 0 },
            { id: 'in_progress', label: 'กำลังเข้าช่วยเหลือ', count: inProgressCount },
            { id: 'resolved', label: 'ช่วยเหลือสำเร็จ', count: resolvedCount },
            { id: 'cancelled', label: 'ยกเลิก', count: cancelledCount }
          ].map(tab => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setFilter(tab.id)}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '7px 14px',
                borderRadius: '8px',
                border: 'none',
                fontSize: '0.85rem',
                fontWeight: filter === tab.id ? 600 : 500,
                cursor: 'pointer',
                backgroundColor: filter === tab.id ? '#FFFFFF' : 'transparent',
                color: filter === tab.id ? '#111827' : '#6B7280',
                boxShadow: filter === tab.id ? '0 1px 3px rgba(0,0,0,0.06)' : 'none',
                transition: 'all 0.15s',
                whiteSpace: 'nowrap',
                flexShrink: 0
              }}
            >
              <span>{tab.label}</span>
              <span style={{
                fontSize: '0.75rem',
                padding: '1px 7px',
                borderRadius: '10px',
                backgroundColor: filter === tab.id 
                  ? (tab.highlight ? '#FEF2F2' : '#F3F4F6')
                  : (tab.highlight ? '#FEE2E2' : 'rgba(0,0,0,0.05)'),
                color: tab.highlight ? '#DC2626' : (filter === tab.id ? '#111827' : '#6B7280'),
                fontWeight: tab.highlight ? 700 : 500
              }}>
                {tab.count}
              </span>
            </button>
          ))}
        </div>

        {/* Content List */}
        {loading ? (
          <FoundationIncidentsSkeleton />
        ) : filtered.length === 0 ? (
          <div style={{ backgroundColor: '#FFFFFF', borderRadius: '16px', border: '1px solid #E5E7EB', padding: '60px 20px', textAlign: 'center' }}>
            <AlertTriangle size={36} color="#9CA3AF" style={{ margin: '0 auto 12px' }} />
            <p style={{ margin: 0, color: '#6B7280', fontSize: '0.95rem' }}>
              {filter === 'my_cases' ? 'คุณยังไม่มีเคสที่รับผิดชอบอยู่ขณะนี้' : 'ไม่พบรายการแจ้งเหตุกู้ภัยในสถานะนี้'}
            </p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {filtered.map(inc => {
              const hasCoords = Boolean(inc.latitude && inc.longitude);
              const gmapsUrl = hasCoords 
                ? `https://www.google.com/maps?q=${inc.latitude},${inc.longitude}`
                : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(inc.location_text || '')}`;

              const isUpdating = updatingId === inc.id;
              const isMyCase = Boolean(inc.rescuer_id && inc.rescuer_id === user?.id);
              const hasOtherRescuer = Boolean(inc.rescuer_id && inc.rescuer_id !== user?.id);

              return (
                <div
                  key={inc.id}
                  style={{
                    backgroundColor: inc.status === 'pending' 
                      ? '#FFFAF5' 
                      : (inc.status === 'in_progress' && isMyCase) 
                      ? '#F0FDF4' 
                      : '#FFFFFF',
                    borderRadius: '16px',
                    border: inc.status === 'pending' 
                      ? '1.5px solid #FED7AA' 
                      : (inc.status === 'in_progress' && isMyCase) 
                      ? '1.5px solid #86EFAC' 
                      : '1px solid #E5E7EB',
                    padding: '20px 24px',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
                    display: 'flex',
                    flexWrap: 'wrap',
                    gap: '20px',
                    alignItems: 'flex-start'
                  }}
                >
                  {/* Animal Image / Warm Friendly Placeholder */}
                  {inc.image_url ? (
                    <div
                      onClick={() => setPreviewImage(inc.image_url)}
                      style={{
                        position: 'relative', width: '92px', height: '92px', flexShrink: 0,
                        borderRadius: '12px', overflow: 'hidden', backgroundColor: '#F3F4F6',
                        border: '1px solid #E5E7EB', cursor: 'pointer',
                        boxShadow: '0 1px 3px rgba(0,0,0,0.04)'
                      }}
                      title="คลิกเพื่อดูรูปภาพขยายใหญ่"
                    >
                      <img
                        src={inc.image_url}
                        alt="ภาพแจ้งเหตุ"
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
                      width: '92px', height: '92px', flexShrink: 0, borderRadius: '12px',
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

                  {/* Incident Info */}
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
                      {inc.status === 'in_progress' && (
                        isMyCase ? (
                          <span style={{
                            display: 'inline-flex', alignItems: 'center', gap: '4px',
                            padding: '3px 10px', borderRadius: '20px', fontSize: '0.75rem', fontWeight: 700,
                            backgroundColor: '#EFF6FF', color: '#1D4ED8', border: '1px solid #BFDBFE'
                          }}>
                            <Sparkles size={12} /> คุณรับผิดชอบเคสนี้
                          </span>
                        ) : hasOtherRescuer ? (
                          <span style={{
                            display: 'inline-flex', alignItems: 'center', gap: '4px',
                            padding: '3px 10px', borderRadius: '20px', fontSize: '0.75rem', fontWeight: 600,
                            backgroundColor: '#FEF3C7', color: '#92400E', border: '1px solid #FDE68A'
                          }}>
                            <Lock size={12} /> ผู้รับเคส: {inc.rescuer_name}
                          </span>
                        ) : null
                      )}

                      {inc.status === 'resolved' && inc.rescuer_name && (
                        <span style={{
                          display: 'inline-flex', alignItems: 'center', gap: '4px',
                          padding: '3px 10px', borderRadius: '20px', fontSize: '0.75rem', fontWeight: 600,
                          backgroundColor: '#ECFDF5', color: '#065F46', border: '1px solid #A7F3D0'
                        }}>
                          <ShieldCheck size={12} /> ช่วยเหลือโดย: {inc.rescuer_name}
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

                    <div style={{ fontSize: '0.98rem', fontWeight: 600, color: '#111827', lineHeight: 1.4 }}>
                      {inc.symptoms}
                    </div>

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

                  {/* Actions for Foundation */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', width: '180px', flexShrink: 0 }}>
                    <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#6B7280' }}>จัดการสถานะการช่วยเหลือ:</span>
                    
                    {/* STATE 1: PENDING */}
                    {inc.status === 'pending' && (
                      <>
                        <button
                          type="button"
                          disabled={isUpdating}
                          onClick={() => setConfirmModal({ type: 'accept', incident: inc })}
                          style={{
                            height: '40px', borderRadius: '8px', fontSize: '0.84rem', fontWeight: 700, cursor: 'pointer',
                            backgroundColor: '#D97706', color: '#FFFFFF', border: 'none',
                            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
                            boxShadow: '0 2px 4px rgba(217, 119, 6, 0.25)', transition: 'all 0.15s'
                          }}
                          onMouseEnter={e => e.currentTarget.style.backgroundColor = '#B45309'}
                          onMouseLeave={e => e.currentTarget.style.backgroundColor = '#D97706'}
                        >
                          <Compass size={15} />
                          รับเคสนี้ / ช่วยเหลือ
                        </button>
                        <button
                          type="button"
                          disabled={isUpdating}
                          onClick={() => setConfirmModal({ type: 'cancel', incident: inc })}
                          style={{
                            height: '30px', borderRadius: '8px', fontSize: '0.75rem', fontWeight: 500, cursor: 'pointer',
                            backgroundColor: '#FFFFFF', color: '#6B7280', border: '1px solid #E5E7EB',
                            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px',
                            transition: 'all 0.15s'
                          }}
                          onMouseEnter={e => e.currentTarget.style.backgroundColor = '#F9FAFB'}
                          onMouseLeave={e => e.currentTarget.style.backgroundColor = '#FFFFFF'}
                        >
                          <X size={12} /> ยกเลิกเคส
                        </button>
                      </>
                    )}

                    {/* STATE 2: IN_PROGRESS */}
                    {inc.status === 'in_progress' && (
                      <>
                        {isMyCase ? (
                          <>
                            <div style={{
                              padding: '6px 10px', backgroundColor: '#EFF6FF', border: '1px solid #BFDBFE',
                              borderRadius: '8px', fontSize: '0.75rem', color: '#1D4ED8', fontWeight: 600,
                              display: 'flex', alignItems: 'center', gap: '4px'
                            }}>
                              <UserCheck size={13} /> กำลังเดินทางไปช่วย
                            </div>
                            <button
                              type="button"
                              disabled={isUpdating}
                              onClick={() => setConfirmModal({ type: 'resolve', incident: inc })}
                              style={{
                                height: '38px', borderRadius: '8px', fontSize: '0.82rem', fontWeight: 700, cursor: 'pointer',
                                backgroundColor: '#059669', color: '#FFFFFF', border: 'none',
                                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
                                boxShadow: '0 2px 4px rgba(5, 150, 105, 0.2)', transition: 'all 0.15s'
                              }}
                              onMouseEnter={e => e.currentTarget.style.backgroundColor = '#047857'}
                              onMouseLeave={e => e.currentTarget.style.backgroundColor = '#059669'}
                            >
                              <CheckCircle2 size={15} />
                              ช่วยเหลือสำเร็จ
                            </button>
                            <button
                              type="button"
                              disabled={isUpdating}
                              onClick={() => setConfirmModal({ type: 'release', incident: inc })}
                              style={{
                                height: '30px', borderRadius: '8px', fontSize: '0.74rem', fontWeight: 500, cursor: 'pointer',
                                backgroundColor: '#FFFFFF', color: '#4B5563', border: '1px solid #D1D5DB',
                                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px',
                                transition: 'all 0.15s'
                              }}
                              title="คืนเคสกลับไปเป็นรอดำเนินการ เพื่อให้มูลนิธิอื่นรับได้"
                            >
                              <RotateCcw size={12} /> สละเคส / ส่งต่อ
                            </button>
                          </>
                        ) : hasOtherRescuer ? (
                          <div style={{
                            padding: '10px 12px', backgroundColor: '#F9FAFB', border: '1px solid #E5E7EB',
                            borderRadius: '10px', display: 'flex', flexDirection: 'column', gap: '4px', textAlign: 'center'
                          }}>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px', color: '#4B5563', fontSize: '0.78rem', fontWeight: 600 }}>
                              <Lock size={12} color="#6B7280" /> มีผู้รับผิดชอบแล้ว
                            </div>
                            <span style={{ fontSize: '0.74rem', color: '#1F2937', fontWeight: 500 }}>
                              {inc.rescuer_name}
                            </span>
                            {inc.rescuer_phone && (
                              <a
                                href={`tel:${inc.rescuer_phone}`}
                                style={{
                                  fontSize: '0.7rem', color: '#059669', textDecoration: 'none', fontWeight: 600,
                                  marginTop: '2px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '3px'
                                }}
                              >
                                <Phone size={10} /> โทรประสานงาน
                              </a>
                            )}
                          </div>
                        ) : (
                          <>
                            <button
                              type="button"
                              disabled={isUpdating}
                              onClick={() => setConfirmModal({ type: 'accept', incident: inc })}
                              style={{
                                height: '34px', borderRadius: '8px', fontSize: '0.78rem', fontWeight: 600, cursor: 'pointer',
                                backgroundColor: '#EFF6FF', color: '#1D4ED8', border: '1px solid #BFDBFE',
                                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px'
                              }}
                            >
                              <UserCheck size={13} /> ฉันรับผิดชอบเคสนี้
                            </button>
                            <button
                              type="button"
                              disabled={isUpdating}
                              onClick={() => setConfirmModal({ type: 'resolve', incident: inc })}
                              style={{
                                height: '34px', borderRadius: '8px', fontSize: '0.78rem', fontWeight: 600, cursor: 'pointer',
                                backgroundColor: '#ECFDF5', color: '#059669', border: '1px solid #A7F3D0',
                                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px'
                              }}
                            >
                              <CheckCircle2 size={13} /> ช่วยเหลือสำเร็จ
                            </button>
                          </>
                        )}
                      </>
                    )}

                    {/* STATE 3: RESOLVED */}
                    {inc.status === 'resolved' && (
                      <div style={{
                        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '3px',
                        padding: '12px 14px', backgroundColor: '#ECFDF5', border: '1px solid #A7F3D0',
                        borderRadius: '10px', color: '#059669', textAlign: 'center'
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '0.82rem', fontWeight: 700 }}>
                          <CheckCircle2 size={16} color="#059669" /> ภารกิจสำเร็จ
                        </div>
                        <span style={{ fontSize: '0.7rem', color: '#047857' }}>
                          {inc.resolved_at 
                            ? new Date(inc.resolved_at).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' }) + ' น.' 
                            : 'ปิดเคสเรียบร้อย'}
                        </span>
                      </div>
                    )}

                    {/* STATE 4: CANCELLED */}
                    {inc.status === 'cancelled' && (
                      <div style={{
                        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '5px',
                        padding: '8px 12px', backgroundColor: '#F3F4F6', border: '1px solid #E5E7EB',
                        borderRadius: '8px', color: '#6B7280', fontSize: '0.78rem', fontWeight: 500
                      }}>
                        <X size={13} /> เคสถูกยกเลิกแล้ว
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

      </div>

      {/* Action Confirmation Modal */}
      <AnimatePresence>
        {confirmModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{
              position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.55)',
              backdropFilter: 'blur(4px)', zIndex: 10000,
              display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px'
            }}
            onClick={() => setConfirmModal(null)}
          >
            <motion.div
              initial={{ scale: 0.94, opacity: 0, y: 12 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.94, opacity: 0, y: 12 }}
              onClick={e => e.stopPropagation()}
              style={{
                backgroundColor: '#FFFFFF', borderRadius: '16px', padding: '24px',
                maxWidth: '440px', width: '100%', boxShadow: '0 20px 40px rgba(0,0,0,0.18)'
              }}
            >
              {confirmModal.type === 'accept' && (
                <>
                  <div style={{ width: '48px', height: '48px', borderRadius: '12px', backgroundColor: '#FEF3C7', color: '#D97706', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '14px' }}>
                    <Compass size={26} />
                  </div>
                  <h3 style={{ margin: '0 0 8px', fontSize: '1.15rem', fontWeight: 700, color: '#111827' }}>
                    ยืนยันการรับเคสช่วยเหลือนี้?
                  </h3>
                  <p style={{ margin: '0 0 16px', color: '#4B5563', fontSize: '0.88rem', lineHeight: 1.5 }}>
                    ระบบจะบันทึกว่า <strong>{profile?.full_name || 'มูลนิธิของคุณ'}</strong> เป็นผู้รับผิดชอบเคสนี้ และล็อกสถานะแจ้งให้มูลนิธิอื่นทราบทันทีเพื่อป้องกันการเดินทางไปซ้ำซ้อน
                  </p>
                  <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                    <button
                      type="button"
                      onClick={() => setConfirmModal(null)}
                      style={{ padding: '8px 16px', borderRadius: '8px', border: '1px solid #D1D5DB', backgroundColor: '#FFFFFF', color: '#374151', fontSize: '0.88rem', fontWeight: 600, cursor: 'pointer' }}
                    >
                      ยกเลิก
                    </button>
                    <button
                      type="button"
                      disabled={updatingId === confirmModal.incident.id}
                      onClick={() => handleUpdateStatus(confirmModal.incident.id, 'in_progress')}
                      style={{ padding: '8px 18px', borderRadius: '8px', border: 'none', backgroundColor: '#D97706', color: '#FFFFFF', fontSize: '0.88rem', fontWeight: 700, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                    >
                      {updatingId === confirmModal.incident.id ? <Loader2 className="spin" size={16} /> : <Compass size={16} />}
                      ยืนยันรับเคสและเริ่มเดินทาง
                    </button>
                  </div>
                </>
              )}

              {confirmModal.type === 'release' && (
                <>
                  <div style={{ width: '48px', height: '48px', borderRadius: '12px', backgroundColor: '#EFF6FF', color: '#1D4ED8', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '14px' }}>
                    <RotateCcw size={26} />
                  </div>
                  <h3 style={{ margin: '0 0 8px', fontSize: '1.15rem', fontWeight: 700, color: '#111827' }}>
                    สละเคสและส่งต่อให้มูลนิธิอื่น?
                  </h3>
                  <p style={{ margin: '0 0 16px', color: '#4B5563', fontSize: '0.88rem', lineHeight: 1.5 }}>
                    หากติดขัดหรือไม่สามารถเดินทางไปได้ เคสนี้จะถูกเปลี่ยนกลับเป็น <strong>"รอดำเนินการ"</strong> และปลดล็อกเพื่อให้มูลนิธิอื่นสามารถเข้าช่วยเหลือสัตว์ได้ต่อไป
                  </p>
                  <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                    <button
                      type="button"
                      onClick={() => setConfirmModal(null)}
                      style={{ padding: '8px 16px', borderRadius: '8px', border: '1px solid #D1D5DB', backgroundColor: '#FFFFFF', color: '#374151', fontSize: '0.88rem', fontWeight: 600, cursor: 'pointer' }}
                    >
                      ย้อนกลับ
                    </button>
                    <button
                      type="button"
                      disabled={updatingId === confirmModal.incident.id}
                      onClick={() => handleUpdateStatus(confirmModal.incident.id, 'pending')}
                      style={{ padding: '8px 18px', borderRadius: '8px', border: 'none', backgroundColor: '#2563EB', color: '#FFFFFF', fontSize: '0.88rem', fontWeight: 700, cursor: 'pointer' }}
                    >
                      {updatingId === confirmModal.incident.id ? <Loader2 className="spin" size={16} /> : null}
                      ยืนยันสละเคส
                    </button>
                  </div>
                </>
              )}

              {confirmModal.type === 'resolve' && (
                <>
                  <div style={{ width: '48px', height: '48px', borderRadius: '12px', backgroundColor: '#ECFDF5', color: '#059669', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '14px' }}>
                    <CheckCircle2 size={26} />
                  </div>
                  <h3 style={{ margin: '0 0 8px', fontSize: '1.15rem', fontWeight: 700, color: '#111827' }}>
                    บันทึกว่าช่วยเหลือสำเร็จเรียบร้อย?
                  </h3>
                  <p style={{ margin: '0 0 16px', color: '#4B5563', fontSize: '0.88rem', lineHeight: 1.5 }}>
                    ภารกิจช่วยเหลือนี้จะถูกปิดเคสอย่างสมบูรณ์ และระบบจะอัปเดตสถิติช่วยเหลือสัตว์สำเร็จของมูลนิธิและแอปพลิเคชันทันที
                  </p>
                  <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                    <button
                      type="button"
                      onClick={() => setConfirmModal(null)}
                      style={{ padding: '8px 16px', borderRadius: '8px', border: '1px solid #D1D5DB', backgroundColor: '#FFFFFF', color: '#374151', fontSize: '0.88rem', fontWeight: 600, cursor: 'pointer' }}
                    >
                      ยกเลิก
                    </button>
                    <button
                      type="button"
                      disabled={updatingId === confirmModal.incident.id}
                      onClick={() => handleUpdateStatus(confirmModal.incident.id, 'resolved')}
                      style={{ padding: '8px 18px', borderRadius: '8px', border: 'none', backgroundColor: '#059669', color: '#FFFFFF', fontSize: '0.88rem', fontWeight: 700, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                    >
                      {updatingId === confirmModal.incident.id ? <Loader2 className="spin" size={16} /> : <CheckCircle2 size={16} />}
                      ยืนยันช่วยเหลือสำเร็จ
                    </button>
                  </div>
                </>
              )}

              {confirmModal.type === 'cancel' && (
                <>
                  <div style={{ width: '48px', height: '48px', borderRadius: '12px', backgroundColor: '#FEE2E2', color: '#DC2626', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '14px' }}>
                    <AlertTriangle size={26} />
                  </div>
                  <h3 style={{ margin: '0 0 8px', fontSize: '1.15rem', fontWeight: 700, color: '#111827' }}>
                    ยืนยันการยกเลิกเคส?
                  </h3>
                  <p style={{ margin: '0 0 16px', color: '#4B5563', fontSize: '0.88rem', lineHeight: 1.5 }}>
                    ใช้ในกรณีที่ไม่พบสัตว์ในพื้นที่ หรือผู้แจ้งขอยกเลิกการขอความช่วยเหลือ
                  </p>
                  <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                    <button
                      type="button"
                      onClick={() => setConfirmModal(null)}
                      style={{ padding: '8px 16px', borderRadius: '8px', border: '1px solid #D1D5DB', backgroundColor: '#FFFFFF', color: '#374151', fontSize: '0.88rem', fontWeight: 600, cursor: 'pointer' }}
                    >
                      ย้อนกลับ
                    </button>
                    <button
                      type="button"
                      disabled={updatingId === confirmModal.incident.id}
                      onClick={() => handleUpdateStatus(confirmModal.incident.id, 'cancelled')}
                      style={{ padding: '8px 18px', borderRadius: '8px', border: 'none', backgroundColor: '#DC2626', color: '#FFFFFF', fontSize: '0.88rem', fontWeight: 700, cursor: 'pointer' }}
                    >
                      {updatingId === confirmModal.incident.id ? <Loader2 className="spin" size={16} /> : null}
                      ยืนยันยกเลิกเคส
                    </button>
                  </div>
                </>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Image Zoom Modal */}
      <AnimatePresence>
        {previewImage && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={() => setPreviewImage(null)}
            style={{
              position: 'fixed',
              inset: 0,
              backgroundColor: 'rgba(0,0,0,0.8)',
              backdropFilter: 'blur(8px)',
              zIndex: 9999,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '20px'
            }}
          >
            <motion.div
              initial={{ scale: 0.94, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.94, opacity: 0 }}
              transition={{ duration: 0.22 }}
              onClick={e => e.stopPropagation()}
              style={{ position: 'relative', maxWidth: '90vw', maxHeight: '90vh' }}
            >
              <img
                src={previewImage}
                alt="Enlarged proof"
                style={{ maxWidth: '100%', maxHeight: '85vh', borderRadius: '12px', objectFit: 'contain' }}
              />
              <button
                type="button"
                onClick={() => setPreviewImage(null)}
                style={{
                  position: 'absolute',
                  top: '-12px',
                  right: '-12px',
                  backgroundColor: '#FFFFFF',
                  color: '#111827',
                  border: 'none',
                  borderRadius: '50%',
                  width: '32px',
                  height: '32px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.25)'
                }}
              >
                <X size={18} />
              </button>
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
            transition={{ duration: 0.2 }}
            style={{
              position: 'fixed',
              bottom: '24px',
              right: '24px',
              backgroundColor: toast.type === 'error' ? '#DC2626' : '#059669',
              color: '#FFFFFF',
              padding: '12px 20px',
              borderRadius: '8px',
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              boxShadow: '0 8px 24px rgba(0,0,0,0.2)',
              zIndex: 9999,
              fontWeight: 600,
              fontSize: '0.9rem',
              maxWidth: '90vw'
            }}
          >
            {toast.type === 'error' ? <AlertCircle size={18} /> : <CheckCircle size={18} />}
            <span>{toast.text}</span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
