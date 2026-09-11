import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../services/supabaseClient';
import { PlusCircle, Search, Edit2, Trash2, ChevronLeft, Loader2, Image as ImageIcon } from 'lucide-react';
import { FoundationAnimalsSkeleton } from '../components/Skeletons';

const FoundationAnimals = () => {
  const { user } = useAuth();
  const [animals, setAnimals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all'); // all, available, adopted

  useEffect(() => {
    if (user && supabase) {
      fetchAnimals();
    } else {
      setLoading(false);
    }
  }, [user]);

  const fetchAnimals = async () => {
    try {
      const { data, error } = await supabase
        .from('animals')
        .select('*')
        .eq('foundation_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setAnimals(data || []);
    } catch (error) {
      console.error('[Animals] Error fetching animals:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('คุณแน่ใจหรือไม่ว่าต้องการลบข้อมูลสัตว์ตัวนี้?')) return;

    try {
      const { error } = await supabase
        .from('animals')
        .delete()
        .eq('id', id);

      if (error) throw error;
      setAnimals(prev => prev.filter(a => a.id !== id));
    } catch (error) {
      console.error('[Animals] Error deleting animal:', error);
      alert('ไม่สามารถลบได้ กรุณาลองใหม่อีกครั้ง');
    }
  };

  const handleStatusChange = async (id, newStatus) => {
    try {
      const { error } = await supabase
        .from('animals')
        .update({ status: newStatus })
        .eq('id', id);

      if (error) throw error;
      setAnimals(prev => prev.map(a => a.id === id ? { ...a, status: newStatus } : a));
    } catch (error) {
      console.error('[Animals] Error updating status:', error);
      alert('ไม่สามารถเปลี่ยนสถานะได้ กรุณาลองใหม่อีกครั้ง');
    }
  };

  // Filter animals
  const filteredAnimals = animals.filter(a => {
    const matchSearch = a.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchStatus = statusFilter === 'all' || a.status === statusFilter;
    return matchSearch && matchStatus;
  });

  return (
    <div style={{
      minHeight: '100dvh',
      backgroundColor: '#FAF8F5',
      fontFamily: 'Prompt, sans-serif',
      padding: '32px 16px 100px',
      boxSizing: 'border-box'
    }}>
      <div style={{ maxWidth: '820px', margin: '0 auto' }}>
        
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
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
                justifyContent: 'center',
                alignItems: 'center',
                color: '#374151',
                textDecoration: 'none',
                transition: 'background-color 0.15s'
              }}
              onMouseEnter={e => e.currentTarget.style.backgroundColor = '#F9FAFB'}
              onMouseLeave={e => e.currentTarget.style.backgroundColor = '#FFFFFF'}
            >
              <ChevronLeft size={20} />
            </Link>
            <div>
              <h1 style={{ margin: 0, fontSize: '1.45rem', fontWeight: 700, color: '#111827' }}>
                สัตว์ในดูแลทั้งหมด
              </h1>
              <p style={{ margin: 0, fontSize: '0.82rem', color: '#6B7280' }}>
                รวม {animals.length} ตัวในการดูแลของคุณ
              </p>
            </div>
          </div>
          
          <Link
            to="/foundation/animals/new"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              backgroundColor: '#D97706',
              color: '#FFFFFF',
              textDecoration: 'none',
              padding: '0 16px',
              height: '42px',
              borderRadius: '8px',
              fontWeight: 600,
              fontSize: '0.875rem',
              boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
              transition: 'background-color 0.15s'
            }}
            onMouseEnter={e => e.currentTarget.style.backgroundColor = '#B45309'}
            onMouseLeave={e => e.currentTarget.style.backgroundColor = '#D97706'}
          >
            <PlusCircle size={18} />
            <span>เพิ่มสัตว์หาบ้าน</span>
          </Link>
        </div>

        {/* Filters */}
        <div style={{ display: 'flex', gap: '12px', marginBottom: '20px', flexWrap: 'wrap' }}>
          {/* Search */}
          <div style={{ flex: '1 1 240px', position: 'relative' }}>
            <Search size={18} style={{ position: 'absolute', left: '12px', top: '12px', color: '#9CA3AF' }} />
            <input
              type="text"
              placeholder="ค้นหาชื่อสัตว์เลี้ยง..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                width: '100%',
                height: '42px',
                padding: '0 14px 0 38px',
                borderRadius: '8px',
                border: '1px solid #D1D5DB',
                backgroundColor: '#FFFFFF',
                fontFamily: 'inherit',
                fontSize: '0.9rem',
                color: '#111827',
                outline: 'none',
                boxSizing: 'border-box',
                transition: 'border-color 0.15s, box-shadow 0.15s'
              }}
              onFocus={e => {
                e.target.style.borderColor = '#D97706';
                e.target.style.boxShadow = '0 0 0 3px rgba(217, 119, 6, 0.12)';
              }}
              onBlur={e => {
                e.target.style.borderColor = '#D1D5DB';
                e.target.style.boxShadow = 'none';
              }}
            />
          </div>

          {/* Status Filter Tabs */}
          <div style={{
            display: 'flex',
            gap: '4px',
            backgroundColor: '#F3F4F6',
            borderRadius: '8px',
            padding: '3px'
          }}>
            {[
              { id: 'all', label: 'ทั้งหมด' },
              { id: 'available', label: 'กำลังหาบ้าน' },
              { id: 'adopted', label: 'ได้บ้านแล้ว' }
            ].map(f => (
              <button
                key={f.id}
                onClick={() => setStatusFilter(f.id)}
                style={{
                  padding: '0 14px',
                  height: '36px',
                  borderRadius: '6px',
                  border: 'none',
                  whiteSpace: 'nowrap',
                  cursor: 'pointer',
                  fontWeight: statusFilter === f.id ? 600 : 500,
                  fontSize: '0.82rem',
                  backgroundColor: statusFilter === f.id ? '#FFFFFF' : 'transparent',
                  color: statusFilter === f.id ? '#111827' : '#6B7280',
                  boxShadow: statusFilter === f.id ? '0 1px 2px rgba(0,0,0,0.05)' : 'none',
                  transition: 'all 0.15s'
                }}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {/* Animal List */}
        {loading ? (
          <FoundationAnimalsSkeleton />
        ) : filteredAnimals.length === 0 ? (
          <div style={{
            textAlign: 'center',
            padding: '56px 20px',
            backgroundColor: '#FFFFFF',
            borderRadius: '16px',
            border: '1px solid #E5E7EB',
            boxShadow: '0 1px 3px rgba(0,0,0,0.02)'
          }}>
            <div style={{
              width: '48px',
              height: '48px',
              borderRadius: '12px',
              backgroundColor: '#F3F4F6',
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              margin: '0 auto 12px',
              color: '#9CA3AF'
            }}>
              <Search size={24} />
            </div>
            <h3 style={{ margin: '0 0 4px', color: '#111827', fontSize: '1rem', fontWeight: 600 }}>ไม่พบข้อมูลสัตว์เลี้ยง</h3>
            <p style={{ margin: 0, color: '#6B7280', fontSize: '0.85rem' }}>
              ลองค้นหาด้วยคำอื่น หรือกดปุ่ม "เพิ่มสัตว์หาบ้าน" เพื่อสร้างโปรไฟล์ใหม่
            </p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {filteredAnimals.map(animal => (
              <div
                key={animal.id}
                style={{
                  backgroundColor: '#FFFFFF',
                  borderRadius: '12px',
                  padding: '16px',
                  border: '1px solid #E5E7EB',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
                  display: 'flex',
                  gap: '16px',
                  alignItems: 'center',
                  flexWrap: 'wrap'
                }}
              >
                {/* Image Thumbnail */}
                <div style={{
                  width: '72px',
                  height: '72px',
                  borderRadius: '8px',
                  backgroundColor: '#F3F4F6',
                  flexShrink: 0,
                  overflow: 'hidden',
                  position: 'relative'
                }}>
                  {animal.images && animal.images.length > 0 ? (
                    <img src={animal.images[0]} alt={animal.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  ) : (
                    <div style={{ width: '100%', height: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center', color: '#9CA3AF' }}>
                      <ImageIcon size={24} />
                    </div>
                  )}
                </div>

                {/* Info */}
                <div style={{ flex: '1 1 200px', minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                    <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 700, color: '#111827', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {animal.name}
                    </h3>
                    <span style={{
                      padding: '2px 8px',
                      borderRadius: '6px',
                      fontSize: '0.72rem',
                      fontWeight: 600,
                      backgroundColor: animal.status === 'available' ? '#FEF3C7' : animal.status === 'adopted' ? '#DCFCE7' : '#F3F4F6',
                      color: animal.status === 'available' ? '#B45309' : animal.status === 'adopted' ? '#15803D' : '#4B5563',
                      border: `1px solid ${animal.status === 'available' ? '#FCD34D' : animal.status === 'adopted' ? '#86EFAC' : '#D1D5DB'}`
                    }}>
                      {animal.status === 'available' ? 'กำลังหาบ้าน' : animal.status === 'adopted' ? 'ได้บ้านแล้ว' : 'ซ่อนโปรไฟล์'}
                    </span>
                  </div>
                  <p style={{ margin: '0 0 6px', fontSize: '0.82rem', color: '#6B7280' }}>
                    {animal.type === 'dog' ? 'สุนัข' : animal.type === 'cat' ? 'แมว' : 'อื่นๆ'} • {animal.age || '-'} • {animal.gender === 'male' ? 'เพศผู้' : animal.gender === 'female' ? 'เพศเมีย' : '-'}
                  </p>
                </div>

                {/* Actions */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
                  <select
                    value={animal.status}
                    onChange={(e) => handleStatusChange(animal.id, e.target.value)}
                    style={{
                      height: '36px',
                      padding: '0 12px',
                      borderRadius: '8px',
                      border: animal.status === 'available' 
                        ? '1.5px solid #FCD34D' 
                        : animal.status === 'adopted' 
                        ? '1.5px solid #86EFAC' 
                        : '1.5px solid #D1D5DB',
                      backgroundColor: animal.status === 'available' 
                        ? '#FEF3C7' 
                        : animal.status === 'adopted' 
                        ? '#DCFCE7' 
                        : '#F3F4F6',
                      color: animal.status === 'available' 
                        ? '#B45309' 
                        : animal.status === 'adopted' 
                        ? '#15803D' 
                        : '#4B5563',
                      fontFamily: 'inherit',
                      fontSize: '0.82rem',
                      fontWeight: 700,
                      outline: 'none',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease',
                      boxShadow: '0 1px 2px rgba(0,0,0,0.04)'
                    }}
                  >
                    <option value="available" style={{ backgroundColor: '#FFFFFF', color: '#B45309', fontWeight: 600 }}>
                      กำลังหาบ้าน
                    </option>
                    <option value="adopted" style={{ backgroundColor: '#FFFFFF', color: '#15803D', fontWeight: 600 }}>
                      ได้บ้านแล้ว
                    </option>
                    <option value="hidden" style={{ backgroundColor: '#FFFFFF', color: '#4B5563', fontWeight: 600 }}>
                      ซ่อนโปรไฟล์
                    </option>
                  </select>

                  <Link
                    to={`/foundation/animals/${animal.id}/edit`}
                    style={{
                      width: '36px',
                      height: '36px',
                      borderRadius: '8px',
                      border: '1px solid #D1D5DB',
                      backgroundColor: '#FFFFFF',
                      color: '#374151',
                      display: 'flex',
                      justifyContent: 'center',
                      alignItems: 'center',
                      textDecoration: 'none',
                      transition: 'background-color 0.15s'
                    }}
                    title="แก้ไขข้อมูล"
                    onMouseEnter={e => e.currentTarget.style.backgroundColor = '#F9FAFB'}
                    onMouseLeave={e => e.currentTarget.style.backgroundColor = '#FFFFFF'}
                  >
                    <Edit2 size={15} />
                  </Link>

                  <button
                    type="button"
                    onClick={() => handleDelete(animal.id)}
                    style={{
                      width: '36px',
                      height: '36px',
                      borderRadius: '8px',
                      border: '1px solid #FCA5A5',
                      backgroundColor: '#FEF2F2',
                      color: '#DC2626',
                      display: 'flex',
                      justifyContent: 'center',
                      alignItems: 'center',
                      cursor: 'pointer',
                      transition: 'background-color 0.15s'
                    }}
                    title="ลบข้อมูล"
                    onMouseEnter={e => e.currentTarget.style.backgroundColor = '#FEE2E2'}
                    onMouseLeave={e => e.currentTarget.style.backgroundColor = '#FEF2F2'}
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

      </div>
    </div>
  );
};

export default FoundationAnimals;
