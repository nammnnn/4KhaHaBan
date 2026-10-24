// Foundation: the animals in its care. Phones get a compact list, desktop a photo grid.
import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowUpDown, Check, ChevronDown, Edit2, ExternalLink, EyeOff, LayoutGrid, List, MessageCircle,
  MoreHorizontal, PawPrint, PlusCircle, Search, SlidersHorizontal, Trash2, X,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../services/supabaseClient';
import { FoundationAnimalsSkeleton } from '../components/Skeletons';
import { Button, Dialog, useToast } from '../components/ui';
import { useI18n, localizeAge } from '../i18n';
import './FoundationAnimals.css';

// Labels: fa.status.<id>, fa.statusHint.<id>, fa.sort.<id>, fa.filter.<key>
const STATUSES = ['available', 'adopted', 'hidden'];
const SORTS = [
  { id: 'newest', fn: (a, b) => new Date(b.created_at) - new Date(a.created_at) },
  { id: 'oldest', fn: (a, b) => new Date(a.created_at) - new Date(b.created_at) },
  { id: 'requests', fn: null }, // needs the request counts, set below
  { id: 'name', fn: (a, b) => (a.name || '').localeCompare(b.name || '', 'th') },
];
const FILTER_GROUPS = [
  { key: 'type', options: [['dog', 'animal.dog'], ['cat', 'animal.cat']] },
  { key: 'gender', options: [['male', 'fa.male'], ['female', 'fa.female']] },
  { key: 'size', options: [['small', 'fa.small'], ['medium', 'fa.medium'], ['large', 'fa.large']] },
];
const NO_FILTERS = { type: null, gender: null, size: null, hasRequests: false };
const VIEW_KEY = '4kh_fa_view';

const readView = () => { try { return localStorage.getItem(VIEW_KEY); } catch { return null; } };
const saveView = (v) => { try { localStorage.setItem(VIEW_KEY, v); } catch { /* private mode */ } };

function useWide() {
  const query = '(min-width: 768px)';
  const [wide, setWide] = useState(() => typeof window !== 'undefined' && Boolean(window.matchMedia?.(query).matches));
  useEffect(() => {
    const mql = window.matchMedia?.(query);
    if (!mql) return undefined;
    const on = () => setWide(mql.matches);
    mql.addEventListener('change', on);
    return () => mql.removeEventListener('change', on);
  }, []);
  return wide;
}

// Small popover: closes on outside tap and Escape
function usePopover() {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  useEffect(() => {
    if (!open) return undefined;
    const close = (e) => { if (!ref.current?.contains(e.target)) setOpen(false); };
    const esc = (e) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('pointerdown', close);
    document.addEventListener('keydown', esc);
    return () => { document.removeEventListener('pointerdown', close); document.removeEventListener('keydown', esc); };
  }, [open]);
  // Keep the panel on screen: nudge it left at the right edge, flip it up near the bottom/dock
  useLayoutEffect(() => {
    const panel = open && ref.current?.querySelector('.fa-menu__panel');
    if (!panel) return;
    const r = panel.getBoundingClientRect();
    const overRight = r.right - (window.innerWidth - 8);
    if (overRight > 0) panel.style.transform = `translateX(${-overRight}px)`;
    // On phones the floating dock covers the bottom of the screen
    const dock = document.querySelector('.nav-item')?.closest('nav')?.getBoundingClientRect();
    const bottomLimit = dock && dock.top > window.innerHeight / 2 ? dock.top - 8 : window.innerHeight - 8;
    if (r.bottom > bottomLimit && r.height < ref.current.getBoundingClientRect().top - 8) panel.classList.add('is-up');
  }, [open]);
  return { open, setOpen, ref };
}

