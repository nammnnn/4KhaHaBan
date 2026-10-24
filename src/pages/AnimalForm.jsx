import React, { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../services/supabaseClient';
import { ChevronLeft, Save, Upload, X, Loader2, CheckCircle2, AlertCircle, MapPin, PawPrint, Search } from 'lucide-react';
import { searchCoordinatesFromAddress, getAddressFromCoordinates, parseCoordinatesFromText } from '../lib/geo';
import InteractiveLocationPicker from '../components/InteractiveLocationPicker';
import { AnimalFormSkeleton } from '../components/Skeletons';
import { Button, Dialog, EmptyState, LoadError, useToast } from '../components/ui';
import { TagPicker } from '../components/TagPicker';
import { splitStoredTags, buildStoredTags } from '../lib/tags';
import { useI18n } from '../i18n';
import './AnimalForm.css';

// Card photos fill ~900px-wide screens; anything much smaller looks blurry (DESIGN.md §5)
const MIN_SHARP_WIDTH = 800;

const AnimalForm = () => {
  const { id } = useParams(); // ถ้ามี id = แก้ไข, ถ้าไม่มี = สร้างใหม่
  const isEditMode = !!id;
  const navigate = useNavigate();
  const location = useLocation();
  // 'default' = this page was opened directly, so there's no in-app page to go back to
  const backOrList = () => (location.key !== 'default' ? navigate(-1) : navigate('/foundation/animals'));
  const { user, profile } = useAuth();
  const { t } = useI18n();
  
  const [loading, setLoading] = useState(isEditMode);
  const [loadState, setLoadState] = useState(null); // null | 'notFound' | 'error' (edit mode only)
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [fieldErrors, setFieldErrors] = useState({}); // { name, photo }
  const [leaveTo, setLeaveTo] = useState(null); // where to go once the user agrees to drop changes
  const nameRef = useRef(null);
  const photosRef = useRef(null);
  const initialSnap = useRef(null);
  const savedRef = useRef(false);

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
    setLoadState(null);
    try {
      const { data, error } = await supabase
        .from('animals')
        .select('*')
        .eq('id', id)
        .eq('foundation_id', user.id)
        .single();

      if (error) throw error;
      if (!data) { setLoadState('notFound'); return; }

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
      // PGRST116 = no row (deleted, or another foundation's animal), 22P02 = malformed id in the link;
      // anything else is a load failure
      setLoadState(['PGRST116', '22P02'].includes(error?.code) ? 'notFound' : 'error');
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
        setErrorMsg(t('af.err.noCoords'));
      }
    } catch (e) {
      console.warn('Geocoding error:', e);
      setErrorMsg(t('af.err.search'));
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
      setErrorMsg(t('af.err.noGps'));
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
        setErrorMsg(t('af.err.gps'));
        setIsGettingLocation(false);
      },
      { enableHighAccuracy: true, timeout: 8000 }
    );
  };

  const handleFieldChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (field === 'name' && value.trim()) setFieldErrors((f) => ({ ...f, name: null }));
  };

  // Unsaved-changes check. Location is left out: a new form fills it in from the foundation profile.
  const snapshot = JSON.stringify({ ...formData, latitude: null, longitude: null, previewImages, tagIds, customTags });
  useEffect(() => {
    if (!loading && initialSnap.current === null) initialSnap.current = snapshot;
  }, [loading, snapshot]);
  const dirty = !loading && initialSnap.current !== null && initialSnap.current !== snapshot && !savedRef.current;

  // Closing or reloading the tab
  useEffect(() => {
    if (!dirty) return undefined;
    const warn = (e) => { e.preventDefault(); e.returnValue = ''; };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [dirty]);

  // Links elsewhere in the app (menu, dock): ask first instead of dropping the form
  useEffect(() => {
    if (!dirty) return undefined;
    const onClick = (e) => {
      const a = e.target.closest?.('a[href]');
      if (!a || a.target === '_blank' || e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
      const url = new URL(a.href, window.location.href);
      if (url.origin !== window.location.origin || url.pathname === window.location.pathname) return;
      e.preventDefault();
      e.stopPropagation();
      setLeaveTo(url.pathname + url.search);
    };
    document.addEventListener('click', onClick, true);
    return () => document.removeEventListener('click', onClick, true);
  }, [dirty]);

  const goBack = () => {
    if (dirty) { setLeaveTo('back'); return; }
    backOrList();
  };
  const leaveNow = () => {
    const to = leaveTo;
    savedRef.current = true; // stop asking
    setLeaveTo(null);
    if (to === 'back') backOrList(); else navigate(to);
  };

  const handleImageSelect = (e) => {
    const files = Array.from(e.target.files);
    if (!files.length) return;

    // กรองเฉพาะรูปภาพและจำกัดขนาด 5MB
    const validFiles = files.filter(f => {
      if (!f.type.startsWith('image/')) {
        toast(t('af.err.notImage', { file: f.name }), { tone: 'error' });
        return false;
      }
      if (f.size > 5 * 1024 * 1024) {
        toast(t('af.err.tooBig', { file: f.name }), { tone: 'error' });
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
    // Check everything at once, then take the user to the first problem
    const errs = {
      photo: previewImages.length === 0 ? t('af.err.photo') : null,
      name: !formData.name.trim() ? t('af.err.name') : null,
    };
    setFieldErrors(errs);
    if (errs.photo || errs.name) {
      setErrorMsg(t('af.err.fix'));
      const first = errs.photo ? photosRef.current : nameRef.current;
      first?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      if (!errs.photo) nameRef.current?.focus({ preventScroll: true });
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

      // Keep the button locked until we leave, so a second tap can't post the animal twice
      savedRef.current = true;
      setSuccessMsg(t('af.saved'));
      setTimeout(() => {
        navigate('/foundation/animals');
      }, 1200);
    } catch (error) {
      // Raw database/storage errors are technical English; show a plain message instead
      console.error('[AnimalForm] Submit error:', error);
      setErrorMsg(error?.statusCode || error?.name === 'StorageApiError' ? t('af.err.upload') : t('af.err.save'));
      setSubmitting(false);
    }
  };

  if (loading) {
    return <AnimalFormSkeleton />;
  }

  const hasCoords = Boolean(formData.latitude && formData.longitude);

  const header = (
    <header className="af-header">
      <button
        type="button"
        className="af-back"
        onClick={goBack}
        aria-label={t('fnd.back')}
      >
        <ChevronLeft size={22} />
      </button>
      <div>
        <h1 className="af-header__title">{isEditMode ? t('af.titleEdit') : t('af.titleNew')}</h1>
        <p className="af-header__sub">{t('af.sub')}</p>
      </div>
    </header>
  );

  if (loadState) {
    return (
      <div className="af-page">
        {header}
        {loadState === 'notFound' ? (
          <EmptyState
            icon={PawPrint}
            title={t('af.err.notFound')}
            action={<Button onClick={() => navigate('/foundation/animals', { replace: true })}>{t('err.toList')}</Button>}
          />
        ) : (
          <LoadError onRetry={() => { setLoading(true); return fetchAnimal(); }} />
        )}
      </div>
    );
  }

  return (
    <div className="af-page">
      {header}

      <form id="animal-form" onSubmit={handleSubmit} className="af-form" noValidate>
        {/* 1. Photos */}
        <section ref={photosRef} className={`af-section ${fieldErrors.photo ? 'is-invalid' : ''}`} aria-labelledby="af-s1">
          <h2 id="af-s1" className="af-section__title"><span>1</span> {t('af.s1')}</h2>
          <p className="af-hint">{t('af.s1.hint', { px: MIN_SHARP_WIDTH })}</p>
          <div className="af-photos">
            {previewImages.map((src, idx) => (
              <div key={src} className="af-photo">
                <img
                  src={src}
                  alt={t('af.photoN', { n: idx + 1 })}
                  onLoad={(e) => {
                    const w = e.currentTarget.naturalWidth;
                    setSmallImages((prev) => {
                      const next = { ...prev };
                      if (w > 0 && w < MIN_SHARP_WIDTH) next[src] = w; else delete next[src];
                      return next;
                    });
                  }}
                />
                {idx === 0 && <span className="af-photo__tag af-photo__tag--cover">{t('af.cover')}</span>}
                {smallImages[src] && <span className="af-photo__tag af-photo__tag--small" title={t('af.smallTitle', { px: smallImages[src] })}>{t('af.small')}</span>}
                <button type="button" className="af-photo__remove" onClick={() => removeImage(idx)} aria-label={t('af.removePhoto', { n: idx + 1 })}>
                  <X size={14} />
                </button>
              </div>
            ))}
            <label className="af-photo af-photo--add">
              <Upload size={22} aria-hidden="true" />
              <span>{previewImages.length ? t('af.addPhoto') : t('af.pickPhoto')}</span>
              <input type="file" multiple accept="image/*" onChange={(e) => { handleImageSelect(e); setFieldErrors((f) => ({ ...f, photo: null })); }} />
            </label>
          </div>
          {fieldErrors.photo && <p className="af-error" role="alert"><AlertCircle size={15} aria-hidden="true" /> {fieldErrors.photo}</p>}
          {previewImages.some((src) => smallImages[src]) && (
            <p role="note" className="af-note">
              <AlertCircle size={18} aria-hidden="true" />
              <span>{t('af.smallNote', { px: MIN_SHARP_WIDTH })}</span>
            </p>
          )}
        </section>

        {/* 2. About */}
        <section className="af-section" aria-labelledby="af-s2">
          <h2 id="af-s2" className="af-section__title"><span>2</span> {t('af.s2')}</h2>
          <div className="af-field">
            <label htmlFor="af-name" className="af-label">{t('af.name')} <span className="af-req">*</span></label>
            <input id="af-name" ref={nameRef} type="text" required className={`af-input ${fieldErrors.name ? 'is-invalid' : ''}`} value={formData.name}
              aria-invalid={Boolean(fieldErrors.name)} aria-describedby={fieldErrors.name ? 'af-name-err' : undefined}
              onChange={(e) => handleFieldChange('name', e.target.value)} placeholder={t('af.namePh')} />
            {fieldErrors.name && <p id="af-name-err" className="af-error"><AlertCircle size={15} aria-hidden="true" /> {fieldErrors.name}</p>}
          </div>
          <Segmented name="type" label={t('af.type')} value={formData.type} onChange={(v) => handleFieldChange('type', v)}
            options={[['dog', t('af.dog')], ['cat', t('af.cat')], ['other', t('af.other')]]} />
          <Segmented name="gender" label={t('af.gender')} value={formData.gender} onChange={(v) => handleFieldChange('gender', v)}
            options={[['male', t('af.male')], ['female', t('af.female')], ['unknown', t('af.unknown')]]} />
          <div className="af-row">
            <div className="af-field">
              <label htmlFor="af-age" className="af-label">{t('af.age')}</label>
              <input id="af-age" type="text" className="af-input" value={formData.age}
                onChange={(e) => handleFieldChange('age', e.target.value)} placeholder={t('af.agePh')} />
            </div>
            <Segmented name="size" label={t('af.size')} value={formData.size} onChange={(v) => handleFieldChange('size', v)}
              options={['small', 'medium', 'large'].map((k) => [k, t(`af.${k}`), t(`af.kg.${k}`)])} />
          </div>
        </section>

        {/* 3. Personality */}
        <section className="af-section" aria-labelledby="af-s3">
          <h2 id="af-s3" className="af-section__title"><span>3</span> {t('af.s3')}</h2>
          <p className="af-hint">{t('af.s3.hint')}</p>
          <TagPicker ids={tagIds} custom={customTags} onChange={({ ids, custom }) => { setTagIds(ids); setCustomTags(custom); }} />
          <div className="af-field">
            <label htmlFor="af-story" className="af-label">{t('af.story')}</label>
            <textarea id="af-story" className="af-input af-textarea" value={formData.story}
              onChange={(e) => handleFieldChange('story', e.target.value)}
              placeholder={t('af.storyPh')} />
          </div>
        </section>

        {/* 4. Location */}
        <section className="af-section" aria-labelledby="af-s4">
          <h2 id="af-s4" className="af-section__title"><span>4</span> {t('af.s4')}</h2>
          <p className="af-hint">{t('af.s4.hint')}</p>
          <div className="af-loc-actions">
            {foundationCoords && (
              <button type="button" className="af-chip-btn" onClick={() => {
                handleFieldChange('latitude', String(foundationCoords.latitude));
                handleFieldChange('longitude', String(foundationCoords.longitude));
                if (foundationCoords.foundation_name) setLocationSearchQuery(foundationCoords.foundation_name);
              }}>
                <MapPin size={16} aria-hidden="true" /> {t('af.useFoundation')}
              </button>
            )}
            <button type="button" className="af-chip-btn" onClick={handleGetCurrentLocation} disabled={isGettingLocation}>
              {isGettingLocation ? <Loader2 size={16} className="spin" aria-hidden="true" /> : <MapPin size={16} aria-hidden="true" />}
              {isGettingLocation ? t('af.locating') : t('af.current')}
            </button>
          </div>
          <div className="af-search">
            <input type="search" className="af-input" value={locationSearchQuery}
              placeholder={t('af.searchPlace')}
              aria-label={t('af.searchPlaceAria')}
              onChange={(e) => setLocationSearchQuery(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleSearchLocation(); } }} />
            <button type="button" className="af-chip-btn" onClick={handleSearchLocation} disabled={isSearchingLocation || !locationSearchQuery.trim()} aria-label={t('af.search')}>
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
              ? <><CheckCircle2 size={14} aria-hidden="true" /> {t('af.pinned')}</>
              : t('af.tapMap')}
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
            {successMsg ? t('af.saved') : submitting ? t('af.saving') : isEditMode ? t('af.saveEdit') : t('af.saveNew')}
          </button>
        </div>
      </form>

      <Dialog open={Boolean(leaveTo)} onClose={() => setLeaveTo(null)} title={t('af.leave.title')}>
        <p>{t('af.leave.text')}</p>
        <div className="ui-dialog__actions">
          <Button onClick={() => setLeaveTo(null)}>{t('af.leave.stay')}</Button>
          <Button variant="secondary" onClick={leaveNow}>{t('af.leave.go')}</Button>
        </div>
      </Dialog>
    </div>
  );
};

// Two or three choices as tap targets instead of a dropdown
function Segmented({ name, label, value, onChange, options }) {
  return (
    <fieldset className="af-field af-seg">
      <legend className="af-label">{label}</legend>
      <div className="af-seg__opts">
        {options.map(([id, text, sub]) => (
          <label key={id} className={`af-seg__opt ${value === id ? 'is-on' : ''}`}>
            <input type="radio" name={`af-${name}`} value={id} checked={value === id} onChange={() => onChange(id)} />
            <span>{text}</span>
            {sub && <small>{sub}</small>}
          </label>
        ))}
      </div>
    </fieldset>
  );
}

export default AnimalForm;
