import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../services/supabaseClient';
import { ChevronLeft, Save, Upload, X, Loader2, CheckCircle2, AlertCircle, MapPin, Search } from 'lucide-react';
import { searchCoordinatesFromAddress, getAddressFromCoordinates, parseCoordinatesFromText } from '../lib/geo';
import InteractiveLocationPicker from '../components/InteractiveLocationPicker';
import { FormPageSkeleton } from '../components/Skeletons';
import { useToast } from '../components/ui';
import { TagPicker } from '../components/TagPicker';
import { splitStoredTags, buildStoredTags } from '../lib/tags';
import './AnimalForm.css';

// Card photos fill ~900px-wide screens; anything much smaller looks blurry (DESIGN.md §5)
const MIN_SHARP_WIDTH = 800;

const AnimalForm = () => {
  const { id } = useParams(); // ถ้ามี id = แก้ไข, ถ้าไม่มี = สร้างใหม่
  const isEditMode = !!id;
  const navigate = useNavigate();
  const { user, profile } = useAuth();
  
  const [loading, setLoading] = useState(isEditMode);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const [foundationCoords, setFoundationCoords] = useState(null);
  const [isGettingLocation, setIsGettingLocation] = useState(false);
  const [locationSearchQuery, setLocationSearchQuery] = useState('');
  const [isSearchingLocation, setIsSearchingLocation] = useState(false);

  // ฟอร์มข้อมูล
  const [formData, setFormData] = useState({
    name: '',
    type: 'dog',
    age: '',
    gender: 'unknown',
    size: 'medium',
    story: '',
    latitude: '',
    longitude: '',
  });

  // รูปภาพ
  const [images, setImages] = useState([]); // ไฟล์ใหม่ที่กำลังจะอัปโหลด
  const [smallImages, setSmallImages] = useState({}); // preview url -> natural width (only small ones)
  const [tagIds, setTagIds] = useState([]); // standard tag ids (src/lib/tags.js)
  const [customTags, setCustomTags] = useState([]); // [{ th, en }]
  const toast = useToast();
  const [previewImages, setPreviewImages] = useState([]); // URL ของรูป (ทั้งของเดิมและที่กำลัง preview)
  const [deletedImages, setDeletedImages] = useState([]); // URL ของรูปเดิมที่ถูกกดลบ

  useEffect(() => {
    if (user && supabase) {
      // ดึงพิกัดของมูลนิธิมาเป็นค่าเริ่มต้น
      supabase
        .from('foundation_profiles')
        .select('latitude, longitude, foundation_name')
        .eq('id', user.id)
        .maybeSingle()
        .then(({ data }) => {
          if (data) {
            const fLat = data.latitude || 13.7563;
            const fLng = data.longitude || 100.5018;
            setFoundationCoords({ latitude: fLat, longitude: fLng });
            if (!isEditMode) {
              setFormData(prev => ({
                ...prev,
                latitude: prev.latitude || String(fLat),
                longitude: prev.longitude || String(fLng),
              }));
            }
          }
        })
        .catch(err => console.warn('Could not fetch foundation location:', err));
    }
  }, [user, isEditMode]);

  useEffect(() => {
    if (isEditMode && user && supabase) {
      fetchAnimal();
    }
  }, [id, user]);

  const fetchAnimal = async () => {
    try {
      const { data, error } = await supabase
        .from('animals')
        .select('*')
        .eq('id', id)
        .eq('foundation_id', user.id)
        .single();

      if (error) throw error;

      setFormData({
        name: data.name || '',
        type: data.type || 'dog',
        age: data.age || '',
        gender: data.gender || 'unknown',
        size: data.size || 'medium',
        story: data.story || '',
        latitude: data.latitude ? String(data.latitude) : '',
        longitude: data.longitude ? String(data.longitude) : '',
      });
      const storedTags = splitStoredTags(data.tags || []);
      setTagIds(storedTags.ids);
      setCustomTags(storedTags.custom);
      
      setPreviewImages(data.images || []);
    } catch (error) {
      console.error('[AnimalForm] Error fetching:', error);
      setErrorMsg('ไม่พบข้อมูลสัตว์ หรือคุณไม่มีสิทธิ์แก้ไข');
    } finally {
      setLoading(false);
    }
  };

  const handleSearchLocation = async () => {
    const query = locationSearchQuery.trim();
    if (!query) return;
    setIsSearchingLocation(true);
    setErrorMsg('');
    try {
      const geoResult = await searchCoordinatesFromAddress(query);
      if (geoResult) {
        const lat = geoResult.latitude.toFixed(6);
        const lng = geoResult.longitude.toFixed(6);

        let resolvedAddress = query;
        const parsed = parseCoordinatesFromText(query);
        if (parsed) {
          try {
            const rev = await getAddressFromCoordinates(lat, lng);
            if (rev && rev.formattedAddress) {
              resolvedAddress = rev.formattedAddress;
            }
          } catch (e) {
            console.warn('Reverse geocode error:', e);
          }
        }

        setFormData(prev => ({
          ...prev,
          latitude: lat,
          longitude: lng
        }));
        setLocationSearchQuery(resolvedAddress);
      } else {
        setErrorMsg('ไม่พบพิกัดจากสถานที่นี้ กรุณาระบุชื่อตำบล อำเภอ หรือคลิกปักหมุดบนแผนที่ได้โดยตรง');
      }
    } catch (e) {
      console.warn('Geocoding error:', e);
      setErrorMsg('เกิดข้อผิดพลาดในการค้นหาพิกัด');
    } finally {
      setIsSearchingLocation(false);
    }
  };

  const handleInteractivePinChange = async (lat, lng) => {
    setFormData(prev => ({
      ...prev,
      latitude: String(lat),
      longitude: String(lng)
    }));

    try {
      const rev = await getAddressFromCoordinates(lat, lng);
      if (rev && rev.formattedAddress) {
        setLocationSearchQuery(rev.formattedAddress);
      }
    } catch (e) {
      console.warn('Pin change reverse geocode error:', e);
    }
  };

  const handleGetCurrentLocation = () => {
    if (!navigator.geolocation) {
      setErrorMsg('เบราว์เซอร์ของคุณไม่รองรับการดึงพิกัด GPS');
      return;
    }
    setIsGettingLocation(true);
    setErrorMsg('');
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const lat = pos.coords.latitude.toFixed(6);
        const lng = pos.coords.longitude.toFixed(6);

        let resolvedAddress = '';
        try {
          const rev = await getAddressFromCoordinates(lat, lng);
          if (rev && rev.formattedAddress) {
            resolvedAddress = rev.formattedAddress;
          }
        } catch (e) {
          console.warn('Reverse geocode error:', e);
        }

        setFormData(prev => ({
          ...prev,
          latitude: lat,
          longitude: lng
        }));
        if (resolvedAddress) {
          setLocationSearchQuery(resolvedAddress);
        }
        setIsGettingLocation(false);
      },
      (err) => {
        console.warn('Geolocation error:', err);
        setErrorMsg('ไม่สามารถเข้าถึงพิกัด GPS ได้ กรุณากรอกพิกัดด้วยตนเอง หรือค้นหาจากชื่อสถานที่');
        setIsGettingLocation(false);
      },
      { enableHighAccuracy: true, timeout: 8000 }
    );
  };

  const handleFieldChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleImageSelect = (e) => {
    const files = Array.from(e.target.files);
    if (!files.length) return;

    // กรองเฉพาะรูปภาพและจำกัดขนาด 5MB
    const validFiles = files.filter(f => {
      if (!f.type.startsWith('image/')) {
        toast(`${f.name} ไม่ใช่ไฟล์รูปภาพ เลือกไฟล์ JPG หรือ PNG`, { tone: 'error' });
        return false;
      }
      if (f.size > 5 * 1024 * 1024) {
        toast(`${f.name} ใหญ่เกิน 5MB ลองเลือกรูปที่เล็กลง`, { tone: 'error' });
        return false;
      }
      return true;
    });

    setImages(prev => [...prev, ...validFiles]);
    
    // สร้าง object URL สำหรับ preview
    const newPreviews = validFiles.map(f => URL.createObjectURL(f));
    setPreviewImages(prev => [...prev, ...newPreviews]);
  };

  const removeImage = (index) => {
    const targetUrl = previewImages[index];
    
    if (targetUrl.startsWith('http')) {
      setDeletedImages(prev => [...prev, targetUrl]);
    } else {
      const newImages = [...images];
      const blobUrls = previewImages.filter(url => !url.startsWith('http'));
      const blobIndex = blobUrls.indexOf(targetUrl);
      if (blobIndex !== -1) {
        newImages.splice(blobIndex, 1);
        setImages(newImages);
      }
    }

    setPreviewImages(prev => prev.filter((_, i) => i !== index));
    setSmallImages((prev) => {
      const next = { ...prev };
      delete next[targetUrl];
      return next;
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      setErrorMsg('กรุณากรอกชื่อสัตว์เลี้ยง');
      return;
    }
    
    setSubmitting(true);
    setErrorMsg('');
    setSuccessMsg('');

    try {
      // 1. อัปโหลดรูปภาพใหม่
      const uploadedUrls = [];
      for (const file of images) {
        const fileExt = file.name.split('.').pop();
        const fileName = `${user.id}/${crypto.randomUUID()}.${fileExt}`;

        const { error: uploadError } = await supabase.storage
          .from('animal-images')
          .upload(fileName, file);

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from('animal-images')
          .getPublicUrl(fileName);
        
        uploadedUrls.push(publicUrl);
      }

      // 2. รวมรูปภาพเดิมและใหม่
      const existingUrls = previewImages.filter(url => url.startsWith('http'));
      const finalImages = [...existingUrls, ...uploadedUrls];

      // Standard tag ids first, then custom tags ("ไทย" or "ไทย||English")
      const tagsArray = buildStoredTags(tagIds, customTags);

      let shelterName = profile?.full_name || 'มูลนิธิช่วยเหลือสัตว์';
      if (supabase && user) {
        try {
          const { data: foundData } = await supabase
            .from('foundation_profiles')
            .select('foundation_name')
            .eq('id', user.id)
            .maybeSingle();
          if (foundData?.foundation_name) {
            shelterName = foundData.foundation_name;
          }
        } catch (err) {
          console.warn('Could not fetch foundation_name:', err);
        }
      }

      const finalLat = formData.latitude ? parseFloat(formData.latitude) : (foundationCoords?.latitude || 13.7563);
      const finalLng = formData.longitude ? parseFloat(formData.longitude) : (foundationCoords?.longitude || 100.5018);

      const payload = {
        foundation_id: user.id,
        name: formData.name.trim(),
        type: formData.type,
        age: formData.age.trim(),
        gender: formData.gender,
        size: formData.size,
        story: formData.story.trim(),
        tags: tagsArray,
        images: finalImages,
        shelter: shelterName,
        distance: 'ใกล้คุณ',
        latitude: finalLat,
        longitude: finalLng
      };

      if (isEditMode) {
        const { error } = await supabase
          .from('animals')
          .update(payload)
          .eq('id', id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('animals')
          .insert([{ ...payload, status: 'available' }]);
        if (error) throw error;
      }

      setSuccessMsg('บันทึกข้อมูลสัตว์เลี้ยงเรียบร้อยแล้ว');
      setTimeout(() => {
        navigate('/foundation/animals');
      }, 1200);

    } catch (error) {
      console.error('[AnimalForm] Submit error:', error);
      setErrorMsg(error.message || 'เกิดข้อผิดพลาดในการบันทึกข้อมูล');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <FormPageSkeleton />;
  }

  const hasCoords = Boolean(formData.latitude && formData.longitude);

  return (
    <div className="af-page">
      <header className="af-header">
        <button
          type="button"
          className="af-back"
          onClick={() => (window.history.length > 1 ? navigate(-1) : navigate('/foundation/animals'))}
          aria-label="ย้อนกลับ"
        >
          <ChevronLeft size={22} />
        </button>
        <div>
          <h1 className="af-header__title">{isEditMode ? 'แก้ไขข้อมูลน้อง' : 'เพิ่มสัตว์หาบ้าน'}</h1>
          <p className="af-header__sub">ข้อมูลนี้แสดงบนการ์ดในหน้าปัดและหน้าประวัติของน้อง</p>
        </div>
      </header>

      <form id="animal-form" onSubmit={handleSubmit} className="af-form" noValidate={false}>
        {/* 1. Photos */}
        <section className="af-section" aria-labelledby="af-s1">
          <h2 id="af-s1" className="af-section__title"><span>1</span> รูปภาพ</h2>
          <p className="af-hint">รูปแรกคือรูปหน้าปกบนการ์ด แนะนำรูปแนวตั้ง กว้างอย่างน้อย {MIN_SHARP_WIDTH}px</p>
          <div className="af-photos">
            {previewImages.map((src, idx) => (
              <div key={src} className="af-photo">
                <img
                  src={src}
                  alt={`รูปที่ ${idx + 1}`}
                  onLoad={(e) => {
                    const w = e.currentTarget.naturalWidth;
                    setSmallImages((prev) => {
                      const next = { ...prev };
                      if (w > 0 && w < MIN_SHARP_WIDTH) next[src] = w; else delete next[src];
                      return next;
                    });
                  }}
                />
                {idx === 0 && <span className="af-photo__tag af-photo__tag--cover">รูปปก</span>}
                {smallImages[src] && <span className="af-photo__tag af-photo__tag--small" title={`รูปกว้าง ${smallImages[src]}px อาจไม่ชัดบนการ์ด`}>รูปเล็ก</span>}
                <button type="button" className="af-photo__remove" onClick={() => removeImage(idx)} aria-label={`ลบรูปที่ ${idx + 1}`}>
                  <X size={14} />
                </button>
              </div>
            ))}
            <label className="af-photo af-photo--add">
              <Upload size={22} aria-hidden="true" />
              <span>{previewImages.length ? 'เพิ่มรูป' : 'เลือกรูปน้อง'}</span>
              <input type="file" multiple accept="image/*" onChange={handleImageSelect} />
            </label>
          </div>
          {previewImages.some((src) => smallImages[src]) && (
            <p role="note" className="af-note">
              <AlertCircle size={18} aria-hidden="true" />
              <span>รูปที่มีป้าย "รูปเล็ก" กว้างไม่ถึง {MIN_SHARP_WIDTH}px อาจดูเบลอ แนะนำรูปที่ถ่ายจากมือถือโดยตรง (รูปที่แคปหน้าจอหรือส่งผ่านแชทมักถูกย่อ)</span>
            </p>
          )}
        </section>

        {/* 2. About */}
        <section className="af-section" aria-labelledby="af-s2">
          <h2 id="af-s2" className="af-section__title"><span>2</span> ข้อมูลน้อง</h2>
          <div className="af-field">
            <label htmlFor="af-name" className="af-label">ชื่อน้อง <span className="af-req">*</span></label>
            <input id="af-name" type="text" required className="af-input" value={formData.name}
              onChange={(e) => handleFieldChange('name', e.target.value)} placeholder="เช่น ถุงทอง, เจ้าหลง" />
          </div>
          <Segmented label="ประเภท" value={formData.type} onChange={(v) => handleFieldChange('type', v)}
            options={[['dog', 'สุนัข'], ['cat', 'แมว'], ['other', 'อื่นๆ']]} />
          <Segmented label="เพศ" value={formData.gender} onChange={(v) => handleFieldChange('gender', v)}
            options={[['male', 'เพศผู้'], ['female', 'เพศเมีย'], ['unknown', 'ไม่ทราบ']]} />
          <div className="af-row">
            <div className="af-field">
              <label htmlFor="af-age" className="af-label">อายุโดยประมาณ</label>
              <input id="af-age" type="text" className="af-input" value={formData.age}
                onChange={(e) => handleFieldChange('age', e.target.value)} placeholder="เช่น 3 เดือน, 1 ปี 6 เดือน" />
            </div>
            <Segmented label="ขนาดตัว" value={formData.size} onChange={(v) => handleFieldChange('size', v)}
              options={[['small', 'เล็ก', '< 10 กก.'], ['medium', 'กลาง', '10–25 กก.'], ['large', 'ใหญ่', '> 25 กก.']]} />
          </div>
        </section>

        {/* 3. Personality */}
        <section className="af-section" aria-labelledby="af-s3">
          <h2 id="af-s3" className="af-section__title"><span>3</span> นิสัยและเรื่องราว</h2>
          <p className="af-hint">แตะเพื่อเลือก แท็กจะแสดงบนการ์ดทั้งภาษาไทยและอังกฤษ ช่วยให้คนที่เหมาะเจอน้องง่ายขึ้น</p>
          <TagPicker ids={tagIds} custom={customTags} onChange={({ ids, custom }) => { setTagIds(ids); setCustomTags(custom); }} />
          <div className="af-field">
            <label htmlFor="af-story" className="af-label">เรื่องราวของน้อง</label>
            <textarea id="af-story" className="af-input af-textarea" value={formData.story}
              onChange={(e) => handleFieldChange('story', e.target.value)}
              placeholder="เล่าที่มา นิสัย สุขภาพ หรือสิ่งที่น้องชอบ" />
          </div>
        </section>

        {/* 4. Location */}
        <section className="af-section" aria-labelledby="af-s4">
          <h2 id="af-s4" className="af-section__title"><span>4</span> น้องอยู่ที่ไหน</h2>
          <p className="af-hint">ใช้คำนวณระยะทางให้ผู้ที่สนใจในหน้าปัด</p>
          <div className="af-loc-actions">
            {foundationCoords && (
              <button type="button" className="af-chip-btn" onClick={() => {
                handleFieldChange('latitude', String(foundationCoords.latitude));
                handleFieldChange('longitude', String(foundationCoords.longitude));
                if (foundationCoords.foundation_name) setLocationSearchQuery(foundationCoords.foundation_name);
              }}>
                <MapPin size={16} aria-hidden="true" /> ที่ตั้งมูลนิธิ
              </button>
            )}
            <button type="button" className="af-chip-btn" onClick={handleGetCurrentLocation} disabled={isGettingLocation}>
              {isGettingLocation ? <Loader2 size={16} className="spin" aria-hidden="true" /> : <MapPin size={16} aria-hidden="true" />}
              {isGettingLocation ? 'กำลังหาตำแหน่ง…' : 'ตำแหน่งปัจจุบัน'}
            </button>
          </div>
          <div className="af-search">
            <input type="search" className="af-input" value={locationSearchQuery}
              placeholder="ค้นหาสถานที่ เช่น อ.เมือง ขอนแก่น"
              aria-label="ค้นหาสถานที่"
              onChange={(e) => setLocationSearchQuery(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleSearchLocation(); } }} />
            <button type="button" className="af-chip-btn" onClick={handleSearchLocation} disabled={isSearchingLocation || !locationSearchQuery.trim()} aria-label="ค้นหา">
              {isSearchingLocation ? <Loader2 size={16} className="spin" aria-hidden="true" /> : <Search size={16} aria-hidden="true" />}
            </button>
          </div>
          <InteractiveLocationPicker
            latitude={formData.latitude || foundationCoords?.latitude}
            longitude={formData.longitude || foundationCoords?.longitude}
            onChange={handleInteractivePinChange}
            height={220}
            zoom={16}
          />
          <p className={`af-hint ${hasCoords ? 'af-hint--ok' : ''}`}>
            {hasCoords
              ? <><CheckCircle2 size={14} aria-hidden="true" /> ปักหมุดแล้ว · ลากหมุดเพื่อปรับตำแหน่งได้</>
              : 'แตะบนแผนที่หรือลากหมุดเพื่อเลือกตำแหน่ง'}
          </p>
        </section>

        {/* Save: stays in reach at the bottom of the screen */}
        <div className="af-savebar">
          {(errorMsg || successMsg) && (
            <p className={`af-savebar__msg ${errorMsg ? 'is-error' : 'is-ok'}`} role={errorMsg ? 'alert' : 'status'}>
              {errorMsg ? <AlertCircle size={16} aria-hidden="true" /> : <CheckCircle2 size={16} aria-hidden="true" />}
              {errorMsg || successMsg}
            </p>
          )}
          <button type="submit" className="ui-btn ui-btn--primary af-savebar__btn" disabled={submitting}>
            {submitting ? <Loader2 className="spin" size={18} aria-hidden="true" /> : <Save size={18} aria-hidden="true" />}
            {submitting ? 'กำลังบันทึก…' : isEditMode ? 'บันทึกการแก้ไข' : 'บันทึกและประกาศหาบ้าน'}
          </button>
        </div>
      </form>
    </div>
  );
};

// Two or three choices as tap targets instead of a dropdown
function Segmented({ label, value, onChange, options }) {
  return (
    <fieldset className="af-field af-seg">
      <legend className="af-label">{label}</legend>
      <div className="af-seg__opts">
        {options.map(([id, text, sub]) => (
          <label key={id} className={`af-seg__opt ${value === id ? 'is-on' : ''}`}>
            <input type="radio" name={label} value={id} checked={value === id} onChange={() => onChange(id)} />
            <span>{text}</span>
            {sub && <small>{sub}</small>}
          </label>
        ))}
      </div>
    </fieldset>
  );
}

export default AnimalForm;
