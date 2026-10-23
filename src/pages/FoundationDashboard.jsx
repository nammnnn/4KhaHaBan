// Foundation home: what needs doing today first, then the numbers, then needs + centre info.
import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  AlertTriangle, CheckCircle2, ChevronRight, Heart, Home, MapPin, MessageCircle,
  Package, PlusCircle, QrCode, ShieldCheck, Sparkles,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../services/supabaseClient';
import { FoundationDashboardSkeleton } from '../components/Skeletons';
import './FoundationDashboard.css';

const NEED_URGENCY = {
  critical: { label: 'ด่วนมาก', tone: 'danger' },
  high: { label: 'จำเป็น', tone: 'warn' },
};

function TodoRow({ to, tone = 'default', icon: Icon, title, text }) {
  return (
    <Link to={to} className={`fd-todo__row fd-todo__row--${tone}`}>
      <span className="fd-todo__icon" aria-hidden="true"><Icon size={20} /></span>
      <span className="fd-todo__text">
        <span className="fd-todo__title">{title}</span>
        {text && <span className="fd-todo__sub">{text}</span>}
      </span>
      <ChevronRight size={18} className="fd-todo__chev" aria-hidden="true" />
    </Link>
  );
}

function Stat({ to, icon: Icon, tone, value, unit, label }) {
  return (
    <Link to={to} className="fd-stat">
      <span className={`fd-stat__icon fd-stat__icon--${tone}`} aria-hidden="true"><Icon size={18} /></span>
      <span className="fd-stat__label">{label}</span>
      <span className="fd-stat__value">{value}<small>{unit}</small></span>
    </Link>
  );
}

