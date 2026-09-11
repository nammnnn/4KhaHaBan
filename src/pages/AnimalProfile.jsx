import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ChevronLeft, MapPin, CheckCircle, Heart, Loader } from 'lucide-react';
import { api } from '../services/api';
import { useAppContext } from '../context/AppContext';
import { AnimalProfileSkeleton } from '../components/Skeletons';

import './AnimalProfileBento.css';

import { calculateDistance, formatDistance, getUserCoordinates } from '../lib/geo';

function AnimalProfile() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { addMatch } = useAppContext();
  
  const [animal, setAnimal] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isMatchSubmitting, setIsMatchSubmitting] = useState(false);

  useEffect(() => {
    const fetchAnimal = async () => {
      try {
        const data = await api.getAnimalById(id);
        const coords = await getUserCoordinates(true);
        let distFormatted = data.distance;
        if (data.latitude && data.longitude && coords) {
          const distKm = calculateDistance(coords.latitude, coords.longitude, data.latitude, data.longitude);
          distFormatted = formatDistance(distKm);
        }
        setAnimal({ ...data, distance: distFormatted });
      } catch (err) {
        setError('ไม่พบข้อมูลสัตว์ที่คุณกำลังค้นหา');
      } finally {
        setLoading(false);
      }
    };
    
    fetchAnimal();
  }, [id]);

  const handleAdopt = async () => {
    setIsMatchSubmitting(true);
    await addMatch(id);
    setIsMatchSubmitting(false);
    navigate('/matches');
  };

  if (loading) {
    return (
      <div className="page-container" style={{ padding: '16px' }}>
        <AnimalProfileSkeleton />
      </div>
    );
  }

  if (error || !animal) {
    return (
      <div className="page-container" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
        <p>{error || 'เกิดข้อผิดพลาด'}</p>
        <button className="btn btn-secondary" onClick={() => navigate('/')} style={{ marginTop: '20px' }}>
          กลับสู่หน้าหลัก
        </button>
      </div>
    );
  }

  return (
    <div className="animal-profile-page">
      <div className="animal-bento-container">
        {/* Hero Section */}
        <div className="animal-hero-bento">
          <button aria-label="Go back" className="animal-hero-back" onClick={() => navigate(-1)}>
            <ChevronLeft size={28} />
          </button>
          <img loading="lazy" src={animal.images[0]} alt={animal.name} />
        </div>

        {/* Bento Grid */}
        <div className="animal-bento-grid">
          
          {/* Main Title & Location (Span Full on Mobile, 2 on Desktop) */}
          <div className="animal-bento-card bento-col-span-2">
            <h1 className="animal-bento-title">{animal.name}, {animal.age}</h1>
            <p className="animal-bento-subtitle"><MapPin size={18} color="var(--primary)" /> {animal.shelter || 'ศูนย์พักพิงสัตว์'}{animal.distance ? ` (${animal.distance})` : ''}</p>
          </div>

          {/* Gender */}
          <div className="animal-bento-card">
            <span className="bento-stat-label">เพศ</span>
            <span className="bento-stat-value">
              {animal.gender === 'female' ? 'เพศเมีย' : 'เพศผู้'}
            </span>
          </div>

          {/* Size / Type */}
          <div className="animal-bento-card">
            <span className="bento-stat-label">ประเภทและขนาด</span>
            <span className="bento-stat-value">
              {animal.type === 'dog' ? 'สุนัข' : 'แมว'} • {animal.size}
            </span>
          </div>

          {/* Health & Personality Tags */}
          <div className="animal-bento-card bento-col-span-full">
            <span className="bento-stat-label" style={{ marginBottom: '12px' }}>ลักษณะนิสัย & สุขภาพ</span>
            <div className="bento-tags">
              {animal.tags.map(tag => (
                <span key={tag} className="bento-tag"><CheckCircle size={16} /> {tag}</span>
              ))}
            </div>
          </div>

          {/* Story Section */}
          <div className="animal-bento-card bento-col-span-full">
            <span className="bento-stat-label" style={{ marginBottom: '12px' }}>เรื่องราวของ {animal.name}</span>
            <p className="bento-story-text">{animal.story}</p>
          </div>

          {/* Location Map Preview */}
          {animal.latitude && animal.longitude && (
            <div className="animal-bento-card bento-col-span-full">
              <span className="bento-stat-label" style={{ marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <MapPin size={16} color="var(--primary)" /> แผนที่ที่ตั้ง ({animal.shelter || 'ศูนย์พักพิงสัตว์'})
              </span>
              <div style={{ borderRadius: '12px', overflow: 'hidden', border: '1px solid var(--gray-200)' }}>
                <iframe
                  title="Shelter Location Map"
                  width="100%"
                  height="180"
                  style={{ border: 0, display: 'block' }}
                  loading="lazy"
                  src={`https://maps.google.com/maps?q=${animal.latitude},${animal.longitude}&z=15&output=embed`}
                />
              </div>
            </div>
          )}
          
        </div>
      </div>

      {/* Floating Action Button */}
      <div className="bento-floating-action">
        <button 
          className="bento-pill-btn" 
          onClick={handleAdopt}
          disabled={isMatchSubmitting}
        >
          {isMatchSubmitting ? (
            <><Loader className="spin" size={24} /> กำลังส่งคำขอ...</>
          ) : (
            <><Heart size={24} fill="#fff" /> สนใจรับเลี้ยง ส่งคำขอทันที</>
          )}
        </button>
      </div>
    </div>
  );
}

export default AnimalProfile;
