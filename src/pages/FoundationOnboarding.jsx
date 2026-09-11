import React, { useState, useEffect } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../services/supabaseClient';
import {
  Building2, Upload, FileText, ChevronRight, ChevronLeft,
  CheckCircle2, Loader2, AlertCircle, X, Phone, MapPin, User,
  Shield, Lock, ArrowUpRight, HelpCircle, Search
} from 'lucide-react';
import { searchCoordinatesFromAddress, getAddressFromCoordinates, parseCoordinatesFromText } from '../lib/geo';
import InteractiveLocationPicker from '../components/InteractiveLocationPicker';

// ==============================================================================
// FoundationOnboarding — แบบฟอร์มลงทะเบียนมูลนิธิ (Professional Production UI)
// ==============================================================================

const FoundationOnboarding = () => {
  const { user, role, foundationStatus, refreshProfile } = useAuth();
  const navigate = useNavigate();

  if (role !== 'foundation') {
    return <Navigate to="/" replace />;
  }

  if (foundationStatus === 'approved') {
    return <Navigate to="/" replace />;
  }

  const [step, setStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [existingData, setExistingData] = useState(null);

  const [formData, setFormData] = useState({
    foundation_name: '',
    registration_no: '',
    address: '',
    latitude: '',
    longitude: '',
    contact_phone: '',
    contact_person: '',
    description: '',
    promptpay_number: '',
  });

  const [isGettingLocation, setIsGettingLocation] = useState(false);
  const [isSearchingAddress, setIsSearchingAddress] = useState(false);

  const [documents, setDocuments] = useState({
    registration_cert: null,
    id_card: null,
    address_proof: null,
  });

  useEffect(() => {
    if (supabase && user) {
      fetchExistingData();
    }
  }, [user]);

  const fetchExistingData = async () => {
    try {
      const { data, error } = await supabase
        .from('foundation_profiles')
        .select('*')
        .eq('id', user.id)
        .maybeSingle();

      if (data) {
        setExistingData(data);
        setFormData({
          foundation_name: data.foundation_name || '',
          registration_no: data.registration_no || '',
          address: data.address || '',
          latitude: data.latitude ? String(data.latitude) : '',
          longitude: data.longitude ? String(data.longitude) : '',
          contact_phone: data.contact_phone || '',
          contact_person: data.contact_person || '',
          description: data.description || '',
          promptpay_number: data.promptpay_number || '',
        });
      }
    } catch (error) {
      console.error('[Onboarding] ดึงข้อมูลเดิมไม่สำเร็จ:', error);
    }
  };

  const handleSearchCoordsFromAddress = async () => {
    const query = formData.address.trim();
    if (!query) {
      setErrorMsg('กรุณากรอกที่อยู่ หรือวางพิกัดก่อนกดค้นหา');
      return;
    }
    setIsSearchingAddress(true);
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
          longitude: lng,
          address: resolvedAddress
        }));
      } else {
        setErrorMsg('ไม่พบพิกัดจากที่อยู่นี้ กรุณาระบุชื่อตำบล อำเภอ หรือคลิกปักหมุดบนแผนที่ได้โดยตรง');
      }
    } catch (err) {
      console.warn('Geocoding error:', err);
      setErrorMsg('เกิดข้อผิดพลาดในการค้นหาพิกัด');
    } finally {
      setIsSearchingAddress(false);
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
        setFormData(prev => ({
          ...prev,
          address: rev.formattedAddress
        }));
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
          longitude: lng,
          address: resolvedAddress || prev.address
        }));
        setIsGettingLocation(false);
      },
      (err) => {
        console.warn('Geolocation error:', err);
        setErrorMsg('ไม่สามารถเข้าถึงพิกัด GPS ได้ กรุณาระบุที่อยู่แล้วกดปุ่มค้นหาตำแหน่ง หรืออนุญาตให้เข้าถึงตำแหน่งในเบราว์เซอร์');
        setIsGettingLocation(false);
      },
      { enableHighAccuracy: true, timeout: 8000 }
    );
  };

  const updateField = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errorMsg) setErrorMsg('');
  };

  const handleFileChange = (docType, e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const allowedTypes = ['application/pdf', 'image/jpeg', 'image/png', 'image/jpg'];
    if (!allowedTypes.includes(file.type)) {
      setErrorMsg('รองรับเฉพาะไฟล์ PDF, JPG, PNG เท่านั้น');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setErrorMsg('ขนาดไฟล์ต้องไม่เกิน 5MB');
      return;
    }

    setErrorMsg('');
    setDocuments(prev => ({ ...prev, [docType]: file }));
  };

  const removeFile = (docType) => {
    setDocuments(prev => ({ ...prev, [docType]: null }));
  };

  const formatPhoneNumber = (val) => {
    if (!val) return '';
    const digits = val.replace(/\D/g, '').slice(0, 10);
    if (digits.startsWith('02')) {
      if (digits.length <= 2) return digits;
      if (digits.length <= 5) return `${digits.slice(0, 2)}-${digits.slice(2)}`;
      return `${digits.slice(0, 2)}-${digits.slice(2, 5)}-${digits.slice(5)}`;
    } else {
      if (digits.length <= 3) return digits;
      if (digits.length <= 6) return `${digits.slice(0, 3)}-${digits.slice(3)}`;
      return `${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6)}`;
    }
  };

  const validateStep1 = () => {
    if (!formData.foundation_name.trim()) {
      setErrorMsg('กรุณากรอกชื่อมูลนิธิหรือชื่อองค์กร');
      return false;
    }
    if (!formData.contact_person.trim()) {
      setErrorMsg('กรุณากรอกชื่อผู้รับผิดชอบหรือผู้ประสานงาน');
      return false;
    }
    const cleanPhone = formData.contact_phone.replace(/\D/g, '');
    if (!cleanPhone) {
      setErrorMsg('กรุณากรอกเบอร์โทรศัพท์ติดต่อ');
      return false;
    }
    if (cleanPhone.length < 9 || cleanPhone.length > 10) {
      setErrorMsg('เบอร์โทรศัพท์ต้องมี 9 หรือ 10 หลัก');
      return false;
    }
    setErrorMsg('');
    return true;
  };

  const validateStep2 = () => {
    if (!documents.registration_cert && !existingData) {
      setErrorMsg('กรุณาแนบหนังสือรับรองการจดทะเบียนมูลนิธิหรือนิติบุคคล');
      return false;
    }
    setErrorMsg('');
    return true;
  };

  const nextStep = () => {
    if (step === 1 && !validateStep1()) return;
    if (step === 2 && !validateStep2()) return;
    setStep(prev => Math.min(prev + 1, 3));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const prevStep = () => {
    setErrorMsg('');
    setStep(prev => Math.max(prev - 1, 1));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSubmit = async () => {
    if (!supabase) {
      setErrorMsg('ระบบไม่สามารถเชื่อมต่อฐานข้อมูลได้ กรุณาลองใหม่อีกครั้ง');
      return;
    }

    setIsSubmitting(true);
    setErrorMsg('');

    try {
      const profilePayload = {
        id: user.id,
        ...formData,
        promptpay_number: formData.promptpay_number ? formData.promptpay_number.trim().replace(/[-\s]/g, '') : null,
        latitude: formData.latitude ? parseFloat(formData.latitude) : null,
        longitude: formData.longitude ? parseFloat(formData.longitude) : null,
        verification_status: 'pending',
        rejection_reason: null,
        submitted_at: new Date().toISOString(),
      };

      const { error: profileError } = await supabase
        .from('foundation_profiles')
        .upsert(profilePayload, { onConflict: 'id' });

      if (profileError) throw profileError;

      for (const [docType, file] of Object.entries(documents)) {
        if (!file) continue;

        const fileExt = file.name.split('.').pop();
        const fileName = `${user.id}/${docType}_${crypto.randomUUID()}.${fileExt}`;

        const { error: uploadError } = await supabase.storage
          .from('foundation-docs')
          .upload(fileName, file, {
            cacheControl: '3600',
            upsert: false,
          });

        if (uploadError) {
          throw new Error(`การอัปโหลดเอกสาร "${getDocLabel(docType)}" ล้มเหลว: ${uploadError.message}`);
        }

        const { error: docError } = await supabase
          .from('foundation_documents')
          .insert({
            foundation_id: user.id,
            doc_type: docType,
            file_path: fileName,
          });

        if (docError) {
          console.error(`[Onboarding] บันทึกข้อมูลเอกสาร ${docType} ไม่สำเร็จ:`, docError);
        }
      }

      await refreshProfile();
      navigate('/foundation/pending', { replace: true });
    } catch (error) {
      console.error('[Onboarding] ส่งข้อมูลไม่สำเร็จ:', error);
      setErrorMsg(error.message || 'เกิดข้อผิดพลาดในการส่งข้อมูล กรุณาตรวจสอบและลองอีกครั้ง');
    } finally {
      setIsSubmitting(false);
    }
  };

  const getDocLabel = (docType) => {
    const labels = {
      registration_cert: 'หนังสือรับรองการจดทะเบียนมูลนิธิ / นิติบุคคล',
      id_card: 'สำเนาบัตรประชาชนผู้มีอำนาจลงนาม',
      address_proof: 'หลักฐานสถานที่ตั้งสำนักงาน',
    };
    return labels[docType] || docType;
  };

  const getDocDescription = (docType) => {
    const desc = {
      registration_cert: 'ใบสำคัญแสดงการจดทะเบียนจัดตั้ง หรือเอกสารรับรองจากหน่วยงานราชการที่เกี่ยวข้อง',
      id_card: 'สำเนาบัตรประจำตัวประชาชนของผู้มีอำนาจลงนามหรือผู้มีอำนาจจัดตั้ง (ไม่บังคับ)',
      address_proof: 'สัญญาเช่า หรือใบเสร็จค่าน้ำ/ค่าไฟฟ้าที่ระบุชื่อและที่ตั้งของมูลนิธิ (ไม่บังคับ)',
    };
    return desc[docType] || '';
  };

  const stepsList = [
    { number: 1, title: 'ข้อมูลองค์กร', subtitle: 'ข้อมูลนิติบุคคลและสถานที่' },
    { number: 2, title: 'เอกสารประกอบ', subtitle: 'หลักฐานการจดทะเบียน' },
    { number: 3, title: 'ตรวจสอบและยืนยัน', subtitle: 'ส่งคำขอตรวจสอบ' },
  ];

  return (
    <div style={{
      minHeight: '100dvh',
      backgroundColor: '#FAF8F5',
      color: '#1F2937',
      fontFamily: 'Prompt, sans-serif',
      padding: '40px 16px 80px',
      boxSizing: 'border-box',
    }}>
      <div style={{
        maxWidth: '680px',
        margin: '0 auto',
        width: '100%',
      }}>

        {/* Brand Header */}
        <div style={{ marginBottom: '28px' }}>

          <h1 style={{
            fontSize: '1.65rem',
            fontWeight: 700,
            margin: '0 0 8px',
            letterSpacing: '-0.02em',
            color: '#111827',
          }}>
            ลงทะเบียนมูลนิธิเพื่อหาบ้าน
          </h1>
          <p style={{
            margin: 0,
            fontSize: '0.95rem',
            color: '#6B7280',
            lineHeight: 1.5,
          }}>
            กรอกข้อมูลองค์กรและแนบเอกสารเพื่อยืนยันตัวตน ก่อนเริ่มเปิดรับเลี้ยงสัตว์บนแพลตฟอร์ม
          </p>
        </div>

        {/* Stepper (Clean Linear Step Indicator) */}
        <div style={{
          backgroundColor: '#FFFFFF',
          border: '1px solid #E5E7EB',
          borderRadius: '16px',
          padding: '16px 20px',
          marginBottom: '24px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
        }}>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: '12px',
            position: 'relative',
          }}>
            {stepsList.map((s) => {
              const isActive = step === s.number;
              const isDone = step > s.number;
              return (
                <div
                  key={s.number}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    opacity: isActive || isDone ? 1 : 0.5,
                  }}
                >
                  <div style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '8px',
                    backgroundColor: isDone ? '#059669' : isActive ? '#D97706' : '#F3F4F6',
                    color: isDone || isActive ? '#FFFFFF' : '#6B7280',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '0.85rem',
                    fontWeight: 600,
                    flexShrink: 0,
                    transition: 'all 0.2s',
                  }}>
                    {isDone ? <CheckCircle2 size={18} /> : s.number}
                  </div>
                  <div style={{ overflow: 'hidden' }}>
                    <div style={{
                      fontSize: '0.85rem',
                      fontWeight: isActive ? 600 : 500,
                      color: isActive ? '#111827' : '#4B5563',
                      whiteSpace: 'nowrap',
                      textOverflow: 'ellipsis',
                      overflow: 'hidden',
                    }}>
                      {s.title}
                    </div>
                    <div style={{
                      fontSize: '0.72rem',
                      color: '#9CA3AF',
                      display: 'none',
                    }}>
                      {s.subtitle}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Error Alert */}
        {errorMsg && (
          <div style={{
            backgroundColor: '#FEF2F2',
            border: '1px solid #FCA5A5',
            borderRadius: '12px',
            padding: '12px 16px',
            marginBottom: '20px',
            display: 'flex',
            alignItems: 'flex-start',
            gap: '10px',
            color: '#B91C1C',
            fontSize: '0.9rem',
          }}>
            <AlertCircle size={18} style={{ marginTop: '2px', flexShrink: 0 }} />
            <div style={{ lineHeight: 1.5 }}>{errorMsg}</div>
          </div>
        )}

        {/* Main Form Container */}
        <div style={{
          backgroundColor: '#FFFFFF',
          border: '1px solid #E5E7EB',
          borderRadius: '16px',
          padding: '28px 24px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
        }}>

          {/* ==================================================================== */}
          {/* STEP 1: General Info */}
          {/* ==================================================================== */}
          {step === 1 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>
              
              {/* Section: Organization Details */}
              <div>
                <div style={{
                  fontSize: '0.95rem',
                  fontWeight: 600,
                  color: '#111827',
                  marginBottom: '4px',
                }}>
                  1. ข้อมูลองค์กรและสถานที่ตั้ง
                </div>
                <div style={{ fontSize: '0.82rem', color: '#6B7280', marginBottom: '16px' }}>
                  ข้อมูลนี้จะแสดงต่อสาธารณะบนโปรไฟล์ของสัตว์เลี้ยงที่คุณดูแล
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  {/* Foundation Name */}
                  <div>
                    <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, color: '#374151', marginBottom: '6px' }}>
                      ชื่อมูลนิธิ / ศูนย์พักพิง <span style={{ color: '#DC2626' }}>*</span>
                    </label>
                    <input
                      type="text"
                      placeholder="ระบุชื่อเต็มของมูลนิธิ เช่น มูลนิธิบ้านเพื่อหมาแมว"
                      value={formData.foundation_name}
                      onChange={e => updateField('foundation_name', e.target.value)}
                      style={{
                        width: '100%',
                        height: '44px',
                        backgroundColor: '#FFFFFF',
                        border: '1px solid #D1D5DB',
                        borderRadius: '8px',
                        padding: '0 14px',
                        fontSize: '0.95rem',
                        color: '#111827',
                        outline: 'none',
                        boxSizing: 'border-box',
                        transition: 'border-color 0.15s, box-shadow 0.15s',
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

                  {/* Reg No, Contact Phone, PromptPay (Grid) */}
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
                    gap: '16px',
                  }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, color: '#374151', marginBottom: '6px' }}>
                        เลขทะเบียนนิติบุคคล / มูลนิธิ
                      </label>
                      <input
                        type="text"
                        placeholder="เช่น 01055xxxxxxxx (ถ้ามี)"
                        value={formData.registration_no}
                        onChange={e => updateField('registration_no', e.target.value)}
                        style={{
                          width: '100%',
                          height: '44px',
                          backgroundColor: '#FFFFFF',
                          border: '1px solid #D1D5DB',
                          borderRadius: '8px',
                          padding: '0 14px',
                          fontSize: '0.95rem',
                          color: '#111827',
                          outline: 'none',
                          boxSizing: 'border-box',
                          transition: 'border-color 0.15s, box-shadow 0.15s',
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

                    <div>
                      <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, color: '#374151', marginBottom: '6px' }}>
                        เบอร์โทรศัพท์ติดต่อหลัก <span style={{ color: '#DC2626' }}>*</span>
                      </label>
                      <input
                        type="tel"
                        placeholder="เช่น 0812345678 หรือ 021234567"
                        value={formData.contact_phone}
                        onChange={e => updateField('contact_phone', formatPhoneNumber(e.target.value))}
                        style={{
                          width: '100%',
                          height: '44px',
                          backgroundColor: '#FFFFFF',
                          border: '1px solid #D1D5DB',
                          borderRadius: '8px',
                          padding: '0 14px',
                          fontSize: '0.95rem',
                          color: '#111827',
                          outline: 'none',
                          boxSizing: 'border-box',
                          transition: 'border-color 0.15s, box-shadow 0.15s',
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
                      <span style={{ fontSize: '0.75rem', color: '#6B7280', marginTop: '4px', display: 'block' }}>
                        พิมพ์เฉพาะตัวเลขได้ จัดรูปแบบขีดให้อัตโนมัติ
                      </span>
                    </div>

                    <div>
                      <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, color: '#374151', marginBottom: '6px' }}>
                        เบอร์พร้อมเพย์รับบริจาค (PromptPay)
                      </label>
                      <input
                        type="text"
                        placeholder="เบอร์มือถือ หรือ เลข 13 หลัก"
                        value={formData.promptpay_number}
                        onChange={e => updateField('promptpay_number', e.target.value.replace(/[^\d-]/g, ''))}
                        style={{
                          width: '100%',
                          height: '44px',
                          backgroundColor: '#FFFFFF',
                          border: '1px solid #D1D5DB',
                          borderRadius: '8px',
                          padding: '0 14px',
                          fontSize: '0.95rem',
                          color: '#111827',
                          outline: 'none',
                          boxSizing: 'border-box',
                          transition: 'border-color 0.15s, box-shadow 0.15s',
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
                      <span style={{ fontSize: '0.75rem', color: '#6B7280', marginTop: '4px', display: 'block' }}>
                        สำหรับรับเงินบริจาคตรงเข้าบัญชีมูลนิธิ
                      </span>
                    </div>
                  </div>

                  {/* Address & Shelter Location */}
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px', flexWrap: 'wrap', gap: '8px' }}>
                      <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, color: '#374151' }}>
                        ที่ตั้งสำนักงาน / สถานสงเคราะห์
                      </label>
                      <button
                        type="button"
                        onClick={handleGetCurrentLocation}
                        disabled={isGettingLocation}
                        style={{
                          height: '30px',
                          padding: '0 12px',
                          borderRadius: '6px',
                          border: '1px solid #D97706',
                          backgroundColor: '#FEF3C7',
                          color: '#B45309',
                          fontSize: '0.78rem',
                          fontWeight: 600,
                          cursor: isGettingLocation ? 'not-allowed' : 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '6px',
                          transition: 'background-color 0.15s',
                        }}
                      >
                        {isGettingLocation ? <Loader2 size={13} className="spin" /> : <MapPin size={13} color="#D97706" />}
                        {isGettingLocation ? 'กำลังดึงพิกัด...' : 'ใช้พิกัดปัจจุบัน'}
                      </button>
                    </div>
                    <textarea
                      placeholder="ระบุที่อยู่ อาคาร หรือวางพิกัดจาก Google Maps (เช่น 16°28'19.4&quot;N 102°49'22.8&quot;E)"
                      value={formData.address}
                      onChange={e => updateField('address', e.target.value)}
                      rows={2}
                      style={{
                        width: '100%',
                        backgroundColor: '#FFFFFF',
                        border: '1px solid #D1D5DB',
                        borderRadius: '8px',
                        padding: '10px 14px',
                        fontSize: '0.95rem',
                        color: '#111827',
                        outline: 'none',
                        boxSizing: 'border-box',
                        resize: 'vertical',
                        lineHeight: 1.5,
                        transition: 'border-color 0.15s, box-shadow 0.15s',
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
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '6px', flexWrap: 'wrap', gap: '8px' }}>
                      <span style={{ fontSize: '0.75rem', color: '#6B7280' }}>
                        พิมพ์ชื่อสถานที่, ที่อยู่ หรือวางพิกัด Google Maps แล้วกดค้นหา หรือกดปุ่ม <b>"ใช้พิกัดปัจจุบัน"</b>
                      </span>
                      <button
                        type="button"
                        onClick={handleSearchCoordsFromAddress}
                        disabled={isSearchingAddress || !formData.address.trim()}
                        style={{
                          height: '28px',
                          padding: '0 10px',
                          borderRadius: '6px',
                          border: '1px solid #D97706',
                          backgroundColor: '#FEF3C7',
                          color: '#B45309',
                          fontSize: '0.78rem',
                          fontWeight: 600,
                          cursor: !formData.address.trim() ? 'not-allowed' : 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '5px',
                          opacity: !formData.address.trim() ? 0.5 : 1,
                          transition: 'all 0.15s'
                        }}
                      >
                        {isSearchingAddress ? <Loader2 size={13} className="spin" /> : <Search size={13} />}
                        {isSearchingAddress ? 'กำลังค้นหา...' : 'ค้นหาตำแหน่ง / พิกัดนี้'}
                      </button>
                    </div>

                    {/* Interactive Map with Draggable Pin */}
                    <div style={{ marginTop: '10px' }}>
                      <InteractiveLocationPicker
                        latitude={formData.latitude}
                        longitude={formData.longitude}
                        onChange={handleInteractivePinChange}
                        height={220}
                        zoom={17}
                      />
                      <div style={{ marginTop: '6px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '6px' }}>
                        <span style={{ fontSize: '0.74rem', color: '#6B7280' }}>
                          คลิกบนแผนที่หรือลากหมุดสีแดงเพื่อปรับจุดพิกัด
                        </span>
                        {formData.latitude && formData.longitude && (
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', color: '#059669', fontSize: '0.74rem', fontWeight: 600 }}>
                            <CheckCircle2 size={13} /> พิกัด: {Number(formData.latitude).toFixed(5)}, {Number(formData.longitude).toFixed(5)}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Description */}
                  <div>
                    <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, color: '#374151', marginBottom: '6px' }}>
                      บทนำและภารกิจขององค์กร
                    </label>
                    <textarea
                      placeholder="แนะนำภารกิจของมูลนิธิ เช่น การช่วยเหลือสุนัขจรจัด การทำหมัน และพื้นที่การดำเนินงาน"
                      value={formData.description}
                      onChange={e => updateField('description', e.target.value)}
                      rows={3}
                      style={{
                        width: '100%',
                        backgroundColor: '#FFFFFF',
                        border: '1px solid #D1D5DB',
                        borderRadius: '8px',
                        padding: '10px 14px',
                        fontSize: '0.95rem',
                        color: '#111827',
                        outline: 'none',
                        boxSizing: 'border-box',
                        resize: 'vertical',
                        lineHeight: 1.5,
                        transition: 'border-color 0.15s, box-shadow 0.15s',
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
                </div>
              </div>

              <div style={{ height: '1px', backgroundColor: '#F3F4F6' }} />

              {/* Section: Authorized Representative */}
              <div>
                <div style={{
                  fontSize: '0.95rem',
                  fontWeight: 600,
                  color: '#111827',
                  marginBottom: '4px',
                }}>
                  2. ผู้มีอำนาจลงนามหรือผู้ประสานงานหลัก
                </div>
                <div style={{ fontSize: '0.82rem', color: '#6B7280', marginBottom: '16px' }}>
                  เจ้าหน้าที่จะใช้ข้อมูลนี้ในการยืนยันตัวตนและการติดต่อประสานงานที่เป็นความลับ
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, color: '#374151', marginBottom: '6px' }}>
                    ชื่อ-นามสกุล ผู้รับผิดชอบ <span style={{ color: '#DC2626' }}>*</span>
                  </label>
                  <input
                    type="text"
                    placeholder="ระบุชื่อและนามสกุลจริงตามบัตรประชาชน"
                    value={formData.contact_person}
                    onChange={e => updateField('contact_person', e.target.value)}
                    style={{
                      width: '100%',
                      height: '44px',
                      backgroundColor: '#FFFFFF',
                      border: '1px solid #D1D5DB',
                      borderRadius: '8px',
                      padding: '0 14px',
                      fontSize: '0.95rem',
                      color: '#111827',
                      outline: 'none',
                      boxSizing: 'border-box',
                      transition: 'border-color 0.15s, box-shadow 0.15s',
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
              </div>

            </div>
          )}

          {/* ==================================================================== */}
          {/* STEP 2: Verification Documents */}
          {/* ==================================================================== */}
          {step === 2 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              
              <div>
                <div style={{ fontSize: '0.95rem', fontWeight: 600, color: '#111827', marginBottom: '4px' }}>
                  เอกสารประกอบการพิจารณา
                </div>
                <div style={{ fontSize: '0.82rem', color: '#6B7280' }}>
                  อัปโหลดเอกสารเพื่อแสดงความเป็นนิติบุคคลหรือองค์กรสาธารณกุศลที่ถูกต้องตามกฎหมาย
                </div>
              </div>

              {/* Security Banner */}
              <div style={{
                backgroundColor: '#F8FAFC',
                border: '1px solid #E2E8F0',
                borderRadius: '10px',
                padding: '12px 14px',
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                fontSize: '0.82rem',
                color: '#475569',
              }}>
                <Lock size={16} color="#64748B" style={{ flexShrink: 0 }} />
                <span>
                  เอกสารของคุณได้รับการปกป้องด้วยการเข้ารหัส และจำกัดสิทธิ์การเข้าถึงเฉพาะเจ้าหน้าที่ตรวจสอบเท่านั้น
                </span>
              </div>

              {/* Document Rows */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                {Object.entries(documents).map(([docType, file]) => {
                  const isRequired = docType === 'registration_cert';
                  return (
                    <div
                      key={docType}
                      style={{
                        border: '1px solid #E5E7EB',
                        borderRadius: '12px',
                        padding: '16px',
                        backgroundColor: file ? '#F9FDFB' : '#FFFFFF',
                        transition: 'border-color 0.2s',
                      }}
                    >
                      <div style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'flex-start',
                        gap: '12px',
                        marginBottom: '8px',
                      }}>
                        <div>
                          <div style={{ fontSize: '0.9rem', fontWeight: 600, color: '#111827' }}>
                            {getDocLabel(docType)}
                            {isRequired ? (
                              <span style={{ color: '#DC2626', marginLeft: '4px' }}>*</span>
                            ) : (
                              <span style={{ fontSize: '0.75rem', color: '#9CA3AF', fontWeight: 400, marginLeft: '6px' }}>(ไม่บังคับ)</span>
                            )}
                          </div>
                          <div style={{ fontSize: '0.8rem', color: '#6B7280', marginTop: '2px' }}>
                            {getDocDescription(docType)}
                          </div>
                        </div>

                        {file && (
                          <span style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            fontSize: '0.75rem',
                            color: '#059669',
                            fontWeight: 600,
                            backgroundColor: '#ECFDF5',
                            padding: '3px 8px',
                            borderRadius: '6px',
                            flexShrink: 0,
                          }}>
                            <CheckCircle2 size={13} /> พร้อมส่ง
                          </span>
                        )}
                      </div>

                      {/* File Card or Upload Trigger */}
                      {file ? (
                        <div style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          backgroundColor: '#FFFFFF',
                          border: '1px solid #D1D5DB',
                          borderRadius: '8px',
                          padding: '8px 12px',
                          marginTop: '8px',
                        }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}>
                            <FileText size={18} color="#059669" style={{ flexShrink: 0 }} />
                            <div style={{ minWidth: 0 }}>
                              <div style={{
                                fontSize: '0.85rem',
                                fontWeight: 500,
                                color: '#111827',
                                whiteSpace: 'nowrap',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                              }}>
                                {file.name}
                              </div>
                              <div style={{ fontSize: '0.72rem', color: '#6B7280' }}>
                                {(file.size / (1024 * 1024)).toFixed(2)} MB
                              </div>
                            </div>
                          </div>

                          <button
                            type="button"
                            onClick={() => removeFile(docType)}
                            style={{
                              background: 'none',
                              border: 'none',
                              color: '#9CA3AF',
                              cursor: 'pointer',
                              padding: '4px',
                              display: 'flex',
                              alignItems: 'center',
                              borderRadius: '4px',
                            }}
                            title="ลบเอกสาร"
                          >
                            <X size={16} />
                          </button>
                        </div>
                      ) : (
                        <div style={{ marginTop: '10px' }}>
                          <label style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '6px',
                            padding: '8px 14px',
                            backgroundColor: '#F3F4F6',
                            border: '1px solid #D1D5DB',
                            borderRadius: '8px',
                            fontSize: '0.82rem',
                            fontWeight: 500,
                            color: '#374151',
                            cursor: 'pointer',
                            transition: 'background-color 0.15s',
                          }}>
                            <Upload size={14} />
                            <span>เลือกไฟล์เอกสาร</span>
                            <input
                              type="file"
                              accept=".pdf,.jpg,.jpeg,.png"
                              onChange={(e) => handleFileChange(docType, e)}
                              style={{ display: 'none' }}
                            />
                          </label>
                          <span style={{ fontSize: '0.75rem', color: '#9CA3AF', marginLeft: '10px' }}>
                            PDF, PNG หรือ JPG (ไม่เกิน 5MB)
                          </span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

            </div>
          )}

          {/* ==================================================================== */}
          {/* STEP 3: Review & Summary */}
          {/* ==================================================================== */}
          {step === 3 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
              
              <div>
                <div style={{ fontSize: '0.95rem', fontWeight: 600, color: '#111827', marginBottom: '4px' }}>
                  ตรวจสอบความถูกต้องก่อนยื่นเรื่อง
                </div>
                <div style={{ fontSize: '0.82rem', color: '#6B7280' }}>
                  กรุณาตรวจทานข้อมูลและเอกสารประกอบ เพื่อให้กระบวนการอนุมัติเป็นไปด้วยความรวดเร็ว
                </div>
              </div>

              {/* Data Review Card */}
              <div style={{
                border: '1px solid #E5E7EB',
                borderRadius: '12px',
                overflow: 'hidden',
              }}>
                <div style={{
                  padding: '12px 16px',
                  backgroundColor: '#F9FAFB',
                  borderBottom: '1px solid #E5E7EB',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}>
                  <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#374151' }}>
                    ข้อมูลมูลนิธิ
                  </span>
                  <button
                    type="button"
                    onClick={() => setStep(1)}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: '#D97706',
                      fontSize: '0.8rem',
                      fontWeight: 500,
                      cursor: 'pointer',
                      padding: 0,
                    }}
                  >
                    แก้ไข
                  </button>
                </div>

                <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px', fontSize: '0.875rem' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '140px 1fr', gap: '8px' }}>
                    <span style={{ color: '#6B7280' }}>ชื่อองค์กร:</span>
                    <strong style={{ color: '#111827' }}>{formData.foundation_name}</strong>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '140px 1fr', gap: '8px' }}>
                    <span style={{ color: '#6B7280' }}>เลขทะเบียน:</span>
                    <span style={{ color: '#111827' }}>{formData.registration_no || '-'}</span>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '140px 1fr', gap: '8px' }}>
                    <span style={{ color: '#6B7280' }}>ผู้มีอำนาจลงนาม:</span>
                    <span style={{ color: '#111827' }}>{formData.contact_person}</span>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '140px 1fr', gap: '8px' }}>
                    <span style={{ color: '#6B7280' }}>เบอร์โทรศัพท์:</span>
                    <span style={{ color: '#111827' }}>{formData.contact_phone}</span>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '140px 1fr', gap: '8px' }}>
                    <span style={{ color: '#6B7280' }}>ที่ตั้ง:</span>
                    <span style={{ color: '#111827', wordBreak: 'break-word' }}>{formData.address || '-'}</span>
                  </div>
                  {formData.description && (
                    <div style={{ display: 'grid', gridTemplateColumns: '140px 1fr', gap: '8px' }}>
                      <span style={{ color: '#6B7280' }}>ภารกิจ:</span>
                      <span style={{ color: '#111827', wordBreak: 'break-word', lineHeight: 1.5 }}>{formData.description}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Documents Review Card */}
              <div style={{
                border: '1px solid #E5E7EB',
                borderRadius: '12px',
                overflow: 'hidden',
              }}>
                <div style={{
                  padding: '12px 16px',
                  backgroundColor: '#F9FAFB',
                  borderBottom: '1px solid #E5E7EB',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}>
                  <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#374151' }}>
                    เอกสารที่แนบ
                  </span>
                  <button
                    type="button"
                    onClick={() => setStep(2)}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: '#D97706',
                      fontSize: '0.8rem',
                      fontWeight: 500,
                      cursor: 'pointer',
                      padding: 0,
                    }}
                  >
                    แก้ไข
                  </button>
                </div>

                <div style={{ padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {Object.entries(documents).map(([docType, file]) => (
                    <div
                      key={docType}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        fontSize: '0.85rem',
                        padding: '6px 0',
                      }}
                    >
                      <span style={{ color: '#4B5563' }}>{getDocLabel(docType)}</span>
                      {file ? (
                        <span style={{ color: '#059669', fontWeight: 500, display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                          <CheckCircle2 size={15} /> {file.name}
                        </span>
                      ) : (
                        <span style={{ color: '#9CA3AF' }}>ไม่ได้แนบ</span>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Legal Notice */}
              <div style={{
                fontSize: '0.8rem',
                color: '#6B7280',
                lineHeight: 1.5,
                backgroundColor: '#F9FAFB',
                padding: '12px 14px',
                borderRadius: '8px',
              }}>
                การกดยืนยันถือว่าท่านรับรองว่าข้อมูลและเอกสารทั้งหมดเป็นความจริง เจ้าหน้าที่จะทำการตรวจสอบและแจ้งผลการอนุมัติภายใน 1–2 วันทำการ
              </div>

            </div>
          )}

          {/* Form Actions (Sticky-friendly bottom buttons) */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginTop: '28px',
            paddingTop: '20px',
            borderTop: '1px solid #F3F4F6',
          }}>
            {step > 1 ? (
              <button
                type="button"
                onClick={prevStep}
                disabled={isSubmitting}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  height: '42px',
                  padding: '0 18px',
                  backgroundColor: '#FFFFFF',
                  border: '1px solid #D1D5DB',
                  borderRadius: '8px',
                  fontSize: '0.875rem',
                  fontWeight: 500,
                  color: '#374151',
                  cursor: 'pointer',
                  transition: 'background-color 0.15s',
                }}
                onMouseEnter={e => e.currentTarget.style.backgroundColor = '#F9FAFB'}
                onMouseLeave={e => e.currentTarget.style.backgroundColor = '#FFFFFF'}
              >
                <ChevronLeft size={16} /> ย้อนกลับ
              </button>
            ) : (
              <div />
            )}

            {step < 3 ? (
              <button
                type="button"
                onClick={nextStep}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  height: '42px',
                  padding: '0 24px',
                  backgroundColor: '#D97706',
                  border: 'none',
                  borderRadius: '8px',
                  fontSize: '0.875rem',
                  fontWeight: 600,
                  color: '#FFFFFF',
                  cursor: 'pointer',
                  boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
                  transition: 'background-color 0.15s',
                }}
                onMouseEnter={e => e.currentTarget.style.backgroundColor = '#B45309'}
                onMouseLeave={e => e.currentTarget.style.backgroundColor = '#D97706'}
              >
                ขั้นตอนถัดไป <ChevronRight size={16} />
              </button>
            ) : (
              <button
                type="button"
                onClick={handleSubmit}
                disabled={isSubmitting}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                  height: '42px',
                  padding: '0 24px',
                  backgroundColor: isSubmitting ? '#9CA3AF' : '#059669',
                  border: 'none',
                  borderRadius: '8px',
                  fontSize: '0.875rem',
                  fontWeight: 600,
                  color: '#FFFFFF',
                  cursor: isSubmitting ? 'not-allowed' : 'pointer',
                  boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
                  transition: 'background-color 0.15s',
                }}
                onMouseEnter={e => {
                  if (!isSubmitting) e.currentTarget.style.backgroundColor = '#047857';
                }}
                onMouseLeave={e => {
                  if (!isSubmitting) e.currentTarget.style.backgroundColor = '#059669';
                }}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 size={16} className="spin" /> กำลังส่งข้อมูล...
                  </>
                ) : (
                  <>
                    <CheckCircle2 size={16} /> ยืนยันและส่งเอกสาร
                  </>
                )}
              </button>
            )}
          </div>

        </div>

        {/* Footnote */}
        <div style={{
          textAlign: 'center',
          marginTop: '24px',
          fontSize: '0.8rem',
          color: '#9CA3AF',
        }}>
          ต้องการความช่วยเหลือในการลงทะเบียน? ติดต่อฝ่ายสนับสนุน 4 ขาหาบ้าน
        </div>

      </div>
    </div>
  );
};

export default FoundationOnboarding;
