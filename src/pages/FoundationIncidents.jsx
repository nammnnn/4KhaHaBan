// Foundation: rescue cases reported by users. Open cases first, critical on top, one main action per card.
import React, { useEffect, useState } from 'react';
import {
  AlertTriangle, Cat, CheckCircle2, Clock, Dog, Heart, Lock, MapPin, Navigation, Phone, RotateCcw, UserCheck, X,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { FoundationIncidentsSkeleton } from '../components/Skeletons';
import { Button, Dialog, LoadError, useToast } from '../components/ui';
import { api } from '../services/api';
import { supabase } from '../services/supabaseClient';
import { useI18n } from '../i18n';
import './FoundationIncidents.css';

// How urgent the reporter said it is (incident_reports.urgency, migration 028). Labels: inc.urg.*
const URGENCY_RANK = { critical: 0, urgent: 1, normal: 2 };
const STATUS_RANK = { pending: 0, in_progress: 1, resolved: 2, cancelled: 3 };
const ANIMAL_ICON = { dog: Dog, cat: Cat };

// Confirm dialogs. Text lives under inc.confirm.<type>.title / .text / .cta
const CONFIRM = {
  accept: { status: 'in_progress', variant: 'primary' },
  release: { status: 'pending', variant: 'secondary' },
  resolve: { status: 'resolved', variant: 'success' },
  cancel: { status: 'cancelled', variant: 'danger' },
};

function timeAgo(iso, t, lang) {
  const mins = Math.max(0, Math.round((Date.now() - new Date(iso)) / 60000));
  if (mins < 1) return t('inc.justNow');
  if (mins < 60) return t('inc.minsAgo', { n: mins });
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return t('inc.hrsAgo', { n: hrs });
  return new Date(iso).toLocaleDateString(lang === 'en' ? 'en-GB' : 'th-TH', { day: 'numeric', month: 'short' });
}

function CasePhoto({ src, onOpen, animalType }) {
  const { t } = useI18n();
  const [ok, setOk] = useState(true);
  const A = ANIMAL_ICON[animalType] || Heart;
  if (!src || !ok) {
    return <span className="inc-photo inc-photo--empty"><A size={28} aria-hidden="true" /><small>{t('inc.noPhoto')}</small></span>;
  }
  return (
    <button type="button" className="inc-photo" onClick={onOpen} aria-label={t('inc.viewPhoto')}>
      <img src={src} alt="" loading="lazy" onError={() => setOk(false)} />
    </button>
  );
}

export default function FoundationIncidents() {
  const { user, profile } = useAuth();
  const { t, lang } = useI18n();
  const toast = useToast();
  const [incidents, setIncidents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('open');
  const [updatingId, setUpdatingId] = useState(null);
  const [previewImage, setPreviewImage] = useState(null);
  const [confirm, setConfirm] = useState(null); // { type, incident }

  const [loadError, setLoadError] = useState(false);

  const loadIncidents = async () => {
    try {
      setIncidents((await api.getIncidentReports('all', { strict: true })) || []);
      setLoadError(false);
    } catch (err) {
      console.error('Error loading incidents:', err);
      setLoadError(true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadIncidents(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // New reports and other foundations' updates arrive live
  useEffect(() => {
    if (!supabase) return undefined;
    const channel = supabase
      .channel('foundation_realtime_incidents')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'incident_reports' }, (payload) => {
        if (payload.eventType === 'INSERT') {
          setIncidents((prev) => [payload.new, ...prev.filter((i) => i.id !== payload.new.id)]);
          toast(payload.new.urgency === 'critical' ? t('inc.newCritical') : t('inc.new'), { tone: payload.new.urgency === 'critical' ? 'error' : 'info' });
        } else if (payload.eventType === 'UPDATE') {
          setIncidents((prev) => prev.map((i) => (i.id === payload.new.id ? { ...i, ...payload.new } : i)));
        } else if (payload.eventType === 'DELETE') {
          setIncidents((prev) => prev.filter((i) => i.id !== payload.old.id));
        }
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const myName = profile?.full_name || 'มูลนิธิ';

  const handleUpdateStatus = async (reportId, newStatus) => {
    setUpdatingId(reportId);
    try {
      const rescuerInfo = newStatus === 'in_progress'
        ? { id: user?.id, name: myName, phone: profile?.phone || '' }
        : newStatus === 'resolved' ? { name: myName } : null;
      await api.updateIncidentStatus(reportId, newStatus, rescuerInfo);
      setIncidents((prev) => prev.map((i) => {
        if (i.id !== reportId) return i;
        if (newStatus === 'in_progress') return { ...i, status: newStatus, rescuer_id: user?.id, rescuer_name: myName, rescuer_phone: profile?.phone || '', accepted_at: new Date().toISOString() };
        if (newStatus === 'pending') return { ...i, status: newStatus, rescuer_id: null, rescuer_name: null, rescuer_phone: null, accepted_at: null };
        if (newStatus === 'resolved') return { ...i, status: newStatus, resolved_at: new Date().toISOString(), rescuer_name: i.rescuer_name || myName };
        return { ...i, status: newStatus };
      }));
      toast(t(`inc.done.${newStatus}`), { tone: 'success' });
    } catch (err) {
      console.error('Failed to update status:', err);
      toast(t('inc.updateFail'), { tone: 'error' });
    } finally {
      setUpdatingId(null);
      setConfirm(null);
    }
  };

  if (loading) return <FoundationIncidentsSkeleton />;
  if (loadError) {
    return (
      <div className="inc-page">
        <header className="inc-header"><h1 className="inc-header__title">{t('inc.title')}</h1></header>
        <LoadError onRetry={loadIncidents} />
      </div>
    );
  }

  // Tabs never overlap: each open case sits in exactly one of the first three
  const isOpen = (i) => i.status === 'pending' || i.status === 'in_progress';
  const mine = (i) => i.status === 'in_progress' && i.rescuer_id === user?.id;
  const FILTERS = [
    { id: 'open', test: (i) => i.status === 'pending' },
    { id: 'mine', test: mine },
    { id: 'taken', test: (i) => i.status === 'in_progress' && !mine(i) },
    { id: 'resolved', test: (i) => i.status === 'resolved' },
    { id: 'cancelled', test: (i) => i.status === 'cancelled' },
    { id: 'all', test: () => true },
  ];
  const active = FILTERS.find((f) => f.id === filter) || FILTERS[0];
  const list = incidents.filter(active.test).sort((a, b) =>
    (STATUS_RANK[a.status] ?? 4) - (STATUS_RANK[b.status] ?? 4)
    || (URGENCY_RANK[a.urgency] ?? 1) - (URGENCY_RANK[b.urgency] ?? 1)
    || new Date(b.created_at) - new Date(a.created_at));
  const critical = incidents.filter((i) => i.status === 'pending' && i.urgency === 'critical').length;
  const waiting = incidents.filter((i) => i.status === 'pending').length;
  const confirmMeta = confirm ? CONFIRM[confirm.type] : null;

  return (
    <div className="inc-page">
      <header className="inc-header">
        <h1 className="inc-header__title">{t('inc.title')}</h1>
        <p className="inc-header__sub">
          {waiting > 0
            ? <>{t('inc.sub.waiting')}<strong>{waiting}</strong>{t('inc.sub.unit')}{critical > 0 && <>{t('inc.sub.critical')}<strong className="inc-critical-text">{critical}</strong></>}</>
            : t('inc.sub.none')}
        </p>
      </header>

      <div className="inc-filters" role="tablist" aria-label={t('inc.tabs')}>
        {FILTERS.map((f) => (
          <button key={f.id} type="button" role="tab" aria-selected={filter === f.id}
            className={`inc-filter ${filter === f.id ? 'is-on' : ''}`} onClick={() => setFilter(f.id)}>
            {t(`inc.tab.${f.id}`)} <span>{incidents.filter(f.test).length}</span>
          </button>
        ))}
      </div>

      {list.length === 0 ? (
        <div className="inc-empty">
          <CheckCircle2 size={32} aria-hidden="true" />
          <p>{['open', 'mine', 'taken'].includes(filter) ? t(`inc.empty.${filter}`) : t('inc.empty.other')}</p>
        </div>
      ) : (
        <ul className="inc-list">
          {list.map((inc) => {
            const hasCoords = Boolean(inc.latitude && inc.longitude);
            const mapsUrl = hasCoords
              ? `https://www.google.com/maps/dir/?api=1&destination=${inc.latitude},${inc.longitude}`
              : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(inc.location_text || '')}`;
            const busy = updatingId === inc.id;
            const isMine = Boolean(inc.rescuer_id && inc.rescuer_id === user?.id);
            const otherRescuer = Boolean(inc.rescuer_id && inc.rescuer_id !== user?.id);
            const hasUrgency = inc.urgency in URGENCY_RANK;
            const AnimalIcon = ANIMAL_ICON[inc.animal_type];
            const animalLabel = AnimalIcon ? t(`inc.animal.${inc.animal_type}`) : t('inc.animal.other');
            return (
              <li key={inc.id} className={`inc-card inc-card--${inc.status} ${isOpen(inc) && inc.urgency === 'critical' ? 'is-critical' : ''}`}>
                <CasePhoto src={inc.image_url} animalType={inc.animal_type} onOpen={() => setPreviewImage(inc.image_url)} />
                <div className="inc-card__body">
                  <div className="inc-card__tags">
                    {isOpen(inc) && hasUrgency && (
                      <span className={`inc-urgency inc-urgency--${inc.urgency}`}><span className="inc-urgency__dot" aria-hidden="true" />{t(`inc.urg.${inc.urgency}`)}</span>
                    )}
                    {inc.status === 'in_progress' && (
                      <span className="inc-tag inc-tag--progress">{isMine ? t('inc.youTook') : t('inc.helping', { name: inc.rescuer_name || t('inc.someone') })}</span>
                    )}
                    {inc.status === 'resolved' && <span className="inc-tag inc-tag--done"><CheckCircle2 size={13} aria-hidden="true" /> {t('inc.rescued')}</span>}
                    {inc.status === 'cancelled' && <span className="inc-tag">{t('inc.cancelled')}</span>}
                    <span className="inc-tag">{AnimalIcon && <AnimalIcon size={13} aria-hidden="true" />}{animalLabel}</span>
                    <span className="inc-time"><Clock size={13} aria-hidden="true" /> {timeAgo(inc.created_at, t, lang)}</span>
                  </div>

                  <p className="inc-card__symptoms">{inc.symptoms || t('inc.noSymptoms')}</p>

                  <div className="inc-card__where">
                    <MapPin size={16} aria-hidden="true" />
                    <span>{inc.location_text || (hasCoords ? t('inc.pinnedOnly') : t('inc.noPlace'))}</span>
                  </div>

                  <div className="inc-card__links">
                    <a className="inc-link" href={mapsUrl} target="_blank" rel="noopener noreferrer"><Navigation size={15} aria-hidden="true" /> {t('inc.directions')}</a>
                    {inc.reporter_phone && (
                      <a className="inc-link" href={`tel:${inc.reporter_phone}`}><Phone size={15} aria-hidden="true" /> {inc.reporter_name && inc.reporter_name !== 'ผู้แจ้งไม่ประสงค์ออกนาม' ? t('inc.call', { name: inc.reporter_name }) : t('inc.callReporter')}</a>
                    )}
                    {otherRescuer && inc.status === 'in_progress' && inc.rescuer_phone && (
                      <a className="inc-link" href={`tel:${inc.rescuer_phone}`}><Phone size={15} aria-hidden="true" /> {t('inc.callRescuer')}</a>
                    )}
                  </div>

                  <div className="inc-card__actions">
                    {inc.status === 'pending' && (
                      <>
                        <Button variant="primary" loading={busy} onClick={() => setConfirm({ type: 'accept', incident: inc })}>
                          <UserCheck size={18} aria-hidden="true" /> {t('inc.take')}
                        </Button>
                        <button type="button" className="inc-text-btn" onClick={() => setConfirm({ type: 'cancel', incident: inc })} disabled={busy}>
                          <X size={15} aria-hidden="true" /> {t('inc.cancelCase')}
                        </button>
                      </>
                    )}
                    {inc.status === 'in_progress' && isMine && (
                      <>
                        <Button variant="success" loading={busy} onClick={() => setConfirm({ type: 'resolve', incident: inc })}>
                          <CheckCircle2 size={18} aria-hidden="true" /> {t('inc.resolve')}
                        </Button>
                        <button type="button" className="inc-text-btn" onClick={() => setConfirm({ type: 'release', incident: inc })} disabled={busy}>
                          <RotateCcw size={15} aria-hidden="true" /> {t('inc.release')}
                        </button>
                      </>
                    )}
                    {inc.status === 'in_progress' && otherRescuer && (
                      <p className="inc-locked"><Lock size={15} aria-hidden="true" /> {t('inc.lockedBy', { name: inc.rescuer_name || t('inc.otherFoundation') })}</p>
                    )}
                    {inc.status === 'in_progress' && !inc.rescuer_id && (
                      <Button variant="primary" loading={busy} onClick={() => setConfirm({ type: 'accept', incident: inc })}>
                        <UserCheck size={18} aria-hidden="true" /> {t('inc.takeOwnership')}
                      </Button>
                    )}
                    {inc.status === 'resolved' && (
                      <p className="inc-done">
                        {t('inc.rescuedBy', { name: inc.rescuer_name || t('inc.aFoundation') })}
                        {inc.resolved_at && ` · ${new Date(inc.resolved_at).toLocaleDateString(lang === 'en' ? 'en-GB' : 'th-TH', { day: 'numeric', month: 'short' })}`}
                      </p>
                    )}
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <Dialog open={Boolean(confirm)} onClose={() => !updatingId && setConfirm(null)} title={confirm ? t(`inc.confirm.${confirm.type}.title`) : ''}>
        {confirmMeta && (
          <>
            <p className="inc-confirm__text">{t(`inc.confirm.${confirm.type}.text`, { name: myName })}</p>
            {confirm.incident.symptoms && <p className="inc-confirm__case"><AlertTriangle size={15} aria-hidden="true" /> {confirm.incident.symptoms}</p>}
            <div className="ui-dialog__actions">
              <Button variant="secondary" onClick={() => setConfirm(null)} disabled={Boolean(updatingId)}>{t('fnd.back')}</Button>
              <Button variant={confirmMeta.variant} loading={updatingId === confirm.incident.id}
                onClick={() => handleUpdateStatus(confirm.incident.id, confirmMeta.status)}>
                {t(`inc.confirm.${confirm.type}.cta`)}
              </Button>
            </div>
          </>
        )}
      </Dialog>

      <Dialog open={Boolean(previewImage)} onClose={() => setPreviewImage(null)} title={t('inc.photoTitle')} className="inc-preview">
        {previewImage && <img src={previewImage} alt={t('inc.photoAlt')} className="inc-preview__img" />}
      </Dialog>
    </div>
  );
}
