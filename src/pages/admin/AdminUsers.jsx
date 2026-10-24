// Admin → people. A searchable list; tapping someone opens their details, which is the only place
// to change a role or suspend an account (the old table had a role picker on every row).
import { useEffect, useMemo, useState } from 'react';
import { AlertCircle, Ban, ChevronRight, Search, ShieldCheck } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../services/supabaseClient';
import { Button, Dialog, EmptyState, LoadError, useToast } from '../../components/ui';
import { initialsAvatar } from '../../lib/avatar';
import { formatThaiPhone } from '../../lib/phone';
import { useI18n } from '../../i18n';

const ROLES = ['user', 'foundation', 'super_admin'];
const FILTERS = ['all', 'user', 'foundation', 'super_admin', 'banned'];
const roleOf = (p) => (ROLES.includes(p?.role) ? p.role : 'user');

async function logAction(adminId, action, targetId, detail) {
  try {
    await supabase.from('admin_audit_log').insert({ admin_id: adminId, action, target_id: targetId, detail });
  } catch (err) {
    console.warn('[Admin] audit log failed', err);
  }
}

function Avatar({ p, size = 40 }) {
  const [ok, setOk] = useState(true);
  const src = p.avatar_url && ok ? p.avatar_url : initialsAvatar(p.full_name || p.email || '?');
  return <img className="adm-avatar" src={src} alt="" width={size} height={size} onError={() => setOk(false)} />;
}

function formatDate(iso, lang) {
  if (!iso) return '-';
  try { return new Date(iso).toLocaleDateString(lang === 'en' ? 'en-GB' : 'th-TH', { day: 'numeric', month: 'short', year: 'numeric' }); } catch { return '-'; }
}

