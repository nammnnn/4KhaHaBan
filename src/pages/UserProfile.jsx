import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../services/supabaseClient';
import {
  User, LogOut, Edit3, ChevronRight,
  Heart, Settings, MessageCircle, Shield,
  Award, Sparkles, Mail, Camera, PawPrint, ClipboardList, Users, FileWarning,
  Building2, PiggyBank, ShieldCheck, MessageSquare, Briefcase, X, Loader, CheckCircle, Phone, MapPin, Search, ExternalLink,
  CheckCircle2, ArrowRight, FileText, AlertCircle, Eye
} from 'lucide-react';
import { searchCoordinatesFromAddress, getAddressFromCoordinates, parseCoordinatesFromText } from '../lib/geo';
import InteractiveLocationPicker from '../components/InteractiveLocationPicker';
import { useAppContext } from '../context/AppContext';
import { api } from '../services/api';
import { loadSavedLocation } from '../lib/geo';
import { Badge, Button, Dialog, Field, useToast } from '../components/ui';
import { ProfileSection, InfoRow, AdoptionRequests, FaqList } from '../components/profile/ProfileSections';
import '../components/profile/ProfileSections.css';

export default function UserProfile() {
  const { user, profile, role, foundationStatus, userVerificationStatus, logout, updateProfile } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();
  const { matches } = useAppContext();
  const [searchParams] = useSearchParams();
  const [searchPrefs, setSearchPrefs] = useState(null);
  const [imgError, setImgError] = useState(false);
  
  // Settings Modal states
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [editFullName, setEditFullName] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [saveSuccessMsg, setSaveSuccessMsg] = useState('');
  const [saveErrorMsg, setSaveErrorMsg] = useState('');

  // Foundation Location Modal states
  const [isLocationModalOpen, setIsLocationModalOpen] = useState(false);
  const [foundationLocationData, setFoundationLocationData] = useState({
    foundation_name: '',
    address: '',
    latitude: '',
    longitude: '',
    contact_phone: '',
    promptpay_number: ''
  });
  const [isFetchingLocation, setIsFetchingLocation] = useState(false);
  const [isSavingLocation, setIsSavingLocation] = useState(false);
  const [locationSuccessMsg, setLocationSuccessMsg] = useState('');
  const [locationErrorMsg, setLocationErrorMsg] = useState('');
  const [isGettingGps, setIsGettingGps] = useState(false);
  const [isSearchingAddressGps, setIsSearchingAddressGps] = useState(false);

  // Foundation Status / Certification Modal states
  const [isFoundationStatusModalOpen, setIsFoundationStatusModalOpen] = useState(false);
  const [foundationDetails, setFoundationDetails] = useState(null);

  // Foundation Documents states
  const [foundationDocs, setFoundationDocs] = useState([]);
  const [isLoadingDocs, setIsLoadingDocs] = useState(false);
  const [selectedDocToView, setSelectedDocToView] = useState(null);
  const [viewDocModalOpen, setViewDocModalOpen] = useState(false);

  // Avatar upload states
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const avatarInputRef = useRef(null);

  useEffect(() => {
    setImgError(false);
  }, [profile?.avatar_url, user?.user_metadata?.avatar_url]);

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

  const formatApprovalDate = (dateStr) => {
    if (!dateStr) return null;
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString('th-TH', { year: 'numeric', month: 'long', day: 'numeric' });
    } catch (e) {
      return null;
    }
  };

  const getDocTypeShortName = (type) => {
    switch (type) {
      case 'registration_cert': return 'ใบอนุญาต/ทะเบียน';
      case 'id_card': return 'บัตรประชาชน';
      case 'address_proof': return 'หลักฐานที่ตั้ง';
      default: return 'เอกสารแนบ';
    }
  };

  const getDocTypeFullName = (type) => {
    switch (type) {
      case 'registration_cert': return 'ใบอนุญาตจัดตั้งมูลนิธิ / หนังสือรับรองการจดทะเบียน';
      case 'id_card': return 'สำเนาบัตรประชาชนผู้มีอำนาจลงนาม';
      case 'address_proof': return 'หลักฐานสถานที่ตั้งศูนย์พักพิง';
      default: return 'เอกสารประกอบการยื่นขอรับรอง';
    }
  };

  useEffect(() => {
    if (profile) {
      setEditFullName(profile.full_name || user?.user_metadata?.full_name || '');
      setEditPhone(profile.phone ? formatPhoneNumber(profile.phone) : '');
    }
  }, [profile, user]);

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/login');
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const handleAvatarSelect = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast('กรุณาเลือกไฟล์รูปภาพ (JPG หรือ PNG)', { tone: 'error' });
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast('รูปต้องมีขนาดไม่เกิน 5MB ลองเลือกรูปที่เล็กลง', { tone: 'error' });
      return;
    }

    setIsUploadingAvatar(true);
    try {
      if (supabase && user) {
        const fileExt = file.name.split('.').pop();
        const fileName = `avatar_${user.id}_${Date.now()}.${fileExt}`;
        
        const { error: uploadError } = await supabase.storage
          .from('chat_images')
          .upload(fileName, file, { upsert: true });

        if (uploadError) throw uploadError;

        const { data: publicUrlData } = supabase.storage
          .from('chat_images')
          .getPublicUrl(fileName);

        const newAvatarUrl = publicUrlData.publicUrl;
        await updateProfile({ avatar_url: newAvatarUrl });
      }
    } catch (error) {
      console.error('Error uploading avatar:', error);
      toast('อัปโหลดรูปโปรไฟล์ไม่สำเร็จ กรุณาลองอีกครั้ง', { tone: 'error' });
    } finally {
      setIsUploadingAvatar(false);
    }
  };

  const handleSaveSettings = async (e) => {
    e.preventDefault();
    if (!editFullName.trim()) {
      setSaveErrorMsg('กรุณากรอกชื่อ-นามสกุล');
      return;
    }

    setIsSavingProfile(true);
    setSaveErrorMsg('');
    setSaveSuccessMsg('');

    try {
      const result = await updateProfile({
        full_name: editFullName.trim(),
        phone: editPhone.trim()
      });

      if (result.error) throw result.error;

      setSaveSuccessMsg('บันทึกข้อมูลเรียบร้อยแล้ว');
      setTimeout(() => {
        setIsSettingsOpen(false);
        setSaveSuccessMsg('');
      }, 1200);
    } catch (err) {
      console.error('Error updating settings:', err);
      setSaveErrorMsg(err.message || 'เกิดข้อผิดพลาดในการบันทึกข้อมูล');
    } finally {
      setIsSavingProfile(false);
    }
  };

  const fetchFoundationLocation = async () => {
    if (!user || !supabase) return;
    setIsFetchingLocation(true);
    setLocationSuccessMsg('');
    setLocationErrorMsg('');
    try {
      const { data, error } = await supabase
        .from('foundation_profiles')
        .select('*')
        .eq('id', user.id)
        .maybeSingle();

      if (data) {
        setFoundationDetails(data);
        setFoundationLocationData({
          foundation_name: data.foundation_name || profile?.full_name || '',
          address: data.address || '',
          latitude: data.latitude ? String(data.latitude) : '',
          longitude: data.longitude ? String(data.longitude) : '',
          contact_phone: data.contact_phone || profile?.phone || '',
          promptpay_number: data.promptpay_number || ''
        });
      } else {
        setFoundationDetails({
          foundation_name: profile?.full_name || '',
          address: '',
          latitude: '',
          longitude: '',
          contact_phone: profile?.phone || '',
          promptpay_number: '',
          registration_no: ''
        });
        setFoundationLocationData({
          foundation_name: profile?.full_name || '',
          address: '',
          latitude: '',
          longitude: '',
          contact_phone: profile?.phone || '',
          promptpay_number: ''
        });
      }
    } catch (err) {
      console.error('Error fetching foundation profile:', err);
    } finally {
      setIsFetchingLocation(false);
    }
  };

  useEffect(() => {
    if (role === 'foundation') {
      fetchFoundationLocation();
      fetchFoundationDocuments();
    }

    const modalParam = searchParams.get('modal') || searchParams.get('open');
    if (modalParam === 'foundation' || modalParam === 'location') {
      fetchFoundationLocation();
      setIsLocationModalOpen(true);
    } else if (modalParam === 'settings') {
      setIsSettingsOpen(true);
    }
  }, [role, user, searchParams]);

  const fetchFoundationDocuments = async () => {
    if (!user || !supabase) return [];
    setIsLoadingDocs(true);
    try {
      const { data: docs, error } = await supabase
        .from('foundation_documents')
        .select('*')
        .eq('foundation_id', user.id);

      if (error) throw error;

      const resolvedDocs = [];
      if (docs && docs.length > 0) {
        for (const doc of docs) {
          let url = null;
          if (doc.file_url && doc.file_url.startsWith('http')) {
            url = doc.file_url;
          } else if (doc.file_path) {
            if (doc.file_path.startsWith('http')) {
              url = doc.file_path;
            } else {
              const { data: urlData, error: urlError } = await supabase.storage
                .from('foundation-docs')
                .createSignedUrl(doc.file_path, 3600);
              if (!urlError && urlData?.signedUrl) {
                url = urlData.signedUrl;
              } else {
                const { data: pubData } = supabase.storage
                  .from('foundation-docs')
                  .getPublicUrl(doc.file_path);
                if (pubData?.publicUrl) {
                  url = pubData.publicUrl;
                }
              }
            }
          }

          const fileExt = (doc.file_path || doc.file_name || '').toLowerCase();
          resolvedDocs.push({
            ...doc,
            url,
            isPdf: fileExt.endsWith('.pdf')
          });
        }
      }
      setFoundationDocs(resolvedDocs);
      return resolvedDocs;
    } catch (err) {
      console.error('Error fetching foundation documents:', err);
      return [];
    } finally {
      setIsLoadingDocs(false);
    }
  };

  const handleOpenPermitDoc = async () => {
    let docs = foundationDocs;
    if (!docs || docs.length === 0) {
      docs = await fetchFoundationDocuments();
    }

    if (docs && docs.length > 0) {
      const permitDoc = docs.find(d => d.doc_type === 'registration_cert') || docs[0];
      setSelectedDocToView({
        docType: permitDoc.doc_type,
        title: getDocTypeFullName(permitDoc.doc_type),
        url: permitDoc.url,
        isPdf: permitDoc.isPdf,
        fileName: permitDoc.file_name || permitDoc.file_path?.split('/').pop() || 'ใบอนุญาตจัดตั้งมูลนิธิ'
      });
    } else {
      setSelectedDocToView({
        docType: 'registration_cert',
        title: 'ใบอนุญาตจัดตั้งมูลนิธิ',
        url: null,
        isPdf: false,
        fileName: null,
        emptyNotice: 'ไม่พบไฟล์เอกสารแนบในระบบ บัญชีมูลนิธินี้ได้รับการอนุมัติอย่างเป็นทางการในฐานข้อมูลแล้ว'
      });
    }
    setViewDocModalOpen(true);
  };

  const handleViewSpecificDoc = (doc) => {
    setSelectedDocToView({
      docType: doc.doc_type,
      title: getDocTypeFullName(doc.doc_type),
      url: doc.url,
      isPdf: doc.isPdf,
      fileName: doc.file_name || doc.file_path?.split('/').pop() || 'เอกสารแนบ'
    });
    setViewDocModalOpen(true);
  };

  useEffect(() => {
    if (searchParams.get('editLocation') === 'true' && role === 'foundation') {
      setIsLocationModalOpen(true);
    }
  }, [searchParams, role]);

  const handleSearchCoordsFromAddress = async () => {
    const query = foundationLocationData.address.trim();
    if (!query) {
      setLocationErrorMsg('กรุณากรอกที่อยู่ศูนย์พักพิง หรือวางพิกัดก่อนกดค้นหา');
      return;
    }
    setIsSearchingAddressGps(true);
    setLocationErrorMsg('');
    setLocationSuccessMsg('');
    try {
      const geoResult = await searchCoordinatesFromAddress(query);
      if (geoResult) {
        const lat = geoResult.latitude.toFixed(6);
        const lng = geoResult.longitude.toFixed(6);

        // หากผู้ใช้ป้อนพิกัดมาโดยตรง ลองดึงชื่อที่อยู่อัตโนมัติ
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

        setFoundationLocationData(prev => ({
          ...prev,
          latitude: lat,
          longitude: lng,
          address: resolvedAddress
        }));
        const placeShort = geoResult.displayName.split(',')[0];
        setLocationSuccessMsg(`ปักหมุดสำเร็จ: ${placeShort} (${lat}, ${lng}) สามารถลากหมุดบนแผนที่เพื่อปรับตำแหน่งได้`);
        setTimeout(() => setLocationSuccessMsg(''), 5000);
      } else {
        setLocationErrorMsg('ไม่พบพิกัดจากที่อยู่นี้ กรุณาระบุชื่อตำบล อำเภอ หรือคลิกปักหมุดบนแผนที่ได้โดยตรง');
      }
    } catch (err) {
      console.warn('Geocoding error:', err);
      setLocationErrorMsg('เกิดข้อผิดพลาดในการค้นหาพิกัด');
    } finally {
      setIsSearchingAddressGps(false);
    }
  };

  const handleInteractivePinChange = async (lat, lng) => {
    setFoundationLocationData(prev => ({
      ...prev,
      latitude: String(lat),
      longitude: String(lng)
    }));

    // ดึงชื่อที่อยู่ภาษาไทยตามจุดพิกัดใหม่ที่ผู้ใช้ลากหมุดไปวาง
    try {
      const rev = await getAddressFromCoordinates(lat, lng);
      if (rev && rev.formattedAddress) {
        setFoundationLocationData(prev => ({
          ...prev,
          address: rev.formattedAddress
        }));
      }
    } catch (e) {
      console.warn('Pin change reverse geocode error:', e);
    }
  };

  const handleGetGpsLocation = () => {
    if (!navigator.geolocation) {
      setLocationErrorMsg('เบราว์เซอร์ของคุณไม่รองรับการดึงพิกัด GPS');
      return;
    }
    setIsGettingGps(true);
    setLocationErrorMsg('');
    setLocationSuccessMsg('');
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const lat = pos.coords.latitude.toFixed(6);
        const lng = pos.coords.longitude.toFixed(6);

        // Reverse geocode เพื่อดึงชื่อที่อยู่ภาษาไทยอัตโนมัติ
        let resolvedAddress = '';
        try {
          const rev = await getAddressFromCoordinates(lat, lng);
          if (rev && rev.formattedAddress) {
            resolvedAddress = rev.formattedAddress;
          }
        } catch (e) {
          console.warn('Reverse geocode error:', e);
        }

        setFoundationLocationData(prev => ({
          ...prev,
          latitude: lat,
          longitude: lng,
          address: resolvedAddress || prev.address
        }));
        setIsGettingGps(false);
        if (resolvedAddress) {
          setLocationSuccessMsg(`ระบุพิกัดและที่อยู่สำเร็จ: ${resolvedAddress}`);
        } else {
          setLocationSuccessMsg(`ระบุพิกัดสำเร็จ (${lat}, ${lng})`);
        }
        setTimeout(() => setLocationSuccessMsg(''), 4000);
      },
      (err) => {
        console.warn('GPS error:', err);
        setLocationErrorMsg('ไม่สามารถเข้าถึงพิกัด GPS ได้ กรุณาอนุญาตให้เข้าถึงตำแหน่งในเบราว์เซอร์ หรือใช้ปุ่ม "ค้นหาตำแหน่งจากที่อยู่นี้"');
        setIsGettingGps(false);
      },
      { enableHighAccuracy: true, timeout: 8000 }
    );
  };

  const handleSaveFoundationLocation = async (e) => {
    e.preventDefault();
    if (!user || !supabase) return;

    setIsSavingLocation(true);
    setLocationSuccessMsg('');
    setLocationErrorMsg('');

    try {
      const lat = foundationLocationData.latitude ? parseFloat(foundationLocationData.latitude) : null;
      const lng = foundationLocationData.longitude ? parseFloat(foundationLocationData.longitude) : null;

      const { error } = await supabase
        .from('foundation_profiles')
        .update({
          address: foundationLocationData.address.trim(),
          latitude: lat,
          longitude: lng,
          contact_phone: foundationLocationData.contact_phone.trim(),
          promptpay_number: (foundationLocationData.promptpay_number || '').trim().replace(/[-\s]/g, '')
        })
        .eq('id', user.id);

      if (error) throw error;

      // อัปเดตพิกัดสัตว์เลี้ยงที่ยังไม่มีพิกัดเฉพาะ ให้ได้รับพิกัดศูนย์พักพิงใหม่ทันที
      if (lat && lng) {
        await supabase
          .from('animals')
          .update({ latitude: lat, longitude: lng })
          .eq('foundation_id', user.id)
          .is('latitude', null);
      }

      setLocationSuccessMsg('บันทึกที่ตั้งและพิกัดศูนย์พักพิงเรียบร้อยแล้ว');
      setTimeout(() => {
        setIsLocationModalOpen(false);
      }, 1200);
    } catch (err) {
      console.error('Failed to update foundation location:', err);
      setLocationErrorMsg(err.message || 'เกิดข้อผิดพลาดในการบันทึกข้อมูล');
    } finally {
      setIsSavingLocation(false);
    }
  };

  const getRoleDisplayName = (r) => {
    if (r === 'super_admin') return 'ผู้ดูแลระบบ';
    if (r === 'foundation') return 'มูลนิธิ/ศูนย์พักพิง';
    return 'ผู้ใช้งานทั่วไป';
  };

  const getRoleBadgeClasses = (r) => {
    if (r === 'super_admin') return { bg: '#FEF2F2', text: '#DC2626', border: '#FCA5A5' };
    if (r === 'foundation') return { bg: '#FEF3C7', text: '#D97706', border: '#FCD34D' };
    return { bg: 'var(--gray-100)', text: 'var(--text-medium)', border: 'var(--gray-200)' };
  };

  const roleBadge = getRoleBadgeClasses(role);

  const isVerified = 
    userVerificationStatus === 'verified' ||
    (user?.email && user.email.toLowerCase().trim() === 'songkaen2547@gmail.com') ||
    user?.user_metadata?.is_verified === true ||
    user?.user_metadata?.user_verification_status === 'verified' ||
    profile?.is_verified === true;

  const menuItems = [
    {
      key: 'settings', label: 'การตั้งค่าบัญชี', desc: '',
      icon: <Settings size={24} />, show: true, 
      onClick: () => {
        setSaveErrorMsg('');
        setSaveSuccessMsg('');
        setIsSettingsOpen(true);
      },
    },
    {
      key: 'foundation-location', label: 'ข้อมูลศูนย์พักพิง, ที่อยู่จัดส่ง และพร้อมเพย์', desc: 'แก้ไขที่อยู่จัดส่งพัสดุ, เบอร์ติดต่อ, เบอร์พร้อมเพย์ และพิกัด GPS',
      icon: <MapPin size={24} />, show: role === 'foundation', 
      onClick: () => {
        fetchFoundationLocation();
        setIsLocationModalOpen(true);
      },
    },
    {
      key: 'foundation-status', label: 'สถานะการรับรองมูลนิธิ', 
      desc: foundationStatus === 'approved' ? 'อนุมัติแล้ว' : foundationStatus === 'pending' ? 'รอตรวจสอบ' : foundationStatus === 'rejected' ? 'ไม่ผ่านการอนุมัติ' : 'ยังไม่ส่งข้อมูล', 
      badge: true,
      badgeColor: foundationStatus === 'approved' ? 'rgba(33, 225, 146, 0.15)' : foundationStatus === 'rejected' ? 'rgba(239, 68, 68, 0.15)' : 'rgba(249, 168, 38, 0.2)',
      badgeTextColor: foundationStatus === 'approved' ? '#1b7b68' : foundationStatus === 'rejected' ? '#DC2626' : '#D97706',
      icon: <Briefcase size={24} />, show: role === 'foundation', 
      onClick: () => {
        if (foundationStatus === 'approved') {
          if (!foundationDetails) {
            fetchFoundationLocation();
          }
          setIsFoundationStatusModalOpen(true);
        } else if (foundationStatus === 'pending' || foundationStatus === 'rejected') {
          navigate('/foundation/pending');
        } else if (foundationStatus === 'none') {
          navigate('/foundation/onboarding');
        }
      },
    },
    {
      key: 'user-verification', label: 'ยืนยันตัวตน', 
      desc: isVerified ? 'เสร็จสิ้น' : 'ยังไม่ยืนยัน', 
      badge: true,
      badgeColor: isVerified ? 'rgba(33, 225, 146, 0.15)' : 'rgba(249, 168, 38, 0.2)',
      badgeTextColor: isVerified ? '#1b7b68' : '#D97706',
      icon: <ShieldCheck size={24} />, show: role === 'user', onClick: () => navigate('/verify-user'),
    },
    {
      key: 'contact-admin', label: 'ติดต่อฝ่ายสนับสนุน', desc: '',
      icon: <MessageSquare size={24} />, show: role !== 'super_admin', onClick: () => navigate('/support-chat'),
    },
  ].filter(item => item.show);

  const avatarUrl = profile?.avatar_url || user?.user_metadata?.avatar_url;
  const displayName = profile?.full_name || user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'ผู้ใช้งาน';
  const displayEmail = user?.email || 'user@example.com';

  // Search preferences shown in the "การค้นหา" section (adopters only)
  useEffect(() => {
    if (role !== 'user' || !user?.id) return;
    api.getUserPreferences(user.id).then(setSearchPrefs).catch(() => {});
  }, [role, user?.id]);

  const savedArea = loadSavedLocation();
  // Only mention what the user narrowed down, e.g. "แมว · 50 กม." or "ทั้งหมด · 50 กม."
  const prefsSummary = searchPrefs
    ? [
        { dog: 'สุนัข', cat: 'แมว' }[searchPrefs.animalType],
        { male: 'ตัวผู้', female: 'ตัวเมีย' }[searchPrefs.gender],
      ].filter(Boolean).concat(searchPrefs.maxDistance >= 300 ? 'ทุกระยะ' : `${searchPrefs.maxDistance} กม.`)
        .join(' · ')
        .replace(/^(\d+ กม\.|ทุกระยะ)$/, 'ทั้งหมด · $1')
    : '…';
  const initial = (displayName || '?').trim().charAt(0).toUpperCase();
  const foundationMenu = menuItems.filter((item) => item.key.startsWith('foundation'));
  const settingsOpen = () => {
    setSaveErrorMsg('');
    setSaveSuccessMsg('');
    setIsSettingsOpen(true);
  };

  return (
    <div className="page-container" style={{ padding: 0, minHeight: '100dvh' }}>
      <div className="pf-page">
        <input
          type="file"
          ref={avatarInputRef}
          accept="image/*"
          style={{ display: 'none' }}
          onChange={handleAvatarSelect}
        />

        {/* Header */}
        <motion.header
          className="pf-header"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2 }}
        >
          <div className="pf-avatar">
            <div className="pf-avatar__img">
              {isUploadingAvatar ? (
                <Loader className="spin" size={28} />
              ) : avatarUrl && !imgError ? (
                <img src={avatarUrl} alt="" onError={() => setImgError(true)} />
              ) : (
                initial
              )}
            </div>
            <button
              type="button"
              className="pf-avatar__edit"
              onClick={() => avatarInputRef.current?.click()}
              disabled={isUploadingAvatar}
              aria-label="เปลี่ยนรูปโปรไฟล์"
              title="เปลี่ยนรูปโปรไฟล์"
            >
              <Camera size={18} />
            </button>
          </div>
          <div className="pf-header__text">
            <h1 className="pf-header__name">{displayName}</h1>
            <div className="pf-header__badges">
              {role === 'user' ? (
                isVerified
                  ? <Badge tone="success" icon={ShieldCheck}>ยืนยันตัวตนแล้ว</Badge>
                  : <Badge tone="pending" icon={Shield}>ยังไม่ยืนยันตัวตน</Badge>
              ) : (
                <Badge tone="neutral" icon={role === 'foundation' ? Building2 : User}>{getRoleDisplayName(role)}</Badge>
              )}
            </div>
          </div>
        </motion.header>

        {/* Not verified yet: the one thing blocking adoption requests */}
        {role === 'user' && !isVerified && (
          <div className="pf-verify">
            <p className="pf-verify__title">ยืนยันตัวตนเพื่อส่งคำขอรับเลี้ยง</p>
            <p className="pf-verify__text">กรอกข้อมูลส่วนตัวและแบบประเมินความพร้อม 2 ขั้นตอน มูลนิธิใช้ข้อมูลนี้พิจารณาคำขอของคุณ</p>
            <Button variant="primary" onClick={() => navigate('/verify-user')}>
              <ShieldCheck size={20} aria-hidden="true" /> เริ่มยืนยันตัวตน
            </Button>
          </div>
        )}

        {role === 'user' && (
          <ProfileSection
            title="คำขอรับเลี้ยงของฉัน"
            action={matches?.length > 0 && <Link to="/matches" className="pf-section__action">ดูทั้งหมด</Link>}
          >
            <AdoptionRequests matches={matches} />
          </ProfileSection>
        )}

        {role === 'foundation' && foundationMenu.length > 0 && (
          <ProfileSection title="มูลนิธิของฉัน">
            {foundationMenu.map((item) => (
              <InfoRow
                key={item.key}
                label={item.label}
                value={item.badge ? item.desc : ''}
                tone={item.badge && foundationStatus === 'approved' ? 'success' : item.badge ? 'muted' : undefined}
                onClick={item.onClick}
              />
            ))}
          </ProfileSection>
        )}

        <ProfileSection
          title="ข้อมูลของฉัน"
          action={<button type="button" className="pf-section__action" onClick={settingsOpen}>แก้ไข</button>}
        >
          <InfoRow label="ชื่อ" value={profile?.full_name || user?.user_metadata?.full_name || '—'} />
          <InfoRow label="เบอร์โทร" value={profile?.phone ? formatPhoneNumber(profile.phone) : 'ยังไม่ได้ระบุ'} tone={profile?.phone ? undefined : 'muted'} />
          <InfoRow label="อีเมล" value={displayEmail} />
          {role === 'user' && (
            <InfoRow
              label="ยืนยันตัวตน"
              value={isVerified ? 'เรียบร้อย' : 'ยังไม่ยืนยัน'}
              tone={isVerified ? 'success' : 'muted'}
              to="/verify-user"
            />
          )}
        </ProfileSection>

        {role === 'user' && (
          <ProfileSection title="การค้นหา">
            <InfoRow
              icon={MapPin}
              label="พื้นที่"
              value={savedArea?.label ? `ใกล้ ${savedArea.label}` : 'ตำแหน่งปัจจุบัน (GPS)'}
              to="/?sheet=location"
            />
            <InfoRow icon={Search} label="ตัวกรอง" value={prefsSummary} to="/?sheet=filters" />
          </ProfileSection>
        )}

        {role !== 'super_admin' && (
          <ProfileSection title="ช่วยเหลือ">
            <FaqList />
            <InfoRow icon={MessageSquare} label="แชทกับทีมงาน" value="" to="/support-chat" />
          </ProfileSection>
        )}

        <Button variant="secondary" className="pf-logout" onClick={handleLogout}>
          <LogOut size={18} aria-hidden="true" /> ออกจากระบบ
        </Button>
      </div>

      {/* Edit "ข้อมูลของฉัน" — DESIGN.md §7.10 bottom sheet */}
      <Dialog open={isSettingsOpen} onClose={() => !isSavingProfile && setIsSettingsOpen(false)} title="แก้ไขข้อมูลของฉัน">
        <form onSubmit={handleSaveSettings} className="pf-edit-form">
          {saveSuccessMsg && (
            <p className="pf-edit-form__msg pf-edit-form__msg--success" role="status">
              <CheckCircle size={18} aria-hidden="true" /> {saveSuccessMsg}
            </p>
          )}
          {saveErrorMsg && (
            <p className="pf-edit-form__msg pf-edit-form__msg--error" role="alert">
              <AlertCircle size={18} aria-hidden="true" /> {saveErrorMsg}
            </p>
          )}
          <Field
            id="pf-name"
            label="ชื่อ - นามสกุล"
            value={editFullName}
            onChange={(e) => setEditFullName(e.target.value)}
            placeholder="ระบุชื่อของคุณ"
            autoComplete="name"
            required
          />
          <Field
            id="pf-phone"
            label="เบอร์โทรศัพท์"
            type="tel"
            inputMode="tel"
            value={editPhone}
            onChange={(e) => setEditPhone(formatPhoneNumber(e.target.value))}
            placeholder="เช่น 081-234-5678"
            autoComplete="tel"
          />
          <Field id="pf-email" label="อีเมล (เปลี่ยนไม่ได้)" type="email" value={displayEmail} disabled readOnly />
          <div className="ui-dialog__actions">
            <Button type="button" variant="secondary" onClick={() => setIsSettingsOpen(false)} disabled={isSavingProfile}>ยกเลิก</Button>
            <Button type="submit" variant="primary" loading={isSavingProfile}>บันทึกข้อมูล</Button>
          </div>
        </form>
      </Dialog>

      {/* Foundation Verification Certificate & Status Modal */}
      <AnimatePresence>
        {isFoundationStatusModalOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            onClick={() => setIsFoundationStatusModalOpen(false)}
            style={{
              position: 'fixed',
              inset: 0,
              backgroundColor: 'rgba(0, 0, 0, 0.45)',
              backdropFilter: 'blur(8px)',
              WebkitBackdropFilter: 'blur(8px)',
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              zIndex: 1000,
              padding: '16px'
            }}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: 12 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 8 }}
              transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
              onClick={e => e.stopPropagation()}
              style={{
                backgroundColor: '#FFFFFF',
                borderRadius: '20px',
                padding: '24px',
                width: '100%',
                maxWidth: '440px',
                boxShadow: '0 20px 40px rgba(0, 0, 0, 0.12)',
                boxSizing: 'border-box'
              }}
            >
              {/* Header */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 700, color: '#111827' }}>
                  ข้อมูลการรับรองมูลนิธิ
                </h3>
                <button
                  type="button"
                  onClick={() => setIsFoundationStatusModalOpen(false)}
                  style={{
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    color: '#9CA3AF',
                    padding: '4px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    borderRadius: '6px'
                  }}
                  onMouseEnter={e => e.currentTarget.style.color = '#374151'}
                  onMouseLeave={e => e.currentTarget.style.color = '#9CA3AF'}
                >
                  <X size={20} />
                </button>
              </div>

              {/* Foundation Identity Row */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '14px',
                padding: '14px 16px',
                backgroundColor: '#F9FAFB',
                borderRadius: '12px',
                marginBottom: '18px',
                border: '1px solid #F3F4F6'
              }}>
                <div style={{
                  width: '44px',
                  height: '44px',
                  borderRadius: '10px',
                  backgroundColor: '#E5E7EB',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#4B5563',
                  flexShrink: 0
                }}>
                  <Building2 size={22} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <h4 style={{
                    margin: '0 0 3px 0',
                    fontSize: '1rem',
                    fontWeight: 700,
                    color: '#111827',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis'
                  }}>
                    {foundationDetails?.foundation_name || profile?.full_name || 'ศูนย์พักพิงสัตว์'}
                  </h4>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '0.8rem', color: '#059669', fontWeight: 600 }}>
                    <CheckCircle size={14} />
                    <span>ได้รับการรับรองแล้ว (Verified)</span>
                  </div>
                </div>
              </div>

              {/* Detail List (Clean Hairline Rows) */}
              <div style={{ display: 'flex', flexDirection: 'column', marginBottom: '22px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '11px 0', borderBottom: '1px solid #F3F4F6', fontSize: '0.88rem' }}>
                  <span style={{ color: '#6B7280' }}>เลขทะเบียนองค์กร</span>
                  <span style={{ fontWeight: 600, color: '#111827' }}>
                    {foundationDetails?.registration_no || '-'}
                  </span>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '11px 0', borderBottom: '1px solid #F3F4F6', fontSize: '0.88rem' }}>
                  <span style={{ color: '#6B7280' }}>วันที่อนุมัติ</span>
                  <span style={{ fontWeight: 600, color: '#111827' }}>
                    {foundationDetails?.reviewed_at ? formatApprovalDate(foundationDetails.reviewed_at) : '-'}
                  </span>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '11px 0', borderBottom: '1px solid #F3F4F6', fontSize: '0.88rem' }}>
                  <span style={{ color: '#6B7280' }}>เบอร์โทรศัพท์</span>
                  <span style={{ fontWeight: 600, color: '#111827' }}>
                    {foundationDetails?.contact_phone ? formatPhoneNumber(foundationDetails.contact_phone) : '-'}
                  </span>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', padding: '11px 0', borderBottom: '1px solid #F3F4F6', fontSize: '0.88rem', gap: '16px' }}>
                  <span style={{ color: '#6B7280', flexShrink: 0 }}>ที่ตั้งศูนย์</span>
                  <span style={{ fontWeight: 500, color: '#111827', textAlign: 'right', wordBreak: 'break-word', lineHeight: 1.4 }}>
                    {foundationDetails?.address || '-'}
                  </span>
                </div>

                {/* Attached Document Row */}
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '12px 0',
                  fontSize: '0.88rem'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}>
                    <FileText size={17} color="#6B7280" style={{ flexShrink: 0 }} />
                    <span style={{ color: '#6B7280' }}>เอกสารแนบ</span>
                    <span style={{ fontWeight: 600, color: '#111827', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      ใบอนุญาตจัดตั้งมูลนิธิ
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={handleOpenPermitDoc}
                    disabled={isLoadingDocs}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: 'var(--primary-color, #D97706)',
                      fontWeight: 600,
                      fontSize: '0.85rem',
                      cursor: isLoadingDocs ? 'not-allowed' : 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px',
                      padding: 0,
                      flexShrink: 0
                    }}
                  >
                    <span>{isLoadingDocs ? 'กำลังโหลด...' : 'ดูเอกสาร'}</span>
                    <ChevronRight size={16} />
                  </button>
                </div>

                {/* If multiple documents attached */}
                {foundationDocs.length > 1 && (
                  <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', paddingTop: '4px' }}>
                    {foundationDocs.map((doc, idx) => (
                      <button
                        key={doc.id || idx}
                        type="button"
                        onClick={() => handleViewSpecificDoc(doc)}
                        style={{
                          padding: '3px 8px',
                          borderRadius: '6px',
                          backgroundColor: '#F3F4F6',
                          border: 'none',
                          fontSize: '0.75rem',
                          color: '#4B5563',
                          cursor: 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px'
                        }}
                      >
                        <FileText size={12} />
                        <span>{getDocTypeShortName(doc.doc_type)}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <button
                  type="button"
                  onClick={() => {
                    setIsFoundationStatusModalOpen(false);
                    navigate('/foundation');
                  }}
                  className="btn btn-primary"
                  style={{
                    width: '100%',
                    height: '44px',
                    borderRadius: '10px',
                    fontSize: '0.95rem',
                    fontWeight: 600,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                    cursor: 'pointer'
                  }}
                >
                  <span>ไปยังหน้าหลักมูลนิธิ</span>
                  <ArrowRight size={16} />
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setIsFoundationStatusModalOpen(false);
                    setIsLocationModalOpen(true);
                  }}
                  style={{
                    width: '100%',
                    height: '38px',
                    borderRadius: '10px',
                    border: '1px solid #E5E7EB',
                    backgroundColor: '#FFFFFF',
                    color: '#4B5563',
                    fontSize: '0.86rem',
                    fontWeight: 500,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px',
                    cursor: 'pointer',
                    transition: 'all 0.15s'
                  }}
                  onMouseEnter={e => { e.currentTarget.style.backgroundColor = '#F9FAFB'; }}
                  onMouseLeave={e => { e.currentTarget.style.backgroundColor = '#FFFFFF'; }}
                >
                  <MapPin size={15} color="#6B7280" />
                  <span>แก้ไขที่ตั้งและพิกัดศูนย์พักพิง</span>
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Foundation Document Preview Modal */}
      <AnimatePresence>
        {viewDocModalOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            onClick={() => setViewDocModalOpen(false)}
            style={{
              position: 'fixed',
              inset: 0,
              backgroundColor: 'rgba(0, 0, 0, 0.65)',
              backdropFilter: 'blur(8px)',
              WebkitBackdropFilter: 'blur(8px)',
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              zIndex: 1100,
              padding: '16px'
            }}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: 12 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 8 }}
              transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
              onClick={e => e.stopPropagation()}
              style={{
                backgroundColor: 'white',
                borderRadius: '20px',
                padding: '24px',
                width: '100%',
                maxWidth: '620px',
                maxHeight: '92vh',
                display: 'flex',
                flexDirection: 'column',
                boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
                border: '1px solid #E5E7EB',
                overflow: 'hidden'
              }}
            >
              {/* Modal Header */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '14px', flexShrink: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div style={{ width: '38px', height: '38px', borderRadius: '10px', backgroundColor: '#ECFDF5', color: '#059669', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <FileText size={20} />
                  </div>
                  <div>
                    <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 700, color: '#111827' }}>
                      {selectedDocToView?.title || 'เอกสารรับรองมูลนิธิ'}
                    </h3>
                    <p style={{ margin: 0, fontSize: '0.78rem', color: '#6B7280' }}>
                      {selectedDocToView?.fileName || 'เอกสารแนบที่ส่งมาตอนยื่นขอรับรอง'}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setViewDocModalOpen(false)}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-medium)', padding: '4px' }}
                >
                  <X size={20} />
                </button>
              </div>

              {/* Doc Tabs if multiple */}
              {foundationDocs.length > 1 && (
                <div style={{ display: 'flex', gap: '6px', overflowX: 'auto', paddingBottom: '10px', marginBottom: '10px', flexShrink: 0 }}>
                  {foundationDocs.map((doc, idx) => {
                    const isSelected = selectedDocToView?.docType === doc.doc_type;
                    return (
                      <button
                        key={doc.id || idx}
                        type="button"
                        onClick={() => handleViewSpecificDoc(doc)}
                        style={{
                          padding: '6px 14px',
                          borderRadius: '20px',
                          fontSize: '0.8rem',
                          fontWeight: 600,
                          border: isSelected ? '1.5px solid #059669' : '1px solid #E5E7EB',
                          backgroundColor: isSelected ? '#ECFDF5' : '#F9FAFB',
                          color: isSelected ? '#065F46' : '#4B5563',
                          cursor: 'pointer',
                          whiteSpace: 'nowrap',
                          transition: 'all 0.12s'
                        }}
                      >
                        {getDocTypeShortName(doc.doc_type)}
                      </button>
                    );
                  })}
                </div>
              )}

              {/* Viewer Content Body */}
              <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', minHeight: '260px' }}>
                {selectedDocToView?.url ? (
                  selectedDocToView.isPdf ? (
                    <div style={{ width: '100%', height: '520px', borderRadius: '12px', overflow: 'hidden', border: '1px solid #E5E7EB', backgroundColor: '#F3F4F6' }}>
                      <iframe
                        src={`${selectedDocToView.url}#toolbar=1`}
                        title={selectedDocToView.title}
                        style={{ width: '100%', height: '100%', border: 'none' }}
                      />
                    </div>
                  ) : (
                    <div style={{
                      width: '100%',
                      borderRadius: '12px',
                      border: '1px solid #E5E7EB',
                      backgroundColor: '#111827',
                      display: 'flex',
                      justifyContent: 'center',
                      alignItems: 'center',
                      padding: '12px',
                      minHeight: '340px'
                    }}>
                      <img
                        src={selectedDocToView.url}
                        alt={selectedDocToView.title}
                        style={{ maxWidth: '100%', maxHeight: '60vh', objectFit: 'contain', borderRadius: '8px' }}
                      />
                    </div>
                  )
                ) : (
                  <div style={{
                    padding: '48px 24px',
                    textAlign: 'center',
                    backgroundColor: '#F9FAFB',
                    borderRadius: '12px',
                    border: '1px dashed #D1D5DB',
                    margin: 'auto 0'
                  }}>
                    <div style={{ width: '54px', height: '54px', borderRadius: '50%', backgroundColor: '#FEF3C7', color: '#D97706', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 14px' }}>
                      <AlertCircle size={28} />
                    </div>
                    <h4 style={{ margin: '0 0 6px', fontSize: '1rem', fontWeight: 700, color: '#111827' }}>
                      ไม่พบไฟล์เอกสารแนบในระบบ
                    </h4>
                    <p style={{ margin: 0, fontSize: '0.86rem', color: '#6B7280', lineHeight: 1.5, maxWidth: '420px', marginInline: 'auto' }}>
                      {selectedDocToView?.emptyNotice || 'บัญชีมูลนิธินี้ได้รับการอนุมัติอย่างเป็นทางการแล้ว แต่ยังไม่มีไฟล์เอกสารแนบในพื้นที่จัดเก็บ'}
                    </p>
                  </div>
                )}
              </div>

              {/* Modal Actions Footer */}
              <div style={{ display: 'flex', gap: '10px', marginTop: '16px', paddingTop: '12px', borderTop: '1px solid #F3F4F6', flexShrink: 0 }}>
                {selectedDocToView?.url && (
                  <a
                    href={selectedDocToView.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn btn-primary"
                    style={{
                      flex: 1,
                      height: '42px',
                      borderRadius: '10px',
                      fontSize: '0.9rem',
                      fontWeight: 600,
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '8px',
                      textDecoration: 'none'
                    }}
                  >
                    <ExternalLink size={16} />
                    <span>เปิดดูในแท็บใหม่ / ดาวน์โหลด</span>
                  </a>
                )}
                <button
                  type="button"
                  onClick={() => setViewDocModalOpen(false)}
                  style={{
                    flex: selectedDocToView?.url ? '0 0 100px' : 1,
                    height: '42px',
                    borderRadius: '10px',
                    border: '1px solid var(--gray-300)',
                    backgroundColor: 'white',
                    color: 'var(--text-dark)',
                    fontSize: '0.9rem',
                    fontWeight: 600,
                    cursor: 'pointer'
                  }}
                >
                  ปิด
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Foundation Location & GPS Modal */}
      <AnimatePresence>
        {isLocationModalOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            onClick={() => setIsLocationModalOpen(false)}
            style={{
              position: 'fixed',
              inset: 0,
              backgroundColor: 'rgba(0, 0, 0, 0.45)',
              backdropFilter: 'blur(8px)',
              WebkitBackdropFilter: 'blur(8px)',
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              zIndex: 1000,
              padding: '16px'
            }}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: 12 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 8 }}
              transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
              onClick={e => e.stopPropagation()}
              style={{
                backgroundColor: 'white',
                borderRadius: '16px',
                padding: '24px',
                width: '100%',
                maxWidth: '520px',
                maxHeight: '90vh',
                overflowY: 'auto',
                boxShadow: '0 20px 48px rgba(0,0,0,0.12)'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <div style={{ width: '36px', height: '36px', borderRadius: '10px', backgroundColor: '#FEF2F2', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--primary-color)' }}>
                    <MapPin size={20} />
                  </div>
                  <div>
                    <h2 style={{ fontSize: '1.15rem', fontWeight: 700, margin: 0, color: 'var(--text-dark)' }}>ข้อมูลศูนย์พักพิง, ที่อยู่จัดส่ง และพร้อมเพย์</h2>
                    <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-medium)' }}>ที่อยู่และเบอร์ติดต่อสำหรับส่งพัสดุ และเบอร์ PromptPay สำหรับรับเงินบริจาคตรง</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsLocationModalOpen(false)}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-medium)', padding: '4px' }}
                >
                  <X size={20} />
                </button>
              </div>

              {locationSuccessMsg && (
                <div style={{ padding: '10px 14px', backgroundColor: '#ECFDF5', color: '#059669', borderRadius: '8px', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.9rem', fontWeight: 600, border: '1px solid #A7F3D0' }}>
                  <CheckCircle size={18} /> {locationSuccessMsg}
                </div>
              )}

              {locationErrorMsg && (
                <div style={{ padding: '10px 14px', backgroundColor: '#FEF2F2', color: '#DC2626', borderRadius: '8px', marginBottom: '16px', fontSize: '0.9rem', fontWeight: 600, border: '1px solid #FCA5A5' }}>
                  {locationErrorMsg}
                </div>
              )}

              {isFetchingLocation ? (
                <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '40px 0', gap: '8px', color: 'var(--text-medium)' }}>
                  <Loader className="spin" size={24} />
                  <span>กำลังโหลดข้อมูลที่ตั้ง...</span>
                </div>
              ) : (
                <form onSubmit={handleSaveFoundationLocation} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-dark)', marginBottom: '4px' }}>ชื่อมูลนิธิ/ศูนย์พักพิง</label>
                    <input
                      type="text"
                      value={foundationLocationData.foundation_name}
                      disabled
                      style={{ width: '100%', height: '40px', padding: '0 12px', borderRadius: '8px', border: '1px solid var(--gray-200)', backgroundColor: 'var(--gray-50)', color: 'var(--text-medium)', outline: 'none', fontSize: '0.9rem', boxSizing: 'border-box' }}
                    />
                  </div>

                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                      <label style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-dark)' }}>ที่อยู่ศูนย์พักพิง</label>
                      <button
                        type="button"
                        onClick={handleGetGpsLocation}
                        disabled={isGettingGps}
                        style={{
                          background: '#FEF3C7',
                          border: '1px solid #D97706',
                          borderRadius: '6px',
                          color: '#B45309',
                          fontSize: '0.78rem',
                          fontWeight: 600,
                          cursor: isGettingGps ? 'not-allowed' : 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '5px',
                          padding: '4px 10px'
                        }}
                      >
                        {isGettingGps ? <Loader className="spin" size={13} /> : <MapPin size={13} color="#D97706" />}
                        {isGettingGps ? 'กำลังระบุพิกัด...' : 'ใช้พิกัดปัจจุบัน'}
                      </button>
                    </div>
                    <textarea
                      rows={2}
                      value={foundationLocationData.address}
                      onChange={e => setFoundationLocationData(prev => ({ ...prev, address: e.target.value }))}
                      placeholder="เช่น ภาควิชาวิศวกรรมอุตสาหการ มหาวิทยาลัยขอนแก่น หรือพิกัด 16°28'19.4&quot;N 102°49'22.8&quot;E"
                      style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid var(--gray-300)', outline: 'none', fontSize: '0.9rem', boxSizing: 'border-box', resize: 'vertical' }}
                    />
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '6px', flexWrap: 'wrap', gap: '6px' }}>
                      <span style={{ fontSize: '0.75rem', color: '#6B7280' }}>
                        พิมพ์ชื่อสถานที่, ที่อยู่ หรือวางพิกัด Google Maps แล้วกดค้นหา หรือกด <b>"ใช้พิกัดปัจจุบัน"</b>
                      </span>
                      <button
                        type="button"
                        onClick={handleSearchCoordsFromAddress}
                        disabled={isSearchingAddressGps || !foundationLocationData.address.trim()}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: 'var(--primary-color)',
                          fontSize: '0.78rem',
                          fontWeight: 600,
                          cursor: !foundationLocationData.address.trim() ? 'not-allowed' : 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                          padding: 0,
                          opacity: !foundationLocationData.address.trim() ? 0.5 : 1
                        }}
                      >
                        {isSearchingAddressGps ? <Loader className="spin" size={13} /> : <Search size={13} />}
                        {isSearchingAddressGps ? 'กำลังค้นหา...' : 'ค้นหาตำแหน่ง / พิกัดนี้'}
                      </button>
                    </div>
                  </div>

                  {/* Interactive Map with Draggable Pin */}
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                      <label style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-dark)', display: 'flex', alignItems: 'center', gap: '5px' }}>
                        <MapPin size={14} color="var(--primary-color)" />
                        ตำแหน่งบนแผนที่
                      </label>
                      {foundationLocationData.latitude && foundationLocationData.longitude && (
                        <a
                          href={`https://www.google.com/maps/search/?api=1&query=${foundationLocationData.latitude},${foundationLocationData.longitude}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{ color: 'var(--primary-color)', textDecoration: 'none', fontSize: '0.78rem', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                        >
                          <span>เปิดใน Google Maps</span>
                          <ExternalLink size={12} />
                        </a>
                      )}
                    </div>

                    <InteractiveLocationPicker
                      latitude={foundationLocationData.latitude}
                      longitude={foundationLocationData.longitude}
                      onChange={handleInteractivePinChange}
                      height={240}
                      zoom={17}
                    />

                    <div style={{ marginTop: '6px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '6px' }}>
                      <span style={{ fontSize: '0.74rem', color: '#6B7280' }}>
                        คลิกบนแผนที่หรือลากหมุดสีแดงเพื่อปรับจุดพิกัด
                      </span>
                      {foundationLocationData.latitude && foundationLocationData.longitude && (
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', color: '#059669', fontSize: '0.74rem', fontWeight: 600 }}>
                          <CheckCircle size={13} /> พิกัด: {Number(foundationLocationData.latitude).toFixed(5)}, {Number(foundationLocationData.longitude).toFixed(5)}
                        </span>
                      )}
                    </div>
                  </div>

                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))',
                    gap: '12px',
                  }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-dark)', marginBottom: '4px' }}>เบอร์โทรติดต่อศูนย์ / พัสดุ</label>
                      <input
                        type="tel"
                        value={foundationLocationData.contact_phone}
                        onChange={e => setFoundationLocationData(prev => ({ ...prev, contact_phone: formatPhoneNumber(e.target.value) }))}
                        placeholder="เช่น 0812345678"
                        maxLength={12}
                        style={{ width: '100%', height: '40px', padding: '0 12px', borderRadius: '8px', border: '1px solid var(--gray-300)', outline: 'none', fontSize: '0.9rem', boxSizing: 'border-box' }}
                      />
                      <span style={{ fontSize: '0.72rem', color: '#6B7280', marginTop: '2px', display: 'block' }}>
                        สำหรับผู้บริจาคหรือพนักงานขนส่งโทรสอบถาม
                      </span>
                    </div>

                    <div>
                      <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-dark)', marginBottom: '4px' }}>เบอร์พร้อมเพย์ (PromptPay)</label>
                      <input
                        type="text"
                        value={foundationLocationData.promptpay_number}
                        onChange={e => setFoundationLocationData(prev => ({ ...prev, promptpay_number: e.target.value.replace(/[^\d-]/g, '') }))}
                        placeholder="เบอร์มือถือ หรือ เลข 13 หลัก"
                        maxLength={18}
                        style={{ width: '100%', height: '40px', padding: '0 12px', borderRadius: '8px', border: '1px solid var(--gray-300)', outline: 'none', fontSize: '0.9rem', boxSizing: 'border-box' }}
                      />
                      <span style={{ fontSize: '0.72rem', color: '#6B7280', marginTop: '2px', display: 'block' }}>
                        ใช้สร้าง Dynamic QR ให้ผู้บริจาคโอนเข้าตรง
                      </span>
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: '12px', marginTop: '6px' }}>
                    <button
                      type="button"
                      onClick={() => setIsLocationModalOpen(false)}
                      style={{ flex: 1, height: '42px', borderRadius: '8px', border: '1px solid var(--gray-300)', backgroundColor: 'white', color: 'var(--text-dark)', fontWeight: 600, cursor: 'pointer' }}
                    >
                      ยกเลิก
                    </button>
                    <button
                      type="submit"
                      disabled={isSavingLocation}
                      className="btn btn-primary"
                      style={{ flex: 1, height: '42px', borderRadius: '8px', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px', fontSize: '0.95rem' }}
                    >
                      {isSavingLocation ? <Loader className="spin" size={18} /> : 'บันทึกข้อมูล'}
                    </button>
                  </div>
                </form>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}
