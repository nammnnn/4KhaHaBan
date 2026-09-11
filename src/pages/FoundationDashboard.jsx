import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../services/supabaseClient';
import {
  Heart, Home, PlusCircle, ArrowRight, MessageCircle,
  AlertTriangle, MapPin, ShieldCheck, ChevronRight, CheckCircle2,
  Sparkles, Package, Clock, ExternalLink, QrCode
} from 'lucide-react';
import { FoundationDashboardSkeleton } from '../components/Skeletons';

const FoundationDashboard = () => {
  const { user, profile } = useAuth();
  const [stats, setStats] = useState({
    available: 0,
    adopted: 0,
    total: 0,
    pendingIncidents: 0,
    pendingMatches: 0,
    needsTotal: 0
  });
  const [recentNeeds, setRecentNeeds] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user && supabase) {
      fetchDashboardData();
    } else {
      setLoading(false);
    }
  }, [user]);

  const fetchDashboardData = async () => {
    try {
      // 1. สัตว์กำลังหาบ้าน
      const { count: availableCount } = await supabase
        .from('animals')
        .select('*', { count: 'exact', head: true })
        .eq('foundation_id', user.id)
        .eq('status', 'available');

      // 2. สัตว์ที่ได้บ้านแล้ว
      const { count: adoptedCount } = await supabase
        .from('animals')
        .select('*', { count: 'exact', head: true })
        .eq('foundation_id', user.id)
        .eq('status', 'adopted');

      // 3. เหตุกู้ภัยรอช่วยเหลือ
      const { count: incCount } = await supabase
        .from('incident_reports')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'pending');

      // 4. คำขอรับเลี้ยงที่รอดำเนินการ
      const { count: pendingMatchesCount } = await supabase
        .from('matches')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'pending');

      // 5. ของใช้จำเป็น Wishlist 3 รายการล่าสุด
      const { data: needsData, count: needsCount } = await supabase
        .from('foundation_needs')
        .select('*', { count: 'exact' })
        .eq('foundation_id', user.id)
        .order('created_at', { ascending: false })
        .limit(3);

      setStats({
        available: availableCount || 0,
        adopted: adoptedCount || 0,
        total: (availableCount || 0) + (adoptedCount || 0),
        pendingIncidents: incCount || 0,
        pendingMatches: pendingMatchesCount || 0,
        needsTotal: needsCount || 0
      });

      setRecentNeeds(needsData || []);
    } catch (error) {
      console.error('[Dashboard] Error fetching stats:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <FoundationDashboardSkeleton />;
  }

  const foundationName = profile?.full_name || 'มูลนิธิช่วยเหลือสัตว์';

  const getUrgencyBadge = (urgency) => {
    switch (urgency) {
      case 'critical':
        return { label: 'ด่วนมาก', bg: '#FEE2E2', color: '#DC2626', border: '#FECACA' };
      case 'high':
        return { label: 'จำเป็น', bg: '#FEF3C7', color: '#D97706', border: '#FDE68A' };
      default:
        return { label: 'เปิดรับทั่วไป', bg: '#F3F4F6', color: '#4B5563', border: '#E5E7EB' };
    }
  };

  if (loading) {
    return <FoundationDashboardSkeleton />;
  }

  return (
    <div style={{
      minHeight: '100dvh',
      backgroundColor: '#FAF8F5',
      fontFamily: 'Prompt, sans-serif',
      padding: '24px 16px 90px',
      boxSizing: 'border-box'
    }}>
      <div style={{ maxWidth: '860px', margin: '0 auto' }}>
        
        {/* Page Header */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '16px',
          marginBottom: '20px',
          flexWrap: 'wrap'
        }}>
          <div style={{ minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              <h1 style={{
                margin: 0,
                fontSize: '1.45rem',
                fontWeight: 700,
                color: '#111827',
                letterSpacing: '-0.02em'
              }}>
                {foundationName}
              </h1>
              <span style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '3px',
                backgroundColor: '#ECFDF5',
                color: '#059669',
                fontSize: '0.72rem',
                fontWeight: 600,
                padding: '2px 8px',
                borderRadius: '9999px',
                border: '1px solid #A7F3D0'
              }}>
                <ShieldCheck size={12} /> ได้รับการรับรอง
              </span>
            </div>
            <p style={{ margin: '4px 0 0', color: '#6B7280', fontSize: '0.85rem' }}>
              ศูนย์ควบคุมและจัดการข้อมูลสัตว์เลี้ยงเพื่อหาบ้าน
            </p>
          </div>

          <Link
            to="/foundation/animals/new"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              backgroundColor: '#D97706',
              color: '#FFFFFF',
              padding: '10px 18px',
              borderRadius: '10px',
              fontWeight: 600,
              fontSize: '0.875rem',
              textDecoration: 'none',
              boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
              transition: 'background-color 0.15s, transform 0.15s',
              flexShrink: 0
            }}
            onMouseEnter={e => {
              e.currentTarget.style.backgroundColor = '#B45309';
              e.currentTarget.style.transform = 'translateY(-1px)';
            }}
            onMouseLeave={e => {
              e.currentTarget.style.backgroundColor = '#D97706';
              e.currentTarget.style.transform = 'translateY(0)';
            }}
          >
            <PlusCircle size={18} />
            <span>เพิ่มสัตว์หาบ้าน</span>
          </Link>
        </div>

        {/* Emergency Alert Banner (ถ้ามีเคสฉุกเฉินรอช่วยเหลือ) */}
        {stats.pendingIncidents > 0 && (
          <motion.div
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.2 }}
            style={{ marginBottom: '20px' }}
          >
            <Link
              to="/foundation/incidents"
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '14px 18px',
                backgroundColor: '#FEF2F2',
                border: '1.5px solid #F87171',
                borderRadius: '14px',
                textDecoration: 'none',
                color: '#991B1B',
                boxShadow: '0 2px 6px rgba(220, 38, 38, 0.08)'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{
                  width: '38px',
                  height: '38px',
                  borderRadius: '10px',
                  backgroundColor: '#DC2626',
                  color: '#FFFFFF',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0
                }}>
                  <AlertTriangle size={20} />
                </div>
                <div>
                  <div style={{ fontWeight: 700, fontSize: '0.92rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span>เหตุกู้ภัยด่วนรอการช่วยเหลือ</span>
                    <span style={{
                      backgroundColor: '#DC2626',
                      color: '#FFFFFF',
                      fontSize: '0.72rem',
                      fontWeight: 700,
                      padding: '1px 8px',
                      borderRadius: '10px'
                    }}>
                      {stats.pendingIncidents} เคส
                    </span>
                  </div>
                  <div style={{ fontSize: '0.78rem', color: '#B91C1C', marginTop: '2px' }}>
                    มีพลเมืองดีแจ้งพิกัดสัตว์ต้องการความช่วยเหลือฉุกเฉิน
                  </div>
                </div>
              </div>
              <ChevronRight size={20} color="#DC2626" />
            </Link>
          </motion.div>
        )}

        {/* Overview Metrics Cards (4 Actionable Stat Cards) */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25, delay: 0.05 }}
          style={{ marginBottom: '24px' }}
        >
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
            gap: '12px'
          }}>
            {/* Stat 1: Available Pets */}
            <Link
              to="/foundation/animals"
              style={{
                backgroundColor: '#FFFFFF',
                borderRadius: '14px',
                padding: '16px',
                border: '1px solid #E5E7EB',
                boxShadow: '0 1px 2px rgba(0,0,0,0.02)',
                textDecoration: 'none',
                color: 'inherit',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                transition: 'border-color 0.15s, transform 0.15s'
              }}
              onMouseEnter={e => {
                e.currentTarget.style.borderColor = '#FCD34D';
                e.currentTarget.style.transform = 'translateY(-2px)';
              }}
              onMouseLeave={e => {
                e.currentTarget.style.borderColor = '#E5E7EB';
                e.currentTarget.style.transform = 'translateY(0)';
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
                <span style={{ fontSize: '0.82rem', fontWeight: 600, color: '#6B7280' }}>กำลังหาบ้าน</span>
                <div style={{ width: '32px', height: '32px', borderRadius: '8px', backgroundColor: '#FEF3C7', color: '#D97706', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Home size={17} />
                </div>
              </div>
              <div>
                <div style={{ fontSize: '1.65rem', fontWeight: 700, color: '#111827', lineHeight: 1 }}>
                  {stats.available} <span style={{ fontSize: '0.85rem', fontWeight: 500, color: '#6B7280' }}>ตัว</span>
                </div>
                <div style={{ fontSize: '0.74rem', color: '#D97706', fontWeight: 600, marginTop: '6px', display: 'flex', alignItems: 'center', gap: '2px' }}>
                  <span>จัดการข้อมูลสัตว์</span> <ChevronRight size={13} />
                </div>
              </div>
            </Link>

            {/* Stat 2: Adopted Pets */}
            <Link
              to="/foundation/animals"
              style={{
                backgroundColor: '#FFFFFF',
                borderRadius: '14px',
                padding: '16px',
                border: '1px solid #E5E7EB',
                boxShadow: '0 1px 2px rgba(0,0,0,0.02)',
                textDecoration: 'none',
                color: 'inherit',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                transition: 'border-color 0.15s, transform 0.15s'
              }}
              onMouseEnter={e => {
                e.currentTarget.style.borderColor = '#86EFAC';
                e.currentTarget.style.transform = 'translateY(-2px)';
              }}
              onMouseLeave={e => {
                e.currentTarget.style.borderColor = '#E5E7EB';
                e.currentTarget.style.transform = 'translateY(0)';
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
                <span style={{ fontSize: '0.82rem', fontWeight: 600, color: '#6B7280' }}>ได้บ้านแล้ว</span>
                <div style={{ width: '32px', height: '32px', borderRadius: '8px', backgroundColor: '#ECFDF5', color: '#059669', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Heart size={17} fill="currentColor" />
                </div>
              </div>
              <div>
                <div style={{ fontSize: '1.65rem', fontWeight: 700, color: '#111827', lineHeight: 1 }}>
                  {stats.adopted} <span style={{ fontSize: '0.85rem', fontWeight: 500, color: '#6B7280' }}>ตัว</span>
                </div>
                <div style={{ fontSize: '0.74rem', color: '#059669', fontWeight: 600, marginTop: '6px', display: 'flex', alignItems: 'center', gap: '2px' }}>
                  <span>ส่งมอบสำเร็จ</span> <ChevronRight size={13} />
                </div>
              </div>
            </Link>

            {/* Stat 3: Pending Applications / Chat */}
            <Link
              to="/foundation/matches"
              style={{
                backgroundColor: stats.pendingMatches > 0 ? '#FFFBEB' : '#FFFFFF',
                borderRadius: '14px',
                padding: '16px',
                border: stats.pendingMatches > 0 ? '1.5px solid #FCD34D' : '1px solid #E5E7EB',
                boxShadow: '0 1px 2px rgba(0,0,0,0.02)',
                textDecoration: 'none',
                color: 'inherit',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                transition: 'border-color 0.15s, transform 0.15s'
              }}
              onMouseEnter={e => {
                e.currentTarget.style.borderColor = '#F59E0B';
                e.currentTarget.style.transform = 'translateY(-2px)';
              }}
              onMouseLeave={e => {
                e.currentTarget.style.borderColor = stats.pendingMatches > 0 ? '#FCD34D' : '#E5E7EB';
                e.currentTarget.style.transform = 'translateY(0)';
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
                <span style={{ fontSize: '0.82rem', fontWeight: 600, color: '#6B7280' }}>คำขอรับเลี้ยง</span>
                <div style={{ width: '32px', height: '32px', borderRadius: '8px', backgroundColor: '#FEF3C7', color: '#D97706', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <MessageCircle size={17} />
                </div>
              </div>
              <div>
                <div style={{ fontSize: '1.65rem', fontWeight: 700, color: stats.pendingMatches > 0 ? '#B45309' : '#111827', lineHeight: 1 }}>
                  {stats.pendingMatches} <span style={{ fontSize: '0.85rem', fontWeight: 500, color: '#6B7280' }}>คำขอ</span>
                </div>
                <div style={{ fontSize: '0.74rem', color: stats.pendingMatches > 0 ? '#B45309' : '#6B7280', fontWeight: 600, marginTop: '6px', display: 'flex', alignItems: 'center', gap: '2px' }}>
                  <span>{stats.pendingMatches > 0 ? 'รอพิจารณาคำขอ' : 'ดูประวัติแชท'}</span> <ChevronRight size={13} />
                </div>
              </div>
            </Link>

            {/* Stat 4: Wishlist Needs */}
            <Link
              to="/foundation/needs"
              style={{
                backgroundColor: '#FFFFFF',
                borderRadius: '14px',
                padding: '16px',
                border: '1px solid #E5E7EB',
                boxShadow: '0 1px 2px rgba(0,0,0,0.02)',
                textDecoration: 'none',
                color: 'inherit',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                transition: 'border-color 0.15s, transform 0.15s'
              }}
              onMouseEnter={e => {
                e.currentTarget.style.borderColor = '#C084FC';
                e.currentTarget.style.transform = 'translateY(-2px)';
              }}
              onMouseLeave={e => {
                e.currentTarget.style.borderColor = '#E5E7EB';
                e.currentTarget.style.transform = 'translateY(0)';
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
                <span style={{ fontSize: '0.82rem', fontWeight: 600, color: '#6B7280' }}>ของใช้เปิดรับ</span>
                <div style={{ width: '32px', height: '32px', borderRadius: '8px', backgroundColor: '#F3E8FF', color: '#9333EA', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Package size={17} />
                </div>
              </div>
              <div>
                <div style={{ fontSize: '1.65rem', fontWeight: 700, color: '#111827', lineHeight: 1 }}>
                  {stats.needsTotal} <span style={{ fontSize: '0.85rem', fontWeight: 500, color: '#6B7280' }}>รายการ</span>
                </div>
                <div style={{ fontSize: '0.74rem', color: '#9333EA', fontWeight: 600, marginTop: '6px', display: 'flex', alignItems: 'center', gap: '2px' }}>
                  <span>จัดการ Wishlist</span> <ChevronRight size={13} />
                </div>
              </div>
            </Link>
          </div>
        </motion.div>

        {/* Operational Section: 2 Columns */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
          gap: '16px',
          marginBottom: '24px'
        }}>
          {/* Card 1: Wishlist Needs (ของใช้จำเป็นที่เปิดรับบริจาค) */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25, delay: 0.1 }}
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: '16px',
              padding: '18px 20px',
              border: '1px solid #E5E7EB',
              boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
              display: 'flex',
              flexDirection: 'column'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{ width: '28px', height: '28px', borderRadius: '7px', backgroundColor: '#F3E8FF', color: '#9333EA', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Package size={16} />
                </div>
                <h2 style={{ margin: 0, fontSize: '0.98rem', fontWeight: 700, color: '#111827' }}>
                  ของใช้จำเป็นที่เปิดรับบริจาค
                </h2>
              </div>
              <Link
                to="/foundation/needs"
                style={{ fontSize: '0.8rem', fontWeight: 600, color: '#D97706', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '2px' }}
              >
                <span>จัดการทั้งหมด</span> <ChevronRight size={14} />
              </Link>
            </div>

            {recentNeeds.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', flex: 1 }}>
                {recentNeeds.map((item) => {
                  const badge = getUrgencyBadge(item.urgency);
                  return (
                    <div
                      key={item.id}
                      style={{
                        padding: '10px 12px',
                        backgroundColor: '#FAF8F5',
                        borderRadius: '10px',
                        border: '1px solid #F3F4F6',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: '10px'
                      }}
                    >
                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontSize: '0.875rem', fontWeight: 600, color: '#1F2937', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {item.item_name}
                        </div>
                        {item.note && (
                          <div style={{ fontSize: '0.74rem', color: '#6B7280', marginTop: '2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {item.note}
                          </div>
                        )}
                      </div>
                      <span style={{
                        fontSize: '0.68rem',
                        fontWeight: 700,
                        padding: '2px 8px',
                        borderRadius: '6px',
                        backgroundColor: badge.bg,
                        color: badge.color,
                        border: `1px solid ${badge.border}`,
                        flexShrink: 0
                      }}>
                        {badge.label}
                      </span>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div style={{ textAlign: 'center', padding: '24px 12px', color: '#9CA3AF', flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                <Package size={28} style={{ opacity: 0.4, marginBottom: '6px' }} />
                <p style={{ margin: 0, fontSize: '0.85rem' }}>ยังไม่มีรายการของใช้ที่เปิดรับ</p>
                <Link
                  to="/foundation/needs"
                  style={{ marginTop: '10px', fontSize: '0.8rem', fontWeight: 600, color: '#D97706', textDecoration: 'none' }}
                >
                  + เพิ่มรายการของใช้เปิดรับ
                </Link>
              </div>
            )}
          </motion.div>

          {/* Card 2: Operations & Shelter Info (สถานะกู้ภัยและข้อมูลศูนย์) */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25, delay: 0.15 }}
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: '16px',
              padding: '18px 20px',
              border: '1px solid #E5E7EB',
              boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              gap: '14px'
            }}
          >
            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <div style={{ width: '28px', height: '28px', borderRadius: '7px', backgroundColor: '#EFF6FF', color: '#2563EB', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <MapPin size={16} />
                  </div>
                  <h2 style={{ margin: 0, fontSize: '0.98rem', fontWeight: 700, color: '#111827' }}>
                    ข้อมูลศูนย์และการดำเนินงาน
                  </h2>
                </div>
                <Link
                  to="/profile"
                  style={{ fontSize: '0.8rem', fontWeight: 600, color: '#2563EB', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '2px' }}
                >
                  <span>แก้ไขโปรไฟล์</span> <ChevronRight size={14} />
                </Link>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {/* Shelter Location Status */}
                <div style={{
                  padding: '10px 12px',
                  backgroundColor: '#F8FAFC',
                  borderRadius: '10px',
                  border: '1px solid #E2E8F0',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '10px'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}>
                    <MapPin size={16} color="#3B82F6" style={{ flexShrink: 0 }} />
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontSize: '0.84rem', fontWeight: 600, color: '#1E293B' }}>ที่ตั้งศูนย์พักพิง</div>
                      <div style={{ fontSize: '0.74rem', color: '#64748B', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {profile?.address || 'ระบุพิกัด GPS เพื่อให้ผู้ใช้ค้นหาได้ง่ายขึ้น'}
                      </div>
                    </div>
                  </div>
                  <Link
                    to="/profile?editLocation=true"
                    style={{
                      fontSize: '0.75rem',
                      fontWeight: 600,
                      color: '#2563EB',
                      backgroundColor: '#EFF6FF',
                      border: '1px solid #BFDBFE',
                      padding: '4px 8px',
                      borderRadius: '6px',
                      textDecoration: 'none',
                      whiteSpace: 'nowrap'
                    }}
                  >
                    ตั้งค่า GPS
                  </Link>
                </div>

                {/* PromptPay & Donation Status */}
                <div style={{
                  padding: '10px 12px',
                  backgroundColor: '#F8FAFC',
                  borderRadius: '10px',
                  border: '1px solid #E2E8F0',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '10px'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}>
                    <QrCode size={16} color="#059669" style={{ flexShrink: 0 }} />
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontSize: '0.84rem', fontWeight: 600, color: '#1E293B' }}>พร้อมเพย์รับบริจาค</div>
                      <div style={{ fontSize: '0.74rem', color: '#64748B', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {profile?.promptpay_number ? `เปิดรับบริจาค (${profile.promptpay_number})` : 'ยังไม่ได้ตั้งค่าหมายเลขพร้อมเพย์'}
                      </div>
                    </div>
                  </div>
                  <Link
                    to="/profile"
                    style={{
                      fontSize: '0.75rem',
                      fontWeight: 600,
                      color: '#059669',
                      backgroundColor: '#ECFDF5',
                      border: '1px solid #A7F3D0',
                      padding: '4px 8px',
                      borderRadius: '6px',
                      textDecoration: 'none',
                      whiteSpace: 'nowrap'
                    }}
                  >
                    {profile?.promptpay_number ? 'ดูข้อมูล' : 'ตั้งค่า'}
                  </Link>
                </div>
              </div>
            </div>

            {/* Rescue Status Banner */}
            <div style={{
              padding: '10px 12px',
              backgroundColor: stats.pendingIncidents > 0 ? '#FEF2F2' : '#F0FDF4',
              borderRadius: '10px',
              border: stats.pendingIncidents > 0 ? '1px solid #FECACA' : '1px solid #BBF7D0',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              fontSize: '0.8rem'
            }}>
              <span style={{ fontWeight: 600, color: stats.pendingIncidents > 0 ? '#DC2626' : '#15803D' }}>
                {stats.pendingIncidents > 0 ? `เหตุกู้ภัย: มี ${stats.pendingIncidents} เคสรอดำเนินการ` : 'เหตุกู้ภัย: ไม่มีเคสฉุกเฉินค้าง'}
              </span>
              <Link
                to="/foundation/incidents"
                style={{
                  fontWeight: 600,
                  color: stats.pendingIncidents > 0 ? '#DC2626' : '#15803D',
                  textDecoration: 'none',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '2px'
                }}
              >
                <span>ดูแผนที่กู้ภัย</span> <ChevronRight size={13} />
              </Link>
            </div>
          </motion.div>
        </div>

        {/* Adoption Tips / Best Practices Card */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25, delay: 0.2 }}
          style={{
            backgroundColor: '#FFFFFF',
            borderRadius: '16px',
            padding: '16px 20px',
            border: '1px solid #E5E7EB',
            boxShadow: '0 1px 3px rgba(0,0,0,0.02)'
          }}
        >
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            marginBottom: '10px',
            color: '#111827',
            fontWeight: 600,
            fontSize: '0.9rem'
          }}>
            <Sparkles size={17} color="#D97706" />
            <span>แนวทางลงข้อมูลสัตว์เพื่อเพิ่มโอกาสได้บ้าน</span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', fontSize: '0.82rem', color: '#4B5563', lineHeight: 1.5 }}>
              <CheckCircle2 size={15} color="#059669" style={{ marginTop: '2px', flexShrink: 0 }} />
              <span>เลือกใช้รูปถ่ายแสงธรรมชาติที่เห็นหน้าสัตว์เลี้ยงและดวงตาชัดเจน</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', fontSize: '0.82rem', color: '#4B5563', lineHeight: 1.5 }}>
              <CheckCircle2 size={15} color="#059669" style={{ marginTop: '2px', flexShrink: 0 }} />
              <span>บรรยายบุคลิก อุปนิสัย และประวัติสุขภาพเบื้องต้นอย่างละเอียด</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', fontSize: '0.82rem', color: '#4B5563', lineHeight: 1.5 }}>
              <CheckCircle2 size={15} color="#059669" style={{ marginTop: '2px', flexShrink: 0 }} />
              <span>ระบุแท็กพฤติกรรม เช่น "เข้ากับเด็กได้", "ฝึกขับถ่ายแล้ว", "ขี้เล่น"</span>
            </div>
          </div>
        </motion.div>
        
      </div>
    </div>
  );
};

export default FoundationDashboard;
