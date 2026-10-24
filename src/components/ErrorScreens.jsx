import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Ban, Home, LogOut, MessageSquare, RotateCw } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { PetScene } from './motion/PetScene';
import { Button, EmptyState, LoadError } from './ui';
import { useI18n } from '../i18n';

const RELOAD_KEY = '4kh_chunk_reload';

// A lazy page failed to download, usually because a new version was deployed while the tab was open.
const isChunkError = (error) =>
  /dynamically imported module|Importing a module script failed|Loading chunk|ChunkLoadError/i.test(String(error?.message || error));

function CrashScreen() {
  const { t } = useI18n();
  return (
    <div className="err-screen" role="alert">
      <EmptyState
        art={<PetScene variant="crash" />}
        title={t('err.crash.title')}
        text={t('err.crash.text')}
        action={(
          <div className="err-screen__actions">
            <Button onClick={() => window.location.reload()}><RotateCw size={16} /> {t('err.crash.reload')}</Button>
            <Button variant="secondary" onClick={() => { window.location.href = '/'; }}><Home size={16} /> {t('err.home')}</Button>
          </div>
        )}
      />
    </div>
  );
}

class Boundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
    // Reload to pick up the new version's files, at most once a minute so a file that is
    // really missing can't cause a reload loop.
    if (isChunkError(error)) {
      try {
        const last = Number(sessionStorage.getItem(RELOAD_KEY) || 0);
        if (Date.now() - last > 60000) {
          sessionStorage.setItem(RELOAD_KEY, String(Date.now()));
          window.location.reload();
        }
      } catch { /* storage blocked: show the screen instead */ }
    }
  }

  componentDidUpdate(prev) {
    // Moving to another page clears the error, so the tab bar still works.
    if (this.state.hasError && prev.resetKey !== this.props.resetKey) this.setState({ hasError: false });
  }

  render() {
    return this.state.hasError ? <CrashScreen /> : this.props.children;
  }
}

export function ErrorBoundary({ children }) {
  const { pathname } = useLocation();
  return <Boundary resetKey={pathname}>{children}</Boundary>;
}

export function NotFound() {
  const { t } = useI18n();
  return (
    <div className="err-screen">
      <EmptyState
        art={<PetScene variant="search" />}
        title={t('err.nf.title')}
        text={t('err.nf.text')}
        action={<Link to="/" className="ui-btn ui-btn--primary"><Home size={16} /> {t('err.home')}</Link>}
      />
    </div>
  );
}

// Follow-up / timeline pages: the adoption couldn't be loaded, or doesn't exist.
export function AdoptionUnavailable({ state, onRetry }) {
  const { t } = useI18n();
  const { pathname } = useLocation();
  const chats = pathname.startsWith('/foundation') ? '/foundation/matches' : '/matches';
  return (
    <div className="err-screen">
      {state === 'error' ? (
        <LoadError onRetry={onRetry} />
      ) : (
        <EmptyState
          art={<PetScene variant="search" />}
          title={t('err.adoptionGone')}
          action={<Link to={chats} className="ui-btn ui-btn--primary">{t('err.toChats')}</Link>}
        />
      )}
    </div>
  );
}

// Shown instead of the app to a suspended account (profiles.is_banned). They can still reach
// support to appeal, or sign out.
export function SuspendedScreen() {
  const { t, lang } = useI18n();
  const { profile, logout } = useAuth();
  const since = profile?.banned_at
    ? new Date(profile.banned_at).toLocaleDateString(lang === 'en' ? 'en-GB' : 'th-TH', { day: 'numeric', month: 'long', year: 'numeric' })
    : null;
  return (
    <div className="err-screen" style={{ minHeight: '100dvh' }}>
      <div className="ui-empty">
        <div className="ui-empty__icon ui-load-error__icon" aria-hidden="true"><Ban size={36} /></div>
        <h1 className="ui-empty__title">{t('ban.title')}</h1>
        <p className="ui-empty__text">{t('ban.text')}</p>
        {(profile?.banned_reason || since) && (
          <p className="ui-empty__text">
            {profile?.banned_reason && <>{t('ban.reason', { reason: profile.banned_reason })}<br /></>}
            {since && t('ban.since', { date: since })}
          </p>
        )}
        <div className="ui-empty__action err-screen__actions">
          <Link to="/support-chat" className="ui-btn ui-btn--primary"><MessageSquare size={16} /> {t('ban.contact')}</Link>
          <Button variant="secondary" onClick={logout}><LogOut size={16} /> {t('ban.logout')}</Button>
        </div>
      </div>
    </div>
  );
}
