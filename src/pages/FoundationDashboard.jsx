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
import { LoadError } from '../components/ui';
import { useI18n } from '../i18n';
import './FoundationDashboard.css';

// Same labels as the needs page (FoundationNeeds URGENCY_LEVELS)
const NEED_URGENCY = {
  critical: { labelKey: 'fd.urg.critical', tone: 'danger' },
  high: { labelKey: 'fd.urg.high', tone: 'warn' },
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
  const { t } = useI18n();
  const [loading, setLoading] = useState(true);
  const [fp, setFp] = useState(null);
  const [stats, setStats] = useState({ available: 0, adopted: 0, pendingMatches: 0, needs: 0, pendingIncidents: 0, criticalIncidents: 0 });
  const [newRequests, setNewRequests] = useState([]);
  const [needs, setNeeds] = useState([]);
  const [loadError, setLoadError] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    if (!user || !supabase) { setLoading(false); return; }
    let cancelled = false;
    (async () => {
      try {
        // Supabase returns errors instead of throwing; throw so the page can show "couldn't load".
        const ok = (r) => { if (r.error) throw r.error; return r; };
        const count = (q) => q.then((r) => ok(r).count || 0);
        const [
          { data: foundation },
          available, adopted, pendingMatches, pendingIncidents, criticalIncidents,
          { data: needRows, count: needCount },
          { data: requestRows },
        ] = await Promise.all([
          // PromptPay, address and GPS live on foundation_profiles (not on profiles)
          supabase.from('foundation_profiles').select('foundation_name, address, promptpay_number, latitude, longitude').eq('id', user.id).maybeSingle().then(ok),
          count(supabase.from('animals').select('id', { count: 'exact', head: true }).eq('foundation_id', user.id).eq('status', 'available')),
          count(supabase.from('animals').select('id', { count: 'exact', head: true }).eq('foundation_id', user.id).eq('status', 'adopted')),
          // RLS only returns requests for this foundation's animals
          count(supabase.from('matches').select('id', { count: 'exact', head: true }).eq('status', 'pending')),
          count(supabase.from('incident_reports').select('id', { count: 'exact', head: true }).eq('status', 'pending')),
          count(supabase.from('incident_reports').select('id', { count: 'exact', head: true }).eq('status', 'pending').eq('urgency', 'critical')),
          supabase.from('foundation_needs').select('id, item_name, urgency', { count: 'exact' }).eq('foundation_id', user.id).eq('is_active', true).order('created_at', { ascending: false }).limit(3).then(ok),
          supabase.from('matches').select('id, user_id, animal_id, created_at').eq('status', 'pending').order('created_at', { ascending: false }).limit(2).then(ok),
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
            person: people?.find((p) => p.id === r.user_id)?.full_name || null,
            pet: pets?.find((p) => p.id === r.animal_id)?.name || null,
          }));
        }

        if (cancelled) return;
        setLoadError(false);
        setFp(foundation || null);
        setStats({ available, adopted, pendingMatches, needs: needCount || 0, pendingIncidents, criticalIncidents });
        setNeeds(needRows || []);
        setNewRequests(requests);
      } catch (error) {
        console.error('[Dashboard] Error fetching data:', error);
        if (!cancelled) setLoadError(true);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [user, reloadKey]);

  if (loading) return <FoundationDashboardSkeleton />;
  if (loadError) {
    return (
      <div className="fd-page">
        <LoadError onRetry={() => { setLoading(true); setReloadKey((k) => k + 1); }} />
      </div>
    );
  }

  const name = fp?.foundation_name || profile?.full_name || t('fd.ourFoundation');
  const hasPromptPay = Boolean(fp?.promptpay_number);
  const hasLocation = fp?.latitude != null && fp?.longitude != null;
  const otherIncidents = stats.pendingIncidents - stats.criticalIncidents;

  const requestText = newRequests.length
    ? t('fd.requestText', { person: newRequests[0].person || t('fd.adopter'), pet: newRequests[0].pet || t('fd.pet') })
      + (stats.pendingMatches > 1 ? t('fd.requestMore', { n: stats.pendingMatches - 1 }) : '')
    : '';

  const todos = [
    stats.criticalIncidents > 0 && (
      <TodoRow key="crit" to="/foundation/incidents" tone="danger" icon={AlertTriangle}
        title={t('fd.todo.crit', { n: stats.criticalIncidents })} text={t('fd.todo.critText')} />
    ),
    stats.pendingMatches > 0 && (
      <TodoRow key="req" to="/foundation/matches" tone="primary" icon={MessageCircle}
        title={t('fd.todo.req', { n: stats.pendingMatches })} text={requestText} />
    ),
    otherIncidents > 0 && (
      <TodoRow key="inc" to="/foundation/incidents" icon={AlertTriangle}
        title={t('fd.todo.inc', { n: otherIncidents })} text={t('fd.todo.incText')} />
    ),
    !hasPromptPay && (
      <TodoRow key="pp" to="/profile?modal=foundation" icon={QrCode}
        title={t('fd.todo.pp')} text={t('fd.todo.ppText')} />
    ),
    !hasLocation && (
      <TodoRow key="gps" to="/profile?editLocation=true" icon={MapPin}
        title={t('fd.todo.gps')} text={t('fd.todo.gpsText')} />
    ),
    stats.available + stats.adopted === 0 && (
      <TodoRow key="first" to="/foundation/animals/new" icon={PlusCircle}
        title={t('fd.todo.first')} text={t('fd.todo.firstText')} />
    ),
  ].filter(Boolean);

  return (
    <div className="fd-page">
      <header className="fd-header">
        <div className="fd-header__text">
          <h1 className="fd-header__name">{name}</h1>
          <span className="fd-verified"><ShieldCheck size={14} aria-hidden="true" /> {t('fd.verified')}</span>
        </div>
        <Link to="/foundation/animals/new" className="ui-btn ui-btn--primary fd-header__cta">
          <PlusCircle size={18} aria-hidden="true" /> {t('fnd.addAnimal')}
        </Link>
      </header>

      <section className="fd-card fd-todo" aria-labelledby="fd-todo-title">
        <h2 id="fd-todo-title" className="fd-card__title">{t('fd.todo.title')}</h2>
        {todos.length ? (
          <div className="fd-todo__list">{todos}</div>
        ) : (
          <p className="fd-todo__done">
            <CheckCircle2 size={20} aria-hidden="true" /> {t('fd.todo.none')}
          </p>
        )}
      </section>

      <section className="fd-stats" aria-label={t('fd.overview')}>
        <Stat to="/foundation/animals" icon={Home} tone="primary" value={stats.available} unit={t('fnd.unit.animals')} label={t('fd.stat.available')} />
        <Stat to="/foundation/animals" icon={Heart} tone="success" value={stats.adopted} unit={t('fnd.unit.animals')} label={t('fd.stat.adopted')} />
        <Stat to="/foundation/matches" icon={MessageCircle} tone="primary" value={stats.pendingMatches} unit={t('fnd.unit.items')} label={t('fd.stat.pending')} />
        <Stat to="/foundation/needs" icon={Package} tone="neutral" value={stats.needs} unit={t('fnd.unit.items')} label={t('fd.stat.needs')} />
      </section>

      <div className="fd-grid">
        <section className="fd-card" aria-labelledby="fd-needs-title">
          <div className="fd-card__head">
            <h2 id="fd-needs-title" className="fd-card__title">{t('fd.needs.title')}</h2>
            <Link to="/foundation/needs" className="fd-card__action">{t('fd.manage')}</Link>
          </div>
          {needs.length ? (
            <ul className="fd-list">
              {needs.map((n) => {
                const u = NEED_URGENCY[n.urgency];
                return (
                  <li key={n.id} className="fd-list__row">
                    <span className="fd-list__name">{n.item_name}</span>
                    {u && <span className={`fd-pill fd-pill--${u.tone}`}>{t(u.labelKey)}</span>}
                  </li>
                );
              })}
            </ul>
          ) : (
            <div className="fd-empty">
              <p>{t('fd.needs.empty')}</p>
              <Link to="/foundation/needs" className="ui-btn ui-btn--secondary ui-btn--sm">{t('fd.needs.add')}</Link>
            </div>
          )}
        </section>

        <section className="fd-card" aria-labelledby="fd-info-title">
          <div className="fd-card__head">
            <h2 id="fd-info-title" className="fd-card__title">{t('fd.info.title')}</h2>
            <Link to="/profile?modal=foundation" className="fd-card__action">{t('fd.edit')}</Link>
          </div>
          <ul className="fd-list">
            <li className="fd-list__row fd-list__row--info">
              <MapPin size={18} aria-hidden="true" />
              <span className="fd-list__text">
                <span className="fd-list__label">{t('fd.info.location')}</span>
                <span className={hasLocation ? 'fd-list__value' : 'fd-list__value is-missing'}>
                  {hasLocation ? (fp?.address || t('fd.info.pinned')) : t('fd.info.notPinned')}
                </span>
              </span>
            </li>
            <li className="fd-list__row fd-list__row--info">
              <QrCode size={18} aria-hidden="true" />
              <span className="fd-list__text">
                <span className="fd-list__label">{t('fd.info.promptpay')}</span>
                <span className={hasPromptPay ? 'fd-list__value' : 'fd-list__value is-missing'}>
                  {hasPromptPay ? fp.promptpay_number : t('fd.info.notSet')}
                </span>
              </span>
            </li>
          </ul>
        </section>
      </div>

      <section className="fd-card fd-tips" aria-labelledby="fd-tips-title">
        <h2 id="fd-tips-title" className="fd-card__title"><Sparkles size={18} aria-hidden="true" /> {t('fd.tips.title')}</h2>
        <ul>
          <li>{t('fd.tips.1')}</li>
          <li>{t('fd.tips.2')}</li>
          <li>{t('fd.tips.3')}</li>
        </ul>
      </section>
    </div>
  );
};

export default FoundationDashboard;
