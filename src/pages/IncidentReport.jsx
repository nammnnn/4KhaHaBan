import React, { useState, useEffect, useRef, lazy, Suspense } from 'react';
import { motion } from 'framer-motion';
import {
  MapPin, Camera, CheckCircle2, Send, Dog, Cat, PawPrint, Crosshair, Phone, User, X,
  History, ShieldCheck, Loader2, Siren, AlertTriangle, Map as MapIcon
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { supabase } from '../services/supabaseClient';
import { getAddressFromCoordinates } from '../lib/geo';
import { Badge, Button, Dialog, EmptyState, useToast } from '../components/ui';
import { useI18n } from '../i18n';
import './ServicePages.css';
import { SuccessMark } from '../components/motion/PawMotion';

// Rescue report — DESIGN.md §7.22

const ANIMALS = [
  { id: 'dog', icon: Dog },
  { id: 'cat', icon: Cat },
  { id: 'other', icon: PawPrint },
];
const URGENCY = ['critical', 'urgent', 'normal'];
const GOOD_ACCURACY_M = 30; // stop listening once GPS is this precise
const ROUGH_ACCURACY_M = 100; // above this, ask the reporter to check the pin on the map
const GPS_WAIT_MS = 8000;
const MapPicker = lazy(() => import('../components/MapPicker'));

const formatDistance = (m, t) => (m >= 1000 ? t('report.gps.km', { n: (m / 1000).toFixed(1) }) : t('report.gps.m', { n: m }));
const formatAccuracy = (m, t) => t('report.gps.acc', { d: formatDistance(m, t) });

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
  const [accuracy, setAccuracy] = useState(null); // metres, for a GPS fix
  const [gpsFix, setGpsFix] = useState(null); // last GPS point, shown on the map
  const [locSource, setLocSource] = useState(null); // 'gps' | 'map'
  const [mapOpen, setMapOpen] = useState(false);
  const [mapDraft, setMapDraft] = useState(null);
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [reporterName, setReporterName] = useState('');
  const [reporterPhone, setReporterPhone] = useState('');
  const [errors, setErrors] = useState({});
  const [contactLocked, setContactLocked] = useState(false);
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
  const [reportsError, setReportsError] = useState(false);
  const [reportsReload, setReportsReload] = useState(0);

  const fileInputRef = useRef(null);

  // Pre-fill contact details from the profile
  useEffect(() => {
    if (!user) return;
    const name = profile?.full_name || user?.user_metadata?.full_name || '';
    const phone = profile?.phone ? formatPhoneNumber(profile.phone) : '';
    setReporterName((v) => v || name);
    setReporterPhone((v) => v || phone);
    // Both known from the profile: show them as one line with "Edit"
    const digits = phone.replace(/\D/g, '');
    if (name && digits.length >= 9) setContactLocked(true);
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
    let cancelled = false;
    const fetchMyReports = async () => {
      setLoadingReports(true);
      setReportsError(false);
      try {
        if (!supabase) { setUserReports([]); return; }
        // The reporter is stored in user_id (see migration 007)
        const { data, error } = await supabase
          .from('incident_reports')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false });
        if (error) throw error;
        if (!cancelled) setUserReports(data || []);
      } catch (err) {
        console.warn('Error fetching user reports:', err);
        if (!cancelled) setReportsError(true);
      } finally {
        if (!cancelled) setLoadingReports(false);
      }
    };
    fetchMyReports();
    return () => { cancelled = true; };
  }, [user?.id, submittedReport, reportsReload]); // eslint-disable-line react-hooks/exhaustive-deps

  // Fills the address from a point; leaves out nearby building names (they mislead next to a rough pin)
  const fillAddress = async ({ latitude, longitude }) => {
    let resolved = '';
    try {
      const rev = await getAddressFromCoordinates(latitude, longitude, { place: false });
      resolved = rev?.formattedAddress || '';
    } catch (e) {
      console.warn('Reverse geocode error:', e);
    }
    setLocationText(resolved || `GPS: ${latitude.toFixed(5)}, ${longitude.toFixed(5)}`);
    setErrors((e) => ({ ...e, location: undefined }));
  };

  // Phones often give a coarse first fix; listen for a few seconds and keep the most accurate one
  const handleGetLocation = () => {
    if (!navigator.geolocation) {
      toast(t('report.gps.unsupported'), { tone: 'error' });
      return;
    }
    setIsGettingLocation(true);
    let best = null;
    let done = false;
    const finish = async () => {
      if (done) return;
      done = true;
      navigator.geolocation.clearWatch(watchId);
      clearTimeout(timer);
      if (!best) {
        setIsGettingLocation(false);
        toast(t('report.gps.failed'), { tone: 'error' });
        return;
      }
      const point = { latitude: best.latitude, longitude: best.longitude };
      setCoordinates(point);
      setGpsFix(point);
      setAccuracy(Math.round(best.accuracy));
      setLocSource('gps');
      await fillAddress(point);
      setIsGettingLocation(false);
    };
    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        if (!best || pos.coords.accuracy < best.accuracy) best = pos.coords;
        if (pos.coords.accuracy <= GOOD_ACCURACY_M) finish();
      },
      (err) => {
        console.warn('Geolocation error:', err);
        finish();
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
    );
    const timer = setTimeout(finish, GPS_WAIT_MS);
  };

  const confirmMapPin = async () => {
    if (!mapDraft) return;
    setMapOpen(false);
    setCoordinates(mapDraft);
    setAccuracy(null); // placed by hand on the map
    setLocSource('map');
    await fillAddress(mapDraft);
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
    if (next.phone) setContactLocked(false);
    const firstError = Object.keys(next).find((k) => next[k]);
    if (firstError) {
      document.getElementById(`rp-${firstError}`)?.focus();
      return;
    }

    send(imageFile);
  };

  // Sends the report; `photo` is null when the reporter chose to send without the photo
  const send = async (photo) => {
    setIsSubmitting(true);
    try {
      const result = await api.submitIncidentReport({
        userId: user?.id,
        animalType,
        symptoms,
        urgency: urgencyLevel,
        locationText,
        latitude: coordinates?.latitude,
        longitude: coordinates?.longitude,
        reporterName: reporterName.trim() || 'ผู้แจ้งไม่ประสงค์ออกนาม',
        reporterPhone,
      }, photo);

      setSubmittedReport(result);
      setSymptoms('');
      setLocationText('');
      setCoordinates(null);
      setAccuracy(null);
      setLocSource(null);
      removeImage();
      document.querySelector('.main-content')?.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err) {
      console.error('Report submit error:', err);
      if (err?.code === 'INCIDENT_PHOTO_FAILED') {
        // Keep everything filled in; let them retry or send without the photo
        toast(t('report.err.photo'), {
          tone: 'error',
          duration: 10000,
          action: { label: t('report.err.photoSkip'), onClick: () => send(null) },
        });
      } else {
        toast(t('report.err.submit'), { tone: 'error', duration: 8000 });
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const animalLabel = (type) => t(`report.animal.${ANIMALS.some((a) => a.id === type) ? type : 'other'}`);
  const dateLocale = lang === 'en' ? 'en-GB' : 'th-TH';

  return (
    <div className="sp-page sp-page--wide">
      <motion.header
        className="sp-head"
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
          <SuccessMark />
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
        >
          {/* What happened (+ photo) */}
          <section className="sp-card sp-card--tight">
            <h2 className="sp-card__title">{t('report.s1')}</h2>

            <fieldset className="sp-fieldset">
              <legend className="sp-label">{t('report.animal')}</legend>
              <div className="sp-chips">
                {ANIMALS.map(({ id, icon: Icon }) => (
                  <label key={id} className={`sp-chip ${animalType === id ? 'is-on' : ''}`}>
                    <input type="radio" name="animal" value={id} checked={animalType === id} onChange={() => setAnimalType(id)} />
                    <Icon size={18} aria-hidden="true" />
                    {t(`report.animal.${id}`)}
                  </label>
                ))}
              </div>
            </fieldset>

            <fieldset className="sp-fieldset">
              <legend className="sp-label">{t('report.urgency')}</legend>
              <div className="sp-chips">
                {URGENCY.map((id) => (
                  <label key={id} className={`sp-chip sp-chip--${id} ${urgencyLevel === id ? 'is-on' : ''}`}>
                    <input type="radio" name="urgency" value={id} checked={urgencyLevel === id} onChange={() => setUrgencyLevel(id)} aria-describedby="rp-urgency-hint" />
                    <i className="sp-dot" aria-hidden="true" />
                    {t(`report.urgency.${id}`)}
                  </label>
                ))}
              </div>
              {/* One hint for the selected level instead of three long tiles */}
              <p id="rp-urgency-hint" className="sp-hint">{t(`report.urgency.${urgencyLevel}.hint`)}</p>
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

            <div className="sp-fieldset">
              <span className="sp-label">{t('report.s3')} <em className="sp-optional">{t('common.optional')}</em></span>
              <input ref={fileInputRef} type="file" accept="image/*" hidden onChange={handleImageSelect} />
              {imagePreview ? (
                <div className="sp-filerow">
                  <img src={imagePreview} alt="" className="sp-filerow__thumb" />
                  <span className="sp-filerow__text"><strong>{t('report.photo.added')}</strong><small>{imageFile?.name}</small></span>
                  <button type="button" className="sp-filerow__remove" onClick={removeImage} aria-label={t('report.photo.remove')}>
                    <X size={18} />
                  </button>
                </div>
              ) : (
                <button type="button" className="sp-filerow sp-filerow--add" onClick={() => fileInputRef.current?.click()}>
                  <span className="sp-filerow__thumb" aria-hidden="true"><Camera size={22} /></span>
                  <span className="sp-filerow__text"><strong>{t('report.photo.add')}</strong><small>{t('report.photo.hint')}</small></span>
                </button>
              )}
            </div>
          </section>

          {/* Where + contact + send */}
          <section className="sp-card sp-card--tight sp-form__side">
            <h2 className="sp-card__title">{t('report.s2')}</h2>
            {/* GPS first and big: an exact pin finds the animal much faster than a description */}
            {(() => {
              const rough = locSource === 'gps' && accuracy > ROUGH_ACCURACY_M;
              const state = coordinates ? (rough ? 'is-rough' : 'is-pinned') : '';
              let sub = t('report.gps.why');
              if (coordinates && locSource === 'map') sub = t('report.gps.fromMap');
              else if (coordinates && rough) sub = t('report.gps.roughHint', { d: formatDistance(accuracy, t) });
              else if (coordinates && accuracy) sub = formatAccuracy(accuracy, t);
              return (
                <div className="sp-gps-wrap">
                  <button
                    type="button"
                    className={`sp-gps ${state}`}
                    onClick={handleGetLocation}
                    disabled={isGettingLocation}
                    aria-describedby="rp-gps-hint"
                  >
                    <span className="sp-gps__icon" aria-hidden="true">
                      {isGettingLocation ? <Loader2 size={22} className="ui-spin" /> : rough ? <AlertTriangle size={22} /> : coordinates ? <CheckCircle2 size={22} /> : <Crosshair size={22} />}
                    </span>
                    <span className="sp-gps__text">
                      <strong>{isGettingLocation ? t('report.gps.loading') : rough ? t('report.gps.rough') : coordinates ? t('report.gps.pinned') : t('report.gps.use')}</strong>
                      <small id="rp-gps-hint">{isGettingLocation ? t('report.gps.waiting') : sub}</small>
                    </span>
                    {coordinates && !isGettingLocation && <span className="sp-gps__again">{t('report.gps.again')}</span>}
                  </button>
                  <button type="button" className={`sp-textbtn sp-gps-map ${rough ? 'is-urgent' : ''}`} onClick={() => { setMapDraft(coordinates); setMapOpen(true); }}>
                    <MapIcon size={16} aria-hidden="true" />
                    {coordinates ? t('report.map.adjust') : t('report.map.pick')}
                  </button>
                </div>
              );
            })()}

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
              {errors.location && <span className="ui-field__error">{errors.location}</span>}
            </div>

            <div className="sp-divider" />

            <h2 className="sp-card__title">{t('report.s4')}</h2>
            {contactLocked ? (
              // Already filled from the profile: one line instead of two fields
              <div className="sp-contact">
                <span className="sp-contact__icon" aria-hidden="true"><Phone size={18} /></span>
                <span className="sp-contact__text">
                  <strong>{reporterName}</strong>
                  <small>{reporterPhone}</small>
                </span>
                <button type="button" className="sp-textbtn" onClick={() => setContactLocked(false)}>{t('common.edit')}</button>
              </div>
            ) : (
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
            )}
            <p className="sp-hint">{t('report.s4.hint')}</p>

            <div className="sp-submit">
              <Button type="submit" variant="danger" block loading={isSubmitting}>
                {!isSubmitting && <Send size={18} aria-hidden="true" />}
                {isSubmitting ? t('report.submitting') : t('report.submit')}
              </Button>
            </div>
          </section>
        </motion.form>
      )}

      {activeTab === 'history' && (
        <motion.section>
          {loadingReports ? (
            <div className="sp-list">
              {[1, 2, 3].map((i) => <div key={i} className="skeleton" style={{ height: 112, borderRadius: 16 }} />)}
            </div>
          ) : reportsError ? (
            <div className="sp-card">
              <EmptyState
                icon={History}
                title={t('report.mine.errorTitle')}
                text={t('report.mine.errorText')}
                action={<Button variant="secondary" onClick={() => setReportsReload((n) => n + 1)}>{t('report.mine.retry')}</Button>}
              />
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
      <Dialog
        open={mapOpen}
        className="sp-map-dialog"
        onClose={() => setMapOpen(false)}
        title={t('report.map.title')}
        actions={(
          <>
            <Button variant="secondary" onClick={() => setMapOpen(false)}>{t('common.cancel')}</Button>
            <Button variant="primary" onClick={confirmMapPin} disabled={!mapDraft}>{t('report.map.use')}</Button>
          </>
        )}
      >
        {mapOpen && (
          <Suspense fallback={<div className="skeleton" style={{ height: 340, borderRadius: 12 }} />}>
            <MapPicker initial={coordinates || gpsFix} accuracy={locSource === 'gps' ? accuracy : null} gps={gpsFix} onChange={setMapDraft} />
          </Suspense>
        )}
      </Dialog>
    </div>
  );
}

export default IncidentReport;
