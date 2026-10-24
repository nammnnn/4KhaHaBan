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
      <div className="ui-empty">
        <div className="ui-empty__icon ui-load-error__icon" aria-hidden="true"><AlertTriangle size={36} /></div>
        <h2 className="ui-empty__title">{t('err.crash.title')}</h2>
        <p className="ui-empty__text">{t('err.crash.text')}</p>
        <div className="ui-empty__action err-screen__actions">
          <Button onClick={() => window.location.reload()}><RotateCw size={16} /> {t('err.crash.reload')}</Button>
          <Button variant="secondary" onClick={() => { window.location.href = '/'; }}><Home size={16} /> {t('err.home')}</Button>
        </div>
      </div>
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
    // Reload once to pick up the new version's files; the flag stops a reload loop.
    if (isChunkError(error)) {
      try {
        if (!sessionStorage.getItem(RELOAD_KEY)) {
          sessionStorage.setItem(RELOAD_KEY, '1');
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
  React.useEffect(() => {
    // A page rendered fine, so a later chunk error may reload again.
    try { sessionStorage.removeItem(RELOAD_KEY); } catch { /* ignore */ }
  }, [pathname]);
  return <Boundary resetKey={pathname}>{children}</Boundary>;
}

export function NotFound() {
  const { t } = useI18n();
  return (
    <div className="err-screen">
      <div className="ui-empty">
        <div className="ui-empty__icon" aria-hidden="true"><Compass size={36} /></div>
        <h1 className="ui-empty__title">{t('err.nf.title')}</h1>
        <p className="ui-empty__text">{t('err.nf.text')}</p>
        <div className="ui-empty__action">
          <Link to="/" className="ui-btn ui-btn--primary"><Home size={16} /> {t('err.home')}</Link>
        </div>
      </div>
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
          title={t('err.adoptionGone')}
          action={<Link to={chats} className="ui-btn ui-btn--primary">{t('err.toChats')}</Link>}
        />
      )}
    </div>
  );
}
