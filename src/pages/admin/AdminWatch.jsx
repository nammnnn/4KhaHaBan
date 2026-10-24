// Overview drill-downs: PromptPay changes to confirm, and adoption requests a foundation hasn't
// answered for 3+ days.
import { useEffect, useState } from 'react';
import { ArrowRight, Ban, Check, Phone } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../services/supabaseClient';
import { Button, Dialog, useToast } from '../../components/ui';
import { formatThaiPhone } from '../../lib/phone';
import { useI18n } from '../../i18n';
import { logAction, suspend } from './adminApi';

const DAY = 24 * 60 * 60 * 1000;
const daysSince = (iso) => Math.max(0, Math.floor((Date.now() - new Date(iso)) / DAY));
const fmtPP = (n) => (n ? (String(n).length === 10 ? formatThaiPhone(n) : n) : '—');

async function foundationNames(ids) {
  if (!ids.length) return {};
  const { data } = await supabase.from('foundation_profiles').select('id, foundation_name, contact_phone').in('id', ids);
  return Object.fromEntries((data || []).map((f) => [f.id, f]));
}

export function PayoutChanges({ items, onClose, onDone }) {
  const { user: me } = useAuth();
  const { t, lang } = useI18n();
  const toast = useToast();
  const [names, setNames] = useState({});
  const [busy, setBusy] = useState('');
  const [left, setLeft] = useState(items);

  useEffect(() => { foundationNames([...new Set(items.map((i) => i.foundation_id))]).then(setNames); }, [items]);

  const review = async (item, kind) => {
    setBusy(item.id + kind);
    try {
      if (kind === 'suspend') {
        await suspend(me.id, { id: item.foundation_id }, t('adm.pay.suspendReason'));
      }
      const { error } = await supabase.from('foundation_payout_changes').update({ reviewed_at: new Date().toISOString(), reviewed_by: me.id }).eq('id', item.id);
      if (error) throw error;
      await logAction(me.id, kind === 'ok' ? 'CONFIRM_PROMPTPAY' : 'SUSPEND_PROMPTPAY', item.foundation_id, { old: item.old_number, new: item.new_number });
      toast(t(kind === 'ok' ? 'adm.pay.confirmed' : 'adm.user.banDone'), { tone: 'success' });
      const next = left.filter((x) => x.id !== item.id);
      setLeft(next);
      onDone?.();
      if (!next.length) onClose();
    } catch (err) {
      console.error('[Admin] payout review failed', err);
      toast(t('adm.fnd.fail'), { tone: 'error' });
    } finally {
      setBusy('');
    }
  };

  return (
    <Dialog open onClose={() => !busy && onClose()} title={t('adm.pay.title')}>
      <p className="adm-block__note">{t('adm.pay.note')}</p>
      <ul className="adm-watch">
        {left.map((i) => {
          const f = names[i.foundation_id];
          return (
            <li key={i.id} className="adm-watch__item">
              <strong>{f?.foundation_name || '…'}</strong>
              <span className="adm-pay"><s>{fmtPP(i.old_number)}</s> <ArrowRight size={14} aria-hidden="true" /> <b>{fmtPP(i.new_number)}</b></span>
              <span className="adm-note">{new Date(i.changed_at).toLocaleString(lang === 'en' ? 'en-GB' : 'th-TH', { dateStyle: 'medium', timeStyle: 'short' })}</span>
              {f?.contact_phone && <a className="adm-link" href={`tel:${f.contact_phone.replace(/\D/g, '')}`}><Phone size={14} aria-hidden="true" /> {t('adm.pay.call', { phone: formatThaiPhone(f.contact_phone) })}</a>}
              <div className="adm-actions">
                <Button variant="secondary" size="sm" onClick={() => review(i, 'ok')} loading={busy === i.id + 'ok'} disabled={Boolean(busy)}><Check size={16} aria-hidden="true" /> {t('adm.pay.ok')}</Button>
                <Button variant="danger" size="sm" onClick={() => review(i, 'suspend')} loading={busy === i.id + 'suspend'} disabled={Boolean(busy)}><Ban size={16} aria-hidden="true" /> {t('adm.pay.suspend')}</Button>
              </div>
            </li>
          );
        })}
      </ul>
    </Dialog>
  );
}

export function StaleRequests({ items, onClose }) {
  const { t } = useI18n();
  const [info, setInfo] = useState(null);

  useEffect(() => {
    (async () => {
      const animalIds = [...new Set(items.map((m) => m.animal_id))];
      const { data: animals } = await supabase.from('animals').select('id, name, foundation_id').in('id', animalIds);
      const byId = Object.fromEntries((animals || []).map((a) => [a.id, a]));
      const fnames = await foundationNames([...new Set((animals || []).map((a) => a.foundation_id))]);
      // Group by foundation: one call covers all their waiting requests
      const groups = {};
      items.forEach((m) => {
        const a = byId[m.animal_id];
        const fid = a?.foundation_id || 'unknown';
        (groups[fid] ||= { foundation: fnames[fid], requests: [] }).requests.push({ ...m, animal: a });
      });
      setInfo(Object.values(groups).sort((x, y) => y.requests.length - x.requests.length));
    })().catch((err) => { console.error(err); setInfo([]); });
  }, [items]);

  return (
    <Dialog open onClose={onClose} title={t('adm.stale.title')} actions={<Button variant="secondary" onClick={onClose}>{t('common.close')}</Button>}>
      <p className="adm-block__note">{t('adm.stale.note')}</p>
      {info === null ? <span className="adm-note">…</span> : (
        <ul className="adm-watch">
          {info.map((g, i) => (
            <li key={i} className="adm-watch__item">
              <strong>{g.foundation?.foundation_name || '-'}</strong>
              <span className="adm-note">
                {g.requests.map((r) => t('adm.stale.row', { name: r.animal?.name || '-', n: daysSince(r.created_at) })).join(' · ')}
              </span>
              {g.foundation?.contact_phone && (
                <a className="ui-btn ui-btn--secondary ui-btn--sm" href={`tel:${g.foundation.contact_phone.replace(/\D/g, '')}`}>
                  <Phone size={16} aria-hidden="true" /> {formatThaiPhone(g.foundation.contact_phone)}
                </a>
              )}
            </li>
          ))}
        </ul>
      )}
    </Dialog>
  );
}
