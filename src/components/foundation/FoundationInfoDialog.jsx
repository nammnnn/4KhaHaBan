// One small window per piece of foundation info that people see: PromptPay, location (map pin +
// shipping address) or contact phone. Opened from the foundation home and the needs page, so a
// "Set up" tap finishes that one thing without leaving the page. The full edit window in the
// profile page stays for editing everything at once.
import { useEffect, useState } from 'react';
import { AlertCircle, Check, LocateFixed, Search } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import generatePayload from 'promptpay-qr';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../services/supabaseClient';
import { requestUserLocation, searchCoordinatesFromAddress, getAddressFromCoordinates } from '../../lib/geo';
import { formatThaiPhone, isThaiPhone } from '../../lib/phone';
import InteractiveLocationPicker from '../InteractiveLocationPicker';
import { Button, Dialog, useToast } from '../ui';
import { useI18n } from '../../i18n';
import './FoundationInfoDialog.css';

const digits = (v) => String(v || '').replace(/\D/g, '');
// PromptPay accepts a mobile number (10 digits, 0…) or a citizen / tax ID (13 digits)
const isPromptPay = (v) => /^0\d{9}$/.test(digits(v)) || /^\d{13}$/.test(digits(v));
const hasCoords = (lat, lng) => lat != null && lng != null && lat !== '' && lng !== '' && !Number.isNaN(Number(lat)) && !Number.isNaN(Number(lng));

function FieldError({ id, children }) {
  return children ? <span id={id} className="fi-error" role="alert"><AlertCircle size={14} aria-hidden="true" /> {children}</span> : null;
}

/**
 * @param {'promptpay'|'location'|'phone'|null} kind which window is open
 * @param {object} info current foundation_profiles row (promptpay_number, contact_phone, address, latitude, longitude)
 * @param {(patch: object) => void} onSaved called with the saved columns
 */
