// Opened from the "reset password" email. Supabase signs the person in from the link; here they
// pick a new password. Without a session the link was expired or already used.
import { useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AlertCircle, Loader2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../components/ui';
import { PetScene } from '../components/motion/PetScene';
import BrandMark from '../components/BrandMark';
import { useI18n, LanguageSwitch } from '../i18n';
import './Login.css';

export default function ResetPassword() {
  const { user, updatePassword } = useAuth();
  const { t } = useI18n();
  const toast = useToast();
  const navigate = useNavigate();
  const formRef = useRef(null);
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [errors, setErrors] = useState({});
  const [errorMsg, setErrorMsg] = useState('');
  const [saving, setSaving] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    const errs = {};
    if (!password) errs.password = t('login.fe.password');
    else if (password.length < 6) errs.password = t('login.fe.passwordShort');
    if (!errs.password && confirm !== password) errs.confirm = t('rp.mismatch');
    setErrors(errs);
    const first = Object.keys(errs)[0];
    if (first) { formRef.current?.querySelector(`[name="${first}"]`)?.focus(); return; }

    setSaving(true);
    const { error } = await updatePassword(password);
    setSaving(false);
    if (error) {
      // e.g. "New password should be different from the old password"
      setErrorMsg(/different/i.test(error.message || '') ? t('rp.same') : t('rp.fail'));
      return;
    }
    toast(t('rp.done'), { tone: 'success' });
    navigate('/', { replace: true });
  };

  const field = (name, label, value, set, autoComplete) => (
    <div className="login-input-wrapper">
      <label className="login-input-label" htmlFor={`rp-${name}`}>{label}</label>
      <input
        id={`rp-${name}`}
        name={name}
        type="password"
        className={`login-input-control ${errors[name] ? 'is-invalid' : ''}`}
        value={value}
        onChange={(e) => { set(e.target.value); if (errors[name]) setErrors((x) => ({ ...x, [name]: undefined })); }}
        autoComplete={autoComplete}
        aria-invalid={errors[name] ? true : undefined}
        aria-describedby={errors[name] ? `rp-err-${name}` : undefined}
      />
      {errors[name] && (
        <span className="login-field-error" id={`rp-err-${name}`} role="alert">
          <AlertCircle size={14} aria-hidden="true" /> {errors[name]}
        </span>
      )}
    </div>
  );

  return (
    <div className="login-page-container">
      <div className="login-form-panel">
        <div className="login-form-card">
          <LanguageSwitch className="login-lang" />
          <div className="login-mobile-brand rp-brand">
            <div className="login-mobile-brand-icon"><BrandMark size={26} /></div>
            <span style={{ fontWeight: 700, fontSize: '0.92rem', color: '#111827' }}>
              {t('app.name.prefix')}<span style={{ color: '#D97706' }}>{t('app.name.accent')}</span>
            </span>
          </div>

          {!user ? (
            <div className="ui-empty ui-empty--anim rp-expired">
              <div className="ui-empty__art"><PetScene variant="search" size="sm" /></div>
              <h2 className="ui-empty__title">{t('rp.expired.title')}</h2>
              <p className="ui-empty__text">{t('rp.expired.text')}</p>
              <div className="ui-empty__action">
                <Link to="/login" className="ui-btn ui-btn--primary">{t('rp.toLogin')}</Link>
              </div>
            </div>
          ) : (
            <>
              <div className="login-header-group">
                <h2 className="login-header-title">{t('rp.title')}</h2>
                <p className="login-header-subtitle">{t('rp.sub', { email: user.email || '' })}</p>
              </div>
              {errorMsg && (
                <p className="login-field-error rp-error" role="alert"><AlertCircle size={14} aria-hidden="true" /> {errorMsg}</p>
              )}
              <form ref={formRef} onSubmit={submit} className="login-field-group" noValidate>
                {field('password', t('rp.new'), password, setPassword, 'new-password')}
                {field('confirm', t('rp.confirm'), confirm, setConfirm, 'new-password')}
                <button type="submit" className="login-submit-btn primary-login" disabled={saving}>
                  {saving ? <><Loader2 className="spin" size={18} /><span>{t('rp.saving')}</span></> : t('rp.save')}
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