function UserDetail({ person, onClose, onChanged }) {
  const { user: me } = useAuth();
  const { t, lang } = useI18n();
  const toast = useToast();
  const [facts, setFacts] = useState(null);
  const [role, setRole] = useState(roleOf(person));
  const [confirmText, setConfirmText] = useState('');
  const [reason, setReason] = useState('');
  const [reasonError, setReasonError] = useState(false);
  const [busy, setBusy] = useState('');

  const isMe = person.id === me?.id;
  const isAdmin = roleOf(person) === 'super_admin';
  const needsTyping = role === 'super_admin' && roleOf(person) !== 'super_admin';
  const typedOk = !needsTyping || confirmText.trim().toLowerCase() === (person.email || '').toLowerCase();

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const [m, r, v, f] = await Promise.all([
        supabase.from('matches').select('id', { count: 'exact', head: true }).eq('user_id', person.id),
        supabase.from('reports').select('id', { count: 'exact', head: true }).eq('reported_id', person.id),
        supabase.from('user_verifications').select('status').eq('id', person.id).maybeSingle(),
        roleOf(person) === 'foundation'
          ? supabase.from('foundation_profiles').select('foundation_name, verification_status').eq('id', person.id).maybeSingle()
          : Promise.resolve({ data: null }),
      ]);
      if (cancelled) return;
      setFacts({
        requests: m.count ?? null,
        reported: r.count ?? null,
        verified: person.is_verified || v.data?.status === 'verified',
        foundation: f.data,
      });
    })().catch((err) => console.warn('[Admin] user facts failed', err));
    return () => { cancelled = true; };
  }, [person]);

  const saveRole = async () => {
    if (role === roleOf(person) || !typedOk) return;
    setBusy('role');
    const { error } = await supabase.from('profiles').update({ role }).eq('id', person.id);
    setBusy('');
    if (error) { toast(t('adm.user.roleFail'), { tone: 'error' }); return; }
    await logAction(me.id, 'UPDATE_ROLE', person.id, `${person.email || person.full_name}: ${roleOf(person)} → ${role}`);
    toast(t('adm.user.roleDone'), { tone: 'success' });
    onChanged({ ...person, role });
  };

  const suspend = async () => {
    if (!reason.trim()) { setReasonError(true); return; }
    setBusy('ban');
    const at = new Date().toISOString();
    let res = await supabase.from('profiles').update({ is_banned: true, banned_reason: reason.trim(), banned_at: at }).eq('id', person.id);
    // Before migration 029 the reason / time columns don't exist yet: suspend anyway
    if (res.error && /banned_reason|banned_at|column/i.test(res.error.message || '')) {
      res = await supabase.from('profiles').update({ is_banned: true }).eq('id', person.id);
    }
    setBusy('');
    if (res.error) { toast(t('adm.user.banFail'), { tone: 'error' }); return; }
    await logAction(me.id, 'BAN_USER', person.id, `${person.email || person.full_name}: ${reason.trim()}`);
    toast(t('adm.user.banDone'), { tone: 'success' });
    onChanged({ ...person, is_banned: true, banned_reason: reason.trim(), banned_at: at });
  };

  const unsuspend = async () => {
    setBusy('unban');
    let res = await supabase.from('profiles').update({ is_banned: false, banned_reason: null, banned_at: null }).eq('id', person.id);
    if (res.error && /banned_reason|banned_at|column/i.test(res.error.message || '')) {
      res = await supabase.from('profiles').update({ is_banned: false }).eq('id', person.id);
    }
    setBusy('');
    if (res.error) { toast(t('adm.user.unbanFail'), { tone: 'error' }); return; }
    await logAction(me.id, 'UNBAN_USER', person.id, person.email || person.full_name || '');
    toast(t('adm.user.unbanDone'), { tone: 'success' });
    onChanged({ ...person, is_banned: false, banned_reason: null, banned_at: null });
  };

  const fact = (label, value) => (
    <div className="adm-fact"><dt>{label}</dt><dd>{value}</dd></div>
  );

  return (
    <Dialog open onClose={() => !busy && onClose()} title={t('adm.user.title')} className="adm-user-dialog"
      actions={<Button variant="secondary" onClick={onClose} disabled={Boolean(busy)}>{t('common.close')}</Button>}>
      <div className="adm-user">
        <div className="adm-user__head">
          <Avatar p={person} size={56} />
          <div className="adm-user__id">
            <strong>{person.full_name || t('adm.user.noName')}</strong>
            <span>{person.email || '-'}</span>
            <span className="adm-badges">
              <span className={`adm-badge adm-badge--${roleOf(person)}`}>{t(`adm.role.${roleOf(person)}`)}</span>
              {person.is_banned && <span className="adm-badge adm-badge--banned">{t('adm.user.banned')}</span>}
            </span>
          </div>
        </div>

        <dl className="adm-facts">
          {fact(t('adm.user.phone'), person.phone ? formatThaiPhone(person.phone) : '-')}
          {fact(t('adm.user.joined'), formatDate(person.created_at, lang))}
          {fact(t('adm.user.lastSeen'), formatDate(person.last_seen, lang))}
          {roleOf(person) === 'user' && fact(t('adm.user.verified'), facts ? (facts.verified ? t('adm.user.yes') : t('adm.user.no')) : '…')}
          {roleOf(person) === 'user' && fact(t('adm.user.requests'), facts?.requests ?? '…')}
          {roleOf(person) === 'foundation' && fact(t('adm.user.foundation'), facts?.foundation ? `${facts.foundation.foundation_name || '-'} · ${t(`adm.fstatus.${facts.foundation.verification_status || 'pending'}`)}` : '…')}
          {fact(t('adm.user.reported'), facts?.reported ?? '…')}
        </dl>

        {/* Role */}
        <section className="adm-block">
          <h3 className="adm-block__title">{t('adm.user.role')}</h3>
          {isMe ? <p className="adm-block__note">{t('adm.user.roleSelf')}</p> : (
            <>
              <div className="fn-chips" role="radiogroup" aria-label={t('adm.user.role')}>
                {ROLES.map((r) => (
                  <button key={r} type="button" role="radio" aria-checked={role === r}
                    className={`fn-chip fn-chip--select ${role === r ? 'is-on' : ''}`} onClick={() => { setRole(r); setConfirmText(''); }}>
                    {t(`adm.role.${r}`)}
                  </button>
                ))}
              </div>
              {needsTyping && (
                <div className="adm-warn">
                  <p><AlertCircle size={16} aria-hidden="true" /> {t('adm.user.adminWarn')}</p>
                  <label className="fn-label" htmlFor="adm-confirm">{t('adm.user.typeEmail', { email: person.email || '' })}</label>
                  <input id="adm-confirm" className="fn-input" value={confirmText} onChange={(e) => setConfirmText(e.target.value)} autoComplete="off" />
                </div>
              )}
              {role !== roleOf(person) && (
                <Button onClick={saveRole} loading={busy === 'role'} disabled={!typedOk || Boolean(busy)}>{t('adm.user.saveRole')}</Button>
              )}
            </>
          )}
        </section>

        {/* Suspension */}
        <section className="adm-block">
          <h3 className="adm-block__title">{t('adm.user.suspension')}</h3>
          {isMe || isAdmin ? <p className="adm-block__note">{t('adm.user.banAdmin')}</p> : person.is_banned ? (
            <>
              <p className="adm-block__note adm-block__note--danger">
                <Ban size={16} aria-hidden="true" /> {person.banned_at ? t('adm.user.bannedSince', { date: formatDate(person.banned_at, lang) }) : t('adm.user.bannedNow')}
                {person.banned_reason && <><br />{t('adm.user.reason', { reason: person.banned_reason })}</>}
              </p>
              <Button variant="secondary" onClick={unsuspend} loading={busy === 'unban'} disabled={Boolean(busy)}>{t('adm.user.unban')}</Button>
            </>
          ) : (
            <>
              <p className="adm-block__note">{t('adm.user.banExplain')}</p>
              <label className="fn-label" htmlFor="adm-reason">{t('adm.user.banReason')}</label>
              <textarea id="adm-reason" className={`fn-input adm-textarea ${reasonError ? 'is-invalid' : ''}`} rows={2} value={reason}
                onChange={(e) => { setReason(e.target.value); setReasonError(false); }} placeholder={t('adm.user.banReasonPh')}
                aria-invalid={reasonError || undefined} aria-describedby={reasonError ? 'adm-reason-err' : undefined} />
              {reasonError && <span id="adm-reason-err" className="fn-error" role="alert"><AlertCircle size={14} aria-hidden="true" /> {t('adm.user.banReasonErr')}</span>}
              <Button variant="danger" onClick={suspend} loading={busy === 'ban'} disabled={Boolean(busy)}><Ban size={16} aria-hidden="true" /> {t('adm.user.ban')}</Button>
            </>
          )}
        </section>
      </div>
    </Dialog>
  );
}