export default function FoundationInfoDialog({ kind, info, onClose, onSaved }) {
  const { user } = useAuth();
  const { t } = useI18n();
  const toast = useToast();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  // Field values; reset each time a window opens
  const [promptpay, setPromptpay] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [lat, setLat] = useState(null);
  const [lng, setLng] = useState(null);
  const [query, setQuery] = useState('');
  const [busy, setBusy] = useState(''); // '' | 'gps' | 'search'
  const [locNote, setLocNote] = useState('');
  const [pinAddress, setPinAddress] = useState(''); // address found for the pin, offered to the user

  useEffect(() => {
    if (!kind) return;
    setError(''); setLocNote(''); setPinAddress(''); setQuery(''); setBusy('');
    setPromptpay(info?.promptpay_number || '');
    setPhone(formatThaiPhone(info?.contact_phone || ''));
    setAddress(info?.address || '');
    setLat(hasCoords(info?.latitude, info?.longitude) ? Number(info.latitude) : null);
    setLng(hasCoords(info?.latitude, info?.longitude) ? Number(info.longitude) : null);
  }, [kind]); // eslint-disable-line react-hooks/exhaustive-deps

  // New pin: fill an empty address from it, otherwise offer it (never overwrite what they typed)
  const placePin = async (la, lo, note) => {
    setLat(Number(la)); setLng(Number(lo)); setError(''); setLocNote(note || t('fi.loc.pinned'));
    try {
      const rev = await getAddressFromCoordinates(la, lo);
      const found = rev?.formattedAddress;
      if (!found) return;
      setAddress((cur) => {
        if (!cur.trim()) return found;
        if (cur.trim() !== found) setPinAddress(found);
        return cur;
      });
    } catch { /* address lookup is optional */ }
  };

  const useMyLocation = async () => {
    setBusy('gps'); setError('');
    try {
      const pos = await requestUserLocation(10000);
      await placePin(pos.latitude, pos.longitude, t('fi.loc.fromGps'));
    } catch {
      setError(t('fi.loc.gpsFail'));
    } finally {
      setBusy('');
    }
  };

  const search = async (e) => {
    e?.preventDefault();
    if (!query.trim()) return;
    setBusy('search'); setError('');
    try {
      const r = await searchCoordinatesFromAddress(query);
      if (r) await placePin(r.latitude, r.longitude, t('fi.loc.found', { place: (r.displayName || query).split(',')[0] }));
      else setError(t('fi.loc.notFound'));
    } catch {
      setError(t('fi.loc.notFound'));
    } finally {
      setBusy('');
    }
  };

  const save = async () => {
    let patch;
    if (kind === 'promptpay') {
      const d = digits(promptpay);
      if (d && !isPromptPay(d)) { setError(t('fi.pp.invalid')); return; }
      patch = { promptpay_number: d };
    } else if (kind === 'phone') {
      const d = digits(phone);
      if (d && !isThaiPhone(d)) { setError(t('fi.phone.invalid')); return; }
      patch = { contact_phone: d };
    } else {
      if (!hasCoords(lat, lng)) { setError(t('fi.loc.needPin')); return; }
      patch = { latitude: Number(Number(lat).toFixed(6)), longitude: Number(Number(lng).toFixed(6)), address: address.trim() };
    }
    if (!supabase || !user) return;
    setSaving(true);
    try {
      const { error: err } = await supabase.from('foundation_profiles').update(patch).eq('id', user.id);
      if (err) throw err;
      // Animals without their own location use the centre's pin (same as the profile page)
      if (kind === 'location') {
        await supabase.from('animals').update({ latitude: patch.latitude, longitude: patch.longitude })
          .eq('foundation_id', user.id).is('latitude', null);
      }
      onSaved?.(patch);
      toast(t('fi.saved'), { tone: 'success' });
      onClose();
    } catch (err) {
      console.error('[FoundationInfoDialog] save failed', err);
      setError(t('fi.saveFail'));
    } finally {
      setSaving(false);
    }
  };

  const titles = { promptpay: t('fi.pp.title'), location: t('fi.loc.title'), phone: t('fi.phone.title') };
  const ppDigits = digits(promptpay);
  const ppReady = isPromptPay(ppDigits);
  let qr = null;
  if (ppReady) { try { qr = generatePayload(ppDigits, {}); } catch { qr = null; } }

  return (
    <Dialog
      open={Boolean(kind)}
      onClose={() => !saving && onClose()}
      title={kind ? titles[kind] : ''}
      className="fi-dialog"
      actions={(
        <>
          <Button variant="secondary" onClick={onClose} disabled={saving}>{t('common.cancel')}</Button>
          <Button onClick={save} loading={saving}>{t('common.save')}</Button>
        </>
      )}
    >
      {kind === 'promptpay' && (
        <form className="fi-form" onSubmit={(e) => { e.preventDefault(); save(); }} noValidate>
          <p className="fi-lead">{t('fi.pp.lead')}</p>
          <div className="fi-field">
            <label className="fi-label" htmlFor="fi-pp">{t('fi.pp.label')}</label>
            <input id="fi-pp" className={`fi-input ${error ? 'is-invalid' : ''}`} inputMode="numeric" autoComplete="off" autoFocus
              value={promptpay} onChange={(e) => { setPromptpay(e.target.value.replace(/[^\d-\s]/g, '')); setError(''); }}
              placeholder={t('fi.pp.ph')} aria-invalid={error ? true : undefined} aria-describedby="fi-pp-hint fi-pp-err" />
            <span id="fi-pp-hint" className="fi-hint">{t('fi.pp.hint')}</span>
            <FieldError id="fi-pp-err">{error}</FieldError>
          </div>
          <div className={`fi-preview ${qr ? 'is-ready' : ''}`} aria-live="polite">
            {qr ? (
              <>
                <QRCodeSVG value={qr} size={132} />
                <span className="fi-preview__text"><Check size={14} aria-hidden="true" /> {t('fi.pp.preview')}</span>
              </>
            ) : (
              <span className="fi-preview__text">{ppDigits ? t('fi.pp.keepTyping') : t('fi.pp.previewEmpty')}</span>
            )}
          </div>
        </form>
      )}

      {kind === 'phone' && (
        <form className="fi-form" onSubmit={(e) => { e.preventDefault(); save(); }} noValidate>
          <p className="fi-lead">{t('fi.phone.lead')}</p>
          <div className="fi-field">
            <label className="fi-label" htmlFor="fi-phone">{t('fi.phone.label')}</label>
            <input id="fi-phone" className={`fi-input ${error ? 'is-invalid' : ''}`} type="tel" inputMode="tel" autoComplete="tel" autoFocus
              value={phone} onChange={(e) => { setPhone(formatThaiPhone(e.target.value)); setError(''); }}
              placeholder="081-234-5678" aria-invalid={error ? true : undefined} aria-describedby="fi-phone-err" />
            <FieldError id="fi-phone-err">{error}</FieldError>
          </div>
        </form>
      )}

      {kind === 'location' && (
        <div className="fi-form">
          <p className="fi-lead">{t('fi.loc.lead')}</p>
          <Button variant="secondary" block onClick={useMyLocation} loading={busy === 'gps'} disabled={Boolean(busy)}>
            {busy !== 'gps' && <LocateFixed size={18} aria-hidden="true" />} {t('fi.loc.useGps')}
          </Button>
          <form className="fi-search" onSubmit={search}>
            <input className="fi-input" value={query} onChange={(e) => setQuery(e.target.value)} placeholder={t('fi.loc.searchPh')} aria-label={t('fi.loc.searchPh')} />
            <Button type="submit" variant="secondary" loading={busy === 'search'} disabled={Boolean(busy) || !query.trim()} aria-label={t('fi.loc.search')}>
              {busy !== 'search' && <Search size={18} aria-hidden="true" />}
            </Button>
          </form>
          <div className="fi-map">
            <InteractiveLocationPicker latitude={lat ?? ''} longitude={lng ?? ''} height={220} zoom={hasCoords(lat, lng) ? 17 : 12}
              onChange={(la, lo) => placePin(la, lo)} />
          </div>
          <p className={`fi-hint ${hasCoords(lat, lng) ? 'fi-hint--ok' : ''}`} aria-live="polite">
            {hasCoords(lat, lng) ? <><Check size={14} aria-hidden="true" /> {locNote || t('fi.loc.pinned')}</> : t('fi.loc.tapMap')}
          </p>
          <div className="fi-field">
            <label className="fi-label" htmlFor="fi-address">{t('fi.loc.address')}</label>
            <textarea id="fi-address" className="fi-input fi-textarea" rows={3} value={address}
              onChange={(e) => { setAddress(e.target.value); setPinAddress(''); }} placeholder={t('fi.loc.addressPh')} aria-describedby="fi-address-hint" />
            <span id="fi-address-hint" className="fi-hint">{t('fi.loc.addressHint')}</span>
            {pinAddress && (
              <button type="button" className="fi-suggest" onClick={() => { setAddress(pinAddress); setPinAddress(''); }}>
                {t('fi.loc.usePinAddress', { address: pinAddress })}
              </button>
            )}
          </div>
          <FieldError id="fi-loc-err">{error}</FieldError>
        </div>
      )}
    </Dialog>
  );
}
