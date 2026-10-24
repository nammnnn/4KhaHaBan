// Admin → foundation requests. Each request is one card with everything needed to decide:
// contact details, documents, a short checklist, then approve or decline with a reason.
import { useEffect, useState } from 'react';
import { AlertCircle, Building2, Check, CheckCircle2, ExternalLink, FileText, MapPin, Phone, XCircle } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../services/supabaseClient';
import { Button, Dialog, EmptyState, LoadError, useToast } from '../../components/ui';
import { formatThaiPhone } from '../../lib/phone';
import { useI18n } from '../../i18n';
import { foundationDocuments, logAction } from './adminApi';

const TABS = ['pending', 'approved', 'rejected'];
const CHECKS = ['docs', 'name', 'contact'];
const DECLINE_REASONS = ['docs', 'mismatch', 'contact', 'notShelter'];
const DAY = 24 * 60 * 60 * 1000;

function daysAgo(iso) {
  if (!iso) return null;
  return Math.max(0, Math.floor((Date.now() - new Date(iso)) / DAY));
}
function formatDate(iso, lang) {
  if (!iso) return '-';
  try { return new Date(iso).toLocaleDateString(lang === 'en' ? 'en-GB' : 'th-TH', { day: 'numeric', month: 'short', year: 'numeric' }); } catch { return '-'; }
}

