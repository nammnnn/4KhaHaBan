import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  Package, 
  Plus, 
  Trash2, 
  AlertTriangle, 
  CheckCircle2, 
  Clock, 
  Check, 
  ChevronLeft, 
  Info, 
  MapPin, 
  Phone, 
  Edit3, 
  Sparkles,
  Loader,
  ExternalLink
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { supabase } from '../services/supabaseClient';
import { FoundationNeedsSkeleton, FoundationNeedsPageSkeleton } from '../components/Skeletons';
import { Button, Dialog, useToast } from '../components/ui';
import { useI18n } from '../i18n';

// Labels: fn.urg.<id>, fn.cat.<id>, fn.preset.<index>.name / .note
const URGENCY_BASE = [
  { id: 'critical', bg: '#FEE2E2', color: '#DC2626', border: '#FECACA' },
  { id: 'high', bg: '#FEF3C7', color: '#D97706', border: '#FDE68A' },
  { id: 'normal', bg: 'var(--success-soft)', color: 'var(--success-fill)', border: 'var(--success-line)' },
  { id: 'sufficient', bg: '#F3F4F6', color: '#6B7280', border: '#E5E7EB' }
];

const CATEGORY_IDS = ['food', 'medical', 'hygiene', 'equipment', 'other'];

const PRESET_BASE = [
  { category: 'food', urgency: 'critical' },
  { category: 'food', urgency: 'high' },
  { category: 'hygiene', urgency: 'high' },
  { category: 'hygiene', urgency: 'normal' },
  { category: 'medical', urgency: 'high' },
  { category: 'hygiene', urgency: 'normal' }
];

