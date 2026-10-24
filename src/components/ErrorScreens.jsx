import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { AlertTriangle, Compass, Home, PawPrint, RotateCw } from 'lucide-react';
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
        icon={AlertTriangle}
        tone="danger"
        motion="shake"
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
        icon={Compass}
        motion="search"
        title={t('err.nf.title')}
        text={t('err.nf.text')}
        action={<Link to="/" className="ui-btn ui-btn--primary"><Home size={16} /> {t('err.home')}</Link>}
      >
        <span className="err-trail" aria-hidden="true">
          {[0, 1, 2, 3].map((i) => <span key={i}><PawPrint size={14} /></span>)}
        </span>
      </EmptyState>
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
          icon={PawPrint}
          motion="sniff"
          title={t('err.adoptionGone')}
          action={<Link to={chats} className="ui-btn ui-btn--primary">{t('err.toChats')}</Link>}
        />
      )}
    </div>
  );
}