export default function AdminUsers() {
  const { t } = useI18n();
  const [people, setPeople] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState('all');
  const [open, setOpen] = useState(null);

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase.from('profiles').select('*').order('created_at', { ascending: false });
    if (error) { console.error('[Admin] users failed', error); setLoadError(true); } else { setPeople(data || []); setLoadError(false); }
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const counts = useMemo(() => ({
    all: people.length,
    user: people.filter((p) => roleOf(p) === 'user').length,
    foundation: people.filter((p) => roleOf(p) === 'foundation').length,
    super_admin: people.filter((p) => roleOf(p) === 'super_admin').length,
    banned: people.filter((p) => p.is_banned).length,
  }), [people]);

  if (loading) {
    return (
      <div className="adm-stack" aria-busy="true">
        <span className="fd-sk" style={{ height: 48, borderRadius: 999 }} />
        <section className="adm-card">{[0, 1, 2, 3, 4].map((i) => <span key={i} className="fd-sk" style={{ height: 48 }} />)}</section>
      </div>
    );
  }
  if (loadError) return <LoadError onRetry={load} />;

  const q = query.trim().toLowerCase();
  const list = people.filter((p) =>
    (filter === 'all' || (filter === 'banned' ? p.is_banned : roleOf(p) === filter))
    && (!q || [p.full_name, p.email, p.phone].some((v) => (v || '').toLowerCase().includes(q))));

  return (
    <div className="adm-stack">
      <label className="adm-search">
        <Search size={18} aria-hidden="true" />
        <input type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder={t('adm.users.search')} aria-label={t('adm.users.search')} />
      </label>
      <div className="fn-filters" role="tablist" aria-label={t('adm.users.filter')}>
        {FILTERS.filter((f) => f !== 'banned' || counts.banned > 0).map((f) => (
          <button key={f} type="button" role="tab" aria-selected={filter === f} className={`fn-filter ${filter === f ? 'is-on' : ''}`} onClick={() => setFilter(f)}>
            {f === 'all' ? t('fn.allLabel') : f === 'banned' ? t('adm.user.banned') : t(`adm.roles.${f}`)} <span>{counts[f]}</span>
          </button>
        ))}
      </div>

      {list.length === 0 ? (
        <section className="adm-card"><EmptyState icon={Search} title={t('adm.users.none')} /></section>
      ) : (
        <ul className="adm-people">
          {list.map((p) => (
            <li key={p.id}>
              <button type="button" className="adm-person" onClick={() => setOpen(p)}>
                <Avatar p={p} />
                <span className="adm-person__text">
                  <span className="adm-person__name">
                    {p.full_name || t('adm.user.noName')}
                    {p.is_verified && <ShieldCheck size={14} className="adm-person__verified" aria-label={t('adm.user.verified')} />}
                  </span>
                  <span className="adm-person__email">{p.email || '-'}</span>
                </span>
                <span className="adm-badges">
                  {p.is_banned && <span className="adm-badge adm-badge--banned">{t('adm.user.banned')}</span>}
                  {roleOf(p) !== 'user' && <span className={`adm-badge adm-badge--${roleOf(p)}`}>{t(`adm.role.${roleOf(p)}`)}</span>}
                </span>
                <ChevronRight size={18} className="adm-person__chev" aria-hidden="true" />
              </button>
            </li>
          ))}
        </ul>
      )}

      {open && (
        <UserDetail
          person={open}
          onClose={() => setOpen(null)}
          onChanged={(next) => { setPeople((ps) => ps.map((p) => (p.id === next.id ? next : p))); setOpen(next); }}
        />
      )}
    </div>
  );
}
