import React, { useState, useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  PawPrint, Loader2, Mail, Lock, User, Phone, FileText,
  X, Shield
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { LoginSkeleton } from '../components/Skeletons';
import './Login.css';
import { useI18n, LanguageSwitch } from '../i18n';
import { LoginShowcase, MOBILE_FACES } from '../components/LoginShowcase';

const Login = () => {
  const { user, loginWithGoogle, loginWithEmail, registerWithEmail, resendConfirmation, loading: authLoading } = useAuth();

  const { t } = useI18n();
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
  // Email waiting for its confirmation link (after sign-up, or a login refused for that reason)
  const [pendingEmail, setPendingEmail] = useState('');
  const [resendState, setResendState] = useState('idle'); // idle | sending | sent | error
  const [resendCooldown, setResendCooldown] = useState(0);

  useEffect(() => {
    if (resendCooldown <= 0) return undefined;
    const id = setTimeout(() => setResendCooldown((n) => n - 1), 1000);
    return () => clearTimeout(id);
  }, [resendCooldown]);

  const handleResend = async () => {
    if (!pendingEmail || resendCooldown > 0) return;
    setResendState('sending');
    const { error } = await resendConfirmation(pendingEmail);
    if (error) {
      console.error('Resend confirmation failed:', error.message);
      setResendState('error');
      // Supabase rate-limits resends; let them try again a bit later
      setResendCooldown(60);
      return;
    }
    setResendState('sent');
    setResendCooldown(60);
  };

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
      setErrorMsg(t('login.err.generic', { message: error.message }));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEmailLogin = async (e) => {
    e.preventDefault();
    if (!email || !password) {
      setErrorMsg(t('login.err.missing'));
      return;
    }

    setIsSubmitting(true);
    setErrorMsg('');
    try {
      const { error } = await loginWithEmail(email, password);
      if (error) throw error;
    } catch (error) {
      console.error('Error logging in:', error.message);
      if (error?.code === 'email_not_confirmed' || /not confirmed/i.test(error?.message || '')) {
        setPendingEmail(email.trim());
        setResendState('idle');
        setErrorMsg(t('login.err.unconfirmed'));
      } else {
        setErrorMsg(t('login.err.invalid'));
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    if (!email || !password || !fullName) {
      setErrorMsg(t('login.err.required'));
      return;
    }

    if (role === 'foundation' && !phone) {
      setErrorMsg(t('login.err.foundationPhone'));
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
      const { data, error } = await registerWithEmail(email, password, metadata);
      if (error) throw error;
      // With "Confirm email" off in Supabase the account is signed in right away (data.session);
      // only ask them to check their inbox when a confirmation link was actually sent.
      if (data?.session) return;
      setPendingEmail(email.trim());
      setResendState('idle');
      setSuccessMsg(t('login.checkEmailTo', { email: email.trim() }));
      // เคลียร์ฟอร์ม
      setEmail('');
      setPassword('');
      setFullName('');
      setPhone('');
      setRegistrationNumber('');
    } catch (error) {
      console.error('Error registering:', error.message);
      setErrorMsg(t('login.err.signup', { message: error.message }));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="login-page-container">

      {/* Left Panel - Brand Showcase (Desktop) */}
      <motion.div
        className="login-desktop-showcase"
      >
        <LoginShowcase />
      </motion.div>

      {/* Right Panel - Auth Form */}
      <div className="login-form-panel">
        <motion.div
          className="login-form-card"
        >

          {/* Mobile Topbar */}
          <div className="login-mobile-topbar">
            <div className="login-mobile-brand">
              <div className="login-mobile-brand-icon">
                <PawPrint size={15} strokeWidth={2.4} />
              </div>
              <span style={{ fontWeight: 700, fontSize: '0.92rem', color: '#111827' }}>
                {t('app.name.prefix')}<span style={{ color: '#D97706' }}>{t('app.name.accent')}</span>
              </span>
            </div>
          </div>

          {/* Mobile: a few real faces instead of the desktop card stack */}
          <div className="login-mobile-faces">
            <div className="login-mobile-faces__row" aria-hidden="true">
              {MOBILE_FACES.map((src) => <img key={src} src={src} alt="" />)}
            </div>
            <span>{t('login.waiting')}</span>
          </div>

          <LanguageSwitch className="login-lang" />


          {/* Form Header */}
          <div className="login-header-group">
            <h2 className="login-header-title">
              {activeTab === 'login' ? t('login.welcome') : t('login.createAccount')}
            </h2>
            <p className="login-header-subtitle">
              {activeTab === 'login'
                ? t('login.welcomeSub')
                : t('login.createSub')}
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
                  title={t('common.close')}
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
                  title={t('common.close')}
                >
                  <X size={16} />
                </button>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Didn't get the confirmation email? */}
          {pendingEmail && (errorMsg || successMsg) && (
            <div className="login-resend">
              <span className="login-resend__text">
                {resendState === 'sent' ? t('login.resend.sent', { email: pendingEmail })
                  : resendState === 'error' ? t('login.resend.error')
                  : t('login.resend.hint')}
              </span>
              <button
                type="button"
                className="login-resend__btn"
                onClick={handleResend}
                disabled={resendState === 'sending' || resendCooldown > 0}
              >
                {resendState === 'sending' ? <Loader2 size={14} className="spin" aria-hidden="true" /> : <Mail size={14} aria-hidden="true" />}
                {resendCooldown > 0 ? t('login.resend.wait', { s: resendCooldown }) : t('login.resend.cta')}
              </button>
            </div>
          )}

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
            <span>{activeTab === 'login' ? t('login.google') : t('login.googleSignup')}</span>
          </button>

          {/* Divider */}
          <div className="login-divider">
            <div className="login-divider-line" />
            <span className="login-divider-text">{t('login.orEmail')}</span>
            <div className="login-divider-line" />
          </div>

          {/* Registration Role Switcher */}
          {activeTab === 'register' && (
            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 500, color: '#374151', marginBottom: '6px' }}>
                {t('login.accountType')}
              </label>
              <div className="login-role-selector">
                <button
                  type="button"
                  className={`login-role-btn ${role === 'user' ? 'active' : ''}`}
                  onClick={() => setRole('user')}
                >
                  <User size={15} />
                  <span>{t('login.adopter')}</span>
                </button>
                <button
                  type="button"
                  className={`login-role-btn ${role === 'foundation' ? 'active' : ''}`}
                  onClick={() => setRole('foundation')}
                >
                  <Shield size={15} />
                  <span>{t('login.foundationRep')}</span>
                </button>
              </div>
            </div>
          )}

          {/* Forms */}
          {activeTab === 'login' ? (
            <form onSubmit={handleEmailLogin} className="login-field-group">
              <div className="login-input-wrapper">
                <label className="login-input-label">{t('login.email')}</label>
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
                <label className="login-input-label">{t('login.password')}</label>
                <input
                  type="password"
                  className="login-input-control"
                  placeholder={t('login.passwordPh')}
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
                    <span>{t('login.signingIn')}</span>
                  </>
                ) : t('login.signIn')}
              </button>
            </form>
          ) : (
            <form onSubmit={handleRegister} className="login-field-group">
              <div className="login-input-wrapper">
                <label className="login-input-label">
                  <span>{role === 'user' ? t('login.fullName') : t('login.foundationName')}</span>
                  <span style={{ color: '#DC2626' }}>*</span>
                </label>
                <input
                  type="text"
                  className="login-input-control"
                  placeholder={role === 'user' ? t('login.fullNamePh') : t('login.foundationNamePh')}
                  value={fullName}
                  onChange={e => setFullName(e.target.value)}
                  required
                />
              </div>

              <div className="login-input-wrapper">
                <label className="login-input-label">
                  <span>{t('login.signupEmail')}</span>
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
                  <span>{t('login.newPassword')}</span>
                  <span style={{ color: '#DC2626' }}>*</span>
                </label>
                <input
                  type="password"
                  className="login-input-control"
                  placeholder={t('login.newPasswordPh')}
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
                      <span>{t('login.phone')}</span>
                      <span style={{ color: '#DC2626' }}>*</span>
                    </label>
                    <input
                      type="tel"
                      className="login-input-control"
                      placeholder={t('login.phonePh')}
                      value={phone}
                      onChange={e => setPhone(formatPhoneNumber(e.target.value))}
                      required
                    />
                  </div>

                  <div className="login-input-wrapper">
                    <label className="login-input-label">
                      <span>{t('login.regNo')}</span>
                      <span style={{ fontSize: '0.75rem', color: '#6B7280' }}>{t('login.optional')}</span>
                    </label>
                    <input
                      type="text"
                      className="login-input-control"
                      placeholder={t('login.regNoPh')}
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
                <span>{t('login.acceptPrefix')} <strong style={{ color: '#111827' }}>{t('login.terms')}</strong> {t('login.and')} <strong style={{ color: '#111827' }}>{t('login.privacy')}</strong></span>
              </label>

              <button
                type="submit"
                className="login-submit-btn primary-register"
                disabled={isSubmitting || authLoading || !agreed}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="spin" size={18} />
                    <span>{t('login.signingUp')}</span>
                  </>
                ) : t('login.signUp')}
              </button>
            </form>
          )}

          {/* Footer Switcher */}
          <div className="login-footer-switcher">
            {activeTab === 'login' ? (
              <p style={{ margin: 0 }}>
                {t('login.noAccount')}
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
                  {t('login.signUpHere')}
                </button>
              </p>
            ) : (
              <p style={{ margin: 0 }}>
                {t('login.haveAccount')}
                <button
                  type="button"
                  className="login-footer-link"
                  onClick={() => {
                    setActiveTab('login');
                    setErrorMsg('');
                    setSuccessMsg('');
                  }}
                >
                  {t('login.signInHere')}
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
