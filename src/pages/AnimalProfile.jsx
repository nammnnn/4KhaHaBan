import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  ChevronLeft, 
  ChevronRight, 
  MapPin, 
  Heart, 
  CheckCircle2, 
  Sparkles, 
  FileText, 
  Share2, 
  Check, 
  Loader, 
  Navigation, 
  ExternalLink, 
  Building2, 
  Camera, 
  MessageCircle 
} from 'lucide-react';
import { api } from '../services/api';
import { useAppContext } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';
import { AnimalProfileSkeleton } from '../components/Skeletons';
import { calculateDistance, formatDistance, getUserCoordinates } from '../lib/geo';

import './AnimalProfileBento.css';

function AnimalProfile() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { matches, addMatch } = useAppContext();
  const { user } = useAuth();
  
  const [animal, setAnimal] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isMatchSubmitting, setIsMatchSubmitting] = useState(false);
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [copied, setCopied] = useState(false);

  // ตรวจสอบว่าผู้ใช้เคย Match หรือส่งคำขอรับเลี้ยงสัตว์ตัวนี้ไว้แล้วหรือไม่
  const existingMatch = matches?.find(m => m.animalId === id || m.animal_id === id);

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
    if (!user) {
      navigate('/login');
      return;
    }
    try {
      setIsMatchSubmitting(true);
      await addMatch(id, user.id);
      navigate('/matches');
    } catch (err) {
      console.error('Failed to submit adoption match:', err);
    } finally {
      setIsMatchSubmitting(false);
    }
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: `${animal?.name || 'น้องสัตว์'} กำลังหาบ้าน - 4 ขาหาบ้าน`,
          text: `มารับเลี้ยง ${animal?.name || 'น้อง'} ที่กำลังหาบ้านอบอุ่นกันเถอะ`,
          url: window.location.href,
        });
        return;
      } catch (err) {
        // ผู้ใช้กดยกเลิก share sheet
      }
    }
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch (e) {
      // Fallback
    }
  };

  const formatGender = (gender) => {
    if (!gender) return 'ไม่ระบุ';
    const g = String(gender).toLowerCase();
    if (g === 'female' || g === 'เพศเมีย' || g === 'เมีย') return 'เพศเมีย';
    if (g === 'male' || g === 'เพศผู้' || g === 'ผู้') return 'เพศผู้';
    return gender;
  };

  const formatType = (type) => {
    if (!type) return 'สัตว์เลี้ยง';
    const t = String(type).toLowerCase();
    if (t === 'dog' || t === 'สุนัข' || t === 'หมา') return 'สุนัข';
    if (t === 'cat' || t === 'แมว') return 'แมว';
    return type;
  };

  const formatSize = (size) => {
    if (!size) return 'ขนาดกลาง';
    const s = String(size).toLowerCase();
    if (s === 'small' || s === 'เล็ก') return 'ขนาดเล็ก';
    if (s === 'large' || s === 'ใหญ่') return 'ขนาดใหญ่';
    return 'ขนาดกลาง';
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
      <div className="page-container" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', padding: '24px', textAlign: 'center' }}>
        <p style={{ color: 'var(--text-medium, #374151)', fontSize: '1.1rem', marginBottom: '16px' }}>
          {error || 'เกิดข้อผิดพลาดในการโหลดข้อมูล'}
        </p>
        <button className="btn btn-secondary" onClick={() => navigate('/')}>
          กลับสู่หน้าหลัก
        </button>
      </div>
    );
  }

  const images = animal.images && Array.isArray(animal.images) && animal.images.length > 0
    ? animal.images
    : [animal.image_url || 'https://images.unsplash.com/photo-1543466835-00a7907e9de1'];

  const renderShelterCard = (isDesktop = false) => (
    <div className={`animal-shelter-card ${isDesktop ? 'desktop-only' : 'mobile-only'}`}>
      <div className="shelter-card-header">
        <div className="shelter-info-text">
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px', color: 'var(--primary, #D97706)', fontSize: '0.82rem', fontWeight: 600 }}>
            <Building2 size={16} /> ศูนย์พักพิงที่ดูแล
          </div>
          <h3>{animal.shelter || 'ศูนย์พักพิงสัตว์ 4 ขาหาบ้าน'}</h3>
          <p style={{ display: 'flex', alignItems: 'center', gap: '4px', marginTop: '4px' }}>
            <MapPin size={14} color="var(--primary, #D97706)" />
            {animal.distance ? `ห่างจากคุณประมาณ ${animal.distance}` : 'อยู่ในพื้นที่บริการ'}
          </p>
        </div>
      </div>

      {animal.latitude && animal.longitude && (
        <a
          href={`https://www.google.com/maps/dir/?api=1&destination=${animal.latitude},${animal.longitude}`}
          target="_blank"
          rel="noopener noreferrer"
          className="btn-open-maps"
        >
          <Navigation size={15} /> นำทางด้วย Google Maps
          <ExternalLink size={13} style={{ marginLeft: 'auto' }} />
        </a>
      )}
    </div>
  );

  const renderAdoptButton = () => (
    <button 
      type="button" 
      className="btn-adopt-primary" 
      onClick={existingMatch ? () => navigate(existingMatch.id ? `/chat/${existingMatch.id}` : '/matches') : handleAdopt}
      disabled={isMatchSubmitting}
    >
      {isMatchSubmitting ? (
        <><Loader className="spin" size={20} /> กำลังส่งคำขอรับเลี้ยง...</>
      ) : existingMatch ? (
        <><MessageCircle size={20} /> คุณจับคู่แล้ว • เปิดห้องแชท</>
      ) : (
        <><Heart size={20} fill="#FFFFFF" /> สนใจรับเลี้ยง ส่งคำขอทันที</>
      )}
    </button>
  );

  return (
    <div className="animal-profile-page">
      {/* Top Navbar */}
      <header className="animal-profile-navbar">
        <div className="animal-profile-navbar-inner">
          <button 
            type="button" 
            className="animal-nav-back-btn" 
            onClick={() => navigate(-1)}
            title="ย้อนกลับ"
          >
            <ChevronLeft size={20} />
            <span>ย้อนกลับ</span>
          </button>

          <div className="animal-nav-actions">
            <button 
              type="button" 
              className="animal-nav-icon-btn"
              onClick={handleShare}
              title="แชร์โปรไฟล์นี้"
            >
              {copied ? <Check size={18} color="var(--success, #059669)" /> : <Share2 size={18} />}
            </button>
          </div>
        </div>
        {copied && (
          <div className="share-toast">
            <Check size={14} /> คัดลอกลิงก์โปรไฟล์เรียบร้อยแล้ว
          </div>
        )}
      </header>

      {/* Main Container */}
      <main className="animal-profile-main">
        <div className="animal-profile-grid">
          
          {/* Left Column: Visual Gallery & Shelter Card */}
          <div className="animal-profile-col-media">
            <div className="animal-gallery-showcase">
              <img 
                src={images[activeImageIndex]} 
                alt={animal.name} 
                className="animal-gallery-main-img" 
              />

              {/* Status Badge */}
              <div className="animal-status-badge">
                <span className="status-dot"></span>
                กำลังหาบ้าน
              </div>

              {/* Image Carousel Navigation */}
              {images.length > 1 && (
                <>
                  <button 
                    type="button" 
                    className="gallery-nav-arrow left"
                    onClick={() => setActiveImageIndex(prev => (prev === 0 ? images.length - 1 : prev - 1))}
                    aria-label="รูปก่อนหน้า"
                  >
                    <ChevronLeft size={20} />
                  </button>
                  <button 
                    type="button" 
                    className="gallery-nav-arrow right"
                    onClick={() => setActiveImageIndex(prev => (prev === images.length - 1 ? 0 : prev + 1))}
                    aria-label="รูปถัดไป"
                  >
                    <ChevronRight size={20} />
                  </button>
                  <div className="gallery-counter-badge">
                    <Camera size={13} /> {activeImageIndex + 1} / {images.length}
                  </div>
                </>
              )}
            </div>

            {/* Thumbnails Row */}
            {images.length > 1 && (
              <div className="animal-thumbnails-row">
                {images.map((img, idx) => (
                  <button
                    key={idx}
                    type="button"
                    className={`animal-thumbnail-btn ${activeImageIndex === idx ? 'active' : ''}`}
                    onClick={() => setActiveImageIndex(idx)}
                    title={`ดูรูปที่ ${idx + 1}`}
                  >
                    <img src={img} alt={`${animal.name} รูปที่ ${idx + 1}`} />
                  </button>
                ))}
              </div>
            )}

            {/* Shelter Card on Desktop */}
            {renderShelterCard(true)}
          </div>

          {/* Right Column: Information, Story & Adoption Actions */}
          <div className="animal-profile-col-info">
            {/* Header: Name, Age, Distance */}
            <div className="animal-info-header">
              <div className="animal-title-row">
                <h1 className="animal-name">{animal.name}</h1>
                <span className="animal-age-tag">• {animal.age}</span>
              </div>

              <div className="animal-location-row">
                <MapPin size={16} color="var(--primary, #D97706)" />
                <span className="shelter-name">{animal.shelter || 'ศูนย์พักพิงสัตว์'}</span>
                {animal.distance && (
                  <span className="distance-badge">{animal.distance}</span>
                )}
              </div>
            </div>

            {/* Quick Specs Grid */}
            <div className="animal-specs-grid">
              <div className="spec-item">
                <span className="spec-label">เพศ</span>
                <span className="spec-value">{formatGender(animal.gender)}</span>
              </div>
              <div className="spec-item">
                <span className="spec-label">ประเภท</span>
                <span className="spec-value">{formatType(animal.type)}</span>
              </div>
              <div className="spec-item">
                <span className="spec-label">ขนาดตัว</span>
                <span className="spec-value">{formatSize(animal.size)}</span>
              </div>
              <div className="spec-item">
                <span className="spec-label">สายพันธุ์</span>
                <span className="spec-value">{animal.breed || 'พันธุ์ทาง / ผสม'}</span>
              </div>
            </div>

            {/* Personality & Health Tags */}
            {animal.tags && animal.tags.length > 0 && (
              <div className="animal-section-card">
                <h2 className="section-title">
                  <Sparkles size={18} color="var(--primary, #D97706)" /> ลักษณะนิสัยและสุขภาพ
                </h2>
                <div className="animal-tags-list">
                  {animal.tags.map(tag => (
                    <span key={tag} className="animal-pill-tag">
                      <CheckCircle2 size={15} /> {tag}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Story / Backstory */}
            <div className="animal-section-card">
              <h2 className="section-title">
                <FileText size={18} color="var(--primary, #D97706)" /> เรื่องราวของ {animal.name}
              </h2>
              <div className="animal-story-content">
                <p>{animal.story || `ยังไม่มีข้อมูลเรื่องราวเพิ่มเติมสำหรับ ${animal.name}`}</p>
              </div>
            </div>

            {/* Shelter Card on Mobile */}
            {renderShelterCard(false)}

            {/* Desktop Embedded CTA Box (Never overlaps or floats awkwardly!) */}
            <div className="animal-desktop-cta-box">
              <div className="cta-box-header">
                <h3>สนใจรับเลี้ยง {animal.name} หรือไม่?</h3>
                <p>
                  {existingMatch 
                    ? 'คุณได้จับคู่กับน้องแล้ว สามารถเปิดห้องแชทเพื่อพูดคุยและส่งแบบฟอร์มรับเลี้ยงได้ตลอดเวลา' 
                    : 'เมื่อกดสนใจรับเลี้ยง ระบบจะส่งคำขอและเปิดห้องแชทให้คุณพูดคุยกับศูนย์พักพิงสัตว์โดยตรง'}
                </p>
              </div>
              {renderAdoptButton()}
            </div>

          </div>
        </div>
      </main>

      {/* Mobile Fixed Bottom Dock */}
      <div className="animal-mobile-bottom-dock">
        {renderAdoptButton()}
      </div>
    </div>
  );
}

export default AnimalProfile;
