// Admin → from users: support chats and reports, both "answer a person" work.
import { useEffect, useRef, useState } from 'react';
import { AlertCircle, Ban, Check, ChevronRight, EyeOff, Flag, Image as ImageIcon, MessageSquare, PawPrint, Send, ShieldAlert, X } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../services/supabaseClient';
import { api } from '../../services/api';
import { Button, Dialog, EmptyState, LoadError, useToast } from '../../components/ui';
import { initialsAvatar } from '../../lib/avatar';
import { useI18n } from '../../i18n';
import { logAction, messageUser, suspend } from './adminApi';

import { markSeen, readSeen } from './useAdminSummary';

function when(iso, lang) {
  if (!iso) return '';
  const d = new Date(iso);
  const sameDay = d.toDateString() === new Date().toDateString();
  try {
    return sameDay
      ? d.toLocaleTimeString(lang === 'en' ? 'en-GB' : 'th-TH', { hour: '2-digit', minute: '2-digit' })
      : d.toLocaleDateString(lang === 'en' ? 'en-GB' : 'th-TH', { day: 'numeric', month: 'short' });
  } catch { return ''; }
}

function Face({ p, size = 40 }) {
  const [ok, setOk] = useState(true);
  const src = p?.avatar_url && ok ? p.avatar_url : initialsAvatar(p?.full_name || p?.email || '?');
  return <img className="adm-avatar" src={src} alt="" width={size} height={size} onError={() => setOk(false)} />;
}

/* ---------------- Support chats ---------------- */

