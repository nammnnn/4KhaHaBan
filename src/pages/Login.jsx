import React, { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  Dog, Cat, Loader2, Mail, Lock, User, Phone, FileText,
  X, Heart, Shield, CheckCircle2, ArrowRight
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const Login = () => {
  const { user, loginWithGoogle, loginWithEmail, registerWithEmail, loading: authLoading } = useAuth();

  const [activeTab, setActiveTab] = useState('login'); // 'login' or 'register'
  const [role, setRole] = useState('user'); // 'user' or 'foundation'
  const [showEmailForm, setShowEmailForm] = useState(false);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [registrationNumber, setRegistrationNumber] = useState('');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [agreed, setAgreed] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // ถ้าล็อกอินแล้วให้ข้ามไปหน้า Feed เลย
  if (user) {
    return <Navigate to="/" replace />;
  }

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

  const handleGoogleLogin = async () => {
    setIsSubmitting(true);
    setErrorMsg('');
    try {
      const { error } = await loginWithGoogle();
      if (error) throw error;
    } catch (error) {
      console.error('Error logging in:', error.message);
      setErrorMsg(`เกิดข้อผิดพลาด: ${error.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEmailLogin = async (e) => {
    e.preventDefault();
    if (!email || !password) {
      setErrorMsg('กรุณากรอกอีเมลและรหัสผ่าน');
      return;
    }

    setIsSubmitting(true);
    setErrorMsg('');
    try {
      const { error } = await loginWithEmail(email, password);
      if (error) throw error;
    } catch (error) {
      console.error('Error logging in:', error.message);
      setErrorMsg('อีเมลหรือรหัสผ่านไม่ถูกต้อง');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    if (!email || !password || !fullName) {
      setErrorMsg('กรุณากรอกข้อมูลที่จำเป็นให้ครบถ้วน');
      return;
    }

    if (role === 'foundation' && !phone) {
      setErrorMsg('มูลนิธิจำเป็นต้องระบุเบอร์โทรศัพท์');
      return;
    }

    setIsSubmitting(true);

    const metadata = {
      role,
      full_name: fullName,
      phone: role === 'foundation' ? phone : null,
      registration_number: role === 'foundation' ? registrationNumber : null
    };

    try {
      const { error } = await registerWithEmail(email, password, metadata);
      if (error) throw error;
      setSuccessMsg('กรุณาตรวจสอบอีเมลเพื่อยืนยันตัวตน');
      // เคลียร์ฟอร์ม
      setEmail('');
      setPassword('');
      setFullName('');
      setPhone('');
      setRegistrationNumber('');
    } catch (error) {
      console.error('Error registering:', error.message);
      setErrorMsg(`เกิดข้อผิดพลาดในการลงทะเบียน: ${error.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div style={{
      display: 'flex',
      minHeight: '100dvh',
      backgroundColor: '#FAF8F5',
      fontFamily: 'Prompt, sans-serif'
    }}>

      {/* Left Panel - Brand Showcase (Desktop) */}
      <div className="hidden md:flex" style={{
        flex: 1,
        background: 'linear-gradient(145deg, #FAF8F5 0%, #F5F0E6 100%)',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        padding: '60px 48px',
        borderRight: '1px solid #E5E7EB',
        position: 'relative'
      }}>
        <div style={{ maxWidth: '440px', width: '100%' }}>
          
          {/* Logo Badge */}
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            padding: '8px 16px',
            backgroundColor: '#FFFFFF',
            borderRadius: '10px',
            border: '1px solid #E5E7EB',
            boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
            marginBottom: '32px'
          }}>
            <div style={{
              width: '28px',
              height: '28px',
              borderRadius: '6px',
              backgroundColor: '#D97706',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#FFFFFF'
            }}>
              <Heart size={16} fill="currentColor" />
            </div>
            <span style={{ fontWeight: 700, fontSize: '0.95rem', color: '#111827' }}>
              4 ขา<span style={{ color: '#D97706' }}>หาบ้าน</span>
            </span>
          </div>

          <h1 style={{
            fontSize: '2.25rem',
            fontWeight: 800,
            color: '#111827',
            lineHeight: 1.25,
            margin: '0 0 16px',
            letterSpacing: '-0.02em'
          }}>
            ค้นหาเพื่อนสี่ขา <br />
            และมอบบ้านที่อบอุ่น
          </h1>

          <p style={{
            fontSize: '1rem',
            color: '#4B5563',
            lineHeight: 1.6,
            margin: '0 0 36px'
          }}>
            แพลตฟอร์มจับคู่และรับเลี้ยงสุนัข แมวจรจัด ที่เชื่อมโยงผู้รับเลี้ยงใจดีกับศูนย์พักพิงและมูลนิธิที่ผ่านการตรวจสอบทั่วไทย
          </p>

          {/* Feature Highlights */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {[
              { title: 'ปัดการ์ดค้นหาที่ใช่', desc: 'เลือกลักษณะ สายพันธุ์ และขนาดที่เข้ากับไลฟ์สไตล์คุณ' },
              { title: 'มูลนิธิผ่านการยืนยันตัวตน', desc: 'มีเอกสารนิติบุคคลและความโปร่งใสทุกเคส' },
              { title: 'พูดคุยและนัดหมายผ่านแชท', desc: 'สอบถามข้อมูลตรงกับผู้ดูแลก่อนตัดสินใจรับเลี้ยง' }
            ].map((f, i) => (
              <div key={i} style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: '12px',
                padding: '12px 16px',
                backgroundColor: '#FFFFFF',
                borderRadius: '10px',
                border: '1px solid #E5E7EB',
                boxShadow: '0 1px 2px rgba(0,0,0,0.02)'
              }}>
                <div style={{
                  width: '24px',
                  height: '24px',
                  borderRadius: '6px',
                  backgroundColor: '#ECFDF5',
                  color: '#059669',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                  marginTop: '2px'
                }}>
                  <CheckCircle2 size={16} />
                </div>
                <div>
                  <div style={{ fontSize: '0.875rem', fontWeight: 600, color: '#111827' }}>{f.title}</div>
                  <div style={{ fontSize: '0.8rem', color: '#6B7280', marginTop: '2px' }}>{f.desc}</div>
                </div>
              </div>
            ))}
          </div>

        </div>
      </div>

      {/* Right Panel - Auth Form */}
      <div style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        padding: '40px 24px',
        backgroundColor: '#FAF8F5'
      }}>
        <div style={{
          width: '100%',
          maxWidth: '420px',
          backgroundColor: '#FFFFFF',
          borderRadius: '16px',
          border: '1px solid #E5E7EB',
          padding: '36px 32px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.03)'
        }}>

          {/* Mobile Brand Header */}
          <div className="md:hidden" style={{ textAlign: 'center', marginBottom: '24px' }}>
            <div style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              padding: '6px 14px',
              backgroundColor: '#FAF8F5',
              borderRadius: '8px',
              border: '1px solid #E5E7EB',
              marginBottom: '12px'
            }}>
              <Heart size={16} color="#D97706" fill="#D97706" />
              <span style={{ fontWeight: 700, fontSize: '0.9rem', color: '#111827' }}>
                4 ขา<span style={{ color: '#D97706' }}>หาบ้าน</span>
              </span>
            </div>
          </div>

          {/* Form Header */}
          <div style={{ marginBottom: '24px' }}>
            <h2 style={{ fontSize: '1.45rem', fontWeight: 700, color: '#111827', margin: '0 0 6px' }}>
              {activeTab === 'login' ? 'เข้าสู่ระบบ' : 'สร้างบัญชีผู้ใช้ใหม่'}
            </h2>
            <p style={{ fontSize: '0.875rem', color: '#6B7280', margin: 0 }}>
              {activeTab === 'login'
                ? 'เข้าสู่ระบบเพื่อค้นหาและติดต่อรับเลี้ยงสัตว์'
                : 'เริ่มต้นเป็นส่วนหนึ่งในการมอบบ้านที่อบอุ่น'}
            </p>
          </div>

          {/* Alerts */}
          <AnimatePresence>
            {errorMsg && (
              <motion.div
                initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                style={{
                  backgroundColor: '#FEF2F2',
                  border: '1px solid #FCA5A5',
                  padding: '12px 14px',
                  borderRadius: '8px',
                  marginBottom: '20px',
                  fontSize: '0.85rem',
                  color: '#DC2626',
                  display: 'flex',
                  alignItems: 'flex-start',
                  justifyContent: 'space-between',
                  gap: '8px'
                }}
              >
                <span style={{ flex: 1, lineHeight: 1.4 }}>{errorMsg}</span>
                <button type="button" onClick={() => setErrorMsg('')} style={{ background: 'none', border: 'none', color: '#DC2626', cursor: 'pointer', padding: 0 }}>
                  <X size={16} />
                </button>
              </motion.div>
            )}

            {successMsg && (
              <motion.div
                initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                style={{
                  backgroundColor: '#ECFDF5',
                  border: '1px solid #A7F3D0',
                  padding: '12px 14px',
                  borderRadius: '8px',
                  marginBottom: '20px',
                  fontSize: '0.85rem',
                  color: '#059669',
                  display: 'flex',
                  alignItems: 'flex-start',
                  justifyContent: 'space-between',
                  gap: '8px'
                }}
              >
                <span style={{ flex: 1, lineHeight: 1.4 }}>{successMsg}</span>
                <button type="button" onClick={() => setSuccessMsg('')} style={{ background: 'none', border: 'none', color: '#059669', cursor: 'pointer', padding: 0 }}>
                  <X size={16} />
                </button>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Google Auth Button */}
          <button
            type="button"
            onClick={handleGoogleLogin}
            disabled={isSubmitting || authLoading || (activeTab === 'register' && !agreed)}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '10px',
              width: '100%',
              height: '44px',
              backgroundColor: '#FFFFFF',
              color: '#374151',
              borderRadius: '8px',
              border: '1px solid #D1D5DB',
              fontSize: '0.875rem',
              fontWeight: 500,
              cursor: (isSubmitting || authLoading || (activeTab === 'register' && !agreed)) ? 'not-allowed' : 'pointer',
              opacity: (activeTab === 'register' && !agreed) ? 0.6 : 1,
              transition: 'background-color 0.15s, border-color 0.15s'
            }}
            onMouseEnter={e => e.currentTarget.style.backgroundColor = '#F9FAFB'}
            onMouseLeave={e => e.currentTarget.style.backgroundColor = '#FFFFFF'}
          >
            <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="Google" style={{ width: '18px', height: '18px' }} />
            <span>{activeTab === 'login' ? 'เข้าสู่ระบบด้วย Google' : 'สมัครสมาชิกด้วย Google'}</span>
          </button>

          {/* Divider */}
          <div style={{ display: 'flex', alignItems: 'center', margin: '20px 0' }}>
            <div style={{ flex: 1, height: '1px', backgroundColor: '#E5E7EB' }} />
            <span style={{ padding: '0 12px', fontSize: '0.78rem', color: '#9CA3AF' }}>หรือใช้อีเมล</span>
            <div style={{ flex: 1, height: '1px', backgroundColor: '#E5E7EB' }} />
          </div>

          {/* Registration Role Switcher */}
          {activeTab === 'register' && (
            <div style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: '6px',
              padding: '4px',
              backgroundColor: '#F3F4F6',
              borderRadius: '8px',
              marginBottom: '16px'
            }}>
              <button
                type="button"
                onClick={() => setRole('user')}
                style={{
                  height: '36px',
                  borderRadius: '6px',
                  border: 'none',
                  backgroundColor: role === 'user' ? '#FFFFFF' : 'transparent',
                  color: role === 'user' ? '#111827' : '#6B7280',
                  fontWeight: role === 'user' ? 600 : 500,
                  fontSize: '0.82rem',
                  cursor: 'pointer',
                  boxShadow: role === 'user' ? '0 1px 2px rgba(0,0,0,0.05)' : 'none',
                  transition: 'all 0.15s'
                }}
              >
                ผู้รับเลี้ยงทั่วไป
              </button>
              <button
                type="button"
                onClick={() => setRole('foundation')}
                style={{
                  height: '36px',
                  borderRadius: '6px',
                  border: 'none',
                  backgroundColor: role === 'foundation' ? '#FFFFFF' : 'transparent',
                  color: role === 'foundation' ? '#111827' : '#6B7280',
                  fontWeight: role === 'foundation' ? 600 : 500,
                  fontSize: '0.82rem',
                  cursor: 'pointer',
                  boxShadow: role === 'foundation' ? '0 1px 2px rgba(0,0,0,0.05)' : 'none',
                  transition: 'all 0.15s'
                }}
              >
                ตัวแทนมูลนิธิ
              </button>
            </div>
          )}

          {/* Forms */}
          {activeTab === 'login' ? (
            <form onSubmit={handleEmailLogin} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 500, color: '#374151', marginBottom: '6px' }}>
                  อีเมล
                </label>
                <input
                  type="email"
                  placeholder="name@example.com"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  required
                  style={{
                    width: '100%',
                    height: '42px',
                    backgroundColor: '#FFFFFF',
                    border: '1px solid #D1D5DB',
                    borderRadius: '8px',
                    padding: '0 12px',
                    fontSize: '0.9rem',
                    color: '#111827',
                    outline: 'none',
                    boxSizing: 'border-box',
                    transition: 'border-color 0.15s, box-shadow 0.15s'
                  }}
                  onFocus={e => {
                    e.target.style.borderColor = '#D97706';
                    e.target.style.boxShadow = '0 0 0 3px rgba(217, 119, 6, 0.12)';
                  }}
                  onBlur={e => {
                    e.target.style.borderColor = '#D1D5DB';
                    e.target.style.boxShadow = 'none';
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 500, color: '#374151', marginBottom: '6px' }}>
                  รหัสผ่าน
                </label>
                <input
                  type="password"
                  placeholder="กรอกรหัสผ่าน"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                  style={{
                    width: '100%',
                    height: '42px',
                    backgroundColor: '#FFFFFF',
                    border: '1px solid #D1D5DB',
                    borderRadius: '8px',
                    padding: '0 12px',
                    fontSize: '0.9rem',
                    color: '#111827',
                    outline: 'none',
                    boxSizing: 'border-box',
                    transition: 'border-color 0.15s, box-shadow 0.15s'
                  }}
                  onFocus={e => {
                    e.target.style.borderColor = '#D97706';
                    e.target.style.boxShadow = '0 0 0 3px rgba(217, 119, 6, 0.12)';
                  }}
                  onBlur={e => {
                    e.target.style.borderColor = '#D1D5DB';
                    e.target.style.boxShadow = 'none';
                  }}
                />
              </div>

              <button
                type="submit"
                disabled={isSubmitting || authLoading}
                style={{
                  width: '100%',
                  height: '42px',
                  backgroundColor: isSubmitting ? '#9CA3AF' : '#D97706',
                  color: '#FFFFFF',
                  borderRadius: '8px',
                  border: 'none',
                  fontSize: '0.875rem',
                  fontWeight: 600,
                  cursor: isSubmitting ? 'not-allowed' : 'pointer',
                  marginTop: '6px',
                  display: 'flex',
                  justifyContent: 'center',
                  alignItems: 'center',
                  gap: '8px',
                  boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
                  transition: 'background-color 0.15s'
                }}
                onMouseEnter={e => { if (!isSubmitting) e.currentTarget.style.backgroundColor = '#B45309'; }}
                onMouseLeave={e => { if (!isSubmitting) e.currentTarget.style.backgroundColor = '#D97706'; }}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="spin" size={16} />
                    <span>กำลังเข้าสู่ระบบ...</span>
                  </>
                ) : 'เข้าสู่ระบบ'}
              </button>
            </form>
          ) : (
            <form onSubmit={handleRegister} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 500, color: '#374151', marginBottom: '6px' }}>
                  {role === 'user' ? 'ชื่อ - นามสกุล' : 'ชื่อมูลนิธิ / ศูนย์พักพิง'} <span style={{ color: '#DC2626' }}>*</span>
                </label>
                <input
                  type="text"
                  placeholder={role === 'user' ? 'เช่น สมชาย ใจดี' : 'เช่น มูลนิธิบ้านเพื่อหมาแมว'}
                  value={fullName}
                  onChange={e => setFullName(e.target.value)}
                  required
                  style={{
                    width: '100%',
                    height: '42px',
                    backgroundColor: '#FFFFFF',
                    border: '1px solid #D1D5DB',
                    borderRadius: '8px',
                    padding: '0 12px',
                    fontSize: '0.9rem',
                    color: '#111827',
                    outline: 'none',
                    boxSizing: 'border-box',
                    transition: 'border-color 0.15s, box-shadow 0.15s'
                  }}
                  onFocus={e => {
                    e.target.style.borderColor = '#D97706';
                    e.target.style.boxShadow = '0 0 0 3px rgba(217, 119, 6, 0.12)';
                  }}
                  onBlur={e => {
                    e.target.style.borderColor = '#D1D5DB';
                    e.target.style.boxShadow = 'none';
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 500, color: '#374151', marginBottom: '6px' }}>
                  อีเมลติดต่อ <span style={{ color: '#DC2626' }}>*</span>
                </label>
                <input
                  type="email"
                  placeholder="name@example.com"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  required
                  style={{
                    width: '100%',
                    height: '42px',
                    backgroundColor: '#FFFFFF',
                    border: '1px solid #D1D5DB',
                    borderRadius: '8px',
                    padding: '0 12px',
                    fontSize: '0.9rem',
                    color: '#111827',
                    outline: 'none',
                    boxSizing: 'border-box',
                    transition: 'border-color 0.15s, box-shadow 0.15s'
                  }}
                  onFocus={e => {
                    e.target.style.borderColor = '#D97706';
                    e.target.style.boxShadow = '0 0 0 3px rgba(217, 119, 6, 0.12)';
                  }}
                  onBlur={e => {
                    e.target.style.borderColor = '#D1D5DB';
                    e.target.style.boxShadow = 'none';
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 500, color: '#374151', marginBottom: '6px' }}>
                  รหัสผ่าน <span style={{ color: '#DC2626' }}>*</span>
                </label>
                <input
                  type="password"
                  placeholder="อย่างน้อย 6 ตัวอักษร"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                  minLength={6}
                  style={{
                    width: '100%',
                    height: '42px',
                    backgroundColor: '#FFFFFF',
                    border: '1px solid #D1D5DB',
                    borderRadius: '8px',
                    padding: '0 12px',
                    fontSize: '0.9rem',
                    color: '#111827',
                    outline: 'none',
                    boxSizing: 'border-box',
                    transition: 'border-color 0.15s, box-shadow 0.15s'
                  }}
                  onFocus={e => {
                    e.target.style.borderColor = '#D97706';
                    e.target.style.boxShadow = '0 0 0 3px rgba(217, 119, 6, 0.12)';
                  }}
                  onBlur={e => {
                    e.target.style.borderColor = '#D1D5DB';
                    e.target.style.boxShadow = 'none';
                  }}
                />
              </div>

              {role === 'foundation' && (
                <>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 500, color: '#374151', marginBottom: '6px' }}>
                      เบอร์โทรศัพท์ติดต่อ <span style={{ color: '#DC2626' }}>*</span>
                    </label>
                    <input
                      type="tel"
                      placeholder="เช่น 0812345678"
                      value={phone}
                      onChange={e => setPhone(formatPhoneNumber(e.target.value))}
                      required
                      style={{
                        width: '100%',
                        height: '42px',
                        backgroundColor: '#FFFFFF',
                        border: '1px solid #D1D5DB',
                        borderRadius: '8px',
                        padding: '0 12px',
                        fontSize: '0.9rem',
                        color: '#111827',
                        outline: 'none',
                        boxSizing: 'border-box',
                        transition: 'border-color 0.15s, box-shadow 0.15s'
                      }}
                      onFocus={e => {
                        e.target.style.borderColor = '#D97706';
                        e.target.style.boxShadow = '0 0 0 3px rgba(217, 119, 6, 0.12)';
                      }}
                      onBlur={e => {
                        e.target.style.borderColor = '#D1D5DB';
                        e.target.style.boxShadow = 'none';
                      }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 500, color: '#374151', marginBottom: '6px' }}>
                      เลขทะเบียนมูลนิธิ (ถ้ามี)
                    </label>
                    <input
                      type="text"
                      placeholder="เช่น 01055xxxxxxxx"
                      value={registrationNumber}
                      onChange={e => setRegistrationNumber(e.target.value)}
                      style={{
                        width: '100%',
                        height: '42px',
                        backgroundColor: '#FFFFFF',
                        border: '1px solid #D1D5DB',
                        borderRadius: '8px',
                        padding: '0 12px',
                        fontSize: '0.9rem',
                        color: '#111827',
                        outline: 'none',
                        boxSizing: 'border-box',
                        transition: 'border-color 0.15s, box-shadow 0.15s'
                      }}
                      onFocus={e => {
                        e.target.style.borderColor = '#D97706';
                        e.target.style.boxShadow = '0 0 0 3px rgba(217, 119, 6, 0.12)';
                      }}
                      onBlur={e => {
                        e.target.style.borderColor = '#D1D5DB';
                        e.target.style.boxShadow = 'none';
                      }}
                    />
                  </div>
                </>
              )}

              <label style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: '8px',
                fontSize: '0.8rem',
                color: '#4B5563',
                margin: '6px 0',
                cursor: 'pointer'
              }}>
                <input
                  type="checkbox"
                  checked={agreed}
                  onChange={(e) => setAgreed(e.target.checked)}
                  style={{ marginTop: '2px', cursor: 'pointer', accentColor: '#D97706' }}
                />
                <span>ฉันยอมรับ <strong style={{ color: '#111827' }}>ข้อกำหนดการใช้งาน</strong> และ <strong style={{ color: '#111827' }}>นโยบายความเป็นส่วนตัว</strong></span>
              </label>

              <button
                type="submit"
                disabled={isSubmitting || authLoading || !agreed}
                style={{
                  width: '100%',
                  height: '42px',
                  backgroundColor: (!agreed || isSubmitting) ? '#9CA3AF' : '#059669',
                  color: '#FFFFFF',
                  borderRadius: '8px',
                  border: 'none',
                  fontSize: '0.875rem',
                  fontWeight: 600,
                  cursor: (!agreed || isSubmitting) ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  justifyContent: 'center',
                  alignItems: 'center',
                  gap: '8px',
                  boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
                  transition: 'background-color 0.15s'
                }}
                onMouseEnter={e => { if (agreed && !isSubmitting) e.currentTarget.style.backgroundColor = '#047857'; }}
                onMouseLeave={e => { if (agreed && !isSubmitting) e.currentTarget.style.backgroundColor = '#059669'; }}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="spin" size={16} />
                    <span>กำลังสมัครสมาชิก...</span>
                  </>
                ) : 'สมัครสมาชิก'}
              </button>
            </form>
          )}

          {/* Footer Switcher */}
          <div style={{ marginTop: '24px', textAlign: 'center', paddingTop: '16px', borderTop: '1px solid #E5E7EB' }}>
            {activeTab === 'login' ? (
              <p style={{ color: '#4B5563', fontSize: '0.875rem', margin: 0 }}>
                ยังไม่มีบัญชีใช่ไหม?{' '}
                <button
                  type="button"
                  onClick={() => { setActiveTab('register'); setRole('user'); setErrorMsg(''); setSuccessMsg(''); }}
                  style={{ color: '#D97706', fontWeight: 600, background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
                >
                  สมัครสมาชิก
                </button>
              </p>
            ) : (
              <p style={{ color: '#4B5563', fontSize: '0.875rem', margin: 0 }}>
                มีบัญชีอยู่แล้ว?{' '}
                <button
                  type="button"
                  onClick={() => { setActiveTab('login'); setErrorMsg(''); setSuccessMsg(''); }}
                  style={{ color: '#D97706', fontWeight: 600, background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
                >
                  เข้าสู่ระบบ
                </button>
              </p>
            )}
          </div>

        </div>
      </div>
    </div>
  );
};

export default Login;
