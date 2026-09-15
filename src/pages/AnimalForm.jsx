import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../services/supabaseClient';
import { ChevronLeft, Save, Upload, X, Loader2, Image as ImageIcon, CheckCircle2, AlertCircle, MapPin, Search } from 'lucide-react';
import { searchCoordinatesFromAddress, getAddressFromCoordinates, parseCoordinatesFromText } from '../lib/geo';
import InteractiveLocationPicker from '../components/InteractiveLocationPicker';
import { FormPageSkeleton } from '../components/Skeletons';

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
    tags: '', // string คั่นด้วยลูกน้ำ
    latitude: '',
    longitude: '',
  });

  // รูปภาพ
  const [images, setImages] = useState([]); // ไฟล์ใหม่ที่กำลังจะอัปโหลด
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
        tags: (data.tags || []).join(', '),
        latitude: data.latitude ? String(data.latitude) : '',
        longitude: data.longitude ? String(data.longitude) : '',
      });
      
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
        alert(`${f.name} ไม่ใช่ไฟล์รูปภาพ`);
        return false;
      }
      if (f.size > 5 * 1024 * 1024) {
        alert(`${f.name} ขนาดเกิน 5MB`);
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

      const tagsArray = formData.tags
        .split(',')
        .map(t => t.trim())
        .filter(t => t !== '');

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
          .insert([payload]);
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

  return (
    <div style={{
      minHeight: '100dvh',
      backgroundColor: '#FAF8F5',
      fontFamily: 'Prompt, sans-serif',
      padding: '32px 16px 100px',
      boxSizing: 'border-box'
    }}>
      <div style={{ maxWidth: '640px', margin: '0 auto' }}>
        
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2 }}
          style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}
        >
          <button
            type="button"
            onClick={() => {
              if (window.history.length > 1) {
                navigate(-1);
              } else {
                navigate('/foundation');
              }
            }}
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
              cursor: 'pointer',
              transition: 'background-color 0.15s'
            }}
            onMouseEnter={e => e.currentTarget.style.backgroundColor = '#F9FAFB'}
            onMouseLeave={e => e.currentTarget.style.backgroundColor = '#FFFFFF'}
            aria-label="ย้อนกลับ"
          >
            <ChevronLeft size={20} />
          </button>
          <div>
            <h1 style={{ margin: 0, fontSize: '1.45rem', fontWeight: 700, color: '#111827' }}>
              {isEditMode ? 'แก้ไขข้อมูลสัตว์เลี้ยง' : 'เพิ่มสัตว์หาบ้านใหม่'}
            </h1>
            <p style={{ margin: 0, fontSize: '0.82rem', color: '#6B7280' }}>
              กรอกข้อมูลเพื่อแสดงบนฟีดค้นหาและแมตช์กับผู้รับเลี้ยง
            </p>
          </div>
        </motion.div>

        {errorMsg && (
          <div style={{
            backgroundColor: '#FEF2F2',
            border: '1px solid #FCA5A5',
            padding: '12px 14px',
            borderRadius: '8px',
            marginBottom: '16px',
            fontSize: '0.85rem',
            color: '#DC2626',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            <AlertCircle size={16} />
            <span>{errorMsg}</span>
          </div>
        )}
        
        {successMsg && (
          <div style={{
            backgroundColor: '#ECFDF5',
            border: '1px solid #A7F3D0',
            padding: '12px 14px',
            borderRadius: '8px',
            marginBottom: '16px',
            fontSize: '0.85rem',
            color: '#059669',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            <CheckCircle2 size={16} />
            <span>{successMsg}</span>
          </div>
        )}

        <motion.form
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25, delay: 0.08 }}
          onSubmit={handleSubmit}
          style={{
            backgroundColor: '#FFFFFF',
            borderRadius: '16px',
            padding: '28px 24px',
            border: '1px solid #E5E7EB',
            boxShadow: '0 1px 3px rgba(0,0,0,0.03)'
          }}
        >
          
          {/* Photos Upload Section */}
          <div style={{ marginBottom: '24px' }}>
            <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, color: '#111827', marginBottom: '6px' }}>
              รูปภาพสัตว์เลี้ยง
            </label>
            <p style={{ fontSize: '0.8rem', color: '#6B7280', margin: '0 0 12px' }}>
              รูปแรกจะใช้เป็นภาพหน้าปกบนการ์ดค้นหา (แนะนำขนาดสัดส่วน 4:5 หรือรูปแนวตั้ง)
            </p>
            
            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center' }}>
              {previewImages.map((src, idx) => (
                <div key={idx} style={{
                  position: 'relative',
                  width: '90px',
                  height: '90px',
                  flexShrink: 0,
                  borderRadius: '8px',
                  overflow: 'hidden',
                  border: '1px solid #D1D5DB',
                  backgroundColor: '#F3F4F6'
                }}>
                  <img src={src} alt="preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  {idx === 0 && (
                    <span style={{
                      position: 'absolute',
                      bottom: '4px',
                      left: '4px',
                      backgroundColor: 'rgba(0,0,0,0.7)',
                      color: '#FFFFFF',
                      fontSize: '0.65rem',
                      fontWeight: 600,
                      padding: '1px 6px',
                      borderRadius: '4px'
                    }}>
                      ภาพปก
                    </span>
                  )}
                  <button
                    type="button"
                    onClick={() => removeImage(idx)}
                    style={{
                      position: 'absolute',
                      top: '4px',
                      right: '4px',
                      width: '20px',
                      height: '20px',
                      borderRadius: '50%',
                      backgroundColor: 'rgba(0,0,0,0.6)',
                      color: '#FFFFFF',
                      border: 'none',
                      display: 'flex',
                      justifyContent: 'center',
                      alignItems: 'center',
                      cursor: 'pointer'
                    }}
                    title="ลบรูป"
                  >
                    <X size={12} />
                  </button>
                </div>
              ))}

              <label style={{
                width: '90px',
                height: '90px',
                flexShrink: 0,
                borderRadius: '8px',
                border: '1px dashed #D1D5DB',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
                alignItems: 'center',
                cursor: 'pointer',
                backgroundColor: '#FAF8F5',
                color: '#6B7280',
                transition: 'border-color 0.15s, background-color 0.15s'
              }}>
                <Upload size={20} color="#D97706" style={{ marginBottom: '4px' }} />
                <span style={{ fontSize: '0.72rem', fontWeight: 500 }}>เพิ่มรูปภาพ</span>
                <input type="file" multiple accept="image/*" onChange={handleImageSelect} style={{ display: 'none' }} />
              </label>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {/* Name */}
            <div>
              <label style={labelStyle}>
                ชื่อสัตว์เลี้ยง <span style={{ color: '#DC2626' }}>*</span>
              </label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={e => handleFieldChange('name', e.target.value)}
                style={inputStyle}
                placeholder="เช่น ถุงทอง, เจ้าหลง"
              />
            </div>

            {/* Type & Gender (2 columns) */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
              gap: '14px'
            }}>
              <div>
                <label style={labelStyle}>ประเภท</label>
                <select
                  value={formData.type}
                  onChange={e => handleFieldChange('type', e.target.value)}
                  style={inputStyle}
                >
                  <option value="dog">สุนัข</option>
                  <option value="cat">แมว</option>
                  <option value="other">อื่นๆ</option>
                </select>
              </div>

              <div>
                <label style={labelStyle}>เพศ</label>
                <select
                  value={formData.gender}
                  onChange={e => handleFieldChange('gender', e.target.value)}
                  style={inputStyle}
                >
                  <option value="male">เพศผู้</option>
                  <option value="female">เพศเมีย</option>
                  <option value="unknown">ไม่ระบุ</option>
                </select>
              </div>
            </div>

            {/* Age & Size (2 columns) */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
              gap: '14px'
            }}>
              <div>
                <label style={labelStyle}>อายุโดยประมาณ</label>
                <input
                  type="text"
                  value={formData.age}
                  onChange={e => handleFieldChange('age', e.target.value)}
                  style={inputStyle}
                  placeholder="เช่น 3 เดือน, 1 ปี 6 เดือน"
                />
              </div>

              <div>
                <label style={labelStyle}>ขนาดตัว</label>
                <select
                  value={formData.size}
                  onChange={e => handleFieldChange('size', e.target.value)}
                  style={inputStyle}
                >
                  <option value="small">เล็ก (ต่ำกว่า 10 กก.)</option>
                  <option value="medium">กลาง (10 - 25 กก.)</option>
                  <option value="large">ใหญ่ (มากกว่า 25 กก.)</option>
                </select>
              </div>
            </div>

            {/* Tags */}
            <div>
              <label style={labelStyle}>ลักษณะนิสัย / สุขภาพ (คั่นด้วยเครื่องหมายจุลภาค ,)</label>
              <input
                type="text"
                value={formData.tags}
                onChange={e => handleFieldChange('tags', e.target.value)}
                style={inputStyle}
                placeholder="เช่น ขี้อ้อน, ทำหมันแล้ว, ฉีดวัคซีนครบ, เข้ากับแมวได้"
              />
              <span style={{ fontSize: '0.75rem', color: '#6B7280', marginTop: '4px', display: 'block' }}>
                ข้อความนี้จะแสดงเป็นแท็กบนการ์ดค้นหา เพื่อช่วยให้ผู้รับเลี้ยงตัดสินใจได้ง่ายขึ้น
              </span>
            </div>

            {/* Story */}
            <div>
              <label style={labelStyle}>เรื่องราวและประวัติความเป็นมา</label>
              <textarea
                value={formData.story}
                onChange={e => handleFieldChange('story', e.target.value)}
                style={{
                  ...inputStyle,
                  height: '110px',
                  resize: 'vertical',
                  padding: '12px 14px',
                  lineHeight: 1.5
                }}
                placeholder="เล่าประวัติ ที่มา อุปนิสัย หรือความน่ารักของน้อง..."
              />
            </div>

            {/* Location */}
            <div style={{
              backgroundColor: '#FAF8F5',
              border: '1px solid #E5E7EB',
              borderRadius: '12px',
              padding: '16px',
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px', flexWrap: 'wrap', gap: '8px' }}>
                <label style={{ ...labelStyle, marginBottom: 0, fontWeight: 600 }}>
                  ตำแหน่งที่อยู่ของสัตว์เลี้ยง
                </label>
                <div style={{ display: 'flex', gap: '8px' }}>
                  {foundationCoords && (
                    <button
                      type="button"
                      onClick={() => {
                        handleFieldChange('latitude', String(foundationCoords.latitude));
                        handleFieldChange('longitude', String(foundationCoords.longitude));
                        if (foundationCoords.foundation_name) {
                          setLocationSearchQuery(foundationCoords.foundation_name);
                        }
                      }}
                      style={{
                        height: '30px',
                        padding: '0 10px',
                        borderRadius: '6px',
                        border: '1px solid #D1D5DB',
                        backgroundColor: '#FFFFFF',
                        color: '#374151',
                        fontSize: '0.78rem',
                        fontWeight: 500,
                        cursor: 'pointer'
                      }}
                    >
                      ใช้พิกัดมูลนิธิ
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={handleGetCurrentLocation}
                    disabled={isGettingLocation}
                    style={{
                      height: '30px',
                      padding: '0 10px',
                      borderRadius: '6px',
                      border: '1px solid #D97706',
                      backgroundColor: '#FEF3C7',
                      color: '#B45309',
                      fontSize: '0.78rem',
                      fontWeight: 600,
                      cursor: isGettingLocation ? 'not-allowed' : 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px'
                    }}
                  >
                    {isGettingLocation ? <Loader2 size={13} className="spin" /> : <MapPin size={13} color="#D97706" />}
                    {isGettingLocation ? 'กำลังดึง...' : 'ใช้พิกัดปัจจุบัน'}
                  </button>
                </div>
              </div>

              {/* Location Search Bar */}
              <div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <input
                    type="text"
                    placeholder="พิมพ์ชื่อสถานที่/ตำบล/อำเภอ/จังหวัด เช่น อ.เมือง ขอนแก่น เพื่อค้นหาพิกัด"
                    value={locationSearchQuery}
                    onChange={e => setLocationSearchQuery(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleSearchLocation(); } }}
                    style={{ ...inputStyle, height: '38px', fontSize: '0.88rem', flex: 1 }}
                  />
                  <button
                    type="button"
                    onClick={handleSearchLocation}
                    disabled={isSearchingLocation || !locationSearchQuery.trim()}
                    style={{
                      height: '38px',
                      padding: '0 14px',
                      borderRadius: '6px',
                      border: '1px solid #D97706',
                      backgroundColor: '#FEF3C7',
                      color: '#B45309',
                      fontSize: '0.82rem',
                      fontWeight: 600,
                      cursor: !locationSearchQuery.trim() ? 'not-allowed' : 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px',
                      opacity: !locationSearchQuery.trim() ? 0.6 : 1,
                      flexShrink: 0
                    }}
                  >
                    {isSearchingLocation ? <Loader2 size={13} className="spin" /> : <Search size={13} />}
                    {isSearchingLocation ? 'กำลังค้นหา...' : 'ค้นหาตำแหน่ง'}
                  </button>
                </div>
                <span style={{ fontSize: '0.73rem', color: '#6B7280', display: 'block', marginTop: '4px' }}>
                  ระบบจะใช้พิกัดนี้คำนวณระยะทางกับผู้รับเลี้ยงในหน้าฟีดค้นหาอัตโนมัติ
                </span>
              </div>

              {/* Interactive Map with Draggable Pin */}
              <div style={{ marginTop: '10px' }}>
                <InteractiveLocationPicker
                  latitude={formData.latitude || foundationCoords?.latitude}
                  longitude={formData.longitude || foundationCoords?.longitude}
                  onChange={handleInteractivePinChange}
                  height={200}
                  zoom={16}
                />
                <div style={{ marginTop: '6px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '6px' }}>
                  <span style={{ fontSize: '0.73rem', color: '#6B7280' }}>
                    คลิกบนแผนที่หรือลากหมุดสีแดงเพื่อปรับจุดพิกัด
                  </span>
                  {formData.latitude && formData.longitude && (
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', color: '#059669', fontSize: '0.73rem', fontWeight: 600 }}>
                      <CheckCircle2 size={13} /> พิกัด: {Number(formData.latitude).toFixed(5)}, {Number(formData.longitude).toFixed(5)}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Submit */}
          <div style={{ marginTop: '28px' }}>
            <button
              type="submit"
              disabled={submitting}
              style={{
                width: '100%',
                height: '44px',
                borderRadius: '8px',
                backgroundColor: submitting ? '#9CA3AF' : '#D97706',
                color: '#FFFFFF',
                border: 'none',
                fontSize: '0.9rem',
                fontWeight: 600,
                cursor: submitting ? 'not-allowed' : 'pointer',
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                gap: '8px',
                boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
                transition: 'background-color 0.15s'
              }}
              onMouseEnter={e => { if (!submitting) e.currentTarget.style.backgroundColor = '#B45309'; }}
              onMouseLeave={e => { if (!submitting) e.currentTarget.style.backgroundColor = '#D97706'; }}
            >
              {submitting ? (
                <>
                  <Loader2 className="spin" size={18} />
                  <span>กำลังบันทึกข้อมูล...</span>
                </>
              ) : (
                <>
                  <Save size={18} />
                  <span>{isEditMode ? 'บันทึกการแก้ไข' : 'บันทึกและประกาศหาบ้าน'}</span>
                </>
              )}
            </button>
          </div>
        </motion.form>
      </div>
    </div>
  );
};

const labelStyle = {
  display: 'block',
  fontSize: '0.85rem',
  fontWeight: 500,
  color: '#374151',
  marginBottom: '6px'
};

const inputStyle = {
  width: '100%',
  height: '44px',
  padding: '0 14px',
  borderRadius: '8px',
  border: '1px solid #D1D5DB',
  backgroundColor: '#FFFFFF',
  fontFamily: 'inherit',
  fontSize: '0.92rem',
  color: '#111827',
  outline: 'none',
  boxSizing: 'border-box',
  transition: 'border-color 0.15s, box-shadow 0.15s'
};

export default AnimalForm;