function SupportThread({ chat, onClose, onSent }) {
  const { user: me } = useAuth();
  const { t, lang } = useI18n();
  const toast = useToast();
  const [messages, setMessages] = useState(null);
  const [text, setText] = useState('');
  const [image, setImage] = useState(null); // { file, preview }
  const [sending, setSending] = useState(false);
  const endRef = useRef(null);
  const fileRef = useRef(null);

  useEffect(() => {
    let cancelled = false;
    markSeen(chat.id);
    supabase.from('support_messages').select('*').eq('chat_id', chat.id).order('created_at', { ascending: true })
      .then(({ data, error }) => { if (!cancelled) setMessages(error ? [] : data || []); });
    const channel = supabase.channel(`admin_support_${chat.id}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'support_messages', filter: `chat_id=eq.${chat.id}` },
        (payload) => setMessages((m) => (m && !m.some((x) => x.id === payload.new.id) ? [...m, payload.new] : m)))
      .subscribe();
    return () => { cancelled = true; supabase.removeChannel(channel); markSeen(chat.id); };
  }, [chat.id]);

  useEffect(() => { endRef.current?.scrollIntoView({ block: 'end' }); }, [messages?.length]);

  const pick = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => setImage({ file, preview: reader.result });
    reader.readAsDataURL(file);
  };

  const send = async (e) => {
    e?.preventDefault();
    if ((!text.trim() && !image) || sending) return;
    setSending(true);
    try {
      let imageUrl = null;
      if (image) {
        const name = `${Date.now()}_${Math.random().toString(36).slice(2, 8)}.${image.file.name.split('.').pop()}`;
        const up = await supabase.storage.from('chat_images').upload(name, image.file);
        if (up.error) throw up.error;
        imageUrl = supabase.storage.from('chat_images').getPublicUrl(name).data.publicUrl;
      }
      const { data, error } = await supabase.from('support_messages')
        .insert({ chat_id: chat.id, sender_id: me.id, text: text.trim(), image_url: imageUrl }).select().single();
      if (error) throw error;
      await supabase.from('support_chats').update({ updated_at: new Date().toISOString() }).eq('id', chat.id);
      setMessages((m) => (m?.some((x) => x.id === data.id) ? m : [...(m || []), data]));
      setText(''); setImage(null);
      onSent?.();
    } catch (err) {
      console.error('[Admin] support send failed', err);
      toast(t('adm.inbox.sendFail'), { tone: 'error' });
    } finally {
      setSending(false);
    }
  };

  const person = chat.profile;
  return (
    <Dialog open onClose={onClose} title={person?.full_name || person?.email || t('adm.user.noName')} className="adm-thread-dialog">
      <p className="adm-thread__email">{person?.email}</p>
      <div className="adm-thread" aria-live="polite">
        {messages === null ? <span className="adm-note">…</span> : messages.length === 0 ? (
          <p className="adm-note">{t('adm.inbox.noMessages')}</p>
        ) : messages.map((m) => {
          const mine = m.sender_id === me?.id || (m.sender_id && m.sender_id !== chat.user_id);
          return (
            <div key={m.id} className={`adm-bubble ${mine ? 'is-mine' : ''}`}>
              {m.image_url && <a href={m.image_url} target="_blank" rel="noopener noreferrer"><img src={m.image_url} alt="" /></a>}
              {m.text && <p>{m.text}</p>}
              <time>{when(m.created_at, lang)}</time>
            </div>
          );
        })}
        <div ref={endRef} />
      </div>
      {image && (
        <div className="adm-thread__preview">
          <img src={image.preview} alt="" />
          <button type="button" onClick={() => setImage(null)} aria-label={t('common.cancel')}><X size={14} /></button>
        </div>
      )}
      <form className="adm-composer" onSubmit={send}>
        <input ref={fileRef} type="file" accept="image/*" hidden onChange={pick} />
        <button type="button" className="fn-icon-btn" onClick={() => fileRef.current?.click()} aria-label={t('adm.inbox.attach')}><ImageIcon size={18} /></button>
        <input className="fn-input" value={text} onChange={(e) => setText(e.target.value)} placeholder={t('adm.inbox.replyPh')} aria-label={t('adm.inbox.replyPh')} />
        <Button type="submit" loading={sending} disabled={!text.trim() && !image} aria-label={t('adm.inbox.send')}>{!sending && <Send size={18} />}</Button>
      </form>
    </Dialog>
  );
}

function SupportList({ onChanged }) {
  const { t, lang } = useI18n();
  const [chats, setChats] = useState(null);
  const [error, setError] = useState(false);
  const [open, setOpen] = useState(null);
  const [seen, setSeen] = useState(readSeen);

  const load = async () => {
    setError(false);
    const { data, error: err } = await supabase.from('support_chats').select('*, profile:user_id(full_name, email, avatar_url)').order('updated_at', { ascending: false });
    if (err) { console.error('[Admin] support failed', err); setError(true); return; }
    setChats(data || []);
  };
  useEffect(() => { load(); }, []);

  if (error) return <LoadError onRetry={load} />;
  if (chats === null) return <section className="adm-card">{[0, 1, 2].map((i) => <span key={i} className="fd-sk" style={{ height: 56 }} />)}</section>;
  if (chats.length === 0) return <section className="adm-card"><EmptyState icon={MessageSquare} title={t('adm.inbox.noChats')} /></section>;

  return (
    <>
      <ul className="adm-people">
        {chats.map((c) => {
          const unread = c.updated_at > (seen[c.id] || '');
          return (
            <li key={c.id}>
              <button type="button" className="adm-person" onClick={() => setOpen(c)}>
                <Face p={c.profile} />
                <span className="adm-person__text">
                  <span className="adm-person__name">{c.profile?.full_name || c.profile?.email || t('adm.user.noName')}</span>
                  <span className="adm-person__email">{c.profile?.email || ''}</span>
                </span>
                <span className="adm-time">{when(c.updated_at, lang)}</span>
                {unread && <span className="adm-dot" aria-label={t('adm.inbox.unread')} />}
                <ChevronRight size={18} className="adm-person__chev" aria-hidden="true" />
              </button>
            </li>
          );
        })}
      </ul>
      {open && <SupportThread chat={open} onClose={() => { setOpen(null); setSeen(readSeen()); onChanged?.(); }} onSent={load} />}
    </>
  );
}

/* ---------------- Reports ---------------- */

function ReportDetail({ report, onClose, onResolved }) {
  const { user: me } = useAuth();
  const { t, lang } = useI18n();
  const toast = useToast();
  const [chat, setChat] = useState(null); // null = not loaded
  const [mode, setMode] = useState(null); // null | 'warn' | 'suspend'
  const [note, setNote] = useState('');
  const [noteError, setNoteError] = useState(false);
  const [busy, setBusy] = useState('');
  const isListing = Boolean(report.animal_id);
  const done = report.status === 'resolved';

  const loadChat = async () => {
    setChat('loading');
    try {
      const match = await api.getMatchBetweenUsers(report.reporter_id, report.reported_id);
      setChat(match ? await api.getMessages(match.id) : []);
    } catch { setChat([]); }
  };

  const resolve = async (outcome, detail = {}) => {
    const { error } = await supabase.from('reports').update({ status: 'resolved' }).eq('id', report.id);
    if (error) throw error;
    await logAction(me.id, 'RESOLVE_REPORT', report.reported_id, { report_id: report.id, outcome, ...detail });
    onResolved(report.id);
  };

  const act = async (kind) => {
    if ((kind === 'warn' || kind === 'suspend') && !note.trim()) { setNoteError(true); return; }
    setBusy(kind);
    try {
      if (kind === 'dismiss') await resolve('dismissed');
      if (kind === 'warn') {
        await messageUser(me.id, report.reported_id, t('adm.rep.warnMessage', { reason: note.trim() }));
        await resolve('warned', { note: note.trim() });
      }
      if (kind === 'suspend') {
        await suspend(me.id, { id: report.reported_id, email: report.reported?.email }, note.trim());
        await resolve('suspended', { note: note.trim() });
      }
      if (kind === 'hide') {
        const { error } = await supabase.from('animals').update({ status: 'hidden' }).eq('id', report.animal_id);
        if (error) throw error;
        await logAction(me.id, 'HIDE_LISTING', report.animal_id, { report_id: report.id, name: report.animal?.name || null });
        await resolve('listing_hidden');
      }
      toast(t(`adm.rep.done.${kind}`), { tone: 'success' });
      onClose();
    } catch (err) {
      console.error('[Admin] report action failed', err);
      toast(t('adm.fnd.fail'), { tone: 'error' });
    } finally {
      setBusy('');
    }
  };

  return (
    <Dialog open onClose={() => !busy && onClose()} title={t(isListing ? 'adm.rep.titleListing' : 'adm.rep.title')}>
      <div className="adm-user">
        <dl className="adm-facts">
          <div className="adm-fact"><dt>{t('adm.rep.by')}</dt><dd>{report.reporter?.full_name || report.reporter?.email || '-'}</dd></div>
          <div className="adm-fact"><dt>{t(isListing ? 'adm.rep.owner' : 'adm.rep.about')}</dt><dd>{report.reported?.full_name || report.reported?.email || '-'}</dd></div>
          {isListing && <div className="adm-fact adm-fact--wide"><dt>{t('adm.rep.listing')}</dt><dd><PawPrint size={14} aria-hidden="true" /> {report.animal?.name || '-'}{report.animal?.status === 'hidden' ? ` · ${t('adm.rep.hidden')}` : ''}</dd></div>}
          <div className="adm-fact adm-fact--wide"><dt>{t('adm.rep.reason')}</dt><dd className="adm-fact__long">{report.reason || '-'}</dd></div>
          <div className="adm-fact"><dt>{t('adm.rep.when')}</dt><dd>{when(report.created_at, lang)}</dd></div>
        </dl>
        {report.image_url && (
          <a href={report.image_url} target="_blank" rel="noopener noreferrer" className="adm-proof"><img src={report.image_url} alt={t('adm.rep.proof')} /></a>
        )}

        {!isListing && (
          <section className="adm-block">
            <h3 className="adm-block__title">{t('adm.rep.chat')}</h3>
            {chat === null ? (
              <Button variant="secondary" size="sm" onClick={loadChat}><MessageSquare size={16} aria-hidden="true" /> {t('adm.rep.loadChat')}</Button>
            ) : chat === 'loading' ? <span className="adm-note">…</span> : chat.length === 0 ? (
              <p className="adm-block__note">{t('adm.rep.noChat')}</p>
            ) : (
              <div className="adm-thread adm-thread--compact">
                {chat.map((m) => (
                  <div key={m.id} className={`adm-bubble ${m.sender_id === report.reporter_id ? '' : 'is-mine'}`}>
                    <strong>{m.sender_id === report.reporter_id ? t('adm.rep.reporterShort') : t('adm.rep.reportedShort')}</strong>
                    {m.text && <p>{m.text}</p>}
                    <time>{when(m.created_at, lang)}</time>
                  </div>
                ))}
              </div>
            )}
          </section>
        )}

        {done ? (
          <p className="adm-done"><Check size={18} aria-hidden="true" /> {t('adm.rep.resolved')}</p>
        ) : (
          <section className="adm-block">
            <h3 className="adm-block__title">{t('adm.rep.decide')}</h3>
            {mode && (
              <>
                <label className="fn-label" htmlFor="adm-rep-note">{t(mode === 'warn' ? 'adm.rep.warnLabel' : 'adm.user.banReason')}</label>
                <textarea id="adm-rep-note" className={`fn-input adm-textarea ${noteError ? 'is-invalid' : ''}`} rows={2} value={note}
                  onChange={(e) => { setNote(e.target.value); setNoteError(false); }} placeholder={t(mode === 'warn' ? 'adm.rep.warnPh' : 'adm.user.banReasonPh')} />
                {noteError && <span className="fn-error" role="alert"><AlertCircle size={14} aria-hidden="true" /> {t('adm.user.banReasonErr')}</span>}
                {mode === 'warn' && <p className="adm-block__note">{t('adm.rep.warnNote')}</p>}
              </>
            )}
            <div className="adm-actions">
              {!mode && <Button variant="secondary" onClick={() => act('dismiss')} loading={busy === 'dismiss'} disabled={Boolean(busy)}><Check size={16} aria-hidden="true" /> {t('adm.rep.dismiss')}</Button>}
              {!mode && isListing && report.animal?.status !== 'hidden' && <Button variant="secondary" onClick={() => act('hide')} loading={busy === 'hide'} disabled={Boolean(busy)}><EyeOff size={16} aria-hidden="true" /> {t('adm.rep.hide')}</Button>}
              {mode !== 'suspend' && <Button variant="secondary" onClick={() => (mode === 'warn' ? act('warn') : setMode('warn'))} loading={busy === 'warn'} disabled={Boolean(busy)}><ShieldAlert size={16} aria-hidden="true" /> {t(mode === 'warn' ? 'adm.rep.sendWarn' : 'adm.rep.warn')}</Button>}
              {mode !== 'warn' && <Button variant="danger" onClick={() => (mode === 'suspend' ? act('suspend') : setMode('suspend'))} loading={busy === 'suspend'} disabled={Boolean(busy)}><Ban size={16} aria-hidden="true" /> {t('adm.user.ban')}</Button>}
              {mode && <Button variant="ghost" onClick={() => { setMode(null); setNoteError(false); }} disabled={Boolean(busy)}>{t('common.cancel')}</Button>}
            </div>
          </section>
        )}
      </div>
    </Dialog>
  );
}

function ReportList({ onChanged }) {
  const { t, lang } = useI18n();
  const [reports, setReports] = useState(null);
  const [error, setError] = useState(false);
  const [filter, setFilter] = useState('open');
  const [open, setOpen] = useState(null);

  const load = async () => {
    setError(false);
    const { data, error: err } = await supabase.from('reports')
      .select('*, reporter:profiles!reporter_id(full_name, email, avatar_url), reported:profiles!reported_id(full_name, email, avatar_url)')
      .order('created_at', { ascending: false });
    if (err) { console.error('[Admin] reports failed', err); setError(true); return; }
    const rows = data || [];
    const animalIds = [...new Set(rows.map((r) => r.animal_id).filter(Boolean))];
    if (animalIds.length) {
      const { data: animals } = await supabase.from('animals').select('id, name, status').in('id', animalIds);
      rows.forEach((r) => { r.animal = (animals || []).find((a) => a.id === r.animal_id) || null; });
    }
    setReports(rows);
  };
  useEffect(() => { load(); }, []);

  if (error) return <LoadError onRetry={load} />;
  if (reports === null) return <section className="adm-card">{[0, 1, 2].map((i) => <span key={i} className="fd-sk" style={{ height: 56 }} />)}</section>;

  const isOpen = (r) => r.status !== 'resolved';
  const counts = { open: reports.filter(isOpen).length, resolved: reports.filter((r) => !isOpen(r)).length };
  const list = reports.filter((r) => (filter === 'open' ? isOpen(r) : !isOpen(r)));

  return (
    <>
      <div className="fn-filters" role="tablist" aria-label={t('adm.inbox.reports')}>
        {['open', 'resolved'].map((f) => (
          <button key={f} type="button" role="tab" aria-selected={filter === f} className={`fn-filter ${filter === f ? 'is-on' : ''}`} onClick={() => setFilter(f)}>
            {t(`adm.rep.tab.${f}`)} <span>{counts[f]}</span>
          </button>
        ))}
      </div>
      {list.length === 0 ? (
        <section className="adm-card"><EmptyState icon={filter === 'open' ? Check : Flag} title={t(`adm.rep.empty.${filter}`)} /></section>
      ) : (
        <ul className="adm-people">
          {list.map((r) => (
            <li key={r.id}>
              <button type="button" className="adm-person" onClick={() => setOpen(r)}>
                <span className={`adm-req__icon adm-req__icon--sm ${r.animal_id ? '' : 'adm-icon--danger'}`} aria-hidden="true">{r.animal_id ? <PawPrint size={18} /> : <Flag size={18} />}</span>
                <span className="adm-person__text">
                  <span className="adm-person__name">
                    {r.animal_id ? t('adm.rep.rowListing', { name: r.animal?.name || '-' }) : t('adm.rep.rowPerson', { name: r.reported?.full_name || r.reported?.email || '-' })}
                  </span>
                  <span className="adm-person__email">{r.reason || '-'}</span>
                </span>
                <span className="adm-time">{when(r.created_at, lang)}</span>
                <ChevronRight size={18} className="adm-person__chev" aria-hidden="true" />
              </button>
            </li>
          ))}
        </ul>
      )}
      {open && (
        <ReportDetail report={open} onClose={() => setOpen(null)}
          onResolved={(id) => { setReports((rs) => rs.map((r) => (r.id === id ? { ...r, status: 'resolved' } : r))); onChanged?.(); }} />
      )}
    </>
  );
}

export default function AdminInbox({ tab, setTab, onChanged }) {
  const { t } = useI18n();
  const current = tab === 'reports' ? 'reports' : 'support';
  return (
    <div className="adm-stack">
      <div className="adm-seg" role="tablist" aria-label={t('adm.section.inbox')}>
        {['support', 'reports'].map((x) => (
          <button key={x} type="button" role="tab" aria-selected={current === x} className={current === x ? 'is-on' : ''} onClick={() => setTab(x)}>
            {x === 'support' ? <MessageSquare size={16} aria-hidden="true" /> : <Flag size={16} aria-hidden="true" />} {t(`adm.inbox.${x}`)}
          </button>
        ))}
      </div>
      {current === 'support' ? <SupportList onChanged={onChanged} /> : <ReportList onChanged={onChanged} />}
    </div>
  );
}
