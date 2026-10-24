// Admin home: what needs attention first, then a few numbers about how the app is doing.
import { useState } from 'react';
import { AlertTriangle, Building2, CheckCircle2, ChevronRight, Clock, Flag, Heart, Home, MessageSquare, QrCode, UserPlus, Users } from 'lucide-react';
import { PayoutChanges, StaleRequests } from './AdminWatch';
import { LoadError } from '../../components/ui';
import { useI18n } from '../../i18n';
import { oldestAgeDays } from './useAdminSummary';

function TaskRow({ tone = 'default', icon: Icon, title, text, onClick }) {
  return (
    <button type="button" className={`adm-task adm-task--${tone}`} onClick={onClick}>
      <span className="adm-task__icon" aria-hidden="true"><Icon size={20} /></span>
      <span className="adm-task__text">
        <span className="adm-task__title">{title}</span>
        {text && <span className="adm-task__sub">{text}</span>}
      </span>
      <ChevronRight size={18} className="adm-task__chev" aria-hidden="true" />
    </button>
  );
}

function Stat({ icon: Icon, value, label, sub }) {
  return (
    <div className="adm-stat">
      <span className="adm-stat__icon" aria-hidden="true"><Icon size={18} /></span>
      <span className="adm-stat__value">{value}</span>
      <span className="adm-stat__label">{label}</span>
      {sub && <span className="adm-stat__sub">{sub}</span>}
    </div>
  );
}

export default function AdminOverview({ summary, go }) {
  const { t } = useI18n();
  const { loading, error, data, reload } = summary;
  const [watch, setWatch] = useState(null); // 'payout' | 'stale'

  if (loading && !data) {
    return (
      <div className="adm-stack" aria-busy="true">
        <section className="adm-card">
          <span className="fd-sk" style={{ width: 140, height: 20 }} />
          {[0, 1].map((i) => <span key={i} className="fd-sk" style={{ height: 64, borderRadius: 12 }} />)}
        </section>
        <div className="adm-stats">{[0, 1, 2, 3].map((i) => <span key={i} className="fd-sk" style={{ height: 112, borderRadius: 16 }} />)}</div>
      </div>
    );
  }
  if (error && !data) return <LoadError onRetry={reload} />;
  if (!data) return null;

  const ageText = (items, field) => {
    const d = oldestAgeDays(items, field);
    return d == null ? null : d === 0 ? t('adm.task.oldestToday') : t('adm.task.oldest', { n: d });
  };

  const tasks = [
    data.payout?.length > 0 && (
      <TaskRow key="pay" tone="danger" icon={QrCode} onClick={() => setWatch('payout')}
        title={t('adm.task.payout', { n: data.payout.length })} text={t('adm.task.payoutSub')} />
    ),
    data.staleIncidents.length > 0 && (
      <TaskRow key="inc" tone="danger" icon={AlertTriangle} onClick={() => go('records', 'incidents')}
        title={t('adm.task.incidents', { n: data.staleIncidents.length })} text={ageText(data.staleIncidents, 'created_at')} />
    ),
    data.foundations.length > 0 && (
      <TaskRow key="fnd" tone="primary" icon={Building2} onClick={() => go('foundations')}
        title={t('adm.task.foundations', { n: data.foundations.length })} text={ageText(data.foundations, 'submitted_at')} />
    ),
    data.staleMatches.length > 0 && (
      <TaskRow key="stale" icon={Clock} onClick={() => setWatch('stale')}
        title={t('adm.task.stale', { n: data.staleMatches.length })} text={ageText(data.staleMatches, 'created_at')} />
    ),
    data.reports.length > 0 && (
      <TaskRow key="rep" icon={Flag} onClick={() => go('inbox', 'reports')}
        title={t('adm.task.reports', { n: data.reports.length })} text={ageText(data.reports, 'created_at')} />
    ),
    data.supportUnread > 0 && (
      <TaskRow key="sup" icon={MessageSquare} onClick={() => go('inbox', 'support')}
        title={t('adm.task.support', { n: data.supportUnread })} text={t('adm.task.supportSub')} />
    ),
  ].filter(Boolean);

  const s = data.stats;
  return (
    <div className="adm-stack">
      <section className="adm-card" aria-labelledby="adm-tasks-title">
        <h2 id="adm-tasks-title" className="adm-card__title">{t('adm.tasks.title')}</h2>
        {tasks.length ? <div className="adm-tasks">{tasks}</div> : (
          <p className="adm-done"><CheckCircle2 size={20} aria-hidden="true" /> {t('adm.tasks.none')}</p>
        )}
        {data.incidents.length > data.staleIncidents.length && (
          <p className="adm-note">{t('adm.tasks.newIncidents', { n: data.incidents.length - data.staleIncidents.length })}</p>
        )}
      </section>

      <section aria-labelledby="adm-stats-title">
        <h2 id="adm-stats-title" className="adm-section-title">{t('adm.stats.title')}</h2>
        <div className="adm-stats">
          <Stat icon={Users} value={s.users} label={t('adm.stats.users')} sub={s.newUsers ? t('adm.stats.newUsers', { n: s.newUsers }) : null} />
          <Stat icon={Home} value={s.available} label={t('adm.stats.available')} />
          <Stat icon={UserPlus} value={s.pendingMatches} label={t('adm.stats.requests')} />
          <Stat icon={Heart} value={s.adopted} label={t('adm.stats.adopted')} />
        </div>
      </section>

      {watch === 'payout' && <PayoutChanges items={data.payout} onClose={() => setWatch(null)} onDone={reload} />}
      {watch === 'stale' && <StaleRequests items={data.staleMatches} onClose={() => setWatch(null)} />}
    </div>
  );
}
