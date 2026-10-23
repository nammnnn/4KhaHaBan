// Foundation: rescue cases reported by users. Open cases first, critical on top, one main action per card.
import React, { useEffect, useState } from 'react';
import {
  AlertTriangle, Cat, CheckCircle2, Clock, Dog, Heart, Lock, MapPin, Navigation, Phone, RotateCcw, UserCheck, X,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { FoundationIncidentsSkeleton } from '../components/Skeletons';
import { Button, Dialog, useToast } from '../components/ui';
import { api } from '../services/api';
import { supabase } from '../services/supabaseClient';
import './FoundationIncidents.css';

// How urgent the reporter said it is (incident_reports.urgency, migration 028)
const URGENCY_META = {
  critical: { label: 'วิกฤต', rank: 0 },
  urgent: { label: 'เร่งด่วน', rank: 1 },
  normal: { label: 'ไม่เร่งด่วน', rank: 2 },
};
const STATUS_RANK = { pending: 0, in_progress: 1, resolved: 2, cancelled: 3 };
const ANIMAL = {
  dog: { label: 'สุนัข', icon: Dog },
  cat: { label: 'แมว', icon: Cat },
};

const CONFIRM = {
  accept: {
    title: 'รับเคสนี้?',
    text: (name) => `ระบบจะบันทึกว่า${name}เป็นผู้รับผิดชอบ และแจ้งมูลนิธิอื่นว่ามีคนรับแล้ว จะได้ไม่เดินทางไปซ้ำกัน`,
    cta: 'รับเคสและเริ่มเดินทาง', status: 'in_progress', variant: 'primary',
  },
  release: {
    title: 'ส่งต่อเคสนี้?',
    text: () => 'เคสจะกลับเป็น "รอคนช่วย" เพื่อให้มูลนิธิอื่นรับต่อได้ ใช้เมื่อไปไม่ได้หรือติดขัด',
    cta: 'ส่งต่อเคส', status: 'pending', variant: 'secondary',
  },
  resolve: {
    title: 'ช่วยเหลือสำเร็จแล้ว?',
    text: () => 'เคสจะถูกปิด และนับเป็นการช่วยเหลือสำเร็จของมูลนิธิ',
    cta: 'ยืนยันช่วยเหลือสำเร็จ', status: 'resolved', variant: 'success',
  },
  cancel: {
    title: 'ยกเลิกเคสนี้?',
    text: () => 'ใช้กับเคสที่แจ้งซ้ำ หาสัตว์ไม่พบ หรือมีคนช่วยไปแล้ว เคสจะไม่แสดงในรายการที่รอคนช่วยอีก',
    cta: 'ยกเลิกเคส', status: 'cancelled', variant: 'danger',
  },
};

const DONE_TOAST = {
  pending: 'ส่งต่อเคสแล้ว มูลนิธิอื่นรับต่อได้',
  in_progress: 'รับเคสแล้ว ขอให้เดินทางปลอดภัย',
  resolved: 'บันทึกว่าช่วยเหลือสำเร็จแล้ว',
  cancelled: 'ยกเลิกเคสแล้ว',
};

function timeAgo(iso) {
  const mins = Math.max(0, Math.round((Date.now() - new Date(iso)) / 60000));
  if (mins < 1) return 'เมื่อสักครู่';
  if (mins < 60) return `${mins} นาทีที่แล้ว`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `${hrs} ชม.ที่แล้ว`;
  return new Date(iso).toLocaleDateString('th-TH', { day: 'numeric', month: 'short' });
}

function CasePhoto({ src, onOpen, animalType }) {
  const [ok, setOk] = useState(true);
  const A = ANIMAL[animalType]?.icon || Heart;
  if (!src || !ok) {
    return <span className="inc-photo inc-photo--empty"><A size={28} aria-hidden="true" /><small>ไม่มีรูป</small></span>;
  }
  return (
    <button type="button" className="inc-photo" onClick={onOpen} aria-label="ดูรูปขนาดใหญ่">
      <img src={src} alt="" loading="lazy" onError={() => setOk(false)} />
    </button>
  );
}

const EMPTY_TEXT = {
  open: 'ไม่มีเคสที่รอคนช่วยตอนนี้ เมื่อมีคนแจ้งเหตุ จะขึ้นที่นี่ทันที',
  mine: 'คุณยังไม่ได้รับเคสไหน กด "รับเคสนี้" ในแท็บรอคนช่วย',
  taken: 'ตอนนี้ไม่มีเคสที่มูลนิธิอื่นกำลังช่วย',
};

export default function FoundationIncidents() {
  const { user, profile } = useAuth();
  const toast = useToast();
  const [incidents, setIncidents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('open');
  const [updatingId, setUpdatingId] = useState(null);
  const [previewImage, setPreviewImage] = useState(null);
  const [confirm, setConfirm] = useState(null); // { type, incident }

  useEffect(() => {
    (async () => {
      try {
        setIncidents((await api.getIncidentReports('all')) || []);
      } catch (err) {
        console.error('Error loading incidents:', err);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // New reports and other foundations' updates arrive live
  useEffect(() => {
    if (!supabase) return undefined;
    const channel = supabase
      .channel('foundation_realtime_incidents')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'incident_reports' }, (payload) => {
        if (payload.eventType === 'INSERT') {
          setIncidents((prev) => [payload.new, ...prev.filter((i) => i.id !== payload.new.id)]);
          toast(payload.new.urgency === 'critical' ? 'มีเคสวิกฤตแจ้งเข้ามาใหม่' : 'มีเหตุแจ้งเข้ามาใหม่', { tone: payload.new.urgency === 'critical' ? 'error' : 'info' });
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
      toast(DONE_TOAST[newStatus] || 'อัปเดตแล้ว', { tone: 'success' });
    } catch (err) {
      console.error('Failed to update status:', err);
      toast('อัปเดตเคสไม่สำเร็จ กรุณาลองใหม่', { tone: 'error' });
    } finally {
      setUpdatingId(null);
      setConfirm(null);
    }
  };

  if (loading) return <FoundationIncidentsSkeleton />;

  // Tabs never overlap: each open case sits in exactly one of the first three
  const isOpen = (i) => i.status === 'pending' || i.status === 'in_progress';
  const mine = (i) => i.status === 'in_progress' && i.rescuer_id === user?.id;
  const FILTERS = [
    { id: 'open', label: 'รอคนช่วย', test: (i) => i.status === 'pending' },
    { id: 'mine', label: 'เคสของฉัน', test: mine },
    { id: 'taken', label: 'มีคนรับแล้ว', test: (i) => i.status === 'in_progress' && !mine(i) },
    { id: 'resolved', label: 'สำเร็จแล้ว', test: (i) => i.status === 'resolved' },
    { id: 'cancelled', label: 'ยกเลิก', test: (i) => i.status === 'cancelled' },
    { id: 'all', label: 'ทั้งหมด', test: () => true },
  ];
  const active = FILTERS.find((f) => f.id === filter) || FILTERS[0];
  const list = incidents.filter(active.test).sort((a, b) =>
    (STATUS_RANK[a.status] ?? 4) - (STATUS_RANK[b.status] ?? 4)
    || (URGENCY_META[a.urgency]?.rank ?? 1) - (URGENCY_META[b.urgency]?.rank ?? 1)
    || new Date(b.created_at) - new Date(a.created_at));
  const critical = incidents.filter((i) => i.status === 'pending' && i.urgency === 'critical').length;
  const waiting = incidents.filter((i) => i.status === 'pending').length;
  const confirmMeta = confirm ? CONFIRM[confirm.type] : null;

  return (
    <div className="inc-page">
      <header className="inc-header">
        <h1 className="inc-header__title">แจ้งเหตุ</h1>
        <p className="inc-header__sub">
          {waiting > 0
            ? <>รอคนช่วย <strong>{waiting}</strong> เคส{critical > 0 && <> · วิกฤต <strong className="inc-critical-text">{critical}</strong></>}</>
            : 'ตอนนี้ไม่มีเคสที่รอคนช่วย'}
        </p>
      </header>

      <div className="inc-filters" role="tablist" aria-label="กรองเคส">
        {FILTERS.map((f) => (
          <button key={f.id} type="button" role="tab" aria-selected={filter === f.id}
            className={`inc-filter ${filter === f.id ? 'is-on' : ''}`} onClick={() => setFilter(f.id)}>
            {f.label} <span>{incidents.filter(f.test).length}</span>
          </button>
        ))}
      </div>

      {list.length === 0 ? (
        <div className="inc-empty">
          <CheckCircle2 size={32} aria-hidden="true" />
          <p>{EMPTY_TEXT[filter] || 'ไม่มีเคสในหมวดนี้'}</p>
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
            const u = URGENCY_META[inc.urgency];
            const A = ANIMAL[inc.animal_type];
            const AnimalIcon = A?.icon;
            return (
              <li key={inc.id} className={`inc-card inc-card--${inc.status} ${isOpen(inc) && inc.urgency === 'critical' ? 'is-critical' : ''}`}>
                <CasePhoto src={inc.image_url} animalType={inc.animal_type} onOpen={() => setPreviewImage(inc.image_url)} />
                <div className="inc-card__body">
                  <div className="inc-card__tags">
                    {isOpen(inc) && u && (
                      <span className={`inc-urgency inc-urgency--${inc.urgency}`}><span className="inc-urgency__dot" aria-hidden="true" />{u.label}</span>
                    )}
                    {inc.status === 'in_progress' && (
                      <span className="inc-tag inc-tag--progress">{isMine ? 'คุณรับเคสนี้' : `${inc.rescuer_name || 'มีผู้'}กำลังช่วย`}</span>
                    )}
                    {inc.status === 'resolved' && <span className="inc-tag inc-tag--done"><CheckCircle2 size={13} aria-hidden="true" /> ช่วยสำเร็จ</span>}
                    {inc.status === 'cancelled' && <span className="inc-tag">ยกเลิกแล้ว</span>}
                    <span className="inc-tag">{AnimalIcon && <AnimalIcon size={13} aria-hidden="true" />}{A?.label || 'สัตว์อื่น'}</span>
                    <span className="inc-time"><Clock size={13} aria-hidden="true" /> {timeAgo(inc.created_at)}</span>
                  </div>

                  <p className="inc-card__symptoms">{inc.symptoms || 'ไม่ได้ระบุอาการ'}</p>

                  <div className="inc-card__where">
                    <MapPin size={16} aria-hidden="true" />
                    <span>{inc.location_text || (hasCoords ? 'ปักหมุดไว้บนแผนที่' : 'ไม่ได้ระบุสถานที่')}</span>
                  </div>

                  <div className="inc-card__links">
                    <a className="inc-link" href={mapsUrl} target="_blank" rel="noopener noreferrer"><Navigation size={15} aria-hidden="true" /> นำทาง</a>
                    {inc.reporter_phone && (
                      <a className="inc-link" href={`tel:${inc.reporter_phone}`}><Phone size={15} aria-hidden="true" /> โทรหา{inc.reporter_name && inc.reporter_name !== 'ผู้แจ้งไม่ประสงค์ออกนาม' ? ` ${inc.reporter_name}` : 'ผู้แจ้ง'}</a>
                    )}
                    {otherRescuer && inc.status === 'in_progress' && inc.rescuer_phone && (
                      <a className="inc-link" href={`tel:${inc.rescuer_phone}`}><Phone size={15} aria-hidden="true" /> โทรหาผู้รับเคส</a>
                    )}
                  </div>

                  <div className="inc-card__actions">
                    {inc.status === 'pending' && (
                      <>
                        <Button variant="primary" loading={busy} onClick={() => setConfirm({ type: 'accept', incident: inc })}>
                          <UserCheck size={18} aria-hidden="true" /> รับเคสนี้
                        </Button>
                        <button type="button" className="inc-text-btn" onClick={() => setConfirm({ type: 'cancel', incident: inc })} disabled={busy}>
                          <X size={15} aria-hidden="true" /> ยกเลิกเคส
                        </button>
                      </>
                    )}
                    {inc.status === 'in_progress' && isMine && (
                      <>
                        <Button variant="success" loading={busy} onClick={() => setConfirm({ type: 'resolve', incident: inc })}>
                          <CheckCircle2 size={18} aria-hidden="true" /> ช่วยเหลือสำเร็จ
                        </Button>
                        <button type="button" className="inc-text-btn" onClick={() => setConfirm({ type: 'release', incident: inc })} disabled={busy}>
                          <RotateCcw size={15} aria-hidden="true" /> ส่งต่อเคส
                        </button>
                      </>
                    )}
                    {inc.status === 'in_progress' && otherRescuer && (
                      <p className="inc-locked"><Lock size={15} aria-hidden="true" /> {inc.rescuer_name || 'มูลนิธิอื่น'}รับเคสนี้แล้ว</p>
                    )}
                    {inc.status === 'in_progress' && !inc.rescuer_id && (
                      <Button variant="primary" loading={busy} onClick={() => setConfirm({ type: 'accept', incident: inc })}>
                        <UserCheck size={18} aria-hidden="true" /> รับผิดชอบเคสนี้
                      </Button>
                    )}
                    {inc.status === 'resolved' && (
                      <p className="inc-done">
                        ช่วยโดย {inc.rescuer_name || 'มูลนิธิ'}
                        {inc.resolved_at && ` · ${new Date(inc.resolved_at).toLocaleDateString('th-TH', { day: 'numeric', month: 'short' })}`}
                      </p>
                    )}
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <Dialog open={Boolean(confirm)} onClose={() => !updatingId && setConfirm(null)} title={confirmMeta?.title}>
        {confirmMeta && (
          <>
            <p className="inc-confirm__text">{confirmMeta.text(myName)}</p>
            {confirm.incident.symptoms && <p className="inc-confirm__case"><AlertTriangle size={15} aria-hidden="true" /> {confirm.incident.symptoms}</p>}
            <div className="ui-dialog__actions">
              <Button variant="secondary" onClick={() => setConfirm(null)} disabled={Boolean(updatingId)}>ย้อนกลับ</Button>
              <Button variant={confirmMeta.variant} loading={updatingId === confirm.incident.id}
                onClick={() => handleUpdateStatus(confirm.incident.id, confirmMeta.status)}>
                {confirmMeta.cta}
              </Button>
            </div>
          </>
        )}
      </Dialog>

      <Dialog open={Boolean(previewImage)} onClose={() => setPreviewImage(null)} title="รูปจากผู้แจ้ง" className="inc-preview">
        {previewImage && <img src={previewImage} alt="รูปสัตว์ที่ได้รับแจ้ง" className="inc-preview__img" />}
      </Dialog>
    </div>
  );
}
