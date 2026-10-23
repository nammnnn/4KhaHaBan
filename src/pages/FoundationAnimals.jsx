// Foundation: the animals in its care. Phones get a compact list, desktop a photo grid.
import React, { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Edit2, ExternalLink, EyeOff, MessageCircle, MoreHorizontal, PawPrint, PlusCircle, Search, Trash2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../services/supabaseClient';
import { FoundationAnimalsSkeleton } from '../components/Skeletons';
import { Button, Dialog, useToast } from '../components/ui';
import './FoundationAnimals.css';

const STATUSES = [
  { id: 'available', label: 'กำลังหาบ้าน' },
  { id: 'adopted', label: 'ได้บ้านแล้ว' },
  { id: 'hidden', label: 'ซ่อนไว้' },
];
const FILTERS = [{ id: 'all', label: 'ทั้งหมด' }, ...STATUSES];
const TYPE_LABEL = { dog: 'สุนัข', cat: 'แมว' };
const GENDER_LABEL = { male: 'เพศผู้', female: 'เพศเมีย' };

function AnimalPhoto({ src }) {
  const [ok, setOk] = useState(true);
  return src && ok
    ? <img className="fa-card__photo" src={src} alt="" loading="lazy" onError={() => setOk(false)} />
    : <span className="fa-card__photo fa-card__photo--empty"><PawPrint size={28} aria-hidden="true" /></span>;
}

// ⋯ menu: view as adopters see it, edit, hide, delete
function RowMenu({ animal, onHide, onDelete }) {
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
  return (
    <div className="fa-menu" ref={ref}>
      <button type="button" className="fa-icon-btn" aria-label={`ตัวเลือกเพิ่มเติมของ${animal.name}`} aria-expanded={open} onClick={() => setOpen((v) => !v)}>
        <MoreHorizontal size={20} />
      </button>
      {open && (
        <div className="fa-menu__panel" role="menu">
          <Link role="menuitem" to={`/animal/${animal.id}`} className="fa-menu__item"><ExternalLink size={16} aria-hidden="true" /> ดูหน้าที่ผู้ใช้เห็น</Link>
          <Link role="menuitem" to={`/foundation/animals/${animal.id}/edit`} className="fa-menu__item"><Edit2 size={16} aria-hidden="true" /> แก้ไขข้อมูล</Link>
          {animal.status !== 'hidden' && (
            <button role="menuitem" type="button" className="fa-menu__item" onClick={() => { setOpen(false); onHide(); }}><EyeOff size={16} aria-hidden="true" /> ซ่อนจากหน้าปัด</button>
          )}
          <button role="menuitem" type="button" className="fa-menu__item fa-menu__item--danger" onClick={() => { setOpen(false); onDelete(); }}><Trash2 size={16} aria-hidden="true" /> ลบ</button>
        </div>
      )}
    </div>
  );
}

const FoundationAnimals = () => {
  const { user } = useAuth();
  const toast = useToast();
  const [animals, setAnimals] = useState([]);
  const [requests, setRequests] = useState({}); // animal_id -> open request count
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
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
        toast('โหลดรายการน้องไม่สำเร็จ ลองรีเฟรชหน้า', { tone: 'error' });
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
      toast('เปลี่ยนสถานะไม่สำเร็จ กรุณาลองใหม่', { tone: 'error' });
    }
  };

  const handleDelete = async () => {
    if (!toDelete) return;
    setDeleting(true);
    const { error } = await supabase.from('animals').delete().eq('id', toDelete.id);
    setDeleting(false);
    if (error) {
      console.error('[Animals] Error deleting animal:', error);
      toast('ลบไม่สำเร็จ กรุณาลองใหม่', { tone: 'error' });
      return;
    }
    setAnimals((prev) => prev.filter((a) => a.id !== toDelete.id));
    toast(`ลบ${toDelete.name}แล้ว`, { tone: 'success' });
    setToDelete(null);
  };

  if (loading) return <FoundationAnimalsSkeleton />;

  const q = searchQuery.toLowerCase().trim();
  const counts = animals.reduce((acc, a) => ({ ...acc, [a.status]: (acc[a.status] || 0) + 1 }), {});
  const filtered = animals.filter((a) =>
    (statusFilter === 'all' || a.status === statusFilter) && (!q || (a.name || '').toLowerCase().includes(q)));
  const deleteRequests = toDelete ? requests[toDelete.id] || 0 : 0;

  return (
    <div className="fa-page">
      <header className="fa-header">
        <div>
          <h1 className="fa-header__title">สัตว์ในดูแล</h1>
          <p className="fa-header__sub">{animals.length} ตัว · กำลังหาบ้าน {counts.available || 0} ตัว</p>
        </div>
        <Link to="/foundation/animals/new" className="ui-btn ui-btn--primary fa-header__cta">
          <PlusCircle size={18} aria-hidden="true" /> เพิ่มสัตว์หาบ้าน
        </Link>
      </header>

      {animals.length > 0 && (
        <div className="fa-toolbar">
          <label className="fa-search">
            <Search size={18} aria-hidden="true" />
            <input type="search" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="ค้นหาชื่อน้อง" aria-label="ค้นหาชื่อน้อง" />
          </label>
          <div className="fa-filters" role="tablist" aria-label="กรองตามสถานะ">
            {FILTERS.map((f) => (
              <button
                key={f.id}
                type="button"
                role="tab"
                aria-selected={statusFilter === f.id}
                className={`fa-filter ${statusFilter === f.id ? 'is-on' : ''}`}
                onClick={() => setStatusFilter(f.id)}
              >
                {f.label} <span>{f.id === 'all' ? animals.length : counts[f.id] || 0}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {animals.length === 0 ? (
        <div className="fa-empty">
          <span className="fa-empty__icon" aria-hidden="true"><PawPrint size={32} /></span>
          <h2>ยังไม่มีน้องในดูแล</h2>
          <p>ลงประกาศน้องตัวแรก ใส่รูปและนิสัย แล้วผู้ใช้จะเห็นน้องในหน้าปัดหาบ้าน</p>
          <Link to="/foundation/animals/new" className="ui-btn ui-btn--primary">เพิ่มสัตว์หาบ้าน</Link>
        </div>
      ) : filtered.length === 0 ? (
        <p className="fa-none">ไม่พบน้องที่ตรงกับการค้นหา</p>
      ) : (
        <ul className="fa-grid">
          {filtered.map((animal) => {
            const open = requests[animal.id] || 0;
            const meta = [TYPE_LABEL[animal.type] || animal.type, animal.age, GENDER_LABEL[animal.gender]].filter(Boolean).join(' · ');
            return (
              <li key={animal.id} className={`fa-card fa-card--${animal.status}`}>
                <Link to={`/foundation/animals/${animal.id}/edit`} className="fa-card__media" aria-label={`แก้ไขข้อมูล${animal.name}`}>
                  <AnimalPhoto src={animal.images?.[0]} />
                </Link>
                <div className="fa-card__body">
                  <div className="fa-card__top">
                    <h2 className="fa-card__name">{animal.name}</h2>
                    <RowMenu animal={animal} onHide={() => handleStatusChange(animal.id, 'hidden')} onDelete={() => setToDelete(animal)} />
                  </div>
                  {meta && <p className="fa-card__meta">{meta}</p>}
                  <div className="fa-card__foot">
                    <select
                      className={`fa-status fa-status--${animal.status}`}
                      value={STATUSES.some((s) => s.id === animal.status) ? animal.status : 'available'}
                      onChange={(e) => handleStatusChange(animal.id, e.target.value)}
                      aria-label={`สถานะของ${animal.name}`}
                    >
                      {STATUSES.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
                    </select>
                    {open > 0 && (
                      <Link to="/foundation/matches" className="fa-requests" aria-label={`คำขอรับเลี้ยง ${open} รายการ`} title={`คำขอรับเลี้ยง ${open} รายการ`}>
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

      <Dialog open={Boolean(toDelete)} onClose={() => !deleting && setToDelete(null)} title={toDelete ? `ลบ${toDelete.name}?` : ''}>
        <div className="fa-delete">
          <p>ข้อมูลและรูปของน้องจะถูกลบถาวร{deleteRequests > 0 ? ` รวมถึงคำขอรับเลี้ยงและแชทที่ค้างอยู่ ${deleteRequests} รายการ` : ''}</p>
          <p className="fa-delete__hint">ถ้าแค่ไม่อยากให้คนเห็นชั่วคราว เลือก "ซ่อนไว้" แทนได้ ข้อมูลยังอยู่ครบ</p>
        </div>
        <div className="ui-dialog__actions">
          <Button variant="secondary" onClick={() => { const a = toDelete; setToDelete(null); handleStatusChange(a.id, 'hidden'); }} disabled={deleting}>ซ่อนไว้แทน</Button>
          <Button variant="danger" loading={deleting} onClick={handleDelete}>ลบถาวร</Button>
        </div>
      </Dialog>
    </div>
  );
};

export default FoundationAnimals;