function RequestCard({ f, onDecided }) {
  const { user: me } = useAuth();
  const { t } = useI18n();
  const toast = useToast();
  const [docs, setDocs] = useState(null); // null = not loaded, [] = none
  const [docsBusy, setDocsBusy] = useState(false);
  const [checked, setChecked] = useState({});
  const [busy, setBusy] = useState(false);
  const [declining, setDeclining] = useState(false);
  const [reasonId, setReasonId] = useState('');
  const [reasonText, setReasonText] = useState('');
  const [reasonError, setReasonError] = useState(false);

  const loadDocs = async () => {
    setDocsBusy(true);
    try { setDocs(await foundationDocuments(f.id)); } catch (err) { console.error(err); toast(t('adm.fnd.docsFail'), { tone: 'error' }); } finally { setDocsBusy(false); }
  };
  useEffect(() => { loadDocs(); }, [f.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const allChecked = CHECKS.every((c) => checked[c]);
  const age = daysAgo(f.submitted_at);

  const approve = async () => {
    setBusy(true);
    try {
      const now = new Date().toISOString();
      const { error } = await supabase.from('foundation_profiles').update({ verification_status: 'approved', reviewed_at: now, reviewed_by: me.id }).eq('id', f.id);
      if (error) throw error;
      await supabase.from('profiles').update({ role: 'foundation' }).eq('id', f.id);
      await logAction(me.id, 'APPROVE_FOUNDATION', f.id, { name: f.foundation_name });
      toast(t('adm.fnd.approved', { name: f.foundation_name || '' }), { tone: 'success' });
      onDecided(f.id, { verification_status: 'approved', reviewed_at: now });
    } catch (err) {
      console.error('[Admin] approve failed', err);
      toast(t('adm.fnd.fail'), { tone: 'error' });
    } finally {
      setBusy(false);
    }
  };

  const decline = async () => {
    const preset = reasonId ? t(`adm.fnd.reason.${reasonId}`) : '';
    const reason = [preset, reasonText.trim()].filter(Boolean).join(' — ');
    if (!reason) { setReasonError(true); return; }
    setBusy(true);
    try {
      const now = new Date().toISOString();
      const { error } = await supabase.from('foundation_profiles').update({ verification_status: 'rejected', rejection_reason: reason, reviewed_at: now, reviewed_by: me.id }).eq('id', f.id);
      if (error) throw error;
      await logAction(me.id, 'REJECT_FOUNDATION', f.id, { name: f.foundation_name, reason });
      toast(t('adm.fnd.declined', { name: f.foundation_name || '' }), { tone: 'success' });
      setDeclining(false);
      onDecided(f.id, { verification_status: 'rejected', rejection_reason: reason, reviewed_at: now });
    } catch (err) {
      console.error('[Admin] decline failed', err);
      toast(t('adm.fnd.fail'), { tone: 'error' });
    } finally {
      setBusy(false);
    }
  };

  const phone = f.contact_phone || f.profile?.phone;
  return (
    <article className="adm-card adm-req">
      <header className="adm-req__head">
        <span className="adm-req__icon" aria-hidden="true"><Building2 size={22} /></span>
        <div className="adm-req__title">
          <h2>{f.foundation_name || t('adm.user.noName')}</h2>
          <span className={age >= 3 ? 'is-late' : ''}>{age == null ? '' : age === 0 ? t('adm.fnd.today') : t('adm.fnd.waiting', { n: age })}</span>
        </div>
      </header>

      <dl className="adm-facts">
        <div className="adm-fact"><dt>{t('adm.fnd.contact')}</dt><dd>{f.contact_person || f.profile?.full_name || '-'}</dd></div>
        <div className="adm-fact"><dt>{t('adm.user.phone')}</dt><dd>{phone ? <a href={`tel:${phone.replace(/\D/g, '')}`} className="adm-link"><Phone size={14} aria-hidden="true" /> {formatThaiPhone(phone)}</a> : '-'}</dd></div>
        <div className="adm-fact"><dt>{t('adm.fnd.email')}</dt><dd>{f.profile?.email || '-'}</dd></div>
        <div className="adm-fact"><dt>{t('adm.fnd.regNo')}</dt><dd>{f.registration_no || '-'}</dd></div>
        <div className="adm-fact adm-fact--wide"><dt>{t('adm.fnd.address')}</dt><dd>{f.address ? <><MapPin size={14} aria-hidden="true" /> {f.address}</> : '-'}</dd></div>
        {f.description && <div className="adm-fact adm-fact--wide"><dt>{t('adm.fnd.about')}</dt><dd className="adm-fact__long">{f.description}</dd></div>}
      </dl>

      <section className="adm-req__docs">
        <h3 className="adm-block__title">{t('adm.fnd.docs')}</h3>
        {docs === null ? (
          <span className="adm-note">{docsBusy ? t('adm.fnd.docsLoading') : ''}</span>
        ) : docs.length === 0 ? (
          <p className="adm-block__note adm-block__note--danger"><AlertCircle size={16} aria-hidden="true" /> {t('adm.fnd.noDocs')}</p>
        ) : (
          <div className="fn-chips">
            {docs.map((d) => (
              <a key={d.type + d.url} href={d.url} target="_blank" rel="noopener noreferrer" className="fn-chip">
                <FileText size={14} aria-hidden="true" /> {t(`adm.fnd.doc.${['registration_cert', 'id_card', 'address_proof'].includes(d.type) ? d.type : 'other'}`)} <ExternalLink size={12} aria-hidden="true" />
              </a>
            ))}
          </div>
        )}
      </section>

      <section className="adm-req__checks">
        <h3 className="adm-block__title">{t('adm.fnd.checkTitle')}</h3>
        {CHECKS.map((c) => (
          <label key={c} className={`adm-check ${checked[c] ? 'is-on' : ''}`}>
            <input type="checkbox" checked={Boolean(checked[c])} onChange={(e) => setChecked((x) => ({ ...x, [c]: e.target.checked }))} />
            <span className="adm-check__box" aria-hidden="true"><Check size={14} /></span>
            {t(`adm.fnd.check.${c}`)}
          </label>
        ))}
      </section>

      <div className="adm-req__actions">
        <Button variant="secondary" onClick={() => { setDeclining(true); setReasonError(false); }} disabled={busy}><XCircle size={16} aria-hidden="true" /> {t('adm.fnd.decline')}</Button>
        <Button onClick={approve} loading={busy && !declining} disabled={!allChecked || busy}><CheckCircle2 size={16} aria-hidden="true" /> {t('adm.fnd.approve')}</Button>
      </div>
      {!allChecked && <p className="adm-note adm-req__hint">{t('adm.fnd.checkHint')}</p>}

      <Dialog open={declining} onClose={() => !busy && setDeclining(false)} title={t('adm.fnd.declineTitle', { name: f.foundation_name || '' })}
        actions={(
          <>
            <Button variant="secondary" onClick={() => setDeclining(false)} disabled={busy}>{t('common.cancel')}</Button>
            <Button variant="danger" onClick={decline} loading={busy}>{t('adm.fnd.decline')}</Button>
          </>
        )}>
        <div className="fn-form">
          <p className="adm-block__note">{t('adm.fnd.declineNote')}</p>
          <div className="fn-chips" role="radiogroup" aria-label={t('adm.user.banReason')}>
            {DECLINE_REASONS.map((r) => (
              <button key={r} type="button" role="radio" aria-checked={reasonId === r} className={`fn-chip fn-chip--select ${reasonId === r ? 'is-on' : ''}`}
                onClick={() => { setReasonId(reasonId === r ? '' : r); setReasonError(false); }}>
                {t(`adm.fnd.reason.${r}`)}
              </button>
            ))}
          </div>
          <label className="fn-label" htmlFor={`adm-decline-${f.id}`}>{t('adm.fnd.declineMore')}</label>
          <textarea id={`adm-decline-${f.id}`} className={`fn-input adm-textarea ${reasonError ? 'is-invalid' : ''}`} rows={2} value={reasonText}
            onChange={(e) => { setReasonText(e.target.value); setReasonError(false); }} placeholder={t('adm.fnd.declinePh')} />
          {reasonError && <span className="fn-error" role="alert"><AlertCircle size={14} aria-hidden="true" /> {t('adm.fnd.declineErr')}</span>}
        </div>
      </Dialog>
    </article>
  );
}

export default function AdminFoundations({ onChanged }) {
  const { t, lang } = useI18n();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [tab, setTab] = useState('pending');

  const load = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.from('foundation_profiles').select('*').order('submitted_at', { ascending: true });
      if (error) throw error;
      const ids = (data || []).map((f) => f.id);
      const { data: people } = ids.length
        ? await supabase.from('profiles').select('id, email, phone, full_name').in('id', ids)
        : { data: [] };
      setRows((data || []).map((f) => ({ ...f, profile: (people || []).find((p) => p.id === f.id) || null })));
      setLoadError(false);
    } catch (err) {
      console.error('[Admin] foundations failed', err);
      setLoadError(true);
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => { load(); }, []);

  if (loading) {
    return <div className="adm-stack" aria-busy="true"><span className="fd-sk" style={{ height: 44, width: 280, borderRadius: 999 }} /><span className="fd-sk" style={{ height: 360, borderRadius: 16 }} /></div>;
  }
  if (loadError) return <LoadError onRetry={load} />;

  const statusOf = (f) => (TABS.includes(f.verification_status) ? f.verification_status : 'pending');
  const counts = Object.fromEntries(TABS.map((x) => [x, rows.filter((f) => statusOf(f) === x).length]));
  const list = rows.filter((f) => statusOf(f) === tab);
  if (tab !== 'pending') list.sort((a, b) => new Date(b.reviewed_at || 0) - new Date(a.reviewed_at || 0));

  const decided = (id, patch) => {
    setRows((rs) => rs.map((f) => (f.id === id ? { ...f, ...patch } : f)));
    onChanged?.();
  };

  return (
    <div className="adm-stack">
      <div className="fn-filters" role="tablist" aria-label={t('adm.section.foundations')}>
        {TABS.map((x) => (
          <button key={x} type="button" role="tab" aria-selected={tab === x} className={`fn-filter ${tab === x ? 'is-on' : ''}`} onClick={() => setTab(x)}>
            {t(`adm.fnd.tab.${x}`)} <span>{counts[x]}</span>
          </button>
        ))}
      </div>

      {list.length === 0 ? (
        <section className="adm-card">
          <EmptyState icon={tab === 'pending' ? CheckCircle2 : Building2} title={t(`adm.fnd.empty.${tab}`)} />
        </section>
      ) : tab === 'pending' ? (
        list.map((f) => <RequestCard key={f.id} f={f} onDecided={decided} />)
      ) : (
        <ul className="adm-people">
          {list.map((f) => (
            <li key={f.id} className="adm-decided">
              <span className="adm-req__icon adm-req__icon--sm" aria-hidden="true"><Building2 size={18} /></span>
              <span className="adm-person__text">
                <span className="adm-person__name">{f.foundation_name || '-'}</span>
                <span className="adm-person__email">
                  {t(tab === 'approved' ? 'adm.fnd.approvedOn' : 'adm.fnd.declinedOn', { date: formatDate(f.reviewed_at, lang) })}
                  {tab === 'rejected' && f.rejection_reason ? ` · ${f.rejection_reason}` : ''}
                  {tab === 'approved' && !f.promptpay_number ? ` · ${t('adm.fnd.noPromptpay')}` : ''}
                </span>
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