// Status pill that opens the app's own menu (native <select> lists can't be styled)
function StatusMenu({ animal, onChange }) {
  const { t } = useI18n();
  const { open, setOpen, ref } = usePopover();
  const current = STATUSES.includes(animal.status) ? animal.status : STATUSES[0];
  return (
    <div className="fa-pop" ref={ref}>
      <button type="button" className={`fa-status fa-status--${current}`} aria-haspopup="menu" aria-expanded={open}
        aria-label={t('fa.statusOf', { name: animal.name, status: t(`fa.status.${current}`) })} onClick={() => setOpen((v) => !v)}>
        <span className="fa-status__dot" aria-hidden="true" /> {t(`fa.status.${current}`)} <ChevronDown size={15} aria-hidden="true" />
      </button>
      {open && (
        <div className="fa-menu__panel fa-menu__panel--left" role="menu">
          {STATUSES.map((s) => (
            <button key={s} role="menuitemradio" aria-checked={s === current} type="button"
              className={`fa-menu__item fa-menu__item--status ${s === current ? 'is-on' : ''}`}
              onClick={() => { setOpen(false); if (s !== current) onChange(s); }}>
              <span className={`fa-status__dot fa-status__dot--${s}`} aria-hidden="true" />
              <span className="fa-menu__text"><span>{t(`fa.status.${s}`)}</span><small>{t(`fa.statusHint.${s}`)}</small></span>
              {s === current && <Check size={16} className="fa-menu__check" aria-hidden="true" />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function SortMenu({ value, onChange }) {
  const { t } = useI18n();
  const { open, setOpen, ref } = usePopover();
  const current = SORTS.find((s) => s.id === value) || SORTS[0];
  return (
    <div className="fa-pop" ref={ref}>
      <button type="button" className="fa-tool" aria-haspopup="menu" aria-expanded={open} onClick={() => setOpen((v) => !v)}>
        <ArrowUpDown size={16} aria-hidden="true" /> <span className="fa-tool__label">{t(`fa.sort.${current.id}`)}</span>
      </button>
      {open && (
        <div className="fa-menu__panel" role="menu">
          {SORTS.map((s) => (
            <button key={s.id} role="menuitemradio" aria-checked={s.id === value} type="button"
              className={`fa-menu__item ${s.id === value ? 'is-on' : ''}`} onClick={() => { setOpen(false); onChange(s.id); }}>
              <span className="fa-menu__text"><span>{t(`fa.sort.${s.id}`)}</span></span>
              {s.id === value && <Check size={16} className="fa-menu__check" aria-hidden="true" />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
const FILTERS = ['all', ...STATUSES];
const TYPE_KEY = { dog: 'animal.dog', cat: 'animal.cat' };
const GENDER_KEY = { male: 'fa.male', female: 'fa.female' };

function AnimalPhoto({ src }) {
  const [ok, setOk] = useState(true);
  return src && ok
    ? <img className="fa-card__photo" src={src} alt="" loading="lazy" onError={() => setOk(false)} />
    : <span className="fa-card__photo fa-card__photo--empty"><PawPrint size={28} aria-hidden="true" /></span>;
}

// ⋯ menu: view as adopters see it, edit, hide, delete
function RowMenu({ animal, onHide, onDelete }) {
  const { t } = useI18n();
  const { open, setOpen, ref } = usePopover();
  return (
    <div className="fa-menu" ref={ref}>
      <button type="button" className="fa-icon-btn" aria-label={t('fa.more', { name: animal.name })} aria-expanded={open} onClick={() => setOpen((v) => !v)}>
        <MoreHorizontal size={20} />
      </button>
      {open && (
        <div className="fa-menu__panel" role="menu">
          <Link role="menuitem" to={`/animal/${animal.id}`} className="fa-menu__item"><ExternalLink size={16} aria-hidden="true" /> {t('fa.menu.view')}</Link>
          <Link role="menuitem" to={`/foundation/animals/${animal.id}/edit`} className="fa-menu__item"><Edit2 size={16} aria-hidden="true" /> {t('fa.menu.edit')}</Link>
          {animal.status !== 'hidden' && (
            <button role="menuitem" type="button" className="fa-menu__item" onClick={() => { setOpen(false); onHide(); }}><EyeOff size={16} aria-hidden="true" /> {t('fa.menu.hide')}</button>
          )}
          <button role="menuitem" type="button" className="fa-menu__item fa-menu__item--danger" onClick={() => { setOpen(false); onDelete(); }}><Trash2 size={16} aria-hidden="true" /> {t('fa.menu.delete')}</button>
        </div>
      )}
    </div>
  );
}

const FoundationAnimals = () => {
  const { user } = useAuth();
  const { t, lang } = useI18n();
  const toast = useToast();
  const [animals, setAnimals] = useState([]);
  const [requests, setRequests] = useState({}); // animal_id -> open request count
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [filters, setFilters] = useState(NO_FILTERS);
  const [showFilters, setShowFilters] = useState(false);
  const [sort, setSort] = useState('newest');
  const wide = useWide();
  const [viewChoice, setViewChoice] = useState(readView);
  const view = viewChoice === 'grid' || viewChoice === 'list' ? viewChoice : (wide ? 'grid' : 'list');
  const chooseView = (v) => { setViewChoice(v); saveView(v); };
  const [toDelete, setToDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (!user || !supabase) { setLoading(false); return; }
    (async () => {
      try {
        const [{ data, error }, { data: open }] = await Promise.all([
          supabase.from('animals').select('*').eq('foundation_id', user.id).order('created_at', { ascending: false }),
          // RLS limits this to requests for this foundation's animals
          supabase.from('matches').select('animal_id').in('status', ['pending', 'approved']),
        ]);
        if (error) throw error;
        setAnimals(data || []);
        setRequests((open || []).reduce((acc, m) => ({ ...acc, [m.animal_id]: (acc[m.animal_id] || 0) + 1 }), {}));
      } catch (error) {
        console.error('[Animals] Error fetching animals:', error);
        toast(t('fa.toast.loadFail'), { tone: 'error' });
      } finally {
        setLoading(false);
      }
    })();
  }, [user]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleStatusChange = async (id, newStatus) => {
    const before = animals;
    setAnimals((prev) => prev.map((a) => (a.id === id ? { ...a, status: newStatus } : a)));
    const { error } = await supabase.from('animals').update({ status: newStatus }).eq('id', id);
    if (error) {
      console.error('[Animals] Error updating status:', error);
      setAnimals(before);
      toast(t('fa.toast.statusFail'), { tone: 'error' });
    }
  };

  const handleDelete = async () => {
    if (!toDelete) return;
    setDeleting(true);
    const { error } = await supabase.from('animals').delete().eq('id', toDelete.id);
    setDeleting(false);
    if (error) {
      console.error('[Animals] Error deleting animal:', error);
      toast(t('fa.toast.delFail'), { tone: 'error' });
      return;
    }
    setAnimals((prev) => prev.filter((a) => a.id !== toDelete.id));
    toast(t('fa.toast.deleted', { name: toDelete.name }), { tone: 'success' });
    setToDelete(null);
  };

  if (loading) return <FoundationAnimalsSkeleton />;

  const q = searchQuery.toLowerCase().trim();
  const counts = animals.reduce((acc, a) => ({ ...acc, [a.status]: (acc[a.status] || 0) + 1 }), {});
  const activeFilters = FILTER_GROUPS.filter((g) => filters[g.key]).length + (filters.hasRequests ? 1 : 0);
  const sortFn = sort === 'requests'
    ? (a, b) => (requests[b.id] || 0) - (requests[a.id] || 0) || SORTS[0].fn(a, b)
    : (SORTS.find((x) => x.id === sort) || SORTS[0]).fn;
  const filtered = animals.filter((a) =>
    (statusFilter === 'all' || a.status === statusFilter)
    && (!q || (a.name || '').toLowerCase().includes(q))
    && FILTER_GROUPS.every((g) => !filters[g.key] || a[g.key] === filters[g.key])
    && (!filters.hasRequests || (requests[a.id] || 0) > 0)).sort(sortFn);
  const setFilter = (key, value) => setFilters((f) => ({ ...f, [key]: f[key] === value ? null : value }));
  const clearAll = () => { setFilters(NO_FILTERS); setSearchQuery(''); setStatusFilter('all'); };
  const deleteRequests = toDelete ? requests[toDelete.id] || 0 : 0;

  return (
    <div className="fa-page">
      <header className="fa-header">
        <div>
          <h1 className="fa-header__title">{t('fa.title')}</h1>
          <p className="fa-header__sub">{t('fa.sub', { total: animals.length, available: counts.available || 0 })}</p>
        </div>
        <Link to="/foundation/animals/new" className="ui-btn ui-btn--primary fa-header__cta">
          <PlusCircle size={18} aria-hidden="true" /> {t('fnd.addAnimal')}
        </Link>
      </header>

      {animals.length > 0 && (
        <div className="fa-toolbar">
          <div className="fa-toolbar__row">
            <label className="fa-search">
              <Search size={18} aria-hidden="true" />
              <input type="search" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder={t('fa.search')} aria-label={t('fa.search')} />
            </label>
            <button type="button" className={`fa-tool ${showFilters || activeFilters ? 'is-on' : ''}`} aria-expanded={showFilters}
              aria-controls="fa-filter-panel" onClick={() => setShowFilters((v) => !v)}>
              <SlidersHorizontal size={16} aria-hidden="true" /> <span className="fa-tool__label">{t('fa.filter')}</span>
              {activeFilters > 0 && <span className="fa-tool__count">{activeFilters}</span>}
            </button>
            <SortMenu value={sort} onChange={setSort} />
            <div className="fa-view" role="group" aria-label={t('fa.view')}>
              <button type="button" className={view === 'grid' ? 'is-on' : ''} aria-pressed={view === 'grid'} aria-label={t('fa.view.grid')} title={t('fa.view.grid')} onClick={() => chooseView('grid')}>
                <LayoutGrid size={18} aria-hidden="true" />
              </button>
              <button type="button" className={view === 'list' ? 'is-on' : ''} aria-pressed={view === 'list'} aria-label={t('fa.view.list')} title={t('fa.view.list')} onClick={() => chooseView('list')}>
                <List size={18} aria-hidden="true" />
              </button>
            </div>
          </div>
          {showFilters && (
            <div id="fa-filter-panel" className="fa-fpanel">
              {FILTER_GROUPS.map((g) => (
                <div key={g.key} className="fa-fpanel__group" role="group" aria-label={t(`fa.filter.${g.key}`)}>
                  <span className="fa-fpanel__label">{t(`fa.filter.${g.key}`)}</span>
                  <div className="fa-fpanel__opts">
                    {g.options.map(([id, labelKey]) => (
                      <button key={id} type="button" aria-pressed={filters[g.key] === id}
                        className={`fa-chip ${filters[g.key] === id ? 'is-on' : ''}`} onClick={() => setFilter(g.key, id)}>
                        {filters[g.key] === id && <Check size={14} aria-hidden="true" />} {t(labelKey)}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
              <div className="fa-fpanel__group" role="group" aria-label={t('fa.filter.requests')}>
                <span className="fa-fpanel__label">{t('fa.filter.requests')}</span>
                <div className="fa-fpanel__opts">
                  <button type="button" aria-pressed={filters.hasRequests}
                    className={`fa-chip ${filters.hasRequests ? 'is-on' : ''}`} onClick={() => setFilters((f) => ({ ...f, hasRequests: !f.hasRequests }))}>
                    {filters.hasRequests && <Check size={14} aria-hidden="true" />} {t('fa.filter.hasRequests')}
                  </button>
                </div>
              </div>
              <div className="fa-fpanel__foot">
                <button type="button" className="fa-link" onClick={() => setFilters(NO_FILTERS)} disabled={!activeFilters}>{t('fa.filter.clear')}</button>
                <Button size="sm" onClick={() => setShowFilters(false)}>{t('fa.filter.show', { n: filtered.length })}</Button>
              </div>
            </div>
          )}
          <div className="fa-filters" role="tablist" aria-label={t('fa.filterStatus')}>
            {FILTERS.map((f) => (
              <button
                key={f}
                type="button"
                role="tab"
                aria-selected={statusFilter === f}
                className={`fa-filter ${statusFilter === f ? 'is-on' : ''}`}
                onClick={() => setStatusFilter(f)}
              >
                {f === 'all' ? t('fa.all') : t(`fa.status.${f}`)} <span>{f === 'all' ? animals.length : counts[f] || 0}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {animals.length === 0 ? (
        <div className="fa-empty">
          <span className="fa-empty__icon" aria-hidden="true"><PawPrint size={32} /></span>
          <h2>{t('fa.empty.title')}</h2>
          <p>{t('fa.empty.text')}</p>
          <Link to="/foundation/animals/new" className="ui-btn ui-btn--primary">{t('fnd.addAnimal')}</Link>
        </div>
      ) : filtered.length === 0 ? (
        <div className="fa-none">
          <p>{t('fa.none')}</p>
          <button type="button" className="fa-link" onClick={clearAll}><X size={14} aria-hidden="true" /> {t('fa.clearAll')}</button>
        </div>
      ) : (
        <ul className={`fa-grid fa-grid--${view}`}>
          {filtered.map((animal) => {
            const open = requests[animal.id] || 0;
            const meta = [TYPE_KEY[animal.type] ? t(TYPE_KEY[animal.type]) : animal.type, localizeAge(animal.age, lang), GENDER_KEY[animal.gender] && t(GENDER_KEY[animal.gender])].filter(Boolean).join(' · ');
            return (
              <li key={animal.id} className={`fa-card fa-card--${animal.status}`}>
                <Link to={`/foundation/animals/${animal.id}/edit`} className="fa-card__media" aria-label={t('fa.editOf', { name: animal.name })}>
                  <AnimalPhoto src={animal.images?.[0]} />
                </Link>
                {open > 0 && view === 'grid' && (
                  <Link to="/foundation/matches" className="fa-requests fa-requests--badge" aria-label={t('fa.requests', { n: open })} title={t('fa.requests', { n: open })}>
                    <MessageCircle size={14} aria-hidden="true" /> {t(open === 1 ? 'fa.requestsBadgeOne' : 'fa.requestsBadge', { n: open })}
                  </Link>
                )}
                <div className="fa-card__body">
                  <div className="fa-card__top">
                    <h2 className="fa-card__name">{animal.name}</h2>
                    <RowMenu animal={animal} onHide={() => handleStatusChange(animal.id, 'hidden')} onDelete={() => setToDelete(animal)} />
                  </div>
                  {meta && <p className="fa-card__meta">{meta}</p>}
                  <div className="fa-card__foot">
                    <StatusMenu animal={animal} onChange={(st) => handleStatusChange(animal.id, st)} />
                    {open > 0 && view === 'list' && (
                      <Link to="/foundation/matches" className="fa-requests" aria-label={t('fa.requests', { n: open })} title={t('fa.requests', { n: open })}>
                        <MessageCircle size={15} aria-hidden="true" /> {open}
                      </Link>
                    )}
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <Dialog open={Boolean(toDelete)} onClose={() => !deleting && setToDelete(null)} title={toDelete ? t('fa.del.title', { name: toDelete.name }) : ''}>
        <div className="fa-delete">
          <p>{toDelete && t('fa.del.text', { name: toDelete.name })}{deleteRequests > 0 ? t('fa.del.withRequests', { n: deleteRequests }) : ''}{lang === 'en' ? '.' : ''}</p>
          <p className="fa-delete__hint">{t('fa.del.hint')}</p>
        </div>
        <div className="ui-dialog__actions">
          <Button variant="secondary" onClick={() => { const a = toDelete; setToDelete(null); handleStatusChange(a.id, 'hidden'); }} disabled={deleting}>{t('fa.del.hide')}</Button>
          <Button variant="danger" loading={deleting} onClick={handleDelete}>{t('fa.del.confirm')}</Button>
        </div>
      </Dialog>
    </div>
  );
};

export default FoundationAnimals;
