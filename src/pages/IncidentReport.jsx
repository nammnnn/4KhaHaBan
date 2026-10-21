import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import {
  MapPin, Camera, CheckCircle2, Send, Dog, Cat, PawPrint, Crosshair, Phone, User, X,
  History, ShieldCheck, Loader2, Siren
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { supabase } from '../services/supabaseClient';
import { getAddressFromCoordinates } from '../lib/geo';
import { Badge, Button, EmptyState, useToast } from '../components/ui';
import { useI18n } from '../i18n';
import './ServicePages.css';

// Rescue report — DESIGN.md §7.22

const ANIMALS = [
  { id: 'dog', icon: Dog },
  { id: 'cat', icon: Cat },
  { id: 'other', icon: PawPrint },
];
const URGENCY = ['critical', 'urgent', 'normal'];
const STATUS_TONE = { pending: 'danger', in_progress: 'pending', resolved: 'success', cancelled: 'neutral' };

// Phone number auto-formatter (e.g. 081-234-5678 or 02-123-4567)
const formatPhoneNumber = (val) => {
  if (!val) return '';
  const digits = val.replace(/\D/g, '').slice(0, 10);
  if (digits.startsWith('02')) {
    if (digits.length <= 2) return digits;
    if (digits.length <= 5) return `${digits.slice(0, 2)}-${digits.slice(2)}`;
    return `${digits.slice(0, 2)}-${digits.slice(2, 5)}-${digits.slice(5)}`;
  }
  if (digits.length <= 3) return digits;
  if (digits.length <= 6) return `${digits.slice(0, 3)}-${digits.slice(3)}`;
  return `${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6)}`;
};

function IncidentReport() {
  const { user, profile } = useAuth();
  const { t, lang } = useI18n();
  const toast = useToast();

  const [activeTab, setActiveTab] = useState('form'); // 'form' | 'history'

  // Form
  const [animalType, setAnimalType] = useState('dog');
  const [symptoms, setSymptoms] = useState('');
  const [urgencyLevel, setUrgencyLevel] = useState('urgent');
  const [locationText, setLocationText] = useState('');
  const [coordinates, setCoordinates] = useState(null);
  const [isGettingLocation, setIsGettingLocation] = useState(false);
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [reporterName, setReporterName] = useState('');
  const [reporterPhone, setReporterPhone] = useState('');
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submittedReport, setSubmittedReport] = useState(null);

  // Stats & history (stats cached in sessionStorage so they don't flash 0)
  const [incidentStats, setIncidentStats] = useState(() => {
    try {
      const parsed = JSON.parse(sessionStorage.getItem('cached_incident_stats') || 'null');
      if (typeof parsed?.inProgress === 'number' && typeof parsed?.resolved === 'number') return parsed;
    } catch { /* ignore */ }
    return null;
  });
  const [userReports, setUserReports] = useState([]);
  const [loadingReports, setLoadingReports] = useState(false);

  const fileInputRef = useRef(null);

  // Pre-fill contact details from the profile
  useEffect(() => {
    if (!user) return;
    setReporterName((v) => v || profile?.full_name || user?.user_metadata?.full_name || '');
    setReporterPhone((v) => v || (profile?.phone ? formatPhoneNumber(profile.phone) : ''));
  }, [user, profile]);

  // Live rescue stats
  useEffect(() => {
    let channel = null;
    const fetchStats = async () => {
      try {
        const stats = await api.getIncidentStats();
        setIncidentStats(stats);
        try { sessionStorage.setItem('cached_incident_stats', JSON.stringify(stats)); } catch { /* ignore */ }
      } catch (err) {
        console.warn('Error fetching incident stats:', err);
      }
    };
    fetchStats();
    if (supabase) {
      channel = supabase
        .channel('realtime_incident_stats_page')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'incident_reports' }, fetchStats)
        .subscribe();
    }
    return () => { if (channel && supabase) supabase.removeChannel(channel); };
  }, [submittedReport]);

  // My reports
  useEffect(() => {
    if (!user) return;
    const fetchMyReports = async () => {
      setLoadingReports(true);
      try {
        if (!supabase) { setUserReports([]); return; }
        const { data, error } = await supabase
          .from('incident_reports')
          .select('*')
          .eq('reporter_id', user.id)
          .order('created_at', { ascending: false });
        if (!error && data) setUserReports(data);
      } catch (err) {
        console.warn('Error fetching user reports:', err);
      } finally {
        setLoadingReports(false);
      }
    };
    fetchMyReports();
  }, [user, submittedReport]);

  const handleGetLocation = () => {
    if (!navigator.geolocation) {
      toast(t('report.gps.unsupported'), { tone: 'error' });
      return;
    }
    setIsGettingLocation(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude } = pos.coords;
        setCoordinates({ latitude, longitude });
        let resolved = '';
        try {
          const rev = await getAddressFromCoordinates(latitude, longitude);
          resolved = rev?.formattedAddress || '';
        } catch (e) {
          console.warn('Reverse geocode error:', e);
        }
        setLocationText(resolved || `GPS: ${latitude.toFixed(5)}, ${longitude.toFixed(5)}`);
        setErrors((e) => ({ ...e, location: undefined }));
        setIsGettingLocation(false);
      },
      (err) => {
        setIsGettingLocation(false);
        console.warn('Geolocation error:', err);
        toast(t('report.gps.failed'), { tone: 'error' });
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const handleImageSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
  };

  const removeImage = () => {
    setImageFile(null);
    setImagePreview(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const cleanPhone = reporterPhone.replace(/\D/g, '');
    const next = {
      symptoms: symptoms.trim() ? undefined : t('report.err.symptoms'),
      location: locationText.trim() ? undefined : t('report.err.location'),
      phone: cleanPhone.length >= 9 && cleanPhone.length <= 10 ? undefined : t('report.err.phone'),
    };
    setErrors(next);
    const firstError = Object.keys(next).find((k) => next[k]);
    if (firstError) {
      document.getElementById(`rp-${firstError}`)?.focus();
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await api.submitIncidentReport({
        userId: user?.id,
        animalType,
        // Stored format the foundation dashboard already reads
        symptoms: urgencyLevel === 'critical' ? `[ฉุกเฉินวิกฤต] ${symptoms}` : symptoms,
        locationText,
        latitude: coordinates?.latitude,
        longitude: coordinates?.longitude,
        reporterName: reporterName.trim() || 'ผู้แจ้งไม่ประสงค์ออกนาม',
        reporterPhone,
      }, imageFile);

      setSubmittedReport(result || { id: 'temp_' + Date.now() });
      setSymptoms('');
      setLocationText('');
      setCoordinates(null);
      removeImage();
      document.querySelector('.main-content')?.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err) {
      console.error('Report submit error:', err);
      toast(t('report.err.submit'), { tone: 'error' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const animalLabel = (type) => t(`report.animal.${ANIMALS.some((a) => a.id === type) ? type : 'other'}`);
  const dateLocale = lang === 'en' ? 'en-GB' : 'th-TH';

  return (
    <div className="sp-page">
      <motion.header
        className="sp-head"
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2 }}
      >
        <h1 className="sp-head__title">{t('report.title')}</h1>
        <p className="sp-head__sub">{t('report.sub')}</p>
        <p className="sp-stats" aria-live="polite">
          <span><i className="sp-dot sp-dot--live" aria-hidden="true" />{t('report.stats.inProgress')} <strong>{incidentStats?.inProgress ?? '–'}</strong></span>
          <span><CheckCircle2 size={14} aria-hidden="true" />{t('report.stats.resolved')} <strong>{incidentStats?.resolved ?? '–'}</strong></span>
        </p>
      </motion.header>

      <div className="sp-seg" role="tablist" aria-label={t('report.title')}>
        <button type="button" role="tab" aria-selected={activeTab === 'form'} className={activeTab === 'form' ? 'is-on' : ''} onClick={() => setActiveTab('form')}>
          <Siren size={16} aria-hidden="true" /> {t('report.tab.new')}
        </button>
        <button type="button" role="tab" aria-selected={activeTab === 'history'} className={activeTab === 'history' ? 'is-on' : ''} onClick={() => setActiveTab('history')}>
          <History size={16} aria-hidden="true" /> {t('report.tab.mine')}
          {userReports.length > 0 && <span className="sp-seg__count">{userReports.length}</span>}
        </button>
      </div>

      {activeTab === 'form' && submittedReport && (
        <motion.section className="sp-card sp-done" initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }}>
          <span className="sp-done__icon" aria-hidden="true"><CheckCircle2 size={36} /></span>
          <h2>{t('report.done.title')}</h2>
          <p>{t('report.done.text')}</p>
          <div className="sp-done__actions">
            <Button variant="secondary" onClick={() => { setSubmittedReport(null); setActiveTab('history'); }}>
              {t('report.done.track')}
            </Button>
            <Button variant="primary" onClick={() => setSubmittedReport(null)}>{t('report.done.another')}</Button>
          </div>
        </motion.section>
      )}

      {activeTab === 'form' && !submittedReport && (
        <motion.form
          className="sp-form"
          onSubmit={handleSubmit}
          noValidate
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25, delay: 0.05 }}
        >
          {/* 1. What happened */}
          <section className="sp-card">
            <h2 className="sp-card__title"><span className="sp-step">1</span>{t('report.s1')}</h2>

            <fieldset className="sp-fieldset">
              <legend className="sp-label">{t('report.animal')}</legend>
              <div className="sp-options sp-options--3">
                {ANIMALS.map(({ id, icon: Icon }) => (
                  <label key={id} className={`sp-option ${animalType === id ? 'is-on' : ''}`}>
                    <input type="radio" name="animal" value={id} checked={animalType === id} onChange={() => setAnimalType(id)} />
                    <Icon size={22} aria-hidden="true" />
                    <span>{t(`report.animal.${id}`)}</span>
                  </label>
                ))}
              </div>
            </fieldset>

            <fieldset className="sp-fieldset">
              <legend className="sp-label">{t('report.urgency')}</legend>
              <div className="sp-urgency">
                {URGENCY.map((id) => (
                  <label key={id} className={`sp-urgency__item sp-urgency__item--${id} ${urgencyLevel === id ? 'is-on' : ''}`}>
                    <input type="radio" name="urgency" value={id} checked={urgencyLevel === id} onChange={() => setUrgencyLevel(id)} />
                    <i className="sp-dot" aria-hidden="true" />
                    <span>
                      <strong>{t(`report.urgency.${id}`)}</strong>
                      <small>{t(`report.urgency.${id}.hint`)}</small>
                    </span>
                  </label>
                ))}
              </div>
            </fieldset>

            <div className="sp-fieldset">
              <label className="sp-label" htmlFor="rp-symptoms">{t('report.symptoms')}</label>
              <textarea
                id="rp-symptoms"
                className="ui-input sp-textarea"
                rows={3}
                value={symptoms}
                onChange={(e) => { setSymptoms(e.target.value); if (errors.symptoms) setErrors((x) => ({ ...x, symptoms: undefined })); }}
                placeholder={t('report.symptoms.ph')}
                aria-invalid={errors.symptoms ? 'true' : undefined}
              />
              {errors.symptoms && <span className="ui-field__error">{errors.symptoms}</span>}
            </div>
          </section>

          {/* 2. Where */}
          <section className="sp-card">
            <h2 className="sp-card__title"><span className="sp-step">2</span>{t('report.s2')}</h2>
            <Button type="button" variant="secondary" block onClick={handleGetLocation} disabled={isGettingLocation}>
              {isGettingLocation ? <Loader2 size={18} className="ui-spin" aria-hidden="true" /> : <Crosshair size={18} aria-hidden="true" />}
              {isGettingLocation ? t('report.gps.loading') : t('report.gps.use')}
            </Button>
            <div className="sp-fieldset">
              <label className="sp-label" htmlFor="rp-location">{t('report.location')}</label>
              <div className="sp-input-icon">
                <MapPin size={18} aria-hidden="true" />
                <input
                  id="rp-location"
                  type="text"
                  className="ui-input"
                  value={locationText}
                  onChange={(e) => { setLocationText(e.target.value); if (errors.location) setErrors((x) => ({ ...x, location: undefined })); }}
                  placeholder={t('report.location.ph')}
                  aria-invalid={errors.location ? 'true' : undefined}
                />
              </div>
              {coordinates && (
                <span className="sp-ok"><CheckCircle2 size={14} aria-hidden="true" /> {t('report.gps.pinned')}</span>
              )}
              {errors.location && <span className="ui-field__error">{errors.location}</span>}
            </div>
          </section>

          {/* 3. Photo */}
          <section className="sp-card">
            <h2 className="sp-card__title"><span className="sp-step">3</span>{t('report.s3')} <em>{t('common.optional')}</em></h2>
            <input ref={fileInputRef} type="file" accept="image/*" hidden onChange={handleImageSelect} />
            {imagePreview ? (
              <div className="sp-photo">
                <img src={imagePreview} alt="" />
                <button type="button" className="sp-photo__remove" onClick={removeImage} aria-label={t('report.photo.remove')}>
                  <X size={18} />
                </button>
              </div>
            ) : (
              <button type="button" className="sp-drop" onClick={() => fileInputRef.current?.click()}>
                <Camera size={28} aria-hidden="true" />
                <strong>{t('report.photo.add')}</strong>
                <span>{t('report.photo.hint')}</span>
              </button>
            )}
          </section>

          {/* 4. Contact */}
          <section className="sp-card">
            <h2 className="sp-card__title"><span className="sp-step">4</span>{t('report.s4')}</h2>
            <p className="sp-card__hint">{t('report.s4.hint')}</p>
            <div className="sp-grid-2">
              <div className="sp-fieldset">
                <label className="sp-label" htmlFor="rp-name">{t('report.name')}</label>
                <div className="sp-input-icon">
                  <User size={18} aria-hidden="true" />
                  <input id="rp-name" type="text" className="ui-input" value={reporterName} onChange={(e) => setReporterName(e.target.value)} placeholder={t('report.name.ph')} autoComplete="name" />
                </div>
              </div>
              <div className="sp-fieldset">
                <label className="sp-label" htmlFor="rp-phone">{t('report.phone')}</label>
                <div className="sp-input-icon">
                  <Phone size={18} aria-hidden="true" />
                  <input
                    id="rp-phone"
                    type="tel"
                    inputMode="tel"
                    className="ui-input"
                    value={reporterPhone}
                    onChange={(e) => { setReporterPhone(formatPhoneNumber(e.target.value)); if (errors.phone) setErrors((x) => ({ ...x, phone: undefined })); }}
                    placeholder="08x-xxx-xxxx"
                    autoComplete="tel"
                    aria-invalid={errors.phone ? 'true' : undefined}
                  />
                </div>
                {errors.phone && <span className="ui-field__error">{errors.phone}</span>}
              </div>
            </div>
          </section>

          <div className="sp-submit">
            <Button type="submit" variant="danger" block loading={isSubmitting}>
              {!isSubmitting && <Send size={18} aria-hidden="true" />}
              {isSubmitting ? t('report.submitting') : t('report.submit')}
            </Button>
          </div>
        </motion.form>
      )}

      {activeTab === 'history' && (
        <motion.section initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }}>
          {loadingReports ? (
            <div className="sp-list">
              {[1, 2, 3].map((i) => <div key={i} className="skeleton" style={{ height: 112, borderRadius: 16 }} />)}
            </div>
          ) : userReports.length === 0 ? (
            <div className="sp-card">
              <EmptyState
                icon={ShieldCheck}
                title={t('report.mine.emptyTitle')}
                text={t('report.mine.emptyText')}
                action={<Button variant="secondary" onClick={() => setActiveTab('form')}>{t('report.tab.new')}</Button>}
              />
            </div>
          ) : (
            <ul className="sp-list">
              {userReports.map((report) => (
                <li key={report.id} className="sp-card sp-case">
                  {report.image_url && <img className="sp-case__img" src={report.image_url} alt="" loading="lazy" />}
                  <div className="sp-case__body">
                    <div className="sp-case__top">
                      <strong>{animalLabel(report.animal_type)}</strong>
                      <Badge tone={STATUS_TONE[report.status] || 'danger'}>{t(`report.status.${STATUS_TONE[report.status] ? report.status : 'pending'}`)}</Badge>
                    </div>
                    <time className="sp-case__date" dateTime={report.created_at}>
                      {new Date(report.created_at).toLocaleString(dateLocale, { dateStyle: 'medium', timeStyle: 'short' })}
                    </time>
                    <p className="sp-case__text">{report.symptoms}</p>
                    <p className="sp-case__place"><MapPin size={14} aria-hidden="true" /> {report.location_text || t('report.mine.noPlace')}</p>
                    {report.rescuer_name && (
                      <p className="sp-case__rescuer">
                        <ShieldCheck size={15} aria-hidden="true" />
                        {t('report.mine.rescuer', { name: report.rescuer_name })}
                        {report.rescuer_phone && <a href={`tel:${report.rescuer_phone}`}>{report.rescuer_phone}</a>}
                      </p>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </motion.section>
      )}
    </div>
  );
}

export default IncidentReport;
