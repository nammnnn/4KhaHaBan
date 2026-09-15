import React, { useState } from 'react';
import { Navigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  PawPrint, Loader2, Mail, Lock, User, Phone, FileText,
  X, Shield, CheckCircle2, ChevronLeft
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { LoginSkeleton } from '../components/Skeletons';
import './Login.css';

const Login = () => {
  const { user, loginWithGoogle, loginWithEmail, registerWithEmail, loading: authLoading } = useAuth();

  const [activeTab, setActiveTab] = useState('login'); // 'login' or 'register'
  const [role, setRole] = useState('user'); // 'user' or 'foundation'

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [registrationNumber, setRegistrationNumber] = useState('');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [agreed, setAgreed] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // ถ้ากำลังโหลดข้อมูล auth อยู่ ให้แสดง Skeleton
  if (authLoading) {
    return <LoginSkeleton />;
  }

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
    <div className="login-page-container">

      {/* Left Panel - Brand Showcase (Desktop) */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25 }}
        className="login-desktop-showcase"
      >
        <div className="login-showcase-inner">
          
          {/* Logo Badge */}
          <Link to="/" className="login-brand-badge" title="กลับหน้าแรก">
            <div className="login-brand-icon-box">
              <PawPrint size={16} strokeWidth={2.4} />
            </div>
            <span style={{ fontWeight: 700, fontSize: '0.95rem', color: '#111827' }}>
              4 ขา<span style={{ color: '#D97706' }}>หาบ้าน</span>
            </span>
          </Link>

          <h1 className="login-showcase-title">
            ค้นหาเพื่อนสี่ขา <br />
            และมอบบ้านที่อบอุ่น
          </h1>

          <p className="login-showcase-desc">
            แพลตฟอร์มจับคู่และรับเลี้ยงสุนัข แมวจรจัด ที่เชื่อมโยงผู้รับเลี้ยงใจดีกับศูนย์พักพิงและมูลนิธิที่ผ่านการตรวจสอบทั่วไทย
          </p>

          {/* Feature Highlights */}
          <div className="login-showcase-features">
            {[
              { title: 'ปัดการ์ดค้นหาที่ใช่', desc: 'เลือกลักษณะ สายพันธุ์ และขนาดที่เข้ากับไลฟ์สไตล์คุณ' },
              { title: 'มูลนิธิผ่านการยืนยันตัวตน', desc: 'มีเอกสารนิติบุคคลและความโปร่งใสทุกเคส' },
              { title: 'พูดคุยและนัดหมายผ่านแชท', desc: 'สอบถามข้อมูลตรงกับผู้ดูแลก่อนตัดสินใจรับเลี้ยง' }
            ].map((f, i) => (
              <div key={i} className="login-feature-item">
                <div className="login-feature-icon">
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
      </motion.div>

      {/* Right Panel - Auth Form */}
      <div className="login-form-panel">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25, delay: 0.05 }}
          className="login-form-card"
        >

          {/* Mobile Topbar */}
          <div className="login-mobile-topbar">
            <Link to="/" className="login-mobile-back-btn">
              <ChevronLeft size={16} />
              <span>หน้าแรก</span>
            </Link>

            <div className="login-mobile-brand">
              <div className="login-mobile-brand-icon">
                <PawPrint size={15} strokeWidth={2.4} />
              </div>
              <span style={{ fontWeight: 700, fontSize: '0.92rem', color: '#111827' }}>
                4 ขา<span style={{ color: '#D97706' }}>หาบ้าน</span>
              </span>
            </div>
          </div>


          {/* Form Header */}
          <div className="login-header-group">
            <h2 className="login-header-title">
              {activeTab === 'login' ? 'ยินดีต้อนรับกลับมา' : 'สร้างบัญชีผู้ใช้ใหม่'}
            </h2>
            <p className="login-header-subtitle">
              {activeTab === 'login'
                ? 'เข้าสู่ระบบเพื่อค้นหาและติดต่อรับเลี้ยงสัตว์'
                : 'เริ่มต้นเป็นส่วนหนึ่งในการมอบบ้านที่อบอุ่น'}
            </p>
          </div>

          {/* Alerts */}
          <AnimatePresence>
            {errorMsg && (
              <motion.div
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                style={{
                  backgroundColor: '#FEF2F2',
                  border: '1px solid #FCA5A5',
                  padding: '12px 14px',
                  borderRadius: '10px',
                  marginBottom: '16px',
                  fontSize: '0.85rem',
                  color: '#DC2626',
                  display: 'flex',
                  alignItems: 'flex-start',
                  justifyContent: 'space-between',
                  gap: '8px'
                }}
              >
                <span style={{ flex: 1, lineHeight: 1.4 }}>{errorMsg}</span>
                <button
                  type="button"
                  onClick={() => setErrorMsg('')}
                  style={{ background: 'none', border: 'none', color: '#DC2626', cursor: 'pointer', padding: 0 }}
                  title="ปิด"
                >
                  <X size={16} />
                </button>
              </motion.div>
            )}

            {successMsg && (
              <motion.div
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                style={{
                  backgroundColor: '#ECFDF5',
                  border: '1px solid #A7F3D0',
                  padding: '12px 14px',
                  borderRadius: '10px',
                  marginBottom: '16px',
                  fontSize: '0.85rem',
                  color: '#059669',
                  display: 'flex',
                  alignItems: 'flex-start',
                  justifyContent: 'space-between',
                  gap: '8px'
                }}
              >
                <span style={{ flex: 1, lineHeight: 1.4 }}>{successMsg}</span>
                <button
                  type="button"
                  onClick={() => setSuccessMsg('')}
                  style={{ background: 'none', border: 'none', color: '#059669', cursor: 'pointer', padding: 0 }}
                  title="ปิด"
                >
                  <X size={16} />
                </button>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Google Auth Button */}
          <button
            type="button"
            className="login-google-btn"
            onClick={handleGoogleLogin}
            disabled={isSubmitting || authLoading || (activeTab === 'register' && !agreed)}
          >
            <img
              src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg"
              alt="Google"
              style={{ width: '18px', height: '18px' }}
            />
            <span>{activeTab === 'login' ? 'เข้าสู่ระบบด้วย Google' : 'สมัครสมาชิกด้วย Google'}</span>
          </button>

          {/* Divider */}
          <div className="login-divider">
            <div className="login-divider-line" />
            <span className="login-divider-text">หรือใช้อีเมล</span>
            <div className="login-divider-line" />
          </div>

          {/* Registration Role Switcher */}
          {activeTab === 'register' && (
            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 500, color: '#374151', marginBottom: '6px' }}>
                ประเภทบัญชีของคุณ
              </label>
              <div className="login-role-selector">
                <button
                  type="button"
                  className={`login-role-btn ${role === 'user' ? 'active' : ''}`}
                  onClick={() => setRole('user')}
                >
                  <User size={15} />
                  <span>ผู้รับเลี้ยงทั่วไป</span>
                </button>
                <button
                  type="button"
                  className={`login-role-btn ${role === 'foundation' ? 'active' : ''}`}
                  onClick={() => setRole('foundation')}
                >
                  <Shield size={15} />
                  <span>ตัวแทนมูลนิธิ</span>
                </button>
              </div>
            </div>
          )}

          {/* Forms */}
          {activeTab === 'login' ? (
            <form onSubmit={handleEmailLogin} className="login-field-group">
              <div className="login-input-wrapper">
                <label className="login-input-label">อีเมล</label>
                <input
                  type="email"
                  className="login-input-control"
                  placeholder="name@example.com"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  required
                  autoComplete="email"
                />
              </div>

              <div className="login-input-wrapper">
                <label className="login-input-label">รหัสผ่าน</label>
                <input
                  type="password"
                  className="login-input-control"
                  placeholder="กรอกรหัสผ่านของคุณ"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                  autoComplete="current-password"
                />
              </div>

              <button
                type="submit"
                className="login-submit-btn primary-login"
                disabled={isSubmitting || authLoading}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="spin" size={18} />
                    <span>กำลังเข้าสู่ระบบ...</span>
                  </>
                ) : 'เข้าสู่ระบบ'}
              </button>
            </form>
          ) : (
            <form onSubmit={handleRegister} className="login-field-group">
              <div className="login-input-wrapper">
                <label className="login-input-label">
                  <span>{role === 'user' ? 'ชื่อ - นามสกุล' : 'ชื่อมูลนิธิ / ศูนย์พักพิง'}</span>
                  <span style={{ color: '#DC2626' }}>*</span>
                </label>
                <input
                  type="text"
                  className="login-input-control"
                  placeholder={role === 'user' ? 'เช่น สมชาย ใจดี' : 'เช่น มูลนิธิบ้านเพื่อหมาแมว'}
                  value={fullName}
                  onChange={e => setFullName(e.target.value)}
                  required
                />
              </div>

              <div className="login-input-wrapper">
                <label className="login-input-label">
                  <span>อีเมลสำหรับใช้งาน</span>
                  <span style={{ color: '#DC2626' }}>*</span>
                </label>
                <input
                  type="email"
                  className="login-input-control"
                  placeholder="name@example.com"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  required
                  autoComplete="email"
                />
              </div>

              <div className="login-input-wrapper">
                <label className="login-input-label">
                  <span>กำหนดรหัสผ่าน</span>
                  <span style={{ color: '#DC2626' }}>*</span>
                </label>
                <input
                  type="password"
                  className="login-input-control"
                  placeholder="อย่างน้อย 6 ตัวอักษร"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                  minLength={6}
                  autoComplete="new-password"
                />
              </div>

              {role === 'foundation' && (
                <>
                  <div className="login-input-wrapper">
                    <label className="login-input-label">
                      <span>เบอร์โทรศัพท์ติดต่อ</span>
                      <span style={{ color: '#DC2626' }}>*</span>
                    </label>
                    <input
                      type="tel"
                      className="login-input-control"
                      placeholder="เช่น 081-234-5678"
                      value={phone}
                      onChange={e => setPhone(formatPhoneNumber(e.target.value))}
                      required
                    />
                  </div>

                  <div className="login-input-wrapper">
                    <label className="login-input-label">
                      <span>เลขทะเบียนมูลนิธิ / องค์กร</span>
                      <span style={{ fontSize: '0.75rem', color: '#6B7280' }}>(ถ้ามี)</span>
                    </label>
                    <input
                      type="text"
                      className="login-input-control"
                      placeholder="เช่น 01055xxxxxxxx"
                      value={registrationNumber}
                      onChange={e => setRegistrationNumber(e.target.value)}
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
                margin: '4px 0',
                cursor: 'pointer'
              }}>
                <input
                  type="checkbox"
                  checked={agreed}
                  onChange={(e) => setAgreed(e.target.checked)}
                  style={{ marginTop: '3px', cursor: 'pointer', accentColor: '#059669' }}
                />
                <span>ฉันยอมรับ <strong style={{ color: '#111827' }}>ข้อกำหนดการใช้งาน</strong> และ <strong style={{ color: '#111827' }}>นโยบายความเป็นส่วนตัว</strong></span>
              </label>

              <button
                type="submit"
                className="login-submit-btn primary-register"
                disabled={isSubmitting || authLoading || !agreed}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="spin" size={18} />
                    <span>กำลังสมัครสมาชิก...</span>
                  </>
                ) : 'สมัครสมาชิก'}
              </button>
            </form>
          )}

          {/* Footer Switcher */}
          <div className="login-footer-switcher">
            {activeTab === 'login' ? (
              <p style={{ margin: 0 }}>
                ยังไม่มีบัญชีใช่ไหม?
                <button
                  type="button"
                  className="login-footer-link"
                  onClick={() => {
                    setActiveTab('register');
                    setRole('user');
                    setErrorMsg('');
                    setSuccessMsg('');
                  }}
                >
                  สมัครสมาชิกที่นี่
                </button>
              </p>
            ) : (
              <p style={{ margin: 0 }}>
                มีบัญชีอยู่แล้ว?
                <button
                  type="button"
                  className="login-footer-link"
                  onClick={() => {
                    setActiveTab('login');
                    setErrorMsg('');
                    setSuccessMsg('');
                  }}
                >
                  เข้าสู่ระบบที่นี่
                </button>
              </p>
            )}
          </div>

        </motion.div>
      </div>
    </div>
  );
};

export default Login;
