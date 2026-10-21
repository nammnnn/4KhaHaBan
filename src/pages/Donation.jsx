import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Heart, Package, Copy, Check, X, ShieldCheck, Upload, CheckCircle2, Building2, ChevronDown, ChevronRight, AlertCircle, Lightbulb, ShoppingBag, Pill, Sparkles } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../services/supabaseClient';
import { api } from '../services/api';
import { DonationSkeleton } from '../components/Skeletons';
import { Badge, Button, Dialog, useToast } from '../components/ui';
import { useI18n } from '../i18n';
import { QRCodeSVG } from 'qrcode.react';
import generatePayload from 'promptpay-qr';
import './ServicePages.css';

// Donation — DESIGN.md §7.23

const TIERS = [100, 300, 500, 1000];
const CUSTOM = 'custom';
const NEEDS_PREVIEW = 3; // most urgent first; keeps the two cards about the same height
const NEED_ORDER = { critical: 0, high: 1, normal: 2, sufficient: 3 };
const NEED_TONE = { critical: 'danger', high: 'pending', normal: 'success', sufficient: 'neutral' };

// Thai addresses end with the province ("... จ.ขอนแก่น 40270"); show just that as the place
function placeOf(address = '') {
  const m = /(?:จ\.|จังหวัด)\s*([^\s\d()]+)/.exec(address) || /(กรุงเทพ(?:มหานคร|ฯ)?)/.exec(address);
  return m ? m[1] : '';
}

const hasRealPromptpay = (f) => !f?.demo && (f?.promptpay_number || f?.phone || '').replace(/\D/g, '').length >= 10;

function FoundationAvatar({ f }) {
  const initial = (f?.full_name || '').replace(/^มูลนิธิ\s*/, '').trim().charAt(0).toUpperCase();
  return <span className="sp-avatar" aria-hidden="true">{initial || <Building2 size={20} />}</span>;
}

function FoundationMeta({ f, t }) {
  const place = placeOf(f?.address);
  return (
    <span className="sp-picked__meta">
      {place && <span>{place}</span>}
      {hasRealPromptpay(f) && <span className="sp-picked__pp">{t('donate.acceptsPromptpay')}</span>}
    </span>
  );
}

function NeedsList({ items, t }) {
  return (
    <ul className="sp-needs">
      {items.map((item) => (
        <li key={item.id}>
          <span>
            <strong>{item.item_name}</strong>
            {item.note && <small>{item.note}</small>}
          </span>
          <Badge tone={NEED_TONE[item.urgency] || 'neutral'}>{t(`donate.need.${NEED_TONE[item.urgency] ? item.urgency : 'normal'}`)}</Badge>
        </li>
      ))}
    </ul>
  );
}

