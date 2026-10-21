import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, SlidersHorizontal, MapPin, Search, Check } from 'lucide-react';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import './FilterModal.css';
import { useI18n } from '../i18n';
import { FILTERABLE_TAG_IDS, tagById } from '../lib/tags';

export function FilterModal({ isOpen, onClose, onApply, currentFilters, hasLocation, onSetLocation, tagCounts }) {
  const { user } = useAuth();
  const { t, lang } = useI18n();
  
  const [maxDistance, setMaxDistance] = useState(100);
  const [animalType, setAnimalType] = useState('all');
  const [gender, setGender] = useState('all');
  const [living, setLiving] = useState([]); // standard tag ids, all must match

  useEffect(() => {
    if (isOpen && currentFilters) {
      setMaxDistance(currentFilters.maxDistance || 100);
      setAnimalType(currentFilters.animalType || 'all');
      setGender(currentFilters.gender || 'all');
      setLiving(currentFilters.living || []);
    }
  }, [isOpen, currentFilters]);

  // Without counts (e.g. before the first load) show every option
  const lifestyleIds = FILTERABLE_TAG_IDS.filter((id) => !tagCounts || tagCounts[id] === undefined || tagCounts[id] > 0 || living.includes(id));

  const handleApply = async () => {
    const newFilters = { maxDistance, animalType, gender, living };
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
                <h2 style={{ margin: 0, fontSize: '1.2rem', color: 'var(--text-dark)' }}>{t('filters.title')}</h2>
              </div>
              <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px' }}>
                <X size={24} color="var(--text-medium)" />
              </button>
            </div>

            <div className="filter-modal-body">
              {/* Distance Filter */}
              <div className="filter-section">
                <div className="filter-section-header">
                  <label><MapPin size={16} /> {t('filters.maxDistance')}</label>
                  <span className="filter-value">{maxDistance >= 300 ? t('filters.anyDistance') : t('filters.km', { n: maxDistance })}</span>
                </div>
                <input
                  type="range"
                  min="5"
                  max="300"
                  step="5"
                  value={maxDistance}
                  onChange={(e) => setMaxDistance(parseInt(e.target.value))}
                  className="range-slider"
                  disabled={!hasLocation}
                  aria-label={t('filters.maxDistance')}
                />
                <div className="range-labels">
                  <span>{t('filters.km', { n: 5 })}</span>
                  <span>{t('filters.km', { n: 150 })}</span>
                  <span>{t('filters.nationwide')}</span>
                </div>
                {!hasLocation && (
                  <div className="filter-location-hint">
                    <span>{t('feed.locationUnknown')}</span>
                    {onSetLocation && (
                      <button type="button" onClick={onSetLocation}>{t('feed.setLocation')}</button>
                    )}
                  </div>
                )}
              </div>

              {/* Type Filter */}
              <div className="filter-section">
                <div className="filter-section-header">
                  <label>{t('filters.animalType')}</label>
                </div>
                <div className="segment-control">
                  <button 
                    className={animalType === 'all' ? 'active' : ''} 
                    onClick={() => setAnimalType('all')}
                  >{t('filters.all')}</button>
                  <button 
                    className={animalType === 'dog' ? 'active' : ''} 
                    onClick={() => setAnimalType('dog')}
                  >{t('animal.dog')}</button>
                  <button 
                    className={animalType === 'cat' ? 'active' : ''} 
                    onClick={() => setAnimalType('cat')}
                  >{t('animal.cat')}</button>
                </div>
              </div>

              {/* Gender Filter */}
              <div className="filter-section">
                <div className="filter-section-header">
                  <label>{t('animal.gender')}</label>
                </div>
                <div className="segment-control">
                  <button 
                    className={gender === 'all' ? 'active' : ''} 
                    onClick={() => setGender('all')}
                  >{t('filters.all')}</button>
                  <button 
                    className={gender === 'male' ? 'active' : ''} 
                    onClick={() => setGender('male')}
                  >{t('animal.male')}</button>
                  <button 
                    className={gender === 'female' ? 'active' : ''} 
                    onClick={() => setGender('female')}
                  >{t('animal.female')}</button>
                </div>
              </div>
            </div>

            {/* Living — standard tags (DESIGN.md §7.19). Options no animal has yet are hidden,
                so people don't filter themselves into an empty deck. */}
            {lifestyleIds.length > 0 && (
            <div className="filter-section">
              <div className="filter-section-header">
                <label>{t('filters.living')}</label>
              </div>
              <p className="filter-hint">{t('filters.livingHint')}</p>
              <div className="filter-chips">
                {lifestyleIds.map((id) => {
                  const tag = tagById(id);
                  const on = living.includes(id);
                  return (
                    <button
                      key={id}
                      type="button"
                      className="ui-chip"
                      aria-pressed={on}
                      onClick={() => setLiving(on ? living.filter((x) => x !== id) : [...living, id])}
                    >
                      {on && <Check size={16} aria-hidden="true" />}
                      {lang === 'en' ? tag.en : tag.th}
                    </button>
                  );
                })}
              </div>
            </div>
            )}

            <div className="filter-modal-footer">
              <button className="btn btn-primary" style={{ width: '100%', padding: '14px', fontSize: '1rem', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px' }} onClick={handleApply}>
                <Search size={18} /> {t('filters.search')}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