export default function FoundationNeeds() {
  const { user } = useAuth();
  const [needs, setNeeds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [foundationInfo, setFoundationInfo] = useState(null);

  // Form states
  const [itemName, setItemName] = useState('');
  const [category, setCategory] = useState('food');
  const [urgency, setUrgency] = useState('high');
  const [note, setNote] = useState('');
  const [editingId, setEditingId] = useState(null);

  // Filter
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [toDelete, setToDelete] = useState(null);
  const toast = useToast();
  const { t } = useI18n();
  const URGENCY_LEVELS = URGENCY_BASE.map((u) => ({ ...u, label: t(`fn.urg.${u.id}`) }));
  const CATEGORIES = CATEGORY_IDS.map((id) => ({ id, label: t(`fn.cat.${id}`) }));
  const QUICK_PRESETS = PRESET_BASE.map((p, i) => ({ ...p, name: t(`fn.preset.${i}.name`), note: t(`fn.preset.${i}.note`) }));

  useEffect(() => {
    fetchData();
  }, [user]);

  const fetchData = async () => {
    setLoading(true);
    try {
      if (user?.id) {
        // 1. Fetch foundation shipping info
        if (supabase) {
          const { data: fp } = await supabase
            .from('foundation_profiles')
            .select('foundation_name, address, contact_phone, contact_person, promptpay_number')
            .eq('id', user.id)
            .maybeSingle();
          if (fp) setFoundationInfo(fp);
        }

        // 2. Fetch needs list
        const items = await api.getFoundationNeeds(user.id);
        setNeeds(items);
      }
    } catch (err) {
      console.error('Error fetching foundation needs:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenAdd = () => {
    setEditingId(null);
    setItemName('');
    setCategory('food');
    setUrgency('high');
    setNote('');
    setShowAddModal(true);
  };

  const handleApplyPreset = (preset) => {
    setItemName(preset.name);
    setCategory(preset.category);
    setUrgency(preset.urgency);
    setNote(preset.note);
    setShowAddModal(true);
  };

  const handleOpenEdit = (item) => {
    setEditingId(item.id);
    setItemName(item.item_name);
    setCategory(item.category || 'food');
    setUrgency(item.urgency || 'normal');
    setNote(item.note || '');
    setShowAddModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!itemName.trim() || !user?.id) return;

    setSubmitting(true);
    try {
      if (editingId && !editingId.startsWith('def-')) {
        // Update
        await api.updateFoundationNeed(editingId, {
          item_name: itemName.trim(),
          category,
          urgency,
          note: note.trim()
        });
        setNeeds(prev => prev.map(n => n.id === editingId ? {
          ...n,
          item_name: itemName.trim(),
          category,
          urgency,
          note: note.trim()
        } : n));
      } else {
        // Add new
        const newNeed = await api.addFoundationNeed({
          foundation_id: user.id,
          item_name: itemName.trim(),
          category,
          urgency,
          note: note.trim(),
          is_active: true
        });
        setNeeds(prev => [newNeed, ...prev.filter(n => !n.id.startsWith('def-'))]);
      }
      setShowAddModal(false);
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
      setNeeds(prev => prev.filter(n => n.id !== item.id));
      toast(t('fn.toast.deleted', { name: item.item_name }), { tone: 'success' });
    } catch (err) {
      console.error('Error deleting need item:', err);
      toast(t('fn.toast.delFail'), { tone: 'error' });
    } finally {
      setToDelete(null);
    }
  };

  const handleUrgencyQuickChange = async (id, newUrgency) => {
    const before = needs;
    setNeeds(prev => prev.map(n => n.id === id ? { ...n, urgency: newUrgency } : n));
    try {
      await api.updateFoundationNeed(id, { urgency: newUrgency });
    } catch (err) {
      console.error('Error updating urgency:', err);
      setNeeds(before);
      toast(t('fn.toast.urgFail'), { tone: 'error' });
    }
  };

  const filteredNeeds = needs.filter(n => {
    if (selectedCategory === 'all') return true;
    return n.category === selectedCategory;
  });

  if (loading) return <FoundationNeedsPageSkeleton />;

  return (
    <div style={{
      minHeight: '100dvh',
      backgroundColor: '#FAF8F5',
      fontFamily: 'Prompt, sans-serif',
      padding: '32px 16px 100px',
      boxSizing: 'border-box'
    }}>
      <div style={{ maxWidth: '840px', margin: '0 auto' }}>
        
        {/* Header */}
        <motion.div
          style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <Link
              to="/foundation"
              style={{
                width: '38px',
                height: '38px',
                borderRadius: '8px',
                backgroundColor: '#FFFFFF',
                border: '1px solid #D1D5DB',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#374151',
                textDecoration: 'none'
              }}
            >
              <ChevronLeft size={20} />
            </Link>
            <div>
              <h1 style={{ fontSize: '1.4rem', fontWeight: 700, color: '#111827', margin: 0 }}>
                {t('fn.title')}
              </h1>
              <p style={{ fontSize: '0.85rem', color: '#6B7280', margin: '4px 0 0 0' }}>
                {t('fn.sub')}
              </p>
            </div>
          </div>

          <button
            onClick={handleOpenAdd}
            style={{
              height: '40px',
              padding: '0 18px',
              backgroundColor: '#D97706',
              color: '#FFFFFF',
              border: 'none',
              borderRadius: '8px',
              fontWeight: 600,
              fontSize: '0.88rem',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              cursor: 'pointer',
              boxShadow: '0 2px 6px rgba(217, 119, 6, 0.2)'
            }}
          >
            <Plus size={18} />
            {t('fn.add')}
          </button>
        </motion.div>

        {/* Shipping Address Notice Banner */}
        <motion.div
          style={{
            backgroundColor: '#FFFFFF',
            borderRadius: '12px',
            border: '1px solid #E5E7EB',
            padding: '16px 20px',
            marginBottom: '24px',
            display: 'flex',
            alignItems: 'flex-start',
            gap: '14px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.02)'
          }}
        >
          <div style={{
            width: '38px',
            height: '38px',
            borderRadius: '10px',
            backgroundColor: '#FEF3C7',
            color: '#D97706',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0
          }}>
            <MapPin size={20} />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', marginBottom: '4px', flexWrap: 'wrap' }}>
              <strong style={{ fontSize: '0.92rem', color: '#111827' }}>{t('fn.ship.title')}</strong>
              <Link
                to="/profile?modal=foundation"
                style={{
                  fontSize: '0.78rem',
                  color: '#D97706',
                  fontWeight: 600,
                  textDecoration: 'none',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px'
                }}
              >
                <span>{t('fn.ship.edit')}</span>
                <ExternalLink size={12} />
              </Link>
            </div>
            <p style={{ fontSize: '0.85rem', color: '#4B5563', margin: '0 0 4px 0', lineHeight: 1.5 }}>
              <strong>{t('fn.ship.recipient')}</strong> {foundationInfo?.contact_person || foundationInfo?.foundation_name || t('fn.ship.staff')}
              {foundationInfo?.contact_phone ? t('fn.ship.tel', { phone: foundationInfo.contact_phone }) : ''}
            </p>
            <p style={{ fontSize: '0.85rem', color: '#4B5563', margin: '0 0 4px 0', lineHeight: 1.5 }}>
              <strong>{t('fn.ship.promptpay')}</strong> {foundationInfo?.promptpay_number || t('fn.ship.noPromptpay')}
            </p>
            <p style={{ fontSize: '0.85rem', color: '#6B7280', margin: 0, lineHeight: 1.5 }}>
              <strong>{t('fn.ship.address')}</strong> {foundationInfo?.address || t('fn.ship.noAddress')}
            </p>
          </div>
        </motion.div>

        {/* Quick Suggestion Presets */}
        <motion.div
          style={{ marginBottom: '24px' }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '10px' }}>
            <Sparkles size={16} color="#D97706" />
            <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#374151' }}>{t('fn.quick')}</span>
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
            {QUICK_PRESETS.map((preset, idx) => (
              <button
                key={idx}
                onClick={() => handleApplyPreset(preset)}
                style={{
                  backgroundColor: '#FFFFFF',
                  border: '1px solid #D1D5DB',
                  borderRadius: '20px',
                  padding: '6px 14px',
                  fontSize: '0.8rem',
                  fontWeight: 500,
                  color: '#374151',
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                  transition: 'all 0.15s'
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.borderColor = '#D97706';
                  e.currentTarget.style.backgroundColor = '#FEF3C7';
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.borderColor = '#D1D5DB';
                  e.currentTarget.style.backgroundColor = '#FFFFFF';
                }}
              >
                <Plus size={12} color="#D97706" />
                {preset.name}
              </button>
            ))}
          </div>
        </motion.div>

        {/* Category Filter Tabs */}
        <motion.div
          style={{
            display: 'flex',
            gap: '6px',
            overflowX: 'auto',
            paddingBottom: '8px',
            marginBottom: '20px'
          }}
        >
          <button
            onClick={() => setSelectedCategory('all')}
            style={{
              padding: '6px 14px',
              borderRadius: '8px',
              border: selectedCategory === 'all' ? '1px solid #111827' : '1px solid #E5E7EB',
              fontSize: '0.85rem',
              fontWeight: selectedCategory === 'all' ? 600 : 500,
              backgroundColor: selectedCategory === 'all' ? '#111827' : '#FFFFFF',
              color: selectedCategory === 'all' ? '#FFFFFF' : '#4B5563',
              cursor: 'pointer',
              whiteSpace: 'nowrap'
            }}
          >
            {t('fn.all', { n: needs.length })}
          </button>
          {CATEGORIES.map(cat => {
            const count = needs.filter(n => n.category === cat.id).length;
            return (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                style={{
                  padding: '6px 14px',
                  borderRadius: '8px',
                  border: selectedCategory === cat.id ? '1px solid #111827' : '1px solid #E5E7EB',
                  fontSize: '0.85rem',
                  fontWeight: selectedCategory === cat.id ? 600 : 500,
                  backgroundColor: selectedCategory === cat.id ? '#111827' : '#FFFFFF',
                  color: selectedCategory === cat.id ? '#FFFFFF' : '#4B5563',
                  cursor: 'pointer',
                  whiteSpace: 'nowrap'
                }}
              >
                {cat.label} ({count})
              </button>
            );
          })}
        </motion.div>

        {/* Needs Item Cards */}
        {loading ? (
          <FoundationNeedsSkeleton />
        ) : filteredNeeds.length === 0 ? (
          <motion.div
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: '16px',
              border: '1px solid #E5E7EB',
              padding: '48px 24px',
              textAlign: 'center'
            }}
          >
            <Package size={44} color="#9CA3AF" style={{ margin: '0 auto 12px' }} />
            <h3 style={{ fontSize: '1.1rem', fontWeight: 600, color: '#111827', margin: '0 0 6px 0' }}>
              {t('fn.empty.title')}
            </h3>
            <p style={{ fontSize: '0.85rem', color: '#6B7280', margin: '0 0 20px 0' }}>
              {t('fn.empty.text')}
            </p>
            <button
              onClick={handleOpenAdd}
              style={{
                padding: '10px 20px',
                backgroundColor: '#D97706',
                color: '#FFFFFF',
                border: 'none',
                borderRadius: '8px',
                fontWeight: 600,
                fontSize: '0.88rem',
                cursor: 'pointer'
              }}
            >
              {t('fn.empty.add')}
            </button>
          </motion.div>
        ) : (
          <motion.div
            style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}
          >
            {filteredNeeds.map(item => {
              const currentUrgency = URGENCY_LEVELS.find(u => u.id === item.urgency) || URGENCY_LEVELS[2];
              const currentCategory = CATEGORIES.find(c => c.id === item.category) || CATEGORIES[0];

              return (
                <div
                  key={item.id}
                  style={{
                    backgroundColor: '#FFFFFF',
                    borderRadius: '12px',
                    border: '1px solid #E5E7EB',
                    padding: '16px 20px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    flexWrap: 'wrap',
                    gap: '14px',
                    boxShadow: '0 1px 2px rgba(0,0,0,0.02)'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '14px', minWidth: '240px', flex: 1 }}>
                    <div style={{
                      width: '40px',
                      height: '40px',
                      borderRadius: '10px',
                      backgroundColor: '#F3F4F6',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#4B5563',
                      flexShrink: 0
                    }}>
                      <Package size={20} />
                    </div>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                        <h4 style={{ fontSize: '0.98rem', fontWeight: 600, color: '#111827', margin: 0 }}>
                          {item.item_name}
                        </h4>
                        <span style={{
                          fontSize: '0.72rem',
                          backgroundColor: '#F3F4F6',
                          color: '#4B5563',
                          padding: '2px 8px',
                          borderRadius: '6px'
                        }}>
                          {currentCategory.label}
                        </span>
                      </div>
                      {item.note && (
                        <p style={{ fontSize: '0.82rem', color: '#6B7280', margin: '4px 0 0 0' }}>
                          {t('fn.note', { note: item.note })}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Urgency Selector & Actions */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginLeft: 'auto' }}>
                    <select
                      value={currentUrgency.id}
                      onChange={(e) => handleUrgencyQuickChange(item.id, e.target.value)}
                      style={{
                        padding: '6px 12px',
                        borderRadius: '8px',
                        fontSize: '0.82rem',
                        fontWeight: 600,
                        backgroundColor: currentUrgency.bg,
                        color: currentUrgency.color,
                        border: `1px solid ${currentUrgency.border}`,
                        cursor: 'pointer',
                        outline: 'none'
                      }}
                    >
                      {URGENCY_LEVELS.map(u => (
                        <option key={u.id} value={u.id}>
                          {u.label}
                        </option>
                      ))}
                    </select>

                    <button
                      onClick={() => handleOpenEdit(item)}
                      title={t('fn.editItem')}
                      style={{
                        width: '34px',
                        height: '34px',
                        borderRadius: '8px',
                        border: '1px solid #D1D5DB',
                        backgroundColor: '#FFFFFF',
                        color: '#4B5563',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: 'pointer'
                      }}
                    >
                      <Edit3 size={15} />
                    </button>

                    <button
                      onClick={() => setToDelete(item)}
                      title={t('fn.deleteItem')}
                      style={{
                        width: '34px',
                        height: '34px',
                        borderRadius: '8px',
                        border: '1px solid #FCA5A5',
                        backgroundColor: '#FEF2F2',
                        color: '#DC2626',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: 'pointer'
                      }}
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>
              );
            })}
          </motion.div>
        )}

      </div>

      {/* Add / Edit Modal */}
      {showAddModal && (
        <div style={{
          position: 'fixed',
          inset: 0,
          backgroundColor: 'rgba(0,0,0,0.5)',
          backdropFilter: 'blur(4px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '16px',
          zIndex: 999
        }}>
          <div style={{
            backgroundColor: '#FFFFFF',
            borderRadius: '16px',
            border: '1px solid #E5E7EB',
            width: '100%',
            maxWidth: '480px',
            padding: '24px',
            boxShadow: '0 20px 40px rgba(0,0,0,0.15)'
          }}>
            <h3 style={{ fontSize: '1.2rem', fontWeight: 700, color: '#111827', margin: '0 0 16px 0' }}>
              {editingId ? t('fn.form.titleEdit') : t('fn.form.titleNew')}
            </h3>

            <form onSubmit={handleSubmit}>
              {/* Item Name */}
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#374151', marginBottom: '6px' }}>
                  {t('fn.form.name')}
                </label>
                <input
                  type="text"
                  required
                  placeholder={t('fn.form.namePh')}
                  value={itemName}
                  onChange={(e) => setItemName(e.target.value)}
                  style={{
                    width: '100%',
                    height: '42px',
                    borderRadius: '8px',
                    border: '1px solid #D1D5DB',
                    padding: '0 12px',
                    fontSize: '0.9rem',
                    boxSizing: 'border-box',
                    outline: 'none'
                  }}
                />
              </div>

              {/* Category */}
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#374151', marginBottom: '6px' }}>
                  {t('fn.form.category')}
                </label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  style={{
                    width: '100%',
                    height: '42px',
                    borderRadius: '8px',
                    border: '1px solid #D1D5DB',
                    padding: '0 12px',
                    fontSize: '0.9rem',
                    boxSizing: 'border-box',
                    backgroundColor: '#FFFFFF',
                    outline: 'none'
                  }}
                >
                  {CATEGORIES.map(c => (
                    <option key={c.id} value={c.id}>{c.label}</option>
                  ))}
                </select>
              </div>

              {/* Urgency Level */}
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#374151', marginBottom: '6px' }}>
                  {t('fn.form.urgency')}
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                  {URGENCY_LEVELS.map(u => (
                    <button
                      key={u.id}
                      type="button"
                      onClick={() => setUrgency(u.id)}
                      style={{
                        padding: '10px 8px',
                        borderRadius: '8px',
                        border: urgency === u.id ? `2px solid ${u.color}` : '1px solid #E5E7EB',
                        backgroundColor: urgency === u.id ? u.bg : '#FFFFFF',
                        color: urgency === u.id ? u.color : '#4B5563',
                        fontSize: '0.82rem',
                        fontWeight: urgency === u.id ? 700 : 500,
                        cursor: 'pointer',
                        textAlign: 'center'
                      }}
                    >
                      {u.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Note */}
              <div style={{ marginBottom: '24px' }}>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#374151', marginBottom: '6px' }}>
                  {t('fn.form.note')}
                </label>
                <input
                  type="text"
                  placeholder={t('fn.form.notePh')}
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  style={{
                    width: '100%',
                    height: '42px',
                    borderRadius: '8px',
                    border: '1px solid #D1D5DB',
                    padding: '0 12px',
                    fontSize: '0.9rem',
                    boxSizing: 'border-box',
                    outline: 'none'
                  }}
                />
              </div>

              {/* Actions */}
              <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  disabled={submitting}
                  style={{
                    height: '40px',
                    padding: '0 18px',
                    borderRadius: '8px',
                    border: '1px solid #D1D5DB',
                    backgroundColor: '#FFFFFF',
                    color: '#374151',
                    fontWeight: 500,
                    cursor: 'pointer'
                  }}
                >
                  {t('fn.form.cancel')}
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  style={{
                    height: '40px',
                    padding: '0 20px',
                    borderRadius: '8px',
                    border: 'none',
                    backgroundColor: '#D97706',
                    color: '#FFFFFF',
                    fontWeight: 600,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}
                >
                  {submitting && <Loader className="spin" size={16} />}
                  {t('fn.form.save')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <Dialog open={Boolean(toDelete)} onClose={() => setToDelete(null)} title={toDelete ? t('fn.del.title', { name: toDelete.item_name }) : ''}>
        <p>{t('fn.del.text')}</p>
        <div className="ui-dialog__actions">
          <Button variant="secondary" onClick={() => setToDelete(null)}>{t('fnd.back')}</Button>
          <Button variant="danger" onClick={handleDelete}>{t('fn.del.confirm')}</Button>
        </div>
      </Dialog>
    </div>
  );
}