const FoundationDashboard = () => {
  const { user, profile } = useAuth();
  const [loading, setLoading] = useState(true);
  const [fp, setFp] = useState(null);
  const [stats, setStats] = useState({ available: 0, adopted: 0, pendingMatches: 0, needs: 0, pendingIncidents: 0, criticalIncidents: 0 });
  const [newRequests, setNewRequests] = useState([]);
  const [needs, setNeeds] = useState([]);

  useEffect(() => {
    if (!user || !supabase) { setLoading(false); return; }
    let cancelled = false;
    (async () => {
      try {
        const count = (q) => q.then(({ count: c }) => c || 0);
        const [
          { data: foundation },
          available, adopted, pendingMatches, pendingIncidents, criticalIncidents,
          { data: needRows, count: needCount },
          { data: requestRows },
        ] = await Promise.all([
          // PromptPay, address and GPS live on foundation_profiles (not on profiles)
          supabase.from('foundation_profiles').select('foundation_name, address, promptpay_number, latitude, longitude').eq('id', user.id).maybeSingle(),
          count(supabase.from('animals').select('id', { count: 'exact', head: true }).eq('foundation_id', user.id).eq('status', 'available')),
          count(supabase.from('animals').select('id', { count: 'exact', head: true }).eq('foundation_id', user.id).eq('status', 'adopted')),
          // RLS only returns requests for this foundation's animals
          count(supabase.from('matches').select('id', { count: 'exact', head: true }).eq('status', 'pending')),
          count(supabase.from('incident_reports').select('id', { count: 'exact', head: true }).eq('status', 'pending')),
          count(supabase.from('incident_reports').select('id', { count: 'exact', head: true }).eq('status', 'pending').eq('urgency', 'critical')),
          supabase.from('foundation_needs').select('id, item_name, urgency', { count: 'exact' }).eq('foundation_id', user.id).eq('is_active', true).order('created_at', { ascending: false }).limit(3),
          supabase.from('matches').select('id, user_id, animal_id, created_at').eq('status', 'pending').order('created_at', { ascending: false }).limit(2),
        ]);

        // Names for the newest requests ("สมชาย ขอรับ ข้าวตัง")
        let requests = requestRows || [];
        if (requests.length) {
          const [{ data: people }, { data: pets }] = await Promise.all([
            supabase.from('profiles').select('id, full_name').in('id', requests.map((r) => r.user_id)),
            supabase.from('animals').select('id, name').in('id', requests.map((r) => r.animal_id)),
          ]);
          requests = requests.map((r) => ({
            ...r,
            person: people?.find((p) => p.id === r.user_id)?.full_name || 'ผู้ขอรับเลี้ยง',
            pet: pets?.find((p) => p.id === r.animal_id)?.name || 'น้อง',
          }));
        }

        if (cancelled) return;
        setFp(foundation || null);
        setStats({ available, adopted, pendingMatches, needs: needCount || 0, pendingIncidents, criticalIncidents });
        setNeeds(needRows || []);
        setNewRequests(requests);
      } catch (error) {
        console.error('[Dashboard] Error fetching data:', error);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [user]);

  if (loading) return <FoundationDashboardSkeleton />;

  const name = fp?.foundation_name || profile?.full_name || 'มูลนิธิของคุณ';
  const hasPromptPay = Boolean(fp?.promptpay_number);
  const hasLocation = fp?.latitude != null && fp?.longitude != null;
  const otherIncidents = stats.pendingIncidents - stats.criticalIncidents;

  const requestText = newRequests.length
    ? `${newRequests[0].person} ขอรับ${newRequests[0].pet}${stats.pendingMatches > 1 ? ` และอีก ${stats.pendingMatches - 1} รายการ` : ''}`
    : '';

  const todos = [
    stats.criticalIncidents > 0 && (
      <TodoRow key="crit" to="/foundation/incidents" tone="danger" icon={AlertTriangle}
        title={`เคสวิกฤตรอคนช่วย ${stats.criticalIncidents} เคส`} text="สัตว์บาดเจ็บหรือป่วยหนัก ควรรีบรับเคส" />
    ),
    stats.pendingMatches > 0 && (
      <TodoRow key="req" to="/foundation/matches" tone="primary" icon={MessageCircle}
        title={`คำขอรับเลี้ยงใหม่ ${stats.pendingMatches} รายการ`} text={requestText} />
    ),
    otherIncidents > 0 && (
      <TodoRow key="inc" to="/foundation/incidents" icon={AlertTriangle}
        title={`เหตุแจ้งรอคนช่วย ${otherIncidents} เคส`} text="ดูพิกัดและรับเคสที่อยู่ใกล้คุณ" />
    ),
    !hasPromptPay && (
      <TodoRow key="pp" to="/profile?modal=foundation" icon={QrCode}
        title="ตั้งค่าพร้อมเพย์" text="ผู้ใช้จะบริจาคเงินให้มูลนิธิได้ทันที" />
    ),
    !hasLocation && (
      <TodoRow key="gps" to="/profile?editLocation=true" icon={MapPin}
        title="ปักหมุดที่ตั้งศูนย์" text="ใช้คำนวณระยะทางให้ผู้ที่สนใจรับเลี้ยง" />
    ),
    stats.available + stats.adopted === 0 && (
      <TodoRow key="first" to="/foundation/animals/new" icon={PlusCircle}
        title="ลงประกาศน้องตัวแรก" text="ใส่รูปและนิสัยน้อง แล้วผู้ใช้จะเห็นในหน้าปัด" />
    ),
  ].filter(Boolean);

  return (
    <div className="fd-page">
      <header className="fd-header">
        <div className="fd-header__text">
          <h1 className="fd-header__name">{name}</h1>
          <span className="fd-verified"><ShieldCheck size={14} aria-hidden="true" /> ได้รับการรับรอง</span>
        </div>
        <Link to="/foundation/animals/new" className="ui-btn ui-btn--primary fd-header__cta">
          <PlusCircle size={18} aria-hidden="true" /> เพิ่มสัตว์หาบ้าน
        </Link>
      </header>

      <section className="fd-card fd-todo" aria-labelledby="fd-todo-title">
        <h2 id="fd-todo-title" className="fd-card__title">ต้องทำวันนี้</h2>
        {todos.length ? (
          <div className="fd-todo__list">{todos}</div>
        ) : (
          <p className="fd-todo__done">
            <CheckCircle2 size={20} aria-hidden="true" /> ไม่มีงานค้าง ทุกคำขอและทุกเคสได้รับการดูแลแล้ว
          </p>
        )}
      </section>

      <section className="fd-stats" aria-label="ภาพรวม">
        <Stat to="/foundation/animals" icon={Home} tone="primary" value={stats.available} unit="ตัว" label="กำลังหาบ้าน" />
        <Stat to="/foundation/animals" icon={Heart} tone="success" value={stats.adopted} unit="ตัว" label="ได้บ้านแล้ว" />
        <Stat to="/foundation/matches" icon={MessageCircle} tone="primary" value={stats.pendingMatches} unit="รายการ" label="คำขอรอตอบ" />
        <Stat to="/foundation/needs" icon={Package} tone="neutral" value={stats.needs} unit="รายการ" label="ของที่ต้องการ" />
      </section>

      <div className="fd-grid">
        <section className="fd-card" aria-labelledby="fd-needs-title">
          <div className="fd-card__head">
            <h2 id="fd-needs-title" className="fd-card__title">ของที่ต้องการ</h2>
            <Link to="/foundation/needs" className="fd-card__action">จัดการ</Link>
          </div>
          {needs.length ? (
            <ul className="fd-list">
              {needs.map((n) => {
                const u = NEED_URGENCY[n.urgency];
                return (
                  <li key={n.id} className="fd-list__row">
                    <span className="fd-list__name">{n.item_name}</span>
                    {u && <span className={`fd-pill fd-pill--${u.tone}`}>{u.label}</span>}
                  </li>
                );
              })}
            </ul>
          ) : (
            <div className="fd-empty">
              <p>ยังไม่ได้ระบุของที่ต้องการ ผู้ใช้จะเห็นรายการนี้ในหน้าบริจาค</p>
              <Link to="/foundation/needs" className="ui-btn ui-btn--secondary ui-btn--sm">เพิ่มรายการ</Link>
            </div>
          )}
        </section>

        <section className="fd-card" aria-labelledby="fd-info-title">
          <div className="fd-card__head">
            <h2 id="fd-info-title" className="fd-card__title">ข้อมูลศูนย์</h2>
            <Link to="/profile?modal=foundation" className="fd-card__action">แก้ไข</Link>
          </div>
          <ul className="fd-list">
            <li className="fd-list__row fd-list__row--info">
              <MapPin size={18} aria-hidden="true" />
              <span className="fd-list__text">
                <span className="fd-list__label">ที่ตั้งศูนย์</span>
                <span className={hasLocation ? 'fd-list__value' : 'fd-list__value is-missing'}>
                  {hasLocation ? (fp?.address || 'ปักหมุดแล้ว') : 'ยังไม่ได้ปักหมุด'}
                </span>
              </span>
            </li>
            <li className="fd-list__row fd-list__row--info">
              <QrCode size={18} aria-hidden="true" />
              <span className="fd-list__text">
                <span className="fd-list__label">พร้อมเพย์รับบริจาค</span>
                <span className={hasPromptPay ? 'fd-list__value' : 'fd-list__value is-missing'}>
                  {hasPromptPay ? fp.promptpay_number : 'ยังไม่ได้ตั้งค่า'}
                </span>
              </span>
            </li>
          </ul>
        </section>
      </div>

      <section className="fd-card fd-tips" aria-labelledby="fd-tips-title">
        <h2 id="fd-tips-title" className="fd-card__title"><Sparkles size={18} aria-hidden="true" /> เคล็ดลับให้น้องได้บ้านเร็วขึ้น</h2>
        <ul>
          <li>ใช้รูปแสงธรรมชาติที่เห็นหน้าและดวงตาชัด รูปแรกคือรูปหน้าปก</li>
          <li>เล่านิสัยและประวัติสุขภาพสั้นๆ ให้ผู้สนใจนึกภาพออก</li>
          <li>เลือกแท็กให้ครบ เช่น "เข้ากับเด็กได้" "ฝึกขับถ่ายแล้ว" เพื่อให้คนที่เหมาะเจอน้องง่ายขึ้น</li>
        </ul>
      </section>
    </div>
  );
};

export default FoundationDashboard;
