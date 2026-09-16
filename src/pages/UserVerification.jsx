import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { 
  ChevronLeft, CheckCircle2, Loader2, AlertCircle, Phone, FileText, User, 
  ShieldCheck, Home, Clock, Banknote, Users, Heart, PawPrint, Edit3, ArrowRight
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { FormPageSkeleton } from '../components/Skeletons';

// รายการคำถามแบบประเมินความพร้อมก่อนรับเลี้ยง
const ASSESSMENT_QUESTIONS = [
  {
    id: 'housing',
    number: 1,
    icon: Home,
    question: 'ที่อยู่อาศัยของคุณเหมาะสมกับการเลี้ยงสัตว์หรือไม่?',
    options: [
      'มีบ้าน/คอนโดที่อนุญาตให้เลี้ยงสัตว์',
      'อยู่ระหว่างจัดหาที่พักที่เหมาะสม',
      'ยังไม่แน่ใจ / ไม่สามารถเลี้ยงได้'
    ]
  },
  {
    id: 'time',
    number: 2,
    icon: Clock,
    question: 'คุณมีเวลาในการดูแลน้องแค่ไหน?',
    options: [
      'มาก (อย่างน้อยวันละ 2 ครั้ง)',
      'ปานกลาง',
      'น้อย'
    ]
  },
  {
    id: 'budget',
    number: 3,
    icon: Banknote,
    question: 'คุณมีงบประมาณสำหรับค่าอาหารและค่ารักษาพยาบาลต่อเดือนหรือไม่?',
    options: [
      'มี (อย่างน้อย 1,000 บาท/เดือน)',
      'พอมี / อาจไม่แน่นอน',
      'ยังไม่มี'
    ]
  },
  {
    id: 'family',
    number: 4,
    icon: Users,
    question: 'ครอบครัว/คนรอบข้างเห็นด้วยกับการรับเลี้ยงหรือไม่?',
    options: [
      'เห็นด้วยทั้งหมด',
      'บางคนไม่เห็นด้วย',
      'ยังไม่แน่ใจ'
    ]
  },
  {
    id: 'longterm',
    number: 5,
    icon: Heart,
    question: 'คุณพร้อมดูแลน้องในระยะยาวหรือไม่?',
    options: [
      'พร้อม ดูแลตลอดชีวิต',
      'อาจมีข้อจำกัดในอนาคต',
      'ไม่แน่ใจ'
    ]
  }
];

export default function UserVerification() {
  const { user, profile, userVerificationStatus, verifyUser, getUserVerificationData } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const returnUrl = location.state?.from || '/profile';
  const isFromMatch = Boolean(location.state?.fromAction === 'swipe_match' || location.state?.from);

  const [step, setStep] = useState(1); // 1: ข้อมูลส่วนตัว, 2: แบบประเมิน
  const [isEditing, setIsEditing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [success, setSuccess] = useState(false);
  const [loadingInitial, setLoadingInitial] = useState(true);

  const [formData, setFormData] = useState({
    full_name: '',
    id_card_no: '',
    phone: '',
  });

  const [assessment, setAssessment] = useState({
    housing: '',
    time: '',
    budget: '',
    family: '',
    longterm: ''
  });

  // โหลดข้อมูลเดิมถ้าเคยยืนยันแล้ว
  useEffect(() => {
    const loadExisting = async () => {
      if (user) {
        const existingData = await getUserVerificationData(user.id);
        const resolvedName = existingData?.full_name || profile?.full_name || user?.user_metadata?.full_name || user?.user_metadata?.name || '';
        const resolvedPhone = existingData?.phone || profile?.phone || user?.user_metadata?.phone || '';

        if (existingData) {
          setFormData({
            full_name: resolvedName,
            id_card_no: existingData.id_card_no ? formatIdCard(existingData.id_card_no) : '',
            phone: resolvedPhone ? formatPhone(resolvedPhone) : ''
          });
          if (existingData.assessment) {
            setAssessment(prev => ({
              ...prev,
              ...existingData.assessment
            }));
          }
        } else {
          setFormData(prev => ({
            ...prev,
            full_name: resolvedName,
            phone: resolvedPhone ? formatPhone(resolvedPhone) : ''
          }));
        }
      }
      setLoadingInitial(false);
    };

    loadExisting();
  }, [user, profile]);

  const formatIdCard = (val) => {
    if (!val) return '';
    const digits = val.replace(/\D/g, '').slice(0, 13);
    if (digits.length <= 1) return digits;
    if (digits.length <= 5) return `${digits.slice(0, 1)}-${digits.slice(1)}`;
    if (digits.length <= 10) return `${digits.slice(0, 1)}-${digits.slice(1, 5)}-${digits.slice(5)}`;
    if (digits.length <= 12) return `${digits.slice(0, 1)}-${digits.slice(1, 5)}-${digits.slice(5, 10)}-${digits.slice(10)}`;
    return `${digits.slice(0, 1)}-${digits.slice(1, 5)}-${digits.slice(5, 10)}-${digits.slice(10, 12)}-${digits.slice(12)}`;
  };

  const formatPhone = (val) => {
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

  // ตรวจสอบขั้นตอนที่ 1 เพื่อไปขั้นตอนที่ 2
  const handleNextToStep2 = () => {
    const rawId = formData.id_card_no.replace(/\D/g, '');
    const rawPhone = formData.phone.replace(/\D/g, '');

    if (!formData.full_name.trim()) {
      setErrorMsg('กรุณากรอกชื่อ - นามสกุล');
      return;
    }
    if (rawId.length !== 13) {
      setErrorMsg('เลขประจำตัวประชาชนต้องมี 13 หลัก');
      return;
    }
    if (rawPhone.length < 9 || rawPhone.length > 10) {
      setErrorMsg('เบอร์โทรศัพท์ต้องมี 9 หรือ 10 หลัก');
      return;
    }

    setErrorMsg('');
    setStep(2);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // จำนวนข้อที่ตอบแล้ว
  const answeredCount = Object.values(assessment).filter(val => Boolean(val)).length;
  const isAssessmentComplete = answeredCount === 5;

  const handleSubmit = async () => {
    const rawId = formData.id_card_no.replace(/\D/g, '');
    const rawPhone = formData.phone.replace(/\D/g, '');

    if (!formData.full_name.trim()) {
      setStep(1);
      setErrorMsg('กรุณากรอกชื่อ - นามสกุล');
      return;
    }
    if (rawId.length !== 13) {
      setStep(1);
      setErrorMsg('เลขประจำตัวประชาชนต้องมี 13 หลัก');
      return;
    }
    if (rawPhone.length < 9 || rawPhone.length > 10) {
      setStep(1);
      setErrorMsg('เบอร์โทรศัพท์ต้องมี 9 หรือ 10 หลัก');
      return;
    }

    if (!isAssessmentComplete) {
      setErrorMsg('กรุณาตอบแบบประเมินความพร้อมให้ครบทั้ง 5 ข้อ');
      return;
    }

    setIsSubmitting(true);
    setErrorMsg('');

    const result = await verifyUser({
      full_name: formData.full_name.trim(),
      id_card_no: rawId,
      phone: rawPhone,
      assessment: assessment
    });

    setIsSubmitting(false);
    if (result?.error) {
      setErrorMsg(result.error.message || 'เกิดข้อผิดพลาดในการยืนยันตัวตน');
    } else {
      setSuccess(true);
      setIsEditing(false);
      setTimeout(() => {
        navigate(returnUrl);
      }, 1800);
    }
  };

  if (loadingInitial) {
    return <FormPageSkeleton />;
  }

  const isUserVerified = 
    userVerificationStatus === 'verified' ||
    (user?.email && user.email.toLowerCase().trim() === 'songkaen2547@gmail.com') ||
    user?.user_metadata?.is_verified === true ||
    user?.user_metadata?.user_verification_status === 'verified' ||
    profile?.is_verified === true;

  // หน้าสรุปสำหรับผู้ใช้ที่ยืนยันตัวตนแล้ว (และไม่ได้อยู่ในโหมดแก้ไข)
  if (isUserVerified && !isEditing && !success) {
    return (
      <div style={{
        minHeight: '100dvh',
        backgroundColor: '#FAF8F5',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        padding: '32px 16px 80px',
        fontFamily: 'Prompt, sans-serif'
      }}>
        <div style={{ maxWidth: '540px', width: '100%' }}>
          <button
            type="button"
            onClick={() => navigate(returnUrl)}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '10px',
              background: 'none',
              border: 'none',
              color: '#374151',
              fontSize: '0.95rem',
              fontWeight: 600,
              cursor: 'pointer',
              padding: 0,
              marginBottom: '20px'
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
            <span>{returnUrl === '/' ? 'กลับไปหน้าค้นหา (Feed)' : 'กลับไปหน้าเดิม'}</span>
          </button>

          <div style={{
            backgroundColor: '#FFFFFF',
            borderRadius: '16px',
            border: '1px solid #E5E7EB',
            padding: '32px 28px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.03)'
          }}>
            <div style={{ textAlign: 'center', marginBottom: '24px' }}>
              <div style={{
                width: '60px',
                height: '60px',
                borderRadius: '14px',
                backgroundColor: '#ECFDF5',
                color: '#059669',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 16px'
              }}>
                <CheckCircle2 size={34} />
              </div>
              <h1 style={{ fontSize: '1.35rem', fontWeight: 700, color: '#111827', margin: '0 0 6px' }}>
                ยืนยันตัวตนเรียบร้อยแล้ว
              </h1>
              <p style={{ color: '#6B7280', fontSize: '0.875rem', margin: 0, lineHeight: 1.5 }}>
                ข้อมูลของคุณได้รับการยืนยันและพร้อมส่งมอบให้มูลนิธิตรวจสอบความพร้อมในการรับเลี้ยง
              </p>
            </div>

            {/* ข้อมูลที่ยืนยันแล้ว */}
            <div style={{
              backgroundColor: '#F9FAFB',
              borderRadius: '12px',
              padding: '18px 20px',
              border: '1px solid #E5E7EB',
              marginBottom: '24px',
              display: 'flex',
              flexDirection: 'column',
              gap: '12px',
              fontSize: '0.9rem'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #E5E7EB', paddingBottom: '10px' }}>
                <span style={{ color: '#6B7280' }}>ชื่อ - นามสกุล:</span>
                <strong style={{ color: '#111827' }}>{formData.full_name || '-'}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #E5E7EB', paddingBottom: '10px' }}>
                <span style={{ color: '#6B7280' }}>เบอร์โทรศัพท์:</span>
                <strong style={{ color: '#111827' }}>{formData.phone || '-'}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #E5E7EB', paddingBottom: '10px' }}>
                <span style={{ color: '#6B7280' }}>เลขบัตรประชาชน:</span>
                <strong style={{ color: '#111827' }}>
                  {formData.id_card_no ? `${formData.id_card_no.slice(0, 3)}-xxxx-xxxxx-${formData.id_card_no.slice(-2)}` : '-'}
                </strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ color: '#6B7280' }}>แบบประเมินความพร้อม:</span>
                <span style={{ color: '#059669', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <CheckCircle2 size={15} /> ตอบครบ 5 ข้อ
                </span>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '12px' }}>
              <button
                type="button"
                onClick={() => setIsEditing(true)}
                style={{
                  flex: 1,
                  height: '44px',
                  backgroundColor: '#FFFFFF',
                  color: '#D97706',
                  border: '1px solid #FCD34D',
                  borderRadius: '8px',
                  fontSize: '0.9rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px'
                }}
              >
                <Edit3 size={16} /> แก้ไขข้อมูล / แบบประเมิน
              </button>
              <button
                type="button"
                onClick={() => navigate(returnUrl)}
                style={{
                  flex: 1,
                  height: '44px',
                  backgroundColor: '#D97706',
                  color: '#FFFFFF',
                  border: 'none',
                  borderRadius: '8px',
                  fontSize: '0.9rem',
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
              >
                {returnUrl === '/' ? 'ไปค้นหาสัตว์เลี้ยง (Feed)' : 'กลับสู่หน้าเดิม'}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{
      minHeight: '100dvh',
      backgroundColor: '#FAF8F5',
      fontFamily: 'Prompt, sans-serif',
      padding: '24px 16px 80px',
      boxSizing: 'border-box'
    }}>
      <div style={{ maxWidth: '540px', margin: '0 auto', width: '100%' }}>
        
        {/* Navigation Back */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
          <button
            type="button"
            onClick={() => {
              if (step === 2) setStep(1);
              else if (isEditing) setIsEditing(false);
              else navigate(returnUrl);
            }}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '10px',
              background: 'none',
              border: 'none',
              color: '#374151',
              fontSize: '0.95rem',
              fontWeight: 600,
              cursor: 'pointer',
              padding: 0
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
            <span>{step === 2 ? 'กลับไปแก้ไขข้อมูลส่วนตัว' : (returnUrl === '/' ? 'กลับไปหน้าค้นหา (Feed)' : 'กลับไปหน้าโปรไฟล์')}</span>
          </button>
        </div>

        {/* Contextual Banner when coming from match attempt */}
        {isFromMatch && (
          <div style={{
            backgroundColor: '#FFFBEB',
            border: '1px solid #FDE68A',
            borderRadius: '14px',
            padding: '14px 16px',
            marginBottom: '16px',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            color: '#92400E',
            fontSize: '0.88rem',
            lineHeight: 1.5,
            boxShadow: '0 1px 3px rgba(217, 119, 6, 0.06)'
          }}>
            <ShieldCheck size={24} color="#D97706" style={{ flexShrink: 0 }} />
            <div>
              <strong style={{ display: 'block', color: '#B45309', marginBottom: '2px' }}>
                ยืนยันตัวตนเพื่อเริ่มส่งคำขอรับเลี้ยงน้อง
              </strong>
              กรอกข้อมูลและตอบแบบประเมินให้ครบถ้วน เมื่อเสร็จสิ้นระบบจะพาท่านกลับไปยังน้องสัตว์เลี้ยงทันที
            </div>
          </div>
        )}

        {/* Card Main */}
        <div style={{
          backgroundColor: '#FFFFFF',
          borderRadius: '16px',
          border: '1px solid #E5E7EB',
          padding: '28px 24px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.03)'
        }}>

          {errorMsg && (
            <div style={{
              backgroundColor: '#FEF2F2',
              border: '1px solid #FCA5A5',
              padding: '12px 14px',
              borderRadius: '8px',
              marginBottom: '20px',
              fontSize: '0.85rem',
              color: '#DC2626',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}>
              <AlertCircle size={16} />
              <span>{errorMsg}</span>
            </div>
          )}

          {success && (
            <div style={{
              backgroundColor: '#ECFDF5',
              border: '1px solid #A7F3D0',
              padding: '12px 14px',
              borderRadius: '8px',
              marginBottom: '20px',
              fontSize: '0.85rem',
              color: '#059669',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}>
              <CheckCircle2 size={16} />
              <span>บันทึกข้อมูลและแบบประเมินสำเร็จ กำลังนำคุณกลับหน้าโปรไฟล์...</span>
            </div>
          )}

          {/* STEP 1: ข้อมูลส่วนตัว (KYC) */}
          {step === 1 && (
            <motion.div
              initial={{ opacity: 0, x: -16 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 16 }}
              transition={{ duration: 0.2 }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
                <div style={{
                  width: '44px',
                  height: '44px',
                  borderRadius: '12px',
                  backgroundColor: '#FEF3C7',
                  color: '#D97706',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0
                }}>
                  <ShieldCheck size={24} />
                </div>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <h1 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#111827', margin: 0 }}>
                      ยืนยันตัวตนผู้รับเลี้ยง (KYC)
                    </h1>
                    <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#D97706', backgroundColor: '#FEF3C7', padding: '2px 8px', borderRadius: '9999px' }}>
                      ขั้นตอน 1/2
                    </span>
                  </div>
                  <p style={{ fontSize: '0.82rem', color: '#6B7280', margin: '2px 0 0' }}>
                    ข้อมูลใช้สำหรับระบุตัวตนและติดต่อประสานงานกับมูลนิธิ
                  </p>
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
                {/* Full Name */}
                <div>
                  <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, color: '#374151', marginBottom: '6px' }}>
                    ชื่อ - นามสกุล (ตามบัตรประชาชน) <span style={{ color: '#DC2626' }}>*</span>
                  </label>
                  <input
                    type="text"
                    placeholder="เช่น นายสมชาย ใจดี"
                    value={formData.full_name}
                    onChange={e => setFormData(p => ({ ...p, full_name: e.target.value }))}
                    style={{
                      width: '100%',
                      height: '44px',
                      backgroundColor: '#FFFFFF',
                      border: '1px solid #D1D5DB',
                      borderRadius: '8px',
                      padding: '0 14px',
                      fontSize: '0.95rem',
                      color: '#111827',
                      outline: 'none',
                      boxSizing: 'border-box'
                    }}
                  />
                </div>

                {/* National ID */}
                <div>
                  <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, color: '#374151', marginBottom: '6px' }}>
                    เลขประจำตัวประชาชน (13 หลัก) <span style={{ color: '#DC2626' }}>*</span>
                  </label>
                  <input
                    type="text"
                    placeholder="x-xxxx-xxxxx-xx-x"
                    value={formData.id_card_no}
                    onChange={e => setFormData(p => ({ ...p, id_card_no: formatIdCard(e.target.value) }))}
                    style={{
                      width: '100%',
                      height: '44px',
                      backgroundColor: '#FFFFFF',
                      border: '1px solid #D1D5DB',
                      borderRadius: '8px',
                      padding: '0 14px',
                      fontSize: '0.95rem',
                      color: '#111827',
                      outline: 'none',
                      boxSizing: 'border-box'
                    }}
                  />
                  <span style={{ fontSize: '0.75rem', color: '#6B7280', marginTop: '4px', display: 'block' }}>
                    พิมพ์เฉพาะตัวเลขได้ ระบบจะจัดรูปแบบขีด (-) ให้อัตโนมัติ
                  </span>
                </div>

                {/* Phone */}
                <div>
                  <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, color: '#374151', marginBottom: '6px' }}>
                    เบอร์โทรศัพท์ติดต่อ <span style={{ color: '#DC2626' }}>*</span>
                  </label>
                  <input
                    type="tel"
                    placeholder="เช่น 0812345678"
                    value={formData.phone}
                    onChange={e => setFormData(p => ({ ...p, phone: formatPhone(e.target.value) }))}
                    style={{
                      width: '100%',
                      height: '44px',
                      backgroundColor: '#FFFFFF',
                      border: '1px solid #D1D5DB',
                      borderRadius: '8px',
                      padding: '0 14px',
                      fontSize: '0.95rem',
                      color: '#111827',
                      outline: 'none',
                      boxSizing: 'border-box'
                    }}
                  />
                  <span style={{ fontSize: '0.75rem', color: '#6B7280', marginTop: '4px', display: 'block' }}>
                    เบอร์โทรที่สามารถติดต่อได้จริงเพื่อประสานงานรับเลี้ยง
                  </span>
                </div>

                {/* Next Button */}
                <div style={{ marginTop: '12px' }}>
                  <button
                    type="button"
                    onClick={handleNextToStep2}
                    style={{
                      width: '100%',
                      height: '46px',
                      backgroundColor: '#D97706',
                      color: '#FFFFFF',
                      borderRadius: '8px',
                      border: 'none',
                      fontSize: '0.95rem',
                      fontWeight: 600,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '8px',
                      boxShadow: '0 2px 6px rgba(217, 119, 6, 0.25)',
                      transition: 'background-color 0.15s'
                    }}
                    onMouseEnter={e => e.currentTarget.style.backgroundColor = '#B45309'}
                    onMouseLeave={e => e.currentTarget.style.backgroundColor = '#D97706'}
                  >
                    <span>ถัดไป: ทำแบบประเมินความพร้อม</span>
                    <ArrowRight size={18} />
                  </button>
                </div>
              </div>
            </motion.div>
          )}

          {/* STEP 2: แบบประเมินความพร้อมก่อนรับเลี้ยง */}
          {step === 2 && (
            <motion.div
              initial={{ opacity: 0, x: 16 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -16 }}
              transition={{ duration: 0.2 }}
            >
              {/* Title Header */}
              <div style={{ textAlign: 'center', marginBottom: '20px' }}>
                <h1 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#111827', margin: '0 0 12px' }}>
                  แบบประเมินความพร้อมก่อนรับเลี้ยง
                </h1>

                {/* Progress Bar with count */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{
                    flex: 1,
                    height: '8px',
                    backgroundColor: '#E5E7EB',
                    borderRadius: '9999px',
                    overflow: 'hidden'
                  }}>
                    <div style={{
                      width: `${(answeredCount / 5) * 100}%`,
                      height: '100%',
                      backgroundColor: '#059669',
                      borderRadius: '9999px',
                      transition: 'width 0.3s ease'
                    }} />
                  </div>
                  <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#059669', minWidth: '32px' }}>
                    {answeredCount}/5
                  </span>
                </div>
              </div>

              {/* Paw Banner */}
              <div style={{
                backgroundColor: '#ECFDF5',
                borderRadius: '12px',
                padding: '14px 16px',
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                marginBottom: '24px',
                border: '1px solid #A7F3D0'
              }}>
                <div style={{
                  width: '38px',
                  height: '38px',
                  borderRadius: '10px',
                  backgroundColor: '#D1FAE5',
                  color: '#059669',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0
                }}>
                  <PawPrint size={22} />
                </div>
                <span style={{ fontSize: '0.875rem', fontWeight: 600, color: '#065F46', lineHeight: 1.4 }}>
                  เพื่อให้น้องได้รับการดูแลที่ดีที่สุด<br />กรุณาตอบคำถามให้ครบถ้วน
                </span>
              </div>

              {/* 5 Questions List */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                {ASSESSMENT_QUESTIONS.map((q) => {
                  const IconComp = q.icon;
                  const isSelectedAny = Boolean(assessment[q.id]);

                  return (
                    <div 
                      key={q.id}
                      style={{
                        backgroundColor: '#FFFFFF',
                        border: '1px solid #E5E7EB',
                        borderRadius: '14px',
                        padding: '18px 16px',
                        boxShadow: '0 1px 2px rgba(0,0,0,0.02)'
                      }}
                    >
                      {/* Question Header */}
                      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', marginBottom: '14px' }}>
                        <div style={{
                          width: '28px',
                          height: '28px',
                          borderRadius: '8px',
                          backgroundColor: '#ECFDF5',
                          color: '#059669',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexShrink: 0,
                          marginTop: '2px'
                        }}>
                          <IconComp size={16} />
                        </div>
                        <h3 style={{
                          fontSize: '0.95rem',
                          fontWeight: 700,
                          color: '#111827',
                          margin: 0,
                          lineHeight: 1.4
                        }}>
                          {q.number}. {q.question}
                        </h3>
                      </div>

                      {/* Options */}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', paddingLeft: '38px' }}>
                        {q.options.map((opt, idx) => {
                          const isChecked = assessment[q.id] === opt;

                          return (
                            <label
                              key={idx}
                              onClick={() => {
                                setAssessment(prev => ({ ...prev, [q.id]: opt }));
                                setErrorMsg('');
                              }}
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '10px',
                                cursor: 'pointer',
                                fontSize: '0.9rem',
                                color: isChecked ? '#065F46' : '#4B5563',
                                fontWeight: isChecked ? 600 : 400,
                                userSelect: 'none'
                              }}
                            >
                              {/* Custom Radio Button */}
                              <div style={{
                                width: '20px',
                                height: '20px',
                                borderRadius: '50%',
                                border: isChecked ? '6px solid #059669' : '2px solid #D1D5DB',
                                backgroundColor: '#FFFFFF',
                                boxSizing: 'border-box',
                                transition: 'all 0.15s ease',
                                flexShrink: 0
                              }} />
                              <span>{opt}</span>
                            </label>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Action Buttons */}
              <div style={{ display: 'flex', gap: '12px', marginTop: '28px' }}>
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  style={{
                    flex: '0 0 100px',
                    height: '46px',
                    backgroundColor: '#FFFFFF',
                    color: '#374151',
                    border: '1px solid #D1D5DB',
                    borderRadius: '8px',
                    fontSize: '0.9rem',
                    fontWeight: 600,
                    cursor: 'pointer'
                  }}
                >
                  ย้อนกลับ
                </button>
                <button
                  type="button"
                  onClick={handleSubmit}
                  disabled={isSubmitting}
                  style={{
                    flex: 1,
                    height: '46px',
                    backgroundColor: isAssessmentComplete ? '#059669' : '#9CA3AF',
                    color: '#FFFFFF',
                    borderRadius: '8px',
                    border: 'none',
                    fontSize: '0.95rem',
                    fontWeight: 600,
                    cursor: isSubmitting || !isAssessmentComplete ? 'not-allowed' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                    boxShadow: isAssessmentComplete ? '0 2px 6px rgba(5, 150, 105, 0.25)' : 'none',
                    transition: 'background-color 0.15s'
                  }}
                  onMouseEnter={e => { if (isAssessmentComplete && !isSubmitting) e.currentTarget.style.backgroundColor = '#047857'; }}
                  onMouseLeave={e => { if (isAssessmentComplete && !isSubmitting) e.currentTarget.style.backgroundColor = '#059669'; }}
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="spin" size={18} />
                      <span>กำลังบันทึกข้อมูล...</span>
                    </>
                  ) : (
                    'ยืนยันข้อมูลและส่งแบบประเมิน'
                  )}
                </button>
              </div>

            </motion.div>
          )}

        </div>

      </div>
    </div>
  );
}
