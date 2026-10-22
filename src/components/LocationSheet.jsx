// Location picker sheet — DESIGN.md §7.15
import { useEffect, useState } from 'react';
import { Crosshair, Search, MapPin, Info } from 'lucide-react';
import { Dialog, Button } from './ui';
import { searchCoordinatesFromAddress, detectInAppBrowser, detectPlatform } from '../lib/geo';
import './LocationSheet.css';
import { useI18n } from '../i18n';


// "เมืองขอนแก่น, จังหวัดขอนแก่น, 40000, ประเทศไทย" -> "เมืองขอนแก่น, จังหวัดขอนแก่น"
const shortPlaceName = (displayName = '') =>
  displayName.split(',').map((s) => s.trim()).filter((s) => s && !/^\d+$/.test(s) && s !== 'ประเทศไทย').slice(0, 2).join(', ');

export function LocationSheet({ open, onClose, status, label, isLocating, onUseGps, onPickPlace }) {
  const { t } = useI18n();
  const [query, setQuery] = useState('');
  const [searching, setSearching] = useState(false);
  const [result, setResult] = useState(null);
  const [searchError, setSearchError] = useState('');
  const inApp = detectInAppBrowser();
  const platform = detectPlatform();

  useEffect(() => {
    if (!open) {
      setResult(null);
      setSearchError('');
    }
  }, [open]);

  const handleSearch = async (e) => {
    e.preventDefault();
    const q = query.trim();
    if (!q) return;
    setSearching(true);
    setSearchError('');
    setResult(null);
    try {
      const found = await searchCoordinatesFromAddress(q);
      if (found) setResult({ ...found, name: shortPlaceName(found.displayName) || q });
      else setSearchError(t('loc.notFound'));
    } catch (err) {
      setSearchError(t('loc.searchFailed'));
    } finally {
      setSearching(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} title={t('loc.title')}>
      <p className="loc-sheet__intro">
        {t('loc.intro')}
      </p>

      {status === 'ready' && label && (
        <div className="loc-sheet__current">
          <MapPin size={18} aria-hidden="true" />
          <span>{t('loc.currentlyUsing')} <strong>{label}</strong></span>
        </div>
      )}

      {inApp ? (
        <div className="loc-sheet__notice" role="note">
          <Info size={18} aria-hidden="true" />
          <span>{t('loc.inApp', { app: inApp })}</span>
        </div>
      ) : status === 'denied' ? (
        <div className="loc-sheet__notice" role="note">
          <Info size={18} aria-hidden="true" />
          <span>{t('loc.denied', { steps: t(`loc.steps.${platform}`) })}</span>
        </div>
      ) : null}

      <Button variant="secondary" block loading={isLocating} onClick={onUseGps} disabled={status === 'denied' && !inApp}>
        {!isLocating && <Crosshair size={18} aria-hidden="true" />}
        {isLocating ? t('loc.locating') : t('loc.useCurrent')}
      </Button>

      <div className="loc-sheet__divider"><span>{t('loc.orPick')}</span></div>

      <form className="loc-sheet__search" onSubmit={handleSearch} role="search">
        <label htmlFor="loc-search" className="sr-only">{t('loc.searchLabel')}</label>
        <input
          id="loc-search"
          className="ui-input"
          type="search"
          inputMode="search"
          enterKeyHint="search"
          placeholder={t('loc.searchPlaceholder')}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          autoComplete="off"
        />
        <Button type="submit" variant="primary" loading={searching} aria-label={t('loc.searchLabel')} className="loc-sheet__search-btn">
          {!searching && <Search size={18} aria-hidden="true" />}
        </Button>
      </form>

      {searchError && <p className="loc-sheet__error" role="alert">{searchError}</p>}

      {result && (
        <button
          className="loc-sheet__result"
          onClick={() => onPickPlace({ latitude: result.latitude, longitude: result.longitude, name: result.name })}
        >
          <MapPin size={20} aria-hidden="true" />
          <span className="loc-sheet__result-text">
            <strong>{result.name}</strong>
            <small>{t('loc.tapToUse')}</small>
          </span>
        </button>
      )}
    </Dialog>
  );
}