function Donation() {
  const { user } = useAuth();
  const { t } = useI18n();
  const toast = useToast();

  const [tier, setTier] = useState(300);
  const [customAmount, setCustomAmount] = useState('');
  const [mobileTab, setMobileTab] = useState('money'); // 'money' | 'items'
  const [copied, setCopied] = useState(null); // 'address' | 'promptpay'

  const [payOpen, setPayOpen] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [sheet, setSheet] = useState(null); // 'needs' | 'tips'
  const [slipFile, setSlipFile] = useState(null);
  const [slipPreview, setSlipPreview] = useState(null);
  const [isSubmittingPayment, setIsSubmittingPayment] = useState(false);
  const [paymentSuccess, setPaymentSuccess] = useState(false);

  const [foundations, setFoundations] = useState([]);
  const [selectedFoundationId, setSelectedFoundationId] = useState('');
  const [loadingFoundations, setLoadingFoundations] = useState(true);
  const [foundationNeeds, setFoundationNeeds] = useState([]);
  const [loadingNeeds, setLoadingNeeds] = useState(false);

  useEffect(() => {
    let isMounted = true;
    (async () => {
      setLoadingFoundations(true);
      try {
        const data = await api.getFoundations();
        if (!isMounted) return;
        setFoundations(data || []);
        if (data?.length) setSelectedFoundationId((prev) => (prev && data.some((f) => f.id === prev) ? prev : data[0].id));
      } catch (err) {
        console.warn('Error fetching foundations:', err);
      } finally {
        if (isMounted) setLoadingFoundations(false);
      }
    })();
    return () => { isMounted = false; };
  }, []);

  useEffect(() => {
    if (!selectedFoundationId) return;
    let channel = null;
    const fetchNeeds = async () => {
      setLoadingNeeds(true);
      try {
        setFoundationNeeds((await api.getFoundationNeeds(selectedFoundationId)) || []);
      } catch (err) {
        console.warn('Error fetching foundation needs:', err);
      } finally {
        setLoadingNeeds(false);
      }
    };
    fetchNeeds();
    if (supabase) {
      channel = supabase
        .channel(`realtime_donation_needs_${selectedFoundationId}`)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'foundation_needs' }, fetchNeeds)
        .subscribe();
    }
    return () => { if (channel && supabase) supabase.removeChannel(channel); };
  }, [selectedFoundationId]);

  const foundation = foundations.find((f) => f.id === selectedFoundationId) || null;
  // Only ever build a QR for a real number — never a placeholder account
  const hasPromptpay = hasRealPromptpay(foundation);
  const promptpay = hasPromptpay ? (foundation.promptpay_number || foundation.phone).replace(/\D/g, '') : '';
  const amount = tier === CUSTOM ? Math.floor(Number(customAmount) || 0) : tier;
  const canDonate = !!foundation && hasPromptpay && amount >= 1;

  const copy = async (text, key) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(key);
      setTimeout(() => setCopied(null), 2000);
    } catch {
      toast(t('donate.copyFailed'), { tone: 'error' });
    }
  };

  const addressText = foundation
    ? [foundation.full_name, foundation.address, foundation.phone && `${t('donate.items.tel')} ${foundation.phone}`].filter(Boolean).join('\n')
    : '';

  const openPayment = () => {
    setPaymentSuccess(false);
    setSlipFile(null);
    setSlipPreview(null);
    setPayOpen(true);
  };

  const handleSlipSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setSlipFile(file);
    setSlipPreview(URL.createObjectURL(file));
  };

  const handlePaymentConfirm = async () => {
    if (!slipFile) return;
    if (!user) {
      toast(t('donate.err.login'), { tone: 'error' });
      return;
    }
    setIsSubmittingPayment(true);
    try {
      const slipUrl = await api.uploadDonationSlip(slipFile);
      if (!slipUrl) throw new Error(t('donate.err.upload'));
      // Saved as pending_verification: staff check the slip before it counts
      if (supabase) {
        const { error: insertErr } = await supabase.from('donations').insert([{
          user_id: user.id,
          amount,
          billing_cycle: 'once',
          status: 'pending_verification',
          slip_url: slipUrl,
          foundation_id: selectedFoundationId || null,
        }]);
        if (insertErr) throw insertErr;
      }
      setPaymentSuccess(true);
    } catch (error) {
      console.error('Error saving donation:', error);
      toast(error.message || t('donate.err.save'), { tone: 'error' });
    } finally {
      setIsSubmittingPayment(false);
    }
  };

  if (loadingFoundations) return <DonationSkeleton />;

  const needs = [...foundationNeeds].sort((a, b) => (NEED_ORDER[a.urgency] ?? 2) - (NEED_ORDER[b.urgency] ?? 2));
  const baht = (n) => `฿${n.toLocaleString()}`;

  return (
    <div className="sp-page sp-page--wide">
      <motion.header className="sp-head" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }}>
        <h1 className="sp-head__title">{t('donate.title')}</h1>
        <p className="sp-head__sub">{t('donate.sub')}</p>
      </motion.header>

      {/* One foundation picker for both ways of giving */}
      {foundations.length === 0 ? (
        <section className="sp-card"><p className="sp-card__hint">{t('donate.noFoundations')}</p></section>
      ) : (
        <button
          type="button"
          className="sp-card sp-picked"
          onClick={() => foundations.length > 1 && setPickerOpen(true)}
          aria-haspopup={foundations.length > 1 ? 'dialog' : undefined}
          disabled={foundations.length < 2}
        >
          <FoundationAvatar f={foundation} />
          <span className="sp-picked__body">
            <small>{t('donate.to')}</small>
            <strong>{foundation?.full_name}</strong>
            <FoundationMeta f={foundation} t={t} />
          </span>
          {foundations.length > 1 && <span className="sp-picked__change">{t('donate.change')}<ChevronDown size={16} aria-hidden="true" /></span>}
        </button>
      )}

      <div className="sp-seg sp-seg--mobile" role="tablist">
        <button type="button" role="tab" aria-selected={mobileTab === 'money'} className={mobileTab === 'money' ? 'is-on' : ''} onClick={() => setMobileTab('money')}>
          <Heart size={16} aria-hidden="true" /> {t('donate.money')}
        </button>
        <button type="button" role="tab" aria-selected={mobileTab === 'items'} className={mobileTab === 'items' ? 'is-on' : ''} onClick={() => setMobileTab('items')}>
          <Package size={16} aria-hidden="true" /> {t('donate.items')}
        </button>
      </div>

      <div className="sp-two">
        {/* Money */}
        <section className={`sp-card ${mobileTab !== 'money' ? 'sp-hide-mobile' : ''}`}>
          <h2 className="sp-card__title"><Heart size={20} className="sp-card__icon" aria-hidden="true" />{t('donate.money')}</h2>
          <p className="sp-card__hint">{t('donate.money.desc')}</p>

          <fieldset className="sp-fieldset">
            <legend className="sp-label">{t('donate.amount')}</legend>
            <div className="sp-tiers">
              {TIERS.map((n) => (
                <label key={n} className={`sp-tier ${tier === n ? 'is-on' : ''}`}>
                  <input type="radio" name="tier" checked={tier === n} onChange={() => setTier(n)} />
                  <strong>{baht(n)}</strong>
                  <span>{t(`donate.tier.${n}`)}</span>
                </label>
              ))}
              <label className={`sp-tier sp-tier--custom ${tier === CUSTOM ? 'is-on' : ''}`}>
                <input type="radio" name="tier" checked={tier === CUSTOM} onChange={() => setTier(CUSTOM)} />
                <strong>{t('donate.custom')}</strong>
              </label>
            </div>
            {tier === CUSTOM && (
              <div className="sp-input-icon sp-amount">
                <span aria-hidden="true">฿</span>
                <input
                  type="number"
                  inputMode="numeric"
                  min="1"
                  step="1"
                  className="ui-input"
                  value={customAmount}
                  onChange={(e) => setCustomAmount(e.target.value)}
                  placeholder={t('donate.custom.ph')}
                  aria-label={t('donate.custom')}
                  autoFocus
                />
              </div>
            )}
          </fieldset>

          {tier !== CUSTOM && <p className="sp-impact">{t(`donate.tier.${tier}.impact`)}</p>}

          {/* Pinned to the bottom so both cards line up */}
          <div className="sp-card__foot">
            {foundation && !hasPromptpay ? (
              <p className="sp-warn"><AlertCircle size={16} aria-hidden="true" /> {t('donate.noPromptpay')}</p>
            ) : (
              <p className="sp-trust"><ShieldCheck size={16} aria-hidden="true" /> {t('donate.trust')}</p>
            )}
            <Button variant="primary" block onClick={openPayment} disabled={!canDonate}>
              {amount >= 1 ? t('donate.cta', { amount: baht(amount) }) : t('donate.cta.empty')}
            </Button>
          </div>
        </section>

        {/* Items */}
        <section className={`sp-card ${mobileTab !== 'items' ? 'sp-hide-mobile' : ''}`}>
          <h2 className="sp-card__title"><Package size={20} className="sp-card__icon" aria-hidden="true" />{t('donate.items')}</h2>
          <p className="sp-card__hint">{t('donate.items.desc')}</p>

          <h3 className="sp-label">{t('donate.items.needs')}</h3>
          {loadingNeeds ? (
            <div className="sp-list">
              {[1, 2, 3].map((i) => <div key={i} className="skeleton" style={{ height: 48, borderRadius: 12 }} />)}
            </div>
          ) : needs.length === 0 ? (
            <p className="sp-empty">{t('donate.items.none')}</p>
          ) : (
            <>
            <NeedsList items={needs.slice(0, NEEDS_PREVIEW)} t={t} />
            {needs.length > NEEDS_PREVIEW && (
              <button type="button" className="sp-more" onClick={() => setSheet('needs')} aria-haspopup="dialog">
                {t('donate.items.more', { count: needs.length })}
                <ChevronRight size={16} aria-hidden="true" />
              </button>
            )}
            </>
          )}

          {foundation && (
            <div className="sp-address">
              <div className="sp-address__head">
                <h3 className="sp-label">{t('donate.items.address')}</h3>
                <Button variant="ghost" size="sm" onClick={() => copy(addressText, 'address')}>
                  {copied === 'address' ? <Check size={16} aria-hidden="true" /> : <Copy size={16} aria-hidden="true" />}
                  {copied === 'address' ? t('donate.copied') : t('donate.copy')}
                </Button>
              </div>
              <address>
                <strong>{foundation.full_name}</strong>
                <span>{foundation.address || t('donate.items.noAddress')}</span>
                {foundation.phone && <span>{t('donate.items.tel')} {foundation.phone}</span>}
              </address>
            </div>
          )}

          {/* Opens in a sheet so the card never changes height */}
          <button type="button" className="sp-tips-link" onClick={() => setSheet('tips')} aria-haspopup="dialog">
            <Lightbulb size={18} aria-hidden="true" />
            <span>{t('donate.tips.title')}</span>
            <ChevronRight size={16} aria-hidden="true" />
          </button>
        </section>
      </div>

      {/* All needs */}
      <Dialog open={sheet === 'needs'} onClose={() => setSheet(null)} title={t('donate.items.needs')}>
        <NeedsList items={needs} t={t} />
      </Dialog>

      {/* Shipping tips */}
      <Dialog
        open={sheet === 'tips'}
        onClose={() => setSheet(null)}
        title={t('donate.tips.title')}
        actions={<Button variant="primary" block onClick={() => setSheet(null)}>{t('donate.tips.ok')}</Button>}
      >
        <ul className="sp-tip-list">
          {[ShoppingBag, Package, Sparkles, Pill].map((Icon, i) => (
            <li key={i}>
              <span className="sp-tip-list__icon" aria-hidden="true"><Icon size={18} /></span>
              <span>
                <strong>{t(`donate.tips.${i + 1}.title`)}</strong>
                <small>{t(`donate.tips.${i + 1}`)}</small>
              </span>
            </li>
          ))}
        </ul>
      </Dialog>

      {/* Foundation list */}
      <Dialog open={pickerOpen} onClose={() => setPickerOpen(false)} title={t('donate.pick')}>
        <ul className="sp-pick-list" role="listbox" aria-label={t('donate.pick')}>
          {foundations.map((f) => {
            const on = f.id === selectedFoundationId;
            return (
              <li key={f.id}>
                <button
                  type="button"
                  role="option"
                  aria-selected={on}
                  className={`sp-pick ${on ? 'is-on' : ''}`}
                  onClick={() => { setSelectedFoundationId(f.id); setPickerOpen(false); }}
                >
                  <FoundationAvatar f={f} />
                  <span className="sp-picked__body">
                    <strong>{f.full_name}</strong>
                    <FoundationMeta f={f} t={t} />
                  </span>
                  {on && <Check size={20} className="sp-pick__check" aria-hidden="true" />}
                </button>
              </li>
            );
          })}
        </ul>
      </Dialog>

      {/* PromptPay */}
      <Dialog
        open={payOpen}
        onClose={() => !isSubmittingPayment && setPayOpen(false)}
        title={paymentSuccess ? undefined : t('donate.pay.title', { amount: baht(amount) })}
        actions={paymentSuccess ? (
          <Button variant="primary" block onClick={() => setPayOpen(false)}>{t('common.close')}</Button>
        ) : (
          <>
            <Button variant="secondary" onClick={() => setPayOpen(false)} disabled={isSubmittingPayment}>{t('common.cancel')}</Button>
            <Button variant="primary" onClick={handlePaymentConfirm} disabled={!slipFile} loading={isSubmittingPayment}>
              {isSubmittingPayment ? t('donate.pay.sending') : t('donate.pay.confirm')}
            </Button>
          </>
        )}
      >
        {paymentSuccess ? (
          <div className="sp-done sp-done--flat">
            <span className="sp-done__icon" aria-hidden="true"><CheckCircle2 size={36} /></span>
            <h2>{t('donate.done.title')}</h2>
            <p>{t('donate.done.text', { amount: baht(amount) })}</p>
          </div>
        ) : (
          <div className="sp-pay">
            <p className="sp-card__hint">{foundation?.full_name}</p>
            <ol className="sp-pay__steps">
              <li>
                <strong>{t('donate.pay.step1')}</strong>
                {hasPromptpay && (
                  <div className="sp-qr">
                    <QRCodeSVG value={generatePayload(promptpay, { amount })} size={176} />
                    <button type="button" className="sp-qr__id" onClick={() => copy(promptpay, 'promptpay')}>
                      {t('donate.pay.promptpay')} <b>{foundation?.promptpay_number || foundation?.phone}</b>
                      {copied === 'promptpay' ? <Check size={14} aria-hidden="true" /> : <Copy size={14} aria-hidden="true" />}
                    </button>
                  </div>
                )}
              </li>
              <li>
                <strong>{t('donate.pay.step2')}</strong>
                {slipPreview ? (
                  <div className="sp-photo sp-photo--slip">
                    <img src={slipPreview} alt="" />
                    <button type="button" className="sp-photo__remove" onClick={() => { setSlipFile(null); setSlipPreview(null); }} aria-label={t('donate.pay.removeSlip')}>
                      <X size={16} />
                    </button>
                  </div>
                ) : (
                  <label className="sp-drop sp-drop--sm">
                    <Upload size={22} aria-hidden="true" />
                    <strong>{t('donate.pay.attach')}</strong>
                    <input type="file" accept="image/*" hidden onChange={handleSlipSelect} />
                  </label>
                )}
                <small className="sp-pay__note">{t('donate.pay.note')}</small>
              </li>
            </ol>
          </div>
        )}
      </Dialog>
    </div>
  );
}

export default Donation;
