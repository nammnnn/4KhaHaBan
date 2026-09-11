import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { 
  ChevronLeft, 
  Calendar, 
  Bell, 
  Camera, 
  CheckCircle2, 
  Activity, 
  Syringe, 
  Scissors, 
  Utensils, 
  Sparkles, 
  X, 
  Loader2, 
  Clock, 
  AlertTriangle,
  History,
  Check
} from 'lucide-react';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../services/supabaseClient';
import { AdoptionFollowupSkeleton } from '../components/Skeletons';

export default function AdoptionFollowup() {
  const { matchId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [matchData, setMatchData] = useState(null);
  const [animal, setAnimal] = useState(null);
  const [followupInfo, setFollowupInfo] = useState({ followups: [], milestones: [], nextDue: null });

  // Form states
  const [photos, setPhotos] = useState([]);
  const [photoFiles, setPhotoFiles] = useState([]);
  const [healthStatus, setHealthStatus] = useState('แข็งแรงดี');
  const [vaccineStatus, setVaccineStatus] = useState('ครบแล้ว');
  const [neuteredStatus, setNeuteredStatus] = useState('แล้ว');
  const [foodStatus, setFoodStatus] = useState('กินอาหารเม็ด + อาหารเปียก');
  const [behaviorStatus, setBehaviorStatus] = useState('ปรับตัวได้ดี ร่าเริง');
  const [notes, setNotes] = useState('');
  const [successToast, setSuccessToast] = useState(false);
  const [bypassWait, setBypassWait] = useState(false);

  const fileInputRef = useRef(null);

  // Load initial data
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const info = await api.getAdoptionFollowups(matchId);
        setFollowupInfo(info);

        if (info.match) {
          setMatchData(info.match);
          if (info.match.animal) {
            setAnimal(info.match.animal);
          } else if (info.match.animal_id) {
            const aData = await api.getAnimalById(info.match.animal_id);
            setAnimal(aData);
          }
        }
      } catch (err) {
        console.error('Error loading followup data:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [matchId]);

  const handlePhotoSelect = (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;

    if (photos.length + files.length > 5) {
      alert('สามารถอัปโหลดได้สูงสุด 5 รูปภาพ');
      return;
    }

    const newPreviewUrls = files.map(file => URL.createObjectURL(file));
    setPhotos(prev => [...prev, ...newPreviewUrls]);
    setPhotoFiles(prev => [...prev, ...files]);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleRemovePhoto = (index) => {
    setPhotos(prev => prev.filter((_, i) => i !== index));
    setPhotoFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (submitting) return;

    if (photos.length === 0) {
      alert('กรุณาอัปโหลดรูปภาพน้องอย่างน้อย 1 รูป เพื่อยืนยันสุขภาวะ');
      return;
    }

    try {
      setSubmitting(true);

      // Upload photos
      const uploadedUrls = [];
      for (const file of photoFiles) {
        const url = await api.uploadFollowupPhoto(file);
        if (url) uploadedUrls.push(url);
      }

      // Fallback if some failed
      const finalPhotos = uploadedUrls.length > 0 ? uploadedUrls : photos;

      const nextDue = followupInfo.nextDue;
      const milestoneIndex = nextDue ? nextDue.milestoneIndex : (followupInfo.followups.length + 1);
      const milestoneLabel = nextDue ? nextDue.milestoneLabel : `ครั้งที่ ${milestoneIndex} (ครบ ${milestoneIndex * 2} เดือน)`;

      await api.submitAdoptionFollowup({
        match_id: matchId,
        animal_id: animal?.id || matchData?.animal_id || '',
        user_id: user?.id,
        foundation_id: animal?.foundation_id || matchData?.foundation_id || null,
        milestone_index: milestoneIndex,
        milestone_label: milestoneLabel,
        due_date: nextDue?.dueDate || new Date().toISOString(),
        photos: finalPhotos,
        health_status: healthStatus,
        vaccine_status: vaccineStatus,
        neutered_status: neuteredStatus,
        food_status: foodStatus,
        behavior_status: behaviorStatus,
        notes: notes.trim()
      });

      setSuccessToast(true);
      setTimeout(() => {
        navigate(`/adoption/timeline/${matchId}`);
      }, 1500);

    } catch (err) {
      console.error('Failed to submit followup:', err);
      alert('เกิดข้อผิดพลาดในการส่งข้อมูล กรุณาลองใหม่อีกครั้ง');
    } finally {
      setSubmitting(false);
    }
  };

  const formatThaiDate = (dateStr) => {
    if (!dateStr) return '-';
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString('th-TH', { year: 'numeric', month: 'long', day: 'numeric' });
    } catch {
      return dateStr;
    }
  };

  if (loading) {
    return <AdoptionFollowupSkeleton />;
  }

  const nextDue = followupInfo.nextDue;
  const isOverdue = nextDue?.isOverdue;
  const daysInfo = isOverdue ? `(เกินกำหนด ${nextDue.daysOverdue} วัน)` : `(อีก ${nextDue?.daysRemaining || 0} วัน)`;

  const petImage = animal?.images?.[0] || 'https://images.unsplash.com/photo-1543466835-00a7907e9de1?auto=format&fit=crop&q=80&w=600';
  const petName = animal?.name || 'น้องสัตว์เลี้ยง';
  const petSpecies = animal?.species === 'cat' ? 'แมว' : 'สุนัข';
  const petAge = animal?.age ? `${animal.age} ปี` : 'อายุ 2 ปี';
  const petGender = animal?.gender === 'female' ? 'เพศเมีย' : 'เพศผู้';

  return (
    <div style={{ minHeight: '100dvh', backgroundColor: '#FAF8F5', fontFamily: 'Prompt, sans-serif', padding: '24px 16px 80px', boxSizing: 'border-box' }}>
      <div style={{ maxWidth: '480px', margin: '0 auto', width: '100%' }}>

        {/* Top Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <button
              type="button"
              onClick={() => navigate(-1)}
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
                cursor: 'pointer',
                boxShadow: '0 1px 2px rgba(0,0,0,0.04)',
                transition: 'background-color 0.15s'
              }}
              onMouseEnter={e => e.currentTarget.style.backgroundColor = '#F9FAFB'}
              onMouseLeave={e => e.currentTarget.style.backgroundColor = '#FFFFFF'}
              aria-label="ย้อนกลับ"
            >
              <ChevronLeft size={20} />
            </button>
            <h1 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 700, color: '#111827' }}>
              ติดตามสถานะการรับเลี้ยง
            </h1>
          </div>

          <Link
            to={`/adoption/timeline/${matchId}`}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '6px 12px',
              backgroundColor: '#FFFFFF',
              border: '1px solid #D1D5DB',
              borderRadius: '8px',
              fontSize: '0.82rem',
              fontWeight: 600,
              color: '#374151',
              textDecoration: 'none',
              boxShadow: '0 1px 2px rgba(0,0,0,0.04)'
            }}
          >
            <History size={15} /> ประวัติ
          </Link>
        </div>

        {/* Pet Profile Card */}
        <div style={{
          backgroundColor: '#FFFFFF',
          borderRadius: '16px',
          padding: '16px',
          border: '1px solid #E5E7EB',
          boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
          display: 'flex',
          alignItems: 'center',
          gap: '16px',
          marginBottom: '16px'
        }}>
          <img
            src={petImage}
            alt={petName}
            style={{ width: '68px', height: '68px', borderRadius: '12px', objectFit: 'cover', flexShrink: 0 }}
          />
          <div style={{ flex: 1, minWidth: 0 }}>
            <h2 style={{ margin: '0 0 4px', fontSize: '1.15rem', fontWeight: 700, color: '#111827' }}>
              {petName}
            </h2>
            <p style={{ margin: '0 0 6px', fontSize: '0.82rem', color: '#6B7280' }}>
              {petSpecies} | อายุ {petAge} | {petGender}
            </p>
            <span style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
              backgroundColor: '#DCFCE7',
              color: '#15803D',
              fontSize: '0.75rem',
              fontWeight: 600,
              padding: '2px 8px',
              borderRadius: '6px'
            }}>
              <CheckCircle2 size={12} /> อยู่กับเจ้าของแล้ว
            </span>
          </div>
        </div>

        {/* Case A: All Milestones Completed */}
        {followupInfo?.allSubmitted ? (
          <div style={{
            backgroundColor: '#FFFFFF',
            borderRadius: '16px',
            padding: '36px 20px',
            border: '1px solid #BBF7D0',
            textAlign: 'center',
            boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
            marginBottom: '24px'
          }}>
            <div style={{
              width: '64px',
              height: '64px',
              borderRadius: '50%',
              backgroundColor: '#DCFCE7',
              color: '#15803D',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 16px'
            }}>
              <CheckCircle2 size={36} />
            </div>
            <h2 style={{ fontSize: '1.2rem', fontWeight: 700, color: '#111827', margin: '0 0 8px' }}>
              ส่งรายงานติดตามผลครบทุกงวดแล้ว
            </h2>
            <p style={{ fontSize: '0.85rem', color: '#6B7280', margin: '0 0 24px', lineHeight: 1.6 }}>
              ขอบพระคุณที่ดูแลน้องเป็นอย่างดี น้องมีครอบครัวที่อบอุ่นและเติบโตอย่างมีความสุขสมบูรณ์แบบแล้วครับ/ค่ะ
            </p>
            <Link
              to={`/adoption/timeline/${matchId}`}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                padding: '10px 20px',
                backgroundColor: '#15803D',
                color: '#FFFFFF',
                borderRadius: '10px',
                fontWeight: 600,
                fontSize: '0.88rem',
                textDecoration: 'none'
              }}
            >
              <History size={16} /> ดูประวัติการติดตามทั้งหมด
            </Link>
          </div>
        ) : (!followupInfo?.isDueForSubmission && !bypassWait) ? (
          /* Case B: Not due yet gate screen */
          <div style={{
            backgroundColor: '#FFFFFF',
            borderRadius: '16px',
            padding: '32px 20px',
            border: '1px solid #E5E7EB',
            textAlign: 'center',
            boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
            marginBottom: '24px'
          }}>
            <div style={{
              width: '64px',
              height: '64px',
              borderRadius: '50%',
              backgroundColor: '#FEF3C7',
              color: '#D97706',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 16px'
            }}>
              <Clock size={34} />
            </div>

            <h2 style={{ fontSize: '1.2rem', fontWeight: 700, color: '#111827', margin: '0 0 6px' }}>
              ยังไม่ถึงรอบส่งอัปเดตสถานะ
            </h2>

            <div style={{
              backgroundColor: '#F9FAFB',
              borderRadius: '12px',
              padding: '16px',
              margin: '18px 0',
              border: '1px solid #F3F4F6',
              textAlign: 'left'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '0.85rem' }}>
                <span style={{ color: '#6B7280' }}>รอบส่งถัดไป:</span>
                <strong style={{ color: '#111827' }}>{nextDue?.milestoneLabel || 'ครั้งที่ 1 (ครบ 2 เดือน)'}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '0.85rem' }}>
                <span style={{ color: '#6B7280' }}>วันที่กำหนดส่ง:</span>
                <strong style={{ color: '#111827' }}>{formatThaiDate(nextDue?.dueDate)}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                <span style={{ color: '#6B7280' }}>ระยะเวลาที่เหลือ:</span>
                <span style={{ color: '#D97706', fontWeight: 700 }}>อีก {nextDue?.daysRemaining || 0} วัน</span>
              </div>
            </div>

            <p style={{ fontSize: '0.82rem', color: '#6B7280', margin: '0 0 24px', lineHeight: 1.6 }}>
              ระบบจะเปิดให้ส่งแบบประเมินและรูปถ่ายเมื่อถึงกำหนดส่ง (เปิดส่งล่วงหน้า 7 วันก่อนครบกำหนด) เพื่อให้รายงานสุขภาพและพัฒนาการของน้องตรงตามช่วงเวลาจริงครับ/ค่ะ
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <Link
                to={`/adoption/timeline/${matchId}`}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  padding: '10px 16px',
                  backgroundColor: '#15803D',
                  color: '#FFFFFF',
                  borderRadius: '10px',
                  fontWeight: 600,
                  fontSize: '0.88rem',
                  textDecoration: 'none'
                }}
              >
                <History size={16} /> ดูประวัติและกำหนดการไทม์ไลน์
              </Link>

              <button
                type="button"
                onClick={() => setBypassWait(true)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#9CA3AF',
                  fontSize: '0.75rem',
                  cursor: 'pointer',
                  padding: '6px',
                  textDecoration: 'underline'
                }}
              >
                ส่งล่วงหน้า (สำหรับทดสอบระบบ)
              </button>
            </div>
          </div>
        ) : (
          <>
            {/* Schedule Box */}
            <div style={{
              backgroundColor: isOverdue ? '#FEF2F2' : '#F0FDF4',
              border: `1.5px solid ${isOverdue ? '#FECACA' : '#BBF7D0'}`,
              borderRadius: '16px',
              padding: '16px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: '20px'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{
                  width: '42px',
                  height: '42px',
                  borderRadius: '12px',
                  backgroundColor: isOverdue ? '#FEE2E2' : '#DCFCE7',
                  color: isOverdue ? '#DC2626' : '#16A34A',
                  display: 'flex',
                  justifyContent: 'center',
                  alignItems: 'center',
                  flexShrink: 0
                }}>
                  {isOverdue ? <AlertTriangle size={22} /> : <Calendar size={22} />}
                </div>
                <div>
                  <span style={{ fontSize: '0.78rem', color: isOverdue ? '#991B1B' : '#166534', fontWeight: 600, display: 'block' }}>
                    กำหนดส่งอัปเดตครั้งถัดไป ({nextDue?.milestoneLabel || 'รอบถัดไป'})
                  </span>
                  <strong style={{ fontSize: '1rem', color: '#111827', display: 'block', marginTop: '2px' }}>
                    {formatThaiDate(nextDue?.dueDate)}
                  </strong>
                  <span style={{ fontSize: '0.75rem', color: isOverdue ? '#DC2626' : '#15803D', fontWeight: 600 }}>
                    {daysInfo}
                  </span>
                </div>
              </div>

              <div style={{
                width: '34px',
                height: '34px',
                borderRadius: '50%',
                backgroundColor: isOverdue ? '#FEE2E2' : '#DCFCE7',
                color: isOverdue ? '#DC2626' : '#16A34A',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <Bell size={18} />
              </div>
            </div>

            <form onSubmit={handleSubmit}>

          {/* Photo Upload Section */}
          <div style={{ marginBottom: '22px' }}>
            <label style={{ display: 'block', fontWeight: 700, fontSize: '0.95rem', color: '#111827', marginBottom: '8px' }}>
              อัปเดตรูปภาพและสถานะล่าสุด
            </label>

            {/* Photo Previews */}
            {photos.length > 0 && (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px', marginBottom: '12px' }}>
                {photos.map((src, idx) => (
                  <div key={idx} style={{ position: 'relative', width: '100%', aspectRatio: '1', borderRadius: '12px', overflow: 'hidden', border: '1px solid #E5E7EB' }}>
                    <img src={src} alt={`preview-${idx}`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    <button
                      type="button"
                      onClick={() => handleRemovePhoto(idx)}
                      style={{
                        position: 'absolute',
                        top: '4px',
                        right: '4px',
                        backgroundColor: 'rgba(0,0,0,0.65)',
                        color: '#FFFFFF',
                        border: 'none',
                        borderRadius: '50%',
                        width: '22px',
                        height: '22px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: 'pointer'
                      }}
                      aria-label="ลบรูปภาพ"
                    >
                      <X size={14} />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {photos.length < 5 && (
              <div
                onClick={() => fileInputRef.current?.click()}
                style={{
                  border: '1.5px dashed #D1D5DB',
                  borderRadius: '16px',
                  backgroundColor: '#FFFFFF',
                  padding: '24px 16px',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  transition: 'border-color 0.15s, background-color 0.15s'
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.borderColor = '#16A34A';
                  e.currentTarget.style.backgroundColor = '#F9FAFB';
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.borderColor = '#D1D5DB';
                  e.currentTarget.style.backgroundColor = '#FFFFFF';
                }}
              >
                <div style={{
                  width: '48px',
                  height: '48px',
                  borderRadius: '50%',
                  backgroundColor: '#F3F4F6',
                  color: '#6B7280',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginBottom: '8px'
                }}>
                  <Camera size={24} />
                </div>
                <span style={{ fontSize: '0.9rem', fontWeight: 600, color: '#374151' }}>
                  อัปโหลดรูปภาพ
                </span>
                <span style={{ fontSize: '0.78rem', color: '#9CA3AF', marginTop: '2px' }}>
                  (สูงสุด 5 รูป • ถ่ายภาพกิจกรรมความเป็นอยู่ของน้อง)
                </span>
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handlePhotoSelect}
                  accept="image/*"
                  multiple
                  style={{ display: 'none' }}
                />
              </div>
            )}
          </div>

          {/* Health and Care Section */}
          <div style={{
            backgroundColor: '#FFFFFF',
            borderRadius: '16px',
            border: '1px solid #E5E7EB',
            padding: '18px 16px',
            marginBottom: '20px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.03)'
          }}>
            <h3 style={{ margin: '0 0 16px', fontSize: '1rem', fontWeight: 700, color: '#111827' }}>
              สถานะสุขภาพและการดูแล
            </h3>

            {/* Checklist items */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>

              {/* 1. สุขภาพทั่วไป */}
              <div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div style={{ width: '28px', height: '28px', borderRadius: '8px', backgroundColor: '#DCFCE7', color: '#16A34A', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Activity size={16} />
                    </div>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: '0.88rem', color: '#111827' }}>สุขภาพทั่วไป</div>
                      <div style={{ fontSize: '0.75rem', color: '#16A34A', fontWeight: 500 }}>{healthStatus}</div>
                    </div>
                  </div>
                  <CheckCircle2 size={18} color="#16A34A" />
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                  {['แข็งแรงดี', 'ป่วยเล็กน้อย/กำลังรักษา', 'ต้องพบสัตวแพทย์'].map(opt => (
                    <button
                      key={opt}
                      type="button"
                      onClick={() => setHealthStatus(opt)}
                      style={{
                        padding: '4px 10px',
                        fontSize: '0.75rem',
                        borderRadius: '6px',
                        border: healthStatus === opt ? '1.5px solid #16A34A' : '1px solid #E5E7EB',
                        backgroundColor: healthStatus === opt ? '#F0FDF4' : '#FFFFFF',
                        color: healthStatus === opt ? '#166534' : '#4B5563',
                        fontWeight: healthStatus === opt ? 600 : 400,
                        cursor: 'pointer'
                      }}
                    >
                      {opt}
                    </button>
                  ))}
                </div>
              </div>

              {/* 2. วัคซีน */}
              <div style={{ borderTop: '1px solid #F3F4F6', paddingTop: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div style={{ width: '28px', height: '28px', borderRadius: '8px', backgroundColor: '#DCFCE7', color: '#16A34A', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Syringe size={16} />
                    </div>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: '0.88rem', color: '#111827' }}>วัคซีน</div>
                      <div style={{ fontSize: '0.75rem', color: '#16A34A', fontWeight: 500 }}>{vaccineStatus}</div>
                    </div>
                  </div>
                  <CheckCircle2 size={18} color="#16A34A" />
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                  {['ครบแล้ว', 'รอตามนัดเข็มถัดไป', 'ยังไม่ได้รับ'].map(opt => (
                    <button
                      key={opt}
                      type="button"
                      onClick={() => setVaccineStatus(opt)}
                      style={{
                        padding: '4px 10px',
                        fontSize: '0.75rem',
                        borderRadius: '6px',
                        border: vaccineStatus === opt ? '1.5px solid #16A34A' : '1px solid #E5E7EB',
                        backgroundColor: vaccineStatus === opt ? '#F0FDF4' : '#FFFFFF',
                        color: vaccineStatus === opt ? '#166534' : '#4B5563',
                        fontWeight: vaccineStatus === opt ? 600 : 400,
                        cursor: 'pointer'
                      }}
                    >
                      {opt}
                    </button>
                  ))}
                </div>
              </div>

              {/* 3. ทำหมัน */}
              <div style={{ borderTop: '1px solid #F3F4F6', paddingTop: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div style={{ width: '28px', height: '28px', borderRadius: '8px', backgroundColor: '#DCFCE7', color: '#16A34A', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Scissors size={16} />
                    </div>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: '0.88rem', color: '#111827' }}>ทำหมัน</div>
                      <div style={{ fontSize: '0.75rem', color: '#16A34A', fontWeight: 500 }}>{neuteredStatus}</div>
                    </div>
                  </div>
                  <CheckCircle2 size={18} color="#16A34A" />
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                  {['แล้ว', 'ยังไม่ถึงเกณฑ์วัย', 'ยังไม่ได้ทำ'].map(opt => (
                    <button
                      key={opt}
                      type="button"
                      onClick={() => setNeuteredStatus(opt)}
                      style={{
                        padding: '4px 10px',
                        fontSize: '0.75rem',
                        borderRadius: '6px',
                        border: neuteredStatus === opt ? '1.5px solid #16A34A' : '1px solid #E5E7EB',
                        backgroundColor: neuteredStatus === opt ? '#F0FDF4' : '#FFFFFF',
                        color: neuteredStatus === opt ? '#166534' : '#4B5563',
                        fontWeight: neuteredStatus === opt ? 600 : 400,
                        cursor: 'pointer'
                      }}
                    >
                      {opt}
                    </button>
                  ))}
                </div>
              </div>

              {/* 4. อาหาร */}
              <div style={{ borderTop: '1px solid #F3F4F6', paddingTop: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div style={{ width: '28px', height: '28px', borderRadius: '8px', backgroundColor: '#DCFCE7', color: '#16A34A', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Utensils size={16} />
                    </div>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: '0.88rem', color: '#111827' }}>อาหาร</div>
                      <div style={{ fontSize: '0.75rem', color: '#16A34A', fontWeight: 500 }}>{foodStatus}</div>
                    </div>
                  </div>
                  <CheckCircle2 size={18} color="#16A34A" />
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                  {['กินอาหารเม็ด + อาหารเปียก', 'กินอาหารเม็ดอย่างเดียว', 'ปรุงเอง/บาร์ฟ', 'กินได้ปกติ'].map(opt => (
                    <button
                      key={opt}
                      type="button"
                      onClick={() => setFoodStatus(opt)}
                      style={{
                        padding: '4px 10px',
                        fontSize: '0.75rem',
                        borderRadius: '6px',
                        border: foodStatus === opt ? '1.5px solid #16A34A' : '1px solid #E5E7EB',
                        backgroundColor: foodStatus === opt ? '#F0FDF4' : '#FFFFFF',
                        color: foodStatus === opt ? '#166534' : '#4B5563',
                        fontWeight: foodStatus === opt ? 600 : 400,
                        cursor: 'pointer'
                      }}
                    >
                      {opt}
                    </button>
                  ))}
                </div>
              </div>

              {/* 5. พฤติกรรม */}
              <div style={{ borderTop: '1px solid #F3F4F6', paddingTop: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div style={{ width: '28px', height: '28px', borderRadius: '8px', backgroundColor: '#DCFCE7', color: '#16A34A', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Sparkles size={16} />
                    </div>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: '0.88rem', color: '#111827' }}>พฤติกรรม</div>
                      <div style={{ fontSize: '0.75rem', color: '#16A34A', fontWeight: 500 }}>{behaviorStatus}</div>
                    </div>
                  </div>
                  <CheckCircle2 size={18} color="#16A34A" />
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                  {['ปรับตัวได้ดี ร่าเริง', 'ขี้อ้อน คุ้นเคยแล้ว', 'ยังตื่นกลัวเล็กน้อย', 'ต้องปรับพฤติกรรม'].map(opt => (
                    <button
                      key={opt}
                      type="button"
                      onClick={() => setBehaviorStatus(opt)}
                      style={{
                        padding: '4px 10px',
                        fontSize: '0.75rem',
                        borderRadius: '6px',
                        border: behaviorStatus === opt ? '1.5px solid #16A34A' : '1px solid #E5E7EB',
                        backgroundColor: behaviorStatus === opt ? '#F0FDF4' : '#FFFFFF',
                        color: behaviorStatus === opt ? '#166534' : '#4B5563',
                        fontWeight: behaviorStatus === opt ? 600 : 400,
                        cursor: 'pointer'
                      }}
                    >
                      {opt}
                    </button>
                  ))}
                </div>
              </div>

              {/* Additional notes */}
              <div style={{ borderTop: '1px solid #F3F4F6', paddingTop: '12px' }}>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: '#374151', marginBottom: '6px' }}>
                  บันทึกเพิ่มเติมถึงเจ้าหน้าที่มูลนิธิ
                </label>
                <textarea
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  placeholder="เช่น น้องชอบวิ่งเล่นในสวน ทานข้าวเก่งมาก..."
                  style={{
                    width: '100%',
                    height: '70px',
                    padding: '8px 12px',
                    fontSize: '0.85rem',
                    borderRadius: '8px',
                    border: '1px solid #D1D5DB',
                    outline: 'none',
                    fontFamily: 'inherit',
                    resize: 'none',
                    boxSizing: 'border-box'
                  }}
                />
              </div>

            </div>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={submitting}
            style={{
              width: '100%',
              height: '48px',
              backgroundColor: '#15803D',
              color: '#FFFFFF',
              border: 'none',
              borderRadius: '12px',
              fontSize: '1rem',
              fontWeight: 700,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              cursor: submitting ? 'not-allowed' : 'pointer',
              boxShadow: '0 2px 6px rgba(21, 128, 61, 0.25)',
              transition: 'background-color 0.15s',
              marginBottom: '16px'
            }}
            onMouseEnter={e => { if (!submitting) e.currentTarget.style.backgroundColor = '#166534'; }}
            onMouseLeave={e => { if (!submitting) e.currentTarget.style.backgroundColor = '#15803D'; }}
          >
            {submitting ? (
              <>
                <Loader2 size={20} className="spin" /> กำลังส่งข้อมูล...
              </>
            ) : (
              <>
                <Camera size={20} /> อัปเดตสถานะน้อง
              </>
            )}
          </button>

          {/* Bottom Reminder Banner */}
          <div style={{
            backgroundColor: '#FFF7ED',
            border: '1px solid #FFEDD5',
            borderRadius: '12px',
            padding: '12px 14px',
            display: 'flex',
            alignItems: 'center',
            gap: '10px'
          }}>
            <div style={{ color: '#EA580C', flexShrink: 0 }}>
              <Bell size={18} />
            </div>
            <p style={{ margin: 0, fontSize: '0.78rem', color: '#9A3412', lineHeight: 1.4 }}>
              <strong>อย่าลืม!</strong> อัปเดตรูปและสถานะทุก 2 เดือน เพื่อความปลอดภัยและสวัสดิภาพที่ดีของน้อง
            </p>
          </div>

        </form>
        </>
        )}

        {/* Success Toast Modal */}
        {successToast && (
          <div style={{
            position: 'fixed',
            bottom: '24px',
            left: '50%',
            transform: 'translateX(-50%)',
            backgroundColor: '#15803D',
            color: '#FFFFFF',
            padding: '12px 20px',
            borderRadius: '10px',
            boxShadow: '0 8px 24px rgba(0,0,0,0.18)',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            fontSize: '0.9rem',
            fontWeight: 600,
            zIndex: 9999
          }}>
            <Check size={18} /> ส่งรายงานสถานะน้องเรียบร้อยแล้ว
          </div>
        )}

      </div>
    </div>
  );
}
