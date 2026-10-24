// Admin console (/admin). Four sections plus records; the section lives in the address (?s=…)
// so refresh and back work. Sections not rebuilt yet embed the old screens (AdminLegacy).
import { Suspense, lazy } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Building2, ClipboardList, LayoutDashboard, MessageSquare, RotateCcw, Users } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useI18n } from '../../i18n';
import AdminOverview from './AdminOverview';
import AdminUsers from './AdminUsers';
import AdminFoundations from './AdminFoundations';
import { useAdminSummary } from './useAdminSummary';
import AdminInbox from './AdminInbox';
import '../FoundationNeeds.css';
import './Admin.css';

const AdminLegacy = lazy(() => import('./AdminLegacy'));

const SECTIONS = [
  { id: 'overview', icon: LayoutDashboard },
  { id: 'foundations', icon: Building2 },
  { id: 'inbox', icon: MessageSquare },
  { id: 'users', icon: Users },
  { id: 'records', icon: ClipboardList },
];

// Which old tabs each not-yet-rebuilt section shows
const LEGACY_TABS = {
  records: ['incidents', 'donations', 'logs'],
};

export default function AdminConsole() {
  const { profile, user } = useAuth();
  const { t } = useI18n();
  const [params, setParams] = useSearchParams();
  const summary = useAdminSummary();
  const section = SECTIONS.some((s) => s.id === params.get('s')) ? params.get('s') : 'overview';
  const tab = params.get('tab');

  const go = (s, subTab) => {
    setParams(subTab ? { s, tab: subTab } : { s });
    window.scrollTo({ top: 0 });
  };

  const d = summary.data;
  const badges = d ? {
    overview: 0,
    foundations: d.foundations.length,
    inbox: d.reports.length + d.supportUnread,
    users: 0,
    records: d.staleIncidents.length,
  } : {};
  const name = profile?.full_name || user?.email?.split('@')[0] || '';

  const legacyTabs = LEGACY_TABS[section];
  const initialTab = legacyTabs ? (legacyTabs.includes(tab) ? tab : legacyTabs[0]) : null;

  return (
    <div className="adm-page">
      <header className="adm-header">
        <div className="adm-header__text">
          <h1 className="adm-header__title">{t(`adm.section.${section}`)}</h1>
          <p className="adm-header__sub">{section === 'overview' ? t('adm.hello', { name }) : t(`adm.sectionSub.${section}`)}</p>
        </div>
        {section === 'overview' && (
          <button type="button" className="adm-refresh" onClick={summary.reload} aria-label={t('adm.refresh')}>
            <RotateCcw size={18} className={summary.loading ? 'spin' : ''} aria-hidden="true" />
          </button>
        )}
      </header>

      <nav className="adm-nav" aria-label={t('adm.nav')}>
        {SECTIONS.map(({ id, icon: Icon }) => (
          <button key={id} type="button" className={`adm-nav__item ${section === id ? 'is-on' : ''}`}
            aria-current={section === id ? 'page' : undefined} onClick={() => go(id)}>
            <Icon size={18} aria-hidden="true" />
            <span>{t(`adm.section.${id}`)}</span>
            {badges[id] > 0 && <span className="adm-nav__badge">{badges[id]}</span>}
          </button>
        ))}
      </nav>

      {section === 'overview' && <AdminOverview summary={summary} go={go} />}
      {section === 'foundations' && <AdminFoundations onChanged={summary.reload} />}
      {section === 'inbox' && <AdminInbox tab={tab} setTab={(x) => setParams({ s: 'inbox', tab: x }, { replace: true })} onChanged={summary.reload} />}
      {section === 'users' && <AdminUsers />}
      {legacyTabs && (
        <Suspense fallback={<span className="fd-sk" style={{ display: 'block', height: 240, borderRadius: 16 }} />}>
          <AdminLegacy key={`${section}-${initialTab}`} embedded tabs={legacyTabs} initialTab={initialTab} />
        </Suspense>
      )}
    </div>
  );
}
