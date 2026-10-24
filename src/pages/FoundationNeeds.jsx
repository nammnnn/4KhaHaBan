// Items the foundation needs (shown to people on the donate page).
// Layout follows the other foundation pages (FoundationAnimals / FoundationIncidents): header with
// one main action, filter chips only when they help, a card per item, and the shared Dialog.
import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { AlertCircle, ChevronDown, ChevronLeft, MapPin, Package, Pencil, Plus, Trash2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { supabase } from '../services/supabaseClient';
import { FoundationNeedsPageSkeleton } from '../components/Skeletons';
import { Button, Dialog, EmptyState, LoadError, useToast } from '../components/ui';
import { useI18n } from '../i18n';
import FoundationInfoDialog from '../components/foundation/FoundationInfoDialog';
import { formatThaiPhone } from '../lib/phone';
import './FoundationNeeds.css';

// Labels: fn.urg.<id>, fn.cat.<id>, fn.preset.<index>.name / .note
const URGENCY_IDS = ['critical', 'high', 'normal', 'sufficient'];
const URGENCY_RANK = { critical: 0, high: 1, normal: 2, sufficient: 3 };
const CATEGORY_IDS = ['food', 'medical', 'hygiene', 'equipment', 'other'];
const PRESET_BASE = [
  { category: 'food', urgency: 'critical' },
  { category: 'food', urgency: 'high' },
  { category: 'hygiene', urgency: 'high' },
  { category: 'hygiene', urgency: 'normal' },
  { category: 'medical', urgency: 'high' },
  { category: 'hygiene', urgency: 'normal' },
];
// Older rows may hold other values (e.g. 'medium'): treat them as "welcome"
const urgencyOf = (u) => (URGENCY_IDS.includes(u) ? u : 'normal');
const EMPTY_FORM = { id: null, name: '', category: 'food', urgency: 'high', note: '' };

export default function FoundationNeeds() {
  const { user } = useAuth();
  const { t } = useI18n();
  const toast = useToast();
  const [searchParams, setSearchParams] = useSearchParams();
  const [needs, setNeeds] = useState([]);
  const [foundationInfo, setFoundationInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [filter, setFilter] = useState('all');
  const [form, setForm] = useState(null); // null = closed, otherwise EMPTY_FORM-shaped
  const [nameError, setNameError] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [toDelete, setToDelete] = useState(null);
  const [editAddress, setEditAddress] = useState(false);

  const presets = PRESET_BASE.map((p, i) => ({ ...p, name: t(`fn.preset.${i}.name`), note: t(`fn.preset.${i}.note`) }));

  const fetchData = async () => {
    setLoading(true);
    try {
      if (user?.id) {
        if (supabase) {
          const { data: fp, error: fpError } = await supabase
            .from('foundation_profiles')
            .select('foundation_name, address, contact_phone, contact_person, latitude, longitude, promptpay_number')
            .eq('id', user.id)
            .maybeSingle();
          if (fpError) throw fpError;
          setFoundationInfo(fp || null);
        }
        setNeeds(await api.getFoundationNeeds(user.id, { strict: true }));
      }
      setLoadError(false);
    } catch (err) {
      console.error('Error fetching foundation needs:', err);
      setLoadError(true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, [user]); // eslint-disable-line react-hooks/exhaustive-deps

  const openAdd = (preset) => {
    setNameError(false);
    setForm(preset ? { ...EMPTY_FORM, ...preset } : { ...EMPTY_FORM });
  };
  const openEdit = (item) => {
    setNameError(false);
    setForm({ id: item.id, name: item.item_name || '', category: CATEGORY_IDS.includes(item.category) ? item.category : 'other', urgency: urgencyOf(item.urgency), note: item.note || '' });
  };
  const setField = (key, value) => setForm((f) => ({ ...f, [key]: value }));

  // "Add items" on the foundation home links here with ?add=1: open the add window straight away
  useEffect(() => {
    if (loading || searchParams.get('add') !== '1') return;
    openAdd();
    setSearchParams({}, { replace: true });
  }, [loading]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleSubmit = async (e) => {
    e?.preventDefault();
    if (!form || !user?.id) return;
    const name = form.name.trim();
    if (!name) { setNameError(true); return; }
    const fields = { item_name: name, category: form.category, urgency: form.urgency, note: form.note.trim() };
    setSubmitting(true);
    try {
      if (form.id) {
        await api.updateFoundationNeed(form.id, fields);
        setNeeds((prev) => prev.map((n) => (n.id === form.id ? { ...n, ...fields } : n)));
      } else {
        const created = await api.addFoundationNeed({ foundation_id: user.id, ...fields, is_active: true });
        setNeeds((prev) => [created, ...prev]);
      }
      toast(t(form.id ? 'fn.toast.updated' : 'fn.toast.added', { name }), { tone: 'success' });
      setForm(null);
    } catch (err) {
      console.error('Error saving need item:', err);
      toast(t('fn.toast.saveFail'), { tone: 'error' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    const item = toDelete;
    if (!item) return;
    try {
      await api.deleteFoundationNeed(item.id);
      setNeeds((prev) => prev.filter((n) => n.id !== item.id));
      toast(t('fn.toast.deleted', { name: item.item_name }), { tone: 'success' });
    } catch (err) {
      console.error('Error deleting need item:', err);
      toast(t('fn.toast.delFail'), { tone: 'error' });
    } finally {
      setToDelete(null);
    }
  };

  const changeUrgency = async (id, urgency) => {
    const before = needs;
    setNeeds((prev) => prev.map((n) => (n.id === id ? { ...n, urgency } : n)));
    try {
      await api.updateFoundationNeed(id, { urgency });
    } catch (err) {
      console.error('Error updating urgency:', err);
      setNeeds(before);
      toast(t('fn.toast.urgFail'), { tone: 'error' });
    }
  };

  if (loading) return <FoundationNeedsPageSkeleton />;
  if (loadError) return <div className="fn-page"><LoadError onRetry={fetchData} /></div>;

  // Only categories that have items get a chip, and only when there is more than one
  const usedCategories = CATEGORY_IDS.filter((id) => needs.some((n) => n.category === id));
  const showFilters = usedCategories.length > 1;
  const activeFilter = showFilters && usedCategories.includes(filter) ? filter : 'all';
  const list = needs
    .filter((n) => activeFilter === 'all' || n.category === activeFilter)
    .sort((a, b) => URGENCY_RANK[urgencyOf(a.urgency)] - URGENCY_RANK[urgencyOf(b.urgency)]);
  // Presets the foundation hasn't listed yet
  const listed = new Set(needs.map((n) => (n.item_name || '').trim()));
  const freshPresets = presets.filter((p) => !listed.has(p.name));
  const recipient = foundationInfo?.contact_person || foundationInfo?.foundation_name;

  return (
    <div className="fn-page">
      <header className="fn-header">
        <Link to="/foundation" className="fn-back" aria-label={t('fnd.back')}><ChevronLeft size={22} /></Link>
        <div className="fn-header__text">
          <h1 className="fn-header__title">{t('fn.title')}</h1>
          <p className="fn-header__sub">{t('fn.sub2')}</p>
        </div>
        {needs.length > 0 && (
          <Button className="fn-header__cta" onClick={() => openAdd()}><Plus size={18} aria-hidden="true" /> {t('fn.add')}</Button>
        )}
      </header>

      {/* Where donated items are sent */}
      <button type="button" onClick={() => setEditAddress(true)} className={`fn-ship ${foundationInfo?.address ? '' : 'is-missing'}`}>
        <span className="fn-ship__icon" aria-hidden="true">{foundationInfo?.address ? <MapPin size={18} /> : <AlertCircle size={18} />}</span>
        <span className="fn-ship__text">
          <span className="fn-ship__label">{t('fn.ship.label')}</span>
          {foundationInfo?.address ? (
            <>
              <span className="fn-ship__address">{foundationInfo.address}</span>
              {(recipient || foundationInfo?.contact_phone) && (
                <span className="fn-ship__meta">
                  {[recipient && t('fn.ship.to', { name: recipient }), foundationInfo?.contact_phone && formatThaiPhone(foundationInfo.contact_phone)].filter(Boolean).join(' · ')}
                </span>
              )}
            </>
          ) : (
            <span className="fn-ship__address">{t('fn.ship.missing')}</span>
          )}
        </span>
        <span className="fn-ship__edit">{foundationInfo?.address ? t('fn.ship.edit2') : t('fd.info.set')}</span>
      </button>

      {needs.length === 0 ? (
        <section className="fn-card fn-start">
          <EmptyState icon={Package} title={t('fn.start.title')} text={t('fn.start.text')}
            action={<Button onClick={() => openAdd()}><Plus size={18} aria-hidden="true" /> {t('fn.add')}</Button>} />
          <div className="fn-start__presets">
            <p className="fn-start__label">{t('fn.start.or')}</p>
            <div className="fn-chips">
              {presets.map((p) => (
                <button key={p.name} type="button" className="fn-chip" onClick={() => openAdd(p)}>
                  <Plus size={14} aria-hidden="true" /> {p.name}
                </button>
              ))}
            </div>
          </div>
        </section>
      ) : (
        <>
          {showFilters && (
            <div className="fn-filters" role="tablist" aria-label={t('fn.form.category')}>
              {['all', ...usedCategories].map((id) => (
                <button key={id} type="button" role="tab" aria-selected={activeFilter === id}
                  className={`fn-filter ${activeFilter === id ? 'is-on' : ''}`} onClick={() => setFilter(id)}>
                  {id === 'all' ? t('fn.allLabel') : t(`fn.cat.${id}`)}
                  <span>{id === 'all' ? needs.length : needs.filter((n) => n.category === id).length}</span>
                </button>
              ))}
            </div>
          )}

          <ul className="fn-list">
            {list.map((item) => (
              <li key={item.id} className={`fn-item ${urgencyOf(item.urgency) === 'sufficient' ? 'is-done' : ''}`}>
                <button type="button" className="fn-item__main" onClick={() => openEdit(item)} aria-label={t('fn.editNamed', { name: item.item_name })}>
                  <span className="fn-item__name">{item.item_name}</span>
                  <span className="fn-item__meta">
                    {t(`fn.cat.${CATEGORY_IDS.includes(item.category) ? item.category : 'other'}`)}
                    {item.note && <> · {item.note}</>}
                  </span>
                </button>
                <div className="fn-item__actions">
                  <label className={`fn-urgency fn-urgency--${urgencyOf(item.urgency)}`}>
                    <span className="sr-only">{t('fn.form.urgency')}</span>
                    <select value={urgencyOf(item.urgency)} onChange={(e) => changeUrgency(item.id, e.target.value)}>
                      {URGENCY_IDS.map((id) => <option key={id} value={id}>{t(`fn.urgShort.${id}`)}</option>)}
                    </select>
                    <ChevronDown size={14} aria-hidden="true" />
                  </label>
                  <button type="button" className="fn-icon-btn" onClick={() => openEdit(item)} aria-label={t('fn.editItem')}><Pencil size={16} /></button>
                  <button type="button" className="fn-icon-btn fn-icon-btn--danger" onClick={() => setToDelete(item)} aria-label={t('fn.deleteItem')}><Trash2 size={16} /></button>
                </div>
              </li>
            ))}
          </ul>
          <p className="fn-foot">{t('fn.foot')}</p>
        </>
      )}

      {/* Add / edit */}
      <Dialog
        open={Boolean(form)}
        onClose={() => !submitting && setForm(null)}
        title={form?.id ? t('fn.form.titleEdit') : t('fn.form.titleNew')}
        actions={(
          <>
            <Button variant="secondary" onClick={() => setForm(null)} disabled={submitting}>{t('fn.form.cancel')}</Button>
            <Button onClick={handleSubmit} loading={submitting}>{t('fn.form.save')}</Button>
          </>
        )}
      >
        {form && (
          <form className="fn-form" onSubmit={handleSubmit} noValidate>
            {!form.id && freshPresets.length > 0 && !form.name && (
              <div className="fn-field">
                <span className="fn-label">{t('fn.form.quick')}</span>
                <div className="fn-chips">
                  {freshPresets.map((p) => (
                    <button key={p.name} type="button" className="fn-chip"
                      onClick={() => { setNameError(false); setForm((f) => ({ ...f, name: p.name, category: p.category, urgency: p.urgency, note: p.note })); }}>
                      <Plus size={14} aria-hidden="true" /> {p.name}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="fn-field">
              <label className="fn-label" htmlFor="fn-name">{t('fn.form.name2')} <span className="fn-req">*</span></label>
              <input id="fn-name" className={`fn-input ${nameError ? 'is-invalid' : ''}`} value={form.name}
                onChange={(e) => { setField('name', e.target.value); setNameError(false); }}
                placeholder={t('fn.form.namePh')} aria-invalid={nameError || undefined}
                aria-describedby={nameError ? 'fn-name-err' : undefined} autoFocus={!form.name} />
              {nameError && <span id="fn-name-err" className="fn-error" role="alert"><AlertCircle size={14} aria-hidden="true" /> {t('fn.form.nameErr')}</span>}
            </div>

            <div className="fn-field">
              <span className="fn-label" id="fn-cat-label">{t('fn.form.category')}</span>
              <div className="fn-chips" role="radiogroup" aria-labelledby="fn-cat-label">
                {CATEGORY_IDS.map((id) => (
                  <button key={id} type="button" role="radio" aria-checked={form.category === id}
                    className={`fn-chip fn-chip--select ${form.category === id ? 'is-on' : ''}`} onClick={() => setField('category', id)}>
                    {t(`fn.cat.${id}`)}
                  </button>
                ))}
              </div>
            </div>

            <div className="fn-field">
              <span className="fn-label" id="fn-urg-label">{t('fn.form.urgency')}</span>
              <div className="fn-urg-grid" role="radiogroup" aria-labelledby="fn-urg-label">
                {URGENCY_IDS.map((id) => (
                  <button key={id} type="button" role="radio" aria-checked={form.urgency === id}
                    className={`fn-urg-option fn-urg-option--${id} ${form.urgency === id ? 'is-on' : ''}`} onClick={() => setField('urgency', id)}>
                    <strong>{t(`fn.urgShort.${id}`)}</strong>
                    <small>{t(`fn.urgHint.${id}`)}</small>
                  </button>
                ))}
              </div>
            </div>

            <div className="fn-field">
              <label className="fn-label" htmlFor="fn-note">{t('fn.form.note')}</label>
              <input id="fn-note" className="fn-input" value={form.note} onChange={(e) => setField('note', e.target.value)} placeholder={t('fn.form.notePh')} />
            </div>
          </form>
        )}
      </Dialog>

      <Dialog
        open={Boolean(toDelete)}
        onClose={() => setToDelete(null)}
        title={toDelete ? t('fn.del.title', { name: toDelete.item_name }) : ''}
        actions={(
          <>
            <Button variant="secondary" onClick={() => setToDelete(null)}>{t('fnd.back')}</Button>
            <Button variant="danger" onClick={handleDelete}>{t('fn.del.confirm')}</Button>
          </>
        )}
      >
        <p>{t('fn.del.text')}</p>
      </Dialog>
      <FoundationInfoDialog kind={editAddress ? 'location' : null} info={foundationInfo} onClose={() => setEditAddress(false)}
        onSaved={(patch) => setFoundationInfo((cur) => ({ ...(cur || {}), ...patch }))} />
    </div>
  );
}
