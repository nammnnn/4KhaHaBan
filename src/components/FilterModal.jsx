import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, SlidersHorizontal, MapPin, Search } from 'lucide-react';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import './FilterModal.css';

export function FilterModal({ isOpen, onClose, onApply, currentFilters }) {
  const { user } = useAuth();
  
  const [maxDistance, setMaxDistance] = useState(50);
  const [animalType, setAnimalType] = useState('all');
  const [gender, setGender] = useState('all');

  useEffect(() => {
    if (isOpen && currentFilters) {
      setMaxDistance(currentFilters.maxDistance || 50);
      setAnimalType(currentFilters.animalType || 'all');
      setGender(currentFilters.gender || 'all');
    }
  }, [isOpen, currentFilters]);

  const handleApply = async () => {
    const newFilters = { maxDistance, animalType, gender };
    await api.updateUserPreferences(user?.id, newFilters);
    onApply(newFilters);
    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div 
          className="filter-modal-overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2, ease: 'easeOut' }}
          onClick={onClose}
        >
          <motion.div 
            className="filter-modal-content"
            initial={{ opacity: 0, scale: 0.96, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 8 }}
            transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="filter-modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <SlidersHorizontal size={20} color="var(--primary)" />
                <h2 style={{ margin: 0, fontSize: '1.2rem', color: 'var(--text-dark)' }}>ตั้งค่าการค้นหา</h2>
              </div>
              <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px' }}>
                <X size={24} color="var(--text-medium)" />
              </button>
            </div>

            <div className="filter-modal-body">
              {/* Distance Filter */}
              <div className="filter-section">
                <div className="filter-section-header">
                  <label><MapPin size={16} /> ระยะทางสูงสุด</label>
                  <span className="filter-value">{maxDistance} กม.</span>
                </div>
                <input 
                  type="range" 
                  min="1" 
                  max="50" 
                  value={maxDistance} 
                  onChange={(e) => setMaxDistance(parseInt(e.target.value))}
                  className="range-slider"
                />
                <div className="range-labels">
                  <span>1 กม.</span>
                  <span>50 กม.</span>
                </div>
              </div>

              {/* Type Filter */}
              <div className="filter-section">
                <div className="filter-section-header">
                  <label>ชนิดสัตว์</label>
                </div>
                <div className="segment-control">
                  <button 
                    className={animalType === 'all' ? 'active' : ''} 
                    onClick={() => setAnimalType('all')}
                  >ทั้งหมด</button>
                  <button 
                    className={animalType === 'dog' ? 'active' : ''} 
                    onClick={() => setAnimalType('dog')}
                  >สุนัข</button>
                  <button 
                    className={animalType === 'cat' ? 'active' : ''} 
                    onClick={() => setAnimalType('cat')}
                  >แมว</button>
                </div>
              </div>

              {/* Gender Filter */}
              <div className="filter-section">
                <div className="filter-section-header">
                  <label>เพศ</label>
                </div>
                <div className="segment-control">
                  <button 
                    className={gender === 'all' ? 'active' : ''} 
                    onClick={() => setGender('all')}
                  >ทั้งหมด</button>
                  <button 
                    className={gender === 'male' ? 'active' : ''} 
                    onClick={() => setGender('male')}
                  >ตัวผู้</button>
                  <button 
                    className={gender === 'female' ? 'active' : ''} 
                    onClick={() => setGender('female')}
                  >ตัวเมีย</button>
                </div>
              </div>
            </div>

            <div className="filter-modal-footer">
              <button className="btn btn-primary" style={{ width: '100%', padding: '14px', fontSize: '1rem', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px' }} onClick={handleApply}>
                <Search size={18} /> ค้นหาเลย
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
