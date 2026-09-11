import React, { useEffect, useState } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../services/supabaseClient';
import {
  Clock, CheckCircle2, XCircle, FileEdit, Loader2, ArrowRight, Building2, RefreshCw
} from 'lucide-react';
import { FoundationPendingSkeleton } from '../components/Skeletons';

const FoundationPending = () => {
  const { user, role, foundationStatus, refreshProfile, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [rejectionReason, setRejectionReason] = useState('');
  const [isRefreshing, setIsRefreshing] = useState(false);

  // ถ้าไม่ใช่ foundation → กลับหน้าแรก
  if (!authLoading && role !== 'foundation') {
    return <Navigate to="/" replace />;
  }

  // ถ้า approved แล้ว → กลับหน้าแรก
  if (!authLoading && foundationStatus === 'approved') {
    return <Navigate to="/" replace />;
  }

  // ดึง rejection reason ถ้าสถานะเป็น rejected
  useEffect(() => {
    if (supabase && user && foundationStatus === 'rejected') {
      fetchRejectionReason();
    }
  }, [user, foundationStatus]);

  // Subscribe Supabase Realtime สำหรับ auto-update เมื่อ admin approve/reject
  useEffect(() => {
    if (!supabase || !user) return;

    const channel = supabase
      .channel(`foundation_status_${user.id}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'foundation_profiles',
          filter: `id=eq.${user.id}`,
        },
        () => {
          refreshProfile();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, refreshProfile]);

  const fetchRejectionReason = async () => {
    try {
      const { data } = await supabase
        .from('foundation_profiles')
        .select('rejection_reason')
        .eq('id', user.id)
        .maybeSingle();

      if (data?.rejection_reason) {
        setRejectionReason(data.rejection_reason);
      }
    } catch (error) {
      console.error('[Pending] ดึงเหตุผลที่ปฏิเสธไม่สำเร็จ:', error);
    }
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await refreshProfile();
    setTimeout(() => setIsRefreshing(false), 800);
  };

  if (authLoading) {
    return <FoundationPendingSkeleton />;
  }

  // ===== Render ต่างตามสถานะ =====
  const renderContent = () => {
    switch (foundationStatus) {
      // ===== ยังไม่เคยส่ง Onboarding =====
      case 'none':
      case null:
        return (
          <>
            <div style={{
              width: '56px',
              height: '56px',
              borderRadius: '12px',
              backgroundColor: '#FEF3C7',
              color: '#D97706',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 12px'
            }}>
              <Building2 size={28} />
            </div>
            <h2 style={headingStyle}>ลงทะเบียนข้อมูลมูลนิธิ</h2>
            <p style={descriptionStyle}>
              บัญชีของคุณถูกสร้างเรียบร้อยแล้ว กรุณากรอกข้อมูลองค์กรและแนบเอกสารเพื่อยืนยันตัวตนก่อนเริ่มประกาศหาบ้านให้สัตว์เลี้ยง
            </p>
            <button
              onClick={() => navigate('/foundation/onboarding')}
              style={primaryButtonStyle}
              onMouseEnter={e => e.currentTarget.style.backgroundColor = '#B45309'}
              onMouseLeave={e => e.currentTarget.style.backgroundColor = '#D97706'}
            >
              เริ่มลงทะเบียนมูลนิธิ <ArrowRight size={16} />
            </button>
          </>
        );

      // ===== รอตรวจสอบ =====
      case 'pending':
        return (
          <>
            <div style={{
              width: '56px',
              height: '56px',
              borderRadius: '12px',
              backgroundColor: '#FEF3C7',
              color: '#D97706',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 12px'
            }}>
              <Clock size={28} />
            </div>
            <h2 style={headingStyle}>เอกสารอยู่ระหว่างการตรวจสอบ</h2>
            <p style={descriptionStyle}>
              เจ้าหน้าที่ได้รับเอกสารและข้อมูลของท่านแล้ว กำลังดำเนินการตรวจสอบความถูกต้อง (โดยทั่วไปใช้เวลา 1-2 วันทำการ)
            </p>

            {/* Timeline แสดงสถานะ */}
            <div style={{
              width: '100%',
              maxWidth: '320px',
              display: 'flex',
              flexDirection: 'column',
              gap: '0',
              margin: '16px 0 20px',
              textAlign: 'left'
            }}>
              {[
                { label: 'สมัครสมาชิก', done: true },
                { label: 'ส่งข้อมูลและเอกสาร', done: true },
                { label: 'ผู้ดูแลระบบตรวจสอบเอกสาร', done: false, active: true },
                { label: 'อนุมัติเปิดใช้งานพอร์ทัล', done: false },
              ].map((item, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                    <div style={{
                      width: '24px',
                      height: '24px',
                      borderRadius: '6px',
                      backgroundColor: item.done ? '#059669' : item.active ? '#D97706' : '#F3F4F6',
                      color: item.done || item.active ? '#FFFFFF' : '#9CA3AF',
                      display: 'flex',
                      justifyContent: 'center',
                      alignItems: 'center',
                      fontSize: '0.75rem',
                      fontWeight: 600,
                      flexShrink: 0,
                    }}>
                      {item.done ? (
                        <CheckCircle2 size={15} />
                      ) : item.active ? (
                        <Loader2 className="spin" size={13} />
                      ) : (
                        i + 1
                      )}
                    </div>
                    {i < 3 && (
                      <div style={{
                        width: '2px',
                        height: '22px',
                        backgroundColor: item.done ? '#059669' : '#E5E7EB'
                      }} />
                    )}
                  </div>
                  <span style={{
                    fontSize: '0.85rem',
                    paddingTop: '2px',
                    fontWeight: item.active ? 600 : 500,
                    color: item.done ? '#059669' : item.active ? '#111827' : '#9CA3AF',
                  }}>
                    {item.label}
                  </span>
                </div>
              ))}
            </div>

            <button
              onClick={handleRefresh}
              disabled={isRefreshing}
              style={secondaryButtonStyle}
              onMouseEnter={e => e.currentTarget.style.backgroundColor = '#F9FAFB'}
              onMouseLeave={e => e.currentTarget.style.backgroundColor = '#FFFFFF'}
            >
              <RefreshCw size={16} className={isRefreshing ? 'spin' : ''} />
              {isRefreshing ? 'กำลังตรวจสอบ...' : 'ตรวจสอบสถานะล่าสุด'}
            </button>
          </>
        );

      // ===== ถูกปฏิเสธ =====
      case 'rejected':
        return (
          <>
            <div style={{
              width: '56px',
              height: '56px',
              borderRadius: '12px',
              backgroundColor: '#FEF2F2',
              color: '#DC2626',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 12px'
            }}>
              <XCircle size={28} />
            </div>
            <h2 style={{ ...headingStyle, color: '#DC2626' }}>
              การยืนยันตัวตนไม่ผ่านการอนุมัติ
            </h2>
            <p style={descriptionStyle}>
              ผู้ดูแลระบบได้ตรวจสอบเอกสารแล้ว แต่ไม่สามารถอนุมัติได้ในขณะนี้ กรุณาตรวจสอบเหตุผลและแก้ไขเอกสาร
            </p>

            {rejectionReason && (
              <div style={{
                width: '100%',
                padding: '14px 16px',
                borderRadius: '8px',
                backgroundColor: '#FEF2F2',
                border: '1px solid #FCA5A5',
                margin: '12px 0 16px',
                textAlign: 'left'
              }}>
                <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#DC2626', display: 'block', marginBottom: '4px' }}>
                  เหตุผลจากผู้ดูแลระบบ:
                </span>
                <span style={{ fontSize: '0.875rem', color: '#111827', lineHeight: 1.5 }}>
                  {rejectionReason}
                </span>
              </div>
            )}

            <button
              onClick={() => navigate('/foundation/onboarding')}
              style={primaryButtonStyle}
              onMouseEnter={e => e.currentTarget.style.backgroundColor = '#B45309'}
              onMouseLeave={e => e.currentTarget.style.backgroundColor = '#D97706'}
            >
              <FileEdit size={16} /> แก้ไขข้อมูลและยื่นเอกสารใหม่
            </button>
          </>
        );

      default:
        return null;
    }
  };

  return (
    <div style={{
      minHeight: '100dvh',
      display: 'flex',
      flexDirection: 'column',
      backgroundColor: '#FAF8F5',
      fontFamily: 'Prompt, sans-serif'
    }}>
      <div style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px',
      }}>
        <div style={{
          backgroundColor: '#FFFFFF',
          borderRadius: '16px',
          border: '1px solid #E5E7EB',
          padding: '36px 28px',
          width: '100%',
          maxWidth: '460px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
          textAlign: 'center',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '10px',
        }}>
          {renderContent()}
        </div>
      </div>
    </div>
  );
};

// ===== Shared Styles =====
const headingStyle = {
  margin: 0,
  fontSize: '1.35rem',
  fontWeight: 700,
  color: '#111827',
};

const descriptionStyle = {
  margin: 0,
  fontSize: '0.9rem',
  lineHeight: 1.55,
  color: '#4B5563',
};

const primaryButtonStyle = {
  marginTop: '12px',
  height: '42px',
  padding: '0 22px',
  backgroundColor: '#D97706',
  color: '#FFFFFF',
  border: 'none',
  borderRadius: '8px',
  fontWeight: 600,
  fontSize: '0.875rem',
  cursor: 'pointer',
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: '8px',
  boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
  transition: 'background-color 0.15s',
};

const secondaryButtonStyle = {
  marginTop: '8px',
  height: '42px',
  padding: '0 20px',
  backgroundColor: '#FFFFFF',
  border: '1px solid #D1D5DB',
  color: '#374151',
  borderRadius: '8px',
  fontWeight: 500,
  fontSize: '0.875rem',
  cursor: 'pointer',
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: '8px',
  transition: 'background-color 0.15s',
};

export default FoundationPending;
